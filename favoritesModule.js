// 收藏模块界面组件
class FavoritesModule {
    constructor(conversationManager) {
        this.conversationManager = conversationManager;
        this.favorites = [];
        this.categories = [];
        this.currentView = 'grid'; // grid or list
        this.currentCategory = 'all';
        this.currentTags = [];
        this.searchQuery = '';

        this.initialize();
    }

    // 初始化
    initialize() {
        // 不再自动创建UI，由模块导航系统控制
        // 只加载数据
        this.loadCategories();
        this.loadFavorites();
    }

    // 创建收藏模块UI
    createFavoritesUI() {
        return `
            <!-- 收藏模块头部 -->
            <div class="favorites-header">
                <h2><i class="fas fa-star"></i> 我的收藏</h2>
                <div class="favorites-controls">
                    <div class="search-box">
                        <input type="text" id="favoritesSearch" placeholder="搜索收藏内容...">
                        <button id="favoritesSearchBtn"><i class="fas fa-search"></i></button>
                    </div>
                    <div class="view-toggle">
                        <button id="gridViewBtn" class="active"><i class="fas fa-th"></i></button>
                        <button id="listViewBtn"><i class="fas fa-list"></i></button>
                    </div>
                </div>
            </div>

            <!-- 分类和标签过滤器 -->
            <div class="favorites-filters">
                <div class="category-filter">
                    <label>分类:</label>
                    <select id="categorySelect">
                        <option value="all">全部分类</option>
                    </select>
                </div>
                <div class="tag-filter">
                    <label>标签:</label>
                    <div id="tagContainer" class="tag-container">
                        <!-- 标签将动态添加 -->
                    </div>
                </div>
            </div>

            <!-- 收藏统计信息 -->
            <div class="favorites-stats">
                <div class="stat-item">
                    <span class="stat-value" id="totalCount">0</span>
                    <span class="stat-label">总收藏</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="categoryCount">0</span>
                    <span class="stat-label">分类</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="recentCount">0</span>
                    <span class="stat-label">本周新增</span>
                </div>
            </div>

            <!-- 收藏内容区域 -->
            <div class="favorites-content">
                <div id="favoritesGrid" class="favorites-grid">
                    <!-- 收藏项将动态添加 -->
                </div>
                <div id="favoritesList" class="favorites-list" style="display: none;">
                    <!-- 列表视图将动态添加 -->
                </div>
            </div>

            <!-- 加载更多按钮 -->
            <div class="load-more-container">
                <button id="loadMoreFavorites" class="load-more-btn" style="display: none;">
                    加载更多
                </button>
            </div>

            <!-- 空状态 -->
            <div id="emptyFavorites" class="empty-state" style="display: none;">
                <i class="far fa-star"></i>
                <h3>还没有收藏内容</h3>
                <p>在对话中点击星星按钮来收藏重要的对话内容</p>
                <button onclick="switchToModule('chat')" class="primary-btn">
                    开始对话
                </button>
            </div>
        `;
    }

