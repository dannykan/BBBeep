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

### HomeScreen Hero Card 設計 (2026-01 更新)

Hero Card 整合個人資訊，布局如下：

```
┌─────────────────────────────────────────┐
│ 早安，大大 👋           🚗 ABC-1234    │  ← 左：問候語 / 右：車牌 Badge
│                                         │
│ 讓路上多一點善意 💙                     │  ← 標題
│ 透過車牌發送善意提醒，讓駕駛更安全      │  ← 副標題
│                                         │
│ ┌─────────────┐  ┌─────────────┐       │
│ │  手動輸入   │  │  語音錄製   │       │  ← 按鈕
│ └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────┘
```

**問候語邏輯：**
- 05:00 - 11:59 → 「早安」
- 12:00 - 17:59 → 「午安」
- 18:00 - 04:59 → 「晚安」

**顯示名稱：** 有暱稱顯示暱稱，無暱稱顯示「大大」（台灣網路用語）

**車牌 Badge：** 半透明背景 `rgba(255, 255, 255, 0.2)` + 白色文字 + VehicleIcon

### 試用天數動態顏色

試用期 Badge 根據剩餘天數變色，提醒用戶：

| 剩餘天數 | 背景色 | 文字顏色 | 狀態 |
|----------|--------|----------|------|
| ≥ 7 天 | `#F3E8FF` | `#8B5CF6` (紫) | 正常 |
| 4-6 天 | `#FEF3C7` | `#D97706` (橘) | 提醒 |
| 1-3 天 | `#FEE2E2` | `#DC2626` (紅) | 緊急 |

**Key Files:**
- `apps/mobile/src/screens/main/HomeScreen.tsx` → Hero Card + 問候語 + 試用顏色
- `apps/mobile/src/screens/settings/WalletScreen.tsx` → 試用顏色（半透明版本）

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

### Point Cost Rules (2026-01-30 更新)

**試用期政策：**
- 試用期：**14 天**
- 試用點數：**80 點**（等於 10 次語音）

**點數規則（簡化版）：**

| 功能 | 點數 |
|------|------|
| 文字訊息（所有模式） | **免費** |
| 語音訊息 | **8 點** |
| 回覆訊息 | **免費** |
| AI 優化次數 | 5 次/天（不扣點） |

**設計理念：**
- 文字功能完全免費，降低用戶使用門檻
- 語音是付費功能（8 點/次），試用期提供 80 點 = 10 次免費語音
- 點數未來可能有其他用途，保持統一的點數計價系統

**Key Implementation:**
- `apps/api/src/config/points.config.ts` → 所有點數規則設定
- `SendContext.tsx` → `getPointCost()` 前端點數計算（語音 8 點、其他 0 點）
- `messages.service.ts` → 後端扣點邏輯
- `MessageEditScreen.tsx` → UI 顯示「免費」或「8 點」

**遷移腳本：**
- `apps/api/scripts/migrate-trial-points.ts` → 更新現有用戶的試用點數

### AI Moderation Categories (2026-01 簡化)
AI moderation returns one of these categories:

| Category | Behavior |
|----------|----------|
| `ok` | Content passes - show normal submit options |
| `emotional` | Show warning + AI optimization option, **allow sending** |
| `inappropriate` | Show warning + AI optimization option, **allow sending** |
| `dangerous` | Show warning + AI optimization option, **allow sending** |

**重要原則：** 不要阻擋用戶發送！所有類別都允許用戶送出，只是顯示警告。

### Content Warning UI (2026-01 簡化)
- 統一警告訊息：「內容可能有法律風險，送出前請三思」
- 統一建議：「建議使用 AI 優化讓訊息更友善」
- 使用黃色警告樣式（不是紅色錯誤樣式）
- **不阻擋發送**，只是提醒用戶

### Profanity Dictionary Management (2026-01 新增)

詞庫可透過 Admin 後台管理，App 會自動同步最新詞庫。

**架構：**
```
Admin 修改詞庫 → 版本號遞增 → App 啟動時檢查版本 → 有更新就下載 → 使用新詞庫檢查
```

**Admin 頁面：** `/BBBeepadmin2026/profanity`
- 新增/編輯/刪除詞彙
- 批量匯入
- 篩選：類別、嚴重度、啟用狀態

