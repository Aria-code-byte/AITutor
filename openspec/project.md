# Project Context

## Purpose
AI家教软件是一个智能个人学习辅助工具，旨在为学生提供个性化学习指导、知识问答和AI对话服务。软件支持多模态输入（文本、图片、文档等），提供智能对话功能、知识管理系统和学习数据分析。目标用户包括学生群体（小学到大学）、需要学习指导的成人学习者以及教育工作者。

## Tech Stack
- **前端技术栈**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Font Awesome 6
- **后端技术栈**: Node.js (>=14.0.0), Express.js 4.18.2
- **AI集成**: 智谱AI GLM API (glm-4, glm-4v, glm-4-plus, glm-4v-plus模型)
- **文件处理**: Multer (图片上传), Base64编码
- **数据存储**: 本地文件系统 (uploads目录)
- **开发工具**: nodemon (开发模式), Node.js原生测试
- **代码高亮**: Prism.js (语法高亮引擎)
- **网络通信**: fetch API, RESTful接口设计
- **跨域支持**: CORS middleware

## Project Conventions

### Code Style
- **JavaScript**: ES6+ 语法，使用 const/let 优先于 var，函数表达式和箭头函数混合使用
- **变量命名**: 驼峰命名法 (camelCase)，语义化命名，避免单字母变量名
- **CSS**: BEM 命名规范，CSS变量用于主题配置，响应式设计优先
- **HTML**: 语义化标签，合理的文档结构，aria标签支持无障碍访问
- **文件命名**: 使用连字符分隔 (kebab-case)，如 `auth.js`, `styles.css`
- **注释**: 中文注释为主，关键函数和复杂逻辑需要详细注释
- **代码格式**: 4空格缩进，避免使用制表符

### Architecture Patterns
- **前后端分离架构**: 前端纯静态HTML/CSS/JS，后端Express.js提供RESTful API
- **单页应用(SPA)模式**: 通过JavaScript动态渲染页面，避免页面刷新
- **模块化设计**: 前端按功能模块划分CSS和JS，后端按路由模块组织代码
- **事件驱动编程**: 使用DOM事件监听和自定义事件进行组件通信
- **中间件模式**: Express.js使用中间件处理CORS、文件上传、日志记录等
- **API优先设计**: 前端通过fetch API与后端通信，JSON格式数据交换
- **响应式设计**: 移动优先的设计理念，适配多种屏幕尺寸

### Testing Strategy
- **API测试**: 使用Node.js原生测试脚本验证后端接口功能
- **手动测试**: 通过HTML页面进行功能性和用户体验测试
- **文件上传测试**: 测试图片格式验证、文件大小限制、Base64编码处理
- **AI对话测试**: 验证GLM API集成、错误处理、响应时间
- **跨浏览器测试**: 支持Chrome、Firefox、Safari、Edge主流浏览器
- **响应式测试**: 测试不同屏幕尺寸下的界面适配
- **错误处理测试**: 验证网络错误、API限制、文件错误的用户提示

### Git Workflow
- **主分支**: main分支用于生产环境代码，保持稳定状态
- **开发分支**: develop分支用于集成新功能和bug修复
- **功能分支**: feature/功能名称 的分支用于开发新功能
- **修复分支**: fix/问题描述 的分支用于修复紧急bug
- **提交规范**:
  - feat: 新功能添加
  - fix: bug修复
  - docs: 文档更新
  - style: 代码格式调整
  - refactor: 代码重构
  - test: 测试相关
  - chore: 构建/工具链更新
- **提交消息格式**: type(scope): description，如 feat(ai): 添加GLM API集成

## Domain Context
- **AI教育领域**: 智能家教系统，支持个性化学习路径推荐
- **多模态AI**: 集成文本和图像理解能力，支持题目拍照识别
- **对话管理**: 支持多轮对话上下文，维护对话历史记录
- **知识图谱**: 学科知识点关联，智能推荐相关学习内容
- **学习分析**: 用户学习行为追踪，学习效果评估
- **中文教育**: 专注于中文教学场景，支持中文题目解析
- **学科覆盖**: 数学、物理、化学、语文、英语等主要学科
- **年龄段适配**: 支持小学到大学不同难度级别的内容
- **交互式学习**: Socratic对话式教学，引导式学习体验

## Important Constraints
- **API配额限制**: GLM API有调用频率和token数量限制，需要合理控制请求频率
- **响应时间要求**: API响应时间应控制在3秒以内，保证用户体验
- **文件大小限制**: 上传图片文件大小限制为10MB
- **文件格式限制**: 只支持常见图片格式(JPG, PNG, GIF, WebP)
- **数据隐私**: 用户上传文件和对话记录需要保护隐私，定期清理
- **浏览器兼容性**: 需要支持主流浏览器最新版本
- **网络依赖**: 系统完全依赖外部API服务，网络中断时核心功能不可用
- **教育内容合规**: AI生成内容需要符合教育法规，避免不当内容
- **成本控制**: API调用成本需要监控，避免过度使用

## External Dependencies
- **智谱AI GLM API**: 核心AI对话服务，支持文本和图像理解
  - 模型支持: glm-4, glm-4v, glm-4-plus, glm-4v-plus
  - API密钥: 需要安全配置，不可暴露在客户端
  - 接口地址: https://open.bigmodel.cn/api/paas/v4/chat/completions
- **CDN资源**:
  - Font Awesome 6.0: 图标库
  - Prism.js: 代码语法高亮引擎
  - Bootstrap 5: 响应式CSS框架
- **Node.js包管理**:
  - npm registry: 第三方依赖包下载
  - express: Web服务器框架
  - multer: 文件上传中间件
  - cors: 跨域资源共享
  - node-fetch: HTTP请求库
- **运行环境**:
  - Node.js >= 14.0.0: JavaScript运行时
  - 现代浏览器: 支持ES6+和Fetch API
