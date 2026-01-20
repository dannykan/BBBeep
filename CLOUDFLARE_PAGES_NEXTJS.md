# Cloudflare Pages Next.js 配置

## 重要更新

已移除静态导出模式，改用 Cloudflare Pages 的原生 Next.js 运行时支持。

## Cloudflare Pages 配置

在 Cloudflare Pages 项目设置中：

**Build settings:**
- **Framework preset**: Next.js（重要：选择 Next.js）
- **Root directory**: `/frontend`
- **Build command**: `npm run build`
- **Build output directory**: 留空或 `.next`（Cloudflare 会自动处理）

**环境变量:**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

## 为什么移除静态导出？

1. **动态路由限制**：静态导出要求所有动态路由（如 `/BBBeepadmin2026/users/[id]`）必须提供 `generateStaticParams()`
2. **Admin 页面**：Admin 用户详情页面无法预知所有用户 ID
3. **Cloudflare Pages 支持**：Cloudflare Pages 现在原生支持 Next.js SSR

## 优势

- ✅ 支持动态路由
- ✅ 支持 SSR（如果需要）
- ✅ 支持 API routes（如果需要）
- ✅ 更好的性能（Cloudflare Edge 网络）

## 注意事项

1. **缓存清理**：post-build 脚本仍会清理缓存文件，避免文件大小限制
2. **输出目录**：Cloudflare Pages 会自动处理 Next.js 输出，无需手动指定
3. **运行时**：使用 Cloudflare Pages 的 Next.js 运行时，支持所有 Next.js 功能

## 验证

部署成功后，应该可以访问：
- `https://your-site.pages.dev/` → 重定向到 `/landing`
- `https://your-site.pages.dev/landing`
- `https://your-site.pages.dev/BBBeepadmin2026/users/[id]`（动态路由）
- 所有其他页面
