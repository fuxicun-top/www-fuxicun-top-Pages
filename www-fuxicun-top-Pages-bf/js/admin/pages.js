// ========================================
// 文件说明：页面管理页脚本
// 文件路径：js/admin/pages.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!Admin.init()) return;
    loadPages();
  }

  async function loadPages() {
    var tbody = document.getElementById('pages-tbody');
    try {
      var result = await API.get('/admin/pages');
      if (result.success) {
        renderPages(result.data);
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">加载失败</td></tr>';
    }
  }

  function renderPages(pages) {
    var tbody = document.getElementById('pages-tbody');
    if (!pages || pages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">暂无自定义页面</td></tr>';
      return;
    }

    tbody.innerHTML = pages.map(function(page) {
      var date = Utils.formatDate(page.updated_at);
      return '<tr>' +
        '<td><strong>' + Utils.escapeHtml(page.title) + '</strong></td>' +
        '<td><code>' + Utils.escapeHtml(page.slug) + '</code></td>' +
        '<td>' + (page.status === 'published' ? '<span style="color:var(--color-success);">已发布</span>' : '<span style="color:var(--color-text-secondary);">草稿</span>') + '</td>' +
        '<td><a href="/p/' + Utils.escapeHtml(page.slug) + '" target="_blank" style="color:var(--color-primary);">/p/' + Utils.escapeHtml(page.slug) + '</a></td>' +
        '<td>' + date + '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline" onclick="PagesPage.editPage(' + page.id + ')">编辑</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="PagesPage.deletePage(' + page.id + ', \'' + Utils.escapeHtml(page.title).replace(/'/g, "\\'") + '\')">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function showAddModal() {
    showPageModal(null);
  }

  function editPage(id) {
    API.get('/admin/pages').then(function(result) {
      if (result.success) {
        var page = result.data.find(function(p) { return p.id === id; });
        if (page) showPageModal(page);
      }
    });
  }

  function showPageModal(page) {
    var isEdit = !!page;
    var html = '<div style="display:flex;flex-direction:column;gap:16px;">' +
      '<div class="form-group"><label class="form-label">页面标题 *</label><input type="text" class="form-input" id="page-title" value="' + (page ? Utils.escapeHtml(page.title) : '') + '" placeholder="如：村规民约"></div>' +
      '<div class="form-group"><label class="form-label">Slug（URL 标识）*</label><input type="text" class="form-input" id="page-slug" value="' + (page ? Utils.escapeHtml(page.slug) : '') + '" placeholder="如：village-rules（仅英文、数字、连字符）"' + (isEdit ? ' readonly' : '') + '></div>' +
      '<div class="form-group"><label class="form-label">页面内容（Markdown）</label><textarea class="form-input form-textarea" id="page-content" rows="10" placeholder="支持 Markdown 格式">' + (page ? Utils.escapeHtml(page.content || '') : '') + '</textarea></div>' +
      '<div class="form-group"><label class="form-label">封面图 URL</label><input type="text" class="form-input" id="page-cover" value="' + (page ? Utils.escapeHtml(page.cover_image || '') : '') + '"></div>' +
      '<div class="form-group"><label class="form-label">状态</label><select class="form-input" id="page-status"><option value="published" ' + (!page || page.status === 'published' ? 'selected' : '') + '>已发布</option><option value="draft" ' + (page && page.status === 'draft' ? 'selected' : '') + '>草稿</option></select></div>' +
    '</div>';

    Modal.show({
      title: isEdit ? '编辑页面' : '新建页面',
      content: html,
      confirmText: isEdit ? '保存' : '创建',
      showCancel: true,
      contentWidth: '600px',
      onConfirm: function() {
        var title = document.getElementById('page-title').value.trim();
        var slug = document.getElementById('page-slug').value.trim();
        var content = document.getElementById('page-content').value;
        var cover_image = document.getElementById('page-cover').value.trim();
        var status = document.getElementById('page-status').value;

        if (!title || !slug) {
          Toast.warning('请填写标题和 slug');
          return;
        }

        if (!/^[a-z0-9\-]+$/.test(slug)) {
          Toast.warning('slug 只能包含小写字母、数字和连字符');
          return;
        }

        var data = { title: title, slug: slug, content: content, cover_image: cover_image, status: status };

        var promise = isEdit
          ? API.put('/admin/pages/' + page.id, data)
          : API.post('/admin/pages', data);

        promise.then(function(result) {
          if (result.success) {
            Toast.success(isEdit ? '更新成功' : '创建成功');
            loadPages();
          } else {
            Toast.error(result.error?.message || '操作失败');
          }
        }).catch(function(e) {
          Toast.error('操作失败: ' + e.message);
        });
      }
    });
  }

  function deletePage(id, title) {
    Modal.show({
      title: '删除页面',
      content: '<p>确定要删除页面「' + title + '」吗？此操作不可恢复。</p>',
      confirmText: '删除',
      showCancel: true,
      onConfirm: async function() {
        try {
          var result = await API.delete('/admin/pages/' + id);
          if (result.success) {
            Toast.success('删除成功');
            loadPages();
          } else {
            Toast.error(result.error?.message || '删除失败');
          }
        } catch (e) {
          Toast.error('删除失败: ' + e.message);
        }
      }
    });
  }

  window.PagesPage = {
    showAddModal: showAddModal,
    editPage: editPage,
    deletePage: deletePage
  };

  document.addEventListener('DOMContentLoaded', init);
})();
