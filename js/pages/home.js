// ========================================
// 文件说明：首页脚本（模块化动态渲染）
// 文件路径：js/pages/home.js
// 功能：从 API 加载首页模块配置，按顺序动态渲染各模块
// ========================================

(function() {
  'use strict';

  var siteConfig = null;

  function init() {
    loadSiteConfig();
    loadHomeModules();
  }

  // ==============================
  // 加载网站配置
  // ==============================
  async function loadSiteConfig() {
    try {
      var result = await API.get('/config');
      if (result.success && result.data) {
        siteConfig = result.data;
        if (siteConfig.site_name) {
          document.title = siteConfig.site_name + ' - 千年古村 · 理学圣地';
        }
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  }

  // ==============================
  // 加载首页模块并渲染
  // ==============================
  async function loadHomeModules() {
    var result;
    try {
      result = await API.get('/home-modules');
    } catch (e) {
      // API 请求失败（未安装/无数据库/网络异常），使用静态 fallback
      console.error('加载首页模块失败，使用静态 fallback:', e);
      Banner.init('banner-container');
      return;
    }

    // API 请求成功（即使返回空数组），以数据库配置为准渲染
    if (!result.success || !result.data) {
      Banner.init('banner-container');
      return;
    }

    var modules = result.data;

    // 检查 banner 模块状态
    var bannerModule = modules.find(function(m) { return m.type === 'banner'; });
    var bannerEl = document.getElementById('banner-container');

    if (bannerModule) {
      // banner 模块 active，渲染轮播图
      Banner.init('banner-container');
    } else {
      // banner 模块被隐藏
      if (bannerEl) bannerEl.style.display = 'none';
    }

    // 移除 banner 之后、footer 之间的所有静态 section
    var footer = document.getElementById('site-footer');
    var toRemove = [];
    var el = bannerEl ? bannerEl.nextElementSibling : null;
    while (el && el !== footer) {
      var next = el.nextElementSibling;
      if (el.tagName === 'SECTION' || el.classList.contains('home-section')) {
        toRemove.push(el);
      }
      el = next;
    }
    toRemove.forEach(function(el) { el.remove(); });

    // 渲染内容模块（排除 banner，banner 由固定 HTML 承载）
    var contentModules = modules.filter(function(m) { return m.type !== 'banner'; });

    if (contentModules.length === 0) return;

    // 在 footer 之前插入动态模块
    var dynamicContainer = document.getElementById('home-dynamic-modules');
    if (!dynamicContainer) {
      dynamicContainer = document.createElement('div');
      dynamicContainer.id = 'home-dynamic-modules';
      if (footer) {
        footer.parentNode.insertBefore(dynamicContainer, footer);
      }
    }

    var html = '';
    for (var i = 0; i < contentModules.length; i++) {
      html += renderModule(contentModules[i]);
    }
    dynamicContainer.innerHTML = html;
  }

  // ==============================
  // 渲染单个模块
  // ==============================
  function renderModule(module) {
    switch (module.type) {
      case 'banner':   return renderBannerModule(module);
      case 'intro':    return renderIntroModule(module);
      case 'articles': return renderArticlesModule(module);
      case 'gallery':  return renderGalleryModule(module);
      case 'travel':   return renderTravelModule(module);
      case 'custom':   return renderCustomModule(module);
      default:         return '';
    }
  }

  // ==============================
  // 轮播图模块
  // ==============================
  function renderBannerModule(module) {
    // 轮播图由 Banner 组件渲染到 #banner-container
    // 这里返回空字符串，由 init 中的 Banner.init 处理
    return '<section class="banner" id="banner-container"></section>';
  }

  // ==============================
  // 走进福溪村模块
  // ==============================
  function renderIntroModule(module) {
    var config = module.config || {};
    var desc = config.description || siteConfig?.site_description || '';
    var cards = config.cards || [];

    var cardsHtml = cards.map(function(card) {
      return '<div class="intro-card">' +
        '<div class="intro-card__icon">' + Utils.escapeHtml(card.icon || '📖') + '</div>' +
        '<h3 class="intro-card__title">' + Utils.escapeHtml(card.title || '') + '</h3>' +
        '<p class="intro-card__desc">' + Utils.escapeHtml(card.desc || '') + '</p>' +
        (card.link ? '<a href="' + Utils.escapeHtml(card.link) + '" class="intro-card__link">了解更多 →</a>' : '') +
      '</div>';
    }).join('');

    return '<section class="home-section">' +
      '<div class="container">' +
        '<div class="section-header">' +
          '<h2 class="section-title">' + Utils.escapeHtml(module.title) + '</h2>' +
          (module.subtitle ? '<p class="section-subtitle">' + Utils.escapeHtml(module.subtitle) + '</p>' : '') +
        '</div>' +
        (desc ? '<p class="intro-description" style="text-align:center;max-width:720px;margin:0 auto 32px;color:var(--color-text-secondary);font-size:17px;line-height:1.8;">' + Utils.escapeHtml(desc) + '</p>' : '') +
        (cards.length > 0 ? '<div class="intro-grid">' + cardsHtml + '</div>' : '') +
      '</div>' +
    '</section>';
  }

  // ==============================
  // 文章列表模块（精选推荐 / 新闻动态 / 自定义）
  // ==============================
  function renderArticlesModule(module) {
    var config = module.config || {};
    var mode = config.mode || 'auto_likes';
    var count = config.count || 5;
    var slots = config.articles || [];

    var containerId = 'articles-module-' + module.id;
    var categories = config.categories || [];
    loadArticlesForModule(containerId, mode, count, slots, categories);

    // 精选模式用灰色背景 + featured-grid，其他用 card-grid
    var sectionClass = mode === 'auto_likes' ? 'home-section home-section--gray' : 'home-section';
    var gridClass = mode === 'auto_likes' ? 'featured-grid' : 'card-grid';

    return '<section class="' + sectionClass + '">' +
      '<div class="container">' +
        '<div class="section-header">' +
          '<h2 class="section-title">' + Utils.escapeHtml(module.title) + '</h2>' +
          '<a href="/articles.html" class="section-more">查看更多 →</a>' +
        '</div>' +
        '<div class="' + gridClass + '" id="' + containerId + '">' +
          '<div style="text-align:center;padding:20px;color:var(--color-text-placeholder);grid-column:1/-1;">加载中...</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  async function loadArticlesForModule(containerId, mode, count, slots, categories) {
    try {
      var articles = [];
      var usedIds = new Set();

      // 缓存已请求的文章，避免重复请求
      var articleCache = {};

      async function fetchArticle(id) {
        if (articleCache[id]) return articleCache[id];
        try {
          var res = await API.get('/articles/' + id);
          if (res.success && res.data) {
            articleCache[id] = res.data;
            return res.data;
          }
        } catch (e) { /* 不存在 */ }
        return null;
      }

      // 自动填充缓存
      var autoCacheLikes = null;
      var autoCacheLatest = null;

      async function fetchAutoList(sortType) {
        if (sortType === 'likes' && autoCacheLikes) return autoCacheLikes;
        if (sortType === 'latest' && autoCacheLatest) return autoCacheLatest;
        var sortParam = sortType === 'likes' ? 'likes' : sortType === 'views' ? 'views' : '';
        var list = [];
        if (categories.length > 0) {
          // 按分类过滤：分别获取各分类文章后合并去重
          for (var c = 0; c < categories.length; c++) {
            var res = await API.get('/articles', { page: 1, pageSize: count + 5, sort: sortParam, category: categories[c] });
            var catList = (res.success && res.data.list) ? res.data.list : [];
            for (var n = 0; n < catList.length; n++) {
              if (!list.some(function(a) { return a.id === catList[n].id; })) {
                list.push(catList[n]);
              }
            }
          }
          // 按排序字段重新排序
          if (sortType === 'likes') {
            list.sort(function(a, b) { return b.likes - a.likes; });
          } else if (sortType === 'views') {
            list.sort(function(a, b) { return b.views - a.views; });
          } else {
            list.sort(function(a, b) { return new Date(b.published_at) - new Date(a.published_at); });
          }
        } else {
          var res = await API.get('/articles', { page: 1, pageSize: count + 5, sort: sortParam });
          list = (res.success && res.data.list) ? res.data.list : [];
        }
        if (sortType === 'likes') autoCacheLikes = list;
        else if (sortType === 'latest') autoCacheLatest = list;
        return list;
      }

      async function getNextAutoArticle(sortType) {
        var list = await fetchAutoList(sortType);
        for (var k = 0; k < list.length; k++) {
          if (!usedIds.has(list[k].id)) {
            return list[k];
          }
        }
        return null;
      }

      // 按 slots 配置逐个填充
      for (var i = 0; i < slots.length && articles.length < count; i++) {
        var slot = slots[i];
        if (slot.article_id) {
          // 固定文章
          var article = await fetchArticle(slot.article_id);
          if (article && !usedIds.has(article.id)) {
            articles.push(article);
            usedIds.add(article.id);
          }
        } else {
          // 自动填充（按 slot 指定的 sort，或用模块默认 mode）
          var sortType = slot.sort || (mode === 'auto_likes' ? 'likes' : 'latest');
          var autoArticle = await getNextAutoArticle(sortType);
          if (autoArticle) {
            articles.push(autoArticle);
            usedIds.add(autoArticle.id);
          }
        }
      }
      // slots 为空时不自动填充，显示空列表

      var container = document.getElementById(containerId);
      if (!container) return;

      if (articles.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--color-text-placeholder);">暂无文章</p>';
        return;
      }

      // 精选模式用大图布局，新闻模式用卡片布局
      if (mode === 'auto_likes') {
        renderFeaturedArticles(container, articles);
      } else {
        renderArticleCards(container, articles);
      }
    } catch (e) {
      var c = document.getElementById(containerId);
      if (c) c.innerHTML = '<p style="text-align:center;color:var(--color-text-placeholder);">加载失败</p>';
    }
  }

  function renderFeaturedArticles(container, articles) {
    container.innerHTML = articles.map(function(article, index) {
      var articleUrl = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;
      var coverSrc = article.cover_image || '/images/default/article.png';

      if (index === 0) {
        return '<div class="featured-card featured-card--large">' +
          '<img class="featured-card__image" src="' + coverSrc + '" alt="' + Utils.escapeHtml(article.title) + '" loading="lazy">' +
          '<div class="featured-card__overlay">' +
            (article.category_name ? '<span class="featured-card__category">' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
            '<h3 class="featured-card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h3>' +
            '<p class="featured-card__excerpt">' + Utils.escapeHtml(Utils.truncate(article.excerpt || article.content, 120)) + '</p>' +
          '</div>' +
        '</div>';
      }

      return '<div class="featured-card">' +
        '<img class="featured-card__image" src="' + coverSrc + '" alt="' + Utils.escapeHtml(article.title) + '" loading="lazy">' +
        '<div class="featured-card__body">' +
          '<h4 class="featured-card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h4>' +
          '<p class="featured-card__meta">' + Utils.timeAgo(article.created_at) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderArticleCards(container, articles) {
    container.innerHTML = articles.map(function(article) {
      var articleUrl = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;
      return '<div class="article-card">' +
        '<img class="article-card__image" src="' + (article.cover_image || '/images/default/article.png') + '" alt="' + Utils.escapeHtml(article.title) + '" loading="lazy">' +
        '<div class="article-card__body">' +
          (article.category_name ? '<span class="article-card__category">' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
          '<h3 class="article-card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h3>' +
          '<p class="article-card__excerpt">' + Utils.escapeHtml(Utils.truncate(article.excerpt || article.content, 100)) + '</p>' +
          '<div class="article-card__meta">' +
            '<span class="article-card__author">' +
              '<img class="article-card__avatar" src="' + (article.author_avatar || '/images/default/avatar.svg') + '" alt="">' +
              '<span>' + Utils.escapeHtml(article.author_name || '佚名') + '</span>' +
            '</span>' +
            '<span>' + Utils.timeAgo(article.created_at) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ==============================
  // 图片画廊模块
  // ==============================
  function renderGalleryModule(module) {
    var config = module.config || {};
    var containerId = 'gallery-module-' + module.id;
    var images = config.images || [];

    // 生成图片 HTML
    var imagesHtml = '';
    if (images.length > 0) {
      imagesHtml = images.map(function(img) {
        return '<div class="gallery-item">' +
          '<img src="' + Utils.escapeHtml(img.url) + '" alt="' + Utils.escapeHtml(img.alt || '福溪村风光') + '" loading="lazy">' +
        '</div>';
      }).join('');
    }

    return '<section class="home-section home-section--gray">' +
      '<div class="container">' +
        '<div class="section-header">' +
          '<h2 class="section-title">' + Utils.escapeHtml(module.title) + '</h2>' +
          '<a href="/gallery.html" class="section-more">查看更多 →</a>' +
        '</div>' +
        '<div class="gallery-grid" id="' + containerId + '">' +
          (imagesHtml || '<div style="text-align:center;padding:20px;color:var(--color-text-placeholder);grid-column:1/-1;">暂无图片</div>') +
        '</div>' +
      '</div>' +
    '</section>';
  }


  // ==============================
  // 旅游指南模块
  // ==============================
  function renderTravelModule(module) {
    var config = module.config || {};
    var cards = config.cards || [];

    var cardsHtml = cards.map(function(card) {
      return '<div class="travel-card">' +
        '<div class="travel-card__icon">' + Utils.escapeHtml(card.icon || '📌') + '</div>' +
        '<h4 class="travel-card__title">' + Utils.escapeHtml(card.title || '') + '</h4>' +
        '<p class="travel-card__desc">' + Utils.escapeHtml(card.desc || '') + '</p>' +
      '</div>';
    }).join('');

    return '<section class="home-section">' +
      '<div class="container">' +
        '<div class="section-header">' +
          '<h2 class="section-title">' + Utils.escapeHtml(module.title) + '</h2>' +
          (module.subtitle ? '<p class="section-subtitle">' + Utils.escapeHtml(module.subtitle) + '</p>' : '') +
        '</div>' +
        (cards.length > 0 ? '<div class="travel-grid">' + cardsHtml + '</div>' : '') +
        '<div style="text-align:center;margin-top:32px;">' +
          '<a href="/travel.html" class="btn btn-primary btn-lg">查看完整攻略</a>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  // ==============================
  // 自定义内容模块
  // ==============================
  function renderCustomModule(module) {
    var config = module.config || {};
    var content = config.content || '';

    return '<section class="home-section">' +
      '<div class="container">' +
        '<div class="section-header">' +
          '<h2 class="section-title">' + Utils.escapeHtml(module.title) + '</h2>' +
          (module.subtitle ? '<p class="section-subtitle">' + Utils.escapeHtml(module.subtitle) + '</p>' : '') +
        '</div>' +
        '<div class="custom-module-content">' + content + '</div>' +
      '</div>' +
    '</section>';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
