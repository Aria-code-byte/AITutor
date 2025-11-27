# Change: 更新图像识别模型为Doubao Vision

## Why
为了提供更好的图像识别能力和更稳定的API服务，需要将图像识别模型从GLM Vision系列更换为豆包Vision模型，以提高图像分析的准确性和响应速度。

## What Changes
- 修改图像识别API集成，从GLM Vision API更换为豆包Vision API
- 更新API端点地址为：https://ark.cn-beijing.volces.com/api/v3/chat/completions
- 配置新的API密钥：9651681c-cccc-4f87-bd87-ba3d2ae9853a
- 更新图像模型为：doubao-seed-1-6-vision-250815
- 保持文本模型继续使用GLM系列
- 更新相关的API调用格式和参数结构

## Impact
- Affected specs: ai-chat (图像分析功能模块)
- Affected code: server.js中的图像处理API端点，前端的图像上传和显示逻辑
- **BREAKING**: 图像识别API调用格式发生变化，需要调整请求和响应处理逻辑