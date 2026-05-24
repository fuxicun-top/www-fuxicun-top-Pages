// ========================================
// 文件说明：轮播图管理脚本（含拖拽排序）
// 文件路径：js/admin/banners.js
// 功能：轮播图 CRUD + HTML5 Drag & Drop 排序
// ========================================

(function() {
  'use strict';

  /** 拖拽状态变量 */
  var dragSrcRow = null;

  function init() {
    if (!Admin.init()) return;
    loadBanners();
  }

  // ==============================
  // 加载轮播图列表
  // ==============================
  async function loadBanners() {
    try {
      var result = await API.get('/admin/banners');
      if (result.success) {
        renderBanners(result.data);
      }
    } catch (e) {
      Toast.error('加载轮播图失败');
    }
  }

  // ==============================
  // 渲染轮播图表格（含拖拽属性）
  // ==============================
  function renderBanners(banners) {
    var tbody = document.getElementById('banners-tbody');

    if (!banners || banners.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">暂无轮播图</td></tr>';
      return;
    }

    tbody.innerHTML = banners.map(function(b, index) {
      return '<tr draggable="true" data-id="' + b.id + '" data-sort="' + b.sort_order + '">' +
        '<td class="drag-handle" title="拖拽排序" style="cursor:grab;">⠿ ' + b.sort_order + '</td>' +
        '<td><img src="' + Utils.escapeHtml(b.image_url) + '" style="width:120px;height:60px;object-fit:cover;border-radius:4px;" onerror="this.src=\'/images/default/article.svg\'"></td>' +
        '<td>' + Utils.escapeHtml(b.title) + '</td>' +
        '<td>' + Utils.escapeHtml(Utils.truncate(b.subtitle || '-', 20)) + '</td>' +
        '<td>' + (b.link_url ? '<a href="' + Utils.escapeHtml(b.link_url) + '" target="_blank" style="color:var(--color-primary);">查看</a>' : '-') + '</td>' +
        '<td><span class="status-badge status-badge--' + (b.status === 'active' ? 'published' : 'draft') + '">' + (b.status === 'active' ? '启用' : '禁用') + '</span></td>' +
        '<td class="actions">' +
          '<button onclick="showEditModal(' + JSON.stringify(b).replace(/"/g, '&quot;') + ')">编辑</button>' +
          '<button class="btn-danger-text" onclick="deleteBanner(' + b.id + ')">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    // 绑定拖拽事件
    bindDragEvents(tbody);
  }

  // ==============================
  // HTML5 拖拽排序逻辑
  // ==============================
  function bindDragEvents(tbody) {
    var rows = tbody.querySelectorAll('tr[draggable]');

    rows.forEach(function(row) {
      // 拖拽开始：记录源行
      row.addEventListener('dragstart', function(e) {
        dragSrcRow = row;
        row.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', row.getAttribute('data-id'));
      });

      // 拖拽结束：恢复透明度
      row.addEventListener('dragend', function() {
        row.style.opacity = '';
        // 移除所有拖拽指示样式
        tbody.querySelectorAll('tr').forEach(function(r) {
          r.style.borderTop = '';
        });
      });

      // 拖拽经过：添加视觉指示
      row.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // 在目标行上方显示蓝色线条
        tbody.querySelectorAll('tr').forEach(function(r) {
          r.style.borderTop = '';
        });
        row.style.borderTop = '2px solid var(--color-primary)';
      });

      // 拖拽离开：移除视觉指示
      row.addEventListener('dragleave', function() {
        row.style.borderTop = '';
      });

      // 放下：执行排序
      row.addEventListener('drop', function(e) {
        e.preventDefault();
        row.style.borderTop = '';

        if (!dragSrcRow || dragSrcRow === row) return;

        // 在 DOM 中移动行
        tbody.insertBefore(dragSrcRow, row);

        // 收集新排序数据并提交
        saveSortOrder(tbody);
      });
    });
  }

  // ==============================
  // 保存排序到后端
  // ==============================
  async function saveSortOrder(tbody) {
    var rows = tbody.querySelectorAll('tr[data-id]');
    var items = [];

    rows.forEach(function(row, index) {
      items.push({
        id: parseInt(row.getAttribute('data-id')),
        sort_order: index
      });
      // 更新前端显示的排序号
      var handle = row.querySelector('.drag-handle');
      if (handle) handle.textContent = '⠿ ' + index;
      row.setAttribute('data-sort', index);
    });

    try {
      var result = await API.put('/admin/banners/sort', { items: items });
      if (result.success) {
        Toast.success('排序已保存');
      } else {
        Toast.error('排序保存失败');
        loadBanners(); // 失败时重新加载恢复原状
      }
    } catch (e) {
      Toast.error('排序保存失败');
      loadBanners();
    }
  }

  // ==============================
  // 添加轮播图弹窗
  // ==============================
  function getFormHtml(banner) {
    var b = banner || {};
    return '<form id="banner-form">' +
      '<div class="form-group"><label class="form-label form-label--required">标题</label><input type="text" name="title" class="form-input" value="' + Utils.escapeHtml(b.title || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">副标题</label><input type="text" name="subtitle" class="form-input" value="' + Utils.escapeHtml(b.subtitle || '') + '"></div>' +
      '<div class="form-group"><label class="form-label form-label--required">图片URL</label><input type="text" name="image_url" class="form-input" value="' + Utils.escapeHtml(b.image_url || '') + '" placeholder="/images/banners/xxx.jpg 或 https://..."></div>' +
      '<div class="form-group"><label class="form-label">跳转链接</label><input type="text" name="link_url" class="form-input" value="' + Utils.escapeHtml(b.link_url || '') + '" placeholder="可选"></div>' +
      '<div class="form-group"><label class="form-label">排序</label><input type="number" name="sort_order" class="form-input" value="' + (b.sort_order || 0) + '"></div>' +
      '<div class="form-group"><label class="form-label">状态</label><select name="status" class="form-input"><option value="active"' + (b.status !== 'inactive' ? ' selected' : '') + '>启用</option><option value="inactive"' + (b.status === 'inactive' ? ' selected' : '') + '>禁用</option></select></div>' +
    '</form>';
  }

  window.showAddModal = function() {
    Modal.show({
      title: '添加轮播图',
      content: getFormHtml(),
      confirmText: '添加',
      onConfirm: async function() {
        var data = Form.getData(document.getElementById('banner-form'));
        if (!data.title || !data.image_url) {
          Toast.error('标题和图片为必填项');
          return;
        }
        try {
          var result = await API.post('/admin/banners', data);
          if (result.success) {
            Toast.success('轮播图添加成功');
            loadBanners();
          } else {
            Toast.error(result.error?.message || '添加失败');
          }
        } catch (e) {
          Toast.error(e.message);
        }
      }
    });
  };

  // ==============================
  // 编辑轮播图弹窗
  // ==============================
  window.showEditModal = function(banner) {
    Modal.show({
      title: '编辑轮播图',
      content: getFormHtml(banner),
      confirmText: '保存',
      onConfirm: async function() {
        var data = Form.getData(document.getElementById('banner-form'));
        try {
          var result = await API.put('/admin/banners/' + banner.id, data);
          if (result.success) {
            Toast.success('轮播图更新成功');
            loadBanners();
          } else {
            Toast.error(result.error?.message || '更新失败');
          }
        } catch (e) {
          Toast.error(e.message);
        }
      }
    });
  };

  // ==============================
  // 删除轮播图
  // ==============================
  window.deleteBanner = function(id) {
    Modal.confirm('确定要删除该轮播图吗？', async function() {
      try {
        var result = await API.del('/admin/banners/' + id);
        if (result.success) {
          Toast.success('轮播图删除成功');
          loadBanners();
        } else {
          Toast.error(result.error?.message || '删除失败');
        }
      } catch (e) {
        Toast.error(e.message);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();
