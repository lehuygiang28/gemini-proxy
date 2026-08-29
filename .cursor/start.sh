#!/usr/bin/env bash
# Cloud Agent `start` phase: per-boot reconciliation of runtime services.
#
# Brings up Docker, the local Supabase stack (Postgres + Auth + REST + Studio,
# with all migrations applied), writes the app env files pointing at that local
# stack, and seeds a demo user + keys so the dashboard and proxy are immediately
# usable. Must be idempotent and must return (the dev servers run as a terminal).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=/dev/null
source "$REPO_ROOT/.cursor/lib-docker.sh"

SUPABASE_API_URL="http://127.0.0.1:54321"
DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="password123"
DEMO_PROXY_KEY="gproxy_demo_local_testkey_123456"

echo "==> Ensuring Docker is running"
ensure_docker_installed
ensure_docker_running

echo "==> Starting local Supabase (applies migrations)"
pnpm exec supabase start || pnpm exec supabase start

# Read the (static) local anon/service keys straight from the running stack.
STATUS="$(pnpm exec supabase status 2>/dev/null)"
ANON_KEY="$(echo "$STATUS" | awk -F': ' '/anon key/{print $2}' | tr -d ' ')"
SERVICE_KEY="$(echo "$STATUS" | awk -F': ' '/service_role key/{print $2}' | tr -d ' ')"

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
    echo "ERROR: could not read Supabase keys from 'supabase status'" >&2
    exit 1
fi

echo "==> Writing app env files (gitignored)"
cat > apps/web/.env.local <<EOF
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_API_URL}
NEXT_PUBLIC_ANON_SUPABASE_KEY=${ANON_KEY}
SUPABASE_URL=${SUPABASE_API_URL}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
EOF

cat > apps/api/.env <<EOF
NODE_ENV=development
API_PORT=9090
SUPABASE_URL=${SUPABASE_API_URL}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
GOOGLE_GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/
GOOGLE_OPENAI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
# Replace with a real Google AI Studio key to get successful proxied responses.
GEMINI_API_KEY='[{"name":"local-placeholder-key","key":"AIzaLOCALPLACEHOLDERKEY0000000000000000"}]'
EOF

# Seed a demo user + one proxy key + one (placeholder) Gemini key so the
# dashboard can be logged into and the proxy exercised immediately.
if [ "${GEMINI_PROXY_SEED_DEMO:-1}" = "1" ]; then
    echo "==> Seeding demo user and keys (idempotent)"

    # Create the demo auth user, retrying until the auth endpoint is ready.
    # 200/201 = created; 409/422 = already exists — both count as success.
    seed_status="000"
    for _attempt in $(seq 1 30); do
        seed_status="$(curl -s -o /dev/null -w '%{http_code}' \
            -X POST "${SUPABASE_API_URL}/auth/v1/admin/users" \
            -H "apikey: ${SERVICE_KEY}" -H "Authorization: Bearer ${SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"${DEMO_EMAIL}\",\"password\":\"${DEMO_PASSWORD}\",\"email_confirm\":true}" \
            2>/dev/null || echo "000")"
        case "$seed_status" in
            200 | 201 | 409 | 422) break ;;
            *) sleep 2 ;;
        esac
    done
    case "$seed_status" in
        200 | 201 | 409 | 422) ;;
        *)
            echo "ERROR: demo user creation failed (last HTTP status: ${seed_status})" >&2
            exit 1
            ;;
    esac

    demo_uid="$(docker exec supabase_db_gemini-proxy psql -U postgres -tAc \
        "SELECT id FROM auth.users WHERE email='${DEMO_EMAIL}' LIMIT 1;" 2>/dev/null | tr -d '[:space:]')"
    if [ -z "$demo_uid" ]; then
        echo "ERROR: demo user '${DEMO_EMAIL}' not found after creation" >&2
        exit 1
    fi

    # `docker exec` needs -i to forward the heredoc on stdin; ON_ERROR_STOP plus
    # set -e make a seeding failure abort the start instead of passing silently.
    docker exec -i supabase_db_gemini-proxy psql -U postgres -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.proxy_api_keys (user_id, proxy_key_value, name, is_active)
VALUES ('${demo_uid}', '${DEMO_PROXY_KEY}', 'Local Demo Proxy Key', true)
ON CONFLICT DO NOTHING;
INSERT INTO public.api_keys (user_id, name, api_key_value, provider, is_active)
VALUES ('${demo_uid}', 'Local Demo Gemini Key', 'AIzaLOCALPLACEHOLDERKEY0000000000000000', 'googleaistudio', true)
ON CONFLICT DO NOTHING;
SQL

    seeded_proxy_keys="$(docker exec supabase_db_gemini-proxy psql -U postgres -tAc \
        "SELECT count(*) FROM public.proxy_api_keys WHERE proxy_key_value='${DEMO_PROXY_KEY}';" 2>/dev/null | tr -d '[:space:]')"
    if [ "${seeded_proxy_keys:-0}" -lt 1 ]; then
        echo "ERROR: demo proxy key was not seeded" >&2
        exit 1
    fi
fi

echo "==> start.sh complete"
echo "    Supabase Studio: ${SUPABASE_API_URL/54321/54323}"
echo "    Web dashboard:   http://localhost:4040  (login: ${DEMO_EMAIL} / ${DEMO_PASSWORD})"
echo "    API server:      http://localhost:9090/api/gproxy"
