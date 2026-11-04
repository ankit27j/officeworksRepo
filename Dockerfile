# syntax=docker/dockerfile:1
# One Dockerfile with several targets, so the API and web images share a single `npm ci` layer.
# Build context is the repo root (docker compose sets it up). Targets:
#   api      NestJS API with production dependencies only
#   migrate  one-shot job: apply DB migrations, seed the featured picks, exit
#   web      the static React build served by nginx, which also proxies /api to the API

FROM node:22-alpine AS base
# Prisma's query engine needs OpenSSL, which Alpine doesn't ship.
RUN apk add --no-cache openssl
WORKDIR /app

# --- Shared dependency layer (rebuilt only when a manifest or the lockfile changes) ---
FROM base AS deps
# npm ci checks every workspace manifest against the single root lockfile.
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The API's postinstall runs `prisma generate`, which needs the schema.
COPY apps/api/prisma/schema.prisma apps/api/prisma/
RUN npm ci --no-audit --no-fund

FROM deps AS contracts
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
RUN npm run build -w @catalogue/contracts

# --- API ---
FROM contracts AS api-build
COPY apps/api apps/api
RUN npm run build -w @catalogue/api

FROM api-build AS migrate
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js"]

FROM base AS api-prod-deps
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Scripts are skipped because the Prisma client is generated in api-build and copied in below.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund -w @catalogue/api -w @catalogue/contracts

FROM api-prod-deps AS api
ENV NODE_ENV=production
COPY --from=contracts /app/packages/contracts/dist packages/contracts/dist
COPY --from=api-build /app/node_modules/.prisma node_modules/.prisma
COPY --from=api-build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

# --- Web ---
FROM contracts AS web-build
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY apps/web apps/web
RUN npm run build -w @catalogue/web

FROM nginx:1.27-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
