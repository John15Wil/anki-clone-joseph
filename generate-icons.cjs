#!/usr/bin/env node

/**
 * PWA 图标生成脚本
 *
 * 由于没有安装 canvas 或 sharp 库，本脚本提供两种方案：
 * 1. 在浏览器中打开 generate-icons.html 手动下载
 * 2. 或者安装 sharp 后运行此脚本自动生成
 */

const fs = require('fs');
const path = require('path');

console.log('📱 PWA 图标生成工具\n');

// 检查是否已有图标文件
const publicDir = path.join(__dirname, 'public');
const icon192 = path.join(publicDir, 'pwa-192x192.png');
const icon512 = path.join(publicDir, 'pwa-512x512.png');

const has192 = fs.existsSync(icon192);
const has512 = fs.existsSync(icon512);

if (has192 && has512) {
  console.log('✅ 图标文件已存在：');
  console.log('   - public/pwa-192x192.png');
  console.log('   - public/pwa-512x512.png');
  console.log('\n✨ PWA 配置完成！可以直接构建了。\n');
  process.exit(0);
}

console.log('⚠️  图标文件缺失，需要生成 PNG 图标。\n');
console.log('请选择以下方案之一：\n');
console.log('【方案 1】使用浏览器生成（推荐）');
console.log('  1. 在浏览器中打开 generate-icons.html');
console.log('  2. 点击下载按钮获取两个 PNG 文件');
console.log('  3. 将文件放到 public/ 目录\n');
console.log('【方案 2】使用命令行生成');
console.log('  1. 安装 sharp: npm install --save-dev sharp');
console.log('  2. 再次运行此脚本: node generate-icons.js\n');

// 尝试使用 sharp
try {
  const sharp = require('sharp');

  console.log('🎨 检测到 sharp 库，开始生成图标...\n');

  const svgPath = path.join(publicDir, 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 生成 192x192
  sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(icon192)
    .then(() => {
      console.log('✅ 已生成: public/pwa-192x192.png');

      // 生成 512x512
      return sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile(icon512);
    })
    .then(() => {
      console.log('✅ 已生成: public/pwa-512x512.png');
      console.log('\n✨ 图标生成完成！可以运行 npm run build 了。\n');
    })
    .catch(err => {
      console.error('❌ 生成失败:', err.message);
      console.log('\n请使用方案 1（浏览器生成）\n');
    });

} catch (e) {
  // sharp 未安装
  console.log('💡 提示：如果选择方案 2，请先运行: npm install --save-dev sharp\n');
}
