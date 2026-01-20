# 部署环境变量配置

## JWT_SECRET

已为您生成一个强密钥：

```
JWT_SECRET=3a15928276b20dda60a870ac847dcef999972eefe0b20ad4cdc7470e2fcc40f60605cb6f06ed690379171ebef42db412f17a448b17de41c691d4a56865cb2459
```

**⚠️ 重要提示**：
- 请妥善保管此密钥，不要泄露
- 在生产环境中使用此密钥
- 如果密钥泄露，请立即生成新的密钥并更新所有环境变量

## Railway 环境变量（Backend）

在 Railway 项目设置中添加以下环境变量：

```env
# Database (Railway 会自动提供)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Redis (使用 Railway Redis 或 Upstash)
REDIS_URL=redis://default:password@host:port

# JWT
JWT_SECRET=3a15928276b20dda60a870ac847dcef999972eefe0b20ad4cdc7470e2fcc40f60605cb6f06ed690379171ebef42db412f17a448b17de41c691d4a56865cb2459
JWT_EXPIRES_IN=7d

# AI Service
OPENAI_API_KEY=your-openai-api-key
# 或
GOOGLE_AI_API_KEY=your-google-ai-key

# Server
PORT=3001
NODE_ENV=production

# CORS (部署前端后更新为实际 URL)
FRONTEND_URL=https://your-cloudflare-pages-url.pages.dev
```

## Cloudflare Pages 环境变量（Frontend）

在 Cloudflare Pages 项目设置中添加：

```env
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
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
