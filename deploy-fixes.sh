#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}     Investment Dashboard 修复部署脚本              ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# 检查目录
if [ ! -d "src" ]; then
  echo -e "${RED}错误: 当前目录不是项目根目录${NC}"
  echo -e "请确保在 investment-dashboard 项目根目录运行此脚本"
  exit 1
fi

# 1. 备份当前代码
echo -e "${YELLOW}[1/8] 备份当前代码...${NC}"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r src prisma public package.json $BACKUP_DIR/
echo -e "${GREEN}完成: 代码已备份到 $BACKUP_DIR 目录${NC}"
echo ""

# 2. 更新环境变量
echo -e "${YELLOW}[2/8] 检查环境变量...${NC}"
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}警告: .env.local 文件不存在，将创建一个新的...${NC}"
  
  # 生成随机密码和令牌
  ADMIN_PASSWORD=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)
  ADMIN_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
  
  # 创建.env.local文件
  echo "NEXT_PUBLIC_ADMIN_PASSWORD=$ADMIN_PASSWORD" > .env.local
  echo "NEXT_PUBLIC_ADMIN_TOKEN=$ADMIN_TOKEN" >> .env.local
  
  echo -e "${GREEN}完成: 已创建新的管理员凭据${NC}"
  echo -e "管理员密码: ${YELLOW}$ADMIN_PASSWORD${NC}"
  echo -e "管理员令牌: ${YELLOW}$ADMIN_TOKEN${NC}"
  echo -e "${RED}请将这些凭据保存在安全的地方!${NC}"
else
  echo -e "${GREEN}完成: .env.local 文件已存在${NC}"
fi
echo ""

# 3. 更新依赖
echo -e "${YELLOW}[3/8] 更新依赖...${NC}"
npm install
echo -e "${GREEN}完成: 依赖已更新${NC}"
echo ""

# 4. 应用数据库迁移
echo -e "${YELLOW}[4/8] 应用数据库迁移...${NC}"
npx prisma generate
npx prisma db push
echo -e "${GREEN}完成: 数据库已更新${NC}"
echo ""

# 5. 授予上传目录权限
echo -e "${YELLOW}[5/8] 设置上传目录权限...${NC}"
mkdir -p public/uploads
chmod -R 755 public/uploads
echo -e "${GREEN}完成: 上传目录权限已设置${NC}"
echo ""

# 6. 创建工具脚本目录
echo -e "${YELLOW}[6/8] 检查工具脚本...${NC}"
chmod +x fix-portfolio-add.sh
chmod +x deploy-fixes.sh
echo -e "${GREEN}完成: 工具脚本权限已更新${NC}"
echo ""

# 7. 构建应用
echo -e "${YELLOW}[7/8] 构建应用...${NC}"
npm run build
echo -e "${GREEN}完成: 应用构建成功${NC}"
echo ""

# 8. 重启应用
echo -e "${YELLOW}[8/8] 重启应用...${NC}"
if command -v pm2 &> /dev/null; then
  pm2 restart dashboard || pm2 start npm --name "dashboard" -- start
  echo -e "${GREEN}完成: 应用已使用PM2重启${NC}"
else
  echo -e "${YELLOW}警告: PM2未安装，跳过重启步骤${NC}"
  echo -e "您可以手动运行: npm start"
fi
echo ""

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}     部署完成!                                     ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""
echo -e "现在您可以访问应用:"
echo -e "- 主页: http://localhost:3000"
echo -e "- 管理员页面: http://localhost:3000/admin"
echo ""
echo -e "${YELLOW}如需进一步支持，请参阅 Usage-Guide.md 文档${NC}"
echo -e "${YELLOW}或使用管理员工具: node admin-portfolio-tools.js${NC}" 