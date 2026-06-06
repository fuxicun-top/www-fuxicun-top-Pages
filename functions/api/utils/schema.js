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
    display_name TEXT NOT NULL DEFAULT '',
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
    CHECK(user_id IS NOT NULL OR guest_name IS NOT NULL)
  )`,
  // 点赞表（user_id 可空 → 游客点赞；游客按 guest_ip 去重）
  `CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    guest_ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  )`,
  // 首页模块表
  `CREATE TABLE IF NOT EXISTS home_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('banner','intro','articles','gallery','travel','custom')),
    title TEXT NOT NULL,
    subtitle TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    protected INTEGER NOT NULL DEFAULT 0,
    config TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 内容页面相关文章表
  `CREATE TABLE IF NOT EXISTS page_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_slug TEXT NOT NULL,
    article_id INTEGER,
    mode TEXT NOT NULL DEFAULT 'manual' CHECK(mode IN ('manual','latest','likes','views')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // 内容页面板块表
  `CREATE TABLE IF NOT EXISTS page_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_slug TEXT NOT NULL,
    section_key TEXT NOT NULL,
    title TEXT,
    content TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(page_slug, section_key)
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
  'CREATE INDEX IF NOT EXISTS idx_page_articles_slug ON page_articles(page_slug)',
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
    ('通知公告', 'announcements', '村委会通知与重要公告', 7),
    ('村民分享', 'villager-share', '村民生活分享与交流', 8),
    ('游客分享', 'visitor-share', '游客游记与体验分享', 9)`,
  // 系统页面（内容页面，对应静态 HTML 文件）
  `INSERT OR IGNORE INTO pages (id, title, slug, content, cover_image, status) VALUES
    (1, '走进福溪', 'about', '千年古村 · 理学圣地 · 三省通衢', '/images/about/village-overview.svg', 'published'),
    (2, '理学文化', 'culture', '北宋理学鼻祖周敦颐讲学堂、爱莲堂、周氏宗祠', '/images/culture/zhou-dunyi.png', 'published'),
    (3, '古村风貌', 'scenery', '120 根木柱、24 座古戏台、门楣石雕、风雨桥', '/images/scenery/ancient-architecture.png', 'published'),
    (4, '民族文化', 'ethnic', '瑶族风情、盘王节、火把节、芦笙长鼓舞', '/images/ethnic/yao-people.svg', 'published'),
    (5, '旅游指南', 'travel', '2 天 1 晚串联潇贺古道三村', '/images/scenery/ancient-architecture.png', 'published'),
    (6, '新闻动态', 'news', '村务公告 · 活动资讯 · 媒体报道', '/images/banners/banner1.svg', 'published'),
    (7, '全部文章', 'articles', '新闻动态、理学文化、古建筑、民俗风情、旅游攻略、村民故事', '/images/banners/banner1.svg', 'published')`,
  // 网站配置
  `INSERT OR IGNORE INTO site_config (key, value) VALUES
    ('site_name', '福溪村'),
    ('site_description', '福溪村位于广西贺州市富川瑶族自治县，是一座历史悠久、文化底蕴深厚的古村落。这里保存着完好的明清古建筑群，是理学文化的重要传承地。'),
    ('site_keywords', '福溪村,富川,贺州,古村落,理学文化,周敦颐,瑶族,潇贺古道,中国传统村落'),
    ('contact_email', 'www@fuxicun.top'),
    ('contact_phone', ''),
    ('contact_address', '广西贺州市富川瑶族自治县朝东镇福溪村'),
    ('icp_number', ''),
    ('copyright_text', '© 2026 福溪村 All Rights Reserved.'),
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
    ('sensitive_words', '傻逼,你妈,操你,去死,滚蛋,混蛋,王八蛋,狗日,色情,裸聊,约炮,嫖,卖淫,赌博,博彩,网赌,赌球,外围,毒品,冰毒,大麻,摇头丸,吸毒,刷单,兼职日赚,稳赚不赔,高回报,传销,台独,藏独,疆独,港独,法轮功'),
    ('home_featured', '{"1":null,"2":null,"3":null,"4":null,"5":null}'),
    ('home_news', '{"1":null,"2":null,"3":null,"4":null}'),
    ('install_password_hash', ''),
    ('rate_limit_exempt_ips', '127.0.0.1'),
    ('cache_enabled', 'false')`,
  // 默认导航
  `INSERT OR IGNORE INTO nav_items (name, url, sort_order, status, is_external) VALUES
    ('首页', '/', 1, 'active', 0),
    ('走进福溪', '/about.html', 2, 'active', 0),
    ('理学文化', '/culture.html', 3, 'active', 0),
    ('古村风貌', '/scenery.html', 4, 'active', 0),
    ('民族文化', '/ethnic.html', 5, 'active', 0),
    ('旅游指南', '/travel.html', 6, 'active', 0),
    ('新闻动态', '/news.html', 7, 'active', 0),
    ('全部文章', '/articles.html', 8, 'active', 0)`,
  // 默认轮播图（使用实际存在的SVG图片）
  `INSERT OR IGNORE INTO banners (title, subtitle, image_url, sort_order, status) VALUES
    ('千年古村 · 山水人和', '宋代理学鼻祖周敦颐后裔聚居地', '/images/banners/banner1.svg', 1, 'active'),
    ('120 根木柱 · 24 座古戏台', '明清古建筑群与岭南瑶族建筑融合的典范', '/images/banners/banner2.svg', 2, 'active'),
    ('潇贺古道 · 三省通衢', '湘桂粤三省交界处的中国传统村落', '/images/banners/banner3.svg', 3, 'active')`,
  // 默认首页模块（protected=1 表示系统默认模块，不可删除）
  `INSERT OR IGNORE INTO home_modules (id, type, title, subtitle, sort_order, status, protected, config) VALUES
    (1, 'banner', '轮播图', NULL, 1, 'active', 1, '{}'),
    (2, 'intro', '走进福溪村', '千年古村 · 理学圣地 · 瑶族风情', 2, 'active', 1, '{"description":"福溪村位于广西贺州市富川瑶族自治县朝东镇，地处湘、桂、粤三省交界，自古有「三省通衢」之称。村落始建于宋代，距今已有千年历史，2012年列入首批中国传统村落名录。这里是宋代理学鼻祖周敦颐后裔聚居地，村中保存有纪念性讲学堂遗址，以及120根木柱撑起的明清古建筑群、24座古戏台遗存和千年风雨桥，是瑶汉文化融合的活态博物馆。","cards":[{"title":"理学文化","desc":"宋代理学鼻祖周敦颐后裔聚居地，纪念性讲学堂遗址、爱莲堂、周氏宗祠构成完整的理学文化轴，「出淤泥而不染」的精神代代相传。","icon":"📚","link":"/culture.html"},{"title":"古建筑群","desc":"120根木柱撑起的明清古建筑群，门楣石雕融合理学家训与瑶族图腾，马头墙、青砖黛瓦展现岭南建筑与瑶族智慧的完美融合。","icon":"🏛️","link":"/scenery.html"},{"title":"瑶族风情","desc":"千年瑶汉融合的活态博物馆，火把节、盘王节、芦笙长鼓舞、二声部民歌，体验多彩民族风情。","icon":"🎭","link":"/ethnic.html"}]}'),
    (3, 'articles', '精选推荐', NULL, 3, 'active', 1, '{"mode":"auto_likes","count":5,"articles":[{"sort":"likes"},{"sort":"likes"},{"sort":"likes"},{"sort":"likes"},{"sort":"likes"}]}'),
    (4, 'articles', '新闻动态', NULL, 4, 'active', 1, '{"mode":"auto_latest","count":4,"categories":["announcements","village-news"],"articles":[{"sort":"latest"},{"sort":"latest"},{"sort":"latest"},{"sort":"latest"}]}'),
    (5, 'gallery', '福溪印象', NULL, 5, 'active', 1, '{"images":[{"url":"/images/scenery/ancient-architecture.png","alt":"古建筑群"},{"url":"/images/culture/ai-lian-tang.png","alt":"爱莲堂"},{"url":"/images/culture/lecture.png","alt":"讲学堂"},{"url":"/images/ethnic/dance.svg","alt":"民俗活动"},{"url":"/images/ethnic/yao-people.svg","alt":"瑶族风情"},{"url":"/images/about/village-overview.svg","alt":"福溪全景"}]}'),
    (6, 'travel', '旅游指南', '来福溪村，感受千年古村的魅力', 6, 'active', 1, '{"cards":[{"icon":"🚗","title":"交通指南","desc":"自驾：永贺高速、国道207、省道203均可到达，距贺州市约1小时车程。铁路：洛湛铁路富川站直达。"},{"icon":"🏠","title":"住宿推荐","desc":"村内有特色民宿可体验古村生活，也可选择富川县城酒店，车程约40分钟。"},{"icon":"🍜","title":"美食推荐","desc":"瑶族油茶、富川三角饺、果条、瑶族腊肉，秋季可品尝富川脐橙和油桃。"},{"icon":"📸","title":"必打卡点","desc":"周敦颐讲学堂（纪念建筑，非原址原貌）、爱莲堂、风雨桥、120根木柱古建筑、门楣石雕、青石板古街。"}]}')`
];

/**
 * 文章种子数据（依赖 users 表，需在创建管理员后插入）
 * author_id 使用传入的管理员 ID，而非硬编码
 */
export const ARTICLES_SEED_SQL = [
  `INSERT OR IGNORE INTO articles (title, slug, content, excerpt, cover_image, category_id, author_id, status, published_at) VALUES
    ('千年古村 山水人和：央视镜头下的福溪', 'qiannian-gucun-shanshui-renhe', '<h2>央视"文化中国行"专题报道</h2><p>2025 年 2 月 17 日，<strong>央视新闻</strong>"文化中国行"以《<strong>千年古村 山水人和</strong>》为题对福溪村进行专题报道，将这座沉睡千年的古村落带到全国观众眼前。同日，共产党员网以《门楣之上》为专题聚焦福溪门楣石雕，展现石头里的家训与智慧。</p><h2>千年福溪 三朝积淀</h2><p>福溪村位于广西贺州市富川瑶族自治县朝东镇，地理坐标东经111°16′27″、北纬24°49′13″，地处湘、桂、粤三省交界，自古即有"三省通衢"之称。村落始建于宋代，距今已有千余年历史。五代时期，楚王马殷率部至此，留下124名汉族士兵驻守，与原本的瑶族居民共同奠定了瑶汉融合的村落基础。</p><h2>2012 年首批中国传统村落</h2><p>2012 年 12 月 17 日，福溪村被住建部、文化部、财政部等部委联合列入<strong>第一批中国传统村落名录</strong>。2022年，富川县入选"传统村落集中连片保护利用示范县"，福溪古建筑群获得"修旧如旧"的系统性修缮，周敦颐讲学堂、爱莲堂、周氏宗祠、风雨桥重新焕发活力。</p><h2>核心文化 IP</h2><p>福溪村以"千年古村·理学圣地"为主IP，"瑶乡古韵·潇贺明珠"为副IP，是宋代理学鼻祖周敦颐后裔聚居地，村中保存有纪念性讲学堂遗址。村中保存着120根木柱撑起的明清古建筑群、24座古戏台遗存、千年风雨桥和潇贺古道遗迹，是瑶汉文化融合的活态博物馆。</p>', '2025年央视"文化中国行"以《千年古村 山水人和》为题报道福溪。这座始建于宋代、地处湘桂粤三省交界、2012年列入首批中国传统村落的古村，正以理学文化与潇贺古道为核心IP焕发新生。', '/images/banners/banner1.svg', 1, 1, 'published', datetime('now', '-6 days')),
    ('周敦颐与福溪：理学沿潇贺古道南传的活证', 'zhoudunyi-yu-fuxi-lixue-nanchuan', '<h2>北宋五子 · 理学开山</h2><p><strong>周敦颐</strong>（1017–1073），字茂叔，号濂溪，世称濂溪先生，<strong>北宋"五子"之一</strong>，宋代理学开山祖师。著有《太极图说》（全文249字，提出"无极而太极"宇宙生成论）、《通书》（不足3000字，"诚"字出现20次）、《爱莲说》（119字，"出淤泥而不染，濯清涟而不妖"）。南宋理宗时诏从祀孔子庙堂，理学奠基者地位获官方承认。黄庭坚评价其"人品甚高，胸怀洒落，如光风霁月"。</p><h2>父亲周辅成与贺州桂岭</h2><p>周敦颐的父亲<strong>周辅成</strong>，大中祥符八年（1015 年）进士，官至<strong>桂岭县令</strong> —— 桂岭即今贺州市八步区桂岭镇，与富川同属贺州地区。周敦颐出生于湖南道县，即<strong>潇贺古道的北端起点</strong>。理学思想沿潇贺古道向南传播至福溪村，周敦颐后裔迁徙至福溪村定居繁衍至今。值得一提的是，<strong>周恩来</strong>为周敦颐第33代孙，<strong>鲁迅</strong>（周树人）亦为其后裔，后裔广泛分布于江、浙、湘、赣、粤、闽等省及港澳新马泰地区，超过三十万人。</p><h2>福溪：理学传承的岭南据点</h2><p>福溪村保存有<strong>宋代理学鼻祖周敦颐的讲学堂</strong>遗址，讲学堂之畔便是<strong>爱莲堂</strong>——"出淤泥而不染"的莲花意象在此具象为堂前莲池、堂内雕饰。<strong>周氏宗祠</strong>保存有完整族谱与家训碑刻，记录周氏家族千年传承。村中古民居门楣石雕融合理学家训（"诚""爱莲"主题）、瑶族图腾（盘瓠神话、自然崇拜符号）和岭南民俗（蝙蝠寓福、莲鱼寓有余），既是装饰艺术，也是家族身份与价值观的凝固。</p><h2>理学核心思想</h2><p>周敦颐哲学以"诚"为核心——宇宙存在的根据和本体，五常之本、百行之源。"无极而太极"的宇宙生成论，"主静立人极"的修身模式，"教人向善，进德修业"的教育思想，深刻影响了福溪村的家风、族规和教育传统。福溪村是研究周敦颐理学思想在岭南传播的重要实物载体，也是展示儒家文化与瑶族文化融合的生动范例。</p>', '周敦颐父亲曾任贺州桂岭县令，本人出生于潇贺古道北端。理学思想沿古道南传至福溪，村中讲学堂遗址、周氏宗祠、爱莲堂构成完整的理学文化轴。', '/images/culture/zhou-dunyi.png', 2, 1, 'published', datetime('now', '-5 days')),
    ('120 根木柱与门楣之上：福溪古建筑群解码', 'fuxi-gujianzhuqun-jiema', '<h2>120 根木柱撑起的木构智慧</h2><p>福溪古建筑群最具辨识度的特征，是<strong>"120 根木柱撑起"</strong>的木构体系。以多根立柱共同承重、灵活应对岭南山地气候的结构，既继承瑶族传统建筑就地取材、巧用木竹的智慧，又融入岭南建筑飞檐翘角、马头墙（封火墙）造型的审美。马头墙具备防火、装饰、文化、实用四大功能，是典型的岭南建筑风格与瑶族建筑元素的完美融合。</p><h2>《门楣之上》：石头里的家训</h2><p>2025 年 2 月 17 日，共产党员网以《门楣之上》为专题报道福溪门楣石雕。每一户古民居的门楣都有精美雕刻，图案融合理学家训（"诚""爱莲"主题）、瑶族图腾（盘瓠神话、自然崇拜符号）和岭南民俗（蝙蝠寓福、莲鱼寓有余）。这些石雕既是装饰艺术，也是家族身份与价值观的凝固，承载着千年文化传承的密码。</p><h2>风雨桥：瑶族建筑的代表作</h2><p>福溪村的<strong>风雨桥</strong>横跨福溪河，是瑶族地区极具代表性的传统建筑。桥上设长凳与遮雨廊，为村民议事、纳凉、对歌的公共空间。它不只是一座桥，更是村落公共生活的物理中心，见证着瑶汉两族千年共居的和谐画面。</p><h2>古戏台 24 座：戏曲文化的鼎盛印记</h2><p>福溪村鼎盛时期曾有<strong>古戏台 24 座</strong>，是潇贺古道沿线戏剧文化最繁盛的节点之一。桂剧（从桂林传入）、彩调（俗称调子）、祁剧（由湖南传入）三大剧种在戏台上交汇，形成"一村多腔"的独特景观。青石板古街与鹅卵石巷道是潇贺古道在村内的延伸，古道始建于公元前219年，青石板已被脚步打磨得温润光亮。</p>', '从120根木柱的木构体系，到央视报道的门楣石雕；从风雨桥的瑶族智慧，到24座古戏台的戏曲鼎盛。', '/images/scenery/ancient-architecture.png', 3, 1, 'published', datetime('now', '-4 days')),
    ('火把节与点千灯：福溪村元宵民俗纪实', 'huobajie-fuxicun-yuanxiao', '<h2>百烛千灯：福溪村元宵火把节</h2><p>每年正月十五，福溪村都会举行独具特色的<strong>元宵火把节</strong>。夜幕降临，村民点燃成千上万盏花灯，沿着青石板古街和风雨桥依次排开，营造出璀璨的灯火长廊。这一传统延续数百年，是福溪村最隆重的节庆活动之一。</p><h2>点千灯仪式</h2><p>"<strong>点千灯</strong>"是福溪村元宵夜的核心仪式。当年添丁的人家会在宗祠前点亮花灯，男挂鳌鱼灯、女挂莲花灯，寓意人丁兴旺、家族昌盛。全村按姓氏轮流举办活动，各宗族在祠堂内焚香祭祖，诵读家训，传承周敦颐理学精神。</p><h2>耍春牛与哭嫁表演</h2><p>元宵期间，福溪村还会举行<strong>耍春牛</strong>、<strong>哭嫁</strong>等传统民俗表演。耍春牛模拟春耕劳作，祈求来年风调雨顺、五谷丰登；哭嫁则是瑶族独特的婚俗展演，以歌声表达对娘家的眷恋，曲调婉转动人。此外还有<strong>抬鬼仔</strong>等古老的驱邪祈福仪式。</p><h2>舞女龙：福溪独有的元宵舞龙</h2><p>福溪村的元宵舞龙别具一格——由村中女性组成的<strong>女龙队</strong>进行舞龙表演。龙身在灯火中翻腾飞舞，锣鼓喧天，但不涉及燃放鞭炮"炸龙"环节，属于传统的舞龙祈福。值得一提的是，富川著名的"<strong>炸龙</strong>"活动主要发生在<strong>富川古明城</strong>（县城中心），从正月初十持续到十五，龙队在鞭炮火光中翻腾，与福溪村古朴祥和的火把节形成鲜明对比。</p><h2>盘王节：瑶族最盛大的祭祖庆典</h2><p>除元宵外，瑶族最重要的传统节日是<strong>盘王节</strong>，源自盘瓠神话，举行祭祀、歌舞、宴饮活动。瑶族歌舞丰富多彩：民歌按声部分单声部和二声部，包括叙事歌、故事歌、盘王歌、迁徙歌等；舞蹈有芦笙长鼓舞、长鼓舞、踏歌堂等。传统戏剧方面，桂剧、彩调、祁剧三大剧种在福溪交汇，形成"一村多腔"的独特景观。</p>', '福溪村正月十五火把节：点千灯、耍春牛、哭嫁表演、舞女龙。富川古明城则有著名的炸龙活动。', '/images/ethnic/dance.svg', 4, 1, 'published', datetime('now', '-3 days')),
    ('福溪村旅游攻略：2 天 1 晚串联潇贺古道三村', 'fuxicun-lvyou-gonglue-2tian1wan', '<h2>到达福溪</h2><p><strong>自驾</strong>：永贺高速、国道207、国道538、省道203均经过富川，距贺州市约1小时车程，距桂林192.5公里，距广州364.5公里。<strong>铁路</strong>：洛湛铁路富川站直达。富川为"四好农村路"全国示范县，路况良好。<strong>飞机</strong>：桂林两江国际机场后转高铁。</p><h2>第一天：福溪深度游</h2><p><strong>上午</strong>抵达福溪，从风雨桥进村，依次参观<strong>周敦颐讲学堂</strong>遗址、<strong>爱莲堂</strong>（堂前莲池、堂内雕饰）、<strong>周氏宗祠</strong>（家训碑刻、族谱文献）。<strong>下午</strong>漫步青石板古街，欣赏<strong>门楣石雕</strong>（融合理学家训与瑶族图腾），参观<strong>120根木柱古建筑群</strong>和<strong>古戏台遗存</strong>。傍晚在风雨桥上看夕阳，感受千年古村的静谧。</p><h2>第二天：潇贺古道串联</h2><p>顺潇贺古道串联<strong>岔山村</strong>（"潇贺古道入桂第一村"，可体验瑶族服饰租赁、品尝梭子粑粑和油茶）和<strong>秀水状元村</strong>（1300多年历史，出过27名进士、1名南宋状元）。下午可前往<strong>富川古明城</strong>（建于明洪武二十九年1396年，鹅卵石老街）和<strong>慈云寺与瑞光塔</strong>（高28米、分7层的明代宝塔）。</p><h2>美食与特产</h2><p>必尝<strong>瑶族油茶</strong>（茶叶与姜为主料）、<strong>富川三角饺</strong>（粉皮裹炒豆角猪肉豆腐干）、<strong>果条</strong>（金黄螺旋状油炸面食）。秋季可品尝<strong>富川脐橙</strong>（获2006年"中国名牌农产品"称号）和<strong>油桃</strong>（种植面积6000多亩）。</p><h2>最佳时节</h2><p>春秋（3-5月、9-11月）气候最舒适。<strong>正月十五</strong>可到福溪村看火把节、点千灯民俗；正月初十至十五可前往<strong>富川古明城</strong>看上灯炸龙嘉年华。秋季是富川脐橙、油桃成熟季。村内有特色民宿可体验古村生活，也可选择富川县城酒店（车程约40分钟）。</p>', '福溪2天1晚行程：第一天深度游讲学堂、爱莲堂、门楣石雕；第二天串联岔山村、秀水状元村。', '/images/scenery/ancient-architecture.png', 5, 1, 'published', datetime('now', '-2 days')),
    ('老人讲古：风雨桥头听来的福溪百年', 'laoren-jianggu-fuxi-bainian', '<h2>"我们这一支，是从道州来的"</h2><p>傍晚的风雨桥头，几位老人围坐石凳上摇着蒲扇。村里上了年纪的周姓老人，几乎都能从族谱上数出自己是周敦颐的第几代孙。"我们这一支，是从道州来的"，老人说的道州，就是湖南道县——周敦颐的出生地，也是潇贺古道的北端起点。理学思想沿着这条千年古道南传，周氏后裔在福溪扎根繁衍，至今已传数十代。</p><h2>"从前村里有 24 座戏台"</h2><p>"现在的年轻人不知道，<strong>从前我们村里有 24 座戏台</strong>"，老人眯着眼回忆。那时候桂剧从桂林传入，彩调从本地兴起，祁剧从湖南传来，三种腔调在同一个戏台上轮番上演。逢年过节，戏台前挤满了人，热闹非凡。如今虽然大部分戏台已经消失，但那些青石板上磨出的凹痕，还记录着当年的繁华。</p><h2>"五代时候来了 124 个兵"</h2><p><strong>"五代时候，楚王马殷打仗经过这里，留下 124 个兵驻守"</strong>，这是福溪村最古老的记忆之一。这124名汉族士兵与原本的瑶族居民共同生活，从此瑶汉两族在这片土地上融合共居，至今已逾千年。村里的建筑风格——岭南的马头墙配上瑶族的风雨桥，汉族的祠堂配上瑶族的木柱结构——就是这段融合历史的最好见证。</p><h2>"门楣上的字，是老祖宗教的做人道理"</h2><p>指着一户古民居门楣上的石雕，老人说："这些字和图案，是老祖宗教的做人道理。"门楣上刻着莲花和"诚"字，融合了周敦颐理学家训与瑶族图腾。每一块门楣都是一个家族的家训，历经风雨，代代相传。2025年央视和共产党员网都来拍过这些门楣，说它们是"石头里的家训"。</p>', '风雨桥头听老人讲古：周姓族人从湖南道州迁来、村里曾有24座戏台、五代时期124名汉族士兵驻守。', '/images/ethnic/yao-people.svg', 6, 1, 'published', datetime('now', '-1 days')),
    ('关于福溪村官方网站正式上线的公告', 'fuxicun-guanwang-shangxian', '<h2>网站正式上线</h2><p>经村委会研究决定，<strong>福溪村官方网站</strong>（www.fuxicun.top）即日起正式上线运行。本站系统展示福溪村千年历史文化、古建筑风貌、瑶族民俗风情与旅游服务信息，支持游客与注册用户两种互动方式。</p><h2>关于福溪村</h2><p>福溪村位于广西贺州市富川瑶族自治县朝东镇，地处湘、桂、粤三省交界，自古有"三省通衢"之称。村落始建于宋代，距今已有千年历史，2012年列入首批中国传统村落名录。这里是宋代理学鼻祖周敦颐后裔聚居地，村中保存有纪念性讲学堂遗址，以及120根木柱撑起的明清古建筑群、24座古戏台遗存、千年风雨桥和潇贺古道遗迹，是瑶汉文化融合的活态博物馆。</p><h2>网站主要栏目</h2><ul><li><strong>走进福溪</strong>：村庄概况、历史沿革、地理区位</li><li><strong>理学文化</strong>：周敦颐讲学堂、爱莲堂、周氏宗祠、理学思想传承</li><li><strong>古村风貌</strong>：120根木柱建筑、门楣石雕、风雨桥、古戏台、青石板古街</li><li><strong>民族文化</strong>：瑶族传统、盘王节、火把节、芦笙长鼓舞、二声部民歌</li><li><strong>旅游指南</strong>：交通、住宿、美食、行程推荐、最佳时节</li><li><strong>新闻动态</strong>：村内新闻、活动资讯、媒体报道</li></ul><h2>联系我们</h2><p>如有任何问题或建议，欢迎通过网站联系我们。福溪村期待您的到来！</p>', '福溪村官方网站正式上线。本站系统展示福溪历史文化、古建筑、民族风情与旅游信息，支持游客与注册用户两种互动方式。', '/images/about/village-overview.svg', 7, 1, 'published', datetime('now')),
    ('福溪村的清晨：青石板路上的烟火气', 'fuxicun-qingchen-yanhuoqi', '<h2>清晨五点半的福溪</h2><p>天刚蒙蒙亮，福溪村的青石板路上已经响起了脚步声。村里上了年纪的老人习惯早起，趁着凉快去菜地里摘菜。阿婆挑着两筐新鲜的豆角和苦瓜，从风雨桥那头慢慢走过来，桥下的溪水哗哗作响。</p><h2>老屋里的早餐</h2><p>我家老屋是典型的福溪古民居——<strong>120根木柱</strong>撑起的木构建筑，冬暖夏凉。奶奶一大早就熬好了<strong>瑶族油茶</strong>，配上自家做的<strong>果条</strong>，这就是福溪人最地道的早餐。油茶用茶叶和生姜为主料，捣碎后加水煮开，喝一口又香又提神。</p><h2>门楣下的故事</h2><p>吃完早饭，我习惯在村里走走。每家每户的门楣上都有精美的石雕，刻着莲花、"诚"字和各种图案。奶奶说这些是老祖宗留下来的家训，教后人做人的道理。2025年央视来拍过这些门楣，说是"石头里的家训"。现在村里年轻人大多外出打工了，但每逢过年过节，大家都会回来，在<strong>周氏宗祠</strong>里祭祖、唱戏、闹元宵。</p><h2>守望千年古村</h2><p>我是一名普通的福溪村民，生在这里长在这里。虽然外面的世界很精彩，但每次回到福溪，走在青石板路上，听着溪水声和鸟叫声，心里就觉得踏实。希望更多人能来福溪看看，感受这份千年传承的宁静与美好。</p>', '福溪村民分享清晨的古村生活：油茶早餐、门楣石雕、青石板路、风雨桥，感受千年古村的烟火气。', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 8, 1, 'published', datetime('now', '-3 days')),
    ('自驾福溪古村：两天一夜的潇贺古道之旅', 'zijia-fuxicun-xiaohe-gudao', '<h2>为什么选择福溪村</h2><p>作为一个喜欢探访古村落的旅行爱好者，福溪村在我的清单上已经很久了。这个位于<strong>广西贺州市富川瑶族自治县</strong>的千年古村，2012年列入首批中国传统村落，是宋代理学鼻祖<strong>周敦颐后裔</strong>的聚居地。从广州出发，走永贺高速大约4小时就能到达。</p><h2>第一天：福溪深度游</h2><p>上午抵达福溪，第一眼就被<strong>风雨桥</strong>震撼到了——这座横跨溪水的廊桥是瑶族建筑的代表作。过了桥就是青石板古街，两旁是保存完好的明清古民居。最让我惊叹的是<strong>120根木柱</strong>撑起的古建筑群，以及每家门楣上精美的石雕，融合了理学家训和瑶族图腾。下午参观了<strong>周敦颐讲学堂遗址</strong>（纪念建筑）和<strong>爱莲堂</strong>，感受到了理学文化在岭南的深厚根基。</p><h2>第二天：串联潇贺古道</h2><p>第二天沿着潇贺古道去了<strong>岔山村</strong>和<strong>秀水状元村</strong>。岔山是"潇贺古道入桂第一村"，可以体验瑶族服饰和品尝油茶、梭子粑粑。秀水有1300多年历史，出过1名状元27名进士。下午返回途中去了<strong>富川古明城</strong>，鹅卵石老街很有味道。</p><h2>实用攻略</h2><p><strong>交通</strong>：自驾最方便，永贺高速、国道207均可到达。<strong>住宿</strong>：村内有特色民宿，也可住富川县城。<strong>美食</strong>：必尝瑶族油茶、富川三角饺、果条。<strong>最佳时间</strong>：春秋两季最舒适，正月十五有火把节。强烈推荐给喜欢古村落和民族文化的朋友们！</p>', '自驾两天一夜游福溪村：风雨桥、120根木柱古建筑、门楣石雕、潇贺古道串联岔山秀水，完整攻略分享。', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800', 9, 1, 'published', datetime('now', '-2 days'))`
];

