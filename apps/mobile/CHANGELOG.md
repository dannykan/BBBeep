# Mobile App Changelog

此檔案記錄每次開發會話的重要變更，供 Claude Code 在 auto-compact 後保持上下文連貫。

---

## 2026-01-26 Session

### Google Maps iOS 問題
- **結論**: Google Maps SDK 與 React Native New Architecture (Fabric) 不相容
- **解決方案**: iOS 使用 Apple Maps (`PROVIDER_DEFAULT`)，Android 可用 Google Maps
- **影響的檔案**:
  - `app.config.js` - 只為 Android 設定 `androidGoogleMapsApiKey`
  - `MapLocationPicker.tsx` - 使用 `PROVIDER_DEFAULT`
  - `ios/Podfile` - 需保留 `use_modular_headers!` 給 Firebase

### 地址自動完成功能
- **新增**: `src/components/AddressAutocomplete.tsx`
- **功能**: 使用 Google Geocoding API（非 Places API）提供地址建議
- **用於**: `ConfirmScreenV2.tsx` 的地點輸入欄位
- **原因**: Places API (New) 需要不同端點，Geocoding API 與 web 版本一致

### ConfirmScreenV2 語音模式修復
- **問題**: 語音模式在確認頁面顯示文字而非語音播放器
- **修復**: 加入語音播放器 UI（播放按鈕、進度條、時間顯示）
- **新增**: 語音轉文字提示「收件方只會收到語音，不會看到此文字內容」

### 重要提醒
- **使用 V2 screens**: `PlateInputScreenV2`, `CategoryScreenV2`, `ConfirmScreenV2`（不是 V1）
- **Podfile 必須包含**:
  ```ruby
  use_modular_headers!
  $RNFirebaseAnalyticsWithoutAdIdSupport = true
  ```
- **prebuild 後需檢查**: Firebase 設定是否被覆蓋

### TestFlight 登入修復
- **問題**: TestFlight 版本的 Apple/LINE 登入失敗
- **原因**: Production build 缺少 `EXPO_PUBLIC_API_URL` 環境變數，app 無法連接到後端 API
- **修復**: 更新 `eas.json` production 環境變數：
  ```json
  "env": {
    "EXPO_PUBLIC_API_URL": "https://bbbeep-backend-production.up.railway.app",
    "EXPO_PUBLIC_LINE_CHANNEL_ID": "2008933864",
    "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "..."
  }
  ```
- **下一步**: 需要重新執行 `eas build --platform ios --profile production` 並重新提交到 TestFlight

### 後端點數計算 Bug 修復
- **問題**: 發送訊息時顯示「點數不足」，但前端顯示有足夠點數
- **原因**: 後端 `messages.service.ts` 只檢查 `user.points`，沒有計算 `trialPoints + freePoints + points` 總和
- **修復**: 修改 `apps/api/src/messages/messages.service.ts`：
  - Line 157-159: 發送訊息時的點數檢查
  - Line 380-382: 回覆訊息時的點數檢查
- **需要部署**: 後端需要重新部署到 Railway

### EAS Build Firebase 設定
- **問題**: `GoogleService-Info.plist` 不在 git 中，EAS Build 失敗
- **修復**:
  1. 使用 `eas secret:create` 上傳檔案
  2. 更新 `app.config.js` 使用環境變數引用檔案路徑

### 待處理
- [ ] 部署後端到 Railway（點數計算修復）
- [ ] 重新 build 並提交 TestFlight
- [ ] 確認 LINE Developer Console 已設定 bundle ID: `com.ubeep.mobile`

---

## 格式說明

每次 session 結束前或 auto-compact 前，記錄：
1. **解決的問題** - 問題描述和解決方案
2. **修改的檔案** - 主要變更的檔案列表
3. **重要發現** - 任何重要的技術發現或限制
4. **待處理事項** - 未完成的工作
