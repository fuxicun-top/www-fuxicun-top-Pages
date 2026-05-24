// ========================================
// 文件说明：文章详情页脚本（含 SEO 优化）
// 文件路径：js/pages/article-detail.js
// 功能：加载文章详情、点赞、评论
//       支持三种访问方式：
//       1. /articles/slug - 友好 URL（服务端已渲染内容和 meta 标签）
//       2. /article-detail.html?id=123 - 传统 URL（客户端渲染）
//       3. 服务端渲染页面通过 window.__ARTICLE_ID__ 传递文章 ID
// ========================================

(function() {
  'use strict';

  /** @type {number|null} 文章 ID */
  var articleId = null;

  /** @type {Object|null} 文章数据缓存 */
  var articleData = null;

  /** 默认文章内容（API 不可用时按 ID 显示对应文章） */
  var defaultArticles = {
    1: {
      id: 1, title: '千年古村 山水人和：央视镜头下的福溪',
      category_name: '村内新闻', author_name: '福溪村',
      cover_image: '/images/banners/banner1.svg',
      published_at: '2026-05-17', created_at: '2026-05-17',
      content: '<h2>央视"文化中国行"专题报道</h2><p>2025 年 2 月 17 日，<strong>央视新闻</strong>"文化中国行"以《<strong>千年古村 山水人和</strong>》为题对福溪村进行专题报道，将这座沉睡千年的古村落带到全国观众眼前。同日，共产党员网以《门楣之上》为专题聚焦福溪门楣石雕，展现石头里的家训与智慧。</p><h2>千年福溪 三朝积淀</h2><p>福溪村位于广西贺州市富川瑶族自治县朝东镇，地理坐标东经111°16′27″、北纬24°49′13″，地处湘、桂、粤三省交界，自古即有"三省通衢"之称。村落始建于宋代，距今已有千余年历史。五代时期，楚王马殷率部至此，留下124名汉族士兵驻守，与原本的瑶族居民共同奠定了瑶汉融合的村落基础。</p><h2>2012 年首批中国传统村落</h2><p>2012 年 12 月 17 日，福溪村被住建部、文化部、财政部等部委联合列入<strong>第一批中国传统村落名录</strong>。2022年，富川县入选"传统村落集中连片保护利用示范县"，福溪古建筑群获得"修旧如旧"的系统性修缮，周敦颐讲学堂、爱莲堂、周氏宗祠、风雨桥重新焕发活力。</p><h2>核心文化 IP</h2><p>福溪村以"千年古村·理学圣地"为主IP，"瑶乡古韵·潇贺明珠"为副IP，是宋代理学鼻祖周敦颐讲学堂所在地，也是周氏后裔聚居地。村中保存着120根木柱撑起的明清古建筑群、24座古戏台遗存、千年风雨桥和潇贺古道遗迹，是瑶汉文化融合的活态博物馆。</p>'
    },
    2: {
      id: 2, title: '周敦颐与福溪：理学沿潇贺古道南传的活证',
      category_name: '理学文化', author_name: '福溪村',
      cover_image: '/images/culture/zhou-dunyi.svg',
      published_at: '2026-05-19', created_at: '2026-05-19',
      content: '<h2>北宋五子 · 理学开山</h2><p><strong>周敦颐</strong>（1017–1073），字茂叔，号濂溪，世称濂溪先生，<strong>北宋"五子"之一</strong>，宋代理学开山祖师。著有《太极图说》（全文249字，提出"无极而太极"宇宙生成论）、《通书》（不足3000字，"诚"字出现20次）、《爱莲说》（119字，"出淤泥而不染，濯清涟而不妖"）。南宋理宗时诏从祀孔子庙堂，理学奠基者地位获官方承认。黄庭坚评价其"人品甚高，胸怀洒落，如光风霁月"。</p><h2>父亲周辅成与贺州桂岭</h2><p>周敦颐的父亲<strong>周辅成</strong>，大中祥符八年（1015 年）进士，官至<strong>桂岭县令</strong> —— 桂岭即今贺州市八步区桂岭镇，与富川同属贺州地区。周敦颐出生于湖南道县，即<strong>潇贺古道的北端起点</strong>。理学思想沿潇贺古道向南传播至福溪村，周敦颐后裔迁徙至福溪村定居繁衍至今。值得一提的是，<strong>周恩来</strong>为周敦颐第33代孙，<strong>鲁迅</strong>（周树人）亦为其后裔，后裔广泛分布于江、浙、湘、赣、粤、闽等省及港澳新马泰地区，超过三十万人。</p><h2>福溪：理学传承的岭南据点</h2><p>福溪村保存有<strong>宋代理学鼻祖周敦颐的讲学堂</strong>遗址，讲学堂之畔便是<strong>爱莲堂</strong>——"出淤泥而不染"的莲花意象在此具象为堂前莲池、堂内雕饰。<strong>周氏宗祠</strong>保存有完整族谱与家训碑刻，记录周氏家族千年传承。村中古民居门楣石雕融合理学家训（"诚""爱莲"主题）、瑶族图腾（盘瓠神话、自然崇拜符号）和岭南民俗（蝙蝠寓福、莲鱼寓有余），既是装饰艺术，也是家族身份与价值观的凝固。</p><h2>理学核心思想</h2><p>周敦颐哲学以"诚"为核心——宇宙存在的根据和本体，五常之本、百行之源。"无极而太极"的宇宙生成论，"主静立人极"的修身模式，"教人向善，进德修业"的教育思想，深刻影响了福溪村的家风、族规和教育传统。福溪村是研究周敦颐理学思想在岭南传播的重要实物载体，也是展示儒家文化与瑶族文化融合的生动范例。</p>'
    },
    3: {
      id: 3, title: '120 根木柱与门楣之上：福溪古建筑群解码',
      category_name: '古建筑', author_name: '福溪村',
      cover_image: '/images/scenery/ancient-architecture.svg',
      published_at: '2026-05-20', created_at: '2026-05-20',
      content: '<h2>120 根木柱撑起的木构智慧</h2><p>福溪古建筑群最具辨识度的特征，是<strong>"120 根木柱撑起"</strong>的木构体系。以多根立柱共同承重、灵活应对岭南山地气候的结构，既继承瑶族传统建筑就地取材、巧用木竹的智慧，又融入岭南建筑飞檐翘角、马头墙（封火墙）造型的审美。马头墙具备防火、装饰、文化、实用四大功能，是典型的岭南建筑风格与瑶族建筑元素的完美融合。</p><h2>《门楣之上》：石头里的家训</h2><p>2025 年 2 月 17 日，共产党员网以《门楣之上》为专题报道福溪门楣石雕。每一户古民居的门楣都有精美雕刻，图案融合理学家训（"诚""爱莲"主题）、瑶族图腾（盘瓠神话、自然崇拜符号）和岭南民俗（蝙蝠寓福、莲鱼寓有余）。这些石雕既是装饰艺术，也是家族身份与价值观的凝固，承载着千年文化传承的密码。</p><h2>风雨桥：瑶族建筑的代表作</h2><p>福溪村的<strong>风雨桥</strong>横跨福溪河，是瑶族地区极具代表性的传统建筑。桥上设长凳与遮雨廊，为村民议事、纳凉、对歌的公共空间。它不只是一座桥，更是村落公共生活的物理中心，见证着瑶汉两族千年共居的和谐画面。</p><h2>古戏台 24 座：戏曲文化的鼎盛印记</h2><p>福溪村鼎盛时期曾有<strong>古戏台 24 座</strong>，是潇贺古道沿线戏剧文化最繁盛的节点之一。桂剧（从桂林传入）、彩调（俗称调子）、祁剧（由湖南传入）三大剧种在戏台上交汇，形成"一村多腔"的独特景观。青石板古街与鹅卵石巷道是潇贺古道在村内的延伸，古道始建于公元前219年，青石板已被脚步打磨得温润光亮。</p>'
    },
    4: {
      id: 4, title: '炸龙闹元宵：千年瑶俗与潇贺古道的回响',
      category_name: '民俗风情', author_name: '福溪村',
      cover_image: '/images/ethnic/dance.svg',
      published_at: '2026-05-20', created_at: '2026-05-20',
      content: '<h2>正月初十至十五的"炸龙"狂欢</h2><p>富川的"<strong>炸龙</strong>"是当地最具代表性的元宵庆典，<strong>从正月初十闹到十五元宵</strong>，连续六天。"舞龙 + 炸龙"相结合，龙身游街起舞，沿途观众燃放鞭炮"炸"向龙身，鞭炮声越响、火光越烈意味着福气越旺。大型龙狮队40余人，小型20多人，场面壮观热烈。</p><h2>千年传承：沿潇贺古道传入富川</h2><p>据瑶族先人口口相传，<strong>舞龙、炸龙的习俗是沿着秦潇贺古道传入富川的</strong>，距今已有千年历史。潇贺古道始建于公元前219年，北起湖南道县，南至广西贺州八步区，是秦汉时期沟通长江水系与珠江水系的重要通道。2013年，潇贺古道永州段被列入全国重点文物保护单位。</p><h2>盘王节：瑶族最盛大的祭祖庆典</h2><p>瑶族最重要的传统节日是<strong>盘王节</strong>，源自盘瓠神话，举行祭祀、歌舞、宴饮活动。此外还有鸟崽节、社节、牛王节等传统节日。瑶族歌舞丰富多彩：民歌按声部分单声部和二声部，包括叙事歌、故事歌、盘王歌、迁徙歌等；舞蹈有芦笙长鼓舞、长鼓舞、踏歌堂、抛绣球等。传统戏剧方面，桂剧、彩调、祁剧三大剧种在福溪交汇，形成"一村多腔"的独特景观。</p><h2>瑶汉融合：千年共居的文化奇观</h2><p>五代时期楚王马殷部下124名汉族士兵驻守福溪，与瑶族居民共同生活千年。建筑上融合了岭南风格（马头墙、青砖黛瓦）、瑶族元素（风雨桥、木柱结构）和汉族宗族建筑（祠堂、讲学堂）；文化上融合了理学思想、瑶族传统文化和宗族文化；语言上瑶语方言与汉语方言多语言并存。福溪村是中华民族多元一体文化格局的生动体现。</p>'
    },
    5: {
      id: 5, title: '福溪村旅游攻略：2 天 1 晚串联潇贺古道三村',
      category_name: '旅游攻略', author_name: '福溪村',
      cover_image: '/images/scenery/ancient-architecture.svg',
      published_at: '2026-05-21', created_at: '2026-05-21',
      content: '<h2>到达福溪</h2><p><strong>自驾</strong>：永贺高速、国道207、国道538、省道203均经过富川，距贺州市约1小时车程，距桂林192.5公里，距广州364.5公里。<strong>铁路</strong>：洛湛铁路富川站直达。富川为"四好农村路"全国示范县，路况良好。<strong>飞机</strong>：桂林两江国际机场后转高铁。</p><h2>第一天：福溪深度游</h2><p><strong>上午</strong>抵达福溪，从风雨桥进村，依次参观<strong>周敦颐讲学堂</strong>遗址、<strong>爱莲堂</strong>（堂前莲池、堂内雕饰）、<strong>周氏宗祠</strong>（家训碑刻、族谱文献）。<strong>下午</strong>漫步青石板古街，欣赏<strong>门楣石雕</strong>（融合理学家训与瑶族图腾），参观<strong>120根木柱古建筑群</strong>和<strong>古戏台遗存</strong>。傍晚在风雨桥上看夕阳，感受千年古村的静谧。</p><h2>第二天：潇贺古道串联</h2><p>顺潇贺古道串联<strong>岔山村</strong>（"潇贺古道入桂第一村"，可体验瑶族服饰租赁、品尝梭子粑粑和油茶）和<strong>秀水状元村</strong>（1300多年历史，出过27名进士、1名南宋状元）。下午可前往<strong>富川古明城</strong>（建于明洪武二十九年1396年，鹅卵石老街）和<strong>慈云寺与瑞光塔</strong>（高28米、分7层的明代宝塔）。</p><h2>美食与特产</h2><p>必尝<strong>瑶族油茶</strong>（茶叶与姜为主料）、<strong>富川三角饺</strong>（粉皮裹炒豆角猪肉豆腐干）、<strong>果条</strong>（金黄螺旋状油炸面食）。秋季可品尝<strong>富川脐橙</strong>（获2006年"中国名牌农产品"称号）和<strong>油桃</strong>（种植面积6000多亩）。</p><h2>最佳时节</h2><p>春秋（3-5月、9-11月）气候最舒适。<strong>正月初十至十五</strong>可看千年传承的炸龙元宵庆典。秋季是富川脐橙、油桃成熟季。村内有特色民宿可体验古村生活，也可选择富川县城酒店（车程约40分钟）。</p>'
    },
    6: {
      id: 6, title: '老人讲古：风雨桥头听来的福溪百年',
      category_name: '村民故事', author_name: '福溪村',
      cover_image: '/images/ethnic/yao-people.svg',
      published_at: '2026-05-22', created_at: '2026-05-22',
      content: '<h2>"我们这一支，是从道州来的"</h2><p>傍晚的风雨桥头，几位老人围坐石凳上摇着蒲扇。村里上了年纪的周姓老人，几乎都能从族谱上数出自己是周敦颐的第几代孙。"我们这一支，是从道州来的"，老人说的道州，就是湖南道县——周敦颐的出生地，也是潇贺古道的北端起点。理学思想沿着这条千年古道南传，周氏后裔在福溪扎根繁衍，至今已传数十代。</p><h2>"从前村里有 24 座戏台"</h2><p>"现在的年轻人不知道，<strong>从前我们村里有 24 座戏台</strong>"，老人眯着眼回忆。那时候桂剧从桂林传入，彩调从本地兴起，祁剧从湖南传来，三种腔调在同一个戏台上轮番上演。逢年过节，戏台前挤满了人，热闹非凡。如今虽然大部分戏台已经消失，但那些青石板上磨出的凹痕，还记录着当年的繁华。</p><h2>"五代时候来了 124 个兵"</h2><p><strong>"五代时候，楚王马殷打仗经过这里，留下 124 个兵驻守"</strong>，这是福溪村最古老的记忆之一。这124名汉族士兵与原本的瑶族居民共同生活，从此瑶汉两族在这片土地上融合共居，至今已逾千年。村里的建筑风格——岭南的马头墙配上瑶族的风雨桥，汉族的祠堂配上瑶族的木柱结构——就是这段融合历史的最好见证。</p><h2>"门楣上的字，是老祖宗教的做人道理"</h2><p>指着一户古民居门楣上的石雕，老人说："这些字和图案，是老祖宗教的做人道理。"门楣上刻着莲花和"诚"字，融合了周敦颐理学家训与瑶族图腾。每一块门楣都是一个家族的家训，历经风雨，代代相传。2025年央视和共产党员网都来拍过这些门楣，说它们是"石头里的家训"。</p>'
    },
    7: {
      id: 7, title: '关于福溪村官方网站正式上线的公告',
      category_name: '通知公告', author_name: '福溪村',
      cover_image: '/images/about/village-overview.svg',
      published_at: '2026-05-23', created_at: '2026-05-23',
      content: '<h2>网站正式上线</h2><p>经村委会研究决定，<strong>福溪村官方网站</strong>（www.fuxicun.top）即日起正式上线运行。本站系统展示福溪村千年历史文化、古建筑风貌、瑶族民俗风情与旅游服务信息，支持游客与注册用户两种互动方式。</p><h2>关于福溪村</h2><p>福溪村位于广西贺州市富川瑶族自治县朝东镇，地处湘、桂、粤三省交界，自古有"三省通衢"之称。村落始建于宋代，距今已有千年历史，2012年列入首批中国传统村落名录。这里是宋代理学鼻祖周敦颐讲学堂所在地，保存着120根木柱撑起的明清古建筑群、24座古戏台遗存、千年风雨桥和潇贺古道遗迹，是瑶汉文化融合的活态博物馆。</p><h2>网站主要栏目</h2><ul><li><strong>走进福溪</strong>：村庄概况、历史沿革、地理区位</li><li><strong>理学文化</strong>：周敦颐讲学堂、爱莲堂、周氏宗祠、理学思想传承</li><li><strong>古村风貌</strong>：120根木柱建筑、门楣石雕、风雨桥、古戏台、青石板古街</li><li><strong>民族文化</strong>：瑶族传统、盘王节、炸龙习俗、芦笙长鼓舞、二声部民歌</li><li><strong>旅游指南</strong>：交通、住宿、美食、行程推荐、最佳时节</li><li><strong>新闻动态</strong>：村内新闻、活动资讯、媒体报道</li></ul><h2>联系我们</h2><p>如有任何问题或建议，欢迎通过网站联系我们。福溪村期待您的到来！</p>'
    }
  };

  /**
   * 页面初始化入口
   * 判断文章加载方式并初始化各模块
   */
  function init() {
    // 优先使用服务端注入的文章 ID（友好 URL 服务端渲染模式）
    if (window.__ARTICLE_ID__) {
      articleId = window.__ARTICLE_ID__;
      // 服务端已渲染内容，只需加载评论和绑定事件
      loadComments();
      setupCommentForm();
      bindLikeButton();
      return;
    }

    // 检查 URL 路径是否为 /articles/slug 格式
    var pathMatch = window.location.pathname.match(/^\/articles\/(.+)$/);
    if (pathMatch) {
      var slug = pathMatch[1];
      // 如果是纯数字，视为 ID
      if (/^\d+$/.test(slug)) {
        articleId = parseInt(slug);
      } else {
        // 通过 slug 加载文章（客户端渲染模式）
        loadArticleBySlug(slug);
        return;
      }
    }

    // 传统 URL 模式：从查询参数获取文章 ID
    var params = new URLSearchParams(window.location.search);
    articleId = params.get('id');

    if (!articleId) {
      // 无文章 ID，保留页面默认静态内容
      setupCommentForm();
      bindLikeButton();
      return;
    }

    articleId = parseInt(articleId);

    loadArticle();
    loadComments();
    setupCommentForm();
  }

  /**
   * 通过 slug 加载文章（客户端渲染模式）
   * 当用户直接访问 /articles/slug 但页面非服务端渲染时调用
   * @param {string} slug - 文章的 URL 友好标识
   */
  async function loadArticleBySlug(slug) {
    try {
      var result = await API.get('/articles?keyword=' + encodeURIComponent(slug));
      if (result.success && result.data.list && result.data.list.length > 0) {
        var matched = result.data.list.find(function(a) { return a.slug === slug; });
        if (matched) {
          articleId = matched.id;
          loadArticle();
          loadComments();
          setupCommentForm();
          return;
        }
      }
    } catch (e) {
      // API 失败
    }
    // 未找到匹配文章，尝试用 slug 中的数字 ID 匹配默认文章
    var idMatch = slug.match(/\d+/);
    if (idMatch) {
      var fallbackId = parseInt(idMatch[0]);
      var fallback = defaultArticles[fallbackId];
      if (fallback) {
        articleId = fallbackId;
        articleData = fallback;
        renderArticle(fallback);
        setupCommentForm();
        return;
      }
    }
    // 完全无匹配，保留页面默认静态内容
    setupCommentForm();
    bindLikeButton();
  }

  /**
   * 通过 ID 加载文章详情（传统 URL 模式）
   * 同时设置 SEO meta 标签和 JSON-LD 结构化数据
   */
  async function loadArticle() {
    try {
      var result = await API.get('/articles/' + articleId);
      if (result.success) {
        articleData = result.data;
        renderArticle(result.data);
        setSEOTags(result.data);
        return;
      }
    } catch (e) {
      // API 失败，使用静态默认内容
    }
    // API 不可用或文章不存在，显示对应 ID 的静态内容
    var fallback = defaultArticles[articleId];
    if (fallback) {
      articleData = fallback;
      renderArticle(fallback);
    }
  }

  /**
   * 动态设置 SEO meta 标签（客户端渲染模式）
   * 包含 Open Graph、Twitter Card、JSON-LD 结构化数据
   * @param {Object} article - 文章数据对象
   */
  function setSEOTags(article) {
    var baseUrl = window.location.origin;
    var articleUrl = article.slug
      ? baseUrl + '/articles/' + article.slug
      : baseUrl + '/article-detail.html?id=' + article.id;
    var coverImage = article.cover_image
      ? (article.cover_image.startsWith('http') ? article.cover_image : baseUrl + article.cover_image)
      : baseUrl + '/images/logo/logo.svg';
    var description = article.excerpt || article.title;
    var plainContent = article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 200) : '';
    var desc = description || plainContent;

    // 设置页面标题
    document.title = article.title + ' - 福溪村';

    // 设置 Open Graph 标签
    setMetaTag('og:type', 'article', true);
    setMetaTag('og:title', article.title, true);
    setMetaTag('og:description', desc, true);
    setMetaTag('og:image', coverImage, true);
    setMetaTag('og:url', articleUrl, true);
    setMetaTag('og:site_name', '福溪村', true);
    setMetaTag('og:locale', 'zh_CN', true);

    // 设置 Twitter Card 标签
    setMetaTag('twitter:card', 'summary_large_image', false);
    setMetaTag('twitter:title', article.title, false);
    setMetaTag('twitter:description', desc, false);
    setMetaTag('twitter:image', coverImage, false);

    // 设置 canonical 链接
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = articleUrl;

    // 设置 description meta
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = desc;
    }

    // 设置 JSON-LD 结构化数据
    var jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.title,
      'description': desc,
      'image': coverImage,
      'datePublished': article.published_at || '',
      'dateModified': article.updated_at || article.published_at || '',
      'author': {
        '@type': 'Person',
        'name': article.author_name || '福溪村'
      },
      'publisher': {
        '@type': 'Organization',
        'name': '福溪村',
        'logo': {
          '@type': 'ImageObject',
          'url': baseUrl + '/images/logo/logo.svg'
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': articleUrl
      },
      'articleSection': article.category_name || '新闻动态',
      'inLanguage': 'zh-CN'
    };

    var script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd, null, 2);
  }

  /**
   * 设置或更新 meta 标签
   * @param {string} property - 属性名（property 或 name）
   * @param {string} content - 属性值
   * @param {boolean} isProperty - 是否使用 property 属性（OG 标签用 property，Twitter 用 name）
   */
  function setMetaTag(property, content, isProperty) {
    var selector = isProperty
      ? 'meta[property="' + property + '"]'
      : 'meta[name="' + property + '"]';
    var meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      if (isProperty) {
        meta.setAttribute('property', property);
      } else {
        meta.setAttribute('name', property);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  /**
   * 渲染文章内容到页面
   * @param {Object} article - 文章数据对象
   */
  function renderArticle(article) {
    document.title = article.title + ' - 福溪村';
    document.getElementById('breadcrumb-title').textContent = article.title;

    // 动态更新面包屑分类
    var breadcrumbCategory = document.querySelector('.breadcrumb__category');
    if (breadcrumbCategory && article.category_name) {
      breadcrumbCategory.textContent = article.category_name;
    }

    var date = Utils.formatDate(article.published_at || article.created_at);
    var cover = article.cover_image
      ? '<img src="' + article.cover_image + '" alt="' + Utils.escapeHtml(article.title) + '" class="article-detail__cover" loading="lazy">'
      : '';

    var html = '<div class="article-detail__header">' +
      '<h1 class="article-detail__title">' + Utils.escapeHtml(article.title) + '</h1>' +
      '<div class="article-detail__meta">' +
        '<span>作者：' + Utils.escapeHtml(article.author_name || '匿名') + '</span>' +
        (article.category_name ? '<span>分类：' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
        '<span>发布时间：' + date + '</span>' +
        '<span>' + (article.views || 0) + ' 浏览</span>' +
      '</div>' +
    '</div>' +
    cover +
    '<div class="article-detail__content">' + article.content + '</div>' +
    '<div class="article-detail__actions">' +
      '<button class="btn-like" id="btn-like">' +
        '<span>&#9829;</span> <span id="like-count">' + (article.likes || 0) + '</span>' +
      '</button>' +
    '</div>';

    document.getElementById('article-detail').innerHTML = html;

    // 绑定点赞按钮事件
    document.getElementById('btn-like').onclick = function() {
      likeArticle();
    };
  }

  /**
   * 绑定点赞按钮事件（服务端渲染模式使用）
   * 查找页面上已渲染的点赞按钮并绑定点击事件
   */
  function bindLikeButton() {
    var btn = document.getElementById('btn-like');
    if (btn) {
      btn.onclick = function() {
        likeArticle();
      };
    }
  }

  /**
   * 点赞/取消点赞文章
   * 需要用户登录，未登录则跳转到登录页
   */
  async function likeArticle() {
    if (!Auth.isLoggedIn()) {
      Toast.warning('请先登录');
      window.location.href = '/login.html';
      return;
    }

    try {
      var result = await API.post('/articles/' + articleId + '/like');
      if (result.success) {
        var btn = document.getElementById('btn-like');
        var count = document.getElementById('like-count');
        var currentCount = parseInt(count.textContent) || 0;

        if (result.data.liked) {
          btn.classList.add('liked');
          count.textContent = currentCount + 1;
        } else {
          btn.classList.remove('liked');
          count.textContent = Math.max(0, currentCount - 1);
        }
      }
    } catch (e) {
      Toast.error('操作失败');
    }
  }

  /**
   * 初始化评论表单显示状态
   * 已登录用户显示评论输入框，未登录显示登录提示
   */
  function setupCommentForm() {
    if (Auth.isLoggedIn()) {
      document.getElementById('comment-form').style.display = 'block';
      document.getElementById('comment-login-tip').style.display = 'none';
    } else {
      document.getElementById('comment-form').style.display = 'none';
      document.getElementById('comment-login-tip').style.display = 'block';
    }

    document.getElementById('btn-submit-comment').onclick = function() {
      submitComment();
    };
  }

  /**
   * 加载文章评论列表
   */
  async function loadComments() {
    if (!articleId) {
      renderComments([]);
      return;
    }
    try {
      var result = await API.get('/articles/' + articleId + '/comments');
      if (result.success) {
        renderComments(result.data);
      } else {
        renderComments([]);
      }
    } catch (e) {
      renderComments([]);
    }
  }

  /**
   * 渲染评论列表
   * @param {Array} comments - 评论数据数组
   */
  function renderComments(comments) {
    var container = document.getElementById('comments-list');

    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无评论，快来发表第一条评论吧</div>';
      return;
    }

    container.innerHTML = comments.map(function(comment) {
      return renderCommentItem(comment);
    }).join('');
  }

  /**
   * 渲染单条评论（支持嵌套回复）
   * @param {Object} comment - 评论对象
   * @returns {string} 评论 HTML 字符串
   */
  function renderCommentItem(comment) {
    var initial = (comment.username || '匿')[0].toUpperCase();
    var time = Utils.formatDate(comment.created_at);

    var repliesHtml = '';
    if (comment.replies && comment.replies.length > 0) {
      repliesHtml = '<div class="comment-replies">' +
        comment.replies.map(function(reply) {
          return renderCommentItem(reply);
        }).join('') +
      '</div>';
    }

    return '<div class="comment-item">' +
      '<div class="comment-avatar">' + initial + '</div>' +
      '<div class="comment-body">' +
        '<div class="comment-header">' +
          '<span class="comment-username">' + Utils.escapeHtml(comment.username || '匿名') + '</span>' +
          '<span class="comment-time">' + time + '</span>' +
        '</div>' +
        '<div class="comment-content">' + Utils.escapeHtml(comment.content) + '</div>' +
        '<div class="comment-actions">' +
          '<button class="comment-reply-btn" onclick="showReplyForm(' + comment.id + ')">回复</button>' +
        '</div>' +
      '</div>' +
    '</div>' + repliesHtml;
  }

  /**
   * 提交评论
   * @param {number} [parentId] - 父评论 ID（回复时使用）
   */
  async function submitComment(parentId) {
    var contentEl = document.getElementById('comment-content');
    var content = contentEl.value.trim();

    if (!content) {
      Toast.warning('请输入评论内容');
      return;
    }

    try {
      var data = { content: content };
      if (parentId) data.parent_id = parentId;

      var result = await API.post('/articles/' + articleId + '/comments', data);
      if (result.success) {
        Toast.success('评论成功');
        contentEl.value = '';
        loadComments();
      } else {
        Toast.error(result.error?.message || '评论失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  /**
   * 全局回复表单显示函数
   * 通过 prompt 获取回复内容并提交
   * @param {number} parentId - 父评论 ID
   */
  window.showReplyForm = function(parentId) {
    if (!Auth.isLoggedIn()) {
      Toast.warning('请先登录');
      return;
    }
    var content = prompt('请输入回复内容：');
    if (content) {
      submitCommentWithContent(parentId, content);
    }
  };

  /**
   * 带内容提交回复
   * @param {number} parentId - 父评论 ID
   * @param {string} content - 回复内容
   */
  async function submitCommentWithContent(parentId, content) {
    try {
      var result = await API.post('/articles/' + articleId + '/comments', {
        content: content,
        parent_id: parentId
      });
      if (result.success) {
        Toast.success('回复成功');
        loadComments();
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  // DOM 加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);
})();
