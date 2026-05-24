// ========================================
// 文件说明：我的文章列表页脚本
// 文件路径：js/pages/user-articles.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;

  function init() {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return;
    }

    loadUserInfo();
    loadArticles();
  }

  function loadUserInfo() {
    var user = Auth.getUser();
    if (user) {
      document.getElementById('user-name').textContent = user.username;
      document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();
    }
  }

  async function loadArticles() {
    var container = document.getElementById('articles-list');
    container.innerHTML = '<div class="skeleton" style="height:80px;margin-bottom:16px;"></div><div class="skeleton" style="height:80px;margin-bottom:16px;"></div><div class="skeleton" style="height:80px;"></div>';

    try {
      var result = await API.get('/user/articles', { page: currentPage, pageSize: 10 });
      if (result.success) {
        renderArticles(result.data.list);
        if (typeof Pagination !== 'undefined') {
          Pagination.render(document.getElementById('pagination'), result.data.total, result.data.page, result.data.pageSize, function(page) {
            currentPage = page;
            loadArticles();
          });
        }
      }
    } catch (e) {
      container.innerHTML = '<div class="empty-state">加载失败</div>';
    }
  }

  function renderArticles(articles) {
    var container = document.getElementById('articles-list');

    if (!articles || articles.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无文章，<a href="/user/publish.html">去发表</a></div>';
      return;
    }

    var statusMap = {
      draft: { text: '草稿', class: 'draft' },
      pending: { text: '待审核', class: 'pending' },
      published: { text: '已发布', class: 'published' },
      rejected: { text: '未通过', class: 'rejected' }
    };

    container.innerHTML = articles.map(function(article) {
      var status = statusMap[article.status] || { text: article.status, class: '' };
      var date = Utils.formatDate(article.created_at);
      var cover = article.cover_image ? '<img src="' + article.cover_image + '" class="article-list-item__cover" alt="">' : '';

      return '<div class="article-list-item">' +
        cover +
        '<div class="article-list-item__info">' +
          '<div class="article-list-item__title"><a href="/article-detail.html?id=' + article.id + '">' + Utils.escapeHtml(article.title) + '</a></div>' +
          '<div class="article-list-item__meta">' +
            '<span class="status-badge status-badge--' + status.class + '">' + status.text + '</span>' +
            '<span>' + date + '</span>' +
            '<span>' + (article.views || 0) + ' 浏览</span>' +
          '</div>' +
        '</div>' +
        '<div class="article-list-item__actions">' +
          '<a href="/user/edit-article.html?id=' + article.id + '" class="btn btn-outline btn-sm">编辑</a>' +
          '<button class="btn btn-outline btn-sm btn-danger" onclick="deleteArticle(' + article.id + ')">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // 全局删除函数
  window.deleteArticle = async function(id) {
    if (!confirm('确定要删除这篇文章吗？')) return;

    try {
      var result = await API.del('/articles/' + id);
      if (result.success) {
        Toast.success('删除成功');
        loadArticles();
      } else {
        Toast.error(result.error?.message || '删除失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
