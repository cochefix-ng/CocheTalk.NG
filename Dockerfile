# Multi-stage Dockerfile for CocheTalk API
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

# Copy all project files so pnpm can resolve monorepo workspace references
COPY . .

# Install only dependencies required by the api-server and build the bundle
RUN pnpm install --filter @workspace/api-server... --no-frozen-lockfile
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
