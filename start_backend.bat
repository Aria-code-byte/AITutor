@echo off
echo 🚀 启动AI家教后端API服务器...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js，请先安装Node.js
    echo 📥 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js已安装

REM 检查依赖是否安装
if not exist node_modules (
    echo 📦 安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
)

REM 启动服务器
echo 🔧 启动后端服务器...
echo 📍 服务器将在 http://localhost:3000 运行
echo 🛑 按 Ctrl+C 停止服务器
echo.
npm start