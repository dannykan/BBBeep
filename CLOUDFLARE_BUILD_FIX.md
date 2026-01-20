# Cloudflare Pages 构建修复指南

## 问题

Cloudflare Pages 部署失败，错误信息：
```
Error: Pages only supports files up to 25 MiB in size
cache/webpack/client-production/0.pack is 43.8 MiB in size
```

## 解决方案

### 1. 已实施的修复

- ✅ 创建了 `post-build.js` 脚本自动删除缓存文件
- ✅ 更新了 `package.json` 的 build 脚本
- ✅ 禁用了 webpack 缓存
- ✅ 更新了 `.gitignore` 和 `.cloudflareignore`

### 2. Cloudflare Pages 配置

在 Cloudflare Pages 项目设置中，请确保：

**Build settings:**
- **Framework preset**: Next.js
- **Root directory**: `/frontend`
- **Build command**: `npm run build`
- **Build output directory**: `.next` 或留空（Next.js 会自动处理）

**环境变量:**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

### 3. 如果仍然失败

如果 post-build 脚本没有正确执行，可以尝试：

#### 选项 A: 使用自定义构建命令

在 Cloudflare Pages 设置中，将 Build command 改为：
```bash
cd frontend && npm install && npm run build && rm -rf .next/cache .next/standalone
```

#### 选项 B: 使用静态导出（如果不需要 SSR）

修改 `frontend/next.config.js`:
```javascript
const nextConfig = {
  output: 'export', // 静态导出，禁用 SSR
  // ... 其他配置
};
```

然后在 Cloudflare Pages 设置中：
- **Build output directory**: `out`

**注意**: 使用静态导出会禁用所有服务器端功能（API routes、动态路由等）

#### 选项 C: 使用 Cloudflare Workers（如果需要 SSR）

如果您的应用需要 SSR，可以考虑使用 Cloudflare Workers 而不是 Pages。

### 4. 验证构建

在本地测试构建：
```bash
cd frontend
npm run build
ls -lh .next/cache  # 应该不存在或为空
```

### 5. 检查构建日志

在 Cloudflare Pages 的构建日志中，查找：
- `🧹 Cleaning up cache directories...`
- `✅ Removed: ...`

如果看到这些消息，说明脚本正在执行。

## 当前状态

所有修复已推送到 GitHub。请：
1. 在 Cloudflare Pages 中触发重新部署
2. 检查构建日志确认 post-build 脚本执行
3. 如果仍然失败，请尝试上述选项 A、B 或 C
