# 云同步功能配置指南

## 🎯 目标
实现多设备数据同步，让用户可以在手机、平板、电脑等设备间无缝切换学习。

## 📋 方案对比

| 方案 | 费用 | 难度 | 推荐度 | 说明 |
|------|------|------|--------|------|
| **Supabase** | 免费 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 推荐！功能完整，配置简单 |
| Firebase | 免费 | ⭐⭐⭐ | ⭐⭐⭐⭐ | Google 产品，国内访问可能不稳定 |
| 自建后端 | 服务器费用 | ⭐⭐⭐⭐⭐ | ⭐⭐ | 需要维护服务器 |
| Cloudflare Workers | 免费 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 适合高级用户 |

## 🚀 Supabase 配置步骤（推荐）

### 第 1 步：注册 Supabase

1. 访问 https://supabase.com
2. 点击右上角 **"Start your project"**
3. 使用 GitHub 账号登录（推荐）或邮箱注册

### 第 2 步：创建项目

1. 登录后，点击 **"New project"**
2. 如果是第一次使用，需要先创建一个 Organization：
   - Organization name: 输入您的名字或团队名
   - 点击 "Create organization"

3. 填写项目信息：
   ```
   Name: anki-clone
   Database Password: [设置一个强密码，请务必保存！]
   Region: Northeast Asia (Tokyo) [推荐，速度最快]
            或 Southeast Asia (Singapore)
   Pricing Plan: Free [免费版足够使用]
   ```

4. 点击 **"Create new project"**
5. 等待 2-3 分钟（项目正在初始化）

### 第 3 步：获取 API 密钥

项目创建完成后：

1. 进入项目面板
2. 点击左侧菜单 **Settings** (齿轮图标)
3. 点击 **API**
4. 复制以下信息：

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...（很长的字符串）
```

⚠️ **重要：** 请保存这两个信息，稍后配置时需要用到。

### 第 4 步：创建数据库表

1. 点击左侧菜单 **SQL Editor**
2. 点击 **"+ New query"**
3. 将下面的 SQL 复制粘贴到编辑器：

```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 启用行级安全策略
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- 用户配置表
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 卡组表
CREATE TABLE decks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cards_count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT
);

-- 卡片表
CREATE TABLE cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT
);

-- 卡片复习记录表
CREATE TABLE card_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  ease_factor REAL NOT NULL,
  interval INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  next_review BIGINT NOT NULL,
  last_review BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(card_id)
);

-- 学习记录表
CREATE TABLE study_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  time_spent INTEGER NOT NULL,
  timestamp BIGINT NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_updated_at ON decks(updated_at);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_updated_at ON cards(updated_at);
CREATE INDEX idx_card_reviews_user_id ON card_reviews(user_id);
CREATE INDEX idx_card_reviews_card_id ON card_reviews(card_id);
CREATE INDEX idx_study_logs_user_id ON study_logs(user_id);
CREATE INDEX idx_study_logs_card_id ON study_logs(card_id);
CREATE INDEX idx_study_logs_timestamp ON study_logs(timestamp);

-- 启用行级安全策略（RLS）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own decks" ON decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decks" ON decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks" ON decks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks" ON decks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cards" ON cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own card reviews" ON card_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card reviews" ON card_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card reviews" ON card_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card reviews" ON card_reviews
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own study logs" ON study_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study logs" ON study_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：用户注册后自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. 点击右下角 **"Run"** 执行 SQL
5. 看到 "Success. No rows returned" 表示创建成功

### 第 5 步：配置邮箱认证（可选）

如果想使用邮箱登录：

1. 点击左侧菜单 **Authentication**
2. 点击 **Providers**
3. 找到 **Email**，确保已启用
4. 可以配置邮件模板（Settings → Email Templates）

### 第 6 步：提供信息给开发者

完成上述步骤后，请提供以下信息：

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

这两个信息在 **Settings → API** 页面可以找到。

---

## 🔐 安全说明

### Anon Key 是否安全？
✅ **是的！** Anon Key 是设计为公开的，可以安全地在前端代码中使用。

安全保障：
- ✅ 行级安全策略（RLS）：用户只能访问自己的数据
- ✅ JWT 认证：所有请求都需要有效的用户令牌
- ✅ HTTPS 加密：所有通信都是加密的
- ✅ API 速率限制：防止滥用

### 不应该暴露的密钥
❌ **Service Role Key** - 这个密钥有完整数据库权限，绝不能在前端使用！

---

## 📱 功能规划

完成云同步后，用户将能够：

1. **账号系统**
   - ✅ 邮箱注册/登录
   - ✅ 密码重置
   - ✅ 用户配置文件

2. **数据同步**
   - ✅ 实时同步卡组
   - ✅ 实时同步卡片
   - ✅ 同步学习进度
   - ✅ 同步学习记录

3. **冲突处理**
   - ✅ 基于时间戳的冲突解决
   - ✅ 最后修改优先

4. **离线支持**
   - ✅ 本地优先策略
   - ✅ 后台自动同步
   - ✅ 同步状态显示

---

## 💰 费用说明

### Supabase 免费额度（完全够用）

| 资源 | 免费额度 | 说明 |
|------|---------|------|
| 数据库存储 | 500MB | 可存储数十万张卡片 |
| 文件存储 | 1GB | 可存储大量图片 |
| 带宽 | 2GB/月 | 个人使用完全足够 |
| API 请求 | 无限制 | 但有速率限制 |
| 认证用户 | 50,000 | 远超个人项目需求 |

### 何时需要付费？
只有在以下情况才需要考虑付费：
- 用户数超过 50,000
- 每月带宽超过 2GB
- 需要更高的 API 速率限制
- 需要自动备份功能

个人使用或小型项目，**免费版完全足够**！

---

## 🎯 下一步

完成 Supabase 配置后，我将：

1. ✅ 安装 Supabase 客户端库
2. ✅ 创建认证页面（登录/注册）
3. ✅ 实现数据同步逻辑
4. ✅ 添加同步状态指示器
5. ✅ 实现本地数据迁移到云端
6. ✅ 测试多设备同步

请完成上述配置步骤，然后提供 **Project URL** 和 **Anon Key**！
