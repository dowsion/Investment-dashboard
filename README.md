# Investment Dashboard

投资组合管理仪表板，用于跟踪和管理投资项目。

## 功能特点

- 项目组合概览与分析
- 详细的投资组合管理
- 文档上传和管理
- 响应式设计，支持移动端和桌面端
- 管理员后台

## 技术栈

- **前端**: Next.js 15, React 19, TailwindCSS 4
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL, Prisma ORM
- **认证**: NextAuth.js
- **部署**: AWS Lightsail

## 本地开发

### 前提条件

- Node.js 20+
- PostgreSQL 数据库

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/investment-dashboard.git
   cd investment-dashboard
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置环境变量
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，填入您的数据库连接信息和其他配置

4. 数据库迁移
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. 启动开发服务器
   ```bash
   npm run dev
   ```

6. 访问 http://localhost:3000

## 部署到 AWS Lightsail

### 使用部署脚本

我们提供了一个自动化部署脚本 `deploy-lightsail.sh`，用于将应用部署到 AWS Lightsail 实例。

1. 在 AWS Lightsail 创建一个实例
   - 选择 Linux/Unix 平台
   - 选择 Ubuntu 20.04 LTS 蓝图
   - 选择至少 2GB RAM 的实例计划

2. 编辑部署脚本
   打开 `deploy-lightsail.sh`，修改以下变量:
   ```bash
   GITHUB_REPO="https://github.com/yourusername/investment-dashboard.git"
   DOMAIN_NAME="yourdomain.com"  # 如果有域名
   ```

3. 连接到您的 Lightsail 实例
   ```bash
   ssh ubuntu@your-instance-ip
   ```

4. 上传并执行部署脚本
   ```bash
   wget https://raw.githubusercontent.com/yourusername/investment-dashboard/main/deploy-lightsail.sh
   chmod +x deploy-lightsail.sh
   ./deploy-lightsail.sh
   ```

5. 脚本会自动完成以下操作:
   - 安装所需系统依赖
   - 配置 Node.js 环境
   - 设置 PostgreSQL 数据库
   - 克隆和配置项目
   - 设置 PM2 进程管理
   - 配置 Nginx 和 SSL

### 手动部署

如果您希望手动部署，请参考 `deploy-lightsail.sh` 脚本中的步骤。

## 项目结构

```
investment-dashboard/
├── prisma/               # Prisma 数据库模式和迁移
├── public/               # 静态资源
│   └── uploads/          # 文档上传目录
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── admin/        # 管理员页面
│   │   ├── portfolio/    # 投资组合页面
│   │   ├── documents/    # 文档管理页面
│   │   └── api/          # API 路由
│   ├── components/       # React 组件
│   └── lib/              # 实用工具和库
└── next.config.js        # Next.js 配置
```

## 维护与备份

脚本会自动设置每日数据库备份任务，备份文件存储在 `/home/ubuntu/backups` 目录中。

## 许可

[MIT 许可证](LICENSE)
