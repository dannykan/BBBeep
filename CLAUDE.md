# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BBBeep (路上提醒平台) is a one-way anonymous message reminder system for drivers. Users send caring reminders to other drivers via license plates. This is NOT a chat platform - it's a private, one-time reminder delivery service.

## Development Commands

```bash
# Install all dependencies (root, frontend, backend)
npm run install:all

# Start development servers (both frontend and backend)
npm run dev

# Start individually
npm run dev:frontend       # http://localhost:3000
npm run dev:backend        # http://localhost:3001

# Build
npm run build              # Build both
npm run build:frontend
npm run build:backend
```

### Backend Commands (run from /backend)
```bash
npm run start:dev          # Dev server with watch
npm run test               # Run Jest tests
npm run test:watch         # Run tests in watch mode
npm run test -- --testPathPattern=auth  # Run single test file/pattern
npm run test:e2e           # End-to-end tests
npm run lint               # ESLint with auto-fix

# Prisma commands
npm run prisma:generate    # Generate Prisma client after schema changes
npm run prisma:migrate     # Create new migration (dev)
npm run migration:run      # Apply migrations (production)
npm run prisma:studio      # Open Prisma Studio GUI
```

### Frontend Commands (run from /frontend)
```bash
npm run dev                # Dev server
npm run build              # Production build
npm run lint               # ESLint
npm run pages:build        # Cloudflare Pages build
```

## Architecture

### Monorepo Structure
- **frontend/**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Radix UI
- **backend/**: NestJS + TypeScript + PostgreSQL (Prisma) + Redis

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
- License plate normalization: `backend/src/common/utils/license-plate.util.ts`
- AI rewriting: 5 per-day limit tracked via Redis
- Admin panel route: `/BBBeepadmin2026`

## Database

Schema: `backend/prisma/schema.prisma`

Key models:
- `User` - phone, license plate, userType (DRIVER/PEDESTRIAN), vehicleType, points
- `Message` - type (VEHICLE_REMINDER/SAFETY_REMINDER/PRAISE), sender/receiver relations
- `BlockedUser`/`RejectedUser` - blocking relationships
- `PointHistory` - transaction tracking
- `AIUsageLog` - daily AI usage limits

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/bbbeeep
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-key  # or GOOGLE_AI_API_KEY
PORT=3001
```

### Frontend (.env.local)
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

- Frontend: Cloudflare Pages (`npm run pages:build`)
- Backend: Railway (uses `scripts/start.sh`)
- CI/CD: GitHub Actions (`.github/workflows/`)
