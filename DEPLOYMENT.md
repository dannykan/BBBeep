# 部署指南

本指南将帮助您将 BBBeeep 平台部署到生产环境：
- **Frontend**: Cloudflare Pages
- **Backend**: Railway

## 前置准备

### 1. 环境变量准备

#### Backend 环境变量（Railway）
在 Railway 项目设置中添加以下环境变量：

```env
# Database (Railway 会自动提供 PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Redis (使用 Railway 的 Redis 服务或 Upstash)
REDIS_URL=redis://default:password@host:port

# JWT
JWT_SECRET=your-strong-secret-key-here
JWT_EXPIRES_IN=7d

# AI Service
OPENAI_API_KEY=your-openai-api-key
# 或
GOOGLE_AI_API_KEY=your-google-ai-key

# Server
PORT=3001
NODE_ENV=production
```

#### Frontend 环境变量（Cloudflare Pages）
在 Cloudflare Pages 项目设置中添加：

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## 部署 Backend 到 Railway

### 1. 创建 Railway 项目

1. 访问 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择 `dannykan/BBBeep` 仓库
5. 选择 `backend` 目录作为根目录

### 2. 配置数据库

1. 在 Railway 项目中点击 "New" → "Database" → "PostgreSQL"
2. Railway 会自动创建 PostgreSQL 数据库
3. 复制 `DATABASE_URL` 到环境变量

### 3. 配置 Redis（可选）

**选项 1: Railway Redis**
1. 在 Railway 项目中点击 "New" → "Database" → "Redis"
2. 复制 `REDIS_URL` 到环境变量

**选项 2: Upstash Redis（推荐）**
1. 访问 [Upstash](https://upstash.com)
2. 创建 Redis 数据库
3. 复制连接 URL 到 Railway 环境变量

### 4. 设置环境变量

在 Railway 项目设置中添加所有后端环境变量（见上方）

### 5. 配置构建和启动命令

Railway 会自动检测 `package.json`，但确保：

**构建命令**（如果需要）:
```bash
cd backend && npm install && npm run build
```

**启动命令**:
```bash
cd backend && npm run start:prod
```

### 6. 运行数据库迁移

在 Railway 的部署日志中，或通过 Railway CLI：

```bash
railway run --service backend npm run migration:run
```

或手动在 Railway 的终端中运行：

```bash
cd backend
npm run migration:run
```

### 7. 获取后端 URL

部署完成后，Railway 会提供一个 URL，例如：
```
https://bbbeeep-backend-production.up.railway.app
```

复制这个 URL，用于前端环境变量。

## 部署 Frontend 到 Cloudflare Pages

### 1. 连接 GitHub 仓库

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 "Workers & Pages"
3. 点击 "Create application" → "Pages" → "Connect to Git"
4. 选择 GitHub 并授权
5. 选择 `dannykan/BBBeep` 仓库

### 2. 配置构建设置

**框架预设**: Next.js

**构建配置**:
- **Root directory**: `/frontend`
- **Build command**: `npm run build`
- **Build output directory**: `.next`

**环境变量**:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### 3. 部署设置

Cloudflare Pages 会自动检测 Next.js 并配置构建。确保：

1. **Node.js 版本**: 18 或更高
2. **环境变量**: 添加 `NEXT_PUBLIC_API_URL`

### 4. 自定义域名（可选）

1. 在 Cloudflare Pages 项目设置中
2. 点击 "Custom domains"
3. 添加您的域名
4. Cloudflare 会自动配置 DNS

## 部署后检查清单

### Backend (Railway)

- [ ] 数据库迁移已运行
- [ ] 环境变量已正确设置
- [ ] API 可以访问：`https://your-backend-url.railway.app/api`
- [ ] Swagger 文档可访问：`https://your-backend-url.railway.app/api`
- [ ] 健康检查端点正常

### Frontend (Cloudflare Pages)

- [ ] 环境变量 `NEXT_PUBLIC_API_URL` 已设置
- [ ] 前端可以访问后端 API
- [ ] 所有页面正常加载
- [ ] 登录/注册流程正常
- [ ] API 调用正常

## 常见问题

### 1. 后端部署失败

**问题**: 构建失败或启动失败

**解决方案**:
- 检查 Node.js 版本（需要 18+）
- 检查环境变量是否完整
- 查看 Railway 日志排查错误
- 确保 `package.json` 中的脚本正确

### 2. 数据库连接失败

**问题**: 无法连接到 PostgreSQL

**解决方案**:
- 检查 `DATABASE_URL` 格式是否正确
- 确保 Railway PostgreSQL 服务已启动
- 检查网络连接和防火墙设置

### 3. 前端无法连接后端

**问题**: 前端 API 调用返回 CORS 错误或 404

**解决方案**:
- 检查 `NEXT_PUBLIC_API_URL` 是否正确
- 确保后端 URL 可公开访问
- 检查后端 CORS 配置（如果需要）
- 查看浏览器控制台错误信息

### 4. Redis 连接失败

**问题**: Redis 相关功能不工作

**解决方案**:
- 检查 `REDIS_URL` 是否正确
- 确保 Redis 服务已启动
- 如果使用 Upstash，检查区域设置

## 生产环境优化建议

### 1. 安全性

- [ ] 使用强密码和密钥
- [ ] 启用 HTTPS（Railway 和 Cloudflare 默认提供）
- [ ] 定期更新依赖包
- [ ] 限制 API 访问频率（Rate Limiting）

### 2. 性能

- [ ] 启用 Cloudflare CDN 缓存
- [ ] 配置数据库连接池
- [ ] 使用 Redis 缓存热点数据
- [ ] 优化图片和静态资源

### 3. 监控

- [ ] 设置 Railway 监控和告警
- [ ] 配置 Cloudflare Analytics
- [ ] 添加错误追踪（如 Sentry）
- [ ] 设置日志收集

### 4. 备份

- [ ] 定期备份数据库
- [ ] 配置自动备份策略
- [ ] 测试恢复流程

## 更新部署

### 更新代码

1. 在本地修改代码
2. 提交并推送到 GitHub：
   ```bash
   git add .
   git commit -m "Update: description"
   git push origin main
   ```
3. Railway 和 Cloudflare 会自动检测更改并重新部署

### 手动触发部署

- **Railway**: 在项目设置中点击 "Redeploy"
- **Cloudflare Pages**: 在部署页面点击 "Retry deployment"

## 支持

如有问题，请查看：
- Railway 文档: https://docs.railway.app
- Cloudflare Pages 文档: https://developers.cloudflare.com/pages
- 项目 README.md
