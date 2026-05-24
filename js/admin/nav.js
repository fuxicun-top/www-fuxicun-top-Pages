// ========================================
// 文件说明：导航管理页脚本
// 文件路径：js/admin/nav.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!Admin.init()) return;
    loadNav();
  }

  async function loadNav() {
    var tbody = document.getElementById('nav-tbody');
    try {
      var result = await API.get('/admin/nav');
      if (result.success) {
        renderNav(result.data);
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">加载失败</td></tr>';
    }
  }

  function renderNav(items) {
    var tbody = document.getElementById('nav-tbody');
    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">暂无导航项</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function(item) {
      return '<tr>' +
        '<td>' + item.sort_order + '</td>' +
        '<td><strong>' + Utils.escapeHtml(item.name) + '</strong></td>' +
        '<td><code>' + Utils.escapeHtml(item.url) + '</code></td>' +
        '<td>' + (item.is_external ? '外部链接' : '内部页面') + '</td>' +
        '<td>' + (item.status === 'active' ? '<span style="color:var(--color-success);">启用</span>' : '<span style="color:var(--color-text-secondary);">禁用</span>') + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline" onclick="NavPage.editNav(' + item.id + ')">编辑</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="NavPage.deleteNav(' + item.id + ', \'' + Utils.escapeHtml(item.name).replace(/'/g, "\\'") + '\')">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function showAddModal() {
    showNavModal(null);
  }

  function editNav(id) {
    API.get('/admin/nav').then(function(result) {
      if (result.success) {
        var item = result.data.find(function(n) { return n.id === id; });
        if (item) showNavModal(item);
      }
    });
  }

  function showNavModal(item) {
    var isEdit = !!item;
    var html = '<div style="display:flex;flex-direction:column;gap:16px;">' +
      '<div class="form-group"><label class="form-label">导航名称 *</label><input type="text" class="form-input" id="nav-name" value="' + (item ? Utils.escapeHtml(item.name) : '') + '" placeholder="如：走进福溪"></div>' +
      '<div class="form-group"><label class="form-label">链接地址 *</label><input type="text" class="form-input" id="nav-url" value="' + (item ? Utils.escapeHtml(item.url) : '') + '" placeholder="如：/about.html 或 https://example.com"></div>' +
      '<div class="form-group"><label class="form-label">排序（数字越小越靠前）</label><input type="number" class="form-input" id="nav-sort" value="' + (item ? item.sort_order : 0) + '"></div>' +
      '<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="nav-external" ' + (item && item.is_external ? 'checked' : '') + ' style="width:auto;"> 外部链接（新窗口打开）</label></div>' +
      '<div class="form-group"><label class="form-label">状态</label><select class="form-input" id="nav-status"><option value="active" ' + (!item || item.status === 'active' ? 'selected' : '') + '>启用</option><option value="inactive" ' + (item && item.status === 'inactive' ? 'selected' : '') + '>禁用</option></select></div>' +
    '</div>';

    Modal.show({
      title: isEdit ? '编辑导航' : '添加导航',
      content: html,
      confirmText: isEdit ? '保存' : '添加',
      showCancel: true,
      onConfirm: function() {
        var name = document.getElementById('nav-name').value.trim();
        var url = document.getElementById('nav-url').value.trim();
        var sort_order = parseInt(document.getElementById('nav-sort').value) || 0;
        var is_external = document.getElementById('nav-external').checked ? 1 : 0;
        var status = document.getElementById('nav-status').value;

        if (!name || !url) {
          Toast.warning('请填写名称和链接');
          return;
        }

        var data = { name: name, url: url, sort_order: sort_order, is_external: is_external, status: status };

        var promise = isEdit
          ? API.put('/admin/nav/' + item.id, data)
          : API.post('/admin/nav', data);

        promise.then(function(result) {
          if (result.success) {
            Toast.success(isEdit ? '更新成功' : '添加成功');
            loadNav();
          } else {
            Toast.error(result.error?.message || '操作失败');
          }
        }).catch(function(e) {
          Toast.error('操作失败: ' + e.message);
        });
      }
    });
  }

  function deleteNav(id, name) {
    Modal.show({
      title: '删除导航',
      content: '<p>确定要删除导航「' + name + '」吗？</p>',
      confirmText: '删除',
      showCancel: true,
      onConfirm: async function() {
        try {
          var result = await API.delete('/admin/nav/' + id);
          if (result.success) {
            Toast.success('删除成功');
            loadNav();
          } else {
            Toast.error(result.error?.message || '删除失败');
          }
        } catch (e) {
          Toast.error('删除失败: ' + e.message);
        }
      }
    });
  }

  window.NavPage = {
    showAddModal: showAddModal,
    editNav: editNav,
    deleteNav: deleteNav
  };

  document.addEventListener('DOMContentLoaded', init);
})();
