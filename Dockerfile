# Multi-stage Dockerfile for CocheTalk API
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies and build API bundle
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 8080

CMD ["node", "./dist/index.mjs"]
