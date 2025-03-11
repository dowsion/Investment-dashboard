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

# 配置信息 - 请根据实际情况修改
GITHUB_REPO="https://github.com/dowsion/Investment-dashboard.git"
PROJECT_DIR="/home/ubuntu/investment-dashboard"
DOMAIN_NAME="yourdomain.com" # 如果有域名，请填写

# 确保脚本在出错时停止执行
set -e

# 检查磁盘空间
check_disk_space() {
  info "检查磁盘空间..."
  FREE_SPACE=$(df -h / | awk 'NR==2 {print $4}')
  info "可用磁盘空间: $FREE_SPACE"
  
  # 确保至少有1GB可用空间
  FREE_KB=$(df / | awk 'NR==2 {print $4}')
  if [ $FREE_KB -lt 1048576 ]; then
    error "磁盘空间不足，至少需要1GB可用空间"
    exit 1
  fi
}

# 清理APT缓存和失败的包安装
clean_apt() {
  info "清理APT缓存..."
  sudo apt-get clean
  sudo apt-get autoclean
  sudo rm -rf /var/cache/apt/archives/nodejs*
  sudo dpkg --configure -a
  sudo apt-get -f install -y
}

# 1. 更新系统并安装依赖
info "开始更新系统包..."
check_disk_space
clean_apt
sudo apt update && sudo apt upgrade -y

info "安装基本依赖..."
sudo apt install -y git curl wget build-essential unzip nginx

# 2. 安装 Node.js
install_nodejs() {
  info "尝试安装 Node.js 20.x..."
  
  # 先尝试使用NodeSource
  sudo apt-get remove -y nodejs || true
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  
  if ! sudo apt-get install -y nodejs; then
    warn "使用NodeSource安装Node.js失败，尝试使用NVM替代方案..."
    
    # 使用NVM替代
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    nvm install 20
    nvm use 20
    nvm alias default 20
    
    # 添加到bashrc
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc
    
    # 验证是否安装成功
    if ! command -v node &> /dev/null; then
      error "Node.js安装失败，请手动安装后继续"
      exit 1
    fi
  fi
  
  # 检查Node.js版本
  node -v
  npm -v
}

install_nodejs

# 3. 安装 PM2
info "安装 PM2 进程管理器..."
sudo npm install -g pm2 || npm install -g pm2

# 4. 安装 PostgreSQL
info "安装 PostgreSQL 数据库..."
sudo apt install -y postgresql postgresql-contrib

# 启动PostgreSQL服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 5. 配置数据库
info "配置 PostgreSQL 数据库..."
DB_NAME="investment_dashboard"
DB_USER="dashboard_user"
DB_PASSWORD=$(openssl rand -base64 12) # 生成随机密码

# 检查数据库是否已存在
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
  info "数据库 $DB_NAME 已存在，跳过创建步骤"
else
  info "创建数据库 $DB_NAME..."
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
fi

# 检查用户是否已存在
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  info "用户 $DB_USER 已存在，更新密码..."
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
  info "创建用户 $DB_USER..."
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# 授予用户权限
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 6. 克隆项目代码
info "克隆项目代码..."
if [ -d "$PROJECT_DIR" ]; then
  warn "目录 $PROJECT_DIR 已存在，正在更新代码..."
  cd $PROJECT_DIR
  git pull
else
  info "克隆代码到 $PROJECT_DIR..."
  git clone $GITHUB_REPO $PROJECT_DIR
  cd $PROJECT_DIR
fi

# 7. 创建环境配置文件
info "创建环境配置文件..."
cat > .env << EOF
# 数据库配置
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"

# Next.js 配置
NODE_ENV=production
PORT=3000

# JWT 密钥 (随机生成)
JWT_SECRET=$(openssl rand -base64 32)

# 其他环境变量
NEXTAUTH_URL=https://$DOMAIN_NAME
NEXTAUTH_URL_INTERNAL=http://localhost:3000
EOF

info "环境配置文件创建成功。数据库密码: $DB_PASSWORD"
info "请妥善保存这些信息！"

# 8. 安装项目依赖
info "安装项目依赖..."
npm install

# 9. 数据库迁移
info "执行数据库迁移..."
npx prisma generate
npx prisma migrate deploy

# 10. 构建项目
info "构建项目..."
npm run build

# 11. 配置 PM2
info "配置 PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "investment-dashboard",
    script: "node_modules/next/dist/bin/next",
    args: "start",
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

# 12. 使用 PM2 启动应用
info "启动应用..."
pm2 start ecosystem.config.js

# 设置 PM2 开机自启动
pm2 save
pm2 startup
if command -v sudo &> /dev/null; then
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
else
  env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
fi

# 13. 配置 Nginx
info "配置 Nginx 反向代理..."
sudo tee /etc/nginx/sites-available/investment-dashboard << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;  # 使用您的域名或服务器IP

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

# 启用网站配置
sudo ln -s /etc/nginx/sites-available/investment-dashboard /etc/nginx/sites-enabled/ || true
sudo rm -f /etc/nginx/sites-enabled/default || true

# 测试 Nginx 配置
sudo nginx -t || warn "Nginx配置测试失败，可能需要手动修复"

# 重启 Nginx
sudo systemctl restart nginx || warn "Nginx重启失败，可能需要手动重启"

# 14. 配置防火墙
info "配置防火墙..."
if command -v ufw &> /dev/null; then
  sudo apt install -y ufw
  sudo ufw allow ssh
  sudo ufw allow http
  sudo ufw allow https
  sudo ufw --force enable
else
  warn "未找到ufw，跳过防火墙配置"
fi

# 15. 安装 SSL 证书 (使用 Let's Encrypt)
info "安装 SSL 证书..."
if [ "$DOMAIN_NAME" != "yourdomain.com" ]; then
  if sudo apt install -y certbot python3-certbot-nginx; then
    sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email your-email@example.com || warn "SSL证书安装失败，可能需要手动配置"
  else
    warn "Certbot安装失败，跳过SSL配置"
  fi
else
  warn "未指定域名，跳过 SSL 证书配置。如需配置 SSL，请修改脚本中的 DOMAIN_NAME 变量。"
fi

# 16. 创建公共上传目录并设置权限
info "创建上传目录..."
mkdir -p $PROJECT_DIR/public/uploads
chmod -R 755 $PROJECT_DIR/public/uploads

# 17. 设置定期备份
info "配置数据库备份任务..."
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# 创建备份脚本
cat > $BACKUP_DIR/backup.sh << EOF
#!/bin/bash
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/investment_dashboard_\$TIMESTAMP.sql"
sudo -u postgres pg_dump $DB_NAME > \$BACKUP_FILE
gzip \$BACKUP_FILE
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +7 -delete
EOF

chmod +x $BACKUP_DIR/backup.sh

# 添加到 crontab
(crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_DIR/backup.sh") | crontab -

info "部署完成! 应用现在应该可以通过 http://$DOMAIN_NAME 访问（如果配置了域名）"
info "如果配置了 SSL，则可以通过 https://$DOMAIN_NAME 访问"
info "PM2 应用状态:"
pm2 status

info "数据库信息:"
echo "数据库名称: $DB_NAME"
echo "数据库用户: $DB_USER"
echo "数据库密码: $DB_PASSWORD"

info "请记住修改此脚本中的 GITHUB_REPO 和 DOMAIN_NAME 变量为你的实际值"
info "如果需要再次运行此脚本，它将更新现有安装" 