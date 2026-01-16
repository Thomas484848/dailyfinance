#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"
ENV_PATH="${ENV_PATH:-.env.local}"

if [[ -z "$API_BASE_URL" ]]; then
  read -r -p "API base URL (ex: http://192.168.1.30:8000): " API_BASE_URL
fi
if [[ -z "$EMAIL" ]]; then
  read -r -p "API login email: " EMAIL
fi
if [[ -z "$PASSWORD" ]]; then
  read -r -s -p "API login password: " PASSWORD
  echo
fi

LOGIN_URL="${API_BASE_URL%/}/api/login"
JSON_BODY=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")

TOKEN=$(curl -sS -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_BODY" | python - <<'PY'
import json, sys
data = json.load(sys.stdin)
token = data.get("token")
if not token:
    raise SystemExit("No token in response")
print(token)
PY
)

if [[ -f "$ENV_PATH" ]]; then
  grep -v '^NEXT_PUBLIC_API_BASE_URL=' "$ENV_PATH" | grep -v '^NEXT_PUBLIC_API_TOKEN=' > "${ENV_PATH}.tmp"
  mv "${ENV_PATH}.tmp" "$ENV_PATH"
fi

{
  echo "NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL"
  echo "NEXT_PUBLIC_API_TOKEN=$TOKEN"
} >> "$ENV_PATH"

echo "Updated $ENV_PATH with API base URL and token."
