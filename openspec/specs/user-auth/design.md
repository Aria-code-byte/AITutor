# 用户认证模块设计文档

## Architecture Overview

用户认证模块采用客户端本地存储的方式管理用户身份，通过AuthManager类提供统一的认证API接口。

## Component Design

### AuthManager Class
核心认证管理器，负责所有用户认证相关的操作。

#### Key Methods
- `register(username, password)`: 用户注册逻辑
- `login(username, password, rememberMe)`: 用户登录逻辑
- `logout()`: 用户登出逻辑
- `isLoggedIn()`: 检查登录状态
- `getCurrentUser()`: 获取当前用户信息
- `getUsers()`: 获取所有用户列表
- `isValidUsername(username)`: 用户名格式验证
- `isValidPassword(password)`: 密码强度验证
- `hashPassword(password)`: 密码哈希处理
- `verifyPassword(password, hash)`: 密码验证

#### Data Storage
```javascript
// localStorage结构
{
  "users": [
    {
      "id": "1640995200000",
      "username": "student123",
      "password": "hashed_password_20_chars",
      "createdAt": "2023-12-31T16:00:00.000Z",
      "lastLogin": "2024-01-01T10:30:00.000Z"
    }
  ],
  "userSession": {  // 或存储在sessionStorage
    "userId": "1640995200000",
    "username": "student123",
    "loginTime": "2024-01-01T10:30:00.000Z",
    "rememberMe": true
  }
}
```

### UI Components

#### LoginForm Component
登录表单组件，包含用户名、密码输入框和登录按钮。

**Key Features:**
- 实时输入验证
- 密码可见性切换
- "记住我"选项
- 键盘快捷键支持（Enter提交）
- 加载状态指示

#### RegisterForm Component
注册表单组件，包含用户名、密码、确认密码输入框。

**Key Features:**
- 实时密码强度检查
- 密码确认匹配验证
- 用户名格式验证
- 服务条款同意选项
- 注册成功后自动跳转

#### Toast Notification Component
消息提示组件，用于显示操作结果反馈。

**Types:**
- success: 成功操作（绿色）
- error: 错误操作（红色）
- warning: 警告信息（黄色）

## Security Implementation

### Password Hashing
当前实现使用简单哈希算法，生产环境建议升级：

```javascript
// 当前实现（简化版）
hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return btoa(hash.toString()).replace(/[^a-zA-Z0-9]/g, '').substr(0, 20);
}
```

**建议改进:**
- 使用bcrypt或PBKDF2进行密码哈希
- 添加盐值(salt)增强安全性
- 在服务端完成密码处理

### Input Validation
所有用户输入都进行客户端验证：

```javascript
// 用户名验证规则
isValidUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// 密码验证规则
isValidPassword(password) {
  return password.length >= 6;
}
```

## Flow Diagrams

### Registration Flow
```
用户输入注册信息 → 客户端验证 → 检查用户名唯一性 → 密码强度检查
→ 创建用户对象 → 存储到localStorage → 显示成功消息 → 跳转登录页
```

### Login Flow
```
用户输入登录信息 → 客户端验证 → 查找用户 → 验证密码 →
更新最后登录时间 → 创建会话 → 根据rememberMe选择存储方式 → 跳转主页
```

### Session Management Flow
```
页面加载 → 检查本地会话 → 验证用户存在 → 更新UI显示用户信息
```

## Error Handling

### Error Types
1. **Validation Errors**: 输入格式验证失败
2. **Duplicate User**: 用户名已存在
3. **Authentication Failed**: 用户名或密码错误
4. **Storage Errors**: 本地存储操作失败

### Error Display Strategy
- 使用Toast组件显示错误消息
- 不同错误类型使用不同颜色和图标
- 错误消息简洁明了，用户友好
- 表单验证错误显示在对应字段下方

## Performance Considerations

### Storage Optimization
- 用户数据存储在localStorage，避免重复网络请求
- 会话数据可选择sessionStorage（关闭浏览器自动清除）
- 避免在单个存储项中存储大量数据

### UI Responsiveness
- 异步处理认证操作，避免UI阻塞
- 使用防抖技术优化实时验证
- 加载状态提供即时用户反馈

## Browser Compatibility

### Required Features
- ES6+ (class syntax, arrow functions, const/let)
- localStorage/sessionStorage API
- CSS3 Flexbox/Grid
- Font Awesome 6.0 icons

### Fallback Support
- 在不支持localStorage的环境中显示提示
- 提供基础的CSS样式降级方案

## Future Enhancements

### Planned Features
1. **Service Worker Integration**: 离线认证支持
2. **Biometric Authentication**: 指纹/面部识别
3. **Two-Factor Authentication**: 双因子认证
4. **OAuth Integration**: 第三方登录（微信、QQ等）
5. **Password Recovery**: 密码找回功能

### Security Improvements
1. **Server-side Authentication**: 移动认证逻辑到后端
2. **JWT Tokens**: 使用JWT进行会话管理
3. **Rate Limiting**: 防止暴力破解
4. **CSRF Protection**: 跨站请求伪造防护
5. **Input Sanitization**: 更严格的输入清理

## Testing Strategy

### Unit Tests
- AuthManager类的所有方法
- 密码哈希和验证函数
- 输入验证规则

### Integration Tests
- 完整的注册流程
- 登录和登出流程
- 会话管理功能

### UI Tests
- 表单验证显示
- 错误消息提示
- 用户交互响应

### Manual Tests
- 跨浏览器兼容性
- 移动设备适配
- 离线场景处理