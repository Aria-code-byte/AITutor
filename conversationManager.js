// 对话轮次和收藏管理模块

// 后端API配置 - 使用全局定义的BACKEND_URL
// 注意：BACKEND_URL已在script.js中定义

class ConversationManager {
    constructor() {
        this.currentUserId = this.getUserId();
        this.currentChatId = null;
        this.favorites = new Map(); // 缓存收藏状态
        this.conversationRounds = []; // 当前对话的轮次
        this.isGenerating = false;

        this.initialize();
    }

    // 初始化
    initialize() {
        // 延迟加载，避免循环依赖
        setTimeout(() => {
            this.loadConversationRounds();
            this.loadFavoriteStatuses();
        }, 100);
    }

    // 获取用户ID
    getUserId() {
        // 从认证管理器获取用户ID，或使用默认ID
        if (typeof authManager !== 'undefined' && authManager.isLoggedIn()) {
            const user = authManager.getCurrentUser();
            return user ? user.id || user.username : 'default_user';
        }
        return 'default_user';
    }

    // ==================== 对话轮次管理 ====================

    // 保存对话轮次
    async saveConversationRound(userMessage, aiResponse, model = 'glm-4', imageFiles = []) {
        try {
            const roundData = {
                userId: this.currentUserId,
                chatId: this.currentChatId || this.generateChatId(),
                userMessage: {
                    text: userMessage.text || userMessage,
                    timestamp: Date.now(),
                    imageFiles: imageFiles
                },
                aiResponse: {
                    text: aiResponse,
                    timestamp: Date.now(),
                    model: model
                },
                model: model,
                imageFiles: imageFiles,
                metadata: {
                    duration: 0, // 可以根据需要计算
                    tokensUsed: 0, // 可以从API响应中获取
                    rating: null
                }
            };

            const response = await fetch(`${BACKEND_URL}/api/conversation-rounds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roundData)
            });

            if (response.ok) {
                const result = await response.json();
                const roundId = result.roundId;

                // 添加到本地缓存
                const round = { ...roundData, id: roundId };
                this.conversationRounds.push(round);

                // 检查是否已收藏
                const isFavorited = await this.checkIfFavorited(roundId);
                this.favorites.set(roundId, isFavorited);

                // 更新UI
                this.updateRoundInUI(round, isFavorited);

                return roundId;
            } else {
                throw new Error('保存对话轮次失败');
            }
        } catch (error) {
            console.error('保存对话轮次失败:', error);
            return null;
        }
    }

    // 加载对话轮次
    async loadConversationRounds(chatId = null) {
        try {
            let url = `${BACKEND_URL}/api/conversation-rounds?userId=${this.currentUserId}`;
            if (chatId) {
                url += `&chatId=${chatId}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const result = await response.json();
                this.conversationRounds = result.rounds || [];

                // 加载收藏状态
                await this.loadFavoriteStatuses();

                return this.conversationRounds;
            }
        } catch (error) {
            console.error('加载对话轮次失败:', error);
        }
        return [];
    }

