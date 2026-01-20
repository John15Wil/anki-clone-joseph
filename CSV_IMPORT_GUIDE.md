# Anki CSV 导入功能说明

## 功能特性

已支持从Anki导出的CSV文件直接导入到应用中。

## 使用方法

1. **从Anki导出CSV**
   - 在Anki中选择卡组
   - 点击 文件 → 导出
   - 选择"文本文件 (*.txt)"格式
   - 勾选"包含HTML和媒体引用"（可选）
   - 导出文件

2. **导入到本应用**
   - 点击首页的"CSV"按钮
   - 选择导出的CSV文件
   - 预览卡片内容
   - 输入新卡组名称
   - 点击"导入"

## 支持的CSV格式

### 基本格式（2列）
```csv
What is React?,A JavaScript library for building user interfaces
What is TypeScript?,A typed superset of JavaScript
```

### 带标签格式（3列）
```csv
What is React?,A JavaScript library for building user interfaces,frontend javascript
What is Node.js?,JavaScript runtime built on Chrome's V8,backend javascript
```

### 使用制表符分隔
```
What is HTML?	HyperText Markup Language	web basics
What is CSS?	Cascading Style Sheets	web basics
```

### 带引号的内容（支持换行和特殊字符）
```csv
"What is ""AI""?","Artificial Intelligence, the simulation of human intelligence","technology,AI"
"Multi-line question
with line breaks","Multi-line answer
with line breaks",advanced
```

## 格式要求

- **必填字段**：至少包含正面（问题）和背面（答案）两列
- **分隔符**：支持逗号(`,`)或制表符(`\t`)
- **引号**：支持用双引号包裹字段（处理内容中的逗号或换行）
- **标签**：第三列可选，多个标签用逗号或空格分隔
- **编码**：推荐使用UTF-8编码

## 示例CSV文件

已为您创建了示例文件 `/example-anki-export.csv`，可直接用于测试导入功能。

## 导入流程

1. **文件验证**：自动检测CSV格式是否正确
2. **内容解析**：解析所有卡片内容
3. **预览确认**：显示前5张卡片预览
4. **创建卡组**：自动创建新卡组（使用文件名或自定义名称）
5. **批量导入**：一次性导入所有卡片
6. **完成提示**：导入成功后自动刷新卡组列表

## 注意事项

- CSV导入会创建新卡组，不会影响现有数据
- 支持的最大文件大小：建议不超过10MB
- 建议先用小文件测试，确认格式正确后再导入大量数据
- 如果CSV包含HTML标签，会保留为纯文本
- 不支持图片和音频（纯文本导入）

## 常见问题

**Q: Anki导出时选择什么格式？**
A: 选择"文本文件 (*.txt)"或"CSV文件"格式，不要选择"Anki卡组包 (*.apkg)"

**Q: 导入失败怎么办？**
A: 检查CSV格式是否正确，每行至少要有2个字段（正面和背面）

**Q: 可以导入到已有卡组吗？**
A: 当前版本会创建新卡组，未来版本将支持导入到已有卡组

**Q: 标签没有导入怎么办？**
A: 确保CSV有第三列，且标签用逗号或空格分隔

## 技术实现

- **CSV解析**：自定义解析器，支持多种格式
- **格式验证**：自动检测并验证CSV内容
- **批量导入**：使用IndexedDB的bulkAdd优化性能
- **错误处理**：友好的错误提示和恢复机制
