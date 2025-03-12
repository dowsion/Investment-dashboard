#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 诊断工具头部信息
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}     Portfolio添加功能诊断修复工具               ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""

# 检查项目目录
PROJECT_DIR="/home/ubuntu/investment-dashboard"
echo -e "${YELLOW}[检查]${NC} 检查项目目录是否存在..."
if [ -d "$PROJECT_DIR" ]; then
  echo -e "${GREEN}[成功]${NC} 项目目录存在: $PROJECT_DIR"
  cd $PROJECT_DIR
else
  echo -e "${RED}[错误]${NC} 项目目录不存在: $PROJECT_DIR"
  echo -e "请修改脚本中的PROJECT_DIR变量指向正确的项目位置"
  exit 1
fi

# 检查环境变量文件
echo -e "${YELLOW}[检查]${NC} 检查环境变量文件..."
if [ -f ".env" ]; then
  echo -e "${GREEN}[成功]${NC} 环境变量文件存在"
else
  echo -e "${RED}[错误]${NC} 环境变量文件不存在，创建基本环境变量文件..."
  echo "DATABASE_URL=\"file:./prisma/dev.db\"" > .env
  echo -e "${GREEN}[修复]${NC} 创建了基本环境变量文件"
fi

# 检查API路由配置
echo -e "${YELLOW}[检查]${NC} 检查API路由配置..."
API_ROUTE="src/app/api/projects/route.ts"
if [ -f "$API_ROUTE" ]; then
  echo -e "${GREEN}[成功]${NC} API路由文件存在: $API_ROUTE"
  # 检查管理员验证逻辑
  AUTH_CHECK=$(grep -c "X-Admin-Auth" $API_ROUTE)
  if [ $AUTH_CHECK -gt 0 ]; then
    echo -e "${GREEN}[成功]${NC} API路由包含管理员验证逻辑"
  else
    echo -e "${RED}[错误]${NC} API路由可能缺少管理员验证逻辑，请检查代码"
  fi
else
  echo -e "${RED}[错误]${NC} API路由文件不存在: $API_ROUTE"
fi

# 检查前端表单
echo -e "${YELLOW}[检查]${NC} 检查前端表单是否正确设置管理员验证头..."
FORM_FILE="src/app/portfolio/new/page.tsx"
if [ -f "$FORM_FILE" ]; then
  echo -e "${GREEN}[成功]${NC} 表单文件存在: $FORM_FILE"
  AUTH_HEADER=$(grep -c "X-Admin-Auth" $FORM_FILE)
  AUTH_TOKEN=$(grep -c "X-Admin-Token" $FORM_FILE)
  if [ $AUTH_HEADER -gt 0 ] && [ $AUTH_TOKEN -gt 0 ]; then
    echo -e "${GREEN}[成功]${NC} 表单设置了管理员验证头"
  else
    echo -e "${RED}[错误]${NC} 表单可能缺少管理员验证头，请检查代码"
  fi
else
  echo -e "${RED}[错误]${NC} 表单文件不存在: $FORM_FILE"
fi

# 检查localStorage设置
echo -e "${YELLOW}[检查]${NC} 检查用户登录状态存储..."
AUTH_FILE="src/app/admin/page.tsx"
if [ -f "$AUTH_FILE" ]; then
  echo -e "${GREEN}[成功]${NC} 管理页面文件存在: $AUTH_FILE"
  LOCAL_STORAGE=$(grep -c "localStorage.setItem('adminAuthenticated'" $AUTH_FILE)
  if [ $LOCAL_STORAGE -gt 0 ]; then
    echo -e "${GREEN}[成功]${NC} 管理页面设置了localStorage验证标记"
  else
    echo -e "${RED}[错误]${NC} 管理页面可能没有正确设置localStorage验证标记，请检查代码"
  fi
else
  echo -e "${RED}[错误]${NC} 管理页面文件不存在: $AUTH_FILE"
fi

# 修复权限问题
echo -e "${YELLOW}[检查]${NC} 检查文件权限..."
sudo chown -R ubuntu:ubuntu $PROJECT_DIR
echo -e "${GREEN}[修复]${NC} 已重置项目目录的所有权"

# 检查数据库状态
echo -e "${YELLOW}[检查]${NC} 检查数据库状态..."
DB_FILE="prisma/dev.db"
if [ -f "$DB_FILE" ]; then
  echo -e "${GREEN}[成功]${NC} 数据库文件存在: $DB_FILE"
  
  # 检查数据库文件权限
  DB_PERMS=$(stat -c "%a" $DB_FILE)
  if [ "$DB_PERMS" -lt "644" ]; then
    echo -e "${RED}[错误]${NC} 数据库文件权限不足: $DB_PERMS"
    chmod 644 $DB_FILE
    echo -e "${GREEN}[修复]${NC} 已设置数据库文件权限为644"
  else
    echo -e "${GREEN}[成功]${NC} 数据库文件权限正常: $DB_PERMS"
  fi
else
  echo -e "${RED}[错误]${NC} 数据库文件不存在: $DB_FILE"
  echo -e "${YELLOW}[修复]${NC} 尝试生成数据库..."
  npx prisma generate
  npx prisma db push
  if [ -f "$DB_FILE" ]; then
    echo -e "${GREEN}[修复]${NC} 已生成数据库文件"
  else
    echo -e "${RED}[错误]${NC} 数据库生成失败，请手动检查Prisma配置"
  fi
fi

# 测试API访问
echo -e "${YELLOW}[测试]${NC} 测试API端点访问..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/projects > /tmp/api_status
API_STATUS=$(cat /tmp/api_status)
if [ "$API_STATUS" == "200" ]; then
  echo -e "${GREEN}[成功]${NC} API端点可以访问: HTTP $API_STATUS"
else
  echo -e "${RED}[错误]${NC} API端点无法访问: HTTP $API_STATUS"
  echo -e "${YELLOW}[修复]${NC} 请确保Next.js应用正在运行"
  echo -e "${YELLOW}[建议]${NC} 尝试重启应用: pm2 restart dashboard"
fi

# 清除浏览器缓存建议
echo -e "${YELLOW}[建议]${NC} 尝试在浏览器中清除localStorage和cookies后重新登录管理界面"
echo -e "${YELLOW}[建议]${NC} 在浏览器开发者工具中执行: localStorage.clear(); sessionStorage.clear();"

echo ""
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}     诊断完成                                      ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo ""
echo -e "如果问题仍未解决，请检查服务器日志:"
echo -e "- PM2日志: ${YELLOW}pm2 logs dashboard${NC}"
echo -e "- Nginx日志: ${YELLOW}sudo tail -f /var/log/nginx/error.log${NC}"
echo ""
echo -e "也可以尝试完全重建应用:"
echo -e "${YELLOW}cd $PROJECT_DIR && npm run build && pm2 restart dashboard${NC}" 