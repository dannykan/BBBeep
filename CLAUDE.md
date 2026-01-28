# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BBBeep / UBeep (路上提醒平台) is a one-way anonymous message reminder system for drivers. Users send caring reminders to other drivers via license plates. This is NOT a chat platform - it's a private, one-time reminder delivery service.

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

### Mobile Commands (run from /apps/mobile)
```bash
pnpm start              # Start Expo dev server
pnpm ios                # Run on iOS simulator
pnpm android            # Run on Android emulator
npx expo prebuild       # Generate native projects
npx eas build           # Build with EAS
```

## Architecture

### Monorepo Structure (pnpm workspace)
```
BBBeep/
├── apps/
│   ├── web/          # Next.js 14 (App Router) + TypeScript + Tailwind CSS + Radix UI
│   ├── api/          # NestJS + TypeScript + PostgreSQL (Prisma) + Redis
│   └── mobile/       # React Native Expo (SDK 54) + TypeScript
├── packages/
│   └── shared/       # Shared utilities, API clients, validators, content-filter
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

Key modules: `auth/`, `users/`, `messages/`, `points/`, `ai/`, `admin/`, `drafts/`, `activities/`

**IMPORTANT:** 新增模組後，必須在 `app.module.ts` 的 `imports` 陣列中加入該模組，否則 API 路由會返回 404。

### Shared Package (`@bbbeeep/shared`)
Cross-platform utilities used by web, mobile, and API:
- `api/` - API client wrappers (messagesApi, uploadApi, activitiesApi, etc.)
- `content-filter/` - Local profanity/threat detection (台灣中文)
- `utils/` - License plate formatting (`displayLicensePlate`)
- `validators/` - Zod schemas
- `types/` - Shared TypeScript types

### Mobile App Architecture
**State Management via React Context:**
- `AuthContext` - Authentication state, JWT tokens
- `SendContext` - Send flow state, AI moderation, point costs
- `ThemeContext` - Dark/light mode
- `NotificationContext` - Push notification handling
- `DraftContext` - Message draft persistence
- `UnreadContext` - Unread message counts
- `OnboardingContext` - New user onboarding flow

**Navigation Structure:**
- `RootNavigator` → Auth vs Main flow
- `MainNavigator` → Bottom tabs (Home, Send, Inbox, Wallet, Settings)
- `SendNavigator` → Send flow screens (PlateInput → Category → MessageEdit → Confirm → Success)
- `OnboardingNavigator` → New user setup

**Important:** `SendProvider` is at `App.tsx` level (not in SendNavigator) so both QuickRecordScreen and SendNavigator can share the same context.

### Frontend (Web) State Management
- Global state via React Context (`src/context/AppContext.tsx`)
- API calls through `src/lib/api.ts` (Axios wrapper)
- Form handling with React Hook Form + Zod validation

### Authentication Flow
1. Phone number registration → OTP verification (Redis-cached)
2. Social login options: Apple Sign In, LINE Login
3. JWT token issued, stored in SecureStore (mobile) / localStorage (web)
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
- `IAPTransaction` - IAP 收據驗證記錄（防止重複加點）
- `VoiceDraft` - 語音草稿

## Environment Variables

### API (.env in apps/api/)
```
DATABASE_URL=postgresql://user:password@localhost:5432/bbbeeep
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=your-key  # or GOOGLE_AI_API_KEY
PORT=3001
APPLE_IAP_SHARED_SECRET=your-shared-secret  # App Store Connect → App 內購買項目 → App 專用共享密鑰
```

### Web (.env.local in apps/web/)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Mobile (.env in apps/mobile/)
```
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
EXPO_PUBLIC_LINE_CHANNEL_ID=your-line-channel-id
```

## API Documentation

Swagger UI available at `http://localhost:3001/api` when backend is running.

## Design System

**Warm Blue Theme (2026-01 更新):**
- Primary: `#3B82F6`
- Primary Dark: `#2563EB`
- Primary Light: `#93C5FD`
- Primary BG: `#EFF6FF`
- Warning/CTA: `#F59E0B`

Theme files: `packages/shared/src/theme/` (colors, typography, spacing)
Mobile dark mode: `apps/mobile/src/context/ThemeContext.tsx`

### Pencil 設計轉移注意事項

