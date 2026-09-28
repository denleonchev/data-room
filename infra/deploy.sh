#!/bin/bash
# Runs on the instance as root through SSM Run Command: deploy.sh <image>.
# Replaces the single api container, so the API is down for the few seconds it
# takes to boot. A failed migration aborts before anything is replaced.
set -euo pipefail

IMAGE=$1
REGION=eu-west-1
SSM_PREFIX=/data-room/api
DOMAIN=api.data.bonadev.xyz
DIR=/opt/data-room
NET=data-room

mkdir -p "$DIR/caddy"
cd "$DIR"

# One parameter per variable, named after it. PORT is pinned: Caddy's
# upstream depends on it.
aws ssm get-parameters-by-path --region "$REGION" --path "$SSM_PREFIX" \
  --recursive --with-decryption --query 'Parameters[].[Name,Value]' --output text \
  | while IFS=$'\t' read -r name value; do echo "${name##*/}=$value"; done > api.env.new
echo "PORT=4000" >> api.env.new
chmod 600 api.env.new
mv api.env.new api.env

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${IMAGE%%/*}"
docker pull "$IMAGE"

# Before the old container goes, so a failed migration leaves it serving.
docker run --rm --env-file api.env --network "$NET" "$IMAGE" \
  node_modules/.bin/prisma migrate deploy

docker rm -f api 2>/dev/null || true
docker run -d --name api --restart unless-stopped --network "$NET" \
  --env-file api.env \
  --health-cmd 'node -e "fetch(\"http://localhost:4000/health\").then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"' \
  --health-interval 3s --health-retries 3 --health-start-period 5s \
  "$IMAGE" node dist/main

for _ in $(seq 40); do
  status=$(docker inspect -f '{{.State.Health.Status}}' api)
  [ "$status" = healthy ] || [ "$status" = unhealthy ] && break
  sleep 3
done
if [ "$status" != healthy ]; then
  echo "api never became healthy ($status)" >&2
  docker logs --tail 50 api >&2
  exit 1
fi

cat > caddy/Caddyfile.new <<CADDY
$DOMAIN {
  encode gzip
  reverse_proxy api:4000
}
CADDY
mv caddy/Caddyfile.new caddy/Caddyfile

if [ -n "$(docker ps -q --filter name='^caddy$')" ]; then
  docker exec caddy caddy reload --config /etc/caddy/Caddyfile
else
  docker rm -f caddy 2>/dev/null || true
  docker run -d --name caddy --restart unless-stopped --network "$NET" \
    -p 80:80 -p 443:443 -p 443:443/udp \
    -v "$DIR/caddy:/etc/caddy:ro" -v caddy_data:/data -v caddy_config:/config \
    caddy:2
fi

docker image prune -af >/dev/null
echo "deployed $IMAGE"
