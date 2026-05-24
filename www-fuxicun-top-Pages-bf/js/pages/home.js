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
  async function loadSiteConfig() {
    try {
      var result = await API.get('/config');
      if (result.success && result.data) {
        var config = result.data;
        // 更新页面标题
        if (config.site_name) {
          document.title = config.site_name + ' - 千年古村 · 理学圣地';
        }
        // 更新简介区域（如果配置了自定义描述）
        var introDesc = document.getElementById('intro-description');
        if (introDesc && config.site_description) {
          introDesc.textContent = config.site_description;
        }
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  }

  // ==============================
  // 加载精选推荐文章（置顶文章或最新发布）
  // API 失败时保留页面默认静态内容
  // ==============================
  async function loadFeaturedArticles() {
    var container = document.getElementById('featured-articles');
    if (!container) return;

    try {
      var result = await API.get('/articles', { page: 1, pageSize: 4 });
      if (result.success && result.data.list.length > 0) {
        renderFeaturedArticles(result.data.list);
      }
      // API 成功但无数据，保留默认静态内容
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
  // 加载最新文章
  // API 失败时保留页面默认静态内容
  // ==============================
  async function loadLatestArticles() {
    try {
      var result = await API.get('/articles', { page: 1, pageSize: 3 });
      if (result.success && result.data.list.length > 0) {
        renderArticles(result.data.list);
      }
      // API 成功但无数据，保留默认静态内容
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
      { src: '/images/default/gallery1.svg', alt: '古建筑群' },
      { src: '/images/default/gallery2.svg', alt: '爱莲堂' },
      { src: '/images/default/gallery3.svg', alt: '石板古街' },
      { src: '/images/default/gallery4.svg', alt: '风雨桥' },
      { src: '/images/default/gallery5.svg', alt: '福溪水景' },
      { src: '/images/default/gallery6.svg', alt: '瑶族风情' }
    ];

    container.innerHTML = defaultImages.map(function(img) {
      return '<div class="gallery-item">' +
        '<img src="' + img.src + '" alt="' + Utils.escapeHtml(img.alt) + '" loading="lazy">' +
      '</div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
