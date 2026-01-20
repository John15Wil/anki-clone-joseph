# 快速开始指南

恭喜！Anki Clone 项目已经成功创建。下面是快速开始的步骤：

## 🚀 立即启动

```bash
cd anki-clone
npm run dev
```

然后在浏览器中打开 http://localhost:5173

## 📋 已完成的功能

### 1. 核心功能
- ✅ 完整的卡片 CRUD 操作
- ✅ 卡组管理系统
- ✅ SM-2 间隔重复算法
- ✅ 学习界面和复习流程
- ✅ 本地数据持久化 (IndexedDB)
- ✅ PWA 支持（可安装）

### 2. 技术实现
- ✅ React 18 + TypeScript + Vite
- ✅ Tailwind CSS 样式系统
- ✅ Zustand 状态管理
- ✅ Dexie.js 数据库封装
- ✅ React Router v6 路由
- ✅ 响应式设计（手机/平板/桌面）

## 🎯 使用流程

1. **访问首页**
   - 首次启动会自动创建"默认卡组"

2. **创建卡组**
   - 点击"新建卡组"按钮
   - 输入卡组名称和描述
   - 点击"创建卡组"

3. **添加卡片**
   - 进入卡组详情页（点击"管理"按钮）
   - 点击"添加卡片"
   - 输入正面（问题）和背面（答案）
   - 点击"添加"

4. **开始学习**
   - 返回首页，点击卡组的"学习"按钮
   - 看到问题后，点击"显示答案"
   - 根据记忆程度选择：重来/困难/一般/简单

## 📱 测试 PWA 功能

### 桌面浏览器
1. 运行 `npm run build` 构建生产版本
2. 运行 `npm run preview` 启动预览服务器
3. 在 Chrome 中访问，地址栏会显示安装图标

### 移动端测试
1. 使用 `npm run dev -- --host` 启动开发服务器
2. 在移动设备浏览器访问你的本地 IP
3. 测试"添加到主屏幕"功能

## 🔧 项目结构说明

```
src/
├── components/ui/      # 可复用的 UI 组件
│   ├── Button.tsx
│   └── Card.tsx
├── lib/               # 核心库
│   ├── db.ts          # 数据库配置和初始化
│   ├── srs.ts         # SM-2 算法实现
│   └── utils.ts       # 工具函数
├── pages/             # 页面组件
│   ├── HomePage.tsx          # 首页：卡组列表
│   ├── StudyPage.tsx         # 学习页面
│   └── DeckDetailPage.tsx    # 卡组详情：管理卡片
├── store/             # Zustand 状态管理
├── types/             # TypeScript 类型定义
└── App.tsx            # 主应用组件和路由配置
```

## 🎨 下一步开发建议

### Phase 2: 增强功能
1. **统计页面**
   - 创建 `src/pages/StatsPage.tsx`
   - 使用 recharts 显示学习曲线
   - 显示每日学习数据

2. **导入/导出**
   - 导出为 JSON 格式
   - 支持 CSV 格式
   - Anki .apkg 格式支持（复杂）

3. **富文本支持**
   - 已安装 react-markdown
   - 在卡片中渲染 Markdown
   - 代码高亮支持

4. **图片支持**
   - 添加图片上传功能
   - 使用 FileReader API
   - 存储在 IndexedDB

### Phase 3: 高级功能
1. **云同步**
   - 集成 Firebase/Supabase
   - 用户认证
   - 数据同步逻辑

2. **搜索功能**
   - 全文搜索卡片内容
   - 标签过滤
   - 高级筛选

3. **主题系统**
   - 暗色模式切换
   - 自定义配色方案
   - 存储用户偏好

## 💡 开发技巧

### 调试数据库
在浏览器控制台：
```javascript
// 查看所有卡组
await db.decks.toArray()

// 查看所有卡片
await db.cards.toArray()

// 清空数据库（重新开始）
await db.delete()
location.reload()
```

### 热更新
- Vite 支持热模块替换 (HMR)
- 修改代码后自动刷新
- TypeScript 错误会在终端显示

### 性能优化
- 使用 React DevTools Profiler
- 检查不必要的重渲染
- 优化大列表（虚拟滚动）

## 🐛 常见问题

### Q: 数据丢失了？
A: IndexedDB 数据存储在浏览器中，清除浏览器缓存会删除数据。建议实现导出功能。

### Q: PWA 无法安装？
A: 确保：
- 使用 HTTPS 或 localhost
- manifest.json 配置正确
- Service Worker 正常注册

### Q: 样式不生效？
A: 检查：
- Tailwind CSS 配置
- PostCSS 配置
- CSS 导入顺序

## 📚 学习资源

- [React 官方文档](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Dexie.js](https://dexie.org)
- [SM-2 算法说明](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)

---

开始构建你的记忆卡片应用吧！
