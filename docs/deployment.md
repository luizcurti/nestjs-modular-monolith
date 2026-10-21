# Deployment (AWS)

Every push to `main` deploys the monolith to AWS with GitHub Actions, once the
CI checks pass:

```
           HTTPS                 HTTP (CloudFront ranges only)
client ──► CloudFront ─────────► ALB ──► ECS Fargate: app (NestJS, REST /v1 + GraphQL /graphql,
                                                           Bull processor in the same process)
                                              │
                                              ├──► RDS PostgreSQL 17      (users, TypeORM)
                                              ├──► ElastiCache Redis       (Bull queue, TLS + AUTH)
                                              └──► ECS Fargate: mongodb    (users-management copy,
                                                   mongodb.nest-monolith.internal via Cloud Map)
```

| docker-compose service | AWS                                                                               |
| ---------------------- | --------------------------------------------------------------------------------- |
| app (commented out)    | ECS Fargate service behind an ALB, HTTPS through CloudFront's default certificate |
| `postgres`             | RDS PostgreSQL 17 (`db.t4g.micro`), `TYPEORM_SSL=true`                            |
| `redis`                | ElastiCache Redis 7 (`cache.t4g.micro`), AUTH token + TLS, `noeviction` for Bull  |
| `mongodb_container`    | ECS Fargate service (`mongo:8`, root user from SSM), Cloud Map private DNS name   |

Notes:

- **Secrets**: the PostgreSQL password is managed by RDS in Secrets Manager; the
  Redis AUTH token, the MongoDB root password and `MONGODB_URL` are SSM
  SecureString parameters under `/nest-monolith/`. ECS injects them as
  environment variables.
- **MongoDB** is a single container without persistence: its data is lost if
  the task restarts. Amazon DocumentDB would be the managed alternative, at a
  higher hourly cost and with a TLS CA bundle to ship.
- **PostgreSQL 17**: docker-compose and CI use 11.8, which RDS no longer offers.
  TypeORM's `synchronize` creates the schema the same way.
- **No authentication**: the API is public, as it is locally. Destroy the stack
  when you are done testing.
- **Network**: public subnets and no NAT gateway (tasks get a public IP to
  reach ECR, SSM and Secrets Manager). Only the ALB accepts traffic from outside
  the VPC, and only from CloudFront; PostgreSQL, Redis and MongoDB only accept
  the API task.

## One-time setup

Requirements: Terraform >= 1.10, AWS CLI credentials (admin) of the target
account, and the GitHub CLI logged in with admin access to the repository.

```bash
scripts/bootstrap.sh
```

It applies [`bootstrap/`](../bootstrap) (an S3 bucket for the Terraform state
and an IAM role GitHub Actions assumes through OIDC, scoped to the
`nest-monolith-*` resources and the `production` environment), then creates the
`production` GitHub environment with the `AWS_DEPLOY_ROLE_ARN`,
`TF_STATE_BUCKET` and `AWS_REGION` variables. On an account where no other
project created the GitHub OIDC provider yet, run
`scripts/bootstrap.sh -var="create_oidc_provider=true"`.

## Deploy

Every push to `main` deploys; to deploy without a push:

```bash
gh workflow run ci.yml --repo luizcurti/nestjs-modular-monolith --ref main
```

The **Deploy to AWS** job creates the ECR repository, builds and pushes the
image, applies [`infra/`](../infra) (the first run takes ~15 minutes, mostly RDS
and ElastiCache), waits for the ECS services and runs
[`scripts/smoke-test.sh`](../scripts/smoke-test.sh) against the live stack: the
Postman collection (REST + GraphQL, happy and sad paths), then a user created
through the GraphQL mutation that must reach MongoDB through the Bull queue
(checked through the processor's `USER CREATED` log line in CloudWatch). The
run summary shows the URLs.

## Try it

```bash
API=https://xxxx.cloudfront.net   # from the run summary
curl -s -X POST $API/v1/users -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
curl -s $API/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ findAll { id name email } }"}'
aws logs tail /ecs/nest-monolith-app --log-stream-name-prefix app --since 10m | grep "USER CREATED"
```

## Destroy

RDS, ElastiCache, the ALB and the Fargate tasks are billed by the hour. Tear the
stack down when you are done (the bootstrap resources are kept):

```bash
gh workflow run destroy.yml --repo luizcurti/nestjs-modular-monolith --ref main -f confirm=destroy
```

Recreate it with the deploy command above.
