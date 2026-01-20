# Cloudflare Pages 部署配置指南

## ⚠️ 重要：更新 Cloudflare Pages 配置

Cloudflare Pages 目前仍在使用旧提交。请按以下步骤更新：

### 1. 检查 Cloudflare Pages 设置

在 Cloudflare Pages 项目设置中：

1. **进入项目设置** → **Builds & deployments**
2. **检查 Git 连接**：
   - 确保连接到：`dannykan/BBBeep`
   - 分支：`main`
   - 如果显示旧提交，点击 "Retry deployment" 或 "Create deployment"

### 2. 更新构建配置

**Root directory**: `/frontend`

**Build command**: 
```bash
npm run build
```

**Build output directory**: `.next` 或留空（Next.js 会自动处理）

**环境变量**:
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

### 3. 手动触发新部署

如果自动部署没有触发：

1. 在 Cloudflare Pages 项目中
2. 点击 "Deployments" 标签
3. 点击 "Create deployment"
4. 选择最新的 commit（应该看到 `fb57e06` 或更新的提交）
5. 点击 "Deploy"

### 4. 验证构建日志

部署成功后，在构建日志中应该看到：

```
🔧 Pre-build: Disabled Next.js caching
...
🧹 Cleaning up cache directories...
✅ Removed: .../cache/webpack/client-production/0.pack
✨ Cleanup complete!
```

### 5. 如果仍然失败

如果 post-build 脚本没有执行，可以尝试：

**选项 A: 使用自定义构建命令**

在 Cloudflare Pages 设置中，将 Build command 改为：
```bash
cd frontend && npm install && npm run build && node scripts/post-build.js
```

**选项 B: 使用静态导出（如果不需要 SSR）**

修改 `frontend/next.config.js` 添加：
```javascript
output: 'export',
```

然后在 Cloudflare Pages 设置中：
- **Build output directory**: `out`

**注意**: 静态导出会禁用 SSR 和 API routes。

## 当前状态

- ✅ 已创建 pre-build 脚本（禁用缓存）
- ✅ 已创建 post-build 脚本（删除缓存文件）
- ✅ 已更新 package.json 脚本
- ✅ 已禁用 webpack 缓存
- ⏳ 等待 Cloudflare Pages 使用最新代码

## 下一步

1. 在 Cloudflare Pages 中手动触发新部署
2. 选择最新的 commit
3. 检查构建日志确认脚本执行
4. 如果成功，应该不再看到文件大小错误
