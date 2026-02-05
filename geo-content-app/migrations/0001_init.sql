-- GEO Content Agent D1 数据库初始化
-- 文章历史表
CREATE TABLE IF NOT EXISTS Article (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  strategy TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_article_strategy ON Article(strategy);
CREATE INDEX IF NOT EXISTS idx_article_created_at ON Article(created_at DESC);

-- 模板表
CREATE TABLE IF NOT EXISTS Template (
  strategy TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL
);
