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

# 使用多个服务检测外部IP地址
get_external_ip() {
  log "检测服务器外部IP地址..."
  # 尝试多个服务，按优先级排序
  EXTERNAL_IP=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || 
                curl -s -m 5 https://ifconfig.me 2>/dev/null || 
                curl -s -m 5 https://icanhazip.com 2>/dev/null || 
                curl -s -m 5 https://ipecho.net/plain 2>/dev/null ||
                curl -s -m 5 https://checkip.amazonaws.com 2>/dev/null)
  
  if [ -z "$EXTERNAL_IP" ]; then
    warn "无法检测到外部IP地址，尝试本地网络接口..."
    # 尝试从本地网络接口获取IP (非127.0.0.1的第一个IP)
    EXTERNAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
  fi
  
  if [ -z "$EXTERNAL_IP" ]; then
    warn "无法检测到有效的IP地址，将使用localhost"
    EXTERNAL_IP="127.0.0.1"
  else
    log "检测到服务器IP地址: $EXTERNAL_IP"
  fi
  
  echo "$EXTERNAL_IP"
}

# 检查Nginx安装
check_nginx_installation() {
  log "检查Nginx安装状态..."
  
  if ! command -v nginx &> /dev/null; then
    warn "Nginx未安装，正在安装..."
    apt-get update
    apt-get install -y nginx
    
    if ! command -v nginx &> /dev/null; then
      error "Nginx安装失败"
      exit 1
    fi
  fi
  
  log "Nginx已安装"
}

# 配置变量
DOMAIN="sgdb.stary.cloud"
SERVER_IP=$(get_external_ip)
NEXT_APP_PORT=3000
NGINX_LOG_DIR="/var/log/nginx"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
LOG_FILE="/var/log/nginx-setup.log"

# 初始化日志文件
> $LOG_FILE
log "========== 开始配置Nginx ==========" | tee -a $LOG_FILE
log "域名: $DOMAIN" | tee -a $LOG_FILE
log "服务器IP: $SERVER_IP" | tee -a $LOG_FILE

# 1. 检查并安装Nginx
log "1. 检查并安装Nginx" | tee -a $LOG_FILE
check_nginx_installation

