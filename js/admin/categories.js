// ========================================
// 文件说明：分类管理脚本（含拖拽排序）
// 文件路径：js/admin/categories.js
// 功能：分类 CRUD + HTML5 Drag & Drop 排序
// ========================================

(function() {
  'use strict';

  /** 拖拽状态变量 */
  var dragSrcRow = null;

  function init() {
    if (!Admin.init()) return;
    loadCategories();
  }

  // ==============================
  // 加载分类列表
  // ==============================
  async function loadCategories() {
    try {
      var result = await API.get('/admin/categories');
      if (result.success) {
        renderCategories(result.data);
      }
    } catch (e) {
      Toast.error('加载分类失败');
    }
  }

  // ==============================
  // 渲染分类表格（含拖拽属性）
  // ==============================
  function renderCategories(categories) {
    var tbody = document.getElementById('categories-tbody');

    if (!categories || categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">暂无分类</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map(function(c) {
      return '<tr draggable="true" data-id="' + c.id + '" data-sort="' + c.sort_order + '">' +
        '<td class="drag-handle" title="拖拽排序" style="cursor:grab;">⠿ ' + c.sort_order + '</td>' +
        '<td>' + Utils.escapeHtml(c.name) + '</td>' +
        '<td><code>' + Utils.escapeHtml(c.slug) + '</code></td>' +
        '<td>' + Utils.escapeHtml(Utils.truncate(c.description || '-', 30)) + '</td>' +
        '<td>' + (c.article_count || 0) + '</td>' +
        '<td class="actions">' +
          '<button onclick="showEditModal(' + JSON.stringify(c).replace(/"/g, '&quot;') + ')">编辑</button>' +
          '<button class="btn-danger-text" onclick="deleteCategory(' + c.id + ',' + (c.article_count || 0) + ')">删除</button>' +
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
        tbody.querySelectorAll('tr').forEach(function(r) {
          r.style.borderTop = '';
        });
      });

      // 拖拽经过：添加视觉指示
      row.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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
      var result = await API.put('/admin/categories/sort', { items: items });
      if (result.success) {
        Toast.success('排序已保存');
      } else {
        Toast.error('排序保存失败');
        loadCategories();
      }
    } catch (e) {
      Toast.error('排序保存失败');
      loadCategories();
    }
  }

  // ==============================
  // 添加分类弹窗
  // ==============================
  window.showAddModal = function() {
    Modal.show({
      title: '添加分类',
      content: '<form id="category-form">' +
        '<div class="form-group"><label class="form-label form-label--required">分类名称</label><input type="text" name="name" class="form-input" placeholder="例: 村内新闻"></div>' +
        '<div class="form-group"><label class="form-label form-label--required">别名 (slug)</label><input type="text" name="slug" class="form-input" placeholder="例: village-news"></div>' +
        '<div class="form-group"><label class="form-label">描述</label><textarea name="description" class="form-input form-textarea" placeholder="分类描述"></textarea></div>' +
        '<div class="form-group"><label class="form-label">排序</label><input type="number" name="sort_order" class="form-input" value="0" placeholder="数字越小越靠前"></div>' +
      '</form>',
      confirmText: '添加',
      onConfirm: async function() {
        var data = Form.getData(document.getElementById('category-form'));
        if (!data.name || !data.slug) {
          Toast.error('名称和别名为必填项');
          return;
        }
        try {
          var result = await API.post('/admin/categories', data);
          if (result.success) {
            Toast.success('分类添加成功');
            loadCategories();
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
  // 编辑分类弹窗
  // ==============================
  window.showEditModal = function(category) {
    Modal.show({
      title: '编辑分类',
      content: '<form id="category-form">' +
        '<div class="form-group"><label class="form-label form-label--required">分类名称</label><input type="text" name="name" class="form-input" value="' + Utils.escapeHtml(category.name) + '"></div>' +
        '<div class="form-group"><label class="form-label form-label--required">别名 (slug)</label><input type="text" name="slug" class="form-input" value="' + Utils.escapeHtml(category.slug) + '"></div>' +
        '<div class="form-group"><label class="form-label">描述</label><textarea name="description" class="form-input form-textarea">' + Utils.escapeHtml(category.description || '') + '</textarea></div>' +
        '<div class="form-group"><label class="form-label">排序</label><input type="number" name="sort_order" class="form-input" value="' + category.sort_order + '"></div>' +
      '</form>',
      confirmText: '保存',
      onConfirm: async function() {
        var data = Form.getData(document.getElementById('category-form'));
        try {
          var result = await API.put('/admin/categories/' + category.id, data);
          if (result.success) {
            Toast.success('分类更新成功');
            loadCategories();
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
  // 删除分类（有文章时不允许删除）
  // ==============================
  window.deleteCategory = function(id, articleCount) {
    if (articleCount > 0) {
      Toast.error('该分类下有 ' + articleCount + ' 篇文章，无法删除');
      return;
    }

    Modal.confirm('确定要删除该分类吗？', async function() {
      try {
        var result = await API.del('/admin/categories/' + id);
        if (result.success) {
          Toast.success('分类删除成功');
          loadCategories();
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
