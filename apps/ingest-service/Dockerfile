FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/ingest-service/package.json ./apps/ingest-service/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/ ./
COPY packages/shared/ ./packages/shared/
COPY apps/ingest-service/ ./apps/ingest-service/
COPY tsconfig.base.json ./
RUN pnpm --filter @obs/shared build && pnpm --filter @obs/ingest-service build

FROM base AS runner
WORKDIR /app
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/ingest-service/dist ./apps/ingest-service/dist
COPY --from=build /app/apps/ingest-service/package.json ./apps/ingest-service/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ingest-service/node_modules ./apps/ingest-service/node_modules
WORKDIR /app/apps/ingest-service
CMD ["node", "dist/index.js"]
