#!/bin/bash

echo "🚀 启动AI家教后端API服务器..."
echo

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到Node.js，请先安装Node.js"
    echo "📥 下载地址：https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js已安装: $(node --version)"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

# 启动服务器
echo "🔧 启动后端服务器..."
echo "📍 服务器将在 http://localhost:3000 运行"
echo "🛑 按 Ctrl+C 停止服务器"
echo

npm start