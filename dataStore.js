// 数据存储模块
// 使用文件系统存储对话轮次和收藏数据

const fs = require('fs');
const path = require('path');

class DataStore {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.conversationsDir = path.join(this.dataDir, 'conversations');
        this.favoritesDir = path.join(this.dataDir, 'favorites');
        this.usersDir = path.join(this.dataDir, 'users');

        this.initializeDirectories();
    }

    // 初始化目录结构
    initializeDirectories() {
        const dirs = [this.dataDir, this.conversationsDir, this.favoritesDir, this.usersDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 读取JSON文件
    readJsonFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.error('读取文件失败:', filePath, error);
            return null;
        }
    }

    // 写入JSON文件
    writeJsonFile(filePath, data) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('写入文件失败:', filePath, error);
            return false;
        }
    }

    // ==================== 对话轮次管理 ====================

    // 保存对话轮次
    saveConversationRound(userId, roundData) {
        const roundId = roundData.id || this.generateId();
        const timestamp = Date.now();

        const conversationRound = {
            id: roundId,
            userId: userId,
            chatId: roundData.chatId || this.generateId(),
            timestamp: timestamp,
            userMessage: roundData.userMessage,
            aiResponse: roundData.aiResponse,
            model: roundData.model || 'glm-4',
            imageFiles: roundData.imageFiles || [],
            metadata: {
                duration: roundData.duration || 0,
                tokensUsed: roundData.tokensUsed || 0,
                rating: roundData.rating || null
            }
        };

        const filePath = path.join(this.conversationsDir, `${roundId}.json`);
        return this.writeJsonFile(filePath, conversationRound) ? roundId : null;
    }

    // 获取对话轮次
    getConversationRound(roundId) {
        const filePath = path.join(this.conversationsDir, `${roundId}.json`);
        return this.readJsonFile(filePath);
    }

    // 获取用户的所有对话轮次
    getUserConversationRounds(userId, options = {}) {
        const { limit = 50, offset = 0, chatId = null } = options;
        const rounds = [];

        try {
            const files = fs.readdirSync(this.conversationsDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(this.conversationsDir, file);
                const round = this.readJsonFile(filePath);

                if (round && round.userId === userId && (!chatId || round.chatId === chatId)) {
                    rounds.push(round);
                }
            }
        } catch (error) {
            console.error('读取对话轮次失败:', error);
        }

        // 按时间戳降序排序
        rounds.sort((a, b) => b.timestamp - a.timestamp);

        return {
            rounds: rounds.slice(offset, offset + limit),
            total: rounds.length,
            hasMore: rounds.length > offset + limit
        };
    }

    // 搜索对话轮次
    searchConversationRounds(userId, query, options = {}) {
        const { limit = 20, offset = 0 } = options;
        const results = [];

        try {
            const files = fs.readdirSync(this.conversationsDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(this.conversationsDir, file);
                const round = this.readJsonFile(filePath);

                if (round && round.userId === userId) {
                    const searchText = (
                        (round.userMessage?.text || '') +
                        (round.aiResponse?.text || '')
                    ).toLowerCase();

                    if (searchText.includes(query.toLowerCase())) {
                        results.push(round);
                    }
                }
            }
        } catch (error) {
            console.error('搜索对话轮次失败:', error);
        }

        // 按时间戳降序排序
        results.sort((a, b) => b.timestamp - a.timestamp);

        return {
            results: results.slice(offset, offset + limit),
            total: results.length,
            hasMore: results.length > offset + limit
        };
    }

    // 删除对话轮次
    deleteConversationRound(roundId, userId) {
        const filePath = path.join(this.conversationsDir, `${roundId}.json`);
        try {
            const round = this.readJsonFile(filePath);
            if (round && round.userId === userId) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('删除对话轮次失败:', error);
            return false;
        }
    }

    // ==================== 收藏管理 ====================

    // 添加收藏
    addFavorite(userId, roundId, favoriteData = {}) {
        const favoriteId = this.generateId();
        const timestamp = Date.now();

        const favorite = {
            id: favoriteId,
            userId: userId,
            roundId: roundId,
            timestamp: timestamp,
            category: favoriteData.category || '默认分类',
            tags: favoriteData.tags || [],
            notes: favoriteData.notes || '',
            metadata: {
                addedFrom: favoriteData.addedFrom || 'conversation',
                importance: favoriteData.importance || 'normal'
            }
        };

        const filePath = path.join(this.favoritesDir, `${favoriteId}.json`);
        return this.writeJsonFile(filePath, favorite) ? favoriteId : null;
    }

    // 移除收藏
    removeFavorite(favoriteId, userId) {
        const filePath = path.join(this.favoritesDir, `${favoriteId}.json`);
        try {
            const favorite = this.readJsonFile(filePath);
            if (favorite && favorite.userId === userId) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('移除收藏失败:', error);
            return false;
        }
    }

    // 获取收藏列表
    getUserFavorites(userId, options = {}) {
        const { limit = 50, offset = 0, category = null, tags = [] } = options;
        const favorites = [];

        try {
            const files = fs.readdirSync(this.favoritesDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(this.favoritesDir, file);
                const favorite = this.readJsonFile(filePath);

                if (favorite && favorite.userId === userId) {
                    // 过滤分类
                    if (category && favorite.category !== category) {
                        continue;
                    }

                    // 过滤标签
                    if (tags.length > 0 && !tags.some(tag => favorite.tags.includes(tag))) {
                        continue;
                    }

                    // 获取关联的对话轮次数据
                    const round = this.getConversationRound(favorite.roundId);
                    if (round) {
                        favorites.push({
                            ...favorite,
                            conversationRound: round
                        });
                    }
                }
            }
        } catch (error) {
            console.error('获取收藏列表失败:', error);
        }

        // 按时间戳降序排序
        favorites.sort((a, b) => b.timestamp - a.timestamp);

        return {
            favorites: favorites.slice(offset, offset + limit),
            total: favorites.length,
            hasMore: favorites.length > offset + limit
        };
    }

    // 搜索收藏
    searchFavorites(userId, query, options = {}) {
        const { limit = 20, offset = 0 } = options;
        const results = [];

        try {
            const files = fs.readdirSync(this.favoritesDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(this.favoritesDir, file);
                const favorite = this.readJsonFile(filePath);

                if (favorite && favorite.userId === userId) {
                    const round = this.getConversationRound(favorite.roundId);
                    if (round) {
                        const searchText = (
                            (round.userMessage?.text || '') +
                            (round.aiResponse?.text || '') +
                            favorite.notes +
                            favorite.category +
                            favorite.tags.join(' ')
                        ).toLowerCase();

                        if (searchText.includes(query.toLowerCase())) {
                            results.push({
                                ...favorite,
                                conversationRound: round
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('搜索收藏失败:', error);
        }

        // 按时间戳降序排序
        results.sort((a, b) => b.timestamp - a.timestamp);

        return {
            results: results.slice(offset, offset + limit),
            total: results.length,
            hasMore: results.length > offset + limit
        };
    }

    // 获取收藏分类
    getFavoriteCategories(userId) {
        const categories = new Set();

        try {
            const files = fs.readdirSync(this.favoritesDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const filePath = path.join(this.favoritesDir, file);
                const favorite = this.readJsonFile(filePath);

                if (favorite && favorite.userId === userId) {
                    categories.add(favorite.category);
                }
            }
        } catch (error) {
            console.error('获取收藏分类失败:', error);
        }

        return Array.from(categories);
    }

    // ==================== 用户数据管理 ====================

    // 保存用户设置
    saveUserSettings(userId, settings) {
        const filePath = path.join(this.usersDir, `${userId}_settings.json`);
        const userSettings = {
            userId: userId,
            settings: settings,
            lastUpdated: Date.now()
        };
        return this.writeJsonFile(filePath, userSettings);
    }

    // 获取用户设置
    getUserSettings(userId) {
        const filePath = path.join(this.usersDir, `${userId}_settings.json`);
        const userSettings = this.readJsonFile(filePath);
        return userSettings ? userSettings.settings : {};
    }

    // 获取用户统计信息
    getUserStats(userId) {
        const stats = {
            totalConversations: 0,
            totalFavorites: 0,
            categories: {},
            modelsUsage: {},
            recentActivity: []
        };

        try {
            // 统计对话轮次
            const conversationFiles = fs.readdirSync(this.conversationsDir)
                .filter(file => file.endsWith('.json'));

            for (const file of conversationFiles) {
                const filePath = path.join(this.conversationsDir, file);
                const round = this.readJsonFile(filePath);

                if (round && round.userId === userId) {
                    stats.totalConversations++;

                    // 统计模型使用
                    const model = round.model || 'unknown';
                    stats.modelsUsage[model] = (stats.modelsUsage[model] || 0) + 1;

                    // 记录最近活动
                    if (stats.recentActivity.length < 10) {
                        stats.recentActivity.push({
                            type: 'conversation',
                            timestamp: round.timestamp,
                            roundId: round.id
                        });
                    }
                }
            }

            // 统计收藏
            const favoriteFiles = fs.readdirSync(this.favoritesDir)
                .filter(file => file.endsWith('.json'));

            for (const file of favoriteFiles) {
                const filePath = path.join(this.favoritesDir, file);
                const favorite = this.readJsonFile(filePath);

                if (favorite && favorite.userId === userId) {
                    stats.totalFavorites++;

                    // 统计分类
                    const category = favorite.category;
                    stats.categories[category] = (stats.categories[category] || 0) + 1;
                }
            }

            // 按时间戳排序最近活动
            stats.recentActivity.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('获取用户统计失败:', error);
        }

        return stats;
    }
}

module.exports = DataStore;