# 开发服务器故障排除

## 问题：500 错误和 404 错误

如果遇到以下错误：
- `GET http://localhost:3000/landing 500 (Internal Server Error)`
- `GET http://localhost:3000/_next/static/chunks/... 404 (Not Found)`

## 解决方案

### 1. 清理缓存并重启

```bash
# 停止所有 Next.js 进程
pkill -f "next dev"

# 清理 .next 缓存
cd frontend
rm -rf .next

# 重新启动开发服务器
npm run dev
```

### 2. 检查端口占用

```bash
# 检查端口 3000 是否被占用
lsof -ti:3000

# 如果被占用，可以：
# - 杀死占用进程：kill -9 <PID>
# - 或使用其他端口：PORT=3001 npm run dev
```

### 3. 重新安装依赖（如果问题持续）

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 4. 检查环境变量

确保 `.env.local` 文件存在且配置正确：

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. 检查 Node.js 版本

确保使用兼容的 Node.js 版本（推荐 18.x 或 20.x）：

```bash
node --version
```

### 6. 完整重启流程

```bash
# 1. 停止所有相关进程
pkill -f "next dev"
pkill -f "node.*frontend"

# 2. 清理缓存
cd frontend
rm -rf .next
rm -rf node_modules/.cache

# 3. 重新启动
npm run dev
```

## 常见问题

### 问题：端口已被占用
**解决**：使用 `PORT=3001 npm run dev` 或杀死占用进程

### 问题：模块找不到
**解决**：运行 `npm install` 重新安装依赖

### 问题：TypeScript 错误
**解决**：运行 `npm run build` 查看详细错误信息

### 问题：样式不加载
**解决**：确保 `tailwind.config.ts` 和 `postcss.config.js` 配置正确