# 2. 备份当前的Nginx配置
NGINX_BACKUP_DIR="/root/nginx-backup-$(date +%Y%m%d%H%M%S)"
log "2. 备份当前Nginx配置到 $NGINX_BACKUP_DIR" | tee -a $LOG_FILE
mkdir -p $NGINX_BACKUP_DIR
cp -r /etc/nginx/* $NGINX_BACKUP_DIR/ 2>/dev/null || warn "无法备份Nginx配置，可能是首次配置" | tee -a $LOG_FILE

# 3. 创建站点目录和日志目录
log "3. 确保日志目录存在" | tee -a $LOG_FILE
mkdir -p $NGINX_LOG_DIR

# 4. 生成Nginx配置文件
log "4. 生成Nginx配置文件" | tee -a $LOG_FILE
NGINX_CONF="$NGINX_SITES_AVAILABLE/$DOMAIN"

cat > $NGINX_CONF << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $SERVER_IP;
    
    access_log $NGINX_LOG_DIR/${DOMAIN}_access.log;
    error_log $NGINX_LOG_DIR/${DOMAIN}_error.log;

    # 增加缓冲区大小，避免413错误
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:$NEXT_APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # 静态资源缓存设置
    location /_next/static/ {
        proxy_pass http://localhost:$NEXT_APP_PORT/_next/static/;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600";
    }

    location /public/ {
        proxy_pass http://localhost:$NEXT_APP_PORT/public/;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600";
    }
}
EOF

log "Nginx配置文件已生成: $NGINX_CONF" | tee -a $LOG_FILE

# 5. 启用站点配置
log "5. 启用站点配置" | tee -a $LOG_FILE
ln -sf $NGINX_CONF $NGINX_SITES_ENABLED/

# 6. 禁用默认站点（如果存在）
if [ -f "$NGINX_SITES_ENABLED/default" ]; then
  log "禁用默认站点" | tee -a $LOG_FILE
  rm -f $NGINX_SITES_ENABLED/default
fi

# 7. 检查Nginx配置是否有语法错误
log "6. 检查Nginx配置是否有语法错误" | tee -a $LOG_FILE
nginx -t
if [ $? -ne 0 ]; then
  error "Nginx配置有语法错误，请查看上面的输出" | tee -a $LOG_FILE
  log "正在恢复备份..." | tee -a $LOG_FILE
  cp -r $NGINX_BACKUP_DIR/* /etc/nginx/
  exit 1
fi

# 8. 重启Nginx
log "7. 重启Nginx" | tee -a $LOG_FILE
systemctl restart nginx
if [ $? -ne 0 ]; then
  error "Nginx重启失败" | tee -a $LOG_FILE
  systemctl status nginx
  exit 1
fi

# 9. 检查Nginx是否在运行
log "8. 检查Nginx运行状态" | tee -a $LOG_FILE
systemctl is-active --quiet nginx
if [ $? -ne 0 ]; then
  error "Nginx未运行，尝试启动..." | tee -a $LOG_FILE
  systemctl start nginx
  
  systemctl is-active --quiet nginx
  if [ $? -ne 0 ]; then
    error "无法启动Nginx" | tee -a $LOG_FILE
    exit 1
  fi
fi

# 10. 确保Nginx在系统启动时自动启动
log "9. 设置Nginx开机自启动" | tee -a $LOG_FILE
systemctl enable nginx

# 11. 检查防火墙设置
log "10. 检查防火墙设置" | tee -a $LOG_FILE
if command -v ufw &> /dev/null; then
  ufw status | grep "Status: active" &> /dev/null
  if [ $? -eq 0 ]; then
    log "检测到UFW防火墙处于活动状态，确保HTTP/HTTPS端口开放..." | tee -a $LOG_FILE
    ufw allow 80/tcp
    ufw allow 443/tcp
    log "防火墙规则已更新" | tee -a $LOG_FILE
  else
    log "UFW防火墙未激活，跳过防火墙配置" | tee -a $LOG_FILE
  fi
else
  warn "未检测到UFW，无法配置防火墙" | tee -a $LOG_FILE
fi

# 12. 测试Nginx连接
log "11. 测试Nginx连接" | tee -a $LOG_FILE
curl -s -o /dev/null -w "%{http_code}" http://localhost
HTTP_CODE=$?
if [ $HTTP_CODE -ne 0 ]; then
  warn "无法连接到Nginx localhost，HTTP代码: $HTTP_CODE" | tee -a $LOG_FILE
else
  log "成功连接到Nginx" | tee -a $LOG_FILE
fi

# 13. 询问是否设置SSL证书
log "12. 是否要为 $DOMAIN 配置SSL证书？" | tee -a $LOG_FILE
echo "注意: 要使用SSL证书，您需要确保域名 $DOMAIN 已正确指向此服务器 ($SERVER_IP)"
read -p "是否配置SSL证书？(y/n): " setup_ssl

if [[ "$setup_ssl" =~ ^[Yy]$ ]]; then
  log "尝试设置SSL证书..." | tee -a $LOG_FILE
  
  # 检查certbot是否已安装
  if ! command -v certbot &> /dev/null; then
    log "安装certbot..." | tee -a $LOG_FILE
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
  fi
  
  # 使用certbot获取证书
  log "使用Certbot申请SSL证书..." | tee -a $LOG_FILE
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
  
  if [ $? -ne 0 ]; then
    warn "自动SSL配置失败，可能是域名DNS未正确设置" | tee -a $LOG_FILE
    log "您可以稍后手动运行: certbot --nginx -d $DOMAIN" | tee -a $LOG_FILE
  else
    log "SSL证书配置成功!" | tee -a $LOG_FILE
  fi
else
  log "跳过SSL配置，您可以稍后手动运行: certbot --nginx -d $DOMAIN" | tee -a $LOG_FILE
fi

# 完成
log "========== Nginx配置完成 ==========" | tee -a $LOG_FILE
log "Nginx已成功配置!" | tee -a $LOG_FILE
log "您现在可以通过以下地址访问您的应用:" | tee -a $LOG_FILE
echo "- http://$SERVER_IP"
echo "- http://$DOMAIN (如果DNS已配置)"

if [[ "$setup_ssl" =~ ^[Yy]$ ]]; then
  echo "- https://$DOMAIN (如果SSL配置成功)"
fi

log "Nginx日志位置:" | tee -a $LOG_FILE
echo "- 访问日志: $NGINX_LOG_DIR/${DOMAIN}_access.log"
echo "- 错误日志: $NGINX_LOG_DIR/${DOMAIN}_error.log"

log "配置日志已保存至: $LOG_FILE" | tee -a $LOG_FILE 