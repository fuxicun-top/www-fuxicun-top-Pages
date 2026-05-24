// ========================================
// 文件说明：文章管理脚本（完整版）
// 文件路径：js/admin/articles.js
// 功能：文章列表、搜索、筛选、状态变更、编辑、删除、批量操作
// ========================================

(function() {
  'use strict';

  /** @type {number} 当前页码 */
  var currentPage = 1;

  /** @type {Set} 已选中的文章 ID 集合 */
  var selectedIds = new Set();

  /**
   * 页面初始化入口
   */
  function init() {
    if (!Admin.init()) return;
    loadArticles();
    bindEvents();
  }

  /**
   * 绑定搜索、筛选和批量操作事件
   */
  function bindEvents() {
    // 搜索框防抖
    document.getElementById('search-keyword').oninput = Utils.debounce(function() {
      currentPage = 1;
      loadArticles();
    }, 300);

    // 状态筛选
    document.getElementById('filter-status').onchange = function() {
      currentPage = 1;
      loadArticles();
    };

    // 全选/取消全选复选框
    var selectAll = document.getElementById('select-all');
    if (selectAll) {
      selectAll.onchange = function() {
        var checked = this.checked;
        document.querySelectorAll('.row-checkbox').forEach(function(cb) {
          cb.checked = checked;
          var id = parseInt(cb.dataset.id);
          if (checked) {
            selectedIds.add(id);
          } else {
            selectedIds.delete(id);
          }
        });
        updateBatchBar();
      };
    }

    // 批量操作按钮
    bindBatchActions();
  }

  /**
   * 绑定批量操作按钮事件
   */
  function bindBatchActions() {
    var batchPublish = document.getElementById('batch-publish');
    var batchDraft = document.getElementById('batch-draft');
    var batchDelete = document.getElementById('batch-delete');

    if (batchPublish) {
      batchPublish.onclick = function() { batchUpdateStatus('published'); };
    }
    if (batchDraft) {
      batchDraft.onclick = function() { batchUpdateStatus('draft'); };
    }
    if (batchDelete) {
      batchDelete.onclick = function() { batchDeleteArticles(); };
    }
  }

  /**
   * 加载文章列表
   * 调用 GET /admin/articles 接口
   */
  async function loadArticles() {
    var keyword = document.getElementById('search-keyword').value;
    var status = document.getElementById('filter-status').value;

    try {
      var result = await API.get('/admin/articles', {
        page: currentPage,
        pageSize: 20,
        keyword: keyword,
        status: status
      });

      if (result.success) {
        selectedIds.clear();
        var selectAll = document.getElementById('select-all');
        if (selectAll) selectAll.checked = false;
        renderArticles(result.data.list);
        renderPagination(result.data.total, result.data.page, result.data.pageSize);
        updateBatchBar();
      }
    } catch (e) {
      Toast.error('加载文章失败');
    }
  }

  /**
   * 渲染文章表格（含复选框、状态按钮、编辑、删除）
   * @param {Array} articles - 文章数据数组
   */
  function renderArticles(articles) {
    var tbody = document.getElementById('articles-tbody');

    if (!articles || articles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;">暂无文章</td></tr>';
      return;
    }

    var statusMap = {
      published: { text: '已发布', class: 'status-badge--published' },
      pending: { text: '待审核', class: 'status-badge--pending' },
      draft: { text: '草稿', class: 'status-badge--draft' },
      rejected: { text: '已拒绝', class: 'status-badge--draft' }
    };

    tbody.innerHTML = articles.map(function(a) {
      var s = statusMap[a.status] || { text: a.status, class: '' };
      var topBadge = a.is_top ? '<span class="status-badge status-badge--published" style="cursor:pointer;" onclick="ArticlesPage.toggleTop(' + a.id + ',0)">精选</span>' : '<span class="status-badge status-badge--draft" style="cursor:pointer;opacity:0.6;" onclick="ArticlesPage.toggleTop(' + a.id + ',1)">-</span>';
      return '<tr>' +
        '<td><input type="checkbox" class="row-checkbox" data-id="' + a.id + '" ' + (selectedIds.has(a.id) ? 'checked' : '') + ' onchange="ArticlesPage.toggleSelect(' + a.id + ',this.checked)"></td>' +
        '<td>' + a.id + '</td>' +
        '<td>' + Utils.escapeHtml(Utils.truncate(a.title, 40)) + '</td>' +
        '<td>' + Utils.escapeHtml(a.category_name || '-') + '</td>' +
        '<td>' + topBadge + '</td>' +
        '<td>' + Utils.escapeHtml(a.author_name || '-') + '</td>' +
        '<td><span class="status-badge ' + s.class + '">' + s.text + '</span></td>' +
        '<td>' + (a.views || 0) + '</td>' +
        '<td>' + Utils.formatDate(a.created_at) + '</td>' +
        '<td class="actions">' +
          renderStatusButtons(a) +
          '<button onclick="ArticlesPage.editArticle(' + a.id + ')">编辑</button>' +
          '<button class="btn-danger-text" onclick="ArticlesPage.deleteArticle(' + a.id + ')">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  /**
   * 渲染状态操作按钮
   * 待审核: 通过 + 拒绝
   * 已发布: 下架
   * 草稿: 发布
   * 已拒绝: 通过
   * @param {Object} article - 文章对象
   * @returns {string} 按钮 HTML
   */
  function renderStatusButtons(article) {
    var buttons = '';
    switch (article.status) {
      case 'pending':
        buttons += '<button onclick="ArticlesPage.updateStatus(' + article.id + ',\'published\')">通过</button>';
        buttons += '<button class="btn-danger-text" onclick="ArticlesPage.updateStatus(' + article.id + ',\'rejected\')">拒绝</button>';
        break;
      case 'published':
        buttons += '<button onclick="ArticlesPage.updateStatus(' + article.id + ',\'draft\')">下架</button>';
        break;
      case 'draft':
        buttons += '<button onclick="ArticlesPage.updateStatus(' + article.id + ',\'published\')">发布</button>';
        break;
      case 'rejected':
        buttons += '<button onclick="ArticlesPage.updateStatus(' + article.id + ',\'published\')">通过</button>';
        break;
    }
    return buttons;
  }

  /**
   * 渲染分页
   * @param {number} total - 总记录数
   * @param {number} page - 当前页码
   * @param {number} pageSize - 每页数量
   */
  function renderPagination(total, page, pageSize) {
    var totalPages = Math.ceil(total / pageSize);
    document.getElementById('pagination-info').textContent = '共 ' + total + ' 条记录';
    Pagination.render('pagination', page, totalPages, 'ArticlesPage.goToPage');
  }

  /**
   * 跳转到指定页
   * @param {number} page - 页码
   */
  function goToPage(page) {
    currentPage = page;
    loadArticles();
  }

  /**
   * 切换单行复选框选中状态
   * @param {number} id - 文章 ID
   * @param {boolean} checked - 是否选中
   */
  function toggleSelect(id, checked) {
    if (checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
    updateBatchBar();
  }

  /**
   * 更新批量操作栏显示状态
   * 有选中项时显示批量操作按钮
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
   * 批量更新文章状态
   * @param {string} status - 目标状态
   */
  async function batchUpdateStatus(status) {
    if (selectedIds.size === 0) {
      Toast.warning('请先选择文章');
      return;
    }

    var actionMap = { published: '发布', draft: '下架', rejected: '拒绝' };
    var action = actionMap[status] || status;

    if (!confirm('确定要批量' + action + '选中的 ' + selectedIds.size + ' 篇文章吗？')) return;

    var successCount = 0;
    var failCount = 0;

    for (var id of selectedIds) {
      try {
        var result = await API.put('/admin/articles/' + id + '/status', { status: status });
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) Toast.success('成功' + action + ' ' + successCount + ' 篇文章');
    if (failCount > 0) Toast.error(failCount + ' 篇文章操作失败');

    selectedIds.clear();
    loadArticles();
  }

  /**
   * 批量删除文章
   */
  async function batchDeleteArticles() {
    if (selectedIds.size === 0) {
      Toast.warning('请先选择文章');
      return;
    }

    if (!confirm('确定要删除选中的 ' + selectedIds.size + ' 篇文章吗？\n\n文章的评论和点赞也会被删除，此操作不可恢复。')) return;

    var successCount = 0;
    var failCount = 0;

    for (var id of selectedIds) {
      try {
        var result = await API.delete('/admin/articles/' + id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) Toast.success('成功删除 ' + successCount + ' 篇文章');
    if (failCount > 0) Toast.error(failCount + ' 篇文章删除失败');

    selectedIds.clear();
    loadArticles();
  }

  /**
   * 切换文章精选状态
   * @param {number} id - 文章 ID
   * @param {number} isTop - 1=设为精选，0=取消精选
   */
  async function toggleTop(id, isTop) {
    try {
      var result = await API.put('/admin/articles/' + id, { is_top: isTop });
      if (result.success) {
        Toast.success(isTop ? '已设为精选' : '已取消精选');
        loadArticles();
      } else {
        Toast.error(result.error?.message || '操作失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  /**
   * 更新文章状态
   * @param {number} id - 文章 ID
   * @param {string} status - 目标状态
   */
  async function updateStatus(id, status) {
    var actionMap = { published: '发布', draft: '下架', rejected: '拒绝' };
    var action = actionMap[status] || status;

    try {
      var result = await API.put('/admin/articles/' + id + '/status', { status: status });
      if (result.success) {
        Toast.success('文章已' + action);
        loadArticles();
      } else {
        Toast.error(result.error?.message || '操作失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  /**
   * 编辑文章（跳转到富文本编辑器页面）
   * @param {number} id - 文章 ID
   */
  function editArticle(id) {
    window.location.href = '/admin/article-edit.html?id=' + id;
  }

  /**
   * 删除文章（确认后删除）
   * @param {number} id - 文章 ID
   */
  async function deleteArticle(id) {
    if (!confirm('确定要删除文章 #' + id + ' 吗？\n\n该文章的所有评论和点赞也会被删除，此操作不可恢复。')) return;

    try {
      var result = await API.delete('/admin/articles/' + id);
      if (result.success) {
        Toast.success('文章已删除');
        loadArticles();
      } else {
        Toast.error(result.error?.message || '删除失败');
      }
    } catch (e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  // 暴露全局方法
  window.ArticlesPage = {
    goToPage: goToPage,
    toggleSelect: toggleSelect,
    toggleTop: toggleTop,
    updateStatus: updateStatus,
    editArticle: editArticle,
    deleteArticle: deleteArticle
  };

  document.addEventListener('DOMContentLoaded', init);
})();
