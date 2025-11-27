#!/bin/bash

# AI家教项目部署脚本
# 使用方法: ./deploy.sh your-server-ip your-api-key

set -e

# 检查参数
if [ $# -ne 2 ]; then
    echo "用法: ./deploy.sh <服务器IP或域名> <GLM_API_KEY>"
    echo "示例: ./deploy.sh 123.456.789.012 your-glm-api-key-here"
    exit 1
fi

SERVER_IP=$1
API_KEY=$2

echo "🚀 开始部署AI家教到服务器: $SERVER_IP"

# 1. 创建必要的目录
echo "📁 创建目录结构..."
ssh root@$SERVER_IP "mkdir -p /var/www/aitutor/uploads"
ssh root@$SERVER_IP "mkdir -p /var/log"

# 2. 上传项目文件
echo "📤 上传项目文件..."
scp -r ./* root@$SERVER_IP:/var/www/aitutor/ 2>/dev/null

# 3. 安装依赖
echo "📦 安装Node.js依赖..."
ssh root@$SERVER_IP "cd /var/www/aitutor && npm install --production"

# 4. 配置环境变量
echo "⚙️ 配置环境变量..."
cat > .env << EOF
NODE_ENV=production
PORT=3000
GLM_API_KEY=$API_KEY
UPLOAD_DIR=/var/www/aitutor/uploads
EOF

scp .env root@$SERVER_IP:/var/www/aitutor/

# 5. 配置Nginx
echo "🌐 配置Nginx..."
sed "s/your-domain.com/$SERVER_IP/g" nginx.conf > temp_nginx.conf
scp temp_nginx.conf root@$SERVER_IP:/etc/nginx/sites-available/aitutor

ssh root@$SERVER_IP "ln -sf /etc/nginx/sites-available/aitutor /etc/nginx/sites-enabled/"
ssh root@$SERVER_IP "nginx -t && systemctl reload nginx"

# 6. 安装PM2
echo "🔧 安装PM2..."
ssh root@$SERVER_IP "npm install -g pm2"

# 7. 启动服务
echo "🚀 启动服务..."
scp ecosystem.config.js root@$SERVER_IP:/var/www/aitutor/

ssh root@$SERVER_IP "cd /var/www/aitutor && pm2 start ecosystem.config.js"

# 8. 检查服务状态
echo "✅ 检查服务状态..."
ssh root@$SERVER_IP "pm2 status"
ssh root@$SERVER_IP "pm2 logs aitutor --lines 20"

# 9. 配置防火墙
echo "🔥 配置防火墙..."
ssh root@$SERVER_IP "ufw allow 22/tcp"
ssh root@$SERVER_IP "ufw allow 80/tcp"
ssh root@$SERVER_IP "ufw allow 443/tcp"
ssh root@$SERVER_IP "ufw allow 3000/tcp"
ssh root@$SERVER_IP "ufw reload"

echo "🎉 部署完成！"
echo ""
echo "📋 访问信息："
echo "   HTTP: http://$SERVER_IP"
echo "   HTTPS: https://$SERVER_IP (如果配置了SSL)"
echo "   API: http://$SERVER_IP/api"
echo ""
echo "📝 管理命令："
echo "   查看状态: ssh root@$SERVER_IP 'pm2 status'"
echo "   重启服务: ssh root@$SERVER_IP 'pm2 restart aitutor'"
echo "   查看日志: ssh root@$SERVER_IP 'pm2 logs aitutor --lines 50'"
echo ""
echo "⚠️  注意事项："
echo "   1. 确保防火墙已正确配置"
echo "   2. 建议配置域名和SSL证书"
echo "   3. 定期备份上传目录: /var/www/aitutor/uploads"