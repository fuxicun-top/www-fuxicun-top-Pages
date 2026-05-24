// ========================================
// 文件说明：文章列表页脚本
// 文件路径：js/pages/articles.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;
  var currentCategory = '';

  function init() {
    loadCategories();

    // 从 URL 获取分类参数
    var params = new URLSearchParams(window.location.search);
    currentCategory = params.get('category') || '';
    currentPage = parseInt(params.get('page')) || 1;

    loadArticles();
  }

  async function loadCategories() {
    try {
      var result = await API.get('/categories');
      if (result.success) {
        renderCategories(result.data);
      }
    } catch (e) {
      console.error('Load categories error:', e);
    }
  }

  function renderCategories(categories) {
    var container = document.getElementById('category-filter');
    var html = '<button class="filter-btn' + (currentCategory === '' ? ' active' : '') + '" data-category="">全部</button>';

    categories.forEach(function(cat) {
      html += '<button class="filter-btn' + (currentCategory === cat.slug ? ' active' : '') + '" data-category="' + cat.slug + '">' + cat.name + '</button>';
    });

    container.innerHTML = html;

    // 绑定筛选事件
    container.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.onclick = function() {
        currentCategory = this.dataset.category;
        currentPage = 1;
        container.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        loadArticles();
      };
    });
  }

  async function loadArticles() {
    var container = document.getElementById('articles-list');
    // 显示加载状态
    container.innerHTML = '<div class="skeleton" style="height:300px;"></div><div class="skeleton" style="height:300px;"></div><div class="skeleton" style="height:300px;"></div>';

    try {
      var params = { page: currentPage, pageSize: CONFIG.PAGE_SIZE };
      if (currentCategory) params.category = currentCategory;

      var result = await API.get('/articles', params);
      if (result.success) {
        if (result.data.list.length > 0) {
          renderArticles(result.data.list);
          renderPagination(result.data.total, result.data.page, result.data.pageSize);
        } else {
          // 无数据时恢复默认静态内容
          container.innerHTML = getDefaultArticlesHtml();
        }
      } else {
        container.innerHTML = getDefaultArticlesHtml();
      }
    } catch (e) {
      // API 失败，显示默认静态内容
      container.innerHTML = getDefaultArticlesHtml();
    }
  }

  // 默认静态文章（API 不可用时显示）
  function getDefaultArticlesHtml() {
    var defaults = [
      { title: '福溪村千年古建筑群：岭南建筑艺术的活化石', category: '古建筑', excerpt: '福溪村保存着完好的明清古建筑群，青砖黛瓦、飞檐翘角，每一座建筑都诉说着千年的故事。', image: '/images/default/article.svg' },
      { title: '周敦颐理学思想在福溪村的千年传承', category: '理学文化', excerpt: '探索周敦颐"出淤泥而不染"的精神内涵，感受理学文化的深远影响。', image: '/images/default/article.svg' },
      { title: '多彩瑶族风情：福溪村民俗文化巡礼', category: '民俗风情', excerpt: '走进瑶族传统节庆，体验独特的民族风情和丰富的民间艺术。', image: '/images/default/article.svg' }
    ];
    return defaults.map(function(a) {
      return '<div class="card article-card">' +
        '<a href="/articles.html" class="card__image-link">' +
          '<img src="' + a.image + '" alt="' + Utils.escapeHtml(a.title) + '" class="card__image" loading="lazy">' +
        '</a>' +
        '<div class="card__body">' +
          '<span class="card__category">' + Utils.escapeHtml(a.category) + '</span>' +
          '<h3 class="card__title"><a href="/articles.html">' + Utils.escapeHtml(a.title) + '</a></h3>' +
          '<p class="card__summary">' + Utils.escapeHtml(a.excerpt) + '</p>' +
          '<div class="card__meta">' +
            '<span class="card__author">福溪村</span>' +
            '<span class="card__date">福溪村</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderArticles(articles) {
    var container = document.getElementById('articles-list');

    if (!articles || articles.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无文章</div>';
      return;
    }

    var html = articles.map(function(article) {
      var date = Utils.formatDate(article.published_at || article.created_at);
      var cover = article.cover_image || '/images/default-cover.svg';
      // 优先使用 slug 友好 URL，否则使用传统 ID URL
      var articleUrl = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;

      return '<div class="card article-card">' +
        '<a href="' + articleUrl + '" class="card__image-link">' +
          '<img src="' + cover + '" alt="' + Utils.escapeHtml(article.title) + '" class="card__image" loading="lazy">' +
        '</a>' +
        '<div class="card__body">' +
          (article.category_name ? '<span class="card__category">' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
          '<h3 class="card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h3>' +
          '<p class="card__summary">' + Utils.escapeHtml(article.summary || '') + '</p>' +
          '<div class="card__meta">' +
            '<span class="card__author">' + Utils.escapeHtml(article.author_name || '匿名') + '</span>' +
            '<span class="card__date">' + date + '</span>' +
            '<span class="card__views">' + (article.views || 0) + ' 浏览</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = html;
  }

  function renderPagination(total, page, pageSize) {
    var container = document.getElementById('pagination');
    if (typeof Pagination !== 'undefined') {
      Pagination.render(container, total, page, pageSize, function(newPage) {
        currentPage = newPage;
        loadArticles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