從 Pencil 設計工具轉移 UI 到 React Native 時的常見問題與解法：

| 問題 | 原因 | 解法 |
|------|------|------|
| **漸層不顯示** | `expo-linear-gradient` 不支援 New Architecture | 使用 `react-native-svg` 建立 `GradientBackground` 組件 |
| **多個漸層衝突** | SVG gradient ID 重複 | 每個 gradient 實例生成唯一 ID (`gradient-${++counter}`) |
| **漸層不隨內容擴展** | SVG 絕對定位無法自動調整大小 | 使用 `onLayout` 測量容器尺寸，傳入 SVG 的 width/height |
| **Tab Bar 消失** | 樣式衝突或高度未設定 | 在 `MainNavigator` 明確設定 `tabBarStyle` 的 height 和 padding |
| **Theme 屬性變更** | 更新 theme 後舊屬性被移除 | 全域搜尋替換 (如 `borderSolid` → `border`) |

**GradientBackground 組件:** `apps/mobile/src/components/GradientBackground.tsx`
- 支援 colors, start, end, borderRadius
- 使用 `onLayout` + explicit dimensions 確保 SVG 正確填滿容器

## Deployment

- Web: Cloudflare Pages (`pnpm --filter @bbbeeep/web pages:build`)
- API: Railway (uses `apps/api/scripts/start.sh`)
- Mobile: EAS Build (Expo Application Services)
- CI/CD: GitHub Actions (`.github/workflows/`)

### Railway Database Migration (IMPORTANT)

**Railway 部署後必須手動執行 migration！** 啟動腳本的自動 migration 可能會失敗。

```bash
# 使用 Railway 的 DATABASE_URL 執行 migration
DATABASE_URL="postgresql://postgres:vvwPjtlWWHJtuyStLOUvsWsqzLkzhjzp@switchyard.proxy.rlwy.net:34823/railway" npx prisma migrate deploy
```

每次修改 `schema.prisma` 後，push 到 GitHub 後都需要手動執行此命令。

## Working Conventions

### Session Continuity (IMPORTANT)
**Before auto-compact or ending a session**, update `apps/mobile/CHANGELOG.md` with:
1. 解決的問題和解決方案
2. 修改的主要檔案
3. 重要的技術發現或限制
4. 未完成的待處理事項

**At the start of each session**, read `apps/mobile/CHANGELOG.md` to understand recent changes.

### Documentation Updates
After completing significant changes (new features, flow changes, business rule changes, architecture updates), **always ask the user**: "要不要更新 CLAUDE.md 記錄這次的改動？"

This ensures important decisions and patterns are documented for future sessions.

## Business Rules (MUST FOLLOW)

### Point Cost Rules
When displaying or calculating point costs, follow these rules strictly:

| Send Mode | Category | Point Cost |
|-----------|----------|------------|
| Template (未編輯) | 讚美感謝 | **免費 (0 點)** |
| Template (未編輯) | 其他類別 | 1 點 |
| Text (AI 審核通過) | Any | 2 點 |
| Text (堅持原內容) | Any | 4 點 |
| AI 優化 | Any | 2 點 |
| Voice | Any | 8 點 |

**Key Implementation:**
- `SendContext.tsx` → `getPointCost()` handles the logic
- `MessageEditScreen.tsx` → UI buttons must dynamically display correct points based on `selectedCategory`

### AI Moderation Categories
AI moderation returns one of these categories:

| Category | Behavior |
|----------|----------|
| `ok` | Content passes - show normal submit options |
| `emotional` | Show "AI 優化（推薦）" button + "堅持原內容" button with warning |
| `inappropriate` | Content unrelated to traffic - ask to re-edit, no submit buttons |
| `dangerous` | Threats/harassment - ask to re-edit, no submit buttons |

### Content Warning UI
- Keep warning messages concise
- Do NOT include legal terms like "公然侮辱、誹謗" - just mention "可能有法律風險"
- For `inappropriate`/`dangerous`: show "請修改為與行車相關的內容"
- For `emotional`: show "建議使用 AI 優化，或修改後再發送"

## Mobile Send Flow (4 Steps)

The send flow uses a step indicator showing progress: `1 → 2 → 3 → 最後確認`

