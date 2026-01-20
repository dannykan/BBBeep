# Railway Prisma OpenSSL 修复

## 问题

Railway 后端部署失败，错误信息：
```
Error loading shared library libssl.so.1.1: No such file or directory
(needed by /app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node)
```

## 原因

Railway 使用 Alpine Linux（musl-based），但 Prisma 需要 OpenSSL 1.1.x 库。Alpine Linux 默认不包含这个库。

## 解决方案

已在 Dockerfile 中添加 OpenSSL 1.1.x 兼容库：

### 1. 在 deps 阶段安装
```dockerfile
RUN apk add --no-cache libc6-compat openssl1.1-compat
```

### 2. 在 runner 阶段安装
```dockerfile
RUN apk add --no-cache openssl1.1-compat
```

## 验证

部署成功后，Prisma 应该能够正常加载，后端应该可以正常启动。

## 如果仍然失败

如果问题持续，可以尝试：

1. **使用不同的基础镜像**：
   ```dockerfile
   FROM node:18-slim  # 使用 Debian-based 镜像
   ```

2. **或者使用 Prisma 的二进制目标**：
   在 `schema.prisma` 中指定：
   ```prisma
   generator client {
     provider = "prisma-client-js"
     binaryTargets = ["native", "linux-musl-openssl-1.1.x"]
   }
   ```

3. **检查 Railway 环境变量**：
   确保 `DATABASE_URL` 和其他必要的环境变量都已设置。