    // 绑定事件
    bindEvents() {
        // 搜索功能
        const searchInput = document.getElementById('favoritesSearch');
        const searchBtn = document.getElementById('favoritesSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                } else {
                    this.handleSearchChange();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // 视图切换
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.switchView('grid'));
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this.switchView('list'));
        }

        // 分类过滤
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                this.currentCategory = categorySelect.value;
                this.applyFilters();
            });
        }

        // 加载更多
        const loadMoreBtn = document.getElementById('loadMoreFavorites');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreFavorites());
        }
    }

    // 加载分类
    async loadCategories() {
        this.categories = await this.conversationManager.getFavoriteCategories();
        this.populateCategorySelect();
        this.updateStats();
    }

    // 填充分类选择器
    populateCategorySelect() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect) return;

        // 清空现有选项（保留"全部分类"）
        while (categorySelect.children.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }

        // 添加分类选项
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    // 加载收藏内容
    async loadFavorites() {
        this.favorites = await this.conversationManager.getUserFavorites();
        this.renderFavorites();
        this.updateStats();
    }

    // 处理搜索
    handleSearch() {
        const searchInput = document.getElementById('favoritesSearch');
        this.searchQuery = searchInput.value.trim();

        if (this.searchQuery) {
            this.searchFavorites();
        } else {
            this.loadFavorites();
        }
    }

    // 处理搜索变化（防抖）
    handleSearchChange() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.handleSearch();
        }, 300);
    }

    // 搜索收藏
    async searchFavorites() {
        if (!this.searchQuery) {
            this.loadFavorites();
            return;
        }

        const results = await this.conversationManager.searchFavorites(this.searchQuery);
        this.favorites = results;
        this.renderFavorites();
    }

    // 应用过滤器
    applyFilters() {
        // 重新加载收藏内容
        this.loadFavorites();
    }

    // 切换视图
    switchView(viewType) {
        this.currentView = viewType;

        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        const gridView = document.getElementById('favoritesGrid');
        const listView = document.getElementById('favoritesList');

        // 更新按钮状态
        if (gridBtn && listBtn) {
            gridBtn.classList.toggle('active', viewType === 'grid');
            listBtn.classList.toggle('active', viewType === 'list');
        }

        // 切换视图
        if (gridView && listView) {
            gridView.style.display = viewType === 'grid' ? 'grid' : 'none';
            listView.style.display = viewType === 'list' ? 'block' : 'none';
        }

        // 重新渲染
        this.renderFavorites();
    }

    // 渲染收藏内容
    renderFavorites() {
        const gridContainer = document.getElementById('favoritesGrid');
        const listContainer = document.getElementById('favoritesList');
        const emptyState = document.getElementById('emptyFavorites');
        const totalCount = document.getElementById('totalCount');

        // 如果找不到容器元素，说明UI还没有被创建
        if (!gridContainer || !listContainer || !emptyState) {
            console.warn('收藏模块容器未找到，尝试重新创建UI');
            return;
        }

        // 更新总数统计
        if (totalCount) {
            totalCount.textContent = this.favorites.length;
        }

        // 清空现有内容
        gridContainer.innerHTML = '';
        listContainer.innerHTML = '';

        if (this.favorites.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        // 渲染收藏项
        this.favorites.forEach((favorite, index) => {
            const cardElement = this.createFavoriteCard(favorite);

            if (this.currentView === 'grid') {
                gridContainer.appendChild(cardElement);
            } else {
                const listItemElement = this.createFavoriteListItem(favorite);
                listContainer.appendChild(listItemElement);
            }
        });
    }

    // 创建收藏卡片（网格视图）
    createFavoriteCard(favorite) {
        const card = document.createElement('div');
        card.className = 'favorite-card';
        card.setAttribute('data-favorite-id', favorite.id);

        const round = favorite.conversationRound;
        const previewText = this.getPreviewText(round);
        const formattedTime = this.formatTime(favorite.timestamp);

        card.innerHTML = `
            <div class="favorite-header">
                <div class="favorite-meta">
                    <span class="favorite-category">${favorite.category}</span>
                    <span class="favorite-time">${formattedTime}</span>
                </div>
                <div class="favorite-actions">
                    <button class="action-btn remove-btn" onclick="favoritesModule.removeFavorite('${favorite.id}')" title="移除收藏">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="favoritesModule.editFavorite('${favorite.id}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>

            <div class="favorite-content">
                <div class="conversation-preview">
                    <div class="user-message">
                        <i class="fas fa-user"></i>
                        <span>${previewText.userMessage}</span>
                    </div>
                    <div class="ai-response">
                        <i class="fas fa-robot"></i>
                        <span>${previewText.aiResponse}</span>
                    </div>
                </div>

                ${favorite.notes ? `<div class="favorite-notes">${favorite.notes}</div>` : ''}

                ${favorite.tags && favorite.tags.length > 0 ? `
                    <div class="favorite-tags">
                        ${favorite.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="favorite-footer">
                <button class="view-conversation-btn" onclick="favoritesModule.viewConversation('${favorite.roundId}')">
                    <i class="fas fa-comments"></i> 查看完整对话
                </button>
            </div>
        `;

        return card;
    }

    // 创建收藏项（列表视图）
    createFavoriteListItem(favorite) {
        const item = document.createElement('div');
        item.className = 'favorite-list-item';
        item.setAttribute('data-favorite-id', favorite.id);

        const round = favorite.conversationRound;
        const previewText = this.getPreviewText(round);
        const formattedTime = this.formatTime(favorite.timestamp);

        item.innerHTML = `
            <div class="favorite-list-header">
                <div class="favorite-list-meta">
                    <span class="favorite-category">${favorite.category}</span>
                    <span class="favorite-time">${formattedTime}</span>
                </div>
                <div class="favorite-list-actions">
                    <button class="action-btn" onclick="favoritesModule.removeFavorite('${favorite.id}')" title="移除收藏">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>

            <div class="favorite-list-content">
                <div class="conversation-preview">
                    <div class="user-message">
                        <strong>用户:</strong> ${previewText.userMessage}
                    </div>
                    <div class="ai-response">
                        <strong>AI:</strong> ${previewText.aiResponse}
                    </div>
                </div>

                ${favorite.notes ? `<div class="favorite-notes"><strong>笔记:</strong> ${favorite.notes}</div>` : ''}
            </div>
        `;

        return item;
    }

    // 获取预览文本
    getPreviewText(round) {
        const maxLength = 100;

        let userMessage = '';
        let aiResponse = '';

        if (round && round.userMessage) {
            userMessage = round.userMessage.text || '';
        }

        if (round && round.aiResponse) {
            aiResponse = round.aiResponse.text || '';
        }

        return {
            userMessage: userMessage.length > maxLength ?
                userMessage.substring(0, maxLength) + '...' : userMessage,
            aiResponse: aiResponse.length > maxLength ?
                aiResponse.substring(0, maxLength) + '...' : aiResponse
        };
    }

    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 24小时内
            return Math.floor(diff / 3600000) + '小时前';
        } else if (diff < 604800000) { // 7天内
            return Math.floor(diff / 86400000) + '天前';
        } else {
            return date.toLocaleDateString();
        }
    }

    // 更新统计信息
    updateStats() {
        const totalCount = document.getElementById('totalCount');
        const categoryCount = document.getElementById('categoryCount');
        const recentCount = document.getElementById('recentCount');

        if (totalCount) totalCount.textContent = this.favorites.length;
        if (categoryCount) categoryCount.textContent = this.categories.length;

        // 计算本周新增
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentFavorites = this.favorites.filter(fav => fav.timestamp > weekAgo);
        if (recentCount) recentCount.textContent = recentFavorites.length;
    }

    // 移除收藏
    async removeFavorite(favoriteId) {
        if (!confirm('确定要移除这个收藏吗？')) {
            return;
        }

        const favorite = this.favorites.find(fav => fav.id === favoriteId);
        if (!favorite) return;

        const success = await this.conversationManager.removeFavorite(favorite.roundId, favoriteId);

        if (success) {
            // 从本地列表中移除
            this.favorites = this.favorites.filter(fav => fav.id !== favoriteId);

            // 重新渲染
            this.renderFavorites();
            this.updateStats();
        }
    }

    // 编辑收藏
    editFavorite(favoriteId) {
        // 这里可以实现编辑收藏的对话框
        console.log('编辑收藏:', favoriteId);
        // TODO: 实现编辑功能
    }

    // 查看完整对话
    viewConversation(roundId) {
        // 切换到对话模块并显示特定对话
        if (typeof switchToModule === 'function') {
            switchToModule('chat');
        }

        // 加载并显示特定对话
        this.loadConversationInChat(roundId);
    }

    // 在对话模块中加载特定对话
    async loadConversationInChat(roundId) {
        try {
            const round = await this.conversationManager.getConversationRound(roundId);
            if (round) {
                // 清空当前对话
                if (typeof clearCurrentChat === 'function') {
                    clearCurrentChat();
                }

                // 显示对话内容
                if (typeof displayConversationRound === 'function') {
                    displayConversationRound(round);
                }
            }
        } catch (error) {
            console.error('加载对话失败:', error);
        }
    }

    // 显示收藏模块
    show() {
        // 确保右侧面板是隐藏的
        const knowledgePanel = document.getElementById('knowledgePanel');
        if (knowledgePanel) {
            knowledgePanel.style.display = 'none';
        }

        // 不再依赖固定的容器，只是刷新数据
        this.loadFavorites();
    }

    // 隐藏收藏模块
    hide() {
        // 现在不需要隐藏容器，因为模块导航系统会控制显示
        // 可以在这里做一些清理工作
    }

    // 刷新数据
    refresh() {
        this.loadCategories();
        this.loadFavorites();
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FavoritesModule;
}