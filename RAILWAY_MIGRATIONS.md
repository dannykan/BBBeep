# Railway 数据库迁移指南

## 问题

由于 Prisma 在运行时尝试写入 `node_modules/@prisma/engines` 时遇到权限问题，migrations 无法在启动命令中自动运行。

## 解决方案

### 方法 1：通过 Railway CLI 手动运行 migrations（推荐）

1. 安装 Railway CLI：
```bash
npm i -g @railway/cli
```

2. 登录 Railway：
```bash
railway login
```

3. 连接到项目：
```bash
railway link
```

4. 运行 migrations：
```bash
cd backend
railway run npx prisma migrate deploy
```

### 方法 2：通过 Railway Dashboard 运行 migrations

1. 登录 Railway Dashboard
2. 进入 `bbbeeep-backend-production` 项目
3. 点击 "Deployments" 标签
4. 找到最新的部署，点击 "..." 菜单
5. 选择 "Open Shell" 或 "Run Command"
6. 运行：
```bash
cd /app && npx prisma migrate deploy
```

### 方法 3：使用 Railway 的 Deploy Hook

在 Railway 项目设置中，可以配置一个 Deploy Hook，在每次部署后自动运行 migrations。

## 注意事项

- Migrations 只需要运行一次（首次部署时）
- 之后如果有新的 migrations，可以通过上述方法运行
- 确保 `DATABASE_URL` 环境变量已正确设置

## 验证

运行 migrations 后，可以通过以下方式验证：

1. 检查数据库表是否已创建：
```bash
railway run npx prisma studio
```

2. 或通过 API 测试：
```bash
curl https://bbbeep-backend-production.up.railway.app/health
```
