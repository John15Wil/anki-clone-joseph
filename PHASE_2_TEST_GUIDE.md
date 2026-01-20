# Phase 2 功能测试指南

## 🧪 测试清单

### 1. 学习会话管理测试

#### 测试场景 A：卡片数量少于 20 张
**步骤**：
1. 创建一个卡组，添加 10 张卡片
2. 点击 "开始学习"
3. 观察页面

**预期结果**：
- ✅ 学习进度显示 "1 / 10"
- ✅ 没有显示 "（限量）" 标记
- ✅ 没有显示会话限制提示

#### 测试场景 B：卡片数量超过 20 张
**步骤**：
1. 创建一个卡组，添加 30 张卡片
2. 点击 "开始学习"
3. 观察页面

**预期结果**：
- ✅ 学习进度显示 "1 / 20（限量）"
- ✅ 显示橙色提示框："本次学习限制为 20 张卡片，完成后可继续下一轮学习"
- ✅ 学完 20 张后到达完成页面
- ✅ 返回首页后仍显示 "待复习" 卡片（剩余 10 张）

---

### 2. 优先级排序测试

#### 测试场景：验证最久未复习优先
**步骤**：
1. 创建 5 张卡片，手动设置不同的 `nextReview` 时间：
   - 卡片 A: 3天前到期
   - 卡片 B: 1天前到期
   - 卡片 C: 5天前到期（最久）
   - 卡片 D: 现在到期
   - 卡片 E: 2天前到期
2. 开始学习

**预期结果**：
- ✅ 第一张卡片是 C（5天前）
- ✅ 第二张卡片是 A（3天前）
- ✅ 第三张卡片是 E（2天前）
- ✅ 第四张卡片是 B（1天前）
- ✅ 第五张卡片是 D（现在）

**如何手动设置**：
```javascript
// 在浏览器控制台执行
const db = await import('./src/lib/db').then(m => m.db);
const reviews = await db.cardReviews.toArray();

// 修改第一张卡片到期时间为3天前
await db.cardReviews.update(reviews[0].id, {
  nextReview: Date.now() - 3 * 24 * 60 * 60 * 1000
});
```

---

### 3. 卡片混合测试

#### 测试场景：新卡片和复习卡片交替
**步骤**：
1. 创建一个卡组
2. 添加 5 张新卡片（从未学习过）
3. 添加 5 张复习卡片（已学习过，但到期了）
4. 开始学习

**预期结果**：
- ✅ 卡片交替出现：复习 → 新 → 复习 → 新 → ...
- ✅ 不会连续出现 5 张新卡片
- ✅ 不会连续出现 5 张复习卡片

**如何验证**：
- 观察每张卡片的内容
- 或在浏览器控制台查看 `studyQueue` 的 `state` 字段

---

### 4. 时间追踪测试

#### 测试场景 A：单张卡片时间
**步骤**：
1. 开始学习一张卡片
2. 等待 10 秒
3. 显示答案
4. 再等待 5 秒
5. 点击评分（共 15 秒）

**预期结果**：
- ✅ 完成页面显示总时长包含这 15 秒
- ✅ 数据库 `studyLogs` 表的 `timeSpent` 字段约为 15

#### 测试场景 B：多张卡片平均时间
**步骤**：
1. 学习 5 张卡片
2. 每张卡片分别停留：5秒、10秒、15秒、8秒、12秒
3. 完成学习

**预期结果**：
- ✅ 总时长：50 秒（或显示 "0分" 如果不足1分钟）
- ✅ 平均时间：10 秒/张（50 ÷ 5）

**验证数据库**：
```javascript
// 浏览器控制台
const db = await import('./src/lib/db').then(m => m.db);
const logs = await db.studyLogs.toArray();
console.table(logs);
// 查看每条记录的 timeSpent 字段
```

---

### 5. 完成页面统计测试

#### 测试场景：所有统计正确
**步骤**：
1. 学习 10 张卡片，评分如下：
   - 重来：2 张
   - 困难：3 张
   - 一般：4 张
   - 简单：1 张
2. 每张卡片停留约 10 秒
3. 查看完成页面

**预期结果**：
```
学习卡片    正确率      学习时长
  10        50%        1分40秒

重来  困难  一般  简单
 2     3    4     1

平均每张卡片 10 秒
```

**计算验证**：
- ✅ 学习卡片：10
- ✅ 正确率：(4 + 1) / 10 = 50%
- ✅ 学习时长：10张 × 10秒 = 100秒 = 1分40秒
- ✅ 平均时间：100秒 ÷ 10张 = 10秒

---

## 🐛 常见问题排查

### 问题 1：时间总是显示 0 秒
**可能原因**：
- `cardStartTime` 状态未正确更新
- `handleAnswer` 中的时间计算有误

**检查**：
```javascript
// 浏览器控制台
console.log('Card start time:', cardStartTime);
console.log('Current time:', Date.now());
console.log('Time spent:', (Date.now() - cardStartTime) / 1000);
```

### 问题 2：卡片没有交替出现
**可能原因**：
- 所有卡片都是新卡片
- 所有卡片都是复习卡片
- 洗牌逻辑有误

**检查**：
```javascript
// 查看学习队列的状态分布
const queue = studyQueue.map(item => ({
  front: item.card.front.substring(0, 20),
  state: item.review.state
}));
console.table(queue);
```

### 问题 3：超过 20 张但没有限制
**可能原因**：
- `MAX_CARDS_PER_SESSION` 常量未生效
- `slice(0, MAX_CARDS_PER_SESSION)` 逻辑有误

**检查**：
```javascript
console.log('Total due cards:', queue.length);
console.log('Limited queue:', limitedQueue.length);
console.log('Should be:', Math.min(queue.length, 20));
```

---

## ✅ 验收标准

### 必须通过的测试

1. ✅ 超过 20 张卡片时正确限制
2. ✅ 显示会话限制提示
3. ✅ 最久未复习的卡片优先
4. ✅ 新卡片和复习卡片交替
5. ✅ 时间追踪精确到秒
6. ✅ 完成页面显示所有统计
7. ✅ 数据库正确记录时间

### 推荐测试

1. 📝 边缘情况：只有 1 张卡片
2. 📝 边缘情况：恰好 20 张卡片
3. 📝 边缘情况：只有新卡片
4. 📝 边缘情况：只有复习卡片
5. 📝 性能测试：1000+ 张卡片加载速度

---

## 📊 性能基准

### 加载速度
- ✅ 加载 100 张卡片：< 500ms
- ✅ 排序和洗牌：< 100ms
- ✅ 切换卡片：< 50ms

### 内存使用
- ✅ 20 张卡片会话：< 10MB
- ✅ 无内存泄漏

---

## 🎯 用户验收测试

### 真实使用场景

1. **早晨复习**：
   - 打开应用
   - 看到 "待复习 45 张"
   - 点击复习
   - 只学习 20 张（约 15 分钟）
   - 完成并查看统计
   - 感觉很有成就感 ✅

2. **午休学习**：
   - 返回应用
   - 还有 "待复习 25 张"
   - 再学习 20 张
   - 剩余 5 张留到晚上

3. **晚上完成**：
   - 最后学习 5 张
   - 看到 "今天已经没有需要复习的卡片了"
   - 查看今日总学习时间和卡片数

---

## 📝 测试报告模板

```markdown
## Phase 2 功能测试报告

**测试日期**：____
**测试人员**：____

### 1. 学习会话管理
- [ ] 少于 20 张正常显示
- [ ] 超过 20 张正确限制
- [ ] 显示限制提示
- [ ] 完成后可继续下一轮

### 2. 优先级排序
- [ ] 最久未复习优先
- [ ] 排序逻辑正确

### 3. 卡片混合
- [ ] 新卡片和复习卡片交替
- [ ] 不连续出现同类型

### 4. 时间追踪
- [ ] 精确到秒
- [ ] 总时长正确
- [ ] 平均时间正确
- [ ] 数据库记录正确

### 5. 完成页面
- [ ] 所有统计显示
- [ ] 计算正确
- [ ] UI 美观

### 问题记录
1.
2.
3.

### 总体评价
- [ ] 通过
- [ ] 需要修复
```

---

## 🚀 快速测试脚本

在浏览器控制台运行：

```javascript
// 快速创建测试数据
async function createTestData() {
  const { db } = await import('./src/lib/db.js');

  // 创建测试卡组
  const deckId = `test-${Date.now()}`;
  await db.decks.add({
    id: deckId,
    name: '测试卡组（Phase 2）',
    description: '包含30张卡片，用于测试会话管理',
    cardsCount: 30,
    newCardsPerDay: 20,
    reviewsPerDay: 100,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // 创建30张卡片
  for (let i = 1; i <= 30; i++) {
    const cardId = `card-${Date.now()}-${i}`;
    await db.cards.add({
      id: cardId,
      deckId,
      front: `问题 ${i}`,
      back: `答案 ${i}`,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // 创建复习记录
    const isNew = i <= 15; // 前15张是新卡片，后15张是复习卡片
    await db.cardReviews.add({
      id: cardId,
      cardId,
      ease: 2.5,
      interval: isNew ? 0 : 7,
      repetitions: isNew ? 0 : 3,
      nextReview: isNew ? Date.now() : Date.now() - (Math.random() * 5 * 24 * 60 * 60 * 1000), // 复习卡片到期时间随机
      lastReview: isNew ? Date.now() : Date.now() - (7 * 24 * 60 * 60 * 1000),
      state: isNew ? 'new' : 'review'
    });
  }

  console.log('✅ 测试数据创建成功！');
  console.log(`卡组ID: ${deckId}`);
  console.log('刷新页面查看');
}

createTestData();
```

---

测试愉快！🧪
