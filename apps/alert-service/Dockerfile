FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/alert-service/package.json ./apps/alert-service/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/ ./
COPY packages/shared/ ./packages/shared/
COPY apps/alert-service/ ./apps/alert-service/
COPY tsconfig.base.json ./
RUN pnpm --filter @obs/shared build && pnpm --filter @obs/alert-service build

FROM base AS runner
WORKDIR /app
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/alert-service/dist ./apps/alert-service/dist
COPY --from=build /app/apps/alert-service/package.json ./apps/alert-service/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/alert-service/node_modules ./apps/alert-service/node_modules
WORKDIR /app/apps/alert-service
CMD ["node", "dist/index.js"]
