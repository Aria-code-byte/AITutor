# 用户界面模块设计文档

## Architecture Overview

用户界面模块采用组件化设计，使用原生JavaScript实现组件逻辑，CSS3实现响应式布局和动画效果。遵循BEM命名规范和移动优先的设计原则。

## CSS Architecture

### CSS Variables System
```css
:root {
  /* 主题色彩 */
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --secondary-color: #06b6d4;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;

  /* 中性色彩 */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;

  /* 深色主题 */
  --dark-bg-primary: #1f2937;
  --dark-bg-secondary: #111827;
  --dark-bg-tertiary: #374151;
  --dark-text-primary: #f9fafb;
  --dark-text-secondary: #d1d5db;
  --dark-text-tertiary: #9ca3af;
  --dark-border-color: #4b5563;

  /* 尺寸变量 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* 字体变量 */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* 阴影变量 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* 过渡变量 */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

### BEM Naming Convention
```css
/* Block */
.chat-message { }

/* Element */
.chat-message__content { }
.chat-message__timestamp { }
.chat-message__avatar { }

/* Modifier */
.chat-message--user { }
.chat-message--assistant { }
.chat-message--loading { }

/* Nested Elements */
.chat-message__content--code { }
.chat-message__content--image { }
```

### Component-Based CSS Structure
```css
/* ==========================================================================
   应用容器
   ========================================================================== */
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color var(--transition-base);
}

/* ==========================================================================
   侧边栏组件
   ========================================================================== */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  transition: transform var(--transition-base);
}

.sidebar--collapsed {
  transform: translateX(-100%);
}

.sidebar__header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.sidebar__title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--primary-color);
}

.sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.sidebar__footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

/* ==========================================================================
   聊天历史组件
   ========================================================================== */
