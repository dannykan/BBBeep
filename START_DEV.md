# 啟動開發服務器

## ✅ 當前狀態

- ✅ 數據庫容器運行中
- ✅ 數據庫遷移已完成
- ✅ 環境變數已配置

## 🚀 啟動開發服務器

### 方式 1：同時啟動前後端（推薦）

```bash
# 從項目根目錄
npm run dev
```

這會同時啟動：
- 後端：http://localhost:3001
- 前端：http://localhost:3000

### 方式 2：分別啟動

**終端 1 - 後端**：
```bash
cd backend
npm run start:dev
```

**終端 2 - 前端**：
```bash
cd frontend
npm run dev
```

## 🌐 訪問地址

啟動後可以訪問：
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:3001
- **API 文檔**: http://localhost:3001/api (Swagger)

## 🧪 測試流程

1. 打開瀏覽器訪問 http://localhost:3000
2. 點擊「立即註冊」
3. 輸入手機號碼（如：0912345678）
4. **查看後端終端**獲取驗證碼（開發環境會顯示在控制台）
5. 輸入驗證碼完成登入
6. 完成 onboarding 流程
7. 開始使用！

## 📝 關於 Prisma 遷移

`prisma migrate dev` 是交互式命令，會要求輸入遷移名稱。這是正常的。

如果以後需要創建新的遷移，可以：
```bash
# 交互式（會提示輸入名稱）
npm run prisma:migrate

# 或直接指定名稱
npx prisma migrate dev --name your_migration_name
```

## ⚠️ 注意事項

### 開發環境驗證碼
在開發環境中，驗證碼會顯示在**後端終端**中，格式如下：
```
[DEV] Verification code for 0912345678: 123456
```

### 數據庫連接
如果後端啟動失敗，檢查：
- 數據庫容器是否運行：`docker ps | grep postgres`
- 環境變數 `DATABASE_URL` 是否正確（端口應該是 5433）

### 端口占用
如果端口被占用：
- 後端 3001：修改 `backend/.env` 中的 `PORT`
- 前端 3000：Next.js 會自動使用下一個可用端口

## 🎉 準備就緒！

現在可以啟動開發服務器開始開發了！
