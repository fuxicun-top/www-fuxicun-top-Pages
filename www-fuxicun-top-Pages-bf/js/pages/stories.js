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
      { title: '福溪村的守望者：老匠人的古建修复之路', excerpt: '跟随一位老匠人的脚步，了解古建筑修复背后的故事与坚守。', cover_image: '/images/default/article.svg', author_name: '福溪村' },
      { title: '溪水边的童年：福溪村孩子们的成长故事', excerpt: '在千年古村中长大的孩子们，他们的童年充满了溪水、古桥和欢笑。', cover_image: '/images/default/article.svg', author_name: '福溪村' },
      { title: '返乡青年：用新媒体讲述福溪村的故事', excerpt: '一位返乡青年用镜头和文字，将福溪村的美传递给更多人。', cover_image: '/images/default/article.svg', author_name: '福溪村' }
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
