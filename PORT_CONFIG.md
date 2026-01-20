# 端口配置說明

## 當前端口配置

由於您的系統上已經有 PostgreSQL 運行在 5432 端口，我們已經將 Docker 容器的端口映射調整為：

- **PostgreSQL**: `5433` (主機) → `5432` (容器)
- **Redis**: `6379` (主機) → `6379` (容器)
- **Backend API**: `3001` (主機) → `3001` (容器)
- **Frontend**: `3000` (主機) → `3000` (容器)

## 環境變數配置

### 後端 (`backend/.env`)

```env
# 使用 Docker 容器時
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bbbeeep

# 或使用 Docker 內部網絡（如果後端也在 Docker 中）
# DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bbbeeep

REDIS_URL=redis://localhost:6379
```

### 前端 (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 使用本地 PostgreSQL（可選）

如果您想使用本地 PostgreSQL 而不是 Docker：

1. **停止 Docker PostgreSQL**：
   ```bash
   docker-compose stop postgres
   ```

2. **使用本地 PostgreSQL**：
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/bbbeeep
   ```

3. **創建數據庫**：
   ```bash
   createdb bbbeeep
   ```

## 檢查端口占用

```bash
# 檢查 PostgreSQL 端口
lsof -i :5432
lsof -i :5433

# 檢查 Redis 端口
lsof -i :6379

# 檢查後端端口
lsof -i :3001

# 檢查前端端口
lsof -i :3000
```

## 重新啟動服務

```bash
# 停止所有服務
docker-compose down

# 重新啟動
docker-compose up -d postgres redis
```
