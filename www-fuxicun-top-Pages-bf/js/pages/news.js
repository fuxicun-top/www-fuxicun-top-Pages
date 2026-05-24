// ========================================
// 文件说明：新闻动态页脚本
// 文件路径：js/pages/news.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;
  var currentSort = 'latest';

  function init() {
    var params = new URLSearchParams(window.location.search);
    currentPage = parseInt(params.get('page')) || 1;
    currentSort = params.get('sort') || 'latest';

    // 高亮当前排序按钮
    document.querySelectorAll('.news-sort-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.sort === currentSort);
    });

    loadNews();
  }

  function changeSort(sort) {
    currentSort = sort;
    currentPage = 1;
    document.querySelectorAll('.news-sort-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.sort === sort);
    });
    loadNews();
  }

  // 默认新闻（API 不可用时显示）
  function getDefaultNews() {
    return [
      { title: '福溪村最新动态与新闻资讯', category_name: '村内新闻', excerpt: '了解福溪村的最新发展动态，关注古村落保护与乡村振兴的最新进展。', cover_image: '/images/default/article.svg', author_name: '福溪村', views: 0 },
      { title: '爱莲说精神：周敦颐理学思想的当代价值', category_name: '理学文化', excerpt: '探索周敦颐"出淤泥而不染"的精神内涵，感受理学文化的深远影响。', cover_image: '/images/default/article.svg', author_name: '福溪村', views: 0 },
      { title: '瑶族传统节庆：福溪村的多彩民族文化', category_name: '民俗风情', excerpt: '走进瑶族传统节庆，体验独特的民族风情和丰富的民间艺术。', cover_image: '/images/default/article.svg', author_name: '福溪村', views: 0 }
    ];
  }

  async function loadNews() {
    var container = document.getElementById('news-list');
    container.innerHTML = '<div class="skeleton" style="height:170px;border-radius:var(--radius-lg);"></div>'.repeat(3);

    try {
      var params = {
        page: currentPage,
        pageSize: CONFIG.PAGE_SIZE,
        category: 'news'
      };
      if (currentSort === 'views') params.order = 'views';

      var result = await API.get('/articles', params);
      if (result.success) {
        if (result.data.list.length > 0) {
          renderNews(result.data.list);
          renderPagination(result.data.total, result.data.page, result.data.pageSize);
        } else {
          renderNews(getDefaultNews());
        }
      } else {
        renderNews(getDefaultNews());
      }
    } catch (e) {
      // API 失败，显示默认新闻
      renderNews(getDefaultNews());
    }
  }

  function renderNews(articles) {
    var container = document.getElementById('news-list');
    if (!articles || articles.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无新闻</div>';
      return;
    }

    container.innerHTML = articles.map(function(article) {
      var date = Utils.formatDate(article.published_at || article.created_at);
      var cover = article.cover_image || '/images/default-cover.svg';
      var url = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;

      return '<a href="' + url + '" class="news-item">' +
        '<img src="' + cover + '" alt="' + Utils.escapeHtml(article.title) + '" class="news-item__image" loading="lazy">' +
        '<div class="news-item__content">' +
          (article.category_name ? '<span class="news-item__category">' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
          '<h3 class="news-item__title">' + Utils.escapeHtml(article.title) + '</h3>' +
          '<p class="news-item__excerpt">' + Utils.escapeHtml(article.excerpt || '') + '</p>' +
          '<div class="news-item__meta">' +
            '<span>' + Utils.escapeHtml(article.author_name || '匿名') + '</span>' +
            '<span>' + date + '</span>' +
            '<span>' + (article.views || 0) + ' 浏览</span>' +
          '</div>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  function renderPagination(total, page, pageSize) {
    var container = document.getElementById('pagination');
    if (typeof Pagination !== 'undefined') {
      Pagination.render(container, total, page, pageSize, function(newPage) {
        currentPage = newPage;
        loadNews();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  window.NewsPage = { changeSort: changeSort };
  document.addEventListener('DOMContentLoaded', init);
})();
