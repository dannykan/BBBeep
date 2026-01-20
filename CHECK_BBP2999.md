# 检查 BBP-2999 当前状态

## 方法 1：使用 Prisma Studio

```bash
cd backend
npx prisma studio
```

然后在浏览器中打开 `http://localhost:5555`，查看 User 表，搜索 `BBP-2999`。

## 方法 2：使用 SQL 查询

```bash
cd backend
npx prisma db execute --stdin
```

然后输入：
```sql
SELECT phone, nickname, licensePlate, "hasCompletedOnboarding", "createdAt"
FROM "User"
WHERE "licensePlate" = 'BBP-2999';
```

## 方法 3：创建查询脚本

创建一个临时脚本查询：

```typescript
// backend/check-bbp2999.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { licensePlate: 'BBP-2999' },
  });

  if (user) {
    console.log('找到 BBP-2999 用户：');
    console.log('手机号：', user.phone);
    console.log('昵称：', user.nickname || '未设定');
    console.log('已完成注册：', user.hasCompletedOnboarding);
    console.log('创建时间：', user.createdAt);
  } else {
    console.log('未找到 BBP-2999 用户');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

运行：
```bash
cd backend
npx ts-node check-bbp2999.ts
```

## 预期结果

如果 BBP-2999 已绑定到 `0966685928`，查询应该显示：
- phone: `0966685928`
- licensePlate: `BBP-2999`
- hasCompletedOnboarding: `true`
