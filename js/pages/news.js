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
      { title: '千年古村 山水人和：央视镜头下的福溪', category_name: '村内新闻', excerpt: '2025 年央视"文化中国行"以《千年古村 山水人和》为题报道福溪。这座始建于宋代、2012 年列入首批中国传统村落的古村，正焕发新生。', cover_image: '/images/banners/banner1.svg', author_name: '福溪村', views: 0, id: 1 },
      { title: '炸龙闹元宵：千年瑶俗与潇贺古道的回响', category_name: '民俗风情', excerpt: '正月初十到十五的炸龙狂欢已传承千年，据传沿秦潇贺古道传入富川。叠加盘王节、芦笙长鼓舞、二声部民歌。', cover_image: '/images/ethnic/dance.svg', author_name: '福溪村', views: 0, id: 4 },
      { title: '关于福溪村官方网站正式上线的公告', category_name: '通知公告', excerpt: '福溪村官方网站正式上线。本站系统展示福溪历史文化、古建筑、民族风情与旅游信息，支持游客与注册用户两种互动方式。', cover_image: '/images/about/village-overview.svg', author_name: '福溪村', views: 0, id: 7 }
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
