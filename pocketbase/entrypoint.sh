#!/bin/sh
set -eu

key="${PB_ENCRYPTION_KEY:-}"
if [ "${#key}" -ne 32 ]; then
  echo "PB_ENCRYPTION_KEY must be configured as an exact 32-character secret." >&2
  exit 1
fi

exec /pb/pocketbase serve \
  --http=0.0.0.0:8080 \
  --dir=/pb/pb_data \
  --hooksDir=/pb/pb_hooks \
  --encryptionEnv=PB_ENCRYPTION_KEY \
  --origins=https://linktery.com,https://www.linktery.com,https://linktery.bio,https://hotme.online,https://hotmylinks.cc,https://linktery-frontend-staging.footballonewso01.workers.dev
