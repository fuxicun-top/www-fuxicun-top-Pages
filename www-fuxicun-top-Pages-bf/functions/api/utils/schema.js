// ========================================
// 文件说明：数据库 Schema 定义与初始化
// 文件路径：functions/api/utils/schema.js
// 功能：13张数据表定义、索引创建、种子数据、数据库初始化
// ========================================

/**
 * 建表 SQL 语句（13张表）
 * 包含：用户、分类、文章、评论、点赞、媒体、轮播图、
 *       网站配置、会话、密码重置、操作日志、导航、自定义页面
 */
export const CREATE_TABLES_SQL = [
  // 用户表
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'editor', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 分类表
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 文章表
  `CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image TEXT,
    category_id INTEGER REFERENCES categories(id),
    author_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'published', 'rejected')),
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    is_top INTEGER NOT NULL DEFAULT 0,
    -- 评论策略：NULL=继承全局；open=任何人可评；login_required=仅登录用户；closed=关闭评论
    -- 用户群体含中老年人，默认对所有人开放，仅敏感文章用 login_required/closed
    comment_policy TEXT CHECK(comment_policy IS NULL OR comment_policy IN ('open', 'login_required', 'closed')),
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 评论表（user_id 可空 → 游客评论；游客必须填 guest_name）
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    guest_name TEXT,
    guest_ip TEXT,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- 数据完整性：要么是登录用户（user_id），要么是游客（guest_name），不能两个都为 NULL
    CHECK(user_id IS NOT NULL OR guest_name IS NOT NULL)
  )`,
  // 点赞表（user_id 可空 → 游客点赞；游客按 guest_ip 去重）
  `CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    guest_ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- 登录用户按 (article_id, user_id) 唯一；游客按 (article_id, guest_ip) 唯一
    UNIQUE(article_id, user_id),
    UNIQUE(article_id, guest_ip),
    CHECK(user_id IS NOT NULL OR guest_ip IS NOT NULL)
  )`,
  // 媒体文件表
  `CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 轮播图表
  `CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 网站配置表
  `CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 会话表
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 密码重置表
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 操作日志表
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    detail TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 导航菜单表
  `CREATE TABLE IF NOT EXISTS nav_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    is_external INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 自定义页面表
  `CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    cover_image TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`
];

/**
 * 索引创建 SQL
 * 覆盖文章、评论、点赞、会话、日志等高频查询字段
 */
export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)',
  'CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)',
  'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)',
  'CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at)',
  'CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id)',
  'CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_likes_article ON likes(article_id)',
  'CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'
];

/**
 * 种子数据 SQL
 * 默认7个分类 + 网站配置 + 导航菜单 + 轮播图
 */
export const SEED_DATA_SQL = [
  // 默认分类
  `INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES
    ('村内新闻', 'village-news', '福溪村最新动态和新闻', 1),
    ('理学文化', 'lixue-culture', '周敦颐理学思想与福溪村理学传承', 2),
    ('古建筑', 'architecture', '福溪村明清古建筑群介绍', 3),
    ('民俗风情', 'folk-custom', '瑶族民俗文化与传统节庆', 4),
    ('旅游攻略', 'travel-guide', '福溪村旅游指南与推荐路线', 5),
    ('村民故事', 'villager-stories', '福溪村村民的故事与生活', 6),
    ('通知公告', 'announcements', '村委会通知与重要公告', 7)`,
  // 网站配置
  `INSERT OR IGNORE INTO site_config (key, value) VALUES
    ('site_name', '福溪村'),
    ('site_description', '福溪村官方网站 - 广西贺州市富川瑶族自治县朝东镇福溪村'),
    ('site_keywords', '福溪村,富川,贺州,古村落,理学文化,瑶族'),
    ('contact_email', 'admin@fuxicun.top'),
    ('contact_phone', ''),
    ('contact_address', '广西壮族自治区贺州市富川瑶族自治县朝东镇福溪村'),
    ('icp_number', ''),
    ('copyright_text', '© 2026 福溪村 All Rights Reserved'),
    ('footer_text', 'Powered by Cloudflare Pages'),
    ('theme_primary_color', '#2d6a4f'),
    ('theme_primary_light', '#40916c'),
    ('theme_primary_bg', '#f0f7f4'),
    ('theme_secondary_color', '#d4a373'),
    ('theme_memorial_dates', '[]'),
    ('theme_memorial_mode', 'false'),
    ('comment_policy', 'open'),
    ('comment_review', 'false'),
    ('like_policy', 'open'),
    ('sensitive_words', '')`,
  // 默认导航
  `INSERT OR IGNORE INTO nav_items (name, url, sort_order, status, is_external) VALUES
    ('首页', '/', 1, 'active', 0),
    ('走进福溪', '/about.html', 2, 'active', 0),
    ('理学文化', '/culture.html', 3, 'active', 0),
    ('古村风貌', '/scenery.html', 4, 'active', 0),
    ('民族文化', '/ethnic.html', 5, 'active', 0),
    ('旅游指南', '/travel.html', 6, 'active', 0),
    ('新闻动态', '/articles.html', 7, 'active', 0)`,
  // 默认轮播图
  `INSERT OR IGNORE INTO banners (title, subtitle, image_url, sort_order, status) VALUES
    ('千年古村 · 山水人和', '宋代理学鼻祖周敦颐讲学堂所在地', '/images/banners/banner1.svg', 1, 'active'),
    ('120 根木柱 · 24 座古戏台', '明清古建筑群与岭南瑶族建筑融合的典范', '/images/banners/banner2.svg', 2, 'active'),
    ('潇贺古道 · 三省通衢', '湘桂粤三省交界处的中国传统村落', '/images/banners/banner3.svg', 3, 'active')`
];

/**
 * 初始化数据库
 * 依次执行：建表 → 创建索引 → 插入种子数据
 * @param {Object} db - D1 数据库绑定对象
 */
export async function initDatabase(db) {
  // 第一步：创建所有数据表
  for (const sql of CREATE_TABLES_SQL) {
    await db.prepare(sql).run();
  }

  // 第二步：创建索引
  for (const sql of CREATE_INDEXES_SQL) {
    await db.prepare(sql).run();
  }

  // 第三步：插入种子数据
  for (const sql of SEED_DATA_SQL) {
    await db.prepare(sql).run();
  }
}
