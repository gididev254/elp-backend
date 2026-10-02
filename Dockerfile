# Dockerfile for Embuni ELC Backend (Express)
# Multi-stage build for production

FROM node:20-alpine AS base
RUN npm install -g bun

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY backend/package.json backend/bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./backend/
COPY database/prisma ./database/prisma
WORKDIR /app/backend
RUN bun run build || true  # TypeScript build (may have type errors in dev)

# Stage 3: Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/database ./database

USER expressjs
EXPOSE 3001

WORKDIR /app/backend
CMD ["bun", "run", "src/server.ts"]
