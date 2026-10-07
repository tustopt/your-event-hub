#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd /root/admin/docradar
trap 'echo "Configuracao interrompida; indica o erro apresentado. As chaves nao precisam de ser partilhadas." >&2' ERR
python3 deploy/configure-supabase.py
python3 deploy/verify-supabase.py
python3 deploy/configure-supabase.py --host
if ! nginx -t; then
    connection_backup=$(cat /root/server-stack/your-event-hub-migration/last-connection-backup)
    cp "$connection_backup/nginx.conf" /etc/nginx/sites-available/gitea-public
    cp "$connection_backup/supabase.env" /opt/supabase/.env
    echo 'Configuracao Nginx anterior reposta; nenhuma base de dados alterada.' >&2
    exit 1
fi
docker compose --project-directory /opt/supabase -f /opt/supabase/docker-compose.yml up -d --no-deps auth
systemctl reload nginx
for attempt in $(seq 1 30); do
    if docker exec supabase-auth wget --quiet --spider http://localhost:9999/health; then break; fi
    sleep 1
done
python3 deploy/verify-supabase.py --public
echo 'Ligacao ao Supabase local configurada e verificada.'
echo 'A aplicacao precisa de carregar .env.server.local em execucao e de recompilar com .env.local.'
