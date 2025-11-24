# 文件上传模块设计文档

## Architecture Overview

文件上传模块采用前后端分离设计，前端负责用户交互和文件选择，后端处理文件存储、验证和安全检查。使用Multer中间件处理multipart/form-data请求。

## Backend Architecture

### Multer Configuration
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
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
```

### File Processing Pipeline
```javascript
class FileProcessor {
  static async processUpload(req, res) {
    try {
      // 1. 验证文件存在
      if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
      }

      // 2. 生成文件信息
      const fileInfo = this.generateFileInfo(req.file);

      // 3. 可选：图片处理和优化
      const optimizedFile = await this.optimizeImage(fileInfo);

      // 4. 安全检查
      await this.performSecurityCheck(optimizedFile);

      // 5. 保存到数据库或缓存
      await this.saveFileMetadata(optimizedFile);

      // 6. 返回成功响应
      res.json({
        success: true,
        message: '图片上传成功',
        file: optimizedFile
      });

    } catch (error) {
      this.handleUploadError(error, res);
    }
  }

  static generateFileInfo(file) {
    return {
      id: Date.now().toString(),
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: `/uploads/${file.filename}`,
      uploadTime: new Date().toISOString(),
      checksum: this.calculateChecksum(file.path)
    };
  }

  static async optimizeImage(fileInfo) {
    // 可选的图片优化逻辑
    // - 压缩图片
    // - 调整尺寸
    // - 格式转换
    return fileInfo;
  }

  static async performSecurityCheck(fileInfo) {
    // 恶意文件检查
    // 病毒扫描（如果需要）
    // 文件头验证
    return true;
  }

  static calculateChecksum(filePath) {
    // 计算文件校验和，用于完整性验证
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }
}
```

### Error Handling Strategy
```javascript
class UploadErrorHandler {
  static handleMulterError(error, req, res, next) {
    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            error: '文件大小超过10MB限制',
            details: `当前文件大小: ${Math.round(error.limit / 1024 / 1024)}MB`
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            error: '文件数量超过限制',
            details: `最多允许上传 ${error.limit} 个文件`
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            error: '不支持的文件字段',
            details: `期望字段: ${error.field}`
          });
        default:
          return res.status(400).json({
            error: '文件上传错误',
            details: error.message
          });
      }
    }
    next(error);
  }

  static handleStorageError(error) {
    if (error.code === 'ENOSPC') {
      return {
        status: 507,
        error: '存储空间不足',
        details: '服务器磁盘空间已满，请联系管理员'
      };
    }

    if (error.code === 'EACCES') {
      return {
        status: 500,
        error: '文件系统权限错误',
        details: '无法写入上传目录，请检查权限设置'
      };
    }

    return {
      status: 500,
      error: '文件存储错误',
      details: error.message
    };
  }
}
```

## Frontend Architecture

### FileUploadManager Class
```javascript
class FileUploadManager {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.uploadUrl = options.uploadUrl || '/api/upload-image';
    this.concurrentUploads = options.concurrentUploads || 3;
    this.activeUploads = new Map();
    this.uploadQueue = [];
  }

  // Public Methods
  async uploadFile(file, onProgress = null) {
    const fileId = this.generateFileId(file);

    try {
      // 1. 验证文件
      this.validateFile(file);

      // 2. 检查并发限制
      await this.checkConcurrencyLimit();

      // 3. 创建上传任务
      const uploadTask = this.createUploadTask(file, fileId, onProgress);

      // 4. 执行上传
      const result = await this.executeUpload(uploadTask);

      return result;

    } catch (error) {
      throw this.handleUploadError(error, file);
    } finally {
      this.cleanupUpload(fileId);
    }
  }

  // File Validation
  validateFile(file) {
    // 类型检查
    if (!this.allowedTypes.includes(file.type)) {
      throw new UploadError('不支持的文件格式', 'FILE_TYPE_ERROR', {
        supportedTypes: this.allowedTypes,
        receivedType: file.type
      });
    }

    // 大小检查
    if (file.size > this.maxFileSize) {
      throw new UploadError('文件大小超过限制', 'FILE_SIZE_ERROR', {
        maxSize: this.maxFileSize,
        receivedSize: file.size
      });
    }
  }

  // Upload Task Management
  createUploadTask(file, fileId, onProgress) {
    const formData = new FormData();
    formData.append('image', file);

    return {
      id: fileId,
      file: file,
      formData: formData,
      onProgress: onProgress,
      startTime: Date.now(),
      xhr: null
    };
  }

  async executeUpload(task) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      task.xhr = xhr;
      this.activeUploads.set(task.id, task);

      // 进度监听
      if (task.onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            task.onProgress(progress);
          }
        });
      }

      // 完成监听
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new UploadError('响应解析失败', 'PARSE_ERROR'));
          }
        } else {
          reject(new UploadError('上传失败', 'HTTP_ERROR', {
            status: xhr.status,
            statusText: xhr.statusText
          }));
        }
      });

      // 错误监听
      xhr.addEventListener('error', () => {
        reject(new UploadError('网络错误', 'NETWORK_ERROR'));
      });

      // 取消监听
      xhr.addEventListener('abort', () => {
        reject(new UploadError('上传已取消', 'ABORTED'));
      });

      // 发送请求
      xhr.open('POST', this.uploadUrl);
      xhr.send(task.formData);
    });
  }

  // Concurrency Control
  async checkConcurrencyLimit() {
    if (this.activeUploads.size >= this.concurrentUploads) {
      await new Promise(resolve => {
        this.uploadQueue.push(resolve);
      });
    }
  }

  cleanupUpload(fileId) {
    this.activeUploads.delete(fileId);

    // 处理队列中的等待任务
    if (this.uploadQueue.length > 0) {
      const next = this.uploadQueue.shift();
      next();
    }
  }
}
```

### DragDrop Component
```javascript
class DragDropUploader {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      multiple: options.multiple || false,
      acceptedTypes: options.acceptedTypes || 'image/*',
      onDrop: options.onDrop || (() => {}),
      onDragEnter: options.onDragEnter || (() => {}),
      onDragLeave: options.onDragLeave || (() => {})
    };

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // 防止默认拖拽行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.container.addEventListener(eventName, this.preventDefaults, false);
    });

    // 拖拽进入
    this.container.addEventListener('dragenter', (event) => {
      this.container.classList.add('drag-over');
      this.options.onDragEnter(event);
    });

    // 拖拽离开
    this.container.addEventListener('dragleave', (event) => {
      if (event.target === this.container) {
        this.container.classList.remove('drag-over');
        this.options.onDragLeave(event);
      }
    });

    // 文件放置
    this.container.addEventListener('drop', (event) => {
      this.container.classList.remove('drag-over');
      const files = this.handleFiles(event.dataTransfer.files);
      this.options.onDrop(files);
    });
  }

  preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  handleFiles(fileList) {
    const files = Array.from(fileList);

    // 过滤文件类型
    const acceptedFiles = files.filter(file => {
      return file.type.startsWith('image/');
    });

    // 如果限制单文件，只取第一个
    if (!this.options.multiple) {
      return acceptedFiles.slice(0, 1);
    }

    return acceptedFiles;
  }
}
```

### Upload Progress Component
```javascript
class UploadProgress {
  constructor(container) {
    this.container = container;
    this.activeProgress = new Map();
  }