/**
 * 内容页面板块种子数据
 * 每个页面的可编辑文本板块
 */
export const PAGE_SECTIONS_SEED_SQL = [
  // 走进福溪
  `INSERT OR IGNORE INTO page_sections (page_slug, section_key, title, content, sort_order) VALUES
    ('about', 'intro', '千年古村 · 三省通衢', '<p>福溪村位于<strong>广西贺州市富川瑶族自治县朝东镇</strong>（东经 111°16′，北纬 24°49′），距县城 40 公里、贺州市区 100 公里，与湖南江华瑶族自治县相邻，地处<strong>湘、桂、粤三省交界</strong>，自古号"三省通衢"。</p><p>始建于宋代，距今<strong>千余年</strong>历史，是<strong>首批中国传统村落</strong>（2012 年 12 月 17 日列入）。村中保存有<strong>120 根木柱撑起</strong>的传统木构、明清古民居、周氏宗祠、风雨桥（廊桥）、青石板古道与精美门楣石刻，<strong>鼎盛时期曾有古戏台 24 座</strong>，是潇贺古道沿线戏曲文化最繁盛的节点之一。</p><p>2025 年 2 月 17 日，央视新闻"文化中国行"以《<strong>千年古村 山水人和</strong>》为题专题报道；同日共产党员网以<strong>《门楣之上》</strong>为专题展示村中门楣石雕；同年 7 月红网视频再次报道，将福溪与岔山、秀水并称为"潇贺古道上散落的明珠"。</p>', 1),
    ('about', 'history', '历史沿革', '<p><strong>五代</strong>：楚王马殷率部至此协助剿匪，留下124名汉族士兵驻守，与原本的瑶族居民共同奠定了瑶汉融合的村落基础。</p><p><strong>宋代</strong>：福溪村正式形成规模。同期周敦颐（1017–1073）出生于潇贺古道北端的湖南道县，其父周辅成曾任贺州桂岭县令，理学思想沿潇贺古道南下传至福溪。</p><p><strong>元—清</strong>：福溪作为潇贺古道沿线节点，商旅往来频繁。鼎盛时期村中曾有古戏台24座，桂剧、彩调、祁剧交汇上演。</p><p><strong>2012年</strong>：12月17日，福溪村被列入第一批中国传统村落名录。</p><p><strong>2022年</strong>：富川瑶族自治县入选"传统村落集中连片保护利用示范县"，福溪古建筑群得到系统性修缮。</p><p><strong>2025年</strong>：央视《文化中国行》、共产党员网《门楣之上》、红网接连报道，福溪走入全国视野。</p>', 2),
    ('about', 'data', '村庄数据', '<p><strong>1000+</strong> 年历史（宋代起）</p><p><strong>24</strong> 鼎盛期古戏台</p><p><strong>120</strong> 木柱建筑结构</p><p><strong>2012</strong> 首批中国传统村落</p>', 3),
    ('about', 'culture', '特色文化', '<p><strong>理学文化</strong>：理学鼻祖周敦颐讲学传承之地。爱莲堂、周氏宗祠承载"出淤泥而不染"的理学精神，村中周姓多为周敦颐后裔。</p><p><strong>古建筑艺术</strong>：明清古民居、风雨桥、马头墙、青石板古街、24座古戏台遗存与精美门楣石刻 —— 岭南建筑与瑶族建筑深度融合的活化石。</p><p><strong>潇贺古道</strong>：秦代（公元前219年）开辟的"楚粤通衢"，连接长江与珠江两大水系。2013年湘桂古道列为全国重点文物保护单位，福溪正在沿线。</p><p><strong>瑶族风情</strong>：盘王节、千年火把节习俗、芦笙长鼓舞、瑶族二声部民歌等非遗活态展演 —— 瑶汉文化在福溪和谐共生。</p>', 4)`,
  // 理学文化
  `INSERT OR IGNORE INTO page_sections (page_slug, section_key, title, content, sort_order) VALUES
    ('culture', 'biography', '周敦颐 · 北宋理学鼻祖', '<p><strong>周敦颐</strong>（1017–1073），字茂叔，号濂溪，世称濂溪先生，<strong>北宋"五子"之一</strong>（与邵雍、张载、程颢、程颐并列），宋代理学开山祖师。著有《<strong>太极图说</strong>》《<strong>通书</strong>》《<strong>爱莲说</strong>》。</p><p>父亲<strong>周辅成</strong>（1015 年进士）官至贺州<strong>桂岭县令</strong>，与富川同属贺州；周敦颐本人出生于湖南道州（今道县），即<strong>潇贺古道北端</strong>。其理学思想沿古道南传至福溪，村中周姓为其后裔 ——<strong>周恩来</strong>系第 33 代孙，<strong>鲁迅</strong>（周树人）亦为后裔。</p>', 1),
    ('culture', 'lecture_hall', '讲学堂与爱莲堂', '<p>福溪村保存有<strong>宋代理学鼻祖周敦颐讲学堂</strong>遗址（现存建筑<strong>"濂溪祠"</strong>或宗族祠堂，后世村内各氏族人为纪念先祖而修建的纪念性建筑，并非宋代原址原貌）—— 这是村中最重要的文化 IP，也是研究周敦颐理学在岭南传播的关键实物载体。讲学堂之畔便是<strong>爱莲堂</strong>，"出淤泥而不染，濯清涟而不妖"的莲花意象在此具象为堂前莲池、堂内雕饰。</p><p>讲学堂、爱莲堂与<strong>周氏宗祠</strong>共同构成村中的"理学文化轴"。每逢重要节日，周姓族人在此祭祖、诵读《爱莲说》《太极图说》，将"诚为本、莲为志"的家风一代代传下去。</p>', 2)`,
  // 古村风貌
  `INSERT OR IGNORE INTO page_sections (page_slug, section_key, title, content, sort_order) VALUES
    ('scenery', 'architecture', '120 根木柱 · 千年匠心', '<p>福溪古建筑群以独特的<strong>"120 根木柱撑起"</strong>木构体系闻名，融合岭南建筑的<strong>马头墙（封火墙）</strong>、青砖黛瓦，与瑶族建筑的<strong>风雨桥</strong>结构。明清古民居、周氏宗祠、爱莲堂、24 座古戏台、青石板古街、鹅卵石巷道、精美门楣石刻共同构成完整的传统村落肌理。</p><p>2025 年央视新闻"文化中国行"以《千年古村 山水人和》为题报道；同期共产党员网以<strong>《门楣之上》</strong>为专题，专门展示福溪门楣雕刻艺术 —— 那些静静凝视百年时光的石雕，是福溪最具辨识度的视觉符号。</p>', 1)`,
  // 民族文化
  `INSERT OR IGNORE INTO page_sections (page_slug, section_key, title, content, sort_order) VALUES
    ('ethnic', 'yao_intro', '瑶族 · 勉的人民', '<p>瑶族自称<strong>"勉"（Mien）</strong>，是中国最古老的民族之一，全球总人口约 350 万，其中中国境内约 282 万（广西约 147 万，占全国 62%）。始祖传说为<strong>蚩尤、盘瓠</strong>，最重要的传统节日是纪念始祖的<strong>盘王节</strong>。</p><p>福溪所在的<strong>富川瑶族自治县</strong>于 1983 年成立，2021 年获评第八批<strong>全国民族团结进步示范区</strong>。福溪是瑶汉融合的典型村落 —— 五代时期楚王马殷部下<strong>124 名汉族士兵</strong>驻守此地，与原本的瑶族居民世代共同生活，形成今天瑶汉同村、风俗交融的独特景观。</p>', 1)`,
  // 旅游指南
  `INSERT OR IGNORE INTO page_sections (page_slug, section_key, title, content, sort_order) VALUES
    ('travel', 'transport', '到达福溪', '<p><strong>自驾</strong>：永贺高速、国道 207、省道 203 均可到达，距贺州市约 1 小时车程。富川为"四好农村路"全国示范县，路况良好。</p><p><strong>铁路</strong>：洛湛铁路富川站直达。</p><p><strong>飞机</strong>：桂林两江国际机场后转高铁。</p>', 1),
    ('travel', 'itinerary', '推荐行程：2 天 1 晚串联三村', '<p><strong>第一天</strong>上午抵达福溪，参观周敦颐讲学堂（纪念建筑）、爱莲堂、周氏宗祠与古戏台群；午餐尝<strong>富川三角饺</strong>、油茶、果条；下午沿青石板古街细看门楣石雕，傍晚在风雨桥上对夕阳。</p><p><strong>第二天</strong>顺潇贺古道串联同属朝东镇的<strong>岔山村</strong>（潇贺古道入桂第一村）和<strong>秀水状元村</strong>（出过 1 状元 27 进士），下午折返<strong>富川古明城</strong>（建于明洪武二十九年/1396 年）。</p>', 2)`
];

