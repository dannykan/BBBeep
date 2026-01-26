# App Store 審核資料

## 審核帳號資訊

### 登入方式：車牌登入

| 欄位 | 值 |
|------|-----|
| 車牌號碼 | `BBP2999` |
| 密碼 | `12345678` |

### 登入步驟

1. 開啟 App
2. 點擊「登入」按鈕
3. 點擊「使用車牌登入」
4. 輸入車牌號碼：`BBP2999`
5. 輸入密碼：`12345678`
6. 點擊「登入」

---

## App Store Connect 設定

### App Review Information

**Sign-in required:** Yes

**User name:**
```
BBP2999
```

**Password:**
```
12345678
```

**Review Notes (複製貼上):**
```
Demo Account Login Instructions:

1. Tap "登入" (Login) button
2. Tap "使用車牌登入" (Login with License Plate)
3. Enter license plate: BBP2999
4. Enter password: 12345678
5. Tap "登入" (Login)

This demo account has pre-populated data including:
- Received messages (提醒訊息)
- Sent messages history (發送紀錄)
- Voice drafts (語音草稿)
- Points history (點數紀錄)

All features can be tested with this account.
```

---

## Support URL

**Support URL:** `https://ubeep.app/support`

頁面包含：
- 聯絡 Email: dannytjkan@gmail.com
- FAQ / 常見問題（6 題）
- 回報問題指南
- 服務時間

---

## 審核問題回覆參考

### Guideline 2.1 - Demo Account (已解決)

> We are unable to successfully access all or part of the app.

**回覆：**
```
We have added a license plate login feature for demo access.

Demo Account:
- License Plate: BBP2999
- Password: 12345678

Login steps:
1. Tap "登入" (Login)
2. Tap "使用車牌登入" (Login with License Plate)
3. Enter the credentials above

This account has pre-populated sample data for testing all features.
```

### Guideline 2.1 - Sign in with Apple Bug (已修復)

> We were unable to log in via Sign in with Apple on iPad.

**已修復：**
- [x] Apple Client ID 從 `com.bbbeeep.mobile` 改為 `com.ubeep.mobile`
- [ ] 在 iPad 上測試 Sign in with Apple（建議測試）

### Guideline 1.5 - Support URL (已修復)

> The Support URL does not direct to a website with support information.

**已完成：**
- [x] 建立支援頁面：https://ubeep.app/support
- [x] 包含聯絡 Email、FAQ、回報問題指南
- [ ] 更新 App Store Connect 中的 Support URL 為 `https://ubeep.app/support`

---

## 測試帳號資料內容

| 資料類型 | 數量 | 說明 |
|----------|------|------|
| 收到的訊息 | 4 則 | 車況提醒、行車安全、讚美感謝 |
| 發送的訊息 | 3 則 | 發送紀錄 |
| 語音草稿 | 2 則 | 待發送的草稿 |
| 點數紀錄 | 7 則 | 獎勵、消費、充值紀錄 |
| 點數餘額 | 100 點 + 10 免費點 | |

---

## 提交新版本步驟

### 1. 建立 iOS Build
```bash
cd apps/mobile
npx eas build --platform ios --profile production
```

### 2. 提交到 App Store
```bash
npx eas submit --platform ios --latest
```

### 3. 在 App Store Connect
1. 選擇新的 build
2. 填寫 App Review Information（上方資料）
3. 更新 Support URL
4. 提交審核

---

## 版本資訊

- **Version:** 1.0.0
- **Build:** (自動遞增)
- **Bundle ID:** com.ubeep.mobile
