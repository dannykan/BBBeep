# 实现计划

## 需要实现的功能

### 1. 车牌绑定检查
- ✅ 检查车牌是否已被绑定（非临时用户）
- ✅ 如果已绑定，不允许重复绑定
- ✅ 检查 BBP-2999 当前绑定的手机号

### 2. 车牌申请流程
- 注册时如果车牌已被登记：
  - 显示警示消息确认是否是他的车子
  - 如果是，提交申请（上传行照照片）
  - 1-2个工作天内短信回复

### 3. Admin 管理界面
- 路由：`/BBBeepadmin2026`
- 密码：`12345678`
- 功能：
  - 查看所有车牌（按汽车、机车、行人分类）
  - 点击查看和编辑收件夹内容
  - 查看和编辑账户资料
  - 手动编辑和新增车牌（只能新增未绑定的车牌）

## 数据库变更

需要添加：
1. `LicensePlateApplication` 模型（车牌申请）
2. Admin 用户表或简单的密码验证

## API 端点

### 车牌相关
- `GET /users/check-license-plate/:plate` - 检查车牌是否可用
- `POST /users/license-plate-application` - 提交车牌申请
- `GET /users/license-plate-application/:id` - 查看申请状态

### Admin 相关
- `POST /admin/login` - Admin 登录
- `GET /admin/users` - 获取所有用户（按类型分类）
- `GET /admin/users/:id` - 获取用户详情
- `PUT /admin/users/:id` - 更新用户信息
- `GET /admin/users/:id/messages` - 获取用户收件夹
- `PUT /admin/users/:id/messages/:messageId` - 编辑消息
- `POST /admin/license-plates` - 新增车牌（未绑定状态）
- `PUT /admin/license-plates/:plate` - 编辑车牌
