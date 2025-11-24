# AI家教前后端集成使用指南

## 🎯 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (Browser)  │    │   后端 (Node.js)  │    │  GLM Vision API  │
│                 │    │                 │    │                 │
│ • 图片上传按钮     │───▶│ • 图片上传接口    │───▶│ • 图片分析       │
│ • 用户界面        │    │ • 文件存储       │    │ • 多模态对话     │
│ • 对话显示        │    │ • API调用        │    │ • 智能回复       │
│ • 模型选择        │    │ • 错误处理       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 快速开始

### 步骤1：启动后端服务器

#### Windows用户
```bash
# 双击运行
start_backend.bat
```

#### Mac/Linux用户
```bash
# 给脚本执行权限
chmod +x start_backend.sh

# 运行脚本
./start_backend.sh
```

#### 手动启动
```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

### 步骤2：验证后端运行

1. 打开浏览器访问：http://localhost:3000
2. 应该看到：`{"message": "AI家教后端API服务器运行中", "status": "ok"}`
3. 或者运行测试：`npm test`

### 步骤3：使用前端应用

1. 打开 `index.html`
2. 点击📷图片上传按钮
3. 选择一张图片
4. 选择"GLM-4 Vision"模型
5. 输入问题，如："请描述这张图片的内容"

## 📋 功能特点

### ✅ 已实现的功能

#### 前端功能
- 🖼️ **图片上传**：支持JPG、PNG、GIF、WebP格式
- 📤 **自动上传**：图片自动上传到后端服务器
- 🤖 **智能模型切换**：上传图片时自动建议视觉模型
- 💬 **实时对话**：支持流式输出显示
- 🔧 **错误处理**：友好的错误提示和重试机制

#### 后端功能
- 🗂️ **文件管理**：安全的文件上传和存储
- 🔐 **API集成**：完整的GLM Vision API集成
- 🛡️ **数据验证**：文件类型和大小验证
- 📊 **日志记录**：详细的操作日志
- 🔄 **错误恢复**：智能错误处理和重试

### 🔧 技术特点

#### 安全性
- ✅ API密钥只在后端存储
- ✅ 文件类型验证
- ✅ 文件大小限制（10MB）
- ✅ CORS安全配置

#### 性能
- ✅ 异步文件处理
- ✅ 智能缓存机制
- ✅ 请求超时控制
- ✅ 错误快速恢复

#### 兼容性
- ✅ 支持所有现代浏览器
- ✅ 响应式设计
- ✅ 多种图片格式
- ✅ 多个GLM模型

## 🔌 API接口详解

### 图片上传接口
```
POST /api/upload-image
Content-Type: multipart/form-data

Body: FormData with 'image' field

Response:
{
  "success": true,
  "message": "图片上传成功",
  "file": {
    "id": "1234567890",
    "filename": "image-1234567890.jpg",
    "originalname": "my-photo.jpg",
    "size": 1024000,
    "url": "/uploads/image-1234567890.jpg"
  }
}
```

### 图片分析接口
```
POST /api/chat-with-image
Content-Type: application/json

{
  "message": "请描述这张图片",
  "imagePath": "/uploads/image-1234567890.jpg",
  "model": "glm-4v"
}

Response:
{
  "success": true,
  "response": "这是一张美丽的风景图片...",
  "model": "glm-4v",
  "usage": { "prompt_tokens": 50, "completion_tokens": 100 }
}
```

## 🛠️ 配置说明

### 后端配置（server.js）
```javascript
const GLM_API_KEY = 'your_api_key_here';  // 更换为您的API密钥
const PORT = 3000;                      // 服务器端口
```

### 前端配置（script.js）
```javascript
const BACKEND_URL = 'http://localhost:3000';  // 后端服务器地址
```

## 📁 项目结构

```
/mnt/d/aitutor/
├── 后端文件
│   ├── server.js              # 主服务器文件
│   ├── package.json           # 依赖配置
│   ├── test_backend.js        # 测试脚本
│   ├── uploads/               # 上传文件目录
│   ├── start_backend.bat      # Windows启动脚本
│   └── start_backend.sh       # Mac/Linux启动脚本
├── 前端文件
│   ├── index.html             # 主页面
│   ├── script.js              # 前端逻辑
│   ├── styles.css             # 样式文件
│   └── *.png, *.jpg           # 图片资源
└── 文档
    ├── README_BACKEND.md      # 后端说明
    └── INTEGRATION_GUIDE.md   # 本集成指南
```

## 🔍 故障排除

### 常见问题

#### 1. 后端服务器无法启动
```bash
# 检查端口占用
netstat -an | grep :3000

# 检查Node.js版本
node --version  # 需要 >= 14.0.0

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

#### 2. 图片上传失败
- 检查文件格式（只支持图片）
- 检查文件大小（限制10MB）
- 检查网络连接
- 查看后端控制台日志

#### 3. API调用失败
- 验证GLM API密钥是否正确
- 检查后端服务器是否运行
- 确认网络连接正常
- 查看浏览器控制台错误信息

#### 4. 前端无法连接后端
- 确认后端在 http://localhost:3000 运行
- 检查CORS配置
- 尝试刷新页面

### 调试技巧

#### 查看后端日志
```bash
# 启动时会显示详细日志
npm start

# 测试API
npm test
```

#### 查看前端日志
1. 打开浏览器开发者工具 (F12)
2. 切换到Console标签
3. 查看详细的调试信息

## 🚀 部署建议

### 开发环境
- 使用 `npm run dev` 自动重启
- 启用详细日志记录
- 使用本地测试

### 生产环境
- 使用进程管理器 (PM2)
- 配置反向代理 (Nginx)
- 启用HTTPS
- 设置日志轮转

### Docker部署
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 性能监控

### 关键指标
- API响应时间
- 图片上传速度
- 内存使用情况
- 磁盘空间使用
- GLM API调用次数

### 监控工具
- 后端控制台日志
- 浏览器开发者工具
- API测试工具
- 系统监控工具

## 🔮 未来扩展

### 计划功能
- 📝 **文档处理**：支持PDF、Word等文档分析
- 🎵 **语音输入**：语音转文字功能
- 💬 **多语言**：支持多语言对话
- 📊 **数据统计**：使用情况统计
- 👥 **用户管理**：多用户支持

### 技术改进
- 🔄 **WebSocket**：实时通信
- 🗄️ **数据库**：持久化存储
- 🌐 **CDN**：静态资源加速
- 🔐 **OAuth**：第三方登录
- 📱 **移动端**：React Native应用

---

## 🎉 总结

这个前后端分离的AI家教系统具有：
- ✅ **完整的图片识别功能**
- ✅ **安全的API架构**
- ✅ **用户友好的界面**
- ✅ **强大的错误处理**
- ✅ **详细的文档和测试**

现在您就可以享受完整的AI图片识别功能了！🚀