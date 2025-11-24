const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const DataStore = require('./dataStore');

const app = express();
const PORT = 3000;

// 初始化数据存储
const dataStore = new DataStore();

// 配置CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'file://',
        'null' // 允许本地文件访问
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: true
}));

app.use(express.json());
app.use(express.static('public'));
app.use(express.static(__dirname)); // Serve all files from root directory including index.html

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB限制
    },
    fileFilter: (req, file, cb) => {
        // 只允许图片文件
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件 (JPEG, JPG, PNG, GIF, WebP)'));
        }
    }
});

// GLM API配置
const GLM_API_KEY = '97881a34e3bd47ea937c6299b1fbb203.Ctt352NlOwUWHjB8';
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_MODELS = {
    'glm-4': 'glm-4',
    'glm-4v': 'glm-4v',
    'glm-4-plus': 'glm-4-plus',
    'glm-4v-plus': 'glm-4v-plus'
};

// 根路径
app.get('/', (req, res) => {
    res.json({ message: 'AI家教后端API服务器运行中', status: 'ok', timestamp: new Date().toISOString() });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 图片上传接口
app.post('/api/upload-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        const fileInfo = {
            id: Date.now().toString(),
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path,
            url: `/uploads/${req.file.filename}`,
            uploadTime: new Date().toISOString()
        };

        console.log('图片上传成功:', fileInfo);
        res.json({
            success: true,
            message: '图片上传成功',
            file: fileInfo
        });

    } catch (error) {
        console.error('图片上传失败:', error);
        res.status(500).json({ error: '图片上传失败', details: error.message });
    }
});

