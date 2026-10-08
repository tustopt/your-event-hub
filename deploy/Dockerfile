# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2 AS bun
FROM node:22-bookworm-slim AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run test
ENV NITRO_PRESET=node-server DOCRADAR_BASE_PATH=/docradar/
RUN --mount=type=secret,id=public_env,target=/app/.env.local,required=true \
    bun run build && test -f .output/server/index.mjs

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
