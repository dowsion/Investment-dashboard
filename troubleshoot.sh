#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

info "========== 开始排查网站访问问题 =========="

# 1. 检查服务器是否可访问
info "1. 检查服务器网络连接..."
if ping -c 1 google.com &> /dev/null; then
  info "  ✅ 网络连接正常"
else
  warn "  ❌ 网络连接异常，服务器可能无法访问外网"
fi

# 2. 检查Node.js和NPM状态
info "2. 检查Node.js环境..."
if command -v node &> /dev/null; then
  node_version=$(node -v)
  info "  ✅ Node.js已安装: $node_version"
else
  error "  ❌ Node.js未安装或无法访问"
fi

if command -v npm &> /dev/null; then
  npm_version=$(npm -v)
  info "  ✅ NPM已安装: $npm_version"
else
  error "  ❌ NPM未安装或无法访问"
fi

# 3. 检查项目文件是否存在
PROJECT_DIR="/home/ubuntu/investment-dashboard"
info "3. 检查项目文件..."
if [ -d "$PROJECT_DIR" ]; then
  info "  ✅ 项目目录存在: $PROJECT_DIR"
  
  if [ -f "$PROJECT_DIR/package.json" ]; then
    info "  ✅ package.json文件存在"
  else
    error "  ❌ package.json文件不存在，可能未正确克隆代码"
  fi

  if [ -d "$PROJECT_DIR/.next" ]; then
    info "  ✅ 项目已编译 (.next目录存在)"
  else
    error "  ❌ 项目未编译或编译失败 (.next目录不存在)"
  fi
else
  error "  ❌ 项目目录不存在: $PROJECT_DIR"
fi

# 4. 检查PM2状态
info "4. 检查PM2状态..."
if command -v pm2 &> /dev/null; then
  info "  ✅ PM2已安装"
  pm2_status=$(pm2 list)
  if echo "$pm2_status" | grep -q "investment-dashboard"; then
    if echo "$pm2_status" | grep -q "investment-dashboard" | grep -q "online"; then
      info "  ✅ PM2应用正在运行"
    else
      error "  ❌ PM2应用存在但未运行"
      info "  📋 PM2应用状态:"
      pm2 list
    fi
  else
    error "  ❌ PM2应用不存在"
    info "  📋 PM2应用列表:"
    pm2 list
  fi
else
  error "  ❌ PM2未安装或无法访问"
fi

# 5. 检查进程是否监听3000端口
info "5. 检查端口监听状态..."
if command -v netstat &> /dev/null; then
  netstat_cmd="netstat"
elif command -v ss &> /dev/null; then
  netstat_cmd="ss"
else
  warn "  ⚠️ 未找到netstat或ss命令，安装net-tools或iproute2"
  sudo apt install -y net-tools
  netstat_cmd="netstat"
fi

if $netstat_cmd -tuln | grep -q ":3000"; then
  info "  ✅ 端口3000正在被监听"
else
  error "  ❌ 没有进程监听3000端口"
  info "  📋 所有监听端口:"
  $netstat_cmd -tuln
fi

# 6. 检查Nginx配置
info "6. 检查Nginx配置..."
if command -v nginx &> /dev/null; then
  info "  ✅ Nginx已安装"
  
  if [ -f "/etc/nginx/sites-available/investment-dashboard" ]; then
    info "  ✅ Nginx站点配置文件存在"
  else
    error "  ❌ Nginx站点配置文件不存在"
  fi
  
  if [ -L "/etc/nginx/sites-enabled/investment-dashboard" ]; then
    info "  ✅ Nginx站点已启用"
  else
    error "  ❌ Nginx站点未启用"
  fi
  
  nginx_test=$(sudo nginx -t 2>&1)
  if echo "$nginx_test" | grep -q "successful"; then
    info "  ✅ Nginx配置测试通过"
  else
    error "  ❌ Nginx配置测试失败"
    echo "$nginx_test"
  fi

  nginx_status=$(systemctl status nginx 2>&1)
  if echo "$nginx_status" | grep -q "Active: active (running)"; then
    info "  ✅ Nginx服务正在运行"
  else
    error "  ❌ Nginx服务未运行"
    echo "$nginx_status" | grep "Active:"
  fi
else
  error "  ❌ Nginx未安装或无法访问"
fi

# 7. 检查防火墙配置
info "7. 检查防火墙配置..."
if command -v ufw &> /dev/null; then
  ufw_status=$(sudo ufw status)
  info "  📋 UFW状态:"
  echo "$ufw_status"
  
  if echo "$ufw_status" | grep -q "80/tcp"; then
    info "  ✅ 防火墙已允许HTTP流量"
  else
    warn "  ⚠️ 防火墙可能阻止HTTP流量"
  fi
fi

# 8. 检查环境变量
info "8. 检查环境变量配置..."
if [ -f "$PROJECT_DIR/.env" ]; then
  info "  ✅ 环境变量文件(.env)存在"

  # 检查关键环境变量，但不显示敏感内容
  env_check=true
  grep -q "DATABASE_URL=" "$PROJECT_DIR/.env" || { error "  ❌ 缺少DATABASE_URL环境变量"; env_check=false; }
  grep -q "NODE_ENV=" "$PROJECT_DIR/.env" || { error "  ❌ 缺少NODE_ENV环境变量"; env_check=false; }
  grep -q "PORT=" "$PROJECT_DIR/.env" || { error "  ❌ 缺少PORT环境变量"; env_check=false; }
  
  if $env_check; then
    info "  ✅ 关键环境变量已配置"
  fi
else
  error "  ❌ 环境变量文件(.env)不存在"
fi

# 9. 尝试直接启动应用（临时测试）
info "9. 尝试直接启动应用进行测试..."
cd $PROJECT_DIR
echo "测试应用启动中，如果成功会显示日志"
echo "按Ctrl+C结束测试"
npm start

info "========== 排查完成 =========="
info "如果您已找到问题并需要重启应用，请运行以下命令:"
echo "cd $PROJECT_DIR && pm2 restart investment-dashboard"
echo ""
info "如果需要重新配置Nginx，请运行以下命令:"
echo "sudo ln -sf /etc/nginx/sites-available/investment-dashboard /etc/nginx/sites-enabled/"
echo "sudo nginx -t && sudo systemctl restart nginx"
echo ""
info "如果应用启动正常但仍无法访问，请验证安全组/防火墙是否开放了80/443端口" 