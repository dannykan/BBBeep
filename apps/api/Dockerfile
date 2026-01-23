FROM node:18-slim AS base

# Install OpenSSL and build tools for native modules
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (skip postinstall since source files aren't copied yet)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Rebuild native modules (bcrypt, etc.)
RUN pnpm rebuild

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Generate Prisma Client and build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm build

# Production image
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nestjs

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/scripts ./scripts
COPY --from=builder /app/packages/shared/dist ./node_modules/@bbbeeep/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@bbbeeep/shared/package.json

# Make start script executable
RUN chmod +x ./scripts/start.sh

USER nestjs

EXPOSE 3001

ENV PORT=3001

CMD ["/bin/sh", "./scripts/start.sh"]
