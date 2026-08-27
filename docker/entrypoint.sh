#!/bin/sh
set -eu

load_secret() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  eval "file_path=\${$file_variable_name:-}"

  if [ -n "$file_path" ]; then
    if [ ! -r "$file_path" ]; then
      printf 'Secret file is not readable: %s\n' "$file_path" >&2
      exit 1
    fi
    export "${variable_name}=$(cat "$file_path")"
    eval "unset $file_variable_name"
  fi
}

for variable_name in \
  DATABASE_PASSWORD \
  BETTER_AUTH_SECRET \
  AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY \
  SMTP_PASSWORD \
  INNGEST_EVENT_KEY \
  INNGEST_SIGNING_KEY \
  SLACK_TOKEN_ENCRYPTION_KEY \
  LINEAR_TOKEN_ENCRYPTION_KEY \
  JIRA_TOKEN_ENCRYPTION_KEY \
  GITHUB_APP_ID \
  GITHUB_PRIVATE_KEY \
  GITHUB_WEBHOOK_SECRET
do
  load_secret "$variable_name"
done

if [ -z "${DATABASE_URL:-}" ]; then
  : "${DATABASE_PASSWORD:?DATABASE_PASSWORD or DATABASE_URL is required}"
  DATABASE_URL="postgresql://${DATABASE_USER:-fasterfixes}:${DATABASE_PASSWORD}@${DATABASE_HOST:-postgres}:5432/${DATABASE_NAME:-fasterfixes}?schema=public"
  export DATABASE_URL
fi

if [ "$(id -u)" = "0" ] && [ -n "${RUN_AS_UID:-}" ] && [ -n "${RUN_AS_GID:-}" ]; then
  exec setpriv \
    --reuid="$RUN_AS_UID" \
    --regid="$RUN_AS_GID" \
    --clear-groups \
    -- "$@"
fi

exec "$@"
