# 清除 Next.js 缓存问题

如果遇到 webpack 缓存错误，请按以下步骤操作：

## 快速修复

```bash
cd frontend
rm -rf .next
npm run dev
```

## 完整清理（如果快速修复无效）

```bash
cd frontend
rm -rf .next node_modules/.cache
npm run dev
```

## 新的开发命令

现在可以使用 `dev:clean` 命令，它会自动清理缓存后启动：

```bash
cd frontend
npm run dev:clean
```

## 问题说明

这个错误通常是由于 Next.js 的 webpack 缓存损坏导致的。在开发模式下，Next.js 会缓存编译结果以提高性能，但有时缓存会过期或损坏，导致模块解析错误。

## 预防措施

1. 避免在开发过程中频繁修改多个文件
2. 如果遇到错误，先尝试清理 `.next` 目录
3. 如果问题持续，考虑更新 Next.js 版本