    // 获取对话轮次
    async getConversationRound(roundId) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/conversation-rounds/${roundId}`);
            if (response.ok) {
                const result = await response.json();
                return result.round;
            }
        } catch (error) {
            console.error('获取对话轮次失败:', error);
        }
        return null;
    }

    // ==================== 收藏管理 ====================

    // 添加收藏
    async addFavorite(roundId, category = '默认分类', tags = [], notes = '') {
        try {
            const favoriteData = {
                userId: this.currentUserId,
                roundId: roundId,
                category: category,
                tags: tags,
                notes: notes,
                metadata: {
                    importance: 'normal'
                }
            };

            const response = await fetch(`${BACKEND_URL}/api/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(favoriteData)
            });

            if (response.ok) {
                const result = await response.json();
                this.favorites.set(roundId, true);

                // 显示成功提示
                this.showNotification('收藏添加成功', 'success');

                // 更新UI
                this.updateFavoriteButton(roundId, true);

                return result.favoriteId;
            } else {
                const error = await response.json();
                throw new Error(error.error || '添加收藏失败');
            }
        } catch (error) {
            console.error('添加收藏失败:', error);
            this.showNotification('添加收藏失败: ' + error.message, 'error');
            return null;
        }
    }

    // 移除收藏
    async removeFavorite(roundId, favoriteId = null) {
        try {
            // 如果没有favoriteId，先查找
            if (!favoriteId) {
                favoriteId = await this.findFavoriteId(roundId);
            }

            if (!favoriteId) {
                throw new Error('收藏不存在');
            }

            const response = await fetch(`${BACKEND_URL}/api/favorites/${favoriteId}?userId=${this.currentUserId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.favorites.set(roundId, false);

                // 显示成功提示
                this.showNotification('收藏移除成功', 'success');

                // 更新UI
                this.updateFavoriteButton(roundId, false);

                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error || '移除收藏失败');
            }
        } catch (error) {
            console.error('移除收藏失败:', error);
            this.showNotification('移除收藏失败: ' + error.message, 'error');
            return false;
        }
    }

    // 切换收藏状态
    async toggleFavorite(roundId) {
        const isFavorited = this.favorites.get(roundId) || false;

        if (isFavorited) {
            return await this.removeFavorite(roundId);
        } else {
            return await this.addFavorite(roundId);
        }
    }

    // 检查是否已收藏
    async checkIfFavorited(roundId) {
        try {
            const favorites = await this.getUserFavorites();
            return favorites.some(fav => fav.roundId === roundId);
        } catch (error) {
            console.error('检查收藏状态失败:', error);
            return false;
        }
    }

    // 查找收藏ID
    async findFavoriteId(roundId) {
        try {
            const favorites = await this.getUserFavorites();
            const favorite = favorites.find(fav => fav.roundId === roundId);
            return favorite ? favorite.id : null;
        } catch (error) {
            console.error('查找收藏ID失败:', error);
            return null;
        }
    }

    // 获取用户收藏列表
    async getUserFavorites(options = {}) {
        try {
            let url = `${BACKEND_URL}/api/favorites?userId=${this.currentUserId}`;

            if (options.limit) url += `&limit=${options.limit}`;
            if (options.offset) url += `&offset=${options.offset}`;
            if (options.category) url += `&category=${options.category}`;
            if (options.tags && options.tags.length > 0) url += `&tags=${options.tags.join(',')}`;

            const response = await fetch(url);
            if (response.ok) {
                const result = await response.json();
                return result.favorites || [];
            }
        } catch (error) {
            console.error('获取收藏列表失败:', error);
        }
        return [];
    }

    // 搜索收藏
    async searchFavorites(query, options = {}) {
        try {
            let url = `${BACKEND_URL}/api/favorites/search/${this.currentUserId}/${encodeURIComponent(query)}`;

            if (options.limit) url += `?limit=${options.limit}`;
            if (options.offset) url += `&offset=${options.offset}`;

            const response = await fetch(url);
            if (response.ok) {
                const result = await response.json();
                return result.results || [];
            }
        } catch (error) {
            console.error('搜索收藏失败:', error);
        }
        return [];
    }

    // 获取收藏分类
    async getFavoriteCategories() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/favorites/categories/${this.currentUserId}`);
            if (response.ok) {
                const result = await response.json();
                return result.categories || [];
            }
        } catch (error) {
            console.error('获取收藏分类失败:', error);
        }
        return [];
    }

    // 加载收藏状态
    async loadFavoriteStatuses() {
        try {
            const favorites = await this.getUserFavorites();
            this.favorites.clear();

            favorites.forEach(favorite => {
                this.favorites.set(favorite.roundId, true);
            });
        } catch (error) {
            console.error('加载收藏状态失败:', error);
        }
    }

    // ==================== UI 操作 ====================

    // 更新对话轮次在UI中
    updateRoundInUI(round, isFavorited) {
        // 查找对应的消息元素并添加收藏按钮
        const messageElements = document.querySelectorAll('.message');
        messageElements.forEach(element => {
            if (this.isRoundMessage(element, round)) {
                this.addFavoriteButton(element, round.id, isFavorited);
            }
        });
    }

    // 检查元素是否属于指定的对话轮次
    isRoundMessage(element, round) {
        // 这里可以根据实际的消息结构来判断
        const messageText = element.textContent;
        return messageText.includes(round.userMessage.text) ||
               messageText.includes(round.aiResponse.text);
    }

    // 添加收藏按钮到消息元素
    addFavoriteButton(messageElement, roundId, isFavorited) {
        // 检查是否已经添加了收藏按钮
        if (messageElement.querySelector('.favorite-btn')) {
            return;
        }

        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.setAttribute('data-round-id', roundId);
        favoriteBtn.innerHTML = isFavorited ?
            '<i class="fas fa-star" style="color: #ffd700;"></i>' :
            '<i class="far fa-star" style="color: #666;"></i>';

        favoriteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.toggleFavorite(roundId);
        });

        // 添加到消息的操作区域
        let actionsArea = messageElement.querySelector('.message-actions');
        if (!actionsArea) {
            actionsArea = document.createElement('div');
            actionsArea.className = 'message-actions';
            messageElement.appendChild(actionsArea);
        }

        actionsArea.appendChild(favoriteBtn);
    }

    // 更新收藏按钮状态
    updateFavoriteButton(roundId, isFavorited) {
        const btn = document.querySelector(`.favorite-btn[data-round-id="${roundId}"]`);
        if (btn) {
            btn.innerHTML = isFavorited ?
                '<i class="fas fa-star" style="color: #ffd700;"></i>' :
                '<i class="far fa-star" style="color: #666;"></i>';
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => notification.classList.add('show'), 10);

        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // ==================== 工具方法 ====================

    // 生成聊天ID
    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 设置当前聊天ID
    setCurrentChatId(chatId) {
        this.currentChatId = chatId;
    }

    // 获取当前聊天ID
    getCurrentChatId() {
        return this.currentChatId;
    }

    // 格式化时间戳
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 24小时内
            return Math.floor(diff / 3600000) + '小时前';
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    }

    // 清理资源
    cleanup() {
        this.favorites.clear();
        this.conversationRounds = [];
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationManager;
}