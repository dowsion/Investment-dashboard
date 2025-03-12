# Investment Dashboard 使用指南

## 关于
这是一个用于管理投资组合(Portfolio)的仪表板应用。本指南将帮助您设置和使用该应用程序，特别是解决可能遇到的常见问题。

## 1. 设置指南

### 开发环境设置
```bash
# 克隆代码库
git clone <repository-url>
cd investment-dashboard

# 安装依赖
npm install

# 设置环境变量
cp .env.example .env.local
# 编辑.env.local文件，设置管理员密码和令牌
# NEXT_PUBLIC_ADMIN_PASSWORD=your_password
# NEXT_PUBLIC_ADMIN_TOKEN=your_token

# 启动开发服务器
npm run dev
```

### 生产环境部署
```bash
# 构建应用
npm run build

# 在服务器上使用PM2启动应用
pm2 start npm --name "dashboard" -- start
```

## 2. 管理员认证

为了管理Portfolio，您需要具有管理员权限。系统通过两个关键的头部信息验证管理员身份：

- `X-Admin-Auth`: 表示请求来自管理员
- `X-Admin-Token`: 存储在`.env.local`文件中的管理员令牌

### 2.1 管理员登录

1. 访问`/admin`页面
2. 输入在`.env.local`文件中设置的管理员密码
3. 登录成功后，系统会将认证状态保存在浏览器的localStorage中

### 2.2 常见认证问题

如果您无法添加或修改Portfolio，可能是以下原因导致的：

1. **本地存储问题**: 浏览器的localStorage可能被清除或损坏
   - 解决方法: 在浏览器控制台中执行`localStorage.clear()`，然后重新登录

2. **环境变量配置错误**: 配置文件中的管理员令牌可能不正确
   - 解决方法: 检查`.env.local`文件，确保`NEXT_PUBLIC_ADMIN_PASSWORD`和`NEXT_PUBLIC_ADMIN_TOKEN`设置正确

3. **API请求问题**: 请求头未正确设置
   - 解决方法: 确保您使用了`getAuthHeaders()`函数获取认证头

### 2.3 重置管理员权限

如果管理员密码或令牌丢失，可以使用提供的工具脚本重置：

```bash
# 运行管理员工具
node admin-portfolio-tools.js
# 选择选项7: 重置管理员权限
```

## 3. Portfolio管理

### 3.1 添加Portfolio

1. 登录管理员账户
2. 导航到`/portfolio/new`页面
3. 填写必要信息（名称、投资日期、投资金额）
4. 点击"创建"按钮

#### 无法添加Portfolio的解决方案

如果您无法添加新的Portfolio，请按照以下步骤排查：

1. **检查浏览器控制台**
   查看网络请求和JS错误，寻找失败的原因

2. **确认管理员认证**
   ```javascript
   // 在浏览器控制台中执行以下命令，检查您是否已通过管理员验证
   console.log(localStorage.getItem('adminAuthenticated'));
   console.log(localStorage.getItem('adminToken'));
   ```

3. **使用诊断修复脚本**
   ```bash
   # 在服务器上运行诊断脚本
   bash fix-portfolio-add.sh
   ```

4. **使用命令行工具直接添加**
   ```bash
   # 运行管理员工具
   node admin-portfolio-tools.js
   # 选择选项2: 添加新Portfolio
   ```

### 3.2 编辑Portfolio

1. 导航到Portfolio详情页面
2. 点击"编辑"按钮（如果按钮不可见，确保您已登录管理员账户）
3. 修改信息后保存

### 3.3 管理文档

1. 导航到`/documents/upload`页面
2. 选择文档类型和关联的Portfolio
3. 上传文件并提供标题
4. 点击"上传"按钮

## 4. 故障排除

### 4.1 图表不显示

确保数据库中有足够的数据。如果图表仍然不显示，检查浏览器控制台中的错误消息。

### 4.2 API错误

1. 确认服务器正在运行
2. 检查数据库连接
3. 验证API路由文件是否正确

### 4.3 数据库问题

如果遇到数据库相关错误，请使用管理员工具来测试数据库连接：

```bash
# 运行管理员工具
node admin-portfolio-tools.js
# 选择选项6: 测试数据库连接
```

## 5. 服务器维护

### 5.1 重启应用

```bash
# 使用PM2重启应用
pm2 restart dashboard
```

### 5.2 查看日志

```bash
# 查看应用日志
pm2 logs dashboard

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 5.3 数据备份

定期备份数据库和上传的文件：

```bash
# 备份数据库
cp prisma/dev.db prisma/backups/dev_$(date +%Y%m%d).db

# 备份上传的文件
cp -r public/uploads public/uploads_backup_$(date +%Y%m%d)
```

## 6. 使用管理员工具

我们提供了一个命令行工具，用于直接管理Portfolio和文档：

```bash
# 运行管理员工具
node admin-portfolio-tools.js
```

该工具提供以下功能：

1. 查看所有Portfolio
2. 添加新Portfolio
3. 修改Portfolio
4. 删除Portfolio
5. 查看所有文档
6. 测试数据库连接
7. 重置管理员权限

## 7. 联系支持

如有任何问题或需要帮助，请联系系统管理员。 