**API Endpoints：**
| Endpoint | 說明 | 權限 |
|----------|------|------|
| `GET /profanity/version` | 取得版本號 | 公開 |
| `GET /profanity/dictionary` | 取得完整詞庫 | 公開 |
| `GET /profanity/admin` | 列出所有詞彙 | Admin |
| `POST /profanity/admin` | 新增詞彙 | Admin |
| `POST /profanity/admin/import` | 批量匯入 | Admin |
| `PUT /profanity/admin/:id` | 更新詞彙 | Admin |
| `DELETE /profanity/admin/:id` | 刪除詞彙 | Admin |

**詞彙類別：**
- `PROFANITY` - 髒話/粗話
- `THREAT` - 威脅性言語
- `HARASSMENT` - 騷擾性言語
- `DISCRIMINATION` - 歧視性言語

**嚴重度：** `LOW` / `MEDIUM` / `HIGH`

**Mobile 同步機制：**
- `apps/mobile/src/lib/profanitySync.ts` - 同步邏輯
- App 啟動時呼叫 `initProfanitySync()`
- 詞庫快取在 AsyncStorage
- `checkProfanityFromSync()` 用於檢查文字

**Key Files:**
- `apps/api/src/profanity/` - 後端模組
- `apps/web/src/app/BBBeepadmin2026/profanity/page.tsx` - Admin 頁面
- `packages/shared/src/api/services/profanity.ts` - API client

### Messages API 格式要求 (CRITICAL)

發送訊息時，必須遵守後端 DTO 的格式要求：

| 參數 | 格式要求 | 錯誤範例 | 正確範例 |
|------|----------|----------|----------|
| `type` | **必須使用中文值** | `'VEHICLE_REMINDER'` ❌ | `'車況提醒'` ✅ |
| `insistOriginal` | **不存在於 DTO** | `insistOriginal: true` ❌ | 不要傳送此參數 ✅ |

**允許的 `type` 值（只有三種）：**
- `'車況提醒'`
- `'行車安全提醒'`
- `'讚美感謝'`

**注意：** 後端使用 class-validator，任何不在 DTO 中的參數都會導致 400 錯誤。新增 API 呼叫時，務必先查看 `apps/api/src/messages/dto/create-message.dto.ts` 確認參數格式。

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
- **Map Display** - Google Maps on both iOS and Android
- **Address/Landmark Search** - Places Autocomplete API supports POIs (台北101, 星巴克)
- **Current Location** - GPS button with permission handling
- **Map Interaction** - Tap to place marker, drag marker to adjust
- **Reverse Geocoding** - Converts coordinates to readable address
- **Taiwan Optimized** - Filters results to Taiwan, removes postal codes, simplifies addresses

### Google Maps Implementation (2026-01 更新)

| Platform | Map Display | Address Search |
|----------|-------------|----------------|
| iOS | `GoogleMapsWebView` (WebView + JS API) | Places Autocomplete API |
| Android | react-native-maps + `PROVIDER_GOOGLE` | Places Autocomplete API |

**iOS 使用 WebView 方案**：Google Maps native SDK 在 React Native New Architecture 會 crash，所以改用 `GoogleMapsWebView` 組件（WebView + Google Maps JavaScript API）來顯示地圖。

**Key Files:**
- `GoogleMapsWebView.tsx` - WebView-based Google Maps for iOS
- `MapLocationPicker.tsx` - Location picker modal
- `LocationDisplay.tsx` - Mini map in message details
- `AddressAutocomplete.tsx` - Address input with Places API

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

Standalone address input with **Google Places Autocomplete API**. Supports searching:
- 地址（台北市信義區信義路五段）
- 地標（台北101、信義誠品）
- 店家（星巴克、全聯）

Used in `ConfirmScreenV2` for location editing.

## Voice Memo / Draft Flow

語音訊息有兩個獨立的入口，流程完全分開以避免狀態污染：

### 入口 1：一鍵語音（快速語音發送）

**首頁「一鍵語音」按鈕 或 草稿「繼續編輯」→ QuickVoiceSendScreen**

這是專為語音訊息設計的簡化流程：
1. 用戶錄音 → 立即進入選擇畫面（無等待）
2. 選擇「現在發送」或「稍後再發」
3. 現在發送：填寫車牌、類型、位置 → 發送（8 點）
4. 稍後再發：上傳語音 + 背景轉錄 → 存入草稿

**Key Files:**
- `QuickRecordScreen.tsx` - 語音錄音 UI + 選擇畫面
- `QuickVoiceSendScreen.tsx` - 一鍵語音發送頁面（車牌、類型、位置、發送）
- `DraftsScreen.tsx` - 草稿列表（繼續編輯導向 QuickVoiceSendScreen）

### 入口 2：手動輸入（完整編輯流程）

**首頁「手動輸入」→ Send Flow (PlateInput → Category → MessageEdit → Confirm)**

