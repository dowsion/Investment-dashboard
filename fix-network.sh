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

# 配置变量
PROJECT_DIR="/home/ubuntu/investment-dashboard"
SERVER_IP=$(curl -s ifconfig.me)

info "========== 开始修复网站访问问题 =========="

# 1. 确保项目目录存在
info "1. 检查项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
  error "项目目录不存在，请先运行deploy-lightsail.sh脚本"
  exit 1
fi

# 2. 修复Next.js应用绑定
info "2. 修复Next.js应用绑定..."
cd $PROJECT_DIR

# 修改package.json中的start脚本，确保绑定到所有网卡
if [ -f "package.json" ]; then
  info "修改package.json中的start脚本..."
  # 备份原文件
  cp package.json package.json.bak
  
  # 修改start脚本，添加HOST参数
  sed -i 's/"start": "next start"/"start": "next start -H 0.0.0.0"/g' package.json
  
  info "✅ 已修改package.json"
else
  error "package.json不存在！"
fi

# 3. 修复PM2配置
info "3. 修复PM2配置..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "investment-dashboard",
    script: "node_modules/next/dist/bin/next",
    args: "start -H 0.0.0.0",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
EOF
info "✅ 已更新PM2配置"

# 4. 修复Nginx配置
info "4. 修复Nginx配置..."
sudo tee /etc/nginx/sites-available/investment-dashboard << EOF
server {
    listen 80;
    server_name $SERVER_IP;  # 使用服务器IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://localhost:3000/_next/static/;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600";
    }

    location /public/ {
        proxy_pass http://localhost:3000/public/;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600";
    }
}
EOF
info "✅ 已更新Nginx配置"

# 启用网站配置并测试
sudo ln -sf /etc/nginx/sites-available/investment-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 5. 开放防火墙端口
info "5. 配置防火墙..."
if command -v ufw &> /dev/null; then
  info "开放HTTP和HTTPS端口..."
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 3000/tcp
  
  # 如果防火墙未启用，则启用它
  if ! sudo ufw status | grep -q "Status: active"; then
    sudo ufw --force enable
  fi
  
  info "✅ 已配置防火墙规则"
fi

# 6. 重启PM2应用
info "6. 重启应用..."
cd $PROJECT_DIR
pm2 delete investment-dashboard 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
info "✅ 已重启应用"

info "7. 检查端口监听状态..."
if command -v netstat &> /dev/null; then
  netstat -tuln | grep ":3000"
elif command -v ss &> /dev/null; then
  ss -tuln | grep ":3000"
else
  sudo apt install -y net-tools
  netstat -tuln | grep ":3000"
fi

# 8. 确保AWS Lightsail防火墙设置正确
info "8. AWS Lightsail防火墙提示..."
echo "请确保您已在AWS Lightsail控制台中添加了以下防火墙规则:"
echo "- HTTP (TCP/80)"
echo "- HTTPS (TCP/443)"
echo "- 自定义 TCP/3000 (如果需要直接访问应用)"

info "========== 修复完成 =========="
info "您现在应该可以通过以下方式访问应用:"
echo "- http://$SERVER_IP (通过Nginx代理)"
echo "- http://$SERVER_IP:3000 (直接访问)"
echo ""
info "如果仍然无法访问，请运行 ./troubleshoot.sh 脚本进行详细排查" 