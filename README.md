# Anki Clone - 记忆卡片应用

一个基于间隔重复算法（SM-2）的记忆卡片应用，支持多端使用（Web、PWA）。

## 功能特性

### 已实现 (MVP)
- ✅ **卡片管理**
  - 创建/编辑/删除闪卡
  - 卡组管理
  - 标签系统

- ✅ **间隔重复算法 (SM-2)**
  - 智能复习间隔计算
  - 4 个难度评级（重来/困难/一般/简单）
  - 学习状态追踪

- ✅ **学习模式**
  - 新卡片学习
  - 复习模式
  - 学习队列管理

- ✅ **本地数据存储**
  - IndexedDB 数据库
  - 离线优先设计

- ✅ **PWA 支持**
  - 可安装到桌面/手机主屏幕
  - 离线使用
  - 响应式设计

### 待实现功能

#### Phase 2: 增强功能
- [ ] 富文本编辑（Markdown）
- [ ] 多媒体支持（图片、音频）
- [ ] 数据统计和可视化
- [ ] 导入/导出功能

#### Phase 3: 高级功能
- [ ] 搜索与过滤
- [ ] 云同步
- [ ] 暗色模式
- [ ] 自定义主题

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **数据库**: Dexie.js (IndexedDB)
- **UI**: Tailwind CSS
- **路由**: React Router v6
- **PWA**: Vite PWA Plugin
- **图标**: Lucide React

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 项目结构

```
anki-clone/
├── src/
│   ├── components/        # UI组件
│   │   └── ui/           # 基础UI组件
│   ├── lib/              # 核心库
│   │   ├── db.ts         # 数据库配置
│   │   ├── srs.ts        # SM-2算法
│   │   └── utils.ts      # 工具函数
│   ├── pages/            # 页面组件
│   │   ├── HomePage.tsx
│   │   ├── StudyPage.tsx
│   │   └── DeckDetailPage.tsx
│   ├── store/            # 状态管理
│   ├── types/            # TypeScript类型
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
└── vite.config.ts
```

## SM-2 算法说明

本应用使用 SM-2（SuperMemo 2）间隔重复算法，这是 Anki 使用的核心算法：

- **初始难度因子**: 2.5
- **学习步骤**: 1分钟 → 10分钟
- **毕业间隔**: 1天
- **简单间隔**: 4天

根据你的回答质量（重来/困难/一般/简单），算法会自动调整下次复习时间，帮助你在遗忘临界点前复习，从而提高记忆效率。

## 使用指南

### 1. 创建卡组
点击"新建卡组"按钮，输入卡组名称和描述。

### 2. 添加卡片
进入卡组管理页面，点击"添加卡片"，输入正面（问题）和背面（答案）。

### 3. 开始学习
在首页点击卡组的"学习"按钮，开始复习到期的卡片。

### 4. 评分说明
- **重来**: 完全不记得，需要重新学习
- **困难**: 勉强记起来，间隔略微增加
- **一般**: 记得比较清楚，正常间隔
- **简单**: 非常简单，大幅增加间隔

## PWA 安装

### 桌面端 (Chrome/Edge)
1. 访问应用网址
2. 点击地址栏右侧的安装图标
3. 点击"安装"

### 移动端 (iOS Safari)
1. 访问应用网址
2. 点击分享按钮
3. 选择"添加到主屏幕"

### 移动端 (Android Chrome)
1. 访问应用网址
2. 点击菜单（三点）
3. 选择"安装应用"或"添加到主屏幕"

## 数据说明

- 所有数据存储在本地浏览器的 IndexedDB 中
- 数据不会自动同步到云端
- 清除浏览器数据会导致数据丢失
- 建议定期导出数据备份（功能待实现）

## 后续扩展计划

### Electron 桌面应用
可以使用 Electron 将 Web 应用打包成原生桌面应用：
```bash
npm install -D electron electron-builder
```

### Capacitor 移动应用
可以使用 Capacitor 打包成 iOS/Android 原生应用：
```bash
npm install @capacitor/core @capacitor/cli
```

## License

MIT

---

开始使用记忆卡片，让学习更高效！

