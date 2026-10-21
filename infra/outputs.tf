output "api_url" {
  description = "Base URL over HTTPS (REST under /v1, GraphQL at /graphql)."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "ecs_services" {
  description = "Every ECS service of the stack (API and MongoDB)."
  value       = [aws_ecs_service.app.name, aws_ecs_service.mongodb.name]
}
