# AI家教后端API服务器

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 3. 测试API
```bash
npm test
```

## 📋 API接口

### 基础接口
- `GET /` - 服务器状态
- `GET /health` - 健康检查

### 图片处理接口
- `POST /api/upload-image` - 上传图片文件
- `POST /api/chat-with-image` - 图片分析对话
- `GET /api/uploads` - 获取上传的图片列表
- `DELETE /api/upload/:filename` - 删除图片文件

### 文本对话接口
- `POST /api/chat` - 纯文本对话

## 🔧 配置

### GLM API配置
在 `server.js` 中修改：
```javascript
const GLM_API_KEY = 'your_api_key_here';
```

### 支持的模型
- `glm-4` - 基础模型
- `glm-4v` - 视觉模型
- `glm-4-plus` - 增强模型
- `glm-4v-plus` - 增强视觉模型

## 📁 文件结构

```
/mnt/d/aitutor/
├── server.js              # 主服务器文件
├── package.json           # 依赖配置
├── test_backend.js        # 测试脚本
├── uploads/               # 上传文件目录（自动创建）
│   └── *.jpg, *.png...   # 上传的图片文件
└── README_BACKEND.md      # 本说明文档
```

## 🔌 前端集成

### 1. 启动后端服务器
```bash
npm start
```
服务器将在 `http://localhost:3000` 运行

### 2. 修改前端配置
在前端代码中配置后端API地址：
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

### 3. 图片上传示例
```javascript
const formData = new FormData();
formData.append('image', file);

fetch('http://localhost:3000/api/upload-image', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    console.log('上传成功:', data.file.url);
});
```

### 4. 图片分析示例
```javascript
fetch('http://localhost:3000/api/chat-with-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: '请描述这张图片',
        imagePath: '/uploads/your-image.jpg',
        model: 'glm-4v'
    })
})
.then(response => response.json())
.then(data => {
    console.log('分析结果:', data.response);
});
```

## 🛡️ 安全注意事项

1. **API密钥安全**: 不要在客户端代码中暴露GLM API密钥
2. **文件验证**: 后端已实现文件类型和大小验证
3. **CORS配置**: 根据需要调整允许的源地址

## 📊 监控和日志

- 所有API调用都会在控制台输出详细日志
- 上传的文件存储在本地 `uploads/` 目录
- 建议定期清理上传的文件

## 🚨 故障排除

### 常见问题

1. **服务器无法启动**
   - 检查端口3000是否被占用
   - 确认Node.js版本 >= 14.0.0

2. **GLM API调用失败**
   - 验证API密钥是否正确
   - 检查网络连接
   - 确认API余额充足

3. **图片上传失败**
   - 检查文件大小（限制10MB）
   - 确认文件类型（只允许图片）
   - 检查 `uploads/` 目录权限

### 日志查看
服务器会输出详细的运行日志，包括：
- API请求详情
- GLM API调用结果
- 错误信息
- 文件操作记录

## 🔄 开发模式

使用 `nodemon` 可以在代码修改时自动重启服务器：
```bash
npm run dev
```

## 🌐 部署

### Docker部署（可选）
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 环境变量
可以通过环境变量配置：
- `PORT` - 服务器端口（默认3000）
- `GLM_API_KEY` - GLM API密钥