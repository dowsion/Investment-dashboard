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

# 日志文件
LOG_FILE="/home/ubuntu/build-log.txt"
# 初始化日志文件
> $LOG_FILE

# 配置变量
PROJECT_DIR="/home/ubuntu/investment-dashboard"
SERVER_IP=$(curl -s ifconfig.me)

info "========== 开始修复应用构建问题 =========="
echo "$(date): 开始修复应用构建问题" >> $LOG_FILE

# 1. 确保项目目录存在
info "1. 检查项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
  error "项目目录不存在，请先运行deploy-lightsail.sh脚本"
  echo "$(date): 错误 - 项目目录不存在" >> $LOG_FILE
  exit 1
fi

# 2. 检查和释放内存
info "2. 检查系统资源..."
free_m=$(free -m)
echo "内存使用情况:" >> $LOG_FILE
echo "$free_m" >> $LOG_FILE
echo "$free_m"

# 尝试释放一些内存缓存
info "   释放系统缓存..."
sudo sync
sudo bash -c "echo 3 > /proc/sys/vm/drop_caches"
free_m_after=$(free -m)
echo "释放缓存后内存使用情况:" >> $LOG_FILE
echo "$free_m_after" >> $LOG_FILE
echo "$free_m_after"

# 3. 进入项目目录
info "3. 进入项目目录..."
cd $PROJECT_DIR
echo "$(date): 当前目录: $(pwd)" >> $LOG_FILE

# 4. 清理之前的构建
info "4. 清理之前的构建文件..."
rm -rf .next
rm -rf node_modules/.cache
echo "$(date): 清理了.next目录和node_modules缓存" >> $LOG_FILE

# 5. 重新安装依赖
info "5. 重新安装依赖..."
echo "$(date): 开始重新安装依赖" >> $LOG_FILE
npm ci 2>&1 | tee -a $LOG_FILE

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  warn "npm ci失败，尝试使用npm install..."
  echo "$(date): npm ci失败，尝试使用npm install" >> $LOG_FILE
  npm install --production=false 2>&1 | tee -a $LOG_FILE
fi

# 6. 验证关键依赖
info "6. 验证关键依赖..."
if [ -d "node_modules/next" ]; then
  info "   ✅ next依赖已安装"
  echo "$(date): next依赖已安装" >> $LOG_FILE
else
  error "   ❌ next依赖缺失，尝试单独安装"
  echo "$(date): next依赖缺失，尝试单独安装" >> $LOG_FILE
  npm install next 2>&1 | tee -a $LOG_FILE
fi

if [ -d "node_modules/react" ] && [ -d "node_modules/react-dom" ]; then
  info "   ✅ react及react-dom依赖已安装"
  echo "$(date): react及react-dom依赖已安装" >> $LOG_FILE
else
  error "   ❌ react或react-dom依赖缺失，尝试单独安装"
  echo "$(date): react或react-dom依赖缺失，尝试单独安装" >> $LOG_FILE
  npm install react react-dom 2>&1 | tee -a $LOG_FILE
fi

# 7. 修复权限问题
info "7. 修复可能的权限问题..."
sudo chown -R ubuntu:ubuntu $PROJECT_DIR
echo "$(date): 已修复文件权限" >> $LOG_FILE

# 8. 配置环境变量
info "8. 确保环境变量正确..."
if [ -f ".env" ]; then
  info "   ✅ .env文件存在"
  echo "$(date): .env文件存在" >> $LOG_FILE
  
  # 确保必要的环境变量存在
  if ! grep -q "NODE_ENV=production" .env; then
    echo "NODE_ENV=production" >> .env
    info "   已添加NODE_ENV=production到.env"
    echo "$(date): 已添加NODE_ENV=production到.env" >> $LOG_FILE
  fi
else
  warn "   ❌ .env文件不存在，创建新文件"
  echo "$(date): .env文件不存在，创建新文件" >> $LOG_FILE
  
  # 创建最小的.env文件
  cat > .env << EOF
NODE_ENV=production
PORT=3000
EOF
  info "   已创建基本.env文件"
  echo "$(date): 已创建基本.env文件" >> $LOG_FILE
fi

# 9. 尝试构建应用
info "9. 开始构建应用 (这可能需要几分钟时间)..."
echo "$(date): 开始构建应用" >> $LOG_FILE
export NODE_OPTIONS="--max_old_space_size=2048" # 增加Node.js内存限制

# 使用详细模式构建并记录日志
npm run build 2>&1 | tee -a $LOG_FILE

# 检查构建结果
if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
  info "   ✅ 应用构建成功！"
  echo "$(date): 应用构建成功" >> $LOG_FILE
else
  error "   ❌ 应用构建失败，请查看日志文件: $LOG_FILE"
  echo "$(date): 错误 - 应用构建失败" >> $LOG_FILE
  
  # 检查常见错误
  if grep -q "out of memory" $LOG_FILE; then
    error "   内存不足错误，尝试在更大的实例上构建或增加交换空间"
    echo "$(date): 内存不足错误" >> $LOG_FILE
  fi
  
  if grep -q "syntax error" $LOG_FILE; then
    error "   代码语法错误，请修复后再次尝试"
    echo "$(date): 代码语法错误" >> $LOG_FILE
  fi
fi

# 10. 更新PM2配置并重启应用
if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
  info "10. 更新PM2配置..."
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
  echo "$(date): 已更新PM2配置" >> $LOG_FILE

  info "11. 重启应用..."
  pm2 delete investment-dashboard 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  echo "$(date): 已重启应用" >> $LOG_FILE
  
  info "12. 验证端口监听状态..."
  sleep 5 # 给应用启动一些时间
  if netstat -tuln | grep -q ":3000"; then
    info "   ✅ 端口3000已被监听，应用启动成功！"
    echo "$(date): 端口3000已被监听，应用启动成功" >> $LOG_FILE
  else
    error "   ❌ 端口3000未被监听，应用可能启动失败"
    echo "$(date): 错误 - 端口3000未被监听，应用可能启动失败" >> $LOG_FILE
  fi
fi

info "========== 修复完成 =========="
info "构建日志已保存到: $LOG_FILE"
echo "$(date): 修复过程完成" >> $LOG_FILE

if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
  info "您现在应该可以通过以下方式访问应用:"
  echo "- http://$SERVER_IP:3000 (直接访问)"
  echo "- http://$SERVER_IP (通过Nginx，如果已配置)"
  
  info "如果仍然无法访问，请运行以下命令检查应用日志:"
  echo "pm2 logs investment-dashboard"
  echo "或运行 ./fix-network.sh 脚本修复网络配置"
else
  error "构建失败。请检查日志文件找出原因:"
  echo "cat $LOG_FILE | grep -i error"
  echo ""
  info "您可能需要检查:"
  echo "1. 服务器内存是否足够 (至少2GB内存)"
  echo "2. 依赖项是否兼容"
  echo "3. 项目代码是否有语法错误"
fi 