1. **PlateInputScreenV2** - Enter target license plate
2. **CategoryScreenV2** - Select category (車況提醒, 行車安全, 讚美感謝)
3. **MessageEditScreen** - Edit message (template, text, voice, AI optimize)
4. **ConfirmScreenV2** - Final review before sending

### Key Files:
- `SendContext.tsx` - All send flow state and logic
- `components.tsx` - Shared layout (`SendLayout`, `CompactStepHeader`)
- Step screens in `apps/mobile/src/screens/send/`

### IMPORTANT: Use V2 Screens
The app uses **V2 versions** of screens. When modifying send flow:
- Use `PlateInputScreenV2.tsx`, NOT `PlateInputScreen.tsx`
- Use `CategoryScreenV2.tsx`, NOT `CategoryScreen.tsx`
- Use `ConfirmScreenV2.tsx`, NOT `ConfirmScreen.tsx`
- V1 screens are legacy code kept for reference only
- Navigation is configured in `SendNavigator.tsx` (line 48: `component={ConfirmScreenV2}`)

## MapLocationPicker Component

Location: `apps/mobile/src/components/MapLocationPicker.tsx`

Full-featured location picker for selecting incident location in send flow.

### Features:
- **Map Display** - Apple Maps on iOS, Google Maps on Android
- **Address Autocomplete** - Real-time suggestions as user types (400ms debounce, min 2 chars)
- **Current Location** - GPS button with permission handling
- **Map Interaction** - Tap to place marker, drag marker to adjust
- **Reverse Geocoding** - Converts coordinates to readable address
- **Taiwan Optimized** - Filters results to Taiwan, removes postal codes, simplifies addresses

### Google APIs vs Google Maps SDK (IMPORTANT)

| API | iOS | Android | Notes |
|-----|-----|---------|-------|
| Geocoding API | ✅ Works | ✅ Works | HTTP API for address search |
| Reverse Geocoding | ✅ Works | ✅ Works | HTTP API for coords → address |
| Google Maps SDK | ❌ Crashes | ✅ Works | Native SDK incompatible with RN New Architecture |

**iOS uses Apple Maps** for map display because Google Maps SDK crashes with React Native New Architecture (`newArchEnabled: true`). The crash occurs in `RCTThirdPartyComponentsProvider.mm`. This is a known react-native-maps issue.

**All Google HTTP APIs work fine** - only the native Maps SDK is affected.

### DateTimePicker (New Architecture Incompatible)

`@react-native-community/datetimepicker` does NOT work with React Native New Architecture. All display modes (`spinner`, `inline`, `compact`) show "Unimplemented component: RNDateTimePicker".

**Solution:** Use a custom time picker built with ScrollView components. See `ConfirmScreenV2.tsx` for implementation:
- Three columns: Date (月/日), Hour (時), Minute (分)
- ScrollView with `snapToInterval={44}` for wheel-like behavior
- Center highlight bar to show selected row
- Future time restrictions (disable hours/minutes after current time when "today" is selected)

### Required Setup:
1. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`
2. Run `npx expo prebuild` to generate native config
3. Use development build (not Expo Go)

### AddressAutocomplete Component
Location: `apps/mobile/src/components/AddressAutocomplete.tsx`

Standalone address input with Google Geocoding API autocomplete. Used in `ConfirmScreenV2` for location editing. Same implementation as web version (`apps/web/src/components/ui/address-autocomplete.tsx`).

## Voice Memo / Draft Flow

Voice drafts are saved locally for later editing. **No AI processing** is involved in the draft stage.

### Flow:
1. User records voice memo via QuickRecordScreen
2. Recording is uploaded and saved as draft with `status: READY`
3. User can later open draft from DraftsScreen
4. Clicking "繼續編輯" sets voiceMemo in SendContext and navigates to Send flow

### Key Files:
- `QuickRecordScreen.tsx` - Voice recording UI
- `DraftsScreen.tsx` - List of saved drafts
- `DraftCard.tsx` - Individual draft display (voice player, transcript, location)
- `VoiceMemoPlayer.tsx` - Reusable voice playback component

### Important Notes:
- DraftCard does NOT show AI analysis (no parsed plates, vehicle info, suggested messages)
- Drafts expire after 24 hours (handled by backend cron job)
- VoiceMemoPlayer appears at top of SendLayout when voiceMemo exists (except on SuccessScreen)

## In-App Purchase (IAP)

### react-native-iap v14+ API 格式 (IMPORTANT)

```javascript
// 正確格式 - 需要嵌套在 request.apple 裡
import { requestPurchase } from 'react-native-iap';

