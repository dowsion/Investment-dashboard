#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的信息
log() {
  echo -e "${GREEN}[INFO]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# 确保以root权限运行
if [ "$(id -u)" != "0" ]; then
   error "此脚本需要以root权限运行"
   echo "请使用 sudo 运行此脚本"
   exit 1
fi

# 配置变量
DOMAIN="sgdb.stary.cloud"
APP_PORT=3000
LOG_FILE="/var/log/nginx-setup.log"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# 初始化日志文件
> $LOG_FILE
log "开始配置Nginx" | tee -a $LOG_FILE
log "域名: $DOMAIN" | tee -a $LOG_FILE

# 使用多个服务检测外部IP地址
get_external_ip() {
  log "检测服务器外部IP地址..." | tee -a $LOG_FILE
  # 尝试多个服务，按优先级排序
  EXTERNAL_IP=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || 
                curl -s -m 5 https://ifconfig.me 2>/dev/null || 
                curl -s -m 5 https://icanhazip.com 2>/dev/null || 
                curl -s -m 5 https://ipecho.net/plain 2>/dev/null ||
                curl -s -m 5 https://checkip.amazonaws.com 2>/dev/null)
  
  if [ -z "$EXTERNAL_IP" ]; then
    warn "无法检测到外部IP地址，尝试本地网络接口..." | tee -a $LOG_FILE
    # 尝试从本地网络接口获取IP (非127.0.0.1的第一个IP)
    EXTERNAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
  fi
  
  if [ -z "$EXTERNAL_IP" ]; then
    warn "无法检测到有效的IP地址，将使用localhost" | tee -a $LOG_FILE
    EXTERNAL_IP="127.0.0.1"
  else
    log "检测到服务器IP地址: $EXTERNAL_IP" | tee -a $LOG_FILE
  fi
  
  echo "$EXTERNAL_IP"
}

SERVER_IP=$(get_external_ip)

# 检查Nginx是否已安装
log "检查Nginx是否已安装..." | tee -a $LOG_FILE
if ! command -v nginx &> /dev/null; then
    log "Nginx未安装，开始安装..." | tee -a $LOG_FILE
    apt-get update
    apt-get install -y nginx
    if [ $? -ne 0 ]; then
        error "Nginx安装失败，请检查系统日志" | tee -a $LOG_FILE
        exit 1
    fi
    log "Nginx安装成功" | tee -a $LOG_FILE
else
    log "Nginx已安装" | tee -a $LOG_FILE
fi

# 检查Nginx是否正在运行
log "检查Nginx服务状态..." | tee -a $LOG_FILE
systemctl is-active --quiet nginx
if [ $? -ne 0 ]; then
    log "启动Nginx服务..." | tee -a $LOG_FILE
    systemctl start nginx
    systemctl enable nginx
    if [ $? -ne 0 ]; then
        error "无法启动Nginx服务，请检查系统日志" | tee -a $LOG_FILE
        exit 1
    fi
fi
log "Nginx服务正在运行" | tee -a $LOG_FILE

# 创建Nginx配置目录（如果不存在）
log "确保Nginx配置目录存在..." | tee -a $LOG_FILE
mkdir -p $NGINX_AVAILABLE
mkdir -p $NGINX_ENABLED

# 创建网站配置文件
log "创建网站配置文件..." | tee -a $LOG_FILE

# 备份现有配置（如果存在）
if [ -f "$NGINX_AVAILABLE/$DOMAIN" ]; then
    log "备份现有配置..." | tee -a $LOG_FILE
    cp "$NGINX_AVAILABLE/$DOMAIN" "$NGINX_AVAILABLE/$DOMAIN.bak.$(date +%s)"
fi

# 创建标准HTTP配置
cat > "$NGINX_AVAILABLE/$DOMAIN" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $SERVER_IP;
    
    access_log /var/log/nginx/$DOMAIN-access.log;
    error_log /var/log/nginx/$DOMAIN-error.log;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffers 16 16k;
        proxy_buffer_size 16k;
    }
    
    # 允许大文件上传
    client_max_body_size 50M;
    
    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://localhost:$APP_PORT/_next/static/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    location /public/ {
        proxy_pass http://localhost:$APP_PORT/public/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