  create(fileId, filename) {
    const progressElement = document.createElement('div');
    progressElement.className = 'upload-progress';
    progressElement.innerHTML = `
      <div class="progress-info">
        <span class="filename">${filename}</span>
        <span class="progress-text">0%</span>
        <button class="cancel-btn" onclick="uploadManager.cancelUpload('${fileId}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    `;

    this.container.appendChild(progressElement);
    this.activeProgress.set(fileId, progressElement);

    return progressElement;
  }

  update(fileId, progress) {
    const progressElement = this.activeProgress.get(fileId);
    if (!progressElement) return;

    const progressText = progressElement.querySelector('.progress-text');
    const progressFill = progressElement.querySelector('.progress-fill');
    const uploadedSize = this.formatFileSize(progress.loaded);
    const totalSize = this.formatFileSize(progress.total);

    progressText.textContent = `${progress.percentage}% (${uploadedSize}/${totalSize})`;
    progressFill.style.width = `${progress.percentage}%`;
  }

  complete(fileId) {
    const progressElement = this.activeProgress.get(fileId);
    if (!progressElement) return;

    progressElement.classList.add('completed');
    const progressText = progressElement.querySelector('.progress-text');
    progressText.textContent = '上传完成';

    // 3秒后自动移除
    setTimeout(() => {
      this.remove(fileId);
    }, 3000);
  }

  error(fileId, error) {
    const progressElement = this.activeProgress.get(fileId);
    if (!progressElement) return;

    progressElement.classList.add('error');
    const progressText = progressElement.querySelector('.progress-text');
    progressText.textContent = `上传失败: ${error.message}`;
  }

