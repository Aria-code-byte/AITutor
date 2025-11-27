## MODIFIED Requirements
### Requirement: 图像分析功能
系统SHALL允许用户上传图片并与AI进行图像相关的对话，文本对话使用GLM模型，图像识别使用豆包Vision模型。

#### Scenario: 上传图片分析
- **WHEN** 用户上传图片并输入相关问题
- **THEN** 系统将图片转换为base64格式
- **AND** 连同文本问题发送给豆包Vision模型(doubao-seed-1-6-vision-250815)
- **AND** 显示图片预览和AI分析结果
- **AND** 使用豆包API端点：https://ark.cn-beijing.volces.com/api/v3/chat/completions

#### Scenario: 图片文件验证
- **WHEN** 用户上传图片文件
- **THEN** 系统验证文件格式（JPEG、JPG、PNG、GIF、WebP）
- **AND** 检查文件大小不超过10MB
- **AND** 如不符合要求，显示相应错误信息

#### Scenario: 图片预览
- **WHEN** 图片上传成功
- **THEN** 系统在消息中显示图片缩略图
- **AND** 提供点击查看大图功能
- **AND** 显示图片基本信息（文件名、大小）

#### Scenario: 图片管理
- **WHEN** 用户需要管理上传的图片
- **THEN** 系统提供图片列表功能
- **AND** 允许查看和删除已上传图片
- **AND** 提供图片使用统计信息

## MODIFIED Requirements
### Requirement: 模型管理
系统SHALL支持多个AI模型并管理模型状态，包括GLM文本模型和豆包Vision图像模型。

#### Scenario: 模型列表管理
- **WHEN** 系统初始化
- **THEN** 显示可用的模型列表，包括GLM文本模型和豆包Vision模型
- **AND** 包含模型名称、类型、描述信息
- **AND** 标记当前选中的模型
- **AND** 区分文本和图像处理能力

#### Scenario: 模型切换
- **WHEN** 用户选择不同的模型
- **THEN** 系统切换到新模型
- **AND** 更新界面显示当前模型
- **AND** 保存用户模型偏好
- **AND** 根据模型类型启用/禁用相关功能

#### Scenario: 模型测试
- **WHEN** 用户点击测试模型按钮
- **THEN** 系统测试所有可用模型的连接
- **AND** 显示每个模型的测试结果
- **AND** 标记可用和不可用的模型
- **AND** 分别测试GLM API和豆包API的连通性

#### Scenario: 模型功能提示
- **WHEN** 用户选择不同模型
- **THEN** 系统显示该模型的功能特点
- **AND** 提供使用建议和限制说明
- **AND** 显示模型适用场景
- **AND** 标明哪些模型支持图像处理

## Technical Notes

### API Integration
- **Backend URL**: http://localhost:3000
- **GLM API Endpoint**: /api/chat (仅文本对话)
- **豆包Vision API Endpoint**: https://ark.cn-beijing.volces.com/api/v3/chat/completions (图像分析)
- **豆包API Key**: 9651681c-cccc-4f87-bd87-ba3d2ae9853a
- **Supported Models**:
  - 文本模型: glm-4, glm-4-plus
  - 图像模型: doubao-seed-1-6-vision-250815
- **Request Timeout**: 30秒
- **Max Tokens**: 2000