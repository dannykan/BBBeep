# BBBeeep 移動應用開發策略評估報告

## 目錄
1. [專案現況分析](#專案現況分析)
2. [技術方案比較](#技術方案比較)
3. [推薦方案：React Native](#推薦方案react-native)
4. [實作架構](#實作架構)
5. [開發時程估算](#開發時程估算)
6. [成本效益分析](#成本效益分析)
7. [實作步驟](#實作步驟)
8. [風險與挑戰](#風險與挑戰)

---

## 專案現況分析

### 當前技術棧
```
Frontend: Next.js 14 (React) + TypeScript + Tailwind CSS + Radix UI
Backend:  NestJS + PostgreSQL + Redis + Prisma
Auth:     JWT Token + LINE Login (已整合)
AI:       OpenAI / Google AI
```

### 程式碼規模
- 前端頁面：約 15+ 頁面
- 前端程式碼：約 280+ TSX/TS 檔案
- UI 元件：已使用 Radix UI（無頭元件）
- 狀態管理：React Context
- API 整合：axios + RESTful API

### 核心功能
1. 用戶註冊/登入（手機號碼 OTP、密碼、LINE Login）
2. Onboarding 流程（用戶類型、車牌設定）
3. 發送提醒（車況/安全/讚美）
4. 收件箱（查看、回覆、封鎖）
5. 已發送訊息管理
6. 點數系統（儲值、消耗記錄）
7. AI 訊息改寫（每日 5 次限制）
8. 用戶設定、通知設定、封鎖列表
9. 管理後台（車牌審核、檢舉處理、用戶管理）

---

## 技術方案比較

### 方案 1：React Native (Expo) ⭐ **推薦**

#### 優勢
- ✅ **程式碼重用率極高（70-80%）**：您的 React + TypeScript 程式碼可直接複用
- ✅ **開發效率最高**：一套程式碼同時支援 iOS + Android
- ✅ **學習曲線最低**：團隊已熟悉 React，無需學習新語言
- ✅ **Expo 生態系統**：開箱即用的 Camera、Location、Push Notification
- ✅ **熱更新支援**：可繞過 App Store 審核快速更新非原生部分
- ✅ **成本最低**：單一團隊、單一程式碼庫
- ✅ **UI 元件豐富**：React Native Paper、NativeBase、Tamagui

#### 劣勢
- ⚠️ 性能略低於原生（但對您的應用場景影響不大）
- ⚠️ 複雜動畫需要額外優化
- ⚠️ 某些特定原生功能需要寫橋接

#### 適合場景
- ✅ **內容型應用**（您的應用主要是表單、列表、文字）
- ✅ **快速迭代需求**
- ✅ **有限的開發資源**
- ✅ **已有 React 經驗**

#### 技術棧
```
React Native 0.73+
Expo SDK 50+
TypeScript
React Navigation (路由)
React Query / TanStack Query (API 管理)
Zustand / Jotai (狀態管理，比 Context 更輕量)
NativeWind (Tailwind for RN) 或 Tamagui
```

---

### 方案 2：Flutter

#### 優勢
- ✅ 性能優秀，接近原生
- ✅ UI 渲染統一，iOS/Android 體驗一致
- ✅ 豐富的 Widget 生態

#### 劣勢
- ❌ **需要學習 Dart**（新語言，學習曲線陡峭）
- ❌ **程式碼無法重用**（需從零開始）
- ❌ 開發時間長（預估 3-4 個月）
- ❌ 需要額外的開發人力

#### 適合場景
- 複雜 UI/動畫需求
- 長期投資新平台
- 有 Flutter 開發團隊

---

### 方案 3：Progressive Web App (PWA)

#### 優勢
- ✅ **程式碼 100% 重用**（直接基於現有 Next.js）
- ✅ 無需 App Store 審核
- ✅ 開發成本最低

#### 劣勢
- ❌ **無法上架 App Store/Google Play**
- ❌ iOS 支援有限（推送通知、背景執行受限）
- ❌ 使用者體驗較差（需手動加到主畫面）
- ❌ 無法使用某些原生功能

#### 適合場景
- 預算極度有限
- 快速驗證市場
- 作為過渡方案

---

### 方案 4：原生開發（Swift + Kotlin）

#### 優勢
- ✅ 最佳性能和用戶體驗
- ✅ 完整的平台功能存取

#### 劣勢
- ❌ **需要兩個團隊**（iOS + Android）
- ❌ **開發時間最長**（預估 6+ 個月）
- ❌ **維護成本最高**（兩套程式碼）
- ❌ 程式碼無法重用

#### 適合場景
- 大型企業專案
- 極致性能需求
- 充足的開發資源

---

## 推薦方案：React Native (Expo)

### 為什麼選擇 React Native？

#### 1. **成本效益最佳**
```
原生開發：6 個月 × 2 人（iOS + Android）= 12 人月
Flutter：  4 個月 × 1 人 = 4 人月
React Native：2.5 個月 × 1 人 = 2.5 人月 ⭐
```

#### 2. **程式碼重用率分析**

| 層級 | Web 實作 | RN 重用率 | 說明 |
|------|---------|-----------|------|
| **業務邏輯** | TypeScript | 95% | API calls, state management, utils |
| **UI 元件** | React + Radix UI | 70% | 結構相同，樣式需調整 |
| **路由導航** | Next.js App Router | 0% | 需改用 React Navigation |
| **樣式系統** | Tailwind CSS | 60% | 可用 NativeWind 或手動遷移 |
| **表單驗證** | react-hook-form + zod | 100% | 完全相容 |

**總體重用率：約 70-75%**

#### 3. **技術棧對應關係**

| Web (Next.js) | Mobile (React Native) | 遷移難度 |
|--------------|----------------------|---------|
| React 18 | React 18 | ✅ 無縫遷移 |
| TypeScript | TypeScript | ✅ 無縫遷移 |
| Tailwind CSS | NativeWind / StyleSheet | ⚠️ 需調整 |
| Radix UI | React Native Paper / NativeBase | ⚠️ 需重寫 |
| Next.js Router | React Navigation | ⚠️ 需重寫 |
| axios | axios | ✅ 無縫遷移 |
| React Context | Zustand / Jotai | ⚠️ 建議升級 |
| react-hook-form | react-hook-form | ✅ 無縫遷移 |
| zod | zod | ✅ 無縫遷移 |

---

## 實作架構

### 專案結構建議

#### 方案 A：Monorepo（推薦）
```
BBBeeep/
├── apps/
│   ├── web/                    # 現有 Next.js 專案
│   ├── mobile/                 # React Native Expo 專案
│   └── backend/                # 現有 NestJS 專案
├── packages/
│   ├── shared/                 # 共用程式碼
│   │   ├── api/               # API client (axios)
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # 工具函式
│   │   ├── hooks/             # 共用 hooks
│   │   ├── constants/         # 常數定義
│   │   └── validators/        # Zod schemas
│   └── ui/                     # 平台無關的 UI 邏輯
├── package.json               # Workspace 設定
└── turbo.json                 # Turborepo 設定（可選）
```

**優勢**：
- 程式碼共享最大化
- 統一依賴管理
- 一次改動，多平台生效

**工具選擇**：
- pnpm workspace（輕量）
- Yarn workspace
- Turborepo（大型專案）

#### 方案 B：獨立專案
```
BBBeeep-web/                   # 現有專案
BBBeeep-mobile/                # 新專案
BBBeeep-backend/               # 現有專案
```

**優勢**：
- 結構簡單
- 部署獨立

**劣勢**：
- 程式碼需要複製
- 維護同步困難

---

### React Native 技術棧推薦

```json
{
  "dependencies": {
    // 核心
    "react": "18.2.0",
    "react-native": "0.73.6",
    "expo": "~50.0.0",

    // 路由導航
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@react-navigation/bottom-tabs": "^6.5.11",

    // 狀態管理
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.15",

    // API
    "axios": "^1.6.7",

    // 表單
    "react-hook-form": "^7.49.3",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",

    // UI 元件庫（選擇一個）
    "react-native-paper": "^5.12.3",        // Material Design
    // 或
    "tamagui": "^1.91.2",                   // 高性能，支援 Web
    // 或
    "native-base": "^3.4.28",               // 元件豐富

    // 樣式
    "nativewind": "^4.0.1",                 // Tailwind for RN

    // LINE Login
    "@invertase/react-native-apple-authentication": "^2.3.0",
    "expo-auth-session": "~5.0.2",

    // 推送通知
    "expo-notifications": "~0.27.6",

    // 其他 Expo 套件
    "expo-camera": "~14.0.5",               // 拍照上傳
    "expo-image-picker": "~14.7.1",         // 相簿選擇
    "expo-secure-store": "~12.8.1",         // Token 儲存
    "expo-constants": "~15.4.5",
    "expo-status-bar": "~1.11.1"
  }
}
```

---

### 程式碼遷移範例

#### 1. API Client（100% 重用）

```typescript
// packages/shared/api/client.ts
import axios from 'axios';
import { getSecureStore } from './storage'; // 平台特定

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});

// 請求攔截器
apiClient.interceptors.request.use(async (config) => {
  const token = await getSecureStore('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 這段程式碼 Web 和 Mobile 通用！
```

#### 2. 業務邏輯 Hooks（100% 重用）

```typescript
// packages/shared/hooks/useAuth.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { LoginDto, User } from '../types';

export function useAuth() {
  const loginMutation = useMutation({
    mutationFn: async (dto: LoginDto) => {
      const { data } = await apiClient.post('/auth/login', dto);
      return data;
    },
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/user/me');
      return data;
    },
  });

  return { user, isLoading, login: loginMutation.mutate };
}

// Web 和 Mobile 完全相同的程式碼！
```

#### 3. UI 元件遷移

**Web 版本（Radix UI）：**
```tsx
// apps/web/src/components/Button.tsx
import { Button as RadixButton } from '@radix-ui/react-button';

export function Button({ children, ...props }) {
  return (
    <RadixButton
      className="bg-blue-500 text-white px-4 py-2 rounded-lg"
      {...props}
    >
      {children}
    </RadixButton>
  );
}
```

**Mobile 版本（React Native Paper）：**
```tsx
// apps/mobile/src/components/Button.tsx
import { Button as PaperButton } from 'react-native-paper';

export function Button({ children, ...props }) {
  return (
    <PaperButton
      mode="contained"
      buttonColor="#4A6FA5"
      {...props}
    >
      {children}
    </PaperButton>
  );
}
```

**使用時完全相同：**
```tsx
import { Button } from '@/components/Button'; // 自動根據平台選擇

function MyScreen() {
  return <Button onPress={handleSubmit}>提交</Button>;
}
```

#### 4. 表單元件（95% 重用）

```tsx
// packages/shared/forms/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validators/auth';

// 平台無關的邏輯
export function useLoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '',
      code: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    // 呼叫 API
  });

  return { form, onSubmit };
}
```

只需為每個平台寫 UI：
```tsx
// apps/mobile/src/screens/LoginScreen.tsx
import { useLoginForm } from '@bbbeeep/shared/forms';
import { TextInput, Button } from 'react-native-paper';

export function LoginScreen() {
  const { form, onSubmit } = useLoginForm(); // 邏輯重用

  return (
    <View>
      <Controller
        control={form.control}
        name="phone"
        render={({ field }) => (
          <TextInput
            label="手機號碼"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Button onPress={onSubmit}>登入</Button>
    </View>
  );
}
```

---

## 開發時程估算

### Phase 1: 環境設定（Week 1）
- [ ] 建立 Monorepo 結構
- [ ] 初始化 Expo 專案
- [ ] 設定 TypeScript、ESLint
- [ ] 提取共用程式碼到 `packages/shared/`
- [ ] 配置 React Navigation
- [ ] 設定 Expo EAS (構建服務)

**產出**：基礎專案骨架，可在模擬器上運行

---

### Phase 2: 核心功能遷移（Week 2-4）

#### Week 2: 認證流程
- [ ] 登入頁面（手機號碼 + OTP）
- [ ] 密碼登入
- [ ] LINE Login 整合（使用 expo-auth-session）
- [ ] Token 管理（SecureStore）
- [ ] Onboarding 流程

**產出**：用戶可以註冊/登入，完成 Onboarding

#### Week 3: 核心功能
- [ ] 首頁（快速發送入口）
- [ ] 發送提醒頁面（車牌輸入、訊息類型選擇）
- [ ] AI 改寫功能
- [ ] 收件箱（訊息列表、詳情）
- [ ] 已發送訊息頁面

**產出**：完整的發送/接收流程

#### Week 4: 輔助功能
- [ ] 點數系統（錢包、儲值）
- [ ] 用戶設定頁面
- [ ] 封鎖列表
- [ ] 通知設定
- [ ] 底部導航欄

**產出**：所有主要頁面完成

---

### Phase 3: 原生功能整合（Week 5-6）

#### Week 5: 平台特性
- [ ] 推送通知（Expo Notifications + FCM）
- [ ] 相機/相簿（上傳行照）
- [ ] 地理位置（未來功能）
- [ ] Deep Links（從通知開啟 App）

#### Week 6: UI/UX 優化
- [ ] iOS 設計規範適配（Safe Area、Haptics）
- [ ] Android Material Design 適配
- [ ] 深色模式支援
- [ ] 動畫效果（車牌輸入、訊息傳送）
- [ ] 載入狀態、錯誤處理

**產出**：原生體驗完整的 App

---

### Phase 4: 測試與上架（Week 7-8）

#### Week 7: 測試
- [ ] 單元測試（Jest + React Native Testing Library）
- [ ] E2E 測試（Detox，可選）
- [ ] 真機測試（iOS + Android）
- [ ] Beta 測試（TestFlight + Google Play Internal Testing）

#### Week 8: 上架準備
- [ ] App Icon、啟動畫面
- [ ] App Store 截圖、描述
- [ ] 隱私政策、使用條款
- [ ] App Store 提交
- [ ] Google Play 提交

**產出**：App 上架 App Store + Google Play

---

### 總時程：8 週（2 個月）

| 階段 | 時間 | 產出 |
|------|------|------|
| Phase 1 | 1 週 | 專案骨架 |
| Phase 2 | 3 週 | 核心功能 |
| Phase 3 | 2 週 | 原生功能 |
| Phase 4 | 2 週 | 測試上架 |
| **總計** | **8 週** | **iOS + Android App** |

如果人力充足，可並行開發，壓縮到 **6 週**。

---

## 成本效益分析

### 開發成本

| 項目 | React Native | Flutter | 原生開發 |
|------|-------------|---------|---------|
| **開發時間** | 8 週 | 16 週 | 24+ 週 |
| **開發人力** | 1 人 | 1.5 人 | 2-3 人 |
| **程式碼重用** | 70% | 0% | 0% |
| **學習成本** | 低（已會 React）| 高（學 Dart）| 高（學 Swift + Kotlin）|
| **維護成本** | 低（單一程式碼）| 中 | 高（兩套程式碼）|

### 月成本估算（台灣市場）

| 角色 | React Native | Flutter | 原生開發 |
|------|-------------|---------|---------|
| 前端/移動端工程師 | 1 人 × 2 月 = 20 萬 | 1.5 人 × 4 月 = 48 萬 | 2 人 × 6 月 = 120 萬 |
| 設計師（UI/UX）| 0.5 人 × 2 月 = 8 萬 | 0.5 人 × 4 月 = 16 萬 | 1 人 × 6 月 = 48 萬 |
| **總計** | **28 萬** | **64 萬** | **168 萬** |

*假設工程師月薪 10 萬，設計師 8 萬*

### 第一年總成本（TCO）

| 項目 | React Native | Flutter | 原生開發 |
|------|-------------|---------|---------|
| 初期開發 | 28 萬 | 64 萬 | 168 萬 |
| 維護更新（0.5人月）| 6 萬/月 × 10 = 60 萬 | 8 萬/月 × 10 = 80 萬 | 10 萬/月 × 10 = 100 萬 |
| **總計** | **88 萬** | **144 萬** | **268 萬** |

**結論：React Native 第一年可節省 56-180 萬元成本**

---

## 實作步驟

### Step 1: 建立 Monorepo（第 1 天）

```bash
# 1. 在現有專案根目錄初始化 workspace
cd BBBeeep
pnpm init

# 2. 修改 package.json
{
  "name": "bbbeeep-workspace",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}

# 3. 建立目錄結構
mkdir -p apps/mobile packages/shared

# 4. 移動現有專案
mv frontend apps/web
mv backend apps/backend

# 5. 初始化 Expo 專案
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript
```

---

### Step 2: 提取共用程式碼（第 2-3 天）

```bash
cd packages/shared

# 建立子目錄
mkdir -p {api,types,utils,hooks,constants,validators}

# 初始化 package.json
pnpm init
```

```json
// packages/shared/package.json
{
  "name": "@bbbeeep/shared",
  "version": "1.0.0",
  "main": "index.ts",
  "types": "index.ts",
  "dependencies": {
    "axios": "^1.6.7",
    "zod": "^3.22.4"
  }
}
```

從 Web 專案提取：
```bash
# 1. API client
cp apps/web/src/lib/api.ts packages/shared/api/

# 2. Types
cp apps/web/src/types/*.ts packages/shared/types/

# 3. Utils
cp apps/web/src/utils/*.ts packages/shared/utils/

# 4. Validators
cp apps/web/src/validators/*.ts packages/shared/validators/
```

---

### Step 3: 配置 Mobile 專案（第 4-5 天）

```typescript
// apps/mobile/app.json
{
  "expo": {
    "name": "BBBeeep",
    "slug": "bbbeeep",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#4A6FA5"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.bbbeeep.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#4A6FA5"
      },
      "package": "com.bbbeeep.app"
    },
    "plugins": [
      "expo-secure-store",
      "expo-notifications"
    ]
  }
}
```

安裝依賴：
```bash
cd apps/mobile

# 核心依賴
pnpm add @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
pnpm add react-native-screens react-native-safe-area-context
pnpm add zustand @tanstack/react-query
pnpm add react-hook-form @hookform/resolvers

# UI 庫（選擇一個）
pnpm add react-native-paper react-native-vector-icons

# Expo 套件
pnpm add expo-secure-store expo-notifications expo-auth-session

# 連結到共用套件
pnpm add @bbbeeep/shared@workspace:*
```

---

### Step 4: 實作導航結構（第 6-7 天）

```typescript
// apps/mobile/src/navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@bbbeeep/shared/hooks/useAuth';

import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

```typescript
// apps/mobile/src/navigation/MainNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import InboxScreen from '../screens/InboxScreen';
import WalletScreen from '../screens/WalletScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = {
            Home: 'home',
            Inbox: 'mail',
            Wallet: 'wallet',
            Settings: 'settings',
          }[route.name];

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4A6FA5',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首頁' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: '收件箱' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: '錢包' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}
```

---

### Step 5: 實作頁面（第 8-28 天）

每個頁面大約 1-2 天：

```typescript
// apps/mobile/src/screens/HomeScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        快速發送提醒
      </Text>

      <Card style={styles.card}>
        <Card.Title title="車況提醒" />
        <Card.Content>
          <Text>車燈沒關、忘記拔鑰匙...</Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigation.navigate('Send', { type: 'VEHICLE_REMINDER' })}>
            發送
          </Button>
        </Card.Actions>
      </Card>

      {/* 其他卡片... */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
});
```

---

### Step 6: 整合原生功能（第 29-35 天）

#### 推送通知
```typescript
// packages/shared/notifications/push.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 配置通知行為
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
```

#### LINE Login
```typescript
// packages/shared/auth/line.ts
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';

const LINE_CHANNEL_ID = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID;

export function useLineLogin() {
  const redirectUri = makeRedirectUri({
    scheme: 'bbbeeep',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: LINE_CHANNEL_ID,
      scopes: ['profile', 'openid'],
      redirectUri,
    },
    {
      authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize',
    }
  );

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      // 傳給後端換取 access token
      exchangeLineCode(code);
    }
  }, [response]);

  return { loginWithLine: () => promptAsync() };
}
```

---

### Step 7: 測試與上架（第 36-56 天）

#### 建立測試版本
```bash
# 安裝 EAS CLI
npm install -g eas-cli

# 登入 Expo 帳號
eas login

# 配置專案
eas build:configure

# 建立 iOS 測試版本
eas build --platform ios --profile preview

# 建立 Android 測試版本
eas build --platform android --profile preview

# 提交到 TestFlight
eas submit --platform ios

# 提交到 Google Play Internal Testing
eas submit --platform android
```

#### 準備上架資料

1. **App Icon** (1024×1024)
2. **啟動畫面**
3. **截圖**（每個平台 5-8 張）
   - iPhone 6.5" (1284 x 2778)
   - iPhone 5.5" (1242 x 2208)
   - iPad Pro 12.9" (2048 x 2732)
   - Android Phone
   - Android Tablet
4. **App 描述**
5. **關鍵字**（App Store）
6. **隱私政策 URL**
7. **使用條款 URL**

---

## 風險與挑戰

### 技術風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| **Expo 限制** | 中 | 使用 Expo Dev Client，可自訂原生模組 |
| **性能問題** | 低 | 使用 React Native 性能優化最佳實踐 |
| **原生模組需求** | 中 | 大部分需求 Expo 已覆蓋，特殊需求可用 Config Plugins |
| **UI 一致性** | 中 | 建立設計系統，統一元件庫 |

### 開發風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| **學習曲線** | 低 | 團隊已熟悉 React，轉換容易 |
| **時程延遲** | 中 | 使用 Monorepo 最大化程式碼重用 |
| **人力不足** | 高 | 考慮外包或招募 React Native 開發者 |

### 平台風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| **App Store 審核** | 中 | 確保符合審核指南，準備申訴材料 |
| **LINE Login 整合** | 低 | 使用 expo-auth-session，已有成熟方案 |
| **推送通知** | 中 | 使用 Expo Push Notification Service，簡化配置 |

---

## 其他方案補充

### 混合方案：React Native + WebView

如果時間緊迫，可採用混合策略：

```typescript
// 核心功能用 React Native 原生實作
// 次要功能用 WebView 嵌入現有 Web 頁面

import { WebView } from 'react-native-webview';

function AdminScreen() {
  const { token } = useAuth();

  return (
    <WebView
      source={{
        uri: 'https://yourdomain.com/admin',
        headers: { Authorization: `Bearer ${token}` },
      }}
    />
  );
}
```

**優勢**：
- 管理後台等複雜頁面可直接嵌入 Web
- 開發時間縮短 30%

**劣勢**：
- 體驗略差
- 需要處理 Web ↔ Native 通訊

---

## 總結與建議

### 推薦方案：React Native (Expo)

✅ **最適合您的情況**：
1. 團隊已熟悉 React + TypeScript
2. 70% 程式碼可重用
3. 8 週內完成 iOS + Android
4. 成本最低（約 28 萬 vs 168 萬原生開發）
5. 維護成本低（單一程式碼庫）

### 下一步行動

**立即開始（第 1 週）：**
1. ✅ 建立 Monorepo 結構
2. ✅ 初始化 Expo 專案
3. ✅ 提取共用程式碼
4. ✅ 實作登入頁面（驗證技術可行性）

**近期規劃（第 2-4 週）：**
5. ⏳ 實作核心功能（發送/接收提醒）
6. ⏳ 整合 LINE Login
7. ⏳ 推送通知功能

**中期目標（第 5-8 週）：**
8. ⏳ 所有頁面遷移完成
9. ⏳ 測試與優化
10. ⏳ 上架 App Store + Google Play

### 關鍵決策點

| 決策 | 推薦選項 | 原因 |
|------|---------|------|
| **技術方案** | React Native (Expo) | 程式碼重用率高、成本低 |
| **專案結構** | Monorepo | 程式碼共享最大化 |
| **UI 元件庫** | React Native Paper | Material Design、文檔完整 |
| **狀態管理** | Zustand + React Query | 輕量、現代化 |
| **導航** | React Navigation | 社群標準 |
| **構建服務** | Expo EAS | 簡化 CI/CD |

---

## 附錄

### 學習資源
- [React Native 官方文檔](https://reactnative.dev/)
- [Expo 官方文檔](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

### 範例專案
- [Expo Examples](https://github.com/expo/examples)
- [React Navigation Examples](https://github.com/react-navigation/react-navigation/tree/main/example)

### 社群
- [React Native Discord](https://discord.gg/reactnative)
- [Expo Discord](https://chat.expo.dev/)

---

**報告日期**: 2026-01-20
**專案**: BBBeeep 移動應用開發策略
**評估者**: AI Assistant
**推薦方案**: React Native (Expo)
