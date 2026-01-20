-- 修复同步问题的 SQL 脚本
-- 在 Supabase SQL Editor 中执行

-- 1. 删除现有的表并重新创建（允许 string ID）
DROP TABLE IF EXISTS study_logs CASCADE;
DROP TABLE IF EXISTS card_reviews CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS decks CASCADE;

-- 2. 重新创建表，使用 text 类型 ID 而不是 UUID

-- 用户配置表（保持不变）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 卡组表（使用 text ID）
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cards_count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT
);

-- 卡片表（使用 text ID）
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  deck_id TEXT REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT
);

-- 卡片复习记录表（使用 card_id 外键）
CREATE TABLE IF NOT EXISTS card_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  ease_factor REAL NOT NULL,
  interval INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  next_review BIGINT NOT NULL,
  last_review BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(card_id)
);

-- 学习记录表（使用 card_id 外键，但不包含 id 字段）
CREATE TABLE IF NOT EXISTS study_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  time_spent INTEGER NOT NULL,
  timestamp BIGINT NOT NULL
);

-- 3. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_updated_at ON decks(updated_at);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at);
CREATE INDEX IF NOT EXISTS idx_card_reviews_user_id ON card_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_card_reviews_card_id ON card_reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_user_id ON study_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_card_id ON study_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_timestamp ON study_logs(timestamp);

-- 4. 重新启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;

-- 5. 重新创建 RLS 策略

-- Decks
DROP POLICY IF EXISTS "Users can view own decks" ON decks;
CREATE POLICY "Users can view own decks" ON decks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own decks" ON decks;
CREATE POLICY "Users can insert own decks" ON decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own decks" ON decks;
CREATE POLICY "Users can update own decks" ON decks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own decks" ON decks;
CREATE POLICY "Users can delete own decks" ON decks
  FOR DELETE USING (auth.uid() = user_id);

-- Cards
DROP POLICY IF EXISTS "Users can view own cards" ON cards;
CREATE POLICY "Users can view own cards" ON cards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cards" ON cards;
CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cards" ON cards;
CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cards" ON cards;
CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (auth.uid() = user_id);

-- Card Reviews
DROP POLICY IF EXISTS "Users can view own card reviews" ON card_reviews;
CREATE POLICY "Users can view own card reviews" ON card_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own card reviews" ON card_reviews;
CREATE POLICY "Users can insert own card reviews" ON card_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own card reviews" ON card_reviews;
CREATE POLICY "Users can update own card reviews" ON card_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own card reviews" ON card_reviews;
CREATE POLICY "Users can delete own card reviews" ON card_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Study Logs
DROP POLICY IF EXISTS "Users can view own study logs" ON study_logs;
CREATE POLICY "Users can view own study logs" ON study_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study logs" ON study_logs;
CREATE POLICY "Users can insert own study logs" ON study_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ✅ 修复完成！现在 TEXT 类型的 ID 也可以正常同步了