if (Platform.OS === 'ios') {
  await requestPurchase({
    request: {
      apple: {
        sku: productId,
        quantity: 1,
        andDangerouslyFinishTransactionAutomatically: false,
      },
    },
  });
} else {
  await requestPurchase({
    request: {
      google: {
        skus: [productId],
      },
    },
  });
}
```

**常見錯誤：** 直接傳 `{ sku: productId }` 會出現 "Missing purchase request configuration" 錯誤。

### IAP 產品 ID
```
com.ubeep.mobile.points_15   # 15 點 NT$75
com.ubeep.mobile.points_40   # 40 點 NT$150
com.ubeep.mobile.points_120  # 120 點 NT$300
com.ubeep.mobile.points_300  # 300 點 NT$600
```

### IAP 上架前置作業
1. **App Store Connect 協議設定：**
   - 付費 App 協議必須是「有效」狀態
   - 需完成銀行帳戶設定
   - 需完成稅務表格（台灣稅務表格 + 美國 W-8BEN）

2. **W-8BEN 填寫重點（台灣個人開發者）：**
   - Part II 第 9 項：勾選確認是台灣稅務居民
   - Article and paragraph：填 `12 and 2(a)`
   - Rate：填 `10`（台美稅務協定優惠稅率）
   - 選擇 "Income from the sale of applications"

3. **IAP 產品設定：**
   - 每個產品需填寫：顯示名稱、說明、審查截圖
   - 產品建立後需等待 30-60 分鐘讓 App Store Connect 同步
   - TestFlight 測試需使用 Sandbox 帳號

### IAP 收據驗證 API

後端實作了完整的 IAP 收據驗證：

```
POST /points/verify-iap
{
  "transactionId": "string",
  "productId": "com.ubeep.mobile.points_15",
  "platform": "ios" | "android",
  "receiptData": "string (optional)"
}
```

**驗證流程：**
1. 檢查 `transactionId` 是否已處理過（防止重複加點）
2. 呼叫 Apple verifyReceipt API 驗證收據
3. 自動區分 Sandbox/Production 環境
4. 驗證成功後記錄到 `IAPTransaction` 並發放點數

**Key Files:**
- `apps/api/src/points/points.service.ts` → `verifyIAPPurchase()`
- `apps/mobile/src/screens/settings/WalletScreen.tsx` → `purchaseUpdatedListener`
- `packages/shared/src/api/services/points.ts` → `pointsApi.verifyIAP()`

### Sandbox 測試帳號設定

1. **App Store Connect** → 使用者和存取權限 → 沙盒 → 測試人員
2. 建立新帳號時選擇**台灣**地區（才會顯示台幣價格）
3. 可用 Gmail 的 `+` 標籤：`yourname+sandbox@gmail.com`
4. iPhone 設定：**設定 → Developer → Sandbox Apple Account** 登入

## iOS Build 注意事項

### Firebase/CocoaPods 相容性

Firebase 與 React Native New Architecture 有 Swift module 衝突問題。

**解決方案：** 使用 Expo Config Plugin 自動修改 Podfile：
- Plugin 位置：`apps/mobile/plugins/withModularHeaders.js`
- 已在 `app.config.js` 中引用

如果 EAS Build 失敗並顯示 `FirebaseCoreInternal depends upon GoogleUtilities, which does not define modules`，確認 plugin 已正確設定。

**本地開發時**，`ios/Podfile` 已有 `use_modular_headers!`，但 EAS Build 會重新生成，所以需要 plugin。

### Build Number 管理
- `app.json` 的 `buildNumber` 和 `ios/UBeep/Info.plist` 的 `CFBundleVersion` 要同步
- 每次上傳 TestFlight 都需要遞增 build number
- 用 PlistBuddy 更新：`/usr/libexec/PlistBuddy -c "Set :CFBundleVersion X" ios/UBeep/Info.plist`

### API Client 初始化
`initializeApiClient()` 必須在 App.tsx 模組層級呼叫（不是在 useEffect 裡），確保所有 Provider 的 useEffect 執行前 API Client 已初始化。
