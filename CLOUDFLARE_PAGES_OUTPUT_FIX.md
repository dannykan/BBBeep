# Cloudflare Pages 输出目录修复

## 问题

部署成功但访问页面显示 404：
```
This e024d6a5.bbbeep.pages.dev page can't be found
HTTP ERROR 404
```

## 原因

Next.js 默认构建输出到 `.next` 目录，但 Cloudflare Pages 需要静态文件。Next.js App Router 默认使用 SSR，需要特殊配置才能在 Cloudflare Pages 上工作。

## 解决方案

已配置 Next.js 使用静态导出模式（`output: 'export'`），这会：
- ✅ 生成静态 HTML 文件到 `out` 目录
- ✅ 兼容 Cloudflare Pages
- ⚠️ 禁用 SSR（但所有页面都是客户端组件，所以不受影响）
- ⚠️ 禁用图片优化（已配置 `images: { unoptimized: true }`）

## Cloudflare Pages 配置更新

在 Cloudflare Pages 项目设置中，请更新：

**Build settings:**
- **Root directory**: `/frontend`
- **Build command**: `npm run build`
- **Build output directory**: `out` ⬅️ **重要：改为 `out`**

**环境变量:**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

## 验证

部署成功后，应该可以访问：
- `https://your-site.pages.dev/` → 重定向到 `/landing`
- `https://your-site.pages.dev/landing`
- `https://your-site.pages.dev/login`
- 等等

## 注意事项

1. **静态导出限制**：
   - 不能使用 `getServerSideProps`
   - 不能使用 API routes
   - 所有数据获取必须在客户端进行（使用 `useEffect` 或 React Query 等）

2. **图片优化**：
   - 已禁用 Next.js 图片优化
   - 可以使用普通的 `<img>` 标签或外部图片服务

3. **动态路由**：
   - 静态导出会预渲染所有可能的路径
   - 动态路由（如 `/BBBeepadmin2026/users/[id]`）仍会工作，但需要确保所有可能的路径都被生成

## 如果仍有问题

1. 检查 Cloudflare Pages 的 Build output directory 是否设置为 `out`
2. 查看构建日志确认 `out` 目录已生成
3. 检查 `out` 目录中是否有 `index.html` 文件
