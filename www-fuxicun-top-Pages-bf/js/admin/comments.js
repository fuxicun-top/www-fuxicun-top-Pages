// ========================================
// 文件说明：评论管理页面脚本（含批量操作）
// 文件路径：js/admin/comments.js
// 功能：评论列表查看、状态审核（通过/拒绝）、删除评论、批量操作
// ========================================

(function() {
  'use strict';

  /** @type {number} 当前页码 */
  var currentPage = 1;

  /** @type {string} 当前状态筛选 */
  var currentStatus = '';

  /** @type {string} 当前搜索关键词 */
  var currentKeyword = '';

  /** @type {number} 防抖定时器 */
  var searchTimer = null;

  /** @type {Set} 已选中的评论 ID 集合 */
  var selectedIds = new Set();

  /**
   * 页面初始化入口
   */
  function init() {
    if (!Admin.init()) return;
    loadComments();
    bindEvents();
  }

  /**
   * 绑定搜索、筛选和批量操作事件
   */
  function bindEvents() {
    // 搜索框输入防抖
    document.getElementById('search-keyword').addEventListener('input', function() {
      clearTimeout(searchTimer);
      var self = this;
      searchTimer = setTimeout(function() {
        currentKeyword = self.value.trim();
        currentPage = 1;
        loadComments();
      }, 300);
    });

    // 状态筛选
    document.getElementById('filter-status').addEventListener('change', function() {
      currentStatus = this.value;
      currentPage = 1;
      loadComments();
    });

    // 全选/取消全选
    var selectAll = document.getElementById('select-all');
    if (selectAll) {
      selectAll.onchange = function() {
        var checked = this.checked;
        document.querySelectorAll('.row-checkbox').forEach(function(cb) {
          cb.checked = checked;
          var id = parseInt(cb.dataset.id);
          if (checked) { selectedIds.add(id); } else { selectedIds.delete(id); }
        });
        updateBatchBar();
      };
    }

    // 批量操作按钮
    var batchApprove = document.getElementById('batch-approve');
    var batchReject = document.getElementById('batch-reject');
    var batchDelete = document.getElementById('batch-delete');

    if (batchApprove) batchApprove.onclick = function() { batchUpdateStatus('approved'); };
    if (batchReject) batchReject.onclick = function() { batchUpdateStatus('rejected'); };
    if (batchDelete) batchDelete.onclick = function() { batchDeleteComments(); };
  }

  /**
   * 加载评论列表
   */
  async function loadComments() {
    var tbody = document.getElementById('comments-tbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">加载中...</td></tr>';

    try {
      var params = { page: currentPage, pageSize: 20 };
      if (currentStatus) params.status = currentStatus;
      if (currentKeyword) params.keyword = currentKeyword;

      var result = await API.get('/admin/comments', params);
      if (result.success) {
        selectedIds.clear();
        var selectAll = document.getElementById('select-all');
        if (selectAll) selectAll.checked = false;
        renderComments(result.data.list);
        renderPagination(result.data.total, result.data.page, result.data.pageSize);
        updateBatchBar();
      } else {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">加载失败</td></tr>';
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#c62828;">加载失败: ' + e.message + '</td></tr>';
    }
  }

  /**
   * 渲染评论表格（含复选框）
   */
  function renderComments(comments) {
    var tbody = document.getElementById('comments-tbody');

    if (!comments || comments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">暂无评论</td></tr>';
      return;
    }

    tbody.innerHTML = comments.map(function(comment) {
      var statusClass = 'status-tag--' + comment.status;
      var statusText = { approved: '已通过', pending: '待审核', rejected: '已拒绝' }[comment.status] || comment.status;

      var content = Utils.escapeHtml(comment.content || '');
      if (content.length > 60) content = content.substring(0, 60) + '...';

      return '<tr>' +
        '<td><input type="checkbox" class="row-checkbox" data-id="' + comment.id + '" ' + (selectedIds.has(comment.id) ? 'checked' : '') + ' onchange="CommentsPage.toggleSelect(' + comment.id + ',this.checked)"></td>' +
        '<td>' + comment.id + '</td>' +
        '<td class="comment-content-cell" title="' + Utils.escapeHtml(comment.content) + '">' + content + '</td>' +
        '<td>' + Utils.escapeHtml(comment.username || '匿名') + '</td>' +
        '<td><a href="/article-detail.html?id=' + comment.article_id + '" class="comment-article-link" target="_blank">' + Utils.escapeHtml(comment.article_title || '已删除') + '</a></td>' +
        '<td><span class="status-tag ' + statusClass + '">' + statusText + '</span></td>' +
        '<td>' + Utils.formatDate(comment.created_at) + '</td>' +
        '<td>' + renderActions(comment) + '</td>' +
      '</tr>';
    }).join('');
  }

  /**
   * 渲染操作按钮
   */
  function renderActions(comment) {
    var buttons = '';
    if (comment.status !== 'approved') {
      buttons += '<button class="btn btn-sm btn-success" onclick="CommentsPage.updateStatus(' + comment.id + ', \'approved\')">通过</button> ';
    }
    if (comment.status !== 'rejected') {
      buttons += '<button class="btn btn-sm btn-warning" onclick="CommentsPage.updateStatus(' + comment.id + ', \'rejected\')">拒绝</button> ';
    }
    buttons += '<button class="btn btn-sm btn-danger" onclick="CommentsPage.deleteComment(' + comment.id + ')">删除</button>';
    return buttons;
  }

  /**
   * 切换单行复选框
   */
  function toggleSelect(id, checked) {
    if (checked) { selectedIds.add(id); } else { selectedIds.delete(id); }
    updateBatchBar();
  }

  /**
   * 更新批量操作栏
   */
  function updateBatchBar() {
    var batchBar = document.getElementById('batch-bar');
    var batchCount = document.getElementById('batch-count');
    if (batchBar && batchCount) {
      batchCount.textContent = selectedIds.size;
      batchBar.style.display = selectedIds.size > 0 ? 'flex' : 'none';
    }
  }

  /**
   * 批量更新评论状态
   */
  async function batchUpdateStatus(status) {
    if (selectedIds.size === 0) { Toast.warning('请先选择评论'); return; }

    var action = status === 'approved' ? '通过' : '拒绝';
    if (!confirm('确定要批量' + action + '选中的 ' + selectedIds.size + ' 条评论吗？')) return;

    var successCount = 0;
    for (var id of selectedIds) {
      try {
        var result = await API.put('/admin/comments/' + id + '/status', { status: status });
        if (result.success) successCount++;
      } catch (e) { /* 忽略 */ }
    }

    Toast.success('成功' + action + ' ' + successCount + ' 条评论');
    selectedIds.clear();
    loadComments();
  }

  /**
   * 批量删除评论
   */
  async function batchDeleteComments() {
    if (selectedIds.size === 0) { Toast.warning('请先选择评论'); return; }
    if (!confirm('确定要删除选中的 ' + selectedIds.size + ' 条评论吗？子评论也会一并删除。')) return;

    var successCount = 0;
    for (var id of selectedIds) {
      try {
        var result = await API.delete('/admin/comments/' + id);
        if (result.success) successCount++;
      } catch (e) { /* 忽略 */ }
    }

    Toast.success('成功删除 ' + successCount + ' 条评论');
    selectedIds.clear();
    loadComments();
  }

  /**
   * 更新评论状态
   */
  async function updateStatus(id, status) {
    var statusText = { approved: '通过', rejected: '拒绝' }[status];
    if (!confirm('确定要' + statusText + '该评论吗？')) return;

    try {
      var result = await API.put('/admin/comments/' + id + '/status', { status: status });
      if (result.success) {
        Toast.success('评论已' + statusText);
        loadComments();
      } else {
        Toast.error(result.error?.message || '操作失败');
      }
    } catch (e) {
      Toast.error('操作失败: ' + e.message);
    }
  }

  /**
   * 删除评论
   */
  async function deleteComment(id) {
    if (!confirm('确定要删除该评论吗？子评论也会一并删除。')) return;

    try {
      var result = await API.delete('/admin/comments/' + id);
      if (result.success) {
        Toast.success('评论已删除');
        loadComments();
      } else {
        Toast.error(result.error?.message || '删除失败');
      }
    } catch (e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  /**
   * 渲染分页
   */
  function renderPagination(total, page, pageSize) {
    var totalPages = Math.ceil(total / pageSize);
    document.getElementById('pagination-info').textContent = '共 ' + total + ' 条评论';
    Pagination.render('pagination', page, totalPages, 'CommentsPage.goToPage');
  }

  function goToPage(page) {
    currentPage = page;
    loadComments();
  }

  // 暴露全局方法
  window.CommentsPage = {
    goToPage: goToPage,
    toggleSelect: toggleSelect,
    updateStatus: updateStatus,
    deleteComment: deleteComment
  };

  document.addEventListener('DOMContentLoaded', init);
})();
