# Railway 数据库迁移指南

## 问题

由于 Prisma 在运行时尝试写入 `node_modules/@prisma/engines` 时遇到权限问题，migrations 无法在启动命令中自动运行。

## 解决方案

### 方法 1：通过 Railway CLI 运行 migrations（最推荐）⭐

这是最可靠的方法：

1. **安装 Railway CLI**：
```bash
npm i -g @railway/cli
```

2. **登录 Railway**：
```bash
railway login
```
这会打开浏览器让你登录。

3. **连接到项目**：
```bash
cd /Users/dannykan/BBBeeep/backend
railway link
```
选择 `bbbeeep-backend-production` 项目。

4. **运行 migrations**：
```bash
railway run npx prisma migrate deploy
```

### 方法 2：在本地运行 migrations（如果数据库可访问）

如果你可以从本地访问 Railway 的数据库：

1. **获取 DATABASE_URL**：
   - 登录 Railway Dashboard
   - 进入 `bbbeeep-backend-production` 项目
   - 点击 PostgreSQL 服务
   - 在 "Variables" 标签中找到 `DATABASE_URL`
   - 复制连接字符串

2. **在本地运行 migrations**：
```bash
cd backend
DATABASE_URL="你的Railway数据库URL" npx prisma migrate deploy
```

### 方法 3：通过 Railway 的 Service 设置

1. 登录 Railway Dashboard
2. 进入 `bbbeeep-backend-production` 项目
3. 点击后端服务
4. 在 "Settings" 标签中，找到 "Deploy Command" 或类似选项
5. 临时修改启动命令为：
   ```
   npx prisma migrate deploy && node dist/main
   ```
6. 触发一次重新部署
7. 部署完成后，改回原来的 `node dist/main`

### 方法 4：创建一个临时的 Migration 服务

在 Railway 项目中创建一个新的服务，专门用于运行 migrations：

1. 在 Railway Dashboard 中，点击 "New" → "Empty Service"
2. 连接到同一个 GitHub 仓库
3. 设置 Root Directory 为 `backend`
4. 设置启动命令为：`npx prisma migrate deploy`
5. 运行一次后删除这个服务

## 验证

运行 migrations 后，可以通过以下方式验证：

1. **通过 API 测试**（最简单）：
```bash
curl https://bbbeep-backend-production.up.railway.app/auth/check-phone/0966685928
```

如果返回 `{"exists":false,"hasPassword":false}` 而不是 500 错误，说明 migrations 成功了！

2. **使用 Railway CLI 检查数据库**：
```bash
railway run npx prisma studio
```
这会打开 Prisma Studio，你可以看到所有表。

## 注意事项

- ✅ Migrations 只需要运行一次（首次部署时）
- ✅ 之后如果有新的 migrations，可以通过上述方法运行
- ✅ 确保 `DATABASE_URL` 环境变量已正确设置
- ⚠️ 方法 1（Railway CLI）是最推荐的方法，因为它最可靠

## 推荐流程

1. **使用 Railway CLI（方法 1）**运行 migrations
2. **验证**：测试 API 端点是否正常工作
3. **完成**：应用现在应该可以正常使用了！
