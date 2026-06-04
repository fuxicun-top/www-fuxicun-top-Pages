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

  // 默认村民故事（API 不可用时显示，仅村民故事分类）
  function getDefaultStories() {
    return [
      { title: '老人讲古：风雨桥头听来的福溪百年', excerpt: '风雨桥头听老人讲古：周姓族人从湖南道州迁来、村里曾有24座戏台、五代时期124名汉族士兵驻守。', cover_image: '/images/ethnic/yao-people.svg', author_name: '福溪村', created_at: '2026-05-22', id: 6 }
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
      var cover = story.cover_image || '/images/default/article.png';
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
