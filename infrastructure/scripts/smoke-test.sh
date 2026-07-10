#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://localhost:4000/api/v1}"
DEV_USER_ID="00000000-0000-4000-8000-000000000001"

printf 'Checking health...\n'
curl --fail --silent --show-error "$BASE_URL/health"
printf '\n\nChecking chat...\n'
curl --fail --silent --show-error \
  -X POST "$BASE_URL/chat/messages" \
  -H 'content-type: application/json' \
  -H "x-dev-user-id: $DEV_USER_ID" \
  -d '{"message":"Hello Velunee","locale":"en","timezone":"UTC","inputMode":"text"}'
printf '\n'
