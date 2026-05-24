// ========================================
// 文件说明：用户管理脚本（含批量操作）
// 文件路径：js/admin/users.js
// 功能：用户列表、搜索、角色变更、启用/禁用、删除用户、批量操作
// ========================================

(function() {
  'use strict';

  /** @type {number} 当前页码 */
  var currentPage = 1;

  /** @type {Set} 已选中的用户 ID 集合 */
  var selectedIds = new Set();

  /**
   * 页面初始化入口
   */
  function init() {
    if (!Admin.init()) return;
    loadUsers();
    bindEvents();
  }

  /**
   * 绑定搜索、筛选和批量操作事件
   */
  function bindEvents() {
    // 搜索框防抖
    document.getElementById('search-keyword').oninput = Utils.debounce(function() {
      currentPage = 1;
      loadUsers();
    }, 300);

    // 角色筛选
    document.getElementById('filter-role').onchange = function() {
      currentPage = 1;
      loadUsers();
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
    var batchEnable = document.getElementById('batch-enable');
    var batchDisable = document.getElementById('batch-disable');
    var batchDelete = document.getElementById('batch-delete');

    if (batchEnable) {
      batchEnable.onclick = function() { batchToggleStatus('active'); };
    }
    if (batchDisable) {
      batchDisable.onclick = function() { batchToggleStatus('disabled'); };
    }
    if (batchDelete) {
      batchDelete.onclick = function() { batchDeleteUsers(); };
    }
  }

  /**
   * 加载用户列表
   * 调用 GET /admin/users 接口
   */
  async function loadUsers() {
    var keyword = document.getElementById('search-keyword').value;
    var role = document.getElementById('filter-role').value;

    try {
      var result = await API.get('/admin/users', {
        page: currentPage,
        pageSize: 20,
        keyword: keyword,
        role: role
      });

      if (result.success) {
        selectedIds.clear();
        var selectAll = document.getElementById('select-all');
        if (selectAll) selectAll.checked = false;
        renderUsers(result.data.list);
        renderPagination(result.data.total, result.data.page, result.data.pageSize);
        updateBatchBar();
      }
    } catch (e) {
      Toast.error('加载用户失败');
    }
  }

  /**
   * 渲染用户表格（含复选框、角色切换、启禁用、删除按钮）
   * @param {Array} users - 用户数据数组
   */
  function renderUsers(users) {
    var tbody = document.getElementById('users-tbody');

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--color-text-placeholder);">暂无用户</td></tr>';
      return;
    }

    var statusMap = { active: '正常', disabled: '已禁用' };

    tbody.innerHTML = users.map(function(u) {
      return '<tr>' +
        '<td><input type="checkbox" class="row-checkbox" data-id="' + u.id + '" ' + (selectedIds.has(u.id) ? 'checked' : '') + ' onchange="UsersPage.toggleSelect(' + u.id + ',this.checked)"></td>' +
        '<td>' + u.id + '</td>' +
        '<td>' + Utils.escapeHtml(u.username) + '</td>' +
        '<td>' + (u.phone || '-') + '</td>' +
        '<td><select class="filter-select" onchange="UsersPage.changeRole(' + u.id + ',this.value)" style="padding:4px 8px;font-size:12px;">' +
          '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>普通用户</option>' +
          '<option value="editor"' + (u.role === 'editor' ? ' selected' : '') + '>编辑者</option>' +
          '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>管理员</option>' +
        '</select></td>' +
        '<td><span class="status-badge status-badge--' + (u.status === 'active' ? 'published' : 'draft') + '">' + statusMap[u.status] + '</span></td>' +
        '<td>' + Utils.formatDate(u.created_at) + '</td>' +
        '<td class="actions">' +
          '<button onclick="UsersPage.toggleStatus(' + u.id + ',\'' + u.status + '\')">' + (u.status === 'active' ? '禁用' : '启用') + '</button>' +
          '<button class="btn-danger-text" onclick="UsersPage.deleteUser(' + u.id + ')">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');
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
    Pagination.render('pagination', page, totalPages, 'UsersPage.goToPage');
  }

  /**
   * 跳转到指定页
   * @param {number} page - 页码
   */
  function goToPage(page) {
    currentPage = page;
    loadUsers();
  }

  /**
   * 切换单行复选框选中状态
   * @param {number} id - 用户 ID
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
   * 批量切换用户状态
   * @param {string} status - 目标状态（active 或 disabled）
   */
  async function batchToggleStatus(status) {
    if (selectedIds.size === 0) {
      Toast.warning('请先选择用户');
      return;
    }

    var action = status === 'active' ? '启用' : '禁用';
    if (!confirm('确定要批量' + action + '选中的 ' + selectedIds.size + ' 个用户吗？')) return;

    var successCount = 0;
    var failCount = 0;

    for (var id of selectedIds) {
      try {
        var result = await API.put('/admin/users/' + id + '/status', { status: status });
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) Toast.success('成功' + action + ' ' + successCount + ' 个用户');
    if (failCount > 0) Toast.error(failCount + ' 个用户操作失败');

    selectedIds.clear();
    loadUsers();
  }

  /**
   * 批量删除用户
   */
  async function batchDeleteUsers() {
    if (selectedIds.size === 0) {
      Toast.warning('请先选择用户');
      return;
    }

    if (!confirm('确定要删除选中的 ' + selectedIds.size + ' 个用户吗？\n\n用户的评论和点赞也会被删除，此操作不可恢复。')) return;

    var successCount = 0;
    var failCount = 0;

    for (var id of selectedIds) {
      try {
        var result = await API.delete('/admin/users/' + id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) Toast.success('成功删除 ' + successCount + ' 个用户');
    if (failCount > 0) Toast.error(failCount + ' 个用户删除失败');

    selectedIds.clear();
    loadUsers();
  }

  /**
   * 修改用户角色
   * @param {number} id - 用户 ID
   * @param {string} role - 目标角色
   */
  async function changeRole(id, role) {
    try {
      var result = await API.put('/admin/users/' + id + '/role', { role: role });
      if (result.success) {
        Toast.success('角色更新成功');
      } else {
        Toast.error(result.error?.message || '更新失败');
        loadUsers();
      }
    } catch (e) {
      Toast.error(e.message);
      loadUsers();
    }
  }

  /**
   * 切换用户启用/禁用状态
   * @param {number} id - 用户 ID
   * @param {string} currentStatus - 当前状态
   */
  async function toggleStatus(id, currentStatus) {
    var newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    var action = newStatus === 'disabled' ? '禁用' : '启用';

    if (!confirm('确定要' + action + '该用户吗？')) return;

    try {
      var result = await API.put('/admin/users/' + id + '/status', { status: newStatus });
      if (result.success) {
        Toast.success(action + '成功');
        loadUsers();
      } else {
        Toast.error(result.error?.message || '操作失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  /**
   * 删除用户（不能删除自己，不能删除最后一个管理员）
   * @param {number} id - 用户 ID
   */
  async function deleteUser(id) {
    if (!confirm('确定要删除该用户吗？\n\n该用户的评论和点赞也会被删除，此操作不可恢复。')) return;

    try {
      var result = await API.delete('/admin/users/' + id);
      if (result.success) {
        Toast.success('用户已删除');
        loadUsers();
      } else {
        Toast.error(result.error?.message || '删除失败');
      }
    } catch (e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  // 暴露全局方法
  window.UsersPage = {
    goToPage: goToPage,
    toggleSelect: toggleSelect,
    changeRole: changeRole,
    toggleStatus: toggleStatus,
    deleteUser: deleteUser
  };

  document.addEventListener('DOMContentLoaded', init);
})();
