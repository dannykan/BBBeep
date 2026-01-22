# BBBeeep Mobile App 實作指南
## 如何使用 Claude Code 建立 React Native App

---

## 📋 前置準備檢查清單

### 1. 開發環境需求

```bash
# 檢查 Node.js 版本（需要 18+）
node --version

# 檢查 npm 版本
npm --version

# 檢查 Git
git --version
```

### 2. 安裝必要工具

```bash
# 安裝 pnpm（推薦用於 Monorepo）
npm install -g pnpm

# 安裝 Expo CLI
npm install -g expo-cli

# 安裝 EAS CLI（用於構建）
npm install -g eas-cli
```

### 3. 手機準備（測試用）
- **iOS**: 安裝 [Expo Go](https://apps.apple.com/app/expo-go/id982107779) 從 App Store
- **Android**: 安裝 [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) 從 Google Play

---

## 🎯 分階段實作策略

### Phase 1: 建立 Monorepo 結構（第 1 天）

#### 指令 1: 初始化 Monorepo

```markdown
請幫我將現有專案轉換成 Monorepo 結構：

1. 在專案根目錄建立 pnpm-workspace.yaml
2. 建立以下目錄結構：
   - apps/web（將現有 frontend 移動到這裡）
   - apps/backend（將現有 backend 移動到這裡）
   - apps/mobile（新建，稍後用）
   - packages/shared（新建，用於共用程式碼）

3. 更新根目錄的 package.json，設定 workspace

4. 確保所有路徑引用正確

請逐步執行，並在每個步驟後告訴我結果。
```

---

### Phase 2: 提取共用程式碼（第 2-3 天）

#### 指令 2: 建立共用套件結構

```markdown
在 packages/shared 目錄下建立以下結構：

1. 建立 package.json，名稱為 "@bbbeeep/shared"
2. 建立子目錄：
   - api/（API client）
   - types/（TypeScript 類型定義）
   - utils/（工具函式）
   - hooks/（共用 React Hooks）
   - validators/（Zod schemas）
   - constants/（常數）

3. 建立 tsconfig.json
4. 建立 index.ts 作為統一匯出點

請先建立結構，然後我們再移動程式碼。
```

#### 指令 3: 移動 API Client

```markdown
請將 apps/web/src/lib/api.ts 的內容改寫成平台無關版本，並放到 packages/shared/api/client.ts：

要求：
1. 移除 Next.js 特定的程式碼
2. 使用環境變數（NEXT_PUBLIC_API_URL 或 EXPO_PUBLIC_API_URL）
3. Token 存取改為可注入的方式（因為 Web 用 localStorage，Mobile 用 SecureStore）
4. 保留所有 API 方法

完成後，更新 apps/web 中所有引用此檔案的地方。
```

#### 指令 4: 移動 Types

```markdown
請將 apps/web/src/types 目錄下的所有 TypeScript 類型定義移動到 packages/shared/types/：

1. 複製所有 .ts 檔案
2. 更新 packages/shared/index.ts，匯出所有類型
3. 更新 apps/web 中所有引用，改為從 @bbbeeep/shared 引入
4. 確保沒有編譯錯誤

請逐個檔案處理。
```

#### 指令 5: 移動 Validators

```markdown
請將所有 Zod schemas 從 apps/web 移動到 packages/shared/validators/：

1. 找出所有使用 zod 的驗證 schema
2. 移動到 packages/shared/validators/
3. 更新引用路徑
4. 確保 react-hook-form 的整合仍然正常

請列出找到的所有 schema 檔案。
```

---

### Phase 3: 建立 Mobile 專案（第 4-5 天）

#### 指令 6: 初始化 Expo 專案

```markdown
在 apps/mobile 目錄下初始化 React Native Expo 專案：

1. 使用 TypeScript 模板
2. 安裝必要依賴：
   - @react-navigation/native
   - @react-navigation/native-stack
   - @react-navigation/bottom-tabs
   - react-native-screens
   - react-native-safe-area-context
   - zustand
   - @tanstack/react-query
   - axios
   - react-hook-form
   - @hookform/resolvers
   - zod
   - react-native-paper

3. 連結到 @bbbeeep/shared 套件

4. 配置 app.json（bundleIdentifier: com.bbbeeep.app）

請執行並告訴我是否成功。
```

#### 指令 7: 設定導航結構

```markdown
在 apps/mobile/src 建立導航結構：

1. 建立 navigation/ 目錄
2. 建立 RootNavigator.tsx（根導航器）
3. 建立 AuthNavigator.tsx（認證流程導航）
4. 建立 MainNavigator.tsx（主要 Tab 導航）

導航流程：
- 未登入 → AuthNavigator（登入、註冊）
- 已登入 → MainNavigator（首頁、收件箱、錢包、設定）

請參考 apps/web 的路由結構來設計。
```

---

### Phase 4: 實作認證流程（第 6-10 天）

#### 指令 8: 實作登入頁面（手機號碼 + OTP）

```markdown
實作 Mobile 的登入頁面（apps/mobile/src/screens/auth/LoginScreen.tsx）：

參考 apps/web/src/app/login/page.tsx 的邏輯：

1. 使用 react-native-paper 的 UI 元件
2. 複用 packages/shared 的 API client
3. 實作步驟：
   - 輸入手機號碼
   - 發送驗證碼
   - 輸入驗證碼
   - 登入成功後導向 Onboarding 或首頁

4. Token 使用 expo-secure-store 儲存

請先實作 UI，然後再整合 API。
```

#### 指令 9: 實作 LINE Login

```markdown
實作 Mobile 的 LINE Login 功能：

1. 安裝 expo-auth-session
2. 在 LoginScreen 增加「使用 LINE 登入」按鈕
3. 實作 LINE OAuth 流程：
   - 開啟 LINE 授權頁面
   - 處理 callback
   - 將 code 傳給後端
   - 儲存 token

參考後端的 LINE Login API：
- GET /auth/line/url
- POST /auth/line/login

請實作完整流程。
```

#### 指令 10: 實作 Onboarding 流程

```markdown
實作 Mobile 的 Onboarding 流程（apps/mobile/src/screens/OnboardingScreen.tsx）：

參考 apps/web/src/app/onboarding/page.tsx：

步驟：
1. 選擇用戶類型（駕駛/行人）
2. 輸入車牌號碼（駕駛才需要）
3. 選擇車輛類型（駕駛才需要）
4. 完成

UI 使用 react-native-paper 的元件。
請實作多步驟表單。
```

---

### Phase 5: 核心功能頁面（第 11-20 天）

#### 指令 11: 實作首頁

```markdown
實作首頁（apps/mobile/src/screens/HomeScreen.tsx）：

參考 apps/web/src/app/home/page.tsx：

功能：
1. 顯示用戶資訊（暱稱、點數）
2. 快速發送入口（三種類型卡片）
3. 最近訊息列表
4. 點數不足提示

使用 ScrollView + Cards 佈局。
請實作完整頁面。
```

#### 指令 12: 實作發送提醒頁面

```markdown
實作發送提醒頁面（apps/mobile/src/screens/SendMessageScreen.tsx）：

參考 apps/web/src/app/send/page.tsx：

流程：
1. 輸入車牌號碼
2. 選擇訊息類型
3. 選擇訊息模板
4. 自訂文字（可選）
5. AI 改寫（可選）
6. 預覽並發送

請實作完整流程，包含 AI 改寫功能。
```

#### 指令 13: 實作收件箱

```markdown
實作收件箱頁面（apps/mobile/src/screens/InboxScreen.tsx）：

參考 apps/web/src/app/inbox/page.tsx：

功能：
1. 顯示收到的訊息列表
2. 未讀/已讀狀態
3. 點擊進入訊息詳情
4. 回覆功能
5. 封鎖/拒收功能

使用 FlatList 實現列表。
請實作列表和詳情頁。
```

#### 指令 14: 實作錢包頁面

```markdown
實作錢包頁面（apps/mobile/src/screens/WalletScreen.tsx）：

參考 apps/web/src/app/wallet/page.tsx：

功能：
1. 顯示當前點數
2. 儲值按鈕（顯示「尚未開通」）
3. 點數歷史記錄（分頁載入）

使用 FlatList + RefreshControl。
請實作完整頁面。
```

#### 指令 15: 實作設定頁面

```markdown
實作設定頁面（apps/mobile/src/screens/SettingsScreen.tsx）：

參考 apps/web/src/app/settings/page.tsx：

功能：
1. 用戶資訊編輯（暱稱、車牌、Email）
2. 通知設定
3. 封鎖列表
4. 隱私政策
5. 使用條款
6. 登出

使用 List + Dialog 元件。
請實作完整頁面。
```

---

### Phase 6: 原生功能整合（第 21-28 天）

#### 指令 16: 整合推送通知

```markdown
整合 Expo Push Notifications：

1. 安裝 expo-notifications
2. 請求通知權限
3. 註冊推送 Token
4. 設定通知處理器
5. 處理前景/背景通知
6. Deep Link 整合（點擊通知開啟對應頁面）

參考 Expo 官方文檔實作。
請提供完整的通知服務模組。
```

#### 指令 17: 整合相機/相簿

```markdown
整合相機和相簿功能（用於上傳行照）：

1. 安裝 expo-image-picker
2. 實作拍照功能
3. 實作選擇相簿功能
4. 圖片壓縮
5. 上傳到後端

在設定頁面的車牌驗證處使用。
請實作完整的圖片上傳流程。
```

---

### Phase 7: UI/UX 優化（第 29-35 天）

#### 指令 18: 實作深色模式

```markdown
實作深色模式支援：

1. 使用 react-native-paper 的 theme 系統
2. 建立 light 和 dark theme
3. 保存用戶偏好（AsyncStorage）
4. 在設定頁面增加切換選項
5. 確保所有頁面支援深色模式

請實作完整的 theme 切換功能。
```

#### 指令 19: 增加載入和錯誤狀態

```markdown
為所有頁面增加載入和錯誤處理：

1. 建立共用的 Loading 元件
2. 建立共用的 Error 元件
3. 建立共用的 Empty 元件
4. 在所有 API 呼叫處增加 loading state
5. 在所有 API 呼叫處增加 error handling

請系統性地為每個頁面增加這些狀態處理。
```

#### 指令 20: 增加動畫效果

```markdown
增加頁面轉場和互動動畫：

1. 使用 react-native-reanimated（如果需要）
2. 卡片點擊動畫
3. 發送訊息成功動畫
4. 下拉刷新動畫
5. Tab 切換動畫

請適度使用，不要過度動畫。
```

---

### Phase 8: 測試與上架（第 36-42 天）

#### 指令 21: 建立測試版本

```markdown
使用 EAS Build 建立測試版本：

1. 配置 eas.json（development, preview, production）
2. 設定 App Icon 和 Splash Screen
3. 配置環境變數
4. 建立 iOS 測試版本（.ipa）
5. 建立 Android 測試版本（.apk）

請提供完整的 eas.json 配置。
```

#### 指令 22: 準備上架資料

```markdown
準備 App Store 和 Google Play 的上架資料：

1. App 描述（中文 + 英文）
2. 關鍵字列表
3. 截圖需求說明（各種尺寸）
4. 隱私政策內容
5. 使用條款內容

請生成這些內容的草稿。
```

---

## 🎯 完整指令範例（複製使用）

### 開始實作時的第一個指令

```markdown
我已經完成一個 BBBeeep Web App MVP，現在想要建立 React Native Mobile App。

專案現況：
- Frontend: Next.js 14 (apps/web)
- Backend: NestJS (apps/backend)
- 主要功能：用戶認證、發送提醒、收件箱、點數系統

我希望：
1. 將專案轉換成 Monorepo 結構
2. 提取共用程式碼到 packages/shared
3. 建立 React Native (Expo) App
4. 程式碼重用率達到 70%

請幫我分階段執行，我們先從第一步開始：建立 Monorepo 結構。

請先告訴我：
1. 你需要先查看哪些檔案？
2. 建議的具體步驟是什麼？
3. 有什麼需要我注意的地方？

然後我們一步步來實作。
```

---

## 📝 每個階段的檢查清單

### Phase 1 完成檢查
- [ ] pnpm-workspace.yaml 已建立
- [ ] apps/web, apps/backend, packages/shared 目錄存在
- [ ] 所有專案的 package.json 正確配置
- [ ] `pnpm install` 可以正常執行
- [ ] apps/web 可以正常啟動

### Phase 2 完成檢查
- [ ] packages/shared 有正確的 package.json
- [ ] API client 已移到 shared
- [ ] Types 已移到 shared
- [ ] Validators 已移到 shared
- [ ] apps/web 引用 @bbbeeep/shared 沒有錯誤

### Phase 3 完成檢查
- [ ] apps/mobile 專案可以啟動
- [ ] 可以在 Expo Go 上看到 Hello World
- [ ] 導航結構已建立
- [ ] 可以連結 @bbbeeep/shared

### Phase 4 完成檢查
- [ ] 登入流程完整（手機號碼 + OTP）
- [ ] LINE Login 可以運作
- [ ] Onboarding 流程完整
- [ ] Token 正確儲存

### Phase 5 完成檢查
- [ ] 所有主要頁面已實作
- [ ] 可以發送訊息
- [ ] 可以查看收件箱
- [ ] 點數系統運作正常

### Phase 6 完成檢查
- [ ] 推送通知可以收到
- [ ] 可以拍照/選擇相簿
- [ ] Deep Link 運作正常

### Phase 7 完成檢查
- [ ] 深色模式正常切換
- [ ] 所有頁面有 loading/error 狀態
- [ ] 動畫流暢

### Phase 8 完成檢查
- [ ] 可以建立測試版本
- [ ] 在真機上測試通過
- [ ] 上架資料準備完成

---

## 🚨 常見問題處理

### Q1: Monorepo 套件無法引用
```bash
# 重新安裝依賴
pnpm install

# 重新建立符號連結
pnpm install --force
```

### Q2: Metro Bundler 錯誤
```bash
# 清除 cache
cd apps/mobile
expo start -c
```

### Q3: TypeScript 錯誤
```bash
# 檢查 tsconfig.json 的 paths 設定
# 確保正確配置 @bbbeeep/shared
```

### Q4: Expo Go 無法連線
- 確保手機和電腦在同一個 WiFi
- 檢查防火牆設定
- 使用 Tunnel 模式：`expo start --tunnel`

---

## 💡 實作建議

### 1. 分段實作，逐步測試
- 不要一次做太多
- 每個階段完成後都要測試
- 確保 Web App 功能不受影響

### 2. 保持程式碼同步
- 共用程式碼的修改要同時更新 Web 和 Mobile
- 使用 TypeScript 確保類型安全

### 3. UI 元件保持一致
- 建立設計系統文檔
- 統一顏色、間距、字體大小

### 4. 效能優化
- 使用 FlatList 而不是 ScrollView + map
- 圖片使用適當的尺寸
- 避免不必要的重新渲染

---

## 📚 參考資源

### 官方文檔
- [React Native](https://reactnative.dev/)
- [Expo](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

### 工具
- [Expo Snack](https://snack.expo.dev/) - 線上測試
- [React Native Directory](https://reactnative.directory/) - 套件搜尋

---

**建議**：開始實作前，先用上面的「完整指令範例」開啟對話，讓 Claude Code 幫您評估和規劃具體步驟！