完整的 4 步驟發送流程，在第 3 步 MessageEditScreen 可選擇：
- 錄製新語音
- **從草稿選擇**語音（點擊「從草稿選擇」連結）

這讓用戶可以先錄好語音草稿，之後在手動流程中使用。

**Key Files:**
- `MessageEditScreen.tsx` - 包含「從草稿選擇」功能
- `SendContext.tsx` - 管理發送流程狀態

### 重要設計原則

1. **流程分離**：QuickVoiceSendScreen 不使用 SendContext 的 voiceMemo，直接透過 route params 傳遞資料
2. **草稿繼續編輯**：直接導向 QuickVoiceSendScreen，不會污染一般發送流程
3. **從草稿選擇**：在 MessageEditScreen 中使用，設定 voiceRecording 狀態
4. **轉錄時機**：只在儲存草稿時背景執行，發送流程不等待轉錄

### Voice Draft 相關
- Drafts expire after 24 hours (handled by backend cron job)
- DraftCard does NOT show AI analysis (no parsed plates, vehicle info, suggested messages)
- Voice messages cost 8 points regardless of category
- 轉錄只用於草稿列表預覽，發送流程不需要

### 語音錄音優化設定

錄音使用優化設定（檔案大小約為 HIGH_QUALITY 的 25%）：
```javascript
{
  sampleRate: 22050,    // 語音足夠（原 44100）
  numberOfChannels: 1,  // 單聲道（原 2）
  bitRate: 64000,       // 語音足夠（原 128000）
}
```

### 語音預載系統 (VoicePreloadContext)

App 啟動時背景預載最近的語音訊息，提升播放體驗：
- 預載最近 5 則收到的語音
- 預載最近 3 則發送的語音
- 最多快取 10 個音訊
- 支援串流播放（邊下載邊播放）

**Key File:** `apps/mobile/src/context/VoicePreloadContext.tsx`

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

**解決方案：** `ios/Podfile` 已有 `use_modular_headers!`，本地 Xcode build 不需額外設定。

### Firebase Analytics 設定

Firebase Analytics 已啟用，配置文件位置：
- `apps/mobile/ios/UBeep/GoogleService-Info.plist`（iOS，gitignore）
- `apps/mobile/google-services.json`（Android，gitignore）

**重要：** `GoogleService-Info.plist` 中的 `IS_ANALYTICS_ENABLED` 必須是 `true`。

**Analytics 追蹤模組：** `apps/mobile/src/lib/analytics.ts`
- 可在任何地方使用（不依賴 React hooks）
- 已追蹤事件：app_open, login_success, send_message, iap_initiated/complete/failed

### Build Number 管理
- `app.json` 的 `buildNumber` 和 `ios/UBeep/Info.plist` 的 `CFBundleVersion` 要同步
- 每次上傳 TestFlight 都需要遞增 build number
- 用 PlistBuddy 更新：`/usr/libexec/PlistBuddy -c "Set :CFBundleVersion X" ios/UBeep/Info.plist`

### API Client 初始化
`initializeApiClient()` 必須在 App.tsx 模組層級呼叫（不是在 useEffect 裡），確保所有 Provider 的 useEffect 執行前 API Client 已初始化。

### iOS Build 流程（使用 Xcode）

1. 更新 build number：
   ```bash
   # 更新 app.json
   # "buildNumber": "X" → "X+1"

   # 更新 Info.plist（ios 在 gitignore 所以不用 commit）
   /usr/libexec/PlistBuddy -c "Set :CFBundleVersion X" apps/mobile/ios/UBeep/Info.plist
   ```

2. 開啟 Xcode：
   ```bash
   open apps/mobile/ios/UBeep.xcworkspace
   ```

3. 在 Xcode 中：
   - Product → Archive
   - Distribute App → App Store Connect
   - 上傳完成後在 App Store Connect 提交審核

## React Native 常見問題與解法

### RefreshControl 卡住問題

所有使用 `RefreshControl` 的頁面，`handleRefresh` 必須使用 `try-catch-finally`：

```javascript
// ❌ 錯誤 - API 失敗時 refreshing 永遠不會停止
const handleRefresh = async () => {
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
};

// ✅ 正確
const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await loadData();
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    setRefreshing(false);
  }
}, [loadData]);
```

使用此模式的頁面：HomeScreen, InboxListScreen, DraftsScreen, WalletScreen, BlockListScreen, SentScreen

### API Timeout 設定

預設 API timeout 為 30 秒，但某些操作需要更長時間：

