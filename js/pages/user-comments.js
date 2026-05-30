// ========================================
// 文件说明：我的评论页脚本
// 文件路径：js/pages/user-comments.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;

  function init() {
    if (!UserPanel.init()) return;

    loadComments(1);
  }

  async function loadComments(page) {
    currentPage = page;
    var container = document.getElementById('comments-list');
    container.innerHTML = '<div class="skeleton" style="height:80px;margin-bottom:16px;"></div><div class="skeleton" style="height:80px;margin-bottom:16px;"></div><div class="skeleton" style="height:80px;"></div>';

    try {
      var result = await API.get('/user/comments', { page: page, pageSize: 10 });
      if (result.success) {
        renderComments(result.data.list);
        if (typeof Pagination !== 'undefined') {
          Pagination.render(document.getElementById('comments-pagination'), result.data.total, result.data.page, result.data.pageSize, function(p) {
            loadComments(p);
          });
        }
      } else {
        container.innerHTML = '<div class="empty-state">加载失败</div>';
      }
    } catch (e) {
      container.innerHTML = '<div class="empty-state">加载失败</div>';
    }
  }

  function renderComments(list) {
    var container = document.getElementById('comments-list');

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无评论</div>';
      return;
    }

    var statusMap = {
      pending: { text: '待审核', class: 'pending' },
      approved: { text: '已通过', class: 'published' },
      rejected: { text: '未通过', class: 'rejected' }
    };

    container.innerHTML = list.map(function(comment) {
      var status = statusMap[comment.status] || { text: comment.status, class: '' };
      var date = Utils.formatDate(comment.created_at);

      return '<div class="article-list-item" data-id="' + comment.id + '">' +
        '<div class="article-list-item__info">' +
          '<div class="article-list-item__title" style="font-size:14px;line-height:1.6;color:var(--color-text-primary);">' +
            Utils.escapeHtml(comment.content) +
          '</div>' +
          '<div class="article-list-item__meta">' +
            '<span class="status-badge status-badge--' + status.class + '">' + status.text + '</span>' +
            (comment.article_title ? '<a href="/article-detail.html?id=' + comment.article_id + '" style="color:var(--color-primary);">' + Utils.escapeHtml(comment.article_title) + '</a>' : '') +
            '<span>' + date + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="article-list-item__actions">' +
          '<button class="btn btn-outline btn-sm btn-danger" onclick="deleteComment(' + comment.id + ')">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // 全局删除函数
  window.deleteComment = async function(id) {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      var result = await API.del('/comments/' + id);
      if (result.success) {
        Toast.success('删除成功');
        loadComments(currentPage);
      } else {
        Toast.error(result.message || '删除失败');
      }
    } catch (e) {
      Toast.error(e.message || '删除失败');
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
