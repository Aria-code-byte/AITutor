// 全局变量
let currentChatId = null;
let chats = [];
let knowledgePoints = [];
let isGenerating = false;
let currentAbortController = null;
let uploadedFiles = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = null;
let recognition = null;

// 后端API配置
const BACKEND_URL = 'http://localhost:3000'; // 后端服务器地址
const API_TIMEOUT = 30000; // API超时时间（毫秒）

// GLM API配置
const GLM_API_KEY = '97881a34e3bd47ea937c6299b1fbb203.Ctt352NlOwUWHjB8';
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_MODELS = {
    'glm-4.6': 'glm-4',
    'glm-4.6-vision': 'glm-4v',
    'glm-4-plus': 'glm-4-plus',
    'glm-4v-plus': 'glm-4v-plus',
    'glm-4-flash': 'glm-4-flash',
    'glm-4-long': 'glm-4-long',
    'glm-3-turbo': 'glm-3-turbo'
};

// 基于后端API的模型配置
const BACKEND_MODELS = {
    'glm-4.6': 'glm-4',           // 基础模型
    'glm-4.6-vision': 'glm-4v',   // 视觉模型
    'glm-4-plus': 'glm-4-plus',   // 增强模型
    'glm-4v-plus': 'glm-4v-plus', // 增强视觉模型
    'glm-4-flash': 'glm-4-flash', // 快速模型
    'glm-4-long': 'glm-4-long',   // 长文本模型
    'glm-3-turbo': 'glm-3-turbo'  // 旧版模型
};

// 获取后端API URL
function getBackendUrl() {
    return BACKEND_URL;
}

function getGLMApiUrl() {
    return GLM_API_URL;
}

// 检查后端服务器状态
async function checkBackendStatus() {
    try {
        const response = await fetch(`${BACKEND_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        console.warn('后端服务器连接失败:', error.message);
        return false;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus(); // 检查登录状态
    initializeApp();
    loadChatsFromStorage();
    loadKnowledgeFromStorage();
    setupEventListeners();
    initializeCodeBlocks(); // 初始化代码块功能
    onModelChange(); // 初始化模型状态
});

// 检查登录状态
function checkLoginStatus() {
    // 允许未登录用户访问应用，但显示登录按钮

    // 检查登录状态并更新界面
    const currentUser = authManager.getCurrentUser();
    console.log('当前用户:', currentUser);

    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userInfo && userName && loginBtn && logoutBtn) {
        if (currentUser) {
            // 已登录状态
            userName.textContent = currentUser.username || '未知用户';
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'flex';
            console.log('用户信息已更新:', currentUser.username);
        } else {
            // 未登录状态
            userName.textContent = '未登录';
            loginBtn.style.display = 'flex';
            logoutBtn.style.display = 'none';
            console.log('显示登录按钮');
        }
    } else {
        console.error('找不到用户信息DOM元素');
    }
}

function initializeApp() {
    // 初始化主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);

    // 初始化深度思考模式
    const deepThinkingState = localStorage.getItem('deepThinking') === 'true';
    updateDeepThinkingToggle(deepThinkingState);

    // 初始化语音识别
    initializeVoiceRecognition();

    // 创建第一个对话
    if (chats.length === 0) {
        createNewChat();
    } else {
        loadChat(chats[0].id);
    }
}

function setupEventListeners() {
    // 消息输入框事件
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', function() {
        updateSendButton();
    });

    // 全局点击事件（关闭消息菜单）
    document.addEventListener('click', function(e) {
        const messageMenu = document.getElementById('messageMenu');
        if (!e.target.closest('.message-menu') && !e.target.closest('.message-content')) {
            messageMenu.style.display = 'none';
        }
    });

    // 知识分类按钮事件
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterKnowledgePoints(this.dataset.category);
        });
    });
}

// 对话管理
function createNewChat() {
    const chatId = generateId();
    const newChat = {
        id: chatId,
        title: '新对话',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    chats.unshift(newChat);
    saveChatsToStorage();
    loadChat(chatId);
    updateChatHistory();
}

function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);

    if (chat) {
        renderMessages(chat.messages);
        updateChatHistory();
        document.getElementById('messageInput').focus();
    }
}

function updateChatHistory() {
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = '';

    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.onclick = () => loadChat(chat.id);

        chatItem.innerHTML = `
            <div class="chat-item-title">${chat.title}</div>
            <div class="chat-item-time">${formatTime(chat.updatedAt)}</div>
        `;

        chatHistory.appendChild(chatItem);
    });
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    if (messages.length === 0) {
        // 显示欢迎消息
        container.innerHTML = `
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
                </div>
            </div>
        `;
        return;
    }

    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        container.appendChild(messageElement);
    });

    // 滚动到底部
    container.scrollTop = container.scrollHeight;
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    messageDiv.setAttribute('data-message-id', message.id);

    if (message.role === 'user') {
        // 用户消息 - 右对齐对话框样式
        let attachmentsHtml = '';
        if (message.attachments && message.attachments.length > 0) {
            attachmentsHtml = '<div class="message-attachments">';
            message.attachments.forEach(attachment => {
                const fileIcon = getFileIcon(attachment.type, attachment.mimeType);
                const fileSize = formatFileSize(attachment.size);

                attachmentsHtml += `
                    <div class="attachment-item">
                        <i class="${fileIcon}"></i>
                        <span class="attachment-name">${attachment.name}</span>
                        <span class="attachment-size">(${fileSize})</span>
                    </div>
                `;
            });
            attachmentsHtml += '</div>';
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${formatMessageContent(message.content)}</div>
                ${attachmentsHtml}
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    } else {
        // AI消息 - 居中左对齐，无边框样式
        let thinkingHtml = '';
        if (message.thinking && message.thinking.trim()) {
            thinkingHtml = `
                <div class="thinking-process">
                    <div class="thinking-title">
                        <i class="fas fa-brain"></i>
                        思考过程
                    </div>
                    <div class="thinking-content">${formatMessageContent(message.thinking)}</div>
                </div>
            `;
        }

        messageDiv.innerHTML = `
            <div class="message-avatar" style="display: none;">
                <i class="fas fa-robot"></i>
            </div>
            ${thinkingHtml}
            <div class="message-content">
                <div class="message-text">${formatMessageContent(message.content)}</div>
                <div class="message-actions">
                    <button class="message-action-btn regenerate-btn" onclick="regenerateResponse('${message.id}')" title="重新生成回答">
                        <i class="fas fa-redo"></i>
                        <span>重新生成</span>
                    </button>
                    <button class="message-action-btn copy-btn" onclick="copyMessageContent('${message.id}')" title="复制回答">
                        <i class="fas fa-copy"></i>
                        <span>复制</span>
                    </button>
                </div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    }

    // 添加右键菜单
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent) {
        messageContent.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showMessageMenu(e, message.id);
        });
    }

    return messageDiv;
}

// 现代化代码渲染系统 - 参考图片风格
function formatMessageContent(content) {
    let formatted = content;

    // 处理数学符号（解决乘号等符号显示问题）
    formatted = formatted.replace(/×/g, '&times;');
    formatted = formatted.replace(/÷/g, '&divide;');
    formatted = formatted.replace(/±/g, '&plusmn;');
    formatted = formatted.replace(/≈/g, '&asymp;');
    formatted = formatted.replace(/≠/g, '&ne;');
    formatted = formatted.replace(/≤/g, '&le;');
    formatted = formatted.replace(/≥/g, '&ge;');
    formatted = formatted.replace(/∞/g, '&infin;');
    formatted = formatted.replace(/∑/g, '&sum;');
    formatted = formatted.replace(/∏/g, '&prod;');
    formatted = formatted.replace(/∫/g, '&int;');
    formatted = formatted.replace(/√/g, '&radic;');
    formatted = formatted.replace(/²/g, '&sup2;');
    formatted = formatted.replace(/³/g, '&sup3;');

    // 处理代码块 - 第一步：保护代码块内容
    const codeBlocks = [];
    let codeIndex = 0;
    formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, function(match, language, code) {
        const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeIndex}__`;
        codeBlocks.push({ language, code, originalMatch: match });
        codeIndex++;
        return placeholder;
    });

    // 处理内联代码（在代码块处理之后）
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

    // 处理粗体
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 处理斜体
    formatted = formatted.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

    // 处理换行 - 只处理非代码块内容的换行
    formatted = formatted.replace(/\n/g, '<br>');

    // 第二步：恢复代码块，确保换行符保持原样
    codeBlocks.forEach((block, i) => {
        const placeholder = `__CODE_BLOCK_PLACEHOLDER_${i}__`;
        const detectedLanguage = detectSimpleLanguage(block.language, block.code);
        const languageIcon = getLanguageIcon(detectedLanguage);

        // 清理代码并应用自动格式化，但保持换行符
        let cleanCode = block.code.trim();
        if (detectedLanguage === 'cpp' || detectedLanguage === 'c' || detectedLanguage === 'java') {
            cleanCode = autoFormatCode(cleanCode, detectedLanguage);
        }

        const codeLines = cleanCode.split('\n');
        const codeId = 'code-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9);
        const isLongCode = codeLines.length > 10;
        const initialState = isLongCode ? 'collapsed' : 'expanded';

        const codeBlockHtml = `
            <div class="code-block-container ${initialState}" id="${codeId}" data-language="${detectedLanguage}">
                <div class="code-block-header">
                    <div class="code-info">
                        <div class="language-indicator">
                            <span class="language-name">${getLanguageDisplayName(detectedLanguage)}</span>
                            <span class="code-lines-count">${codeLines.length} lines</span>
                        </div>
                        <div class="code-filename">main.${getFileExtension(detectedLanguage)}</div>
                    </div>
                    <div class="code-actions">
                        <button class="code-action-btn copy-btn" onclick="copyModernCode('${codeId}')" data-tooltip="复制代码" title="复制代码">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="code-action-btn" onclick="copyCodeWithLineNumbers('${codeId}')" data-tooltip="复制带行号" title="复制带行号">
                            <i class="fas fa-code"></i>
                        </button>
                    </div>
                </div>
                <div class="code-content ${initialState}" id="${codeId}-content">
                    <div class="code-wrapper">
                        <pre><code class="language-${detectedLanguage}">${escapeHtml(cleanCode)}</code></pre>
                    </div>
                </div>
                ${isLongCode ? `
                    <div class="code-block-footer">
                        <button class="code-expand-btn" onclick="toggleCodeExpansion('${codeId}')" id="${codeId}-expand-btn">
                            <i class="fas fa-chevron-down"></i>
                            <span>展开 (+${codeLines.length - 10}行)</span>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        formatted = formatted.replace(placeholder, codeBlockHtml);
    });

    return formatted;
}

// 简化的语言检测
function detectSimpleLanguage(providedLanguage, code) {
    if (providedLanguage && providedLanguage.trim()) {
        const alias = providedLanguage.toLowerCase().trim();
        const languageMap = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'py': 'python', 'rb': 'ruby', 'sh': 'bash', 'shell': 'bash',
            'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss',
            'java': 'java', 'c': 'c', 'cpp': 'cpp', 'c++': 'cpp',
            'sql': 'sql', 'json': 'json', 'xml': 'xml', 'yaml': 'yaml',
            'dockerfile': 'docker', 'md': 'markdown'
        };
        return languageMap[alias] || alias;
    }

    // 简单的内容检测
    const codeSample = code.substring(0, 200).toLowerCase();

    if (codeSample.includes('function') || codeSample.includes('const ') || codeSample.includes('=>')) {
        return 'javascript';
    }
    if (codeSample.includes('def ') || codeSample.includes('import ')) {
        return 'python';
    }
    if (codeSample.includes('public class') || codeSample.includes('System.out')) {
        return 'java';
    }
    if (codeSample.includes('#include') || codeSample.includes('printf(')) {
        return 'c';
    }
    if (codeSample.includes('<html') || codeSample.includes('<div')) {
        return 'html';
    }
    if (codeSample.includes('{') && codeSample.includes('color:')) {
        return 'css';
    }
    if (codeSample.includes('select ') && codeSample.includes('from ')) {
        return 'sql';
    }
    if (codeSample.trim().startsWith('{') && codeSample.trim().endsWith('}')) {
        try { JSON.parse(codeSample); return 'json'; } catch(e) {}
    }

    return 'plaintext';
}

// HTML转义
// 自动格式化代码
function autoFormatCode(code, language) {
    try {
        // 基本的C++/Java代码格式化
        let formatted = code;
        const indentSize = 4; // 缩进大小

        // 分割代码行
        let lines = formatted.split('\n');
        let indentLevel = 0;
        let formattedLines = [];

        for (let line of lines) {
            const trimmedLine = line.trim();

            // 跳过空行
            if (!trimmedLine) {
                formattedLines.push('');
                continue;
            }

            // 处理花括号换行
            if (trimmedLine === '{') {
                formattedLines.push(' '.repeat(indentLevel * indentSize) + '{');
                indentLevel++;
                continue;
            }

            if (trimmedLine === '}') {
                indentLevel = Math.max(0, indentLevel - 1);
                formattedLines.push(' '.repeat(indentLevel * indentSize) + '}');
                continue;
            }

            // 处理行尾的花括号
            if (trimmedLine.endsWith('{')) {
                formattedLines.push(' '.repeat(indentLevel * indentSize) + trimmedLine);
                indentLevel++;
                continue;
            }

            // 处理行首的花括号
            if (trimmedLine.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
                formattedLines.push(' '.repeat(indentLevel * indentSize) + trimmedLine);
                continue;
            }

            // 普通代码行
            formattedLines.push(' '.repeat(indentLevel * indentSize) + trimmedLine);
        }

        return formattedLines.join('\n');
    } catch (e) {
        console.warn('代码格式化失败:', e);
        return code; // 格式化失败时返回原代码
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 获取编程语言图标
function getLanguageIcon(language) {
    const iconMap = {
        'javascript': 'JS',
        'typescript': 'TS',
        'python': 'Py',
        'java': 'Java',
        'c': 'C',
        'cpp': 'C++',
        'csharp': 'C#',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'xml': 'XML',
        'sql': 'SQL',
        'bash': 'Bash',
        'markdown': 'MD',
        'php': 'PHP',
        'ruby': 'RB',
        'go': 'Go',
        'rust': 'RS',
        'swift': 'Swift',
        'kotlin': 'KT',
        'scala': 'Scala',
        'r': 'R',
        'matlab': 'ML',
        'docker': 'Docker',
        'yaml': 'YAML',
        'plaintext': 'TXT'
    };

    return iconMap[language] || language.substring(0, 2).toUpperCase();
}

// 现代化复制代码功能
function copyModernCode(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const codeElement = codeBlock.querySelector('code');
    if (!codeElement) return;

    const codeText = codeElement.textContent || codeElement.innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(codeText).then(() => {
            showCopyFeedback(codeId);
            showSuccessToast('代码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyCode(codeText);
        });
    } else {
        fallbackCopyCode(codeText);
    }
}

// 切换行号显示
function toggleLineNumbers(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const codeContent = codeBlock.querySelector('.code-content');
    const pre = codeContent.querySelector('pre');

    if (codeContent.classList.contains('with-line-numbers')) {
        codeContent.classList.remove('with-line-numbers');
        pre.style.counterReset = 'line-number';
        showSuccessToast('已隐藏行号');
    } else {
        codeContent.classList.add('with-line-numbers');
        showSuccessToast('已显示行号');
    }
}

// 切换代码换行
function toggleCodeWrap(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const codeContent = codeBlock.querySelector('.code-content');
    const pre = codeContent.querySelector('pre');

    if (pre.style.whiteSpace === 'pre-wrap') {
        pre.style.whiteSpace = 'pre';
        showSuccessToast('已关闭自动换行');
    } else {
        pre.style.whiteSpace = 'pre-wrap';
        showSuccessToast('已开启自动换行');
    }
}

// 复制带行号的代码
function copyCodeWithLineNumbers(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const codeElement = codeBlock.querySelector('code');
    if (!codeElement) return;

    const codeText = codeElement.textContent || codeElement.innerText;
    const lines = codeText.split('\n');
    const codeWithLineNumbers = lines.map((line, index) =>
        `${(index + 1).toString().padStart(3, ' ')} | ${line}`
    ).join('\n');

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(codeWithLineNumbers).then(() => {
            showSuccessToast('带行号代码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyCode(codeWithLineNumbers);
        });
    } else {
        fallbackCopyCode(codeWithLineNumbers);
    }
}

// 复制成功反馈
function showCopyFeedback(codeId) {
    const copyBtn = document.querySelector(`#${codeId} .copy-btn`);
    if (copyBtn) {
        copyBtn.classList.add('copied');

        setTimeout(() => {
            copyBtn.classList.remove('copied');
        }, 2000);
    }
}

// 现代化展开/折叠代码
function expandModernCode(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const codeContent = codeBlock.querySelector('.code-content');
    const expandBtn = codeBlock.querySelector('.expand-btn');
    const expandIcon = codeBlock.querySelector('.expand-btn i');

    if (codeContent) {
        const isCollapsed = codeContent.classList.contains('collapsed');

        if (isCollapsed) {
            // 展开代码
            codeContent.classList.remove('collapsed');
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-compress-alt"></i><span>折叠代码</span>';
            }
            if (expandIcon) {
                expandIcon.className = 'fas fa-compress-alt';
            }
        } else {
            // 折叠代码
            codeContent.classList.add('collapsed');
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-expand-alt"></i><span>展开代码</span>';
            }
            if (expandIcon) {
                expandIcon.className = 'fas fa-expand-alt';
            }
        }
    }
}

// 规范化语言名称
function normalizeLanguage(language) {
    if (!language) return 'text';

    const languageMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'py': 'python',
        'rb': 'ruby',
        'php': 'php',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'sql': 'sql',
        'sh': 'bash',
        'bash': 'bash',
        'zsh': 'bash',
        'fish': 'bash',
        'dockerfile': 'dockerfile',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'c++': 'cpp',
        'cs': 'csharp',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin',
        'scala': 'scala',
        'r': 'r',
        'md': 'markdown',
        'markdown': 'markdown',
        'vue': 'vue',
        'svelte': 'svelte'
    };

    const normalized = language.toLowerCase();
    return languageMap[normalized] || normalized;
}

// 获取语言显示名称
function getFileExtension(language) {
    const extensions = {
        'javascript': 'js',
        'typescript': 'ts',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'python': 'py',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'csharp': 'cs',
        'go': 'go',
        'rust': 'rs',
        'swift': 'swift',
        'kotlin': 'kt',
        'php': 'php',
        'ruby': 'rb',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yml',
        'yml': 'yml',
        'sql': 'sql',
        'markdown': 'md',
        'docker': 'dockerfile',
        'shell': 'sh',
        'bash': 'sh',
        'powershell': 'ps1',
        'typescript': 'ts',
        'vue': 'vue'
    };
    return extensions[language] || 'txt';
}

function getLanguageDisplayName(language) {
    const displayNames = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'jsx': 'React JSX',
        'tsx': 'React TSX',
        'python': 'Python',
        'java': 'Java',
        'c': 'C',
        'cpp': 'C++',
        'csharp': 'C#',
        'go': 'Go',
        'rust': 'Rust',
        'swift': 'Swift',
        'kotlin': 'Kotlin',
        'php': 'PHP',
        'ruby': 'Ruby',
        'html': 'HTML',
        'css': 'CSS',
        'scss': 'SCSS',
        'sass': 'Sass',
        'less': 'Less',
        'json': 'JSON',
        'xml': 'XML',
        'yaml': 'YAML',
        'sql': 'SQL',
        'bash': 'Bash',
        'dockerfile': 'Dockerfile',
        'markdown': 'Markdown',
        'vue': 'Vue',
        'svelte': 'Svelte',
        'r': 'R',
        'scala': 'Scala',
        'text': 'Text'
    };

    return displayNames[language] || language.toUpperCase();
}

// 增强的代码语法高亮
function highlightCode(code, language = 'text') {
    // 转义HTML特殊字符
    code = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 根据语言进行特定高亮
    switch (language) {
        case 'javascript':
        case 'typescript':
        case 'jsx':
        case 'tsx':
            return highlightJavaScript(code);
        case 'python':
            return highlightPython(code);
        case 'java':
            return highlightJava(code);
        case 'css':
        case 'scss':
        case 'sass':
            return highlightCSS(code);
        case 'html':
            return highlightHTML(code);
        case 'json':
            return highlightJSON(code);
        case 'sql':
            return highlightSQL(code);
        case 'bash':
            return highlightBash(code);
        default:
            return highlightGeneric(code);
    }
}

// JavaScript/TypeScript 高亮
function highlightJavaScript(code) {
    const keywords = /\b(function|const|let|var|if|else|for|while|return|class|extends|import|export|default|try|catch|finally|throw|new|this|typeof|instanceof|async|await|yield|break|continue|switch|case|in|of|from|as|static|public|private|protected|readonly|interface|type|enum|declare|module|namespace|abstract|implements|override)\b/g;
    const builtins = /\b(console|Array|Object|String|Number|Boolean|Date|RegExp|Promise|Map|Set|WeakMap|WeakSet|JSON|Math|parseInt|parseFloat|isNaN|isFinite|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|setTimeout|setInterval|clearTimeout|clearInterval)\b/g;

    // 注释
    code = code.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    // 字符串
    code = code.replace(/(.*?)((["'`])([^"'\\\n]*(\\.[^"'\\\n]*)*)\3)/g,
        function(match, prefix, string, quote, content) {
            // 检查是否在注释中
            if (prefix.includes('comment')) return match;
            return prefix + '<span class="string">' + string + '</span>';
        });

    // 模板字符串
    code = code.replace(/(`[^`]*?`)/g, '<span class="string">$1</span>');

    // 数字
    code = code.replace(/\b(\d+\.?\d*([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/g, '<span class="number">$1</span>');

    // 布尔值和null/undefined
    code = code.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span class="boolean">$1</span>');

    // 关键词
    code = code.replace(keywords, '<span class="keyword">$1</span>');

    // 内置对象
    code = code.replace(builtins, '<span class="variable">$1</span>');

    // 函数定义和调用
    code = code.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, '<span class="function">$1</span>');

    return code;
}

// Python 高亮
function highlightPython(code) {
    const keywords = /\b(def|class|if|elif|else|for|while|return|try|except|finally|raise|import|from|as|global|nonlocal|lambda|with|yield|async|await|break|continue|pass|in|is|not|and|or|True|False|None)\b/g;
    const builtins = /\b(print|len|range|enumerate|zip|map|filter|list|dict|set|tuple|str|int|float|bool|sum|min|max|abs|round|sorted|reversed|any|all|isinstance|type|hasattr|getattr|setattr|delattr|super|open|input|help|dir|id|hash|ord|chr|hex|oct|bin|format|repr)\b/g;

    // 注释
    code = code.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    // 字符串
    code = code.replace(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g, '<span class="string">$1$2$1</span>');
    code = code.replace(/("""|''')([\s\S]*?)\1/g, '<span class="string">$1$2$1</span>');

    // 数字
    code = code.replace(/\b(\d+\.?\d*([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/g, '<span class="number">$1</span>');

    // 布尔值和None
    code = code.replace(/\b(True|False|None)\b/g, '<span class="boolean">$1</span>');

    // 关键词
    code = code.replace(keywords, '<span class="keyword">$1</span>');

    // 内置函数
    code = code.replace(builtins, '<span class="variable">$1</span>');

    // 函数定义
    code = code.replace(/\b(def\s+)([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1<span class="function">$2</span>');
    code = code.replace(/\b(class\s+)([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1<span class="class">$2</span>');

    return code;
}

// Java 高亮
function highlightJava(code) {
    const keywords = /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|import|package|void|int|String|boolean|char|float|double|long|short|byte|if|else|for|while|do|switch|case|break|continue|return|try|catch|finally|throw|new|this|super|instanceof|null|true|false|synchronized|volatile|transient|native|strictfp|enum|assert)\b/g;
    const annotations = /@[A-Za-z_][A-Za-z0-9_]*/g;

    // 注释
    code = code.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    // 字符串
    code = code.replace(/(")((?:\\.|[^"\\])*)"/g, '<span class="string">$1$2$1</span>');
    code = code.replace(/(')(\\.|[^'\\])\1/g, '<span class="string">$1$2$1</span>');

    // 数字
    code = code.replace(/\b(\d+\.?\d*([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0[0-7]+)\b/g, '<span class="number">$1</span>');

    // 布尔值和null
    code = code.replace(/\b(true|false|null)\b/g, '<span class="boolean">$1</span>');

    // 注解
    code = code.replace(annotations, '<span class="comment">$1</span>');

    // 关键词
    code = code.replace(keywords, '<span class="keyword">$1</span>');

    // 函数调用
    code = code.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, '<span class="function">$1</span>');

    return code;
}

// CSS 高亮
function highlightCSS(code) {
    // 注释
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    // 选择器
    code = code.replace(/([.#]?[a-zA-Z][a-zA-Z0-9_-]*)(?=\s*[{])/g, '<span class="selector">$1</span>');

    // 属性
    code = code.replace(/([a-zA-Z-]+)(\s*:)/g, '<span class="property">$1</span>$2');

    // 值
    code = code.replace(/:(\s*)([^;{}]+)/g, ':$1<span class="string">$2</span>');

    // 颜色值
    code = code.replace(/#[0-9a-fA-F]{3,6}\b/g, '<span class="number">$1</span>');

    // 数字和单位
    code = code.replace(/\b(\d+\.?\d*)(px|em|rem|pt|%|vh|vw|vmin|vmax|deg|rad|s|ms|ch|ex|cm|mm|in|pc)\b/g, '<span class="number">$1$2</span>');

    // 重要标记
    code = code.replace(/!important/g, '<span class="keyword">$1</span>');

    return code;
}

// HTML 高亮
function highlightHTML(code) {
    // 注释
    code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>');

    // 标签
    code = code.replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)(.*?)(&gt;)/g, function(match, lt, tag, attrs, gt) {
        const highlightedTag = '<span class="tag">' + tag + '</span>';
        const highlightedAttrs = attrs.replace(/([a-zA-Z-]+)(=)(["'][^"']*["'])/g,
            '<span class="attribute">$1</span><span class="operator">$2</span><span class="string">$3</span>');
        return lt + highlightedTag + highlightedAttrs + gt;
    });

    return code;
}

// JSON 高亮
function highlightJSON(code) {
    // 字符串
    code = code.replace(/(")((?:\\.|[^"\\])*)":/g, '<span class="property">$1$2</span>:');
    code = code.replace(/:(\s*)("((?:\\.|[^"\\])*)")/g, ':$1<span class="string">$2</span>');

    // 数字
    code = code.replace(/:\s*(\d+\.?\d*([eE][+-]?\d+)?|true|false|null)/g, ': <span class="boolean">$1</span>');

    return code;
}

// SQL 高亮
function highlightSQL(code) {
    const keywords = /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|DATABASE|SCHEMA|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|DEFAULT|AUTO_INCREMENT|UNIQUE|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AS|BY|GROUP|ORDER|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MAX|MIN|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|CASE|WHEN|THEN|ELSE|END)\b/gi;

    // 字符串
    code = code.replace(/('((?:\\.|[^'\\])*)')/g, '<span class="string">$1</span>');

    // 数字
    code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

    // 关键词
    code = code.replace(keywords, '<span class="keyword">$1</span>');

    return code;
}

// Bash 高亮
function highlightBash(code) {
    const keywords = /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|break|continue|declare|local|readonly|export|unset|alias|unalias|echo|printf|read|cd|pwd|ls|cp|mv|rm|mkdir|rmdir|chmod|chown|grep|sed|awk|sort|uniq|wc|head|tail|find|tar|gzip|gunzip|ps|kill|top|df|du|mount|umount|su|sudo)\b/g;

    // 注释
    code = code.replace(/(#.*$)/gm, '<span class="comment">$1</span>');

    // 字符串
    code = code.replace(/("((?:\\.|[^"\\])*)")/g, '<span class="string">$1</span>');
    code = code.replace(/('((?:\\.|[^'\\])*)')/g, '<span class="string">$1</span>');

    // 变量
    code = code.replace(/\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g, '<span class="variable">$$$1</span>');

    // 关键词
    code = code.replace(keywords, '<span class="keyword">$1</span>');

    return code;
}

// 通用高亮
function highlightGeneric(code) {
    // 注释
    code = code.replace(/(\/\/.*$|#.*$)/gm, '<span class="comment">$1</span>');
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    // 字符串
    code = code.replace(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g, '<span class="string">$1$2$1</span>');

    // 数字
    code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

    // 常见关键词
    code = code.replace(/\b(true|false|null|undefined|True|False|None)\b/g, '<span class="boolean">$1</span>');

    // 函数调用
    code = code.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, '<span class="function">$1</span>');

    return code;
}

// 更新消息内容（用于流式输出）
let updateDebounceTimer = null;
let cursorBlinkTimer = null;
let isUserScrolling = false;
let autoScrollTimer = null;

// 监听用户滚动行为
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.addEventListener('scroll', function() {
            isUserScrolling = true;
            clearTimeout(autoScrollTimer);
            autoScrollTimer = setTimeout(() => {
                isUserScrolling = false;
            }, 2000); // 2秒后认为用户停止滚动，给用户更多时间
        });

        // 监听鼠标滚轮事件，更准确地检测用户滚动意图
        container.addEventListener('wheel', function() {
            isUserScrolling = true;
            clearTimeout(autoScrollTimer);
            autoScrollTimer = setTimeout(() => {
                isUserScrolling = false;
            }, 2000);
        });

        // 监听触摸事件（移动设备）
        container.addEventListener('touchmove', function() {
            isUserScrolling = true;
            clearTimeout(autoScrollTimer);
            autoScrollTimer = setTimeout(() => {
                isUserScrolling = false;
            }, 2000);
        });
    }
});

function updateMessageContent(messageId, content, isStreaming = true) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            let displayContent = formatMessageContent(content);

            // 如果正在流式输出，添加光标效果
            if (isStreaming) {
                displayContent += '<span class="typing-cursor">|</span>';
                messageElement.classList.add('streaming');
            } else {
                messageElement.classList.remove('streaming');
                // 清除光标闪烁定时器
                if (cursorBlinkTimer) {
                    clearInterval(cursorBlinkTimer);
                    cursorBlinkTimer = null;
                }
            }

            messageText.innerHTML = displayContent;

        // 确保代码块在所有阶段都保持一致的换行属性
        preserveCodeWrapping();

        // 在流式输出过程中也应用语法高亮和关键词标注，保持样式一致
        if (isStreaming) {
            // 使用防抖机制避免过于频繁的语法高亮
            clearTimeout(window.highlightDebounceTimer);
            window.highlightDebounceTimer = setTimeout(() => {
                // 标记当前消息为未高亮，以便重新应用高亮
                const messageElement = messageText.closest('.message');
                if (messageElement) {
                    messageElement.classList.remove('highlighted');

                    // 从消息元素获取 messageId
                    const messageId = messageElement.dataset.messageId;
                    if (messageId) {
                        highlightCodeInMessage(messageId);
                    }
                } else {
                    // 备用方案：处理所有未高亮的代码
                    highlightCodeInMessage();
                }

                preserveCodeWrapping();

                      }, 200); // 200ms防抖延迟
        }
        }

        // 使用防抖机制更新存储，避免频繁写入
        clearTimeout(updateDebounceTimer);
        updateDebounceTimer = setTimeout(() => {
            // 更新聊天记录中的内容
            const chat = chats.find(c => c.id === currentChatId);
            if (chat) {
                const message = chat.messages.find(m => m.id === messageId);
                if (message) {
                    message.content = content;
                    saveChatsToStorage();
                }
            }
        }, 500); // 500ms防抖

        // 只在非流式输出或用户未滚动时自动滚动
        if (!isStreaming || !isUserScrolling) {
            const container = document.getElementById('messagesContainer');
            container.scrollTo({
                top: container.scrollHeight,
                behavior: isStreaming ? 'auto' : 'smooth'
            });
        }
    }
}

// 完成流式输出时调用
function finishStreaming(messageId, finalContent) {
    updateMessageContent(messageId, finalContent, false);

    // 清除流式输出时的防抖定时器
    clearTimeout(window.highlightDebounceTimer);

    // 流式输出后应用语法高亮和关键词标注
    setTimeout(() => {
        // 强制移除 highlighted 标记，确保重新应用高亮
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.classList.remove('highlighted');
        }

        // 应用语法高亮，包含自定义关键词标注，指定 messageId
        highlightCodeInMessage(messageId);

        // 确保代码块的换行CSS属性被重新应用
        preserveCodeWrapping();

        }, 100);
}


// 切换代码块的展开/收起状态
function toggleCodeExpansion(codeId) {
    const codeBlockContainer = document.getElementById(codeId);
    const codeContent = document.getElementById(codeId + '-content');
    const expandBtn = document.getElementById(codeId + '-expand-btn');

    if (!codeBlockContainer || !codeContent || !expandBtn) return;

    const isExpanded = codeContent.classList.contains('expanded');
    const expandBtnText = expandBtn.querySelector('span');
    const expandBtnIcon = expandBtn.querySelector('i');
    const codeWrapper = codeContent.querySelector('.code-wrapper');
    const preElement = codeWrapper.querySelector('pre');
    const totalLines = preElement ? preElement.textContent.split('\n').length : 0;

    // 添加动画状态类
    expandBtn.classList.add('expanding');

    if (isExpanded) {
        // 收起代码
        codeBlockContainer.classList.remove('expanded');
        codeBlockContainer.classList.add('collapsed');
        codeContent.classList.remove('expanded');
        codeContent.classList.add('collapsed');

        expandBtn.classList.remove('expanded');
        expandBtnText.textContent = `展开 (+${Math.max(0, totalLines - 10)}行)`;
        expandBtnIcon.classList.remove('fa-chevron-up');
        expandBtnIcon.classList.add('fa-chevron-down');

        // 添加收起动画
        codeWrapper.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        codeWrapper.style.maxHeight = '300px';

        setTimeout(() => {
            codeWrapper.style.transition = '';
            expandBtn.classList.remove('expanding');
        }, 400);

        // 滚动到代码块顶部
        setTimeout(() => {
            codeContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
    } else {
        // 展开代码
        codeBlockContainer.classList.remove('collapsed');
        codeBlockContainer.classList.add('expanded');
        codeContent.classList.remove('collapsed');
        codeContent.classList.add('expanded');

        expandBtn.classList.add('expanded');
        expandBtnText.textContent = '收起';
        expandBtnIcon.classList.remove('fa-chevron-down');
        expandBtnIcon.classList.add('fa-chevron-up');

        // 添加展开动画
        const currentHeight = codeWrapper.scrollHeight;
        codeWrapper.style.transition = 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        codeWrapper.style.maxHeight = currentHeight + 'px';

        setTimeout(() => {
            codeWrapper.style.transition = '';
            codeWrapper.style.maxHeight = '';
            expandBtn.classList.remove('expanding');
        }, 500);

        // 滚动到代码块顶部
        codeContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 更新展开按钮的位置，确保它固定在代码块的可视中心
function updateExpandButtonPosition(expandBtn, codeContent) {
    // 移除所有动态定位样式，让CSS控制位置
    if (expandBtn) {
        expandBtn.style.position = '';
        expandBtn.style.left = '';
        expandBtn.style.bottom = '';
        expandBtn.style.transform = '';
        expandBtn.style.zIndex = '';
    }
}

// 确保代码块保持换行属性
function preserveCodeWrapping() {
    document.querySelectorAll('.code-content pre').forEach(pre => {
        pre.style.whiteSpace = 'pre'; // 保持原始格式
    });
}

// 语法高亮处理
function highlightCodeInMessage(messageId = null) {
    if (typeof Prism !== 'undefined') {
        // 确定要处理的消息范围
        let codeElements;
        if (messageId) {
            // 处理特定消息
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                codeElements = messageElement.querySelectorAll('pre code');
            }
        } else {
            // 处理所有未高亮的消息
            codeElements = document.querySelectorAll('.message:not(.highlighted) pre code');
        }

        // 手动应用Prism高亮
        codeElements.forEach((code) => {
            try {
                // 移除之前的Prism高亮类
                code.className = Array.from(code.classList)
                    .filter(cls => !cls.startsWith('token-'))
                    .join(' ');

                // 重新应用Prism高亮
                Prism.highlightElement(code);

                // 应用自定义关键词标注增强效果
                applyCustomKeywordHighlighting(code);

                // 高亮后立即保持换行属性，确保与CSS一致
                const pre = code.parentElement;
                if (pre) {
                    pre.style.whiteSpace = 'pre'; // 保持原始格式，不自动换行
                    pre.style.overflowX = 'auto';  // 允许横向滚动
                }
            } catch (e) {
                console.warn('Prism highlighting failed:', e);
            }
        });

        // 标记相关消息为已高亮
        if (messageId) {
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.classList.add('highlighted');
            }
        } else {
            // 标记所有未高亮的消息
            document.querySelectorAll('.message:not(.highlighted)').forEach(msg => {
                msg.classList.add('highlighted');
            });
        }
    }
}

// 应用自定义关键词标注增强效果
function applyCustomKeywordHighlighting(codeElement) {
    if (!codeElement) {
        console.warn('applyCustomKeywordHighlighting: codeElement is null or undefined');
        return;
    }

    // 查找语言类，支持多种可能的类名格式
    const classList = Array.from(codeElement.classList);
    let language = null;

    // 尝试查找 language-* 格式的类
    const languageClass = classList.find(cls => cls.startsWith('language-'));
    if (languageClass) {
        language = languageClass.replace('language-', '');
    }

    // 如果没找到，尝试其他可能的类名格式
    if (!language) {
        const langMatch = classList.find(cls => /lang|code|syntax/.test(cls));
        if (langMatch) {
            language = langMatch.replace(/^(lang|code|syntax)-/, '');
        }
    }

    // 如果还是没有找到，尝试从父元素获取语言信息
    if (!language) {
        const codeContainer = codeElement.closest('.code-block-container');
        if (codeContainer && codeContainer.dataset.language) {
            language = codeContainer.dataset.language;
        }
    }

    if (!language) {
        console.warn('applyCustomKeywordHighlighting: Could not determine language for code element:', codeElement);
        return;
    }

    // 确保语言名称标准化
    language = language.toLowerCase().trim();

    // 应用增强的关键词样式 - 扩展更多编程语言支持
    const keywords = {
        'javascript': ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'extends', 'import', 'export', 'new', 'this', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue', 'default'],
        'python': ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'async', 'await', 'yield', 'global', 'nonlocal', 'pass', 'break', 'continue', 'in', 'is', 'and', 'or', 'not'],
        'java': ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements', 'import', 'package', 'void', 'int', 'String', 'boolean', 'new', 'this', 'super', 'abstract', 'synchronized', 'volatile', 'transient', 'native', 'strictfp', 'enum', 'assert'],
        'cpp': ['int', 'float', 'double', 'char', 'bool', 'void', 'const', 'static', 'class', 'struct', 'public', 'private', 'protected', 'virtual', 'override', 'namespace', 'using', 'template', 'typename', 'constexpr', 'decltype', 'auto', 'nullptr', 'explicit', 'friend', 'inline', 'mutable', 'noexcept'],
        'c': ['int', 'float', 'double', 'char', 'void', 'const', 'static', 'extern', 'struct', 'union', 'enum', 'typedef', 'sizeof', 'include', 'define', 'ifdef', 'ifndef', 'endif', 'elif', 'pragma', 'volatile', 'register', 'restrict'],
        'css': ['color', 'background', 'border', 'margin', 'padding', 'width', 'height', 'display', 'position', 'font-size', 'font-weight', 'text-align', 'z-index', 'opacity', 'transform', 'transition', 'animation', 'flex', 'grid', 'box-shadow', 'border-radius'],
        'html': ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'script', 'style', 'link', 'meta', 'head', 'body', 'html', 'section', 'article', 'header', 'footer', 'nav'],
        'sql': ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'GROUP', 'BY', 'ORDER', 'HAVING', 'UNION', 'AND', 'OR', 'NOT', 'NULL', 'DISTINCT'],
        'php': ['function', 'class', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'return', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'interface', 'extends', 'implements', 'new', 'this', 'self', 'parent', 'try', 'catch', 'finally'],
        'ruby': ['def', 'class', 'module', 'if', 'else', 'elsif', 'unless', 'case', 'when', 'for', 'while', 'until', 'do', 'end', 'begin', 'rescue', 'ensure', 'return', 'yield', 'self', 'super', 'private', 'public', 'protected'],
        'go': ['func', 'var', 'const', 'type', 'struct', 'interface', 'if', 'else', 'for', 'switch', 'case', 'default', 'select', 'break', 'continue', 'return', 'go', 'defer', 'package', 'import', 'chan'],
        'rust': ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return', 'mod', 'use', 'pub', 'crate', 'super', 'self', 'unsafe'],
    };

    const languageKeywords = keywords[language] || [];

    // 遍历已存在的token并增强样式
    const tokens = codeElement.querySelectorAll('.token');

    // 调试信息
    console.log(`Applying custom highlighting for language: ${language}, found ${tokens.length} tokens`);

    tokens.forEach((token, index) => {
        const text = token.textContent.trim();

        // 统一的样式应用函数
        const applyEnhancedStyle = (type, styles) => {
            Object.assign(token.style, styles);
        };

        // 根据token类型应用不同的增强效果
        if (token.classList.contains('keyword')) {
            // 关键词增强效果 - 使用渐变背景
            if (languageKeywords.includes(text) || languageKeywords.length === 0) {
                applyEnhancedStyle('keyword', {
                    background: 'linear-gradient(135deg, rgba(255, 123, 114, 0.15) 0%, rgba(255, 107, 107, 0.1) 100%)',
                    borderRadius: '4px',
                    padding: '1px 3px',
                    border: '1px solid rgba(255, 123, 114, 0.2)',
                    fontWeight: '800'
                });
            }
        } else if (token.classList.contains('string')) {
            // 字符串增强效果
            applyEnhancedStyle('string', {
                background: 'linear-gradient(135deg, rgba(56, 139, 253, 0.2) 0%, rgba(102, 126, 234, 0.1) 100%)',
                borderRadius: '4px',
                padding: '2px 5px',
                fontWeight: '500',
                border: '1px solid rgba(56, 139, 253, 0.2)'
            });
        } else if (token.classList.contains('number')) {
            // 数字增强效果
            applyEnhancedStyle('number', {
                background: 'rgba(121, 192, 255, 0.12)',
                borderRadius: '3px',
                padding: '1px 3px',
                fontWeight: '700'
            });
        } else if (token.classList.contains('function')) {
            // 函数增强效果
            applyEnhancedStyle('function', {
                background: 'linear-gradient(135deg, rgba(210, 168, 255, 0.15) 0%, rgba(167, 139, 250, 0.1) 100%)',
                borderRadius: '4px',
                padding: '2px 4px',
                border: '1px solid rgba(210, 168, 255, 0.2)',
                fontWeight: '700'
            });
        } else if (token.classList.contains('comment')) {
            // 注释增强效果
            applyEnhancedStyle('comment', {
                color: '#8b949e',
                background: 'rgba(139, 148, 158, 0.15)',
                borderRadius: '3px',
                padding: '1px 4px',
                fontStyle: 'italic'
            });
        } else if (token.classList.contains('class-name')) {
            // 类名增强效果
            applyEnhancedStyle('class-name', {
                background: 'linear-gradient(135deg, rgba(126, 231, 135, 0.15) 0%, rgba(46, 213, 115, 0.1) 100%)',
                borderRadius: '4px',
                padding: '2px 4px',
                border: '1px solid rgba(126, 231, 135, 0.2)',
                fontWeight: '800'
            });
        } else if (token.classList.contains('operator')) {
            // 操作符增强效果
            applyEnhancedStyle('operator', {
                background: 'rgba(255, 123, 114, 0.1)',
                borderRadius: '2px',
                padding: '0 2px',
                fontWeight: '700'
            });
        } else if (token.classList.contains('variable')) {
            // 变量增强效果
            applyEnhancedStyle('variable', {
                background: 'linear-gradient(135deg, rgba(255, 166, 87, 0.12) 0%, rgba(251, 191, 36, 0.08) 100%)',
                borderRadius: '3px',
                padding: '1px 3px',
                fontWeight: '600'
            });
        } else if (token.classList.contains('tag')) {
            // HTML标签增强效果
            applyEnhancedStyle('tag', {
                background: 'linear-gradient(135deg, rgba(126, 231, 135, 0.15) 0%, rgba(46, 213, 115, 0.1) 100%)',
                borderRadius: '4px',
                padding: '2px 4px',
                border: '1px solid rgba(126, 231, 135, 0.2)',
                fontWeight: '800'
            });
        } else if (token.classList.contains('attribute')) {
            // 属性增强效果
            applyEnhancedStyle('attribute', {
                background: 'rgba(210, 168, 255, 0.08)',
                borderRadius: '2px',
                padding: '1px 3px',
                fontWeight: '600'
            });
        } else if (token.classList.contains('boolean') || token.classList.contains('null')) {
            // 布尔值和null增强效果
            applyEnhancedStyle('boolean', {
                background: 'linear-gradient(135deg, rgba(255, 123, 114, 0.15) 0%, rgba(255, 107, 107, 0.1) 100%)',
                borderRadius: '4px',
                padding: '2px 4px',
                border: '1px solid rgba(255, 123, 114, 0.2)',
                fontWeight: '800'
            });
        }
    });

    console.log(`Applied custom highlighting to ${tokens.length} tokens in ${language} code`);
}

// 更新思考过程
function updateThinkingProcess(messageId, thinkingContent, isStreaming = true) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement || messageElement.querySelector('.thinking-process')) {
        // 如果消息元素不存在或已经有思考过程，则更新现有内容
        updateExistingThinkingProcess(messageId, thinkingContent, isStreaming);
        return;
    }

    // 创建新的思考过程元素
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-process';
    thinkingDiv.innerHTML = `
        <div class="thinking-title">
            <i class="fas fa-brain"></i>
            思考过程
        </div>
        <div class="thinking-content">${formatMessageContent(thinkingContent)}${isStreaming ? '<span class="typing-cursor">|</span>' : ''}</div>
    `;

    // 将思考过程插入到消息内容之前
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
        messageElement.insertBefore(thinkingDiv, messageContent);
    }

    // 更新聊天记录中的思考内容
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message) {
            message.thinking = thinkingContent;
            // 使用防抖机制更新存储
            clearTimeout(updateDebounceTimer);
            updateDebounceTimer = setTimeout(() => {
                saveChatsToStorage();
            }, 500);
        }
    }

    // 只在非流式输出或用户未滚动时自动滚动
    if (!isStreaming || !isUserScrolling) {
        const container = document.getElementById('messagesContainer');
        container.scrollTo({
            top: container.scrollHeight,
            behavior: isStreaming ? 'auto' : 'smooth'
        });
    }
}

// 更新现有的思考过程
function updateExistingThinkingProcess(messageId, thinkingContent, isStreaming = true) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;

    const thinkingDiv = messageElement.querySelector('.thinking-process');
    if (!thinkingDiv) return;

    const thinkingContentDiv = thinkingDiv.querySelector('.thinking-content');
    if (thinkingContentDiv) {
        thinkingContentDiv.innerHTML = formatMessageContent(thinkingContent) + (isStreaming ? '<span class="typing-cursor">|</span>' : '');
    }

    // 更新聊天记录
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message) {
            message.thinking = thinkingContent;
        }
    }
}

// 消息发送
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    // 检查是否有内容或文件
    if (!message && uploadedFiles.length === 0) return;
    if (isGenerating) return;

    // 设置生成状态
    isGenerating = true;
    currentAbortController = new AbortController();
    updateSendButton();

    // 构建用户消息内容
    let messageContent = message;
    let attachments = [];

    // 处理上传的文件
    if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(file => file.name).join(', ');
        const fileListText = uploadedFiles.map(file =>
            `- ${file.name} (${formatFileSize(file.size)})`
        ).join('\n');

        if (messageContent) {
            messageContent += `\n\n上传的文件:\n${fileListText}`;
        } else {
            messageContent = `上传了以下文件:\n${fileListText}`;
        }

        attachments = [...uploadedFiles];
    }

    const userMessage = {
        id: generateId(),
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
    };

    // 添加用户消息
    addMessageToChat(userMessage);
    input.value = '';
    updateSendButton();
    autoResizeTextarea(input);

    // 清空已上传文件
    const filesToProcess = uploadedFiles.splice(0);
    updateUploadedFilesDisplay();

    // 显示加载指示器
    showLoadingIndicator();

    try {
        // 创建AI消息占位符
        const assistantMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            thinking: '',
            timestamp: new Date().toISOString()
        };

        addMessageToChat(assistantMessage);
        updateChatTitle(messageContent);

        // 处理图片文件（取第一张图片作为视觉输入）
        let imageData = null;
        const imageFile = filesToProcess.find(file => file.type === 'image');

        console.log('🔍 调试信息 - 文件列表:', filesToProcess.map(f => ({ name: f.name, type: f.type, hasBackendData: !!f.backendData })));
        console.log('🔍 调试信息 - 找到的图片文件:', imageFile);

        if (imageFile && imageFile.backendData) {
            imageData = imageFile.backendData.url; // 使用后端返回的图片URL
            console.log('🔍 调试信息 - 图片路径:', imageData);
            console.log('🔍 调试信息 - 图片文件名:', imageFile.backendData.filename);

            // 验证base64格式
            if (!imageData.startsWith('data:image/')) {
                console.error('❌ 错误：图片数据不是有效的base64格式');
                throw new Error('图片数据格式错误');
            }

            // 提取纯base64数据（去掉data:image/...;base64,前缀）
            const base64Data = imageData.split(',')[1];
            if (!base64Data) {
                console.error('❌ 错误：无法提取base64数据');
                throw new Error('base64数据提取失败');
            }

            console.log('🔍 调试信息 - 纯base64数据长度:', base64Data.length);
        } else {
            console.warn('⚠️ 警告：未找到有效的图片文件或图片数据');
        }

        // 构建增强的提示文本
        let enhancedPrompt = messageContent;
        if (filesToProcess.length > 0) {
            const imageFiles = filesToProcess.filter(file => file.type === 'image');
            const docFiles = filesToProcess.filter(file => file.type === 'document');

            if (imageFiles.length > 0) {
                enhancedPrompt += `\n\n请分析我上传的${imageFiles.length}张图片${docFiles.length > 0 ? `和${docFiles.length}个文档` : ''}。`;
                if (imageData) {
                    enhancedPrompt += `首先详细描述图片内容，然后回答我的问题。`;
                }
            } else if (docFiles.length > 0) {
                enhancedPrompt += `\n\n我上传了${docFiles.length}个文档。请告诉我你可以如何帮助处理这些文档。`;
            }
        }

        // 调用后端API（支持图片识别）
        if (imageData) {
            // 有图片时使用后端图片分析API
            const response = await callBackendVisionAPI(enhancedPrompt, imageData, selectedModel);
            updateMessageContent(assistantMessage.id, response.response, true);
            finishStreaming(assistantMessage.id, response.response);
        } else {
            // 纯文本对话使用原有的GLM API（带流式输出）
            const response = await callGLMAPIWithRetry(enhancedPrompt, getChatHistory(), null,
                // 更新回答内容
                (streamContent) => {
                    updateMessageContent(assistantMessage.id, streamContent, true);
                },
                // 更新思考过程
                (thinkingContent) => {
                    updateThinkingProcess(assistantMessage.id, thinkingContent);
                },
                currentAbortController.signal,
                2  // 最多重试2次
            );
            finishStreaming(assistantMessage.id, response.content);
        }

        // 更新思考过程的最终内容
        if (response.thinking) {
            updateThinkingProcess(assistantMessage.id, response.thinking, false);
        }

        // 答案生成完毕后，强制跳转到底部
        setTimeout(() => {
            const container = document.getElementById('messagesContainer');
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100); // 短暂延迟确保DOM更新完成

    } catch (error) {
        if (error.name === 'AbortError') {
            // 用户主动停止，不显示错误信息
            console.log('消息生成被用户停止');
        } else {
            console.error('发送消息失败:', error);
            showErrorToast('发送消息失败，请稍后重试');
        }
    } finally {
        isGenerating = false;
        currentAbortController = null;
        updateSendButton();
        hideLoadingIndicator();
    }
}

function addMessageToChat(message) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push(message);
        chat.updatedAt = new Date().toISOString();

        // 如果是第一条消息，更新标题
        if (chat.messages.length === 1 && message.role === 'user') {
            chat.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
        }

        saveChatsToStorage();
        renderMessages(chat.messages);
        updateChatHistory();
    }
}

function updateChatTitle(firstMessage) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat && chat.title === '新对话') {
        chat.title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
        updateChatHistory();
    }
}

function getChatHistory() {
    const chat = chats.find(c => c.id === currentChatId);
    return chat ? chat.messages.map(msg => ({ role: msg.role, content: msg.content })) : [];
}

// GLM API 调用（支持流式输出和思考过程）
async function callGLMAPI(message, history, imageData = null, onUpdate = null, onThinkingUpdate = null, abortSignal = null) {
    try {
        // 获取选择的模型
        const rawModelValue = document.getElementById('modelSelector').value || 'glm-4.6';

        // 使用BACKEND_MODELS映射获取正确的模型名称
        let selectedModel = BACKEND_MODELS[rawModelValue] || rawModelValue;
        let useBackup = false;

        console.log('🔍 调试信息 - 用户选择的模型:', rawModelValue);
        console.log('🔍 调试信息 - 主要API模型名称:', selectedModel);

        // 验证Vision模型的使用
        const isVisionModel = selectedModel.includes('v') || selectedModel.includes('vision');
        if (imageData && !isVisionModel) {
            showWarningToast('检测到图片但未选择Vision模型，建议切换到GLM-4 Vision或GLM-4V Plus以获得更好的图片识别效果');
        }

        // 获取深度思考模式状态
        const isDeepThinking = document.getElementById('deepThinkingToggle')?.classList.contains('active') || false;

        // 构建对话历史 (GLM API 格式)
        const messages = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        // 构建当前消息内容
        let currentContent;
        if (imageData) {
            // 如果有图片，构建多模态消息，优化图片提示
            const enhancedMessage = enhanceImagePrompt(message);

            // 智能处理图片格式 - 尝试多种可能的格式
            let formattedImageData = imageData;

            // 根据GLM API文档，尝试不同的图片格式
            if (imageData.startsWith('data:image/')) {
                // 格式1: 完整的data URL (data:image/jpeg;base64,/9j/4AAQSkZJRgABA...)
                formattedImageData = imageData;
            } else {
                throw new Error('图片数据格式不正确，期望data:image/格式');
            }

            console.log('🔍 调试信息 - 使用的图片格式:', formattedImageData.substring(0, 80) + '...');

            // 验证图片URL格式
            const imageMatch = formattedImageData.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!imageMatch) {
                throw new Error('图片URL格式不匹配预期模式');
            }

            const imageType = imageMatch[1];
            const base64Data = imageMatch[2];

            console.log('🔍 调试信息 - 图片类型:', imageType);
            console.log('🔍 调试信息 - Base64数据长度:', base64Data.length);
            console.log('🔍 调试信息 - Base64数据开头:', base64Data.substring(0, 50));

            // 检查常见图片类型
            const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!supportedTypes.includes(imageType)) {
                throw new Error(`不支持的图片类型: ${imageType}，支持的类型: ${supportedTypes.join(', ')}`);
            }

            currentContent = [
                {
                    type: "text",
                    text: enhancedMessage
                },
                {
                    type: "image_url",
                    image_url: {
                        url: formattedImageData
                    }
                }
            ];

            console.log('🔍 调试信息 - 构建的多模态消息:', JSON.stringify(currentContent, null, 2));
        } else {
            // 纯文本消息
            currentContent = message;
        }

        // 添加当前消息到对话历史
        messages.push({
            role: 'user',
            content: currentContent
        });

        // 根据是否有图片调整参数
        const requestBody = {
            model: selectedModel,
            messages: messages,
            temperature: isDeepThinking ? 0.3 : (imageData ? 0.2 : 0.7),  // 图片识别时降低随机性
            top_p: 0.95,
            max_tokens: isDeepThinking ? 4096 : (imageData ? 3000 : 2048),  // 图片识别时增加输出长度
            stream: true  // 启用流式输出
        };

        // 调试信息：记录完整的请求体（隐藏敏感信息）
        console.log('🔍 调试信息 - API请求参数:', {
            model: requestBody.model,
            hasMessages: requestBody.messages && requestBody.messages.length > 0,
            messageCount: requestBody.messages.length,
            hasImageData: !!imageData,
            temperature: requestBody.temperature,
            max_tokens: requestBody.max_tokens,
            stream: requestBody.stream
        });

        // 如果有图片，记录消息结构的详细信息
        if (imageData) {
            console.log('🔍 调试信息 - 完整请求消息结构:', JSON.stringify(messages, null, 2));
        }

        const response = await fetch(getGLMApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GLM_API_KEY}`  // 使用完整的API密钥
            },
            body: JSON.stringify(requestBody),
            signal: abortSignal
        });

        console.log('🔍 调试信息 - API响应状态:', response.status, response.statusText);

        // 智能重试逻辑：如果模型不存在，尝试多个备用模型
        if (!response.ok && response.status === 400 && !useBackup) {
            const responseText = await response.text();
            console.error('🔍 调试信息 - 原始错误响应:', responseText);

            try {
                const errorData = JSON.parse(responseText);
                if (errorData.error?.message?.includes('模型不存在')) {
                    console.log('🔄 主模型失败，尝试多个备用模型...');

                    // 获取所有可能的备用模型
                    const backupModels = Object.keys(BACKUP_GLM_MODELS)
                        .filter(key => key === rawModelValue)
                        .map(key => BACKUP_GLM_MODELS[key]);

                    if (backupModels.length > 0) {
                        for (let i = 0; i < backupModels.length; i++) {
                            const backupModel = backupModels[i];
                            console.log(`🔄 尝试备用模型 ${i + 1}/${backupModels.length}: ${backupModel}`);

                            // 重新构建请求体
                            requestBody.model = backupModel;
                            console.log('🔍 调试信息 - 使用备用模型:', backupModel);

                            const retryResponse = await fetch(getGLMApiUrl(), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${GLM_API_KEY}`  // 使用完整的API密钥
                                },
                                body: JSON.stringify(requestBody),
                                signal: abortSignal
                            });

                            if (retryResponse.ok) {
                                console.log('✅ 备用模型调用成功:', backupModel);
                                selectedModel = backupModel;
                                useBackup = true;
                                // 替换响应对象，继续使用现有的成功处理逻辑
                                response = retryResponse;
                                break; // 成功，退出重试循环
                            } else {
                                const retryErrorText = await retryResponse.text();
                                console.log(`❌ 备用模型 ${backupModel} 失败: ${retryResponse.status}`);
                                console.error('🔍 备用模型错误响应:', retryErrorText);
                            }

                            // 添加延迟避免频率限制
                            if (i < backupModels.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                    }

                    if (!useBackup) {
                        console.log('❌ 所有备用模型都失败了');
                    }
                }
            } catch (jsonError) {
                console.error('🔍 解析错误响应失败:', jsonError);
            }
        }

        if (!response.ok) {
            let errorMessage = `API Error: ${response.status}`;
            let errorDetails = {};

            try {
                const responseText = await response.text();
                console.error('🔍 调试信息 - 原始错误响应:', responseText);

                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (jsonError) {
                    console.error('🔍 调试信息 - JSON解析失败，使用原始文本');
                    errorData = { raw_response: responseText };
                }

                errorDetails = errorData;

                // 处理GLM API的特定错误码
                switch (response.status) {
                    case 400:
                        errorMessage += ' - 请求参数错误';
                        if (errorData.error?.message?.includes('image')) {
                            errorMessage += ' (图片格式或大小问题)';
                        } else if (errorData.error?.message?.includes('base64')) {
                            errorMessage += ' (base64编码问题)';
                        } else if (errorData.error?.message?.includes('format')) {
                            errorMessage += ' (消息格式问题)';
                        }
                        break;
                    case 401:
                        errorMessage += ' - API密钥无效或已过期';
                        break;
                    case 403:
                        errorMessage += ' - 没有API调用权限';
                        break;
                    case 429:
                        errorMessage += ' - 请求频率过高，请稍后重试';
                        break;
                    case 500:
                        errorMessage += ' - 服务器内部错误';
                        break;
                    default:
                        errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`;
                }

                console.error('💥 GLM API 错误详情:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorDetails,
                    requestBody: {
                        model: requestBody.model,
                        hasImageData: !!imageData,
                        messageCount: requestBody.messages.length
                    }
                });

                throw new Error(`${errorMessage}\n详细错误: ${JSON.stringify(errorDetails, null, 2)}`);

            } catch (parseError) {
                console.error('💥 解析错误响应时发生异常:', parseError);
                throw new Error(`${errorMessage} - 服务响应解析异常: ${parseError.message}`);
            }
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        let thinkingContent = '';
        let isThinkingComplete = false;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta;

                            // GLM API使用reasoning_content字段进行流式输出
                            const reasoningContent = delta?.reasoning_content || '';
                            const normalContent = delta?.content || '';

                            if (reasoningContent) {
                                // 思考过程内容
                                thinkingContent += reasoningContent;
                                if (onThinkingUpdate) {
                                    onThinkingUpdate(thinkingContent);
                                }
                            } else if (normalContent) {
                                // 正常回答内容
                                if (!isThinkingComplete && thinkingContent) {
                                    isThinkingComplete = true;
                                }
                                fullResponse += normalContent;
                                if (onUpdate) {
                                    onUpdate(fullResponse);
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', data);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // 返回包含思考过程的完整结果
        return {
            content: fullResponse,
            thinking: thinkingContent
        };

    } catch (error) {
        console.error('GLM API 调用失败:', error);

        // 如果 API 调用失败，提供一个友好的错误回复
        return {
            content: `抱歉，我暂时无法连接到 GLM AI 服务（错误：${error.message}）。请检查网络连接或稍后重试。

作为 AI 家教助手，我通常可以帮助您：
• 解答学习中的问题
• 分析图片内容
• 阅读和理解文档
• 提供学习建议和知识点总结

请稍后再次尝试发送消息。`,
            thinking: ''
        };
    }
}

// 输入处理
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function updateSendButton() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    if (isGenerating) {
        // 生成中，显示停止按钮
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        sendBtn.title = '停止生成';
        sendBtn.setAttribute('onclick', 'stopGeneration()');
    } else {
        // 非生成中，显示发送按钮
        const hasContent = input.value.trim() || uploadedFiles.length > 0;
        sendBtn.disabled = !hasContent;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.title = '发送消息';
        sendBtn.setAttribute('onclick', 'sendMessage()');
    }
}

function stopGeneration() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }

    if (isGenerating) {
        isGenerating = false;
        updateSendButton();
        hideLoadingIndicator();
        showInfoToast('已停止生成');
    }
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// 图片上传处理
function attachImageFile() {
    document.getElementById('imageFileInput').click();
}

function handleImageFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;

    // 只处理图片文件
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showErrorToast('请选择图片文件');
        return;
    }

    // 处理图片文件
    processImageFiles(imageFiles);

    // 重置input值，允许重复选择同一文件
    event.target.value = '';
}

async function processImageFiles(files) {
    for (const file of files) {
        try {
            // 验证图片格式
            const validFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validFormats.includes(file.type)) {
                showErrorToast(`文件 ${file.name} 格式不支持，请使用 JPG、PNG、GIF 或 WebP 格式`);
                continue;
            }

            // 检查文件大小（GLM Vision API限制为10MB）
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showErrorToast(`文件 ${file.name} 大小 ${Math.round(file.size / 1024 / 1024)}MB 超过10MB限制`);
                continue;
            }

            // 检查最小文件大小（避免损坏文件）
            if (file.size < 1024) {
                showErrorToast(`文件 ${file.name} 太小，可能已损坏`);
                continue;
            }

            // 检查是否已存在
            if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                showErrorToast(`文件 ${file.name} 已存在`);
                continue;
            }

            // 显示处理状态
            showInfoToast(`正在上传图片到后端: ${file.name}`);

            // 上传图片到后端
            const uploadResult = await uploadImageToBackend(file);

            const fileData = {
                id: generateId(),
                name: file.name,
                originalFile: file, // 保存原始文件对象
                type: 'image',
                mimeType: file.type,
                size: file.size,
                backendData: uploadResult // 保存后端返回的数据
            };
            uploadedFiles.push(fileData);

        } catch (error) {
            console.error('处理图片文件失败:', file.name, error);
            showErrorToast(`处理图片文件 "${file.name}" 失败: ${error.message}`);
        }
    }

    // 更新显示
    updateUploadedFilesDisplay();

    if (files.length > 0) {
        showSuccessToast(`已上传 ${files.length} 个图片文件到后端`);
        // 自动切换到Vision模型
        document.getElementById('modelSelector').value = 'glm-4.6-vision';
    }
}

// 上传图片到后端API
async function uploadImageToBackend(file) {
    console.log('🚀 开始上传图片到后端:', file.name);

    // 检查后端服务器状态
    const isBackendOnline = await checkBackendStatus();
    if (!isBackendOnline) {
        throw new Error('后端服务器不可用，请检查服务器是否启动');
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${BACKEND_URL}/api/upload-image`, {
            method: 'POST',
            body: formData,
            timeout: API_TIMEOUT
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`上传失败: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ 图片上传到后端成功:', result.file);
        return result.file;

    } catch (error) {
        console.error('❌ 图片上传到后端失败:', error);
        throw error;
    }
}

// 文件处理
function attachFile() {
    document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;

    // 清空文件输入，允许重复选择相同文件
    event.target.value = '';

    // 检查文件数量限制
    if (uploadedFiles.length + files.length > 5) {
        showErrorToast('最多只能同时上传5个文件');
        return;
    }

    // 处理每个文件
    const filesToProcess = [];

    for (const file of files) {
        // 检查文件大小
        if (file.size > 10 * 1024 * 1024) {
            showErrorToast(`文件 "${file.name}" 大小超过10MB`);
            continue;
        }

        // 检查文件类型（只处理文档，图片由专门的图片上传功能处理）
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

        if (!allowedTypes.includes(file.type)) {
            showErrorToast(`文件 "${file.name}" 格式不支持，请使用图片上传按钮上传图片`);
            continue;
        }

        // 检查是否已经上传过同名文件
        if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showErrorToast(`文件 "${file.name}" 已经上传过了`);
            continue;
        }

        filesToProcess.push(file);
    }

    // 处理有效文件
    processMultipleFiles(filesToProcess);
}

async function processMultipleFiles(files) {
    for (const file of files) {
        try {
            // 只处理文档文件，图片由专门的图片上传功能处理
            if (file.type.startsWith('image/')) {
                continue; // 跳过图片文件
            }

            // 文档文件 - 只保存基本信息
            const fileData = {
                id: generateId(),
                name: file.name,
                type: 'document',
                mimeType: file.type,
                size: file.size,
                data: null
            };
            uploadedFiles.push(fileData);
        } catch (error) {
            console.error('处理文件失败:', file.name, error);
            showErrorToast(`处理文件 "${file.name}" 失败`);
        }
    }

    // 更新UI显示
    updateUploadedFilesDisplay();

    if (files.length > 0) {
        showSuccessToast(`成功上传 ${files.length} 个文件`);
    }
}

function updateUploadedFilesDisplay() {
    const container = document.getElementById('uploadedFilesContainer');
    const list = document.getElementById('uploadedFilesList');

    if (uploadedFiles.length === 0) {
        container.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = '';

    uploadedFiles.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'uploaded-file-item';
        fileItem.setAttribute('data-file-id', file.id);

        // 获取文件图标
        const fileIcon = getFileIcon(file.type, file.mimeType);

        // 格式化文件大小
        const fileSize = formatFileSize(file.size);

        fileItem.innerHTML = `
            <i class="${fileIcon} file-icon"></i>
            <span class="file-name" title="${file.name}">${file.name}</span>
            <span class="file-size">(${fileSize})</span>
            <button class="remove-file-btn" onclick="removeUploadedFile('${file.id}')" title="删除文件">
                <i class="fas fa-times"></i>
            </button>
        `;

        list.appendChild(fileItem);
    });
}

function getFileIcon(type, mimeType) {
    if (type === 'image') {
        return 'fas fa-image';
    }

    switch (mimeType) {
        case 'application/pdf':
            return 'fas fa-file-pdf';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'fas fa-file-word';
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            return 'fas fa-file-powerpoint';
        default:
            return 'fas fa-file';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function removeUploadedFile(fileId) {
    uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
    updateUploadedFilesDisplay();
    showInfoToast('文件已移除');
}

function clearUploadedFiles() {
    if (uploadedFiles.length === 0) return;

    if (confirm('确定要清除所有上传的文件吗？')) {
        uploadedFiles = [];
        updateUploadedFilesDisplay();
        showInfoToast('所有文件已清除');
    }
}


function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            console.log('🔍 调试信息 - 原始base64结果:', result.substring(0, 100) + '...');
            resolve(result);
        };
        reader.onerror = error => {
            console.error('🔍 调试信息 - base64转换失败:', error);
            reject(error);
        };
    });
}

// 备用方法：转换为纯base64（没有data URL前缀）
function fileToPureBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function() {
            const arrayBuffer = this.result;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            console.log('🔍 调试信息 - 纯base64结果长度:', base64.length);
            resolve(base64);
        };
        reader.onerror = error => {
            console.error('🔍 调试信息 - 纯base64转换失败:', error);
            reject(error);
        };
        reader.readAsArrayBuffer(file);
    });
}

// UI 控制
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = '浅色模式';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeText.textContent = '深色模式';
    }
}

// 深度思考模式切换
function toggleDeepThinking() {
    const deepThinkingToggle = document.getElementById('deepThinkingToggle');
    const isActive = deepThinkingToggle.classList.contains('active');

    updateDeepThinkingToggle(!isActive);

    // 保存状态到本地存储
    localStorage.setItem('deepThinking', !isActive);

    // 显示提示
    showInfoToast(!isActive ? '深度思考模式已开启，回答会更详细' : '深度思考模式已关闭');
}

function updateDeepThinkingToggle(isActive) {
    const deepThinkingToggle = document.getElementById('deepThinkingToggle');

    if (isActive) {
        deepThinkingToggle.classList.add('active');
    } else {
        deepThinkingToggle.classList.remove('active');
    }
}

function toggleKnowledgePanel() {
    const panel = document.getElementById('knowledgePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    updateKnowledgeList();
}

function clearChat() {
    if (currentChatId && confirm('确定要清空当前对话吗？')) {
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages = [];
            chat.updatedAt = new Date().toISOString();
            saveChatsToStorage();
            renderMessages(chat.messages);
        }
    }
}

function exportChat() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.messages.length === 0) {
        showErrorToast('没有可导出的对话内容');
        return;
    }

    const exportData = {
        title: chat.title,
        createdAt: chat.createdAt,
        messages: chat.messages
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI家教对话_${chat.title}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showSuccessToast('对话导出成功');
}

// 模型切换处理
function onModelChange() {
    const modelSelector = document.getElementById('modelSelector');
    const selectedModelValue = modelSelector.value;
    const actualModel = GLM_MODELS[selectedModelValue] || selectedModelValue;
    const imageUploadBtn = document.querySelector('.image-upload-btn');

    console.log('🔍 模型切换 - 用户选择:', selectedModelValue, '实际API模型:', actualModel);

    // 如果有图片文件但选择了非Vision模型，提醒用户
    const isVisionModel = actualModel.includes('v') || actualModel.includes('vision');
        if (!isVisionModel && uploadedFiles.some(f => f.type === 'image')) {
        showInfoToast('已切换到非视觉模型，图片识别功能将不可用');
    }

    // 更新图片上传按钮状态
    if (imageUploadBtn) {
        if (isVisionModel) {
            imageUploadBtn.classList.add('active');
            imageUploadBtn.title = '上传图片 (Vision模式已启用)';
        } else {
            imageUploadBtn.classList.remove('active');
            imageUploadBtn.title = '上传图片 (建议切换到Vision模型)';
        }
    }
}

// 优化图片识别的提示词
function enhanceImagePrompt(originalMessage) {
    // 如果用户没有明确的图片分析需求，添加通用提示
    const visionKeywords = ['图片', '图像', '照片', '截图', '看', '识别', '分析', '描述', '内容', '有什么', '是什么', '怎么样'];
    const hasVisionKeyword = visionKeywords.some(keyword => originalMessage.includes(keyword));

    if (!hasVisionKeyword && originalMessage.trim().length < 20) {
        // 短消息且没有视觉关键词，添加图片分析引导
        return `请分析这张图片：${originalMessage}`;
    }

    return originalMessage;
}

// API重试机制
async function callGLMAPIWithRetry(message, history, imageData = null, onUpdate = null, onThinkingUpdate = null, abortSignal = null, maxRetries = 2) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            // 显示API调用状态
            if (attempt === 1) {
                showInfoToast(imageData ? '正在分析图片...' : '正在连接AI服务...');
            } else if (attempt > 1) {
                showInfoToast(`重试第${attempt - 1}次...`);
            }

            const result = await callGLMAPI(message, history, imageData, onUpdate, onThinkingUpdate, abortSignal);

            // 成功调用
            hideApiStatus();
            return result;

        } catch (error) {
            lastError = error;
            console.error(`API调用失败 (尝试 ${attempt}/${maxRetries + 1}):`, error);

            // 如果是最后一次尝试，直接抛出错误
            if (attempt > maxRetries) {
                showApiError(error.message);
                throw error;
            }

            // 检查是否应该重试
            if (!shouldRetry(error)) {
                showApiError(error.message);
                throw error;
            }

            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }

    throw lastError;
}

// 判断错误是否应该重试
function shouldRetry(error) {
    const retryableErrors = [
        '请求频率过高',
        '服务器内部错误',
        '网络连接错误',
        'timeout',
        'ETIMEDOUT',
        'ENOTFOUND'
    ];

    return retryableErrors.some(retryableError =>
        error.message.includes(retryableError)
    );
}

// 显示API状态
function showApiStatus(message) {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'api-status';
    statusDiv.className = 'api-status';
    statusDiv.innerHTML = `
        <div class="api-status-content">
            <i class="fas fa-spinner fa-spin"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(statusDiv);
}

// 显示API错误
function showApiError(message) {
    hideApiStatus();
    showErrorToast(`API调用失败: ${message}`);
}

// 隐藏API状态
function hideApiStatus() {
    const statusDiv = document.getElementById('api-status');
    if (statusDiv) {
        statusDiv.remove();
    }
}

// 测试GLM API连接
async function testGLMAPI() {
    try {
        showInfoToast('正在测试API连接...');
        logAPIDebug('开始API连接测试');
        logAPIDebug(`API密钥: ${GLM_API_KEY.substring(0, 10)}...${GLM_API_KEY.substring(GLM_API_KEY.length - 10)}`);
        logAPIDebug(`API端点: ${getGLMApiUrl()}`);

        // 直接测试简单的API调用，不通过复杂的callGLMAPI函数
        const testRequestBody = {
            model: 'glm-4',
            messages: [
                {
                    role: 'user',
                    content: '请回复"连接成功"'
                }
            ],
            temperature: 0.7,
            max_tokens: 10,
            stream: false
        };

        logAPIDebug('发送测试请求:');
        logAPIDebug(JSON.stringify(testRequestBody, null, 2));

        const response = await fetch(getGLMApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GLM_API_KEY}`
            },
            body: JSON.stringify(testRequestBody)
        });

        logAPIDebug(`API响应状态: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const result = await response.json();
            logAPIDebug('API响应成功:');
            logAPIDebug(JSON.stringify(result, null, 2));
            showSuccessToast('API连接测试成功！GLM功能正常');
            hideApiStatus();
        } else {
            const errorText = await response.text();
            logAPIDebug(`API响应失败: ${errorText}`, 'error');
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

    } catch (error) {
        console.error('API测试失败:', error);
        logAPIDebug(`API测试异常: ${error.message}`, 'error');
        showErrorToast(`API连接测试失败: ${error.message}`);
        hideApiStatus();
    }
}

// API调试日志函数
function logAPIDebug(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[API测试 ${timestamp}] ${prefix} ${message}`);
}

// 测试不同的GLM模型
async function testGLMModels() {
    const possibleModels = [
        { name: 'GLM-4', id: 'glm-4' },
        { name: 'GLM-4 Plus', id: 'glm-4-plus' },
        { name: 'GLM-4V', id: 'glm-4v' },
        { name: 'GLM-4V Plus', id: 'glm-4v-plus' },
        { name: 'GLM-4 Flash', id: 'glm-4-flash' },
        { name: 'GLM-4 Long', id: 'glm-4-long' },
        { name: 'GLM-3 Turbo', id: 'glm-3-turbo' },
        { name: 'ChatGLM-Pro', id: 'chatglm-pro' },
        { name: 'ChatGLM-6B', id: 'chatglm-6b' }
    ];

    console.log('🧪 开始测试不同GLM模型名称...');
    console.log('💡 提示：请打开 model_test.html 查看详细的可视化测试结果');

    let workingModels = [];

    for (const model of possibleModels) {
        try {
            console.log(`\n🔍 测试模型: ${model.name} (${model.id})`);

            const requestBody = {
                model: model.id,
                messages: [
                    {
                        role: 'user',
                        content: '测试消息，请回复"成功"'
                    }
                ],
                temperature: 0.7,
                max_tokens: 10,
                stream: false
            };

            const response = await fetch(getGLMApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GLM_API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                console.log(`✅ 模型 ${model.name} (${model.id}) 测试成功`);
                workingModels.push(model);
            } else {
                const errorText = await response.text();
                console.log(`❌ 模型 ${model.name} (${model.id}) 测试失败: ${response.status}`);
                console.log(`   错误详情: ${errorText}`);
            }

        } catch (error) {
            console.log(`💥 模型 ${model.name} (${model.id}) 测试异常: ${error.message}`);
        }

        // 添加延迟避免频率限制
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('\n🏁 模型测试完成');
    console.log(`📊 找到 ${workingModels.length} 个可用模型:`);

    if (workingModels.length > 0) {
        console.log('可用模型列表:');
        workingModels.forEach((model, index) => {
            console.log(`  ${index + 1}. ${model.name}: "${model.id}"`);
        });

        // 更新模型配置
        if (workingModels.find(m => m.id.includes('v'))) {
            const visionModel = workingModels.find(m => m.id.includes('v'));
            console.log(`\n🎯 推荐配置:`);
            console.log(`   基础模型: "${workingModels[0].id}"`);
            console.log(`   视觉模型: "${visionModel.id}"`);

            // 更新配置建议
            console.log(`\n📝 请将以下配置复制到 script.js 中:`);
            console.log(`const GLM_MODELS = {`);
            console.log(`    'glm-4.6': '${workingModels[0].id}',`);
            console.log(`    'glm-4.6-vision': '${visionModel.id}'`);
            console.log(`};`);
        }
    } else {
        console.log('❌ 没有找到可用的模型');
        console.log('请检查API密钥是否正确，或者访问 https://open.bigmodel.cn 查看可用模型');
    }
}

// 调用后端图片分析API
async function callBackendVisionAPI(message, imagePath, model) {
    console.log('🔍 调用后端图片分析API:', { message, imagePath, model });

    // 检查后端服务器状态
    const isBackendOnline = await checkBackendStatus();
    if (!isBackendOnline) {
        throw new Error('后端服务器不可用，请检查服务器是否启动');
    }

    try {
        const requestBody = {
            message: message,
            imagePath: imagePath,
            model: model
        };

        console.log('📤 发送到后端的请求:', requestBody);

        const response = await fetch(`${BACKEND_URL}/api/chat-with-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: API_TIMEOUT
        });

        console.log('📥 后端响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ 后端API错误:', errorData);
            throw new Error(`后端API错误 ${response.status}: ${errorData.error}`);
        }

        const result = await response.json();
        console.log('✅ 后端API响应成功:', result.success);

        if (!result.success) {
            throw new Error(`图片分析失败: ${result.error}`);
        }

        return {
            content: result.response,
            thinking: null, // 后端API目前不支持思考过程
            usage: result.usage,
            model: model
        };

    } catch (error) {
        console.error('💥 后端图片分析API调用失败:', error);
        throw error;
    }
}

// 截图功能已移除，被图片上传功能替代
// function takeScreenshot() {
//     // 这里是截图功能的占位符
//     // 实际实现需要使用 Electron 的截图 API 或其他截图库
//     showInfoToast('截图功能需要桌面应用支持');
// }

// 消息菜单
function showMessageMenu(event, messageId) {
    event.preventDefault();

    const menu = document.getElementById('messageMenu');
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    menu.setAttribute('data-message-id', messageId);
}

function copyMessage() {
    const menu = document.getElementById('messageMenu');
    const messageId = menu.getAttribute('data-message-id');
    const chat = chats.find(c => c.id === currentChatId);

    if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message) {
            navigator.clipboard.writeText(message.content).then(() => {
                showSuccessToast('已复制到剪贴板');
            });
        }
    }

    menu.style.display = 'none';
}

function collectKnowledge() {
    const menu = document.getElementById('messageMenu');
    const messageId = menu.getAttribute('data-message-id');
    const chat = chats.find(c => c.id === currentChatId);

    if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message && message.role === 'assistant') {
            // 创建知识点收集弹窗
            const knowledge = prompt('请为此知识点添加标题：', message.content.slice(0, 50));
            if (knowledge) {
                const newKnowledge = {
                    id: generateId(),
                    title: knowledge,
                    content: message.content,
                    category: 'other',
                    createdAt: new Date().toISOString(),
                    sourceMessageId: messageId
                };

                knowledgePoints.unshift(newKnowledge);
                saveKnowledgeToStorage();
                updateKnowledgeList();
                showSuccessToast('知识点已收藏');
            }
        }
    }

    menu.style.display = 'none';
}

function regenerateResponse(messageId = null) {
    // 如果messageId为null，尝试从右键菜单获取
    if (!messageId) {
        const menu = document.getElementById('messageMenu');
        messageId = menu.getAttribute('data-message-id');
        menu.style.display = 'none';
    }

    const chat = chats.find(c => c.id === currentChatId);

    if (!chat) {
        showErrorToast('未找到对话');
        return;
    }

    const messageIndex = chat.messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) {
        showErrorToast('无法重新生成此消息');
        return;
    }

    const userMessage = chat.messages[messageIndex - 1];

    // 删除原有的AI回复及其之后的所有消息
    chat.messages = chat.messages.slice(0, messageIndex);
    saveChatsToStorage();
    renderMessages(chat.messages);

    // 重新生成回复
    generateResponse(userMessage.content);
}

function copyMessageContent(messageId) {
    const chat = chats.find(c => c.id === currentChatId);

    if (!chat) return;

    const message = chat.messages.find(m => m.id === messageId);

    if (!message) return;

    // 复制消息内容到剪贴板
    navigator.clipboard.writeText(message.content).then(() => {
        showSuccessToast('回答已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            showSuccessToast('回答已复制到剪贴板');
        } catch (err) {
            showErrorToast('复制失败');
        }

        document.body.removeChild(textArea);
    });
}

// 通用回答生成函数
async function generateResponse(messageContent, imageData = null) {
    if (isGenerating) return;

    // 设置生成状态
    isGenerating = true;
    currentAbortController = new AbortController();
    updateSendButton();

    // 显示加载指示器
    showLoadingIndicator();

    try {
        // 创建AI消息占位符
        const assistantMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            thinking: '',
            timestamp: new Date().toISOString()
        };

        addMessageToChat(assistantMessage);

        // 调用 GLM API（支持流式输出和思考过程）
        const response = await callGLMAPI(messageContent, getChatHistory(), imageData,
            // 更新回答内容
            (streamContent) => {
                updateMessageContent(assistantMessage.id, streamContent, true);
            },
            // 更新思考过程
            (thinkingContent) => {
                updateThinkingProcess(assistantMessage.id, thinkingContent);
            },
            currentAbortController.signal
        );

        // 完成流式输出，更新完整内容并移除光标
        finishStreaming(assistantMessage.id, response.content);

        // 更新思考过程的最终内容
        if (response.thinking) {
            updateThinkingProcess(assistantMessage.id, response.thinking, false);
        }

        // 答案生成完毕后，强制跳转到底部
        setTimeout(() => {
            const container = document.getElementById('messagesContainer');
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('消息生成被用户停止');
        } else {
            console.error('生成回答失败:', error);
            showErrorToast('生成回答失败，请稍后重试');
        }
    } finally {
        isGenerating = false;
        currentAbortController = null;
        updateSendButton();
        hideLoadingIndicator();
    }
}

// 知识库管理
function updateKnowledgeList() {
    const list = document.getElementById('knowledgeList');
    const activeCategory = document.querySelector('.category-btn.active').dataset.category;

    const filteredKnowledge = activeCategory === 'all'
        ? knowledgePoints
        : knowledgePoints.filter(k => k.category === activeCategory);

    list.innerHTML = '';

    if (filteredKnowledge.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">暂无知识点</div>';
        return;
    }

    filteredKnowledge.forEach(knowledge => {
        const item = document.createElement('div');
        item.className = 'knowledge-item';

        item.innerHTML = `
            <div class="knowledge-item-title">${knowledge.title}</div>
            <div class="knowledge-item-category">${getCategoryName(knowledge.category)}</div>
            <div class="knowledge-item-content">${knowledge.content.slice(0, 100)}...</div>
        `;

        list.appendChild(item);
    });
}

function filterKnowledgePoints(category) {
    updateKnowledgeList();
}

function getCategoryName(category) {
    const categoryNames = {
        'math': '数学',
        'science': '科学',
        'language': '语言',
        'other': '其他'
    };

    return categoryNames[category] || '其他';
}

// 加载指示器
function showLoadingIndicator() {
    isGenerating = true;
    updateSendButton();

    const indicator = document.getElementById('loadingIndicator');
    const container = document.getElementById('messagesContainer');

    if (!document.querySelector('.loading-indicator')) {
        container.appendChild(indicator);
        indicator.style.display = 'flex';
    }

    container.scrollTop = container.scrollHeight;
}

function hideLoadingIndicator() {
    isGenerating = false;
    updateSendButton();

    const indicator = document.getElementById('loadingIndicator');
    indicator.style.display = 'none';
}

// 通知提示
function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showInfoToast(message) {
    showToast(message, 'info');
}

// 现代化 Toast 系统
function showToast(message, type = 'info', duration = 4000) {
    // 获取或创建 Toast 容器
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 创建 Toast 元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // 根据类型选择图标
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this)">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" style="width: 100%; animation: toastProgress ${duration}ms linear forwards;"></div>
    `;

    // 添加到容器
    container.appendChild(toast);

    // 触发显示动画
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 自动关闭
    const timer = setTimeout(() => {
        closeToast(toast.querySelector('.toast-close'));
    }, duration);

    // 存储定时器ID以便手动关闭时清除
    toast.dataset.timer = timer;
}

// 关闭 Toast
function closeToast(closeButton) {
    const toast = closeButton.closest('.toast');
    if (!toast) return;

    // 清除自动关闭定时器
    const timer = toast.dataset.timer;
    if (timer) {
        clearTimeout(parseInt(timer));
    }

    // 添加关闭动画
    toast.classList.remove('show');
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';

    // 移除元素
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// 添加 Toast 进度条动画的 CSS
const toastProgressStyle = document.createElement('style');
toastProgressStyle.textContent = `
    @keyframes toastProgress {
        from { width: 100%; }
        to { width: 0%; }
    }
`;
document.head.appendChild(toastProgressStyle);

// 存储管理
function saveChatsToStorage() {
    localStorage.setItem('aiTutorChats', JSON.stringify(chats));
}

function loadChatsFromStorage() {
    const saved = localStorage.getItem('aiTutorChats');
    if (saved) {
        chats = JSON.parse(saved);
    }
}

function saveKnowledgeToStorage() {
    localStorage.setItem('aiTutorKnowledge', JSON.stringify(knowledgePoints));
}

function loadKnowledgeFromStorage() {
    const saved = localStorage.getItem('aiTutorKnowledge');
    if (saved) {
        knowledgePoints = JSON.parse(saved);
    }
}

// 简化的代码复制功能
function copySimpleCode(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const codeElement = codeBlock.querySelector('code');
    if (!codeElement) return;

    const codeText = codeElement.textContent || codeElement.innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(codeText).then(() => {
            showSuccessToast('代码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            fallbackCopyCode(codeText);
        });
    } else {
        fallbackCopyCode(codeText);
    }
}

// 降级复制方案
function fallbackCopyCode(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);

        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            showSuccessToast('代码已复制到剪贴板');
        } else {
            throw new Error('复制命令执行失败');
        }
    } catch (err) {
        console.error('降级复制失败:', err);
        showErrorToast('复制失败，请手动选择复制');
    }
}

// 展开/折叠代码块
function expandCodeBlock(codeId) {
    const codeBlock = document.getElementById(codeId);
    if (!codeBlock) return;

    const wrapper = codeBlock.querySelector('.code-wrapper');
    const expandBtn = codeBlock.querySelector('.code-expand-btn');

    if (wrapper) {
        const isCollapsed = wrapper.classList.contains('collapsed');

        if (isCollapsed) {
            // 展开代码
            wrapper.classList.remove('collapsed');
            wrapper.style.maxHeight = 'none';
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-compress"></i> 收起';
                expandBtn.title = '收起代码';
            }
        } else {
            // 折叠代码
            wrapper.classList.add('collapsed');
            wrapper.style.maxHeight = '150px';
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-expand"></i> 展开';
                expandBtn.title = '展开代码';
            }
        }
    }
}

// 降级复制方案
function fallbackCopyToClipboard(text, copyBtn, copyText, copyIcon) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.zIndex = '-9999';
        document.body.appendChild(textArea);

        textArea.select();
        const successful = document.execCommand('copy');

        document.body.removeChild(textArea);

        if (successful) {
            copyBtn.classList.add('copied');
            copyText.textContent = '已复制';
            copyIcon.className = 'fas fa-check';
            showSuccessToast('代码已复制到剪贴板');

            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyText.textContent = '复制';
                copyIcon.className = 'fas fa-copy';
            }, 2000);
        } else {
            throw new Error('复制命令执行失败');
        }
    } catch (err) {
        console.error('降级复制失败:', err);
        // 显示错误提示
        if (copyText) {
            copyText.textContent = '复制失败';
            copyIcon.className = 'fas fa-exclamation-triangle';

            setTimeout(() => {
                copyText.textContent = '复制';
                copyIcon.className = 'fas fa-copy';
            }, 2000);
        }
    }
}

// 工具函数
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    }
}

// 跳转到登录页面
function goToLogin() {
    window.location.href = 'login.html';
}

// 退出登录函数
function logout() {
    if (confirm('确定要退出登录吗？')) {
        authManager.logout();
    }
}

// 代码块工具栏功能

// 切换行号显示
function toggleLineNumbers(codeId) {
    const codeBlock = document.querySelector(`[data-code-id="${codeId}"]`).closest('.code-block');
    const preElement = document.getElementById(codeId).parentElement;

    if (codeBlock.classList.contains('line-numbers')) {
        codeBlock.classList.remove('line-numbers');
    } else {
        codeBlock.classList.add('line-numbers');
        // 为每一行添加行号
        const lines = preElement.innerHTML.split('\n');
        const numberedLines = lines.map((line, index) => {
            const lineNumber = index + 1;
            return `<span class="line-number" style="position: absolute; left: 20px; width: 30px; text-align: right; color: #546e7a; font-size: 12px; line-height: 1.6; user-select: none;">${lineNumber}</span>${line}`;
        }).join('\n');
        preElement.innerHTML = numberedLines;
    }
}

// 切换代码块展开/折叠
function toggleCodeExpand(codeId) {
    const codeBlock = document.querySelector(`[data-code-id="${codeId}"]`).closest('.code-block');
    const expandBtn = codeBlock.querySelector('.expand-btn');
    const expandBtnText = expandBtn ? expandBtn.querySelector('.expand-text') : null;
    const expandIcon = expandBtn ? expandBtn.querySelector('i') : null;
    const expandOverlayBtn = codeBlock.querySelector('.code-expand-btn');

    if (codeBlock.classList.contains('collapsed')) {
        // 展开
        codeBlock.classList.remove('collapsed');
        if (expandBtnText) expandBtnText.textContent = '折叠';
        if (expandIcon) expandIcon.className = 'fas fa-compress';
        if (expandOverlayBtn) expandOverlayBtn.style.display = 'none';
    } else {
        // 折叠
        codeBlock.classList.add('collapsed');
        if (expandBtnText) expandBtnText.textContent = '展开';
        if (expandIcon) expandIcon.className = 'fas fa-expand';
        if (expandOverlayBtn) expandOverlayBtn.style.display = 'block';
    }
}

// 显示代码工具提示
function showCodeTooltip(element, text) {
    // 移除现有的工具提示
    hideCodeTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'code-tooltip show';
    tooltip.textContent = text;

    document.body.appendChild(tooltip);

    // 定位工具提示
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

    // 自动隐藏
    setTimeout(() => {
        hideCodeTooltip();
    }, 2000);
}

// 隐藏代码工具提示
function hideCodeTooltip() {
    const tooltip = document.querySelector('.code-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// 检查代码块可见性并优化显示
function optimizeCodeBlockDisplay() {
    const codeBlocks = document.querySelectorAll('.code-block');

    codeBlocks.forEach(block => {
        const pre = block.querySelector('pre');
        const lineCount = block.dataset.lineCount || '0';

        // 如果代码行数很多且未添加折叠功能，则添加
        if (parseInt(lineCount) > 15 && !block.querySelector('.expand-btn')) {
            const blockId = block.querySelector('[id^="code-"]').id;
            const header = block.querySelector('.code-actions');

            if (header) {
                const expandBtn = document.createElement('button');
                expandBtn.className = 'code-action-btn expand-btn';
                expandBtn.onclick = () => toggleCodeExpand(blockId);
                expandBtn.innerHTML = '<i class="fas fa-expand"></i><span class="expand-text">展开</span>';
                expandBtn.title = '展开/折叠';
                header.appendChild(expandBtn);
            }

            // 添加折叠类和展开按钮
            block.classList.add('collapsed');
            const content = block.querySelector('.code-content');
            if (content) {
                const expandOverlayBtn = document.createElement('button');
                expandOverlayBtn.className = 'code-expand-btn';
                expandOverlayBtn.onclick = () => toggleCodeExpand(blockId);
                expandOverlayBtn.innerHTML = '<i class="fas fa-expand"></i> 展开全部';
                content.appendChild(expandOverlayBtn);
            }
        }
    });
}

// 为代码块添加键盘快捷键支持
function addCodeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + C 在代码块内时复制代码
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            // 如果有选中文本，让默认复制行为处理
            if (selectedText) return;

            // 检查焦点是否在代码块内
            const focusedElement = document.activeElement;
            const codeBlock = focusedElement ? focusedElement.closest('.code-block') : null;

            if (codeBlock) {
                e.preventDefault();
                const copyBtn = codeBlock.querySelector('.code-action-btn[onclick*="copyCodeToClipboard"]');
                if (copyBtn) {
                    const codeId = copyBtn.getAttribute('data-code-id');
                    copyCodeToClipboard(codeId);
                }
            }
        }
    });
}

// 简化的代码块初始化
function initializeCodeBlocks() {
    // 添加键盘快捷键
    addCodeKeyboardShortcuts();

    // 确保Prism.js已正确加载
    if (typeof Prism === 'undefined') {
        console.warn('Prism.js not loaded, syntax highlighting may not work');
        return;
    }

    // 手动禁用Prism的自动处理
    Prism.manual = true;
}

// 录音功能
function initializeVoiceRecognition() {
    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('浏览器不支持语音识别功能');
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    // 配置语音识别
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;

    // 识别开始
    recognition.onstart = function() {
        console.log('语音识别开始');
        isRecording = true;
        recordingStartTime = Date.now();
        updateRecordingUI(true);
        startRecordingTimer();
    };

    // 识别结束
    recognition.onend = function() {
        console.log('语音识别结束');
        isRecording = false;
        updateRecordingUI(false);
        stopRecordingTimer();
    };

    // 识别结果
    recognition.onresult = function(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                finalTranscript += result[0].transcript;
            } else {
                interimTranscript += result[0].transcript;
            }
        }

        // 更新输入框内容
        const input = document.getElementById('messageInput');
        if (finalTranscript) {
            // 如果有最终结果，替换输入框内容
            input.value = finalTranscript;
            updateSendButton();
            autoResizeTextarea(input);
        } else if (interimTranscript) {
            // 显示临时结果（可选）
            console.log('临时识别结果:', interimTranscript);
        }
    };

    // 识别错误
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        let errorMessage = '语音识别失败';

        switch (event.error) {
            case 'no-speech':
                errorMessage = '未检测到语音，请重试';
                break;
            case 'audio-capture':
                errorMessage = '无法访问麦克风';
                break;
            case 'not-allowed':
                errorMessage = '麦克风权限被拒绝';
                break;
            case 'network':
                errorMessage = '网络连接错误';
                break;
            default:
                errorMessage = `识别失败: ${event.error}`;
        }

        showErrorToast(errorMessage);
        stopRecording();
    };

    return true;
}

function toggleVoiceRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    // 检查是否已经初始化语音识别
    if (!recognition) {
        if (!initializeVoiceRecognition()) {
            showErrorToast('您的浏览器不支持语音识别功能');
            return;
        }
    }

    // 请求麦克风权限
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            try {
                recognition.start();
            } catch (error) {
                console.error('启动语音识别失败:', error);
                showErrorToast('启动语音识别失败，请重试');
            }
        })
        .catch(error => {
            console.error('麦克风权限被拒绝:', error);
            showErrorToast('请允许使用麦克风以使用语音输入功能');
        });
}

function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

function updateRecordingUI(recording) {
    const voiceBtn = document.getElementById('voiceBtn');

    if (recording) {
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        voiceBtn.title = '停止录音';

        // 显示录音指示器
        showRecordingIndicator();
    } else {
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = '语音输入';

        // 隐藏录音指示器
        hideRecordingIndicator();
    }
}

function showRecordingIndicator() {
    // 移除现有的指示器
    hideRecordingIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'recording-indicator';
    indicator.id = 'recordingIndicator';

    indicator.innerHTML = `
        <div class="recording-icon">
            <i class="fas fa-microphone"></i>
        </div>
        <div class="recording-text">正在录音...</div>
        <div class="recording-time" id="recordingTime">00:00</div>
    `;

    document.body.appendChild(indicator);
}

function hideRecordingIndicator() {
    const indicator = document.getElementById('recordingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function startRecordingTimer() {
    recordingTimer = setInterval(() => {
        if (recordingStartTime) {
            const elapsed = Date.now() - recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

            const timeElement = document.getElementById('recordingTime');
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        }
    }, 1000);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    recordingStartTime = null;
}