  remove(fileId) {
    const progressElement = this.activeProgress.get(fileId);
    if (progressElement) {
      progressElement.remove();
      this.activeProgress.delete(fileId);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
```

## Security Implementation

### File Type Verification
```javascript
class FileSecurityChecker {
  static async verifyFileType(filePath, declaredType) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileType = await this.detectFileType(fileBuffer);

    if (!this.isImageType(fileType)) {
      throw new Error('文件类型验证失败：不是有效的图片文件');
    }

    if (!this.typesMatch(fileType, declaredType)) {
      throw new Error('文件类型验证失败：声明的类型与实际类型不匹配');
    }

    return true;
  }

  static detectFileType(buffer) {
    // 基于文件头的类型检测
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46]
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (this.bufferStartsWith(buffer, signature)) {
        return mimeType;
      }
    }

    return 'unknown';
  }

  static bufferStartsWith(buffer, signature) {
    if (buffer.length < signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }

    return true;
  }

  static isImageType(mimeType) {
    return mimeType.startsWith('image/');
  }

  static typesMatch(detected, declared) {
    // 允许某些类型的兼容性
    const compatibleTypes = {
      'image/jpeg': ['image/jpeg', 'image/jpg'],
      'image/jpg': ['image/jpeg', 'image/jpg']
    };

    const allowed = compatibleTypes[detected] || [detected];
    return allowed.includes(declared);
  }
}
```

### Malicious File Detection
```javascript
class MaliciousFileDetector {
  static async scanFile(filePath) {
    try {
      // 1. 检查文件内容
      await this.checkFileContent(filePath);

      // 2. 检查文件结构
      await this.checkFileStructure(filePath);

      // 3. 检查元数据
      await this.checkMetadata(filePath);

      return { safe: true, threats: [] };

    } catch (error) {
      return { safe: false, threats: [error.message] };
    }
  }

  static async checkFileContent(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const content = fileBuffer.toString('utf8', 0, Math.min(1024, fileBuffer.length));

    // 检查是否包含可疑内容
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /<\?php/i,
      /<%/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new Error('检测到可疑的脚本内容');
      }
    }
  }

  static async checkFileStructure(filePath) {
    const stats = fs.statSync(filePath);

    // 检查文件大小
    if (stats.size === 0) {
      throw new Error('文件为空');
    }

    // 检查文件扩展名与内容是否匹配
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (!validExtensions.includes(ext)) {
      throw new Error('无效的文件扩展名');
    }
  }

  static async checkMetadata(filePath) {
    // 这里可以添加更复杂的元数据分析
    // 例如：EXIF数据检查、图片尺寸验证等
  }
}
```

## Performance Optimization

### Image Processing Pipeline
```javascript
class ImageProcessor {
  static async optimizeImage(inputPath, outputPath, options = {}) {
    const sharp = require('sharp');

    try {
      let processor = sharp(inputPath);

      // 获取图片信息
      const metadata = await processor.metadata();

      // 调整尺寸（如果需要）
      if (options.maxWidth && metadata.width > options.maxWidth) {
        processor = processor.resize(options.maxWidth, null, {
          withoutEnlargement: true
        });
      }

      // 压缩图片
      if (options.quality) {
        switch (metadata.format) {
          case 'jpeg':
            processor = processor.jpeg({ quality: options.quality });
            break;
          case 'png':
            processor = processor.png({ quality: options.quality });
            break;
          case 'webp':
            processor = processor.webp({ quality: options.quality });
            break;
        }
      }

      // 保存优化后的图片
      await processor.toFile(outputPath);

      return {
        success: true,
        originalSize: metadata.size,
        optimizedSize: fs.statSync(outputPath).size,
        compressionRatio: metadata.size / fs.statSync(outputPath).size
      };

    } catch (error) {
      throw new Error(`图片处理失败: ${error.message}`);
    }
  }

  static async generateThumbnails(inputPath, outputDir, sizes = [150, 300, 600]) {
    const sharp = require('sharp');
    const thumbnails = [];

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `thumb_${size}_${path.basename(inputPath)}`);

      await sharp(inputPath)
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      thumbnails.push({
        size: size,
        path: outputPath
      });
    }

    return thumbnails;
  }
}
```

### Caching Strategy
```javascript
class FileCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100; // 最大缓存文件数
    this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存时间
  }

  set(key, value) {
    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
  }
}
```

## Testing Strategy

### Unit Tests
- FileUploadManager类的方法测试
- 文件验证逻辑测试
- 错误处理机制测试
- 安全检查功能测试

### Integration Tests
- 完整的上传流程测试
- 并发上传测试
- 错误恢复测试
- 性能压力测试

### Security Tests
- 恶意文件上传测试
- 文件类型伪造测试
- 目录遍历攻击测试
- 大文件上传测试

### Manual Tests
- 用户体验测试
- 浏览器兼容性测试
- 移动设备上传测试
- 网络异常情况测试