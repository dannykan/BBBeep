# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BBBeep (路上提醒平台) is a one-way anonymous message reminder system for drivers. Users send caring reminders to other drivers via license plates. This is NOT a chat platform - it's a private, one-time reminder delivery service.

## Development Commands

```bash
# Install all dependencies (uses pnpm workspaces)
pnpm install

# Start development servers (both web and api)
pnpm dev

# Start individually
pnpm dev:web        # http://localhost:3000
pnpm dev:api        # http://localhost:3001

# Build
pnpm build          # Build both
pnpm build:web
pnpm build:api

# Lint all packages
pnpm lint

# Run tests
pnpm test
```

### API Commands (run from /apps/api or use pnpm filter)
```bash
pnpm --filter @bbbeeep/api start:dev    # Dev server with watch
pnpm --filter @bbbeeep/api test         # Run Jest tests
pnpm --filter @bbbeeep/api test:watch   # Run tests in watch mode
pnpm --filter @bbbeeep/api lint         # ESLint with auto-fix

# Prisma commands
pnpm prisma:generate    # Generate Prisma client after schema changes
pnpm prisma:migrate     # Create new migration (dev)
pnpm prisma:studio      # Open Prisma Studio GUI
```

### Web Commands (run from /apps/web or use pnpm filter)
```bash
pnpm --filter @bbbeeep/web dev           # Dev server
pnpm --filter @bbbeeep/web build         # Production build
pnpm --filter @bbbeeep/web lint          # ESLint
pnpm --filter @bbbeeep/web pages:build   # Cloudflare Pages build
```

## Architecture

### Monorepo Structure (pnpm workspace)
```
BBBeep/
├── apps/
│   ├── web/          # Next.js 14 (App Router) + TypeScript + Tailwind CSS + Radix UI
│   ├── api/          # NestJS + TypeScript + PostgreSQL (Prisma) + Redis
│   └── mobile/       # (Future) React Native Expo app
├── packages/
│   └── shared/       # (Future) Shared types, validators, API client
├── pnpm-workspace.yaml
└── package.json
```

### Backend Module Pattern
Each feature follows NestJS conventions:
- `module.ts` - Module definition with imports/exports
- `controller.ts` - HTTP endpoints with Swagger decorators
- `service.ts` - Business logic
- `dto/` - Request/response validation with class-validator
- `entities/` - Prisma model types

Key modules: `auth/`, `users/`, `messages/`, `points/`, `ai/`, `admin/`

### Frontend State Management
- Global state via React Context (`src/context/AppContext.tsx`)
- API calls through `src/lib/api.ts` (Axios wrapper)
- Form handling with React Hook Form + Zod validation

### Authentication Flow
1. Phone number registration → OTP verification (Redis-cached)
2. Password setup after phone verification
3. JWT token issued, used for subsequent requests
4. Guards: `JwtAuthGuard`, `AdminGuard`

### Key Patterns
- License plate normalization: `apps/api/src/common/utils/license-plate.util.ts`
- AI rewriting: 5 per-day limit tracked via Redis
- Admin panel route: `/BBBeepadmin2026`

## Database

Schema: `apps/api/prisma/schema.prisma`

Key models:
- `User` - phone, license plate, userType (DRIVER/PEDESTRIAN), vehicleType, points
- `Message` - type (VEHICLE_REMINDER/SAFETY_REMINDER/PRAISE), sender/receiver relations
- `BlockedUser`/`RejectedUser` - blocking relationships
- `PointHistory` - transaction tracking
- `AIUsageLog` - daily AI usage limits

## Environment Variables

### API (.env in apps/api/)
```
DATABASE_URL=postgresql://user:password@localhost:5432/bbbeeep
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-key  # or GOOGLE_AI_API_KEY
PORT=3001
```

### Web (.env.local in apps/web/)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API Documentation

Swagger UI available at `http://localhost:3001/api` when backend is running.

## Design System

Modern Calm Blue theme:
- Primary: `#4A6FA5`
- CTA: `#3C5E8C`
- Selected state: `#EAF0F8`

## Deployment

- Web: Cloudflare Pages (`pnpm --filter @bbbeeep/web pages:build`)
- API: Railway (uses `apps/api/scripts/start.sh`)
- CI/CD: GitHub Actions (`.github/workflows/`)