// GLM Vision API接口
app.post('/api/chat-with-image', async (req, res) => {
    try {
        const { message, imagePath, model = 'glm-4v' } = req.body;

        if (!message) {
            return res.status(400).json({ error: '消息内容不能为空' });
        }

        if (!imagePath) {
            return res.status(400).json({ error: '图片路径不能为空' });
        }

        // 检查文件是否存在
        const fullPath = path.join(__dirname, imagePath);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: '图片文件不存在' });
        }

        // 将图片转换为base64
        const imageBuffer = fs.readFileSync(fullPath);
        const base64Image = `data:image/${path.extname(fullPath).substring(1)};base64,${imageBuffer.toString('base64')}`;

        console.log('调用GLM Vision API:', { message, imagePath, model });

        // 构建GLM API请求
        const requestBody = {
            model: GLM_MODELS[model] || 'glm-4v',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: message
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: base64Image
                            }
                        }
                    ]
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
        };

        console.log('发送GLM API请求...');
        const response = await fetch(GLM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GLM_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GLM API错误:', response.status, errorText);
            throw new Error(`GLM API错误 ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('GLM API响应成功');

        res.json({
            success: true,
            message: '图片分析成功',
            response: result.choices[0]?.message?.content || '无法获取回复内容',
            model: model,
            usage: result.usage
        });

    } catch (error) {
        console.error('图片分析失败:', error);
        res.status(500).json({
            error: '图片分析失败',
            details: error.message
        });
    }
});

// 纯文本对话接口（用于对比）
app.post('/api/chat', async (req, res) => {
    try {
        const { message, model = 'glm-4' } = req.body;

        if (!message) {
            return res.status(400).json({ error: '消息内容不能为空' });
        }

        console.log('调用GLM文本API:', { message, model });

        const requestBody = {
            model: GLM_MODELS[model] || 'glm-4',
            messages: [
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
        };

        const response = await fetch(GLM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GLM_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GLM API错误 ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        res.json({
            success: true,
            message: '对话成功',
            response: result.choices[0]?.message?.content || '无法获取回复内容',
            model: model,
            usage: result.usage
        });

    } catch (error) {
        console.error('对话失败:', error);
        res.status(500).json({
            error: '对话失败',
            details: error.message
        });
    }
});

// 删除上传的图片
app.delete('/api/upload/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('图片删除成功:', filename);
            res.json({ success: true, message: '图片删除成功' });
        } else {
            res.status(404).json({ error: '图片文件不存在' });
        }

    } catch (error) {
        console.error('图片删除失败:', error);
        res.status(500).json({ error: '图片删除失败', details: error.message });
    }
});

// 获取上传的图片列表
app.get('/api/uploads', (req, res) => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');

        if (!fs.existsSync(uploadDir)) {
            return res.json({ files: [] });
        }

        const files = fs.readdirSync(uploadDir)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            })
            .map(file => {
                const filePath = path.join(uploadDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    url: `/uploads/${file}`,
                    size: stats.size,
                    uploadTime: stats.mtime.toISOString()
                };
            });

        res.json({ files: files });

    } catch (error) {
        console.error('获取图片列表失败:', error);
        res.status(500).json({ error: '获取图片列表失败', details: error.message });
    }
});

// 静态文件服务 - 提供上传的图片访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== 对话轮次管理 API ====================

// 保存对话轮次
app.post('/api/conversation-rounds', (req, res) => {
    try {
        const { userId, chatId, userMessage, aiResponse, model, imageFiles, metadata } = req.body;

        if (!userId || !userMessage || !aiResponse) {
            return res.status(400).json({
                error: '缺少必要参数: userId, userMessage, aiResponse'
            });
        }

        const roundData = {
            userId,
            chatId,
            userMessage,
            aiResponse,
            model: model || 'glm-4',
            imageFiles: imageFiles || [],
            metadata: metadata || {}
        };

        const roundId = dataStore.saveConversationRound(userId, roundData);

        if (roundId) {
            res.json({
                success: true,
                message: '对话轮次保存成功',
                roundId: roundId
            });
        } else {
            res.status(500).json({ error: '对话轮次保存失败' });
        }
    } catch (error) {
        console.error('保存对话轮次失败:', error);
        res.status(500).json({ error: '保存对话轮次失败', details: error.message });
    }
});

// 获取对话轮次
app.get('/api/conversation-rounds/:roundId', (req, res) => {
    try {
        const { roundId } = req.params;
        const round = dataStore.getConversationRound(roundId);

        if (round) {
            res.json({
                success: true,
                round: round
            });
        } else {
            res.status(404).json({ error: '对话轮次不存在' });
        }
    } catch (error) {
        console.error('获取对话轮次失败:', error);
        res.status(500).json({ error: '获取对话轮次失败', details: error.message });
    }
});

// 获取用户的对话轮次列表
app.get('/api/conversation-rounds', (req, res) => {
    try {
        const { userId, limit = 50, offset = 0, chatId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            chatId: chatId || null
        };

        const result = dataStore.getUserConversationRounds(userId, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('获取对话轮次列表失败:', error);
        res.status(500).json({ error: '获取对话轮次列表失败', details: error.message });
    }
});

// 搜索对话轮次
app.get('/api/conversation-rounds/search/:userId/:query', (req, res) => {
    try {
        const { userId, query } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        if (!userId || !query) {
            return res.status(400).json({ error: '缺少userId或query参数' });
        }

        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = dataStore.searchConversationRounds(userId, query, options);

        res.json({
            success: true,
            query: query,
            ...result
        });
    } catch (error) {
        console.error('搜索对话轮次失败:', error);
        res.status(500).json({ error: '搜索对话轮次失败', details: error.message });
    }
});

// 删除对话轮次
app.delete('/api/conversation-rounds/:roundId', (req, res) => {
    try {
        const { roundId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const deleted = dataStore.deleteConversationRound(roundId, userId);

        if (deleted) {
            res.json({
                success: true,
                message: '对话轮次删除成功'
            });
        } else {
            res.status(404).json({ error: '对话轮次不存在或无权删除' });
        }
    } catch (error) {
        console.error('删除对话轮次失败:', error);
        res.status(500).json({ error: '删除对话轮次失败', details: error.message });
    }
});

// ==================== 收藏管理 API ====================

// 添加收藏
app.post('/api/favorites', (req, res) => {
    try {
        const { userId, roundId, category, tags, notes, metadata } = req.body;

        if (!userId || !roundId) {
            return res.status(400).json({
                error: '缺少必要参数: userId, roundId'
            });
        }

        // 检查对话轮次是否存在
        const round = dataStore.getConversationRound(roundId);
        if (!round) {
            return res.status(404).json({ error: '对话轮次不存在' });
        }

        // 检查是否已经收藏
        const existingFavorites = dataStore.getUserFavorites(userId);
        const alreadyFavorited = existingFavorites.favorites.some(fav => fav.roundId === roundId);

        if (alreadyFavorited) {
            return res.status(400).json({ error: '该对话轮次已被收藏' });
        }

        const favoriteData = {
            category: category || '默认分类',
            tags: tags || [],
            notes: notes || '',
            metadata: metadata || {},
            addedFrom: 'conversation'
        };

        const favoriteId = dataStore.addFavorite(userId, roundId, favoriteData);

        if (favoriteId) {
            res.json({
                success: true,
                message: '收藏添加成功',
                favoriteId: favoriteId
            });
        } else {
            res.status(500).json({ error: '收藏添加失败' });
        }
    } catch (error) {
        console.error('添加收藏失败:', error);
        res.status(500).json({ error: '添加收藏失败', details: error.message });
    }
});

// 移除收藏
app.delete('/api/favorites/:favoriteId', (req, res) => {
    try {
        const { favoriteId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const removed = dataStore.removeFavorite(favoriteId, userId);

        if (removed) {
            res.json({
                success: true,
                message: '收藏移除成功'
            });
        } else {
            res.status(404).json({ error: '收藏不存在或无权删除' });
        }
    } catch (error) {
        console.error('移除收藏失败:', error);
        res.status(500).json({ error: '移除收藏失败', details: error.message });
    }
});

// 获取收藏列表
app.get('/api/favorites', (req, res) => {
    try {
        const { userId, limit = 50, offset = 0, category, tags } = req.query;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            category: category || null,
            tags: tags ? tags.split(',') : []
        };

        const result = dataStore.getUserFavorites(userId, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('获取收藏列表失败:', error);
        res.status(500).json({ error: '获取收藏列表失败', details: error.message });
    }
});

// 搜索收藏
app.get('/api/favorites/search/:userId/:query', (req, res) => {
    try {
        const { userId, query } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        if (!userId || !query) {
            return res.status(400).json({ error: '缺少userId或query参数' });
        }

        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = dataStore.searchFavorites(userId, query, options);

        res.json({
            success: true,
            query: query,
            ...result
        });
    } catch (error) {
        console.error('搜索收藏失败:', error);
        res.status(500).json({ error: '搜索收藏失败', details: error.message });
    }
});

// 获取收藏分类
app.get('/api/favorites/categories/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const categories = dataStore.getFavoriteCategories(userId);

        res.json({
            success: true,
            categories: categories
        });
    } catch (error) {
        console.error('获取收藏分类失败:', error);
        res.status(500).json({ error: '获取收藏分类失败', details: error.message });
    }
});

// ==================== 用户数据管理 API ====================

// 获取用户统计信息
app.get('/api/users/:userId/stats', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const stats = dataStore.getUserStats(userId);

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('获取用户统计失败:', error);
        res.status(500).json({ error: '获取用户统计失败', details: error.message });
    }
});

// 获取用户设置
app.get('/api/users/:userId/settings', (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: '缺少userId参数' });
        }

        const settings = dataStore.getUserSettings(userId);

        res.json({
            success: true,
            settings: settings
        });
    } catch (error) {
        console.error('获取用户设置失败:', error);
        res.status(500).json({ error: '获取用户设置失败', details: error.message });
    }
});

// 保存用户设置
app.post('/api/users/:userId/settings', (req, res) => {
    try {
        const { userId } = req.params;
        const { settings } = req.body;

        if (!userId || !settings) {
            return res.status(400).json({ error: '缺少userId或settings参数' });
        }

        const saved = dataStore.saveUserSettings(userId, settings);

        if (saved) {
            res.json({
                success: true,
                message: '用户设置保存成功'
            });
        } else {
            res.status(500).json({ error: '用户设置保存失败' });
        }
    } catch (error) {
        console.error('保存用户设置失败:', error);
        res.status(500).json({ error: '保存用户设置失败', details: error.message });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '文件大小超过10MB限制' });
        }
    }

    res.status(500).json({ error: '服务器内部错误', details: error.message });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 AI家教后端API服务器已启动`);
    console.log(`📍 服务器地址: http://localhost:${PORT}`);
    console.log(`📁 上传目录: ${path.join(__dirname, 'uploads')}`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
    console.log('\n📋 可用接口:');
    console.log('  GET  /                    - 服务器状态');
    console.log('  GET  /health              - 健康检查');
    console.log('  POST /api/upload-image    - 图片上传');
    console.log('  POST /api/chat-with-image - 图片分析');
    console.log('  POST /api/chat            - 文本对话');
    console.log('  GET  /api/uploads         - 获取图片列表');
    console.log('  DELETE /api/upload/:id   - 删除图片');
    console.log('\n🔄 对话轮次管理:');
    console.log('  POST /api/conversation-rounds                 - 保存对话轮次');
    console.log('  GET  /api/conversation-rounds/:roundId       - 获取对话轮次');
    console.log('  GET  /api/conversation-rounds                 - 获取用户对话轮次列表');
    console.log('  GET  /api/conversation-rounds/search/:userId/:query - 搜索对话轮次');
    console.log('  DELETE /api/conversation-rounds/:roundId     - 删除对话轮次');
    console.log('\n⭐ 收藏管理:');
    console.log('  POST /api/favorites                           - 添加收藏');
    console.log('  DELETE /api/favorites/:favoriteId            - 移除收藏');
    console.log('  GET  /api/favorites                          - 获取收藏列表');
    console.log('  GET  /api/favorites/search/:userId/:query    - 搜索收藏');
    console.log('  GET  /api/favorites/categories/:userId       - 获取收藏分类');
    console.log('\n👤 用户数据管理:');
    console.log('  GET  /api/users/:userId/stats                - 获取用户统计信息');
    console.log('  GET  /api/users/:userId/settings             - 获取用户设置');
    console.log('  POST /api/users/:userId/settings             - 保存用户设置');
});