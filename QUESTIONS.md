# 需要確認的問題

在完成項目實現之前，以下問題需要您的確認：

## 1. 項目結構
- ✅ 已創建 monorepo 結構（frontend + backend）
- ✅ 後端使用 NestJS + Prisma + PostgreSQL
- ✅ 前端使用 Next.js 14 (App Router)
- ❓ 是否需要將前端和後端分離為兩個獨立的倉庫？

## 2. 認證與授權
- ✅ 已實現 JWT 認證
- ✅ 手機號碼驗證（目前為模擬，開發環境會返回驗證碼）
- ❓ 生產環境需要整合真實的 SMS 服務嗎？（如 Twilio, AWS SNS 等）
- ❓ 是否需要實現 refresh token？

## 3. 資料庫
- ✅ 已創建 Prisma schema
- ❓ 是否需要我創建初始 migration 文件？
- ❓ 是否需要 seed 數據？

## 4. AI 服務
- ✅ 已實現 OpenAI 和 Google AI 的支援
- ✅ 優先使用 OpenAI，如果沒有配置則使用 Google AI
- ❓ 您希望預設使用哪個 AI 服務？
- ❓ AI 改寫的 prompt 是否需要調整？

## 5. Redis
- ✅ 已實現 Redis 服務（可選）
- ❓ 生產環境使用哪個 Redis 服務？（Railway/Upstash/Redis Cloud/自架）

## 6. 前端頁面實現
- ✅ 已創建基礎結構和 API 服務
- ❓ 是否需要我完整實現所有頁面組件？（Landing, Login, Onboarding, Home, Send, Inbox, Wallet, Settings 等）
- ❓ 是否需要從設計文檔中複製 UI 組件？

## 7. 支付系統
- ✅ 點數儲值功能已實現（目前為模擬）
- ❓ 需要整合真實的支付系統嗎？（如 Stripe, 綠界等）

## 8. 環境變數
- ✅ 已創建 .env.example
- ❓ 是否需要我創建實際的 .env 文件（不提交到 git）？

## 9. 部署配置
- ❓ 是否需要 Docker 配置？
- ❓ 是否需要 CI/CD 配置？
- ❓ 部署目標平台？（Vercel, Railway, AWS 等）

## 10. 文檔
- ✅ 已創建 README.md
- ❓ 是否需要更詳細的 API 文檔？
- ❓ 是否需要開發指南？

---

## 當前完成狀態

### 後端 (NestJS)
- ✅ 項目結構和配置
- ✅ Prisma schema 和數據模型
- ✅ 認證模組（JWT, 手機驗證）
- ✅ 用戶模組（CRUD, 封鎖/拒收）
- ✅ 消息模組（發送、接收、已讀）
- ✅ 點數模組（儲值、歷史記錄）
- ✅ AI 模組（改寫功能，每日限制）
- ✅ Redis 服務（可選）
- ✅ Swagger API 文檔

### 前端 (Next.js)
- ✅ 項目結構和配置
- ✅ Tailwind CSS 配置（Modern Calm Blue）
- ✅ API 客戶端和服務
- ✅ 類型定義
- ⏳ 頁面組件（待實現）
- ⏳ UI 組件庫（待實現）
- ⏳ Context/狀態管理（待實現）

---

## 下一步建議

1. **確認上述問題**，我會根據您的回答繼續完善項目
2. **實現前端頁面**，可以：
   - 從設計文檔複製現有組件
   - 或根據 UI Flow 文檔重新實現
3. **測試和調試**，確保前後端正常通信
4. **完善文檔**，添加使用說明和部署指南

請告訴我您希望優先處理哪些部分，我會繼續完成！
