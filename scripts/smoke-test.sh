#!/usr/bin/env bash
# End-to-end check of a deployed stack, run by the CI deploy job after every
# deploy (and runnable by hand against any environment):
#   1. the Postman collection CI runs locally (REST + GraphQL, happy and sad
#      paths: PostgreSQL through TypeORM);
#   2. a user created through the GraphQL mutation is copied to MongoDB by the
#      users-management Bull processor (Redis queue), checked through the
#      processor's "USER CREATED" log line in CloudWatch (only when LOG_GROUP
#      is set: there is no HTTP endpoint that reads MongoDB).
#
# Usage: API_URL=https://xxxx.cloudfront.net [LOG_GROUP=/ecs/nest-monolith-app] scripts/smoke-test.sh
set -euo pipefail

: "${API_URL:?set API_URL, e.g. https://xxxx.cloudfront.net}"

fail() {
  echo "::error title=Smoke test::$*"
  echo "FAIL: $*" >&2
  exit 1
}

echo "== API up"
for _ in $(seq 1 30); do
  curl -sf "$API_URL/v1/credit" > /dev/null && break
  sleep 5
done
curl -sf "$API_URL/v1/credit" > /dev/null || fail "GET /v1/credit did not answer 200"

echo "== Postman collection"
npx --yes newman@6 run docs/postman/nestjs-modular-monolith.postman_collection.json \
  --env-var "baseUrl=$API_URL/v1" \
  --env-var "graphqlUrl=$API_URL/graphql" \
  --reporters cli

echo "== GraphQL mutation -> Bull (Redis) -> MongoDB"
email="smoke-$(date +%s)-$RANDOM@example.com"
started_ms=$(( $(date +%s) * 1000 ))
created=$(curl -sS "$API_URL/graphql" -H 'Content-Type: application/json' \
  -d "{\"query\":\"mutation { create(data: {name: \\\"Smoke Test\\\", email: \\\"$email\\\"}) { id email } }\"}")
echo "$created"
id=$(jq -r '.data.create.id // empty' <<<"$created")
[ -n "$id" ] || fail "GraphQL create mutation returned no id"
trap 'curl -s -o /dev/null -X DELETE "$API_URL/v1/users/$id" || true' EXIT

found=$(curl -sS "$API_URL/graphql" -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ findUser(id: $id) { email } }\"}" | jq -r '.data.findUser.email')
[ "$found" = "$email" ] || fail "findUser($id) returned $found, expected $email"

if [ -n "${LOG_GROUP:-}" ]; then
  copied=""
  for _ in $(seq 1 20); do
    copied=$(aws logs filter-log-events --log-group-name "$LOG_GROUP" \
      --log-stream-name-prefix app --start-time "$started_ms" \
      --filter-pattern "\"USER CREATED\" \"$email\"" \
      --query 'length(events)' --output text)
    [ "$copied" != "0" ] && break
    sleep 3
  done
  [ "$copied" != "0" ] || fail "the users-management processor did not log USER CREATED for $email (Redis -> MongoDB)"
  echo "copied to MongoDB"
fi

status=$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "$API_URL/v1/users/$id")
[ "$status" = "204" ] || fail "DELETE /v1/users/$id returned $status, expected 204"
trap - EXIT

echo "All smoke tests passed."