| 操作 | 預設 Timeout | 實際需要 |
|------|-------------|---------|
| 語音上傳 | 30s | **60s** |
| 語音轉文字 (Whisper) | 30s | **120s** |
| 一般 API | 30s | 30s |

**Key File:** `packages/shared/src/api/services/upload.ts`
- `uploadVoice`: timeout 60000ms
- `transcribeVoice`: timeout 120000ms

### VoiceMessagePlayer 統一組件

位置：`apps/mobile/src/components/VoiceMessagePlayer.tsx`

所有語音播放使用此統一組件，特點：
- 平滑進度條動畫（`progressUpdateIntervalMillis: 50`）
- 使用 `Animated.timing` 實現流暢過渡
- 統一的播放/暫停 UI

使用位置：MessageDetailScreen, SentScreen, DraftCard, QuickVoiceSendScreen

### Inbox 隱私設計

為保護用戶隱私，Inbox 列表不顯示訊息內容：
- 顯示：發送者暱稱（無暱稱則顯示「匿名用戶」）
- 顯示：訊息類型標籤
- 顯示：隨機可愛動物 emoji 頭像（12 種）
- 顯示：橘色未讀點
- **不顯示**：訊息內容（需點擊進入詳情才能看到）

這確保平台可以確認用戶確實打開並閱讀了訊息。

### Stale Closure 問題（useEffect + beforeRemove）

在 `beforeRemove` navigation listener 中使用的函數會被捕獲成 stale closure，導致函數執行時使用的是舊的 state 值。

```javascript
// ❌ 錯誤 - beforeRemove 捕獲的函數會是舊的
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    saveDraft(); // 這個 saveDraft 可能是舊的
  });
  return unsubscribe;
}, [navigation]); // 依賴項不包含 saveDraft

// ✅ 正確 - 使用 useRef 保持最新函數引用
const saveDraftRef = useRef<() => Promise<boolean>>();

// 每次 render 更新 ref
useEffect(() => {
  saveDraftRef.current = saveDraft;
});

// beforeRemove 使用 ref
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    saveDraftRef.current?.(); // 永遠是最新的函數
  });
  return unsubscribe;
}, [navigation]);
```

**適用場景：** 任何需要在 navigation listener 中呼叫的函數（beforeRemove, focus, blur 等）

### useFocusEffect 重新載入資料

當從其他頁面返回時需要重新載入資料，使用 `useFocusEffect`：

```javascript
import { useFocusEffect } from '@react-navigation/native';

// 每次畫面獲得焦點時重新載入
useFocusEffect(
  useCallback(() => {
    fetchData();
  }, [fetchData])
);
```

**使用場景：**
- DraftsScreen：從編輯頁返回後更新草稿列表
- InboxListScreen：返回時更新未讀狀態
- WalletScreen：購買完成後更新點數

## Invite Code System（邀請碼系統）

### 雙軌邀請碼設計

邀請碼同時支援兩種格式，方便記憶且向後相容：

| 類型 | 格式 | 範例 | 說明 |
|------|------|------|------|
| 車牌邀請碼 | 正規化車牌 | `ABC1234` | 有車牌的用戶使用車牌作為邀請碼 |
| 隨機邀請碼 | 6 位英數 | `K5MN2P` | 沒有車牌的用戶使用隨機碼 |

### 驗證邏輯

輸入邀請碼時，後端會依序檢查：
1. 先查 `User.inviteCode` 欄位（精確匹配）
2. 若無結果，再查 `User.licensePlate` 欄位

```typescript
// apps/api/src/invite/invite.service.ts
private async findInviterByCode(code: string) {
  const upperCode = code.toUpperCase();

  // 1. 先用 inviteCode 查找
  let inviter = await this.prisma.user.findUnique({
    where: { inviteCode: upperCode },
  });

  // 2. 如果沒找到，用車牌查找
  if (!inviter) {
    inviter = await this.prisma.user.findFirst({
      where: { licensePlate: upperCode },
    });
  }

  return inviter;
}
```

### 前端顯示邏輯

用戶的邀請碼顯示優先級：
1. 有車牌 → 顯示正規化後的車牌（去掉符號）
2. 沒車牌 → 顯示隨機邀請碼（`inviteCode` 欄位）

### 注意事項

- **Prisma 查詢**：`licensePlate` 不是 unique 欄位，必須用 `findFirst` 而非 `findUnique`
- **向後相容**：舊用戶的隨機邀請碼仍然有效
- **大小寫不敏感**：輸入會自動轉換為大寫

**Key File:** `apps/api/src/invite/invite.service.ts`
