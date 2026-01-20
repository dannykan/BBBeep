# 部署环境变量配置

## 部署 URL

### 前端（Cloudflare Pages）
- **生产环境**: https://bbbeep.pages.dev

### 后端（Railway）
- **生产环境**: https://bbbeep-backend-production.up.railway.app
- **API 文档**: https://bbbeep-backend-production.up.railway.app/api

## JWT_SECRET

已为您生成一个强密钥：

```
JWT_SECRET=3a15928276b20dda60a870ac847dcef999972eefe0b20ad4cdc7470e2fcc40f60605cb6f06ed690379171ebef42db412f17a448b17de41c691d4a56865cb2459
```

**⚠️ 重要提示**：
- 请妥善保管此密钥，不要泄露
- 在生产环境中使用此密钥
- 如果密钥泄露，请立即生成新的密钥并更新所有环境变量

## Railway 环境变量（Backend）✅ 已配置

以下环境变量已在 Railway 项目中配置：

```env
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:***@postgres.railway.internal:5432/railway

# Redis (Railway Redis)
REDIS_URL=redis://default:***@redis.railway.internal:6379

# JWT
JWT_SECRET=3a15928276b20dda60a870ac847dcef999972eefe0b20ad4cdc7470e2fcc40f60605cb6f06ed690379171ebef42db412f17a448b17de41c691d4a56865cb2459
JWT_EXPIRES_IN=30d

# AI Service
OPENAI_API_KEY=sk-proj-***

# Server
PORT=3001
NODE_ENV=production

# CORS
FRONTEND_URL=bbbeep.pages.dev
```

**注意**: 实际敏感值（密码、密钥）请查看 Railway Dashboard 或 `DEPLOYMENT_CONFIG.md`（本地文件，已加入 .gitignore）

## Cloudflare Pages 环境变量（Frontend）✅ 已配置

以下环境变量已在 Cloudflare Pages 项目中配置：

```env
NEXT_PUBLIC_API_URL=https://bbbeep-backend-production.up.railway.app
```

## 生成新的 JWT_SECRET（如果需要）

如果您需要生成新的密钥，可以使用以下命令：

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

或在 Node.js 环境中：

```javascript
const crypto = require('crypto');
console.log(crypto.randomBytes(64).toString('hex'));
```
