# apps/api image, built from the repo root so packages/shared is in context.
FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @data-room/shared build && pnpm --filter @data-room/api build
# `pnpm deploy` packs the api with its prod deps only, shared included as a
# real copy rather than a workspace symlink. dist/ is gitignored, so the pack
# leaves it out — copied in by hand.
RUN pnpm --filter @data-room/api deploy --prod --ignore-scripts /out \
  && cp -r apps/api/dist /out/dist

FROM node:24-slim
# Prisma's migrate engine links against OpenSSL, which the slim image lacks.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out .
USER node
EXPOSE 4000
# Migrations run before the server boots.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