/**
 * 内容页面相关文章种子数据
 * 每个页面预置 1 条手动指定的文章
 */
export const PAGE_ARTICLES_SEED_SQL = [
  `INSERT OR IGNORE INTO page_articles (page_slug, article_id, mode, sort_order) VALUES
    ('scenery', 3, 'manual', 1),
    ('travel', 5, 'manual', 1)`
];

/**
 * 初始化数据库
 * 依次执行：建表 → 创建索引 → 插入种子数据（不含文章，文章在创建管理员后插入）
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

  // 第三步：清空可能有重复数据的表（防止多次安装导致重复）
  for (const table of ['nav_items', 'banners', 'categories', 'site_config', 'home_modules']) {
    try {
      await db.prepare(`DELETE FROM ${table}`).run();
    } catch (e) { /* 表不存在时忽略 */ }
  }

  // 重置自增序列（D1 的 AUTOINCREMENT 在 DROP TABLE 后不重置）
  try {
    await db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('categories','nav_items','banners','home_modules')").run();
  } catch (e) { /* 忽略 */ }

  // 第四步：插入基础种子数据（分类、配置、导航、轮播图，不含文章）
  for (const sql of SEED_DATA_SQL) {
    await db.prepare(sql).run();
  }
}

/**
 * 插入文章种子数据（需在创建管理员后调用）
 * @param {Object} db - D1 数据库绑定对象
 * @param {number} adminId - 管理员用户 ID，用于替换硬编码的 author_id
 */
export async function insertArticlesSeed(db, adminId) {
  // 替换 author_id 并逐条执行
  for (const sql of ARTICLES_SEED_SQL) {
    const actualSql = sql.replace(/, 1, 'published', datetime\(/g, ', ' + adminId + ", 'published', datetime(");
    await db.prepare(actualSql).run();
  }
  // 插入内容页面相关文章种子数据（先清空再插入，防止重复）
  try {
    await db.prepare("DELETE FROM page_articles").run();
    for (const sql of PAGE_ARTICLES_SEED_SQL) {
      await db.prepare(sql).run();
    }
  } catch (e) { /* 表不存在时忽略 */ }
  // 插入内容页面板块种子数据
  try {
    for (const sql of PAGE_SECTIONS_SEED_SQL) {
      await db.prepare(sql).run();
    }
  } catch (e) { /* 表不存在时忽略 */ }
}

/**
 * 数据库增量迁移（每次 API 请求时调用，幂等执行）
 * 为已有数据库添加新字段，不影响已安装的数据库
 */
export async function migrateDatabase(db, env) {
  // 添加 display_name 字段（2026-05-26）
  try {
    await db.prepare("ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''").run();
    // 为已有用户回填 display_name = username
    await db.prepare("UPDATE users SET display_name = username WHERE display_name = ''").run();
  } catch (e) {
    // 字段已存在时忽略
  }

  // 填充评论/点赞策略默认值（2026-05-27，仅插入不存在的 key）
  const configDefaults = [
    ['comment_policy', 'open'],
    ['comment_review', 'false'],
    ['like_policy', 'open']
  ];
  for (const [key, value] of configDefaults) {
    try {
      const existing = await db.prepare("SELECT key FROM site_config WHERE key = ?").bind(key).first();
      if (!existing) {
        await db.prepare("INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now'))").bind(key, value).run();
      }
    } catch (e) { /* 忽略 */ }
  }

  // 违禁词：旧安装为空字符串时填充默认词库
  try {
    const row = await db.prepare("SELECT value FROM site_config WHERE key = 'sensitive_words'").first();
    if (!row || !row.value) {
      const defaultWords = '傻逼,你妈,操你,去死,滚蛋,混蛋,王八蛋,狗日,色情,裸聊,约炮,嫖,卖淫,赌博,博彩,网赌,赌球,外围,毒品,冰毒,大麻,摇头丸,吸毒,刷单,兼职日赚,稳赚不赔,高回报,传销,台独,藏独,疆独,港独,法轮功';
      await db.prepare("INSERT INTO site_config (key, value, updated_at) VALUES ('sensitive_words', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(defaultWords).run();
    }
  } catch (e) { /* 忽略 */ }

  // 更新新闻动态导航链接：/articles.html?category=village-news → /news.html
  try {
    await db.prepare("UPDATE nav_items SET url = '/news.html' WHERE url = '/articles.html?category=village-news'").run();
    // 清除导航缓存确保立即生效
    if (env && env.FUXICUN_KV) {
      try { await env.FUXICUN_KV.delete('cache:nav'); } catch (e) { /* 忽略 */ }
    }
  } catch (e) { /* 忽略 */ }

  // 更新新闻动态模块配置：添加分类过滤（只显示通知公告和村内新闻）
  try {
    const newsModule = await db.prepare("SELECT id, config FROM home_modules WHERE type = 'articles' AND title = '新闻动态'").first();
    if (newsModule && newsModule.config) {
      try {
        const cfg = JSON.parse(newsModule.config);
        if (!cfg.categories) {
          cfg.categories = ['announcements', 'village-news'];
          await db.prepare("UPDATE home_modules SET config = ? WHERE id = ?").bind(JSON.stringify(cfg), newsModule.id).run();
        }
      } catch (e) { /* JSON 解析失败忽略 */ }
    }
  } catch (e) { /* 忽略 */ }

  // 添加默认分类：村民分享、游客分享
  try {
    await db.prepare("INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES ('村民分享', 'villager-share', '村民生活分享与交流', 8)").run();
    await db.prepare("INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES ('游客分享', 'visitor-share', '游客游记与体验分享', 9)").run();
  } catch (e) { /* 忽略 */ }

  // 补充 cache_enabled 配置
  try {
    const ce = await db.prepare("SELECT key FROM site_config WHERE key = 'cache_enabled'").first();
    if (!ce) {
      await db.prepare("INSERT INTO site_config (key, value) VALUES ('cache_enabled', 'false')").run();
    }
  } catch (e) { /* 忽略 */ }

  // 更新联系地址（补全区划前缀）
  try {
    const addr = await db.prepare("SELECT value FROM site_config WHERE key = 'contact_address'").first();
    if (addr && addr.value === '富川瑶族自治县朝东镇福溪村') {
      await db.prepare("UPDATE site_config SET value = '广西贺州市富川瑶族自治县朝东镇福溪村' WHERE key = 'contact_address'").run();
    }
  } catch (e) { /* 忽略 */ }

  // 更新图片引用：SVG → PNG（仅 PNG 比 SVG 小的文件）
  try {
    const updates = [
      ['/images/culture/lecture.svg', '/images/culture/lecture.png'],
      ['/images/culture/ai-lian-tang.svg', '/images/culture/ai-lian-tang.png'],
      ['/images/culture/zhou-dunyi.svg', '/images/culture/zhou-dunyi.png'],
      ['/images/scenery/ancient-architecture.svg', '/images/scenery/ancient-architecture.png'],
      ['/images/ethnic/costume.svg', '/images/ethnic/costume.png'],
      ['/images/default/article.svg', '/images/default/article.png'],
    ];
    for (const [old, rep] of updates) {
      await db.prepare("UPDATE banners SET image_url = ? WHERE image_url = ?").bind(rep, old).run();
      await db.prepare("UPDATE articles SET cover_image = ? WHERE cover_image = ?").bind(rep, old).run();
    }
  } catch (e) { /* 忽略 */ }

  // 创建 page_articles 表（如不存在）并插入默认种子数据
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS page_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL,
      article_id INTEGER,
      mode TEXT NOT NULL DEFAULT 'manual' CHECK(mode IN ('manual','latest','likes','views')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();
    // 插入默认种子数据（如果表为空）
    const existing = await db.prepare("SELECT COUNT(*) as count FROM page_articles").first();
    if (existing && existing.count === 0) {
      for (const sql of PAGE_ARTICLES_SEED_SQL) {
        await db.prepare(sql).run();
      }
    }
  } catch (e) { /* 忽略 */ }

  // 创建 page_sections 表并插入默认数据
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS page_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL,
      section_key TEXT NOT NULL,
      title TEXT,
      content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(page_slug, section_key)
    )`).run();
    const psExisting = await db.prepare("SELECT COUNT(*) as count FROM page_sections").first();
    if (psExisting && psExisting.count === 0) {
      for (const sql of PAGE_SECTIONS_SEED_SQL) {
        await db.prepare(sql).run();
      }
    }
  } catch (e) { /* 忽略 */ }

  // 修正首页 intro 模块卡片顺序（理学文化排第一）
  try {
    const introModule = await db.prepare("SELECT id, config FROM home_modules WHERE type = 'intro' LIMIT 1").first();
    if (introModule && introModule.config) {
      try {
        const cfg = JSON.parse(introModule.config);
        if (cfg.cards && cfg.cards.length === 3 && cfg.cards[0].title === '古建筑群') {
          // 顺序错误，修正为：理学文化、古建筑群、瑶族风情
          const correctOrder = [cfg.cards[1], cfg.cards[0], cfg.cards[2]];
          cfg.cards = correctOrder;
          await db.prepare("UPDATE home_modules SET config = ? WHERE id = ?").bind(JSON.stringify(cfg), introModule.id).run();
        }
      } catch (e) { /* JSON 解析失败忽略 */ }
    }
  } catch (e) { /* 忽略 */ }

  // 插入系统页面（如果不存在）
  try {
    const systemPages = [
      [1, '走进福溪', 'about', '千年古村 · 理学圣地 · 三省通衢', '/images/about/village-overview.svg'],
      [2, '理学文化', 'culture', '北宋理学鼻祖周敦颐讲学堂、爱莲堂、周氏宗祠', '/images/culture/zhou-dunyi.png'],
      [3, '古村风貌', 'scenery', '120 根木柱、24 座古戏台、门楣石雕、风雨桥', '/images/scenery/ancient-architecture.png'],
      [4, '民族文化', 'ethnic', '瑶族风情、盘王节、火把节、芦笙长鼓舞', '/images/ethnic/yao-people.svg'],
      [5, '旅游指南', 'travel', '2 天 1 晚串联潇贺古道三村', '/images/scenery/ancient-architecture.png'],
      [6, '新闻动态', 'news', '村务公告 · 活动资讯 · 媒体报道', '/images/banners/banner1.svg'],
      [7, '全部文章', 'articles', '新闻动态、理学文化、古建筑、民俗风情、旅游攻略、村民故事', '/images/banners/banner1.svg'],
    ];
    for (const [id, title, slug, content, cover] of systemPages) {
      const existing = await db.prepare("SELECT id FROM pages WHERE slug = ?").first(slug);
      if (!existing) {
        await db.prepare("INSERT OR IGNORE INTO pages (id, title, slug, content, cover_image, status) VALUES (?, ?, ?, ?, ?, 'published')").bind(id, title, slug, content, cover).run();
      }
    }
  } catch (e) { /* 忽略 */ }
}
