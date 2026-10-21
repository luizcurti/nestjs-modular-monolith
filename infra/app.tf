# The monolith on ECS Fargate behind an ALB (REST under /v1, GraphQL at /graphql), plus MongoDB
# as its own Fargate service, reached at mongodb.<name>.internal through a Cloud Map private DNS
# name. The Bull processor of the users-management module runs inside the API process, as it
# does locally: user.created jobs go through Redis and land in MongoDB.

locals {
  app_port = 3000

  mongodb_host = "mongodb.${aws_service_discovery_private_dns_namespace.main.name}"
}

resource "aws_ecr_repository" "app" {
  name                 = "${local.name}-app"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # Destroy also removes the pushed images

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# One group for both containers; each writes under its own stream prefix.
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}-app"
  retention_in_days = var.log_retention_days
}

# --- Secrets (SSM SecureString, AWS-managed key) -------------------------------------------

resource "random_password" "mongodb" {
  length  = 32
  special = false # goes into a URL unescaped
}

locals {
  secrets = {
    REDIS_PASSWORD             = random_password.redis_auth.result
    MONGODB_URL                = "mongodb://app:${random_password.mongodb.result}@${local.mongodb_host}:27017/users_management?authSource=admin"
    MONGO_INITDB_ROOT_PASSWORD = random_password.mongodb.result
  }
}

resource "aws_ssm_parameter" "secret" {
  for_each = toset(["REDIS_PASSWORD", "MONGODB_URL", "MONGO_INITDB_ROOT_PASSWORD"])

  name  = "/${local.name}/${each.key}"
  type  = "SecureString"
  value = local.secrets[each.key]
}

# --- IAM -------------------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by ECS to pull the images, write logs and inject the secrets as environment variables.
# The app's S3 uploader is not wired to any route, so there is no task role (and no bucket).
resource "aws_iam_role" "execution" {
  name               = "${local.name}-app-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "AppSecrets"
    actions   = ["ssm:GetParameters"]
    resources = [for parameter in aws_ssm_parameter.secret : parameter.arn]
  }

  statement {
    sid       = "DatabasePassword"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.main.master_user_secret[0].secret_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# --- ECS cluster and service discovery -------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = local.name
}

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${local.name}.internal"
  description = "Private DNS names of ${local.name} services"
  vpc         = aws_vpc.main.id
}

resource "aws_service_discovery_service" "mongodb" {
  name = "mongodb"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "A"
      ttl  = 10
    }
  }
}

# --- MongoDB -----------------------------------------------------------------------------------
# A single node without persistence across task restarts: fine for a demo (the users-management
# copies are rebuilt from new user.created jobs only), and the reason the deploy waits for it
# before starting the API, whose Mongoose connection gives up after a few retries.

resource "aws_ecs_task_definition" "mongodb" {
  family                   = "${local.name}-mongodb"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "mongodb"
    image     = var.mongodb_image
    essential = true

    portMappings = [{ containerPort = 27017, protocol = "tcp" }]

    # The image's entrypoint creates this root user on first start (authentication on).
    environment = [{ name = "MONGO_INITDB_ROOT_USERNAME", value = "app" }]
    secrets     = [{ name = "MONGO_INITDB_ROOT_PASSWORD", valueFrom = aws_ssm_parameter.secret["MONGO_INITDB_ROOT_PASSWORD"].arn }]

    # `ping` needs no authentication.
    healthCheck = {
      command     = ["CMD-SHELL", "mongosh --quiet --eval \"db.adminCommand('ping').ok\" || exit 1"]
      interval    = 30
      timeout     = 20
      retries     = 3
      startPeriod = 90
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "mongodb"
      }
    }
  }])
}

resource "aws_ecs_service" "mongodb" {
  name            = "${local.name}-mongodb"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mongodb.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Never two nodes at once: the old task stops before the new one starts.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.mongodb.id]
    assign_public_ip = true # pulls the image from ECR Public without a NAT gateway
  }

  service_registries {
    registry_arn = aws_service_discovery_service.mongodb.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # The API below is only created once MongoDB is healthy and registered.
  wait_for_steady_state = true

  depends_on = [aws_iam_role_policy.execution_secrets]
}

# --- API ---------------------------------------------------------------------------------------

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"
    essential = true

    # The image's CMD (`npm run start:prod`), without npm in between: signals reach Node.
    command = ["node", "dist/main"]

    # tini as PID 1 (zombie reaping, signal forwarding).
    linuxParameters = { initProcessEnabled = true }

    portMappings = [{ containerPort = local.app_port, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "DATABASE_DATASOURCE", value = "typeorm" },
      { name = "TYPEORM_TYPE", value = "postgres" },
      { name = "TYPEORM_HOST", value = aws_db_instance.main.address },
      { name = "TYPEORM_PORT", value = tostring(aws_db_instance.main.port) },
      { name = "TYPEORM_USERNAME", value = aws_db_instance.main.username },
      { name = "TYPEORM_DATABASE", value = aws_db_instance.main.db_name },
      { name = "TYPEORM_SSL", value = "true" },
      { name = "REDIS_HOST", value = aws_elasticache_replication_group.main.primary_endpoint_address },
      { name = "REDIS_PORT", value = "6379" },
      { name = "REDIS_TLS", value = "true" },
    ]

    secrets = [
      { name = "TYPEORM_PASSWORD", valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::" },
      { name = "REDIS_PASSWORD", valueFrom = aws_ssm_parameter.secret["REDIS_PASSWORD"].arn },
      { name = "MONGODB_URL", valueFrom = aws_ssm_parameter.secret["MONGODB_URL"].arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "app"
      }
    }
  }])
}

resource "aws_lb" "app" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "app" {
  name        = "${local.name}-app"
  port        = local.app_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  deregistration_delay = 10

  # The same endpoint the Dockerfile HEALTHCHECK uses (static, no database call).
  health_check {
    path                = "/v1/credit"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_ecs_service" "app" {
  name            = "${local.name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # TypeORM synchronizes the schema before the server listens.
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = true # reaches ECR, SSM and Secrets Manager without a NAT gateway
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = local.app_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.http, aws_iam_role_policy.execution_secrets, aws_ecs_service.mongodb]
}
