// ========================================
// 文件说明：首页脚本
// 文件路径：js/pages/home.js
// 功能：轮播图初始化、村庄简介动态加载、精选推荐、最新文章、图片画廊预览
// ========================================

(function() {
  'use strict';

  function init() {
    // 初始化轮播图
    Banner.init('banner-container');
    // 加载网站配置（动态更新简介和联系信息）
    loadSiteConfig();
    // 加载精选推荐文章
    loadFeaturedArticles();
    // 加载最新文章
    loadLatestArticles();
    // 加载图片画廊预览
    loadGalleryPreview();
  }

  // ==============================
  // 加载网站配置（动态更新页面内容）
  // ==============================
  var siteConfig = null;

  async function loadSiteConfig() {
    try {
      var result = await API.get('/config');
      if (result.success && result.data) {
        siteConfig = result.data;
        if (siteConfig.site_name) {
          document.title = siteConfig.site_name + ' - 千年古村 · 理学圣地';
        }
        var introDesc = document.getElementById('intro-description');
        if (introDesc && siteConfig.site_description) {
          introDesc.textContent = siteConfig.site_description;
        }
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  }

  // ==============================
  // 加载精选推荐文章（支持后台配置自定义文章位置）
  // 最大 5 篇，自定义优先，其余按点赞量排行
  // ==============================
  async function loadFeaturedArticles() {
    var container = document.getElementById('featured-articles');
    if (!container) return;

    try {
      // 解析配置
      var config = {};
      if (siteConfig && siteConfig.home_featured) {
        try { config = JSON.parse(siteConfig.home_featured); } catch (e) { config = {}; }
      }

      var slots = 5;
      var result = new Array(slots).fill(null);
      var usedIds = new Set();
      var customCount = 0;

      // 第一步：填充自定义位置
      for (var i = 1; i <= slots; i++) {
        var articleId = config[String(i)];
        if (articleId) {
          try {
            var res = await API.get('/articles/' + articleId);
            if (res.success && res.data) {
              result[i - 1] = res.data;
              usedIds.add(articleId);
              customCount++;
            }
          } catch (e) { /* 文章不存在，保持 null */ }
        }
      }

      // 第二步：用点赞最高的文章填充剩余位置
      var remaining = slots - customCount;
      if (remaining > 0) {
        var liked = await API.get('/articles', { page: 1, pageSize: slots + customCount, sort: 'likes' });
        if (liked.success && liked.data.list.length > 0) {
          var fillIndex = 0;
          for (var j = 0; j < liked.data.list.length && fillIndex < slots; j++) {
            if (!usedIds.has(liked.data.list[j].id)) {
              while (fillIndex < slots && result[fillIndex] !== null) fillIndex++;
              if (fillIndex < slots) {
                result[fillIndex] = liked.data.list[j];
                usedIds.add(liked.data.list[j].id);
                fillIndex++;
              }
            }
          }
        }
      }

      // 过滤空位并渲染
      var articles = result.filter(function(a) { return a !== null; });
      if (articles.length > 0) {
        renderFeaturedArticles(articles);
      }
    } catch (e) {
      // 加载失败，保留默认静态内容
    }
  }

  // ==============================
  // 渲染精选推荐文章
  // ==============================
  function renderFeaturedArticles(articles) {
    var container = document.getElementById('featured-articles');
    if (!container) return;

    container.innerHTML = articles.map(function(article, index) {
      // 第一篇大图展示，其余小图列表
      var articleUrl = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;
      var coverSrc = article.cover_image || '/images/default/article.svg';

      if (index === 0) {
        // 大图推荐卡片
        return '<div class="featured-card featured-card--large">' +
          '<img class="featured-card__image" src="' + coverSrc + '" alt="' + Utils.escapeHtml(article.title) + '" loading="lazy">' +
          '<div class="featured-card__overlay">' +
            (article.category_name ? '<span class="featured-card__category">' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
            '<h3 class="featured-card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h3>' +
            '<p class="featured-card__excerpt">' + Utils.escapeHtml(Utils.truncate(article.excerpt || article.content, 120)) + '</p>' +
          '</div>' +
        '</div>';
      }

      // 小图列表卡片
      return '<div class="featured-card">' +
        '<img class="featured-card__image" src="' + coverSrc + '" alt="' + Utils.escapeHtml(article.title) + '" loading="lazy">' +
        '<div class="featured-card__body">' +
          '<h4 class="featured-card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h4>' +
          '<p class="featured-card__meta">' + Utils.timeAgo(article.created_at) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ==============================
  // 加载新闻动态（支持后台配置自定义文章位置）
  // 最大 4 篇，自定义优先，其余按最新发布时间
  // ==============================
  async function loadLatestArticles() {
    try {
      // 解析配置
      var config = {};
      if (siteConfig && siteConfig.home_news) {
        try { config = JSON.parse(siteConfig.home_news); } catch (e) { config = {}; }
      }

      var slots = 4;
      var result = new Array(slots).fill(null);
      var usedIds = new Set();
      var customCount = 0;

      // 第一步：填充自定义位置
      for (var i = 1; i <= slots; i++) {
        var articleId = config[String(i)];
        if (articleId) {
          try {
            var res = await API.get('/articles/' + articleId);
            if (res.success && res.data) {
              result[i - 1] = res.data;
              usedIds.add(articleId);
              customCount++;
            }
          } catch (e) { /* 文章不存在，保持 null */ }
        }
      }

      // 第二步：用最新发布的文章填充剩余位置
      var remaining = slots - customCount;
      if (remaining > 0) {
        var latest = await API.get('/articles', { page: 1, pageSize: slots + customCount });
        if (latest.success && latest.data.list.length > 0) {
          var fillIndex = 0;
          for (var j = 0; j < latest.data.list.length && fillIndex < slots; j++) {
            if (!usedIds.has(latest.data.list[j].id)) {
              while (fillIndex < slots && result[fillIndex] !== null) fillIndex++;
              if (fillIndex < slots) {
                result[fillIndex] = latest.data.list[j];
                usedIds.add(latest.data.list[j].id);
                fillIndex++;
              }
            }
          }
        }
      }

      // 过滤空位并渲染
      var articles = result.filter(function(a) { return a !== null; });
      if (articles.length > 0) {
        renderArticles(articles);
      }
    } catch (e) {
      // 加载失败，保留默认静态内容
    }
  }

  // ==============================
  // 渲染最新文章列表
  // ==============================
  function renderArticles(articles) {
    var container = document.getElementById('latest-articles');
    if (!container) return;

    if (!articles || articles.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-placeholder);grid-column:1/-1;">暂无文章</p>';
      return;
    }

    container.innerHTML = articles.map(function(article) {
      // 优先使用 slug 友好 URL
      var articleUrl = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;

      return '<div class="article-card">' +
        '<img class="article-card__image" src="' + (article.cover_image || '/images/default/article.svg') + '" alt="' + Utils.escapeHtml(article.title) + '" loading="lazy">' +
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
  // 加载图片画廊预览（获取最新媒体图片）
  // ==============================
  async function loadGalleryPreview() {
    var container = document.getElementById('gallery-preview');
    if (!container) return;

    try {
      // 从公开媒体接口获取最新图片
      var result = await API.get('/media', { page: 1, pageSize: 8, type: 'image' });
      if (result.success && result.data.list && result.data.list.length > 0) {
        renderGalleryPreview(result.data.list);
      } else {
        // 没有上传图片时显示默认占位
        renderDefaultGallery();
      }
    } catch (e) {
      // 非管理员无法访问 admin/media，使用默认图片
      renderDefaultGallery();
    }
  }

  // ==============================
  // 渲染图片画廊预览
  // ==============================
  function renderGalleryPreview(images) {
    var container = document.getElementById('gallery-preview');
    if (!container) return;

    container.innerHTML = images.map(function(img) {
      var imgSrc = img.url || '/images/default/gallery.svg';
      return '<div class="gallery-item">' +
        '<img src="' + imgSrc + '" alt="' + Utils.escapeHtml(img.original_name || '福溪村风光') + '" loading="lazy">' +
      '</div>';
    }).join('');
  }

  // ==============================
  // 渲染默认图片画廊（使用静态占位图）
  // ==============================
  function renderDefaultGallery() {
    var container = document.getElementById('gallery-preview');
    if (!container) return;

    var defaultImages = [
      { src: '/images/scenery/ancient-architecture.svg', alt: '古建筑群' },
      { src: '/images/culture/ai-lian-tang.svg', alt: '爱莲堂' },
      { src: '/images/culture/lecture.svg', alt: '讲学堂' },
      { src: '/images/ethnic/dance.svg', alt: '民俗活动' },
      { src: '/images/ethnic/yao-people.svg', alt: '瑶族风情' },
      { src: '/images/about/village-overview.svg', alt: '福溪全景' }
    ];

    container.innerHTML = defaultImages.map(function(img) {
      return '<div class="gallery-item">' +
        '<img src="' + img.src + '" alt="' + Utils.escapeHtml(img.alt) + '" loading="lazy">' +
      '</div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
