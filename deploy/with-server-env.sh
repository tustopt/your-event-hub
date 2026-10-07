#!/usr/bin/env bash
set -euo pipefail
cd /root/admin/docradar
set -a
source .env.server.local
set +a
exec "$@"
