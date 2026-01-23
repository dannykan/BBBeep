FROM node:18-slim AS builder

# Install OpenSSL and build tools
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy all workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Install dependencies (skip postinstall, we'll build manually)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build shared package
RUN pnpm --filter @bbbeeep/shared build

# Generate Prisma and build API
RUN pnpm --filter @bbbeeep/api prisma:generate
RUN pnpm --filter @bbbeeep/api build

# Production image
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nestjs

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/scripts ./scripts
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/packages/shared/dist ./node_modules/@bbbeeep/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@bbbeeep/shared/package.json

# Make start script executable
RUN chmod +x ./scripts/start.sh

USER nestjs

EXPOSE 3001

ENV PORT=3001

CMD ["/bin/sh", "./scripts/start.sh"]
