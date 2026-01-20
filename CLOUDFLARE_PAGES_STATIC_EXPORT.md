# Cloudflare Pages 静态导出配置

## ✅ 已切换到静态导出模式

已配置 Next.js 使用静态导出（`output: 'export'`），这会生成静态 HTML 文件到 `out` 目录，完全兼容 Cloudflare Pages。

## 🔧 Cloudflare Pages 配置

### 重要：必须设置正确的输出目录

在 Cloudflare Pages 项目设置中：

1. **进入 Settings → Builds & deployments**

2. **Build settings**:
   - **Root directory**: `/frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `out` ⬅️ **重要！必须设置为 `out`**

3. **Framework preset**: 可以设置为 **Static HTML** 或留空（静态导出不需要特殊 preset）

4. **环境变量**:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
   ```

## 📝 静态导出的限制

### ✅ 支持的功能
- 所有静态页面
- 客户端路由（使用 `useRouter`）
- 客户端数据获取（使用 `useEffect` 和 API）
- 所有 UI 组件

### ⚠️ 不支持的功能
- 服务器端渲染（SSR）
- API routes
- `getServerSideProps`
- `getStaticProps`（但可以使用 `generateStaticParams`）
- Next.js Image 优化（已禁用，使用普通 `<img>` 标签）

## 🔄 动态路由处理

对于动态路由（如 `/BBBeepadmin2026/users/[id]`）：
- 已添加 `generateStaticParams()` 返回空数组
- 这意味着所有动态路由都在客户端处理
- 首次访问时会动态加载内容

## 🚀 部署步骤

1. 在 Cloudflare Pages 中更新 **Build output directory** 为 `out`
2. 触发新部署（会自动检测最新代码）
3. 等待部署完成

## ✅ 验证

部署成功后，应该可以访问：
- `https://your-site.pages.dev/` → 自动重定向到 `/landing`
- `https://your-site.pages.dev/landing`
- `https://your-site.pages.dev/login`
- `https://your-site.pages.dev/BBBeepadmin2026/users/[id]`（动态路由，客户端处理）
- 所有其他页面

## 📦 构建输出

静态导出会在 `frontend/out` 目录生成：
- `index.html`（根页面）
- `landing.html`
- `login.html`
- 所有其他页面的 HTML 文件
- `_next/static/`（静态资源）

Cloudflare Pages 会直接服务这些静态文件。

## ⚠️ 如果仍然失败

如果设置输出目录为 `out` 后仍然失败，请检查：

1. **构建日志**
   - 确认 `out` 目录已生成
   - 确认 `out/index.html` 存在

2. **Cloudflare Pages 设置**
   - 确认 Build output directory 设置为 `out`（不是 `.next` 或 `out/`）
   - 确认 Root directory 设置为 `/frontend`

3. **文件结构**
   - 在构建日志中查看是否生成了 `out` 目录
   - 确认所有页面都生成了对应的 HTML 文件