.chat-history {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.chat-history__item {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--spacing-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.chat-history__item:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

.chat-history__item--active {
  background-color: var(--primary-color);
  color: white;
}

.chat-history__title {
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-history__preview {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-history__time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: var(--spacing-xs);
}
```

## JavaScript Component Architecture

### Base Component Class
```javascript
class Component {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = { ...this.defaultOptions, ...options };
    this.state = {};
    this.isInitialized = false;

    this.init();
  }

  get defaultOptions() {
    return {};
  }

  init() {
    if (this.isInitialized) return;

    this.createElements();
    this.bindEvents();
    this.render();
    this.isInitialized = true;
  }

  createElements() {
    // 子类实现
  }

  bindEvents() {
    // 子类实现
  }

  render() {
    // 子类实现
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  destroy() {
    this.removeEventListeners();
    this.element.innerHTML = '';
    this.isInitialized = false;
  }

  removeEventListeners() {
    // 子类实现
  }
}
```

### Sidebar Component
```javascript
class Sidebar extends Component {
  get defaultOptions() {
    return {
      collapsed: false,
      onToggle: () => {},
      onChatSelect: () => {},
      onNewChat: () => {}
    };
  }

  createElements() {
    this.element.innerHTML = `
      <div class="sidebar">
        <div class="sidebar__header">
          <h1 class="sidebar__title">
            <i class="fas fa-graduation-cap"></i>
            AI家教
          </h1>
          <button class="new-chat-btn" id="newChatBtn">
            <i class="fas fa-plus"></i>
            新对话
          </button>
        </div>

        <div class="chat-history" id="chatHistory">
          <!-- 对话历史将在这里显示 -->
        </div>

        <div class="sidebar__footer">
          <div class="user-info" id="userInfo" style="display: none;">
            <div class="user-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div class="user-details">
              <div class="user-name" id="userName">用户</div>
              <div class="logout-btn" id="logoutBtn">
                <i class="fas fa-sign-out-alt"></i>
                退出
              </div>
            </div>
          </div>

          <button class="theme-toggle" id="themeToggle">
            <i class="fas fa-moon" id="themeIcon"></i>
            <span id="themeText">深色模式</span>
          </button>

          <button class="knowledge-btn" id="knowledgeBtn">
            <i class="fas fa-book"></i>
            知识库
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 新对话按钮
    this.element.querySelector('#newChatBtn').addEventListener('click', () => {
      this.options.onNewChat();
    });

    // 主题切换
    this.element.querySelector('#themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // 退出登录
    this.element.querySelector('#logoutBtn').addEventListener('click', () => {
      this.handleLogout();
    });

    // 知识库按钮
    this.element.querySelector('#knowledgeBtn').addEventListener('click', () => {
      this.toggleKnowledgePanel();
    });
  }

  render() {
    const { collapsed } = this.state;
    const sidebar = this.element.querySelector('.sidebar');

    if (collapsed) {
      sidebar.classList.add('sidebar--collapsed');
    } else {
      sidebar.classList.remove('sidebar--collapsed');
    }
  }

  toggle() {
    const newCollapsed = !this.state.collapsed;
    this.setState({ collapsed: newCollapsed });
    this.options.onToggle(newCollapsed);
  }

  updateChatHistory(chats, currentChatId) {
    const chatHistoryElement = this.element.querySelector('#chatHistory');

    chatHistoryElement.innerHTML = chats.map(chat => `
      <div class="chat-history__item ${chat.id === currentChatId ? 'chat-history__item--active' : ''}"
           data-chat-id="${chat.id}">
        <div class="chat-history__title">${chat.title}</div>
        <div class="chat-history__preview">${this.getChatPreview(chat)}</div>
        <div class="chat-history__time">${this.formatTime(chat.updatedAt)}</div>
      </div>
    `).join('');

    // 绑定点击事件
    chatHistoryElement.querySelectorAll('.chat-history__item').forEach(item => {
      item.addEventListener('click', () => {
        const chatId = item.dataset.chatId;
        this.options.onChatSelect(chatId);
      });
    });
  }

  getChatPreview(chat) {
    if (chat.messages.length === 0) return '暂无消息';
    const lastMessage = chat.messages[chat.messages.length - 1];
    return lastMessage.content.substring(0, 50) + '...';
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString();
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const themeIcon = this.element.querySelector('#themeIcon');
    const themeText = this.element.querySelector('#themeText');

    if (newTheme === 'dark') {
      themeIcon.className = 'fas fa-sun';
      themeText.textContent = '浅色模式';
    } else {
      themeIcon.className = 'fas fa-moon';
      themeText.textContent = '深色模式';
    }
  }

  handleLogout() {
    if (confirm('确定要退出登录吗？')) {
      // 清理认证状态
      localStorage.removeItem('userSession');
      sessionStorage.removeItem('userSession');

      // 跳转到登录页
      window.location.href = 'login.html';
    }
  }

  toggleKnowledgePanel() {
    // 实现知识库面板切换逻辑
    console.log('Toggle knowledge panel');
  }
}
```

### MessageRenderer Component
```javascript
class MessageRenderer extends Component {
  get defaultOptions() {
    return {
      messages: [],
      onCopyCode: () => {},
      onViewImage: () => {}
    };
  }

  render() {
    const { messages } = this.options;

    this.element.innerHTML = messages.map(message =>
      this.renderMessage(message)
    ).join('');

    // 应用语法高亮
    if (window.Prism) {
      Prism.highlightAllUnder(this.element);
    }
  }

  renderMessage(message) {
    const messageClass = message.type === 'user' ? 'chat-message--user' : 'chat-message--assistant';

    return `
      <div class="chat-message ${messageClass}" data-message-id="${message.id}">
        <div class="chat-message__avatar">
          <i class="fas fa-${message.type === 'user' ? 'user' : 'robot'}"></i>
        </div>

        <div class="chat-message__content">
          ${this.renderMessageContent(message)}
          <div class="chat-message__meta">
            <span class="chat-message__time">${this.formatTime(message.timestamp)}</span>
            ${message.model ? `<span class="chat-message__model">${message.model}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderMessageContent(message) {
    if (message.image) {
      return this.renderImageMessage(message);
    }

    if (this.containsCode(message.content)) {
      return this.renderMarkdownMessage(message.content);
    }

    return `<div class="chat-message__text">${this.escapeHtml(message.content)}</div>`;
  }

  renderImageMessage(message) {
    return `
      <div class="chat-message__image-container">
        <img src="${message.image.url}"
             alt="${message.image.name || '用户上传的图片'}"
             class="chat-message__image"
             onclick="messageRenderer.onViewImage('${message.image.url}')">
        <div class="chat-message__text">${this.escapeHtml(message.content)}</div>
      </div>
    `;
  }

  renderMarkdownMessage(content) {
    // 简化的Markdown处理
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // 处理代码块
    html = html.replace(/```(\w+)?\n(.*?)\n```/gs, (match, language, code) => {
      const lang = language || 'text';
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

      return `
        <div class="code-block">
          <div class="code-block__header">
            <span class="code-block__language">${lang}</span>
            <button class="code-block__copy-btn" onclick="messageRenderer.copyCode('${codeId}')">
              <i class="fas fa-copy"></i>
              复制
            </button>
          </div>
          <pre class="line-numbers"><code id="${codeId}" class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>
        </div>
      `;
    });

    return `<div class="chat-message__text"><p>${html}</p></div>`;
  }

  containsCode(content) {
    return /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  copyCode(codeId) {
    const codeElement = document.getElementById(codeId);
    const text = codeElement.textContent;

    navigator.clipboard.writeText(text).then(() => {
      this.showCopyFeedback(codeId);
    }).catch(err => {
      console.error('复制失败:', err);
    });
  }

  showCopyFeedback(codeId) {
    const button = document.querySelector(`[onclick*="${codeId}"]`);
    const originalContent = button.innerHTML;

    button.innerHTML = '<i class="fas fa-check"></i> 已复制';
    button.classList.add('copied');

    setTimeout(() => {
      button.innerHTML = originalContent;
      button.classList.remove('copied');
    }, 2000);
  }
}
```

### Responsive Design Implementation
```css
/* ==========================================================================
   响应式设计
   ========================================================================== */

/* 平板设备 */
@media (max-width: 1024px) {
  .sidebar {
    width: 260px;
  }

  .toolbar {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .toolbar-left .model-selector {
    font-size: var(--font-size-sm);
  }
}

/* 手机设备 */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 280px;
    z-index: 1000;
    transform: translateX(-100%);
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  .sidebar-overlay--visible {
    display: block;
  }

  .main-content {
    width: 100%;
    margin-left: 0;
  }

  .toolbar {
    padding: var(--spacing-sm);
  }

  .toolbar-left {
    flex: 1;
  }

  .toolbar-right {
    gap: var(--spacing-xs);
  }

  .tool-btn {
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
  }

  .messages-container {
    padding: var(--spacing-sm);
  }

  .chat-message {
    gap: var(--spacing-sm);
  }

  .chat-message__content {
    max-width: 90%;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .sidebar {
    width: 100%;
  }

  .toolbar {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .toolbar-left {
    order: 2;
    width: 100%;
  }

  .toolbar-right {
    order: 1;
    width: 100%;
    justify-content: space-between;
  }

  .model-selector {
    width: 100%;
    margin-top: var(--spacing-xs);
  }

  .input-area {
    padding: var(--spacing-sm);
  }

  .input-container {
    gap: var(--spacing-xs);
  }

  .input-field {
    font-size: 16px; /* 防止iOS自动缩放 */
  }

  .send-btn {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}
```

### Animation and Transitions
```css
/* ==========================================================================
   动画效果
   ========================================================================== */

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.chat-message {
  animation: fadeIn 0.3s ease-out;
}

.chat-message--assistant {
  animation: slideIn 0.3s ease-out;
}

.loading-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

/* 主题切换动画 */
.app-container {
  transition: background-color var(--transition-base);
}

.sidebar {
  transition: transform var(--transition-base), background-color var(--transition-base);
}

/* 悬停效果 */
.btn {
  transition: all var(--transition-fast);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* 焦点状态 */
.btn:focus,
input:focus,
textarea:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  transition: outline-color var(--transition-fast);
}

/* 消息输入动画 */
.input-field {
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.input-field:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}
```

## Accessibility Implementation

### ARIA Labels and Roles
```javascript
class AccessibilityManager {
  static addAriaAttributes() {
    // 主导航
    const sidebar = document.querySelector('.sidebar');
    sidebar.setAttribute('role', 'navigation');
    sidebar.setAttribute('aria-label', '主要导航');

    // 对话历史
    const chatHistory = document.querySelector('#chatHistory');
    chatHistory.setAttribute('role', 'list');
    chatHistory.setAttribute('aria-label', '对话历史');

    // 消息容器
    const messagesContainer = document.querySelector('#messagesContainer');
    messagesContainer.setAttribute('role', 'main');
    messagesContainer.setAttribute('aria-label', '对话内容');
    messagesContainer.setAttribute('aria-live', 'polite');

    // 输入区域
    const inputField = document.querySelector('#messageInput');
    inputField.setAttribute('aria-label', '输入消息');
    inputField.setAttribute('aria-describedby', 'input-help');

    // 工具栏
    const toolbar = document.querySelector('.toolbar');
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', '工具栏');

    // 添加帮助文本
    const helpText = document.createElement('div');
    helpText.id = 'input-help';
    helpText.className = 'sr-only';
    helpText.textContent = '输入消息后按Enter发送，Shift+Enter换行';
    inputField.parentNode.appendChild(helpText);
  }

  static addKeyboardNavigation() {
    // Tab键导航顺序
    const focusableElements = [
      '.new-chat-btn',
      '.chat-history__item',
      '.model-selector',
      '.tool-btn',
      '.message-input',
      '.send-btn',
      '.theme-toggle',
      '.logout-btn'
    ];

    focusableElements.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.setAttribute('tabindex', '0');
      });
    });

    // 快捷键支持
    document.addEventListener('keydown', (event) => {
      // Ctrl+B: 切换侧边栏
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }

      // Ctrl+N: 新对话
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        createNewChat();
      }

      // Ctrl+/: 显示帮助
      if (event.ctrlKey && event.key === '/') {
        event.preventDefault();
        showHelp();
      }
    });
  }

  static addScreenReaderSupport() {
    // 消息状态变化时通知屏幕阅读器
    const announceMessage = (message) => {
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = message;

      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    };

    // 监听消息发送
    window.addEventListener('messageSent', (event) => {
      announceMessage('消息已发送');
    });

    // 监听消息接收
    window.addEventListener('messageReceived', (event) => {
      announceMessage('收到新回复');
    });

    // 监听错误
    window.addEventListener('error', (event) => {
      announceMessage(`发生错误：${event.message}`);
    });
  }
}
```

## Performance Optimization

### CSS Optimization
```css
/* 使用will-change优化动画性能 */
.chat-message {
  will-change: transform, opacity;
}

.btn {
  will-change: transform, box-shadow;
}

/* 使用contain优化布局 */
.messages-container {
  contain: layout style paint;
}

.sidebar {
  contain: layout style;
}

/* GPU加速 */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* 减少重绘和重排 */
.optimized-layout {
  contain: strict;
}
```

### JavaScript Performance
```javascript
class PerformanceOptimizer {
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static optimizeScroll() {
    const messagesContainer = document.querySelector('#messagesContainer');
    let isScrolling = false;

    messagesContainer.addEventListener('scroll', this.throttle(() => {
      if (!isScrolling) {
        window.requestAnimationFrame(() => {
          // 处理滚动相关的UI更新
          this.updateScrollPosition();
          isScrolling = false;
        });
        isScrolling = true;
      }
    }, 16)); // 60fps
  }

  static lazyLoadImages() {
    const images = document.querySelectorAll('.chat-message__image[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  static virtualScrolling() {
    // 实现消息虚拟滚动，优化大量消息的性能
    class VirtualScroller {
      constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.scrollTop = 0;

        this.setupScrollListener();
      }

      render(items) {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleItems, items.length);

        // 清空容器
        this.container.innerHTML = '';

        // 渲染可见项目
        for (let i = startIndex; i < endIndex; i++) {
          const item = this.renderItem(items[i], i);
          item.style.position = 'absolute';
          item.style.top = `${i * this.itemHeight}px`;
          this.container.appendChild(item);
        }

        // 更新容器高度
        this.container.style.height = `${items.length * this.itemHeight}px`;
      }

      setupScrollListener() {
        this.container.addEventListener('scroll',
          this.throttle(() => {
            this.scrollTop = this.container.scrollTop;
            // 触发重新渲染
            this.onScroll();
          }, 16)
        );
      }

      onScroll() {
        // 子类实现具体的滚动处理逻辑
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests
- 组件渲染测试
- 事件处理测试
- 状态管理测试
- 可访问性测试

### Integration Tests
- 组件间交互测试
- 响应式布局测试
- 主题切换测试
- 键盘导航测试

### Visual Tests
- 截图对比测试
- 跨浏览器兼容性测试
- 不同屏幕尺寸测试
- 主题一致性测试

### Performance Tests
- 渲染性能测试
- 滚动性能测试
- 内存使用测试
- 动画流畅度测试

### Accessibility Tests
- 键盘导航测试
- 屏幕阅读器测试
- 对比度测试
- ARIA标签测试