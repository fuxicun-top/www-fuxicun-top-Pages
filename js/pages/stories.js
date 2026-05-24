// ========================================
// 文件说明：村民故事页脚本
// 文件路径：js/pages/stories.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;

  function init() {
    loadStories();
  }

  // 默认村民故事（API 不可用时显示）
  function getDefaultStories() {
    return [
      { title: '老人讲古：风雨桥头听来的福溪百年', excerpt: '风雨桥头听老人讲古：周姓族人从湖南道州迁来、村里曾有 24 座戏台、五代时期 124 名汉族士兵驻守。', cover_image: '/images/ethnic/yao-people.svg', author_name: '福溪村', created_at: '2026-05-22', id: 6 },
      { title: '福溪村旅游攻略：2 天 1 晚串联潇贺古道三村', excerpt: '福溪 2 天 1 晚行程：第一天深度游讲学堂、爱莲堂、24 戏台与门楣石雕；第二天串联岔山村、秀水状元村。', cover_image: '/images/scenery/ancient-architecture.svg', author_name: '福溪村', created_at: '2026-05-21', id: 5 },
      { title: '关于福溪村官方网站正式上线的公告', excerpt: '福溪村官方网站正式上线。本站系统展示福溪历史文化、古建筑、民族风情与旅游信息。', cover_image: '/images/about/village-overview.svg', author_name: '福溪村', created_at: '2026-05-23', id: 7 }
    ];
  }

  async function loadStories() {
    var container = document.getElementById('stories-list');

    try {
      var result = await API.get('/articles', {
        page: currentPage,
        pageSize: 9,
        category: 'villager-stories'
      });

      if (result.success) {
        if (result.data.list.length > 0) {
          renderStories(result.data.list);
          if (typeof Pagination !== 'undefined') {
            Pagination.render(
              document.getElementById('pagination'),
              result.data.total,
              result.data.page,
              result.data.pageSize,
              function(page) {
                currentPage = page;
                loadStories();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            );
          }
        } else {
          renderStories(getDefaultStories());
        }
      } else {
        renderStories(getDefaultStories());
      }
    } catch (e) {
      // API 失败，显示默认故事
      renderStories(getDefaultStories());
    }
  }

  function renderStories(stories) {
    var container = document.getElementById('stories-list');

    if (!stories || stories.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无村民故事</div>';
      return;
    }

    container.innerHTML = stories.map(function(story) {
      var date = Utils.formatDate(story.published_at || story.created_at);
      var cover = story.cover_image || '/images/default/article.svg';
      var url = story.slug ? '/articles/' + story.slug : '/article-detail.html?id=' + story.id;

      return '<div class="card article-card">' +
        '<a href="' + url + '" class="card__image-link">' +
          '<img src="' + cover + '" alt="' + Utils.escapeHtml(story.title) + '" class="card__image" loading="lazy">' +
        '</a>' +
        '<div class="card__body">' +
          '<h3 class="card__title"><a href="' + url + '">' + Utils.escapeHtml(story.title) + '</a></h3>' +
          '<p class="card__summary">' + Utils.escapeHtml(story.excerpt || '') + '</p>' +
          '<div class="card__meta">' +
            '<span class="card__author">' + Utils.escapeHtml(story.author_name || '匿名') + '</span>' +
            '<span class="card__date">' + date + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
