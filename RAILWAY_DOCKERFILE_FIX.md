# Railway Dockerfile 修复 - OpenSSL 问题

## 问题

Alpine Linux 3.21 中 `openssl1.1-compat` 包不存在，导致构建失败：
```
ERROR: unable to select packages:
  openssl1.1-compat (no such package)
```

## 解决方案

已切换到 Debian 基础镜像（`node:18-slim`），原因：

1. **Debian 默认包含 OpenSSL 1.1.x**
   - 不需要额外安装兼容包
   - 更稳定可靠

2. **Prisma 兼容性更好**
   - Debian 是 Prisma 官方推荐的基础镜像之一
   - 在 `schema.prisma` 中添加了 `binaryTargets` 配置

## 更改内容

### 1. Dockerfile
- 从 `node:18-alpine` 切换到 `node:18-slim`（Debian）
- 移除了 Alpine 特定的包安装命令
- 添加了 Debian 的 OpenSSL 安装（虽然通常已包含）

### 2. Prisma Schema
- 添加了 `binaryTargets = ["native", "debian-openssl-1.1.x"]`
- 确保 Prisma 生成正确的二进制文件

## 验证

部署成功后，应该：
- ✅ 构建成功，没有 OpenSSL 错误
- ✅ Prisma 可以正常加载
- ✅ 后端可以正常启动

## 如果仍然失败

如果问题持续，可以尝试：

1. **使用更明确的 Debian 版本**：
   ```dockerfile
   FROM node:18-bullseye-slim
   ```

2. **或者使用 Ubuntu**：
   ```dockerfile
   FROM node:18-jammy
   ```

3. **检查 Prisma 版本**：
   确保使用最新版本的 Prisma，它可能已经修复了某些兼容性问题。
