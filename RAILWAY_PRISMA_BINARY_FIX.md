# Railway Prisma Binary Target 修复

## 问题

部署后崩溃，错误信息：
```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x".
```

## 原因

1. **Debian 12 (slim) 使用 OpenSSL 3.0.x**
   - `node:18-slim` 基于 Debian 12 (bookworm)
   - Debian 12 默认使用 OpenSSL 3.0.x，不是 1.1.x

2. **Prisma binaryTargets 配置错误**
   - 之前配置为 `debian-openssl-1.1.x`
   - 但实际运行时需要 `debian-openssl-3.0.x`

## 解决方案

已更新 `prisma/schema.prisma` 中的 `binaryTargets`：

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

## 验证

部署成功后，应该：
- ✅ Prisma 可以找到正确的 Query Engine
- ✅ 后端可以正常启动
- ✅ 数据库连接正常

## 如果仍然失败

如果问题持续，可以尝试：

1. **使用 Debian 11 (bullseye)**：
   ```dockerfile
   FROM node:18-bullseye-slim
   ```
   然后使用 `binaryTargets = ["native", "debian-openssl-1.1.x"]`

2. **或者使用多个 binaryTargets**：
   ```prisma
   binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x"]
   ```

3. **检查 Prisma 版本**：
   确保使用最新版本的 Prisma，它可能已经修复了某些兼容性问题。
