# PWA 部署指南

## 🎉 PWA 配置已完成！

您的应用现在已经是一个功能完整的 PWA（渐进式 Web 应用），可以在多平台使用：
- ✅ iOS（iPhone/iPad）
- ✅ macOS
- ✅ Windows
- ✅ Android
- ✅ Linux

## 📱 本地测试 PWA

### 1. 预览构建版本

当前预览服务器已启动：**http://localhost:4173**

```bash
# 如果服务器未运行，可以使用以下命令启动：
npm run build
npx vite preview
```

### 2. 测试 PWA 功能

在 **Chrome 或 Edge** 浏览器中打开 http://localhost:4173：

1. **查看安装提示**
   - 浏览器地址栏右侧会出现安装图标 ➕
   - 或者在菜单中选择 "安装应用"

2. **安装应用**
   - 点击安装按钮
   - 应用会被添加到桌面/应用列表

3. **测试离线功能**
   - 安装后，关闭浏览器
   - 断开网络连接
   - 打开桌面上的应用
   - 应该仍然可以正常使用（Service Worker 缓存）

4. **测试快捷方式**（右键点击应用图标）
   - 开始学习
   - 查看统计

### 3. 在手机上测试

#### iOS (iPhone/iPad)
1. 使用 Safari 打开应用 URL
2. 点击 "分享" 按钮
3. 选择 "添加到主屏幕"
4. 应用会出现在主屏幕上，像原生应用一样运行

#### Android
1. 使用 Chrome 打开应用 URL
2. 浏览器会自动显示 "添加到主屏幕" 提示
3. 点击安装
4. 应用会出现在应用抽屉中

## 🚀 部署到生产环境

### 推荐方案 1：Vercel（最简单）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 按照提示完成部署
# - 首次使用需要登录
# - 按回车使用默认设置
# - 部署完成后会获得一个 HTTPS URL
```

**优点：**
- 完全免费
- 自动 HTTPS
- 全球 CDN 加速
- 每次 git push 自动部署

### 推荐方案 2：Netlify

```bash
# 1. 安装 Netlify CLI
npm i -g netlify-cli

# 2. 部署
netlify deploy --prod

# 3. 按照提示完成部署
# - 首次使用需要登录
# - Build command: npm run build
# - Publish directory: dist
```

**优点：**
- 完全免费
- 自动 HTTPS
- 支持自定义域名
- 表单处理和 Serverless 函数

### 方案 3：GitHub Pages

```bash
# 1. 在 package.json 中添加 homepage 字段
# "homepage": "https://yourusername.github.io/anki-clone"

# 2. 安装 gh-pages
npm install --save-dev gh-pages

# 3. 在 package.json 的 scripts 中添加：
# "deploy": "npm run build && gh-pages -d dist"

# 4. 部署
npm run deploy
```

**注意：** 需要在 vite.config.ts 中设置正确的 base 路径：
```typescript
export default defineConfig({
  base: '/anki-clone/', // 替换为你的仓库名
  plugins: [...]
})
```

## 🔍 PWA 功能清单

### ✅ 已实现的功能

- **离线支持**
  - Service Worker 缓存策略
  - 所有静态资源离线可用
  - IndexedDB 数据持久化

- **桌面/主屏幕安装**
  - 支持所有主流平台
  - 自定义应用图标（192x192 和 512x512）
  - 独立窗口运行（standalone 模式）

- **应用快捷方式**
  - 开始学习（直接进入学习界面）
  - 查看统计（直接查看学习数据）

- **主题和样式**
  - 深色主题色（#111827）
  - 适配移动端状态栏
  - 竖屏优先显示

- **资源缓存策略**
  - 字体文件（Google Fonts）长期缓存
  - 静态资源预缓存
  - 运行时缓存策略

### 📱 PWA 技术栈

- **vite-plugin-pwa** - PWA 构建工具
- **Workbox** - Service Worker 管理
- **Web App Manifest** - 应用元数据
- **IndexedDB (Dexie.js)** - 本地数据存储
- **Cache API** - 离线缓存

## 🎯 测试清单

部署后，请测试以下功能：

- [ ] 应用可以安装到桌面/主屏幕
- [ ] 离线时应用仍可使用
- [ ] 应用图标显示正确
- [ ] 应用快捷方式可用
- [ ] 学习进度和数据持久化
- [ ] 在不同设备上同步使用（需要后续添加云同步）
- [ ] 导入/导出功能正常
- [ ] 统计数据显示正确

## 📊 PWA 评分

部署后可以使用 [Lighthouse](https://developers.google.com/web/tools/lighthouse) 检查 PWA 质量：

```bash
# 在 Chrome DevTools 中：
# 1. 打开开发者工具 (F12)
# 2. 切换到 Lighthouse 标签
# 3. 选择 Progressive Web App 选项
# 4. 点击 Generate report
```

目标评分：
- Performance: 90+
- PWA: 100
- Accessibility: 90+
- Best Practices: 90+

## 🔄 后续优化建议

### 1. 云同步功能（强烈推荐）
为了真正实现多设备使用，建议添加云同步：

```bash
# 使用 Supabase（免费）
npm install @supabase/supabase-js

# 或使用 Firebase
npm install firebase
```

### 2. 性能优化
- 代码分割（当前单个 chunk 1.8MB，可以拆分）
- 图片优化（使用 WebP 格式）
- 懒加载非关键组件

### 3. Electron 桌面应用（可选）
如果需要更好的桌面体验：

```bash
npm install --save-dev electron electron-builder
```

### 4. Capacitor 原生应用（可选）
如果需要发布到应用商店：

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

## 💡 常见问题

### Q: PWA 和原生应用有什么区别？
A: PWA 通过浏览器安装，无需应用商店审核，更新即时生效。原生应用需要商店审核，但可以使用更多系统权限。

### Q: iOS 上的限制有哪些？
A: iOS Safari 对 PWA 的支持有一些限制：
- Service Worker 缓存限制（50MB）
- 不支持后台同步
- 不支持推送通知
- 缓存可能被清理（7天未使用）

### Q: 如何强制更新 PWA？
A: 用户关闭并重新打开应用时，Service Worker 会自动检查更新。开发者可以在代码中添加手动更新提示。

### Q: 数据存储安全吗？
A: IndexedDB 数据存储在本地设备上，与浏览器数据隔离。建议添加云同步和备份功能。

## 📝 快速部署命令

```bash
# 1. 构建生产版本
npm run build

# 2. 测试构建结果
npx vite preview

# 3. 部署到 Vercel（推荐）
npx vercel --prod

# 或部署到 Netlify
npx netlify deploy --prod --dir=dist

# 或部署到 GitHub Pages
npm run deploy
```

## 🎊 恭喜！

您的应用现在已经是一个跨平台的 PWA 了！用户可以：
- 在任何设备上使用浏览器访问
- 安装到设备上，像原生应用一样使用
- 离线使用所有功能
- 通过快捷方式快速访问常用功能

下一步建议添加云同步功能，让用户可以在多设备间同步学习进度。