EOF

log "网站配置文件创建成功" | tee -a $LOG_FILE

# 启用站点
log "启用站点配置..." | tee -a $LOG_FILE
ln -sf "$NGINX_AVAILABLE/$DOMAIN" "$NGINX_ENABLED/"

# 移除默认站点（可选）
if [ -f "$NGINX_ENABLED/default" ]; then
    log "移除默认站点..." | tee -a $LOG_FILE
    rm -f "$NGINX_ENABLED/default"
fi

# 检查Nginx配置
log "检查Nginx配置语法..." | tee -a $LOG_FILE
nginx -t
if [ $? -ne 0 ]; then
    error "Nginx配置测试失败，请检查配置文件" | tee -a $LOG_FILE
    exit 1
fi
log "Nginx配置语法正确" | tee -a $LOG_FILE

# 重新加载Nginx
log "重新加载Nginx服务..." | tee -a $LOG_FILE
systemctl reload nginx
if [ $? -ne 0 ]; then
    error "无法重新加载Nginx服务，尝试重启..." | tee -a $LOG_FILE
    systemctl restart nginx
    if [ $? -ne 0 ]; then
        error "无法重启Nginx服务，请检查系统日志" | tee -a $LOG_FILE
        exit 1
    fi
fi

log "Nginx配置已重新加载" | tee -a $LOG_FILE

# 检查应用是否正在运行
log "检查应用是否正在端口 $APP_PORT 上运行..." | tee -a $LOG_FILE
if netstat -tuln | grep -q ":$APP_PORT\s"; then
    log "应用正在端口 $APP_PORT 上运行" | tee -a $LOG_FILE
else
    warn "未检测到应用在端口 $APP_PORT 上运行" | tee -a $LOG_FILE
    warn "请确保应用已启动，或使用deploy-lightsail.sh脚本部署应用" | tee -a $LOG_FILE
fi

# 检查防火墙
log "检查防火墙设置..." | tee -a $LOG_FILE
if command -v ufw &> /dev/null; then
    if ! ufw status | grep -q "Status: active"; then
        warn "防火墙未启用，跳过防火墙配置" | tee -a $LOG_FILE
    else
        log "配置防火墙规则..." | tee -a $LOG_FILE
        ufw allow 'Nginx Full'
        ufw allow ssh
        log "防火墙规则已更新" | tee -a $LOG_FILE
    fi
else
    warn "未检测到ufw防火墙，跳过防火墙配置" | tee -a $LOG_FILE
fi

# 验证Nginx是否监听指定端口
log "验证Nginx监听状态..." | tee -a $LOG_FILE
if ! netstat -tuln | grep -q ":80\s"; then
    warn "Nginx未在端口80上监听，可能存在配置问题" | tee -a $LOG_FILE
else
    log "Nginx正在监听HTTP流量（端口80）" | tee -a $LOG_FILE
fi

# 添加SSL配置的说明
log "========== 配置完成 ==========" | tee -a $LOG_FILE
log "Nginx已配置完成，HTTP站点已启用" | tee -a $LOG_FILE
log "您现在可以通过以下方式访问您的网站:" | tee -a $LOG_FILE
echo "- http://$SERVER_IP (使用服务器IP)"
echo "- http://$DOMAIN (使用域名，如果DNS已配置)"

echo ""
log "如需配置HTTPS (SSL)，请运行以下命令安装Certbot:" | tee -a $LOG_FILE
echo "sudo apt install -y certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d $DOMAIN"

log "配置日志已保存至: $LOG_FILE" | tee -a $LOG_FILE 