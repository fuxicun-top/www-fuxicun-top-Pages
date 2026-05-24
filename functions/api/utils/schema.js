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
    ('site_description', '福溪村位于广西贺州市富川瑶族自治县，是一座历史悠久、文化底蕴深厚的古村落。这里保存着完好的明清古建筑群，是理学文化的重要传承地。'),
    ('site_keywords', '福溪村,富川,贺州,古村落,理学文化,周敦颐,瑶族,潇贺古道,中国传统村落'),
    ('contact_email', 'www@fuxicun.top'),
    ('contact_phone', ''),
    ('contact_address', '富川瑶族自治县朝东镇福溪村'),
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
    ('sensitive_words', ''),
    ('home_featured', '{"1":null,"2":null,"3":null,"4":null,"5":null}'),
    ('home_news', '{"1":null,"2":null,"3":null,"4":null}'),
    ('install_password_hash', '')`,
  // 默认导航
  `INSERT OR IGNORE INTO nav_items (name, url, sort_order, status, is_external) VALUES
    ('首页', '/', 1, 'active', 0),
    ('走进福溪', '/about.html', 2, 'active', 0),
    ('理学文化', '/culture.html', 3, 'active', 0),
    ('古村风貌', '/scenery.html', 4, 'active', 0),
    ('民族文化', '/ethnic.html', 5, 'active', 0),
    ('旅游指南', '/travel.html', 6, 'active', 0),
    ('新闻动态', '/articles.html?category=village-news', 7, 'active', 0),
    ('全部文章', '/articles.html', 8, 'active', 0)`,
  // 默认轮播图（使用实际存在的SVG图片）
  `INSERT OR IGNORE INTO banners (title, subtitle, image_url, sort_order, status) VALUES
    ('千年古村 · 山水人和', '宋代理学鼻祖周敦颐讲学堂所在地', '/images/banners/banner1.svg', 1, 'active'),
    ('120 根木柱 · 24 座古戏台', '明清古建筑群与岭南瑶族建筑融合的典范', '/images/banners/banner2.svg', 2, 'active'),
    ('潇贺古道 · 三省通衢', '湘桂粤三省交界处的中国传统村落', '/images/banners/banner3.svg', 3, 'active')`,
  // 默认文章（7 篇，覆盖各栏目，安装后即有高质量内容）
  // author_id=1 对应安装时创建的管理员用户
  // content 字段与 js/pages/article-detail.js defaultArticles 完全同步
  `INSERT OR IGNORE INTO articles (title, slug, content, excerpt, cover_image, category_id, author_id, status, published_at) VALUES
    ('千年古村 山水人和：央视镜头下的福溪', 'qiannian-gucun-shanshui-renhe', '<h2>央视"文化中国行"专题报道</h2><p>2025 年 2 月 17 日，<strong>央视新闻</strong>"文化中国行"以《<strong>千年古村 山水人和</strong>》为题对福溪村进行专题报道，将这座沉睡千年的古村落带到全国观众眼前。同日，共产党员网以《门楣之上》为专题聚焦福溪门楣石雕，展现石头里的家训与智慧。</p><h2>千年福溪 三朝积淀</h2><p>福溪村位于广西贺州市富川瑶族自治县朝东镇，地理坐标东经111°16′27″、北纬24°49′13″，地处湘、桂、粤三省交界，自古即有"三省通衢"之称。村落始建于宋代，距今已有千余年历史。五代时期，楚王马殷率部至此，留下124名汉族士兵驻守，与原本的瑶族居民共同奠定了瑶汉融合的村落基础。</p><h2>2012 年首批中国传统村落</h2><p>2012 年 12 月 17 日，福溪村被住建部、文化部、财政部等部委联合列入<strong>第一批中国传统村落名录</strong>。2022年，富川县入选"传统村落集中连片保护利用示范县"，福溪古建筑群获得"修旧如旧"的系统性修缮，周敦颐讲学堂、爱莲堂、周氏宗祠、风雨桥重新焕发活力。</p><h2>核心文化 IP</h2><p>福溪村以"千年古村·理学圣地"为主IP，"瑶乡古韵·潇贺明珠"为副IP，是宋代理学鼻祖周敦颐讲学堂所在地，也是周氏后裔聚居地。村中保存着120根木柱撑起的明清古建筑群、24座古戏台遗存、千年风雨桥和潇贺古道遗迹，是瑶汉文化融合的活态博物馆。</p>', '2025年央视"文化中国行"以《千年古村 山水人和》为题报道福溪。这座始建于宋代、地处湘桂粤三省交界、2012年列入首批中国传统村落的古村，正以理学文化与潇贺古道为核心IP焕发新生。', '/images/banners/banner1.svg', 1, 1, 'published', datetime('now', '-6 days')),
    ('周敦颐与福溪：理学沿潇贺古道南传的活证', 'zhoudunyi-yu-fuxi-lixue-nanchuan', '<h2>北宋五子 · 理学开山</h2><p><strong>周敦颐</strong>（1017–1073），字茂叔，号濂溪，世称濂溪先生，<strong>北宋"五子"之一</strong>，宋代理学开山祖师。著有《太极图说》（全文249字，提出"无极而太极"宇宙生成论）、《通书》（不足3000字，"诚"字出现20次）、《爱莲说》（119字，"出淤泥而不染，濯清涟而不妖"）。南宋理宗时诏从祀孔子庙堂，理学奠基者地位获官方承认。黄庭坚评价其"人品甚高，胸怀洒落，如光风霁月"。</p><h2>父亲周辅成与贺州桂岭</h2><p>周敦颐的父亲<strong>周辅成</strong>，大中祥符八年（1015 年）进士，官至<strong>桂岭县令</strong> —— 桂岭即今贺州市八步区桂岭镇，与富川同属贺州地区。周敦颐出生于湖南道县，即<strong>潇贺古道的北端起点</strong>。理学思想沿潇贺古道向南传播至福溪村，周敦颐后裔迁徙至福溪村定居繁衍至今。值得一提的是，<strong>周恩来</strong>为周敦颐第33代孙，<strong>鲁迅</strong>（周树人）亦为其后裔，后裔广泛分布于江、浙、湘、赣、粤、闽等省及港澳新马泰地区，超过三十万人。</p><h2>福溪：理学传承的岭南据点</h2><p>福溪村保存有<strong>宋代理学鼻祖周敦颐的讲学堂</strong>遗址，讲学堂之畔便是<strong>爱莲堂</strong>——"出淤泥而不染"的莲花意象在此具象为堂前莲池、堂内雕饰。<strong>周氏宗祠</strong>保存有完整族谱与家训碑刻，记录周氏家族千年传承。村中古民居门楣石雕融合理学家训（"诚""爱莲"主题）、瑶族图腾（盘瓠神话、自然崇拜符号）和岭南民俗（蝙蝠寓福、莲鱼寓有余），既是装饰艺术，也是家族身份与价值观的凝固。</p><h2>理学核心思想</h2><p>周敦颐哲学以"诚"为核心——宇宙存在的根据和本体，五常之本、百行之源。"无极而太极"的宇宙生成论，"主静立人极"的修身模式，"教人向善，进德修业"的教育思想，深刻影响了福溪村的家风、族规和教育传统。福溪村是研究周敦颐理学思想在岭南传播的重要实物载体，也是展示儒家文化与瑶族文化融合的生动范例。</p>', '周敦颐父亲曾任贺州桂岭县令，本人出生于潇贺古道北端。理学思想沿古道南传至福溪，村中讲学堂遗址、周氏宗祠、爱莲堂构成完整的理学文化轴。', '/images/culture/zhou-dunyi.svg', 2, 1, 'published', datetime('now', '-5 days')),
    ('120 根木柱与门楣之上：福溪古建筑群解码', 'fuxi-gujianzhuqun-jiema', '<h2>120 根木柱撑起的木构智慧</h2><p>福溪古建筑群最具辨识度的特征，是<strong>"120 根木柱撑起"</strong>的木构体系。以多根立柱共同承重、灵活应对岭南山地气候的结构，既继承瑶族传统建筑就地取材、巧用木竹的智慧，又融入岭南建筑飞檐翘角、马头墙（封火墙）造型的审美。马头墙具备防火、装饰、文化、实用四大功能，是典型的岭南建筑风格与瑶族建筑元素的完美融合。</p><h2>《门楣之上》：石头里的家训</h2><p>2025 年 2 月 17 日，共产党员网以《门楣之上》为专题报道福溪门楣石雕。每一户古民居的门楣都有精美雕刻，图案融合理学家训（"诚""爱莲"主题）、瑶族图腾（盘瓠神话、自然崇拜符号）和岭南民俗（蝙蝠寓福、莲鱼寓有余）。这些石雕既是装饰艺术，也是家族身份与价值观的凝固，承载着千年文化传承的密码。</p><h2>风雨桥：瑶族建筑的代表作</h2><p>福溪村的<strong>风雨桥</strong>横跨福溪河，是瑶族地区极具代表性的传统建筑。桥上设长凳与遮雨廊，为村民议事、纳凉、对歌的公共空间。它不只是一座桥，更是村落公共生活的物理中心，见证着瑶汉两族千年共居的和谐画面。</p><h2>古戏台 24 座：戏曲文化的鼎盛印记</h2><p>福溪村鼎盛时期曾有<strong>古戏台 24 座</strong>，是潇贺古道沿线戏剧文化最繁盛的节点之一。桂剧（从桂林传入）、彩调（俗称调子）、祁剧（由湖南传入）三大剧种在戏台上交汇，形成"一村多腔"的独特景观。青石板古街与鹅卵石巷道是潇贺古道在村内的延伸，古道始建于公元前219年，青石板已被脚步打磨得温润光亮。</p>', '从120根木柱的木构体系，到央视报道的门楣石雕；从风雨桥的瑶族智慧，到24座古戏台的戏曲鼎盛。', '/images/scenery/ancient-architecture.svg', 3, 1, 'published', datetime('now', '-4 days')),
    ('炸龙闹元宵：千年瑶俗与潇贺古道的回响', 'zhalong-yuanxiao-qiannian-yaosu', '<h2>正月初十至十五的"炸龙"狂欢</h2><p>富川的"<strong>炸龙</strong>"是当地最具代表性的元宵庆典，<strong>从正月初十闹到十五元宵</strong>，连续六天。"舞龙 + 炸龙"相结合，龙身游街起舞，沿途观众燃放鞭炮"炸"向龙身，鞭炮声越响、火光越烈意味着福气越旺。大型龙狮队40余人，小型20多人，场面壮观热烈。</p><h2>千年传承：沿潇贺古道传入富川</h2><p>据瑶族先人口口相传，<strong>舞龙、炸龙的习俗是沿着秦潇贺古道传入富川的</strong>，距今已有千年历史。潇贺古道始建于公元前219年，北起湖南道县，南至广西贺州八步区，是秦汉时期沟通长江水系与珠江水系的重要通道。2013年，潇贺古道永州段被列入全国重点文物保护单位。</p><h2>盘王节：瑶族最盛大的祭祖庆典</h2><p>瑶族最重要的传统节日是<strong>盘王节</strong>，源自盘瓠神话，举行祭祀、歌舞、宴饮活动。此外还有鸟崽节、社节、牛王节等传统节日。瑶族歌舞丰富多彩：民歌按声部分单声部和二声部，包括叙事歌、故事歌、盘王歌、迁徙歌等；舞蹈有芦笙长鼓舞、长鼓舞、踏歌堂、抛绣球等。传统戏剧方面，桂剧、彩调、祁剧三大剧种在福溪交汇，形成"一村多腔"的独特景观。</p><h2>瑶汉融合：千年共居的文化奇观</h2><p>五代时期楚王马殷部下124名汉族士兵驻守福溪，与瑶族居民共同生活千年。建筑上融合了岭南风格（马头墙、青砖黛瓦）、瑶族元素（风雨桥、木柱结构）和汉族宗族建筑（祠堂、讲学堂）；文化上融合了理学思想、瑶族传统文化和宗族文化；语言上瑶语方言与汉语方言多语言并存。福溪村是中华民族多元一体文化格局的生动体现。</p>', '正月初十到十五的炸龙狂欢已传承千年，据传沿秦潇贺古道传入富川。叠加盘王节、芦笙长鼓舞、二声部民歌。', '/images/ethnic/dance.svg', 4, 1, 'published', datetime('now', '-3 days')),
    ('福溪村旅游攻略：2 天 1 晚串联潇贺古道三村', 'fuxicun-lvyou-gonglue-2tian1wan', '<h2>到达福溪</h2><p><strong>自驾</strong>：永贺高速、国道207、国道538、省道203均经过富川，距贺州市约1小时车程，距桂林192.5公里，距广州364.5公里。<strong>铁路</strong>：洛湛铁路富川站直达。富川为"四好农村路"全国示范县，路况良好。<strong>飞机</strong>：桂林两江国际机场后转高铁。</p><h2>第一天：福溪深度游</h2><p><strong>上午</strong>抵达福溪，从风雨桥进村，依次参观<strong>周敦颐讲学堂</strong>遗址、<strong>爱莲堂</strong>（堂前莲池、堂内雕饰）、<strong>周氏宗祠</strong>（家训碑刻、族谱文献）。<strong>下午</strong>漫步青石板古街，欣赏<strong>门楣石雕</strong>（融合理学家训与瑶族图腾），参观<strong>120根木柱古建筑群</strong>和<strong>古戏台遗存</strong>。傍晚在风雨桥上看夕阳，感受千年古村的静谧。</p><h2>第二天：潇贺古道串联</h2><p>顺潇贺古道串联<strong>岔山村</strong>（"潇贺古道入桂第一村"，可体验瑶族服饰租赁、品尝梭子粑粑和油茶）和<strong>秀水状元村</strong>（1300多年历史，出过27名进士、1名南宋状元）。下午可前往<strong>富川古明城</strong>（建于明洪武二十九年1396年，鹅卵石老街）和<strong>慈云寺与瑞光塔</strong>（高28米、分7层的明代宝塔）。</p><h2>美食与特产</h2><p>必尝<strong>瑶族油茶</strong>（茶叶与姜为主料）、<strong>富川三角饺</strong>（粉皮裹炒豆角猪肉豆腐干）、<strong>果条</strong>（金黄螺旋状油炸面食）。秋季可品尝<strong>富川脐橙</strong>（获2006年"中国名牌农产品"称号）和<strong>油桃</strong>（种植面积6000多亩）。</p><h2>最佳时节</h2><p>春秋（3-5月、9-11月）气候最舒适。<strong>正月初十至十五</strong>可看千年传承的炸龙元宵庆典。秋季是富川脐橙、油桃成熟季。村内有特色民宿可体验古村生活，也可选择富川县城酒店（车程约40分钟）。</p>', '福溪2天1晚行程：第一天深度游讲学堂、爱莲堂、门楣石雕；第二天串联岔山村、秀水状元村。', '/images/scenery/ancient-architecture.svg', 5, 1, 'published', datetime('now', '-2 days')),
    ('老人讲古：风雨桥头听来的福溪百年', 'laoren-jianggu-fuxi-bainian', '<h2>"我们这一支，是从道州来的"</h2><p>傍晚的风雨桥头，几位老人围坐石凳上摇着蒲扇。村里上了年纪的周姓老人，几乎都能从族谱上数出自己是周敦颐的第几代孙。"我们这一支，是从道州来的"，老人说的道州，就是湖南道县——周敦颐的出生地，也是潇贺古道的北端起点。理学思想沿着这条千年古道南传，周氏后裔在福溪扎根繁衍，至今已传数十代。</p><h2>"从前村里有 24 座戏台"</h2><p>"现在的年轻人不知道，<strong>从前我们村里有 24 座戏台</strong>"，老人眯着眼回忆。那时候桂剧从桂林传入，彩调从本地兴起，祁剧从湖南传来，三种腔调在同一个戏台上轮番上演。逢年过节，戏台前挤满了人，热闹非凡。如今虽然大部分戏台已经消失，但那些青石板上磨出的凹痕，还记录着当年的繁华。</p><h2>"五代时候来了 124 个兵"</h2><p><strong>"五代时候，楚王马殷打仗经过这里，留下 124 个兵驻守"</strong>，这是福溪村最古老的记忆之一。这124名汉族士兵与原本的瑶族居民共同生活，从此瑶汉两族在这片土地上融合共居，至今已逾千年。村里的建筑风格——岭南的马头墙配上瑶族的风雨桥，汉族的祠堂配上瑶族的木柱结构——就是这段融合历史的最好见证。</p><h2>"门楣上的字，是老祖宗教的做人道理"</h2><p>指着一户古民居门楣上的石雕，老人说："这些字和图案，是老祖宗教的做人道理。"门楣上刻着莲花和"诚"字，融合了周敦颐理学家训与瑶族图腾。每一块门楣都是一个家族的家训，历经风雨，代代相传。2025年央视和共产党员网都来拍过这些门楣，说它们是"石头里的家训"。</p>', '风雨桥头听老人讲古：周姓族人从湖南道州迁来、村里曾有24座戏台、五代时期124名汉族士兵驻守。', '/images/ethnic/yao-people.svg', 6, 1, 'published', datetime('now', '-1 days')),
    ('关于福溪村官方网站正式上线的公告', 'fuxicun-guanwang-shangxian', '<h2>网站正式上线</h2><p>经村委会研究决定，<strong>福溪村官方网站</strong>（www.fuxicun.top）即日起正式上线运行。本站系统展示福溪村千年历史文化、古建筑风貌、瑶族民俗风情与旅游服务信息，支持游客与注册用户两种互动方式。</p><h2>关于福溪村</h2><p>福溪村位于广西贺州市富川瑶族自治县朝东镇，地处湘、桂、粤三省交界，自古有"三省通衢"之称。村落始建于宋代，距今已有千年历史，2012年列入首批中国传统村落名录。这里是宋代理学鼻祖周敦颐讲学堂所在地，保存着120根木柱撑起的明清古建筑群、24座古戏台遗存、千年风雨桥和潇贺古道遗迹，是瑶汉文化融合的活态博物馆。</p><h2>网站主要栏目</h2><ul><li><strong>走进福溪</strong>：村庄概况、历史沿革、地理区位</li><li><strong>理学文化</strong>：周敦颐讲学堂、爱莲堂、周氏宗祠、理学思想传承</li><li><strong>古村风貌</strong>：120根木柱建筑、门楣石雕、风雨桥、古戏台、青石板古街</li><li><strong>民族文化</strong>：瑶族传统、盘王节、炸龙习俗、芦笙长鼓舞、二声部民歌</li><li><strong>旅游指南</strong>：交通、住宿、美食、行程推荐、最佳时节</li><li><strong>新闻动态</strong>：村内新闻、活动资讯、媒体报道</li></ul><h2>联系我们</h2><p>如有任何问题或建议，欢迎通过网站联系我们。福溪村期待您的到来！</p>', '福溪村官方网站正式上线。本站系统展示福溪历史文化、古建筑、民族风情与旅游信息，支持游客与注册用户两种互动方式。', '/images/about/village-overview.svg', 7, 1, 'published', datetime('now'))`
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
