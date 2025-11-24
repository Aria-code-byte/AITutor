// 四模块导航系统
class ModuleNavigation {
    constructor() {
        this.currentModule = 'chat';
        this.modules = {
            chat: { name: '对话', icon: 'fas fa-comments', container: 'chatContainer' },
            favorites: { name: '收藏', icon: 'fas fa-star', container: 'favoritesContainer' },
            knowledge: { name: '知识库', icon: 'fas fa-book', container: 'knowledgeContainer' },
            learning: { name: '学习助手', icon: 'fas fa-graduation-cap', container: 'learningContainer' }
        };

        this.initialize();
    }

    // 初始化导航系统
    initialize() {
        this.createNavigation();
        this.bindEvents();
        this.switchModule(this.currentModule);
    }

    // 创建导航栏
    createNavigation() {
        // 查找或创建导航栏容器
        let navigation = document.querySelector('.module-navigation');
        if (!navigation) {
            navigation = document.createElement('nav');
            navigation.className = 'module-navigation';

            // 插入到侧边栏底部或主容器顶部
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                const sidebarFooter = sidebar.querySelector('.sidebar-footer');
                if (sidebarFooter) {
                    sidebar.insertBefore(navigation, sidebarFooter);
                } else {
                    sidebar.appendChild(navigation);
                }
            } else {
                // 如果没有侧边栏，添加到主容器顶部
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.insertBefore(navigation, appContainer.firstChild);
                }
            }
        }

        // 创建导航按钮
        navigation.innerHTML = `
            <div class="nav-title">
                <i class="fas fa-th-large"></i>
                <span>功能模块</span>
            </div>
            <div class="nav-buttons">
                ${Object.entries(this.modules).map(([key, module]) => `
                    <button class="nav-btn ${key === this.currentModule ? 'active' : ''}"
                            data-module="${key}"
                            title="${module.name}">
                        <i class="${module.icon}"></i>
                        <span>${module.name}</span>
                        ${key === 'favorites' ? '<span class="nav-badge" id="favoritesBadge">0</span>' : ''}
                    </button>
                `).join('')}
            </div>
            <div class="nav-divider"></div>
        `;

        // 创建模块容器（如果不存在）
        this.createModuleContainers();
    }

    // 创建模块容器
    createModuleContainers() {
        // 不创建新的容器，直接使用现有的 main-content 结构
        // 确保现有的对话界面元素存在
        const messagesContainer = document.getElementById('messagesContainer');
        const inputContainer = document.querySelector('.input-container');
        const toolbar = document.querySelector('.toolbar');

        if (messagesContainer) {
            messagesContainer.style.display = 'flex';
        }
        if (inputContainer) {
            inputContainer.style.display = 'block';
        }
        if (toolbar) {
            toolbar.style.display = 'flex';
        }
    }

    // 绑定事件
    bindEvents() {
        // 导航按钮点击事件
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.currentTarget.getAttribute('data-module');
                this.switchModule(module);
            });
        });

        // 快捷键支持
        document.addEventListener('keydown', (e) => {
            // Alt + 数字键快速切换模块
            if (e.altKey) {
                const moduleKeys = {
                    '1': 'chat',
                    '2': 'favorites',
                    '3': 'knowledge',
                    '4': 'learning'
                };

                if (moduleKeys[e.key]) {
                    e.preventDefault();
                    this.switchModule(moduleKeys[e.key]);
                }
            }
        });

        // 监听窗口大小变化，调整导航栏布局
        window.addEventListener('resize', () => {
            this.adjustNavigationLayout();
        });

        this.adjustNavigationLayout();
    }

    // 调整导航栏布局
    adjustNavigationLayout() {
        const navigation = document.querySelector('.module-navigation');
        if (!navigation) return;

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            navigation.classList.add('mobile');
        } else {
            navigation.classList.remove('mobile');
        }
    }

    // 切换模块
    switchModule(moduleName) {
        if (!this.modules[moduleName] || moduleName === this.currentModule) {
            return;
        }

        // 隐藏当前模块
        this.hideModule(this.currentModule);

        // 显示目标模块
        this.showModule(moduleName);

        // 更新导航状态
        this.updateNavigationState(moduleName);

        // 更新当前模块
        this.currentModule = moduleName;

        // 触发模块切换事件
        this.onModuleSwitch(moduleName);

        // 更新URL hash
        this.updateURLHash(moduleName);
    }

    // 隐藏模块
    hideModule(moduleName) {
        const mainContent = document.querySelector('.main-content');
        const messagesContainer = document.getElementById('messagesContainer');
        const inputContainer = document.querySelector('.input-container');
        const toolbar = document.querySelector('.toolbar');

        if (mainContent) {
            mainContent.style.display = 'none';
        }

        // 触发模块隐藏事件
        const event = new CustomEvent('moduleHide', { detail: { module: moduleName } });
        document.dispatchEvent(event);
    }

    // 显示模块
    showModule(moduleName) {
        const mainContent = document.querySelector('.main-content');
        const messagesContainer = document.getElementById('messagesContainer');
        const inputContainer = document.querySelector('.input-container');
        const toolbar = document.querySelector('.toolbar');

        if (mainContent) {
            mainContent.style.display = 'flex';
            mainContent.style.flexDirection = 'column';
        }

        switch (moduleName) {
            case 'chat':
                // 显示聊天界面
                if (messagesContainer) messagesContainer.style.display = 'flex';
                if (inputContainer) inputContainer.style.display = 'block';
                if (toolbar) toolbar.style.display = 'flex';
                this.clearModuleContent();
                break;

            case 'favorites':
                // 显示收藏模块
                if (messagesContainer) messagesContainer.style.display = 'flex';
                if (inputContainer) inputContainer.style.display = 'none';
                if (toolbar) toolbar.style.display = 'flex';
                this.showFavoritesContent();
                break;

            case 'knowledge':
                // 显示知识库模块
                if (messagesContainer) messagesContainer.style.display = 'flex';
                if (inputContainer) inputContainer.style.display = 'none';
                if (toolbar) toolbar.style.display = 'flex';
                this.showKnowledgeContent();
                break;

            case 'learning':
                // 显示学习助手模块
                if (messagesContainer) messagesContainer.style.display = 'flex';
                if (inputContainer) inputContainer.style.display = 'none';
                if (toolbar) toolbar.style.display = 'flex';
                this.showLearningContent();
                break;
        }

        // 触发模块显示事件
        const event = new CustomEvent('moduleShow', { detail: { module: moduleName } });
        document.dispatchEvent(event);
    }

    // 清空模块内容
    clearModuleContent() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            // 检查是否有真实的消息内容（不是欢迎界面）
            const hasRealMessages = messagesContainer.querySelector('.message, .user-message, .ai-message');
            if (!hasRealMessages) {
                // 恢复默认的欢迎界面
                messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-content">
                            <i class="fas fa-robot"></i>
                            <h2>欢迎使用AI家教</h2>
                            <p>我是您的智能学习助手，可以回答问题、解析图片、阅读文档</p>
                            <div class="feature-grid">
                                <div class="feature-card">
                                    <i class="fas fa-comments"></i>
                                    <h3>智能对话</h3>
                                    <p>支持多轮对话，上下文理解</p>
                                </div>
                                <div class="feature-card">
                                    <i class="fas fa-image"></i>
                                    <h3>图片识别</h3>
                                    <p>上传图片进行OCR和内容分析</p>
                                </div>
                                <div class="feature-card">
                                    <i class="fas fa-file-pdf"></i>
                                    <h3>文档解析</h3>
                                    <p>支持PDF、Word、PPT文档阅读</p>
                                </div>
                                <div class="feature-card">
                                    <i class="fas fa-bookmark"></i>
                                    <h3>知识收藏</h3>
                                    <p>收藏重要知识点，建立知识库</p>
                                </div>
                            </div>

                            <!-- 快捷键提示 -->
                            <div class="shortcuts-hint">
                                <h3><i class="fas fa-keyboard"></i> 快捷键</h3>
                                <div class="shortcut-list">
                                    <div class="shortcut-item">
                                        <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                                        <span>发送消息</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Shift</kbd> + <kbd>Enter</kbd>
                                        <span>换行输入</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>/</kbd>
                                        <span>显示命令帮助</span>
                                    </div>
                                    <div class="shortcut-item">
                                        <kbd>Esc</kbd>
                                        <span>取消输入</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    // 显示收藏内容
    showFavoritesContent() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            // 确保右侧知识库面板是隐藏的
            const knowledgePanel = document.getElementById('knowledgePanel');
            if (knowledgePanel) {
                knowledgePanel.style.display = 'none';
            }

            // 如果favoritesModule存在，使用它来创建完整的UI
            if (typeof favoritesModule !== 'undefined') {
                // 创建收藏模块的完整UI结构
                messagesContainer.innerHTML = favoritesModule.createFavoritesUI();

                // 绑定事件监听器
                favoritesModule.bindEvents();

                // 加载收藏数据
                setTimeout(() => {
                    favoritesModule.loadFavorites();
                    this.updateFavoritesBadge();
                }, 100);
            } else {
                // 如果favoritesModule不存在，显示简单提示
                messagesContainer.innerHTML = `
                    <div class="favorites-header">
                        <h3><i class="fas fa-star"></i> 我的收藏</h3>
                        <div class="favorites-stats">
                            <span>收藏模块加载中...</span>
                        </div>
                    </div>
                    <div class="favorites-content">
                        <div class="loading-placeholder">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>正在初始化收藏模块...</span>
                        </div>
                    </div>
                `;
            }
        }
    }

    // 显示知识库内容
    showKnowledgeContent() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="knowledge-header">
                    <h3><i class="fas fa-book"></i> 知识库</h3>
                    <div class="knowledge-actions">
                        <button class="btn btn-primary" onclick="addKnowledge()">
                            <i class="fas fa-plus"></i> 添加知识
                        </button>
                    </div>
                </div>
                <div class="knowledge-content">
                    <div class="knowledge-placeholder">
                        <i class="fas fa-book-open"></i>
                        <h3>知识库功能</h3>
                        <p>此功能正在开发中，敬请期待...</p>
                        <div class="knowledge-features">
                            <div class="feature-item">
                                <i class="fas fa-folder"></i>
                                <span>分类管理</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-search"></i>
                                <span>智能搜索</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-tags"></i>
                                <span>标签系统</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // 显示学习助手内容
    showLearningContent() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="learning-header">
                    <h3><i class="fas fa-graduation-cap"></i> 学习助手</h3>
                </div>
                <div class="learning-content">
                    <div class="learning-placeholder">
                        <i class="fas fa-brain"></i>
                        <h3>智能学习助手</h3>
                        <p>此功能正在开发中，敬请期待...</p>
                        <div class="learning-features">
                            <div class="feature-item">
                                <i class="fas fa-chart-line"></i>
                                <span>学习曲线分析</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-lightbulb"></i>
                                <span>费曼学习法</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-calendar-check"></i>
                                <span>学习计划制定</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-trophy"></i>
                                <span>进度跟踪</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // 更新导航状态
    updateNavigationState(moduleName) {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            const btnModule = btn.getAttribute('data-module');
            if (btnModule === moduleName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // 模块切换回调
    onModuleSwitch(moduleName) {
        console.log(`切换到模块: ${this.modules[moduleName].name}`);

        // 更新页面标题
        document.title = `${this.modules[moduleName].name} - AI家教`;

        // 可以在这里添加其他模块切换逻辑
        switch (moduleName) {
            case 'chat':
                this.onChatModuleActivate();
                break;
            case 'favorites':
                this.onFavoritesModuleActivate();
                break;
            case 'knowledge':
                this.onKnowledgeModuleActivate();
                break;
            case 'learning':
                this.onLearningModuleActivate();
                break;
        }
    }

    // 对话模块激活回调
    onChatModuleActivate() {
        // 聚焦到输入框
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            setTimeout(() => messageInput.focus(), 100);
        }
    }

    // 收藏模块激活回调
    onFavoritesModuleActivate() {
        // 收藏模块已在上面的showModule中处理
    }

    // 知识库模块激活回调
    onKnowledgeModuleActivate() {
        // TODO: 实现知识库模块激活逻辑
        console.log('知识库模块激活');
    }

    // 学习助手模块激活回调
    onLearningModuleActivate() {
        // TODO: 实现学习助手模块激活逻辑
        console.log('学习助手模块激活');
    }

    // 更新URL hash
    updateURLHash(moduleName) {
        const newHash = `#${moduleName}`;
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
        }
    }

    // 从URL hash获取模块
    getModuleFromHash() {
        const hash = window.location.hash.substring(1);
        return this.modules[hash] ? hash : 'chat';
    }

    // 更新收藏徽章
    updateFavoritesBadge() {
        const badge = document.getElementById('favoritesBadge');
        if (!badge) return;

        // 这里应该从实际的收藏数据中获取数量
        // 暂时使用localStorage中的数据
        const favoriteCount = localStorage.getItem('favoritesCount') || '0';

        badge.textContent = favoriteCount;
        badge.style.display = favoriteCount > '0' ? 'inline-block' : 'none';
    }

    // 设置收藏徽章数量
    setFavoritesBadge(count) {
        localStorage.setItem('favoritesCount', count.toString());
        this.updateFavoritesBadge();
    }

    // 增加收藏徽章数量
    incrementFavoritesBadge() {
        const currentCount = parseInt(localStorage.getItem('favoritesCount') || '0');
        this.setFavoritesBadge(currentCount + 1);
    }

    // 减少收藏徽章数量
    decrementFavoritesBadge() {
        const currentCount = parseInt(localStorage.getItem('favoritesCount') || '0');
        this.setFavoritesBadge(Math.max(0, currentCount - 1));
    }

    // 获取当前模块
    getCurrentModule() {
        return this.currentModule;
    }

    // 获取模块信息
    getModuleInfo(moduleName) {
        return this.modules[moduleName];
    }

    // 检查模块是否存在
    hasModule(moduleName) {
        return !!this.modules[moduleName];
    }

    // 添加新模块
    addModule(moduleKey, moduleInfo) {
        if (this.modules[moduleKey]) {
            console.warn(`模块 ${moduleKey} 已存在`);
            return false;
        }

        this.modules[moduleKey] = moduleInfo;

        // 重新创建导航栏
        this.createNavigation();
        this.bindEvents();

        return true;
    }

    // 移除模块
    removeModule(moduleKey) {
        if (!this.modules[moduleKey]) {
            console.warn(`模块 ${moduleKey} 不存在`);
            return false;
        }

        delete this.modules[moduleKey];

        // 如果当前正在显示被删除的模块，切换到对话模块
        if (this.currentModule === moduleKey) {
            this.switchModule('chat');
        }

        // 重新创建导航栏
        this.createNavigation();
        this.bindEvents();

        return true;
    }

    // 销毁导航系统
    destroy() {
        const navigation = document.querySelector('.module-navigation');
        if (navigation) {
            navigation.remove();
        }

        // 移除事件监听器
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.adjustNavigationLayout);
    }
}

// 全局函数，供HTML中使用
function switchToModule(moduleName) {
    if (typeof moduleNavigation !== 'undefined') {
        moduleNavigation.switchModule(moduleName);
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleNavigation;
}