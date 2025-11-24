// 认证相关功能
class AuthManager {
    constructor() {
        this.initializeAuth();
        // 延迟创建默认账户，确保所有方法都已定义
        setTimeout(() => {
            this.createDefaultAccountIfNeeded();
        }, 0);
    }

    // 创建默认账户（如果不存在）
    createDefaultAccountIfNeeded() {
        const users = this.getUsers();
        if (!users.some(user => user.username === 'admin')) {
            const defaultUser = {
                id: 'admin_id',
                username: 'admin',
                password: this.hashPassword('admin123'), // 默认密码
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            users.push(defaultUser);
            this.saveUsers(users);
            console.log('已创建默认账户: admin/admin123');
        }
    }

    initializeAuth() {
        // 注释掉自动重定向逻辑，允许用户重新登录
        // const currentUser = this.getCurrentUser();
        // if (currentUser && (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html'))) {
        //     // 如果已登录但访问登录/注册页面，重定向到主页
        //     window.location.href = 'index.html';
        // }
    }

    // 用户注册
    register(username, password) {
        try {
            // 获取现有用户
            const users = this.getUsers();

            // 检查用户名是否已存在
            if (users.some(user => user.username === username)) {
                this.showToast('用户名已存在', 'error');
                return false;
            }

            // 验证用户名格式
            if (!this.isValidUsername(username)) {
                this.showToast('用户名格式不正确', 'error');
                return false;
            }

            // 验证密码强度
            if (!this.isValidPassword(password)) {
                this.showToast('密码强度不够', 'error');
                return false;
            }

            // 创建新用户
            const newUser = {
                id: Date.now().toString(),
                username: username,
                password: this.hashPassword(password), // 简单的密码哈希
                createdAt: new Date().toISOString(),
                lastLogin: null
            };

            // 保存用户
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            this.showToast('注册成功！请登录', 'success');

            // 2秒后跳转到登录页面
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

            return true;
        } catch (error) {
            console.error('注册失败:', error);
            this.showToast('注册失败，请重试', 'error');
            return false;
        }
    }

    // 用户登录
    login(username, password, rememberMe = false) {
        try {
            console.log('开始登录验证:', username);
            const users = this.getUsers();
            console.log('用户列表:', users);
            const user = users.find(u => u.username === username);
            console.log('找到用户:', user);

            if (!user) {
                console.log('用户名不存在');
                this.showToast('用户名或密码错误', 'error');
                return false;
            }

            console.log('验证密码...');
            if (!this.verifyPassword(password, user.password)) {
                console.log('密码错误');
                this.showToast('用户名或密码错误', 'error');
                return false;
            }
            console.log('密码验证通过');

            // 更新最后登录时间
            user.lastLogin = new Date().toISOString();
            localStorage.setItem('users', JSON.stringify(users));

            // 创建登录会话
            const session = {
                userId: user.id,
                username: user.username,
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe
            };

            if (rememberMe) {
                localStorage.setItem('userSession', JSON.stringify(session));
            } else {
                sessionStorage.setItem('userSession', JSON.stringify(session));
            }

            // 显示登录成功提示
            console.log('登录成功，显示提示...');
            this.showToast('登录成功！', 'success');

            // 延迟跳转到主页，让用户看到成功提示
            setTimeout(() => {
                console.log('开始跳转到主页...');
                window.location.href = 'index.html';
            }, 1000);

            return true;
        } catch (error) {
            console.error('登录失败:', error);
            this.showToast('用户名或密码错误', 'error');
            return false;
        }
    }

    // 用户登出
    logout() {
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userSession');
        this.showToast('已退出登录', 'success');

        // 跳转到主页（允许未登录访问）
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // 检查登录状态
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    // 获取当前用户
    getCurrentUser() {
        try {
            const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
            if (!sessionData) {
                return null;
            }

            const session = JSON.parse(sessionData);
            const users = this.getUsers();
            const user = users.find(u => u.id === session.userId);

            return user || null;
        } catch (error) {
            console.error('获取当前用户失败:', error);
            return null;
        }
    }

    // 获取所有用户
    getUsers() {
        try {
            const usersData = localStorage.getItem('users');
            return usersData ? JSON.parse(usersData) : [];
        } catch (error) {
            console.error('获取用户列表失败:', error);
            return [];
        }
    }

    // 保存用户列表
    saveUsers(users) {
        try {
            localStorage.setItem('users', JSON.stringify(users));
        } catch (error) {
            console.error('保存用户列表失败:', error);
        }
    }

    // 验证用户名格式
    isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    // 验证密码强度
    isValidPassword(password) {
        return password.length >= 6;
    }

    // 简单的密码哈希（实际项目中应使用更安全的方法）
    hashPassword(password) {
        // 这里使用简单的哈希，实际项目中应该使用 bcrypt 等安全的方法
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return btoa(hash.toString()).replace(/[^a-zA-Z0-9]/g, '').substr(0, 20);
    }

    // 验证密码
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    // 显示提示消息
    showToast(message, type = 'success') {
        console.log('显示Toast提示:', message, type);
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        console.log('Toast DOM元素:', { toast: !!toast, toastMessage: !!toastMessage, toastIcon: !!toastIcon });

        if (!toast || !toastMessage || !toastIcon) {
            // 如果不在认证页面，使用 alert
            console.log('Toast元素不存在，使用alert');
            alert(message);
            return;
        }

        // 设置消息和图标
        toastMessage.textContent = message;

        // 设置图标和样式
        toast.className = 'toast';
        const toastContent = toast.querySelector('.toast-content');
        if (type === 'success') {
            toastIcon.className = 'fas fa-check-circle toast-icon';
            toast.classList.add('toast-success');
            if (toastContent) toastContent.style.color = '#27ae60';
        } else if (type === 'error') {
            toastIcon.className = 'fas fa-exclamation-circle toast-icon';
            toast.classList.add('toast-error');
            if (toastContent) toastContent.style.color = '#e74c3c';
        } else if (type === 'warning') {
            toastIcon.className = 'fas fa-exclamation-triangle toast-icon';
            toast.classList.add('toast-warning');
            if (toastContent) toastContent.style.color = '#f39c12';
        }

        // 强制显示提示
        toast.style.display = 'block';
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.classList.add('show');

        console.log('Toast已显示，样式:', toast.style.cssText);

        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 创建全局认证管理器实例
const authManager = new AuthManager();

// 登录处理函数
function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');

    // 禁用按钮，防止重复提交
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

    // 执行登录
    const success = authManager.login(username, password, rememberMe);

    // 恢复按钮状态（如果登录失败）
    if (!success) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
    }
    // 如果登录成功，按钮状态会在跳转前保持"登录中..."
    // 这可以防止用户在跳转过程中重复点击
}

// 注册处理函数
function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const registerBtn = document.getElementById('registerBtn');

    // 验证密码确认
    if (password !== confirmPassword) {
        authManager.showToast('两次输入的密码不一致', 'error');
        return;
    }

    // 验证服务条款
    if (!agreeTerms) {
        authManager.showToast('请同意服务条款和隐私政策', 'warning');
        return;
    }

    // 禁用按钮，防止重复提交
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';

    // 执行注册
    const success = authManager.register(username, password);

    // 恢复按钮状态
    if (!success) {
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> 注册';
    }
}

// 切换密码可见性
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// 切换确认密码可见性
function toggleConfirmPassword() {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const toggleIcon = document.getElementById('confirmPasswordToggleIcon');

    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        confirmPasswordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// 检查密码强度
function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthContainer = document.getElementById('passwordStrength');

    if (!password) {
        strengthContainer.style.display = 'none';
        return;
    }

    strengthContainer.style.display = 'block';

    let strength = 0;

    // 长度检查
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;

    // 复杂性检查
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // 更新强度显示
    const strengthBar = strengthContainer.querySelector('.strength-bar');
    const strengthText = strengthContainer.querySelector('.strength-text');

    strengthContainer.className = 'password-strength';

    if (strength <= 2) {
        strengthContainer.classList.add('strength-weak');
        strengthText.textContent = '密码强度：弱';
    } else if (strength <= 4) {
        strengthContainer.classList.add('strength-medium');
        strengthText.textContent = '密码强度：中等';
    } else {
        strengthContainer.classList.add('strength-strong');
        strengthText.textContent = '密码强度：强';
    }
}

// 初始化认证相关事件
document.addEventListener('DOMContentLoaded', function() {
    // 为登录和注册页面添加表单验证
    if (window.location.pathname.endsWith('login.html')) {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            // 添加回车键支持
            loginForm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleLogin(e);
                }
            });
        }
    }

    if (window.location.pathname.endsWith('register.html')) {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            // 添加回车键支持
            registerForm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRegister(e);
                }
            });

            // 实时密码验证
            const confirmPassword = document.getElementById('confirmPassword');
            if (confirmPassword) {
                confirmPassword.addEventListener('input', function() {
                    const password = document.getElementById('password').value;
                    if (this.value && this.value !== password) {
                        this.setCustomValidity('两次输入的密码不一致');
                    } else {
                        this.setCustomValidity('');
                    }
                });
            }
        }
    }
});