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

  // 系统页面 slug 列表
  var SYSTEM_SLUGS = ['about', 'culture', 'scenery', 'ethnic', 'travel', 'news', 'articles'];

  function renderPages(pages) {
    var tbody = document.getElementById('pages-tbody');
    if (!pages || pages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">暂无页面</td></tr>';
      return;
    }

    tbody.innerHTML = pages.map(function(page) {
      var isSystem = SYSTEM_SLUGS.indexOf(page.slug) !== -1;
      var date = Utils.formatDate(page.updated_at);
      var pageUrl = isSystem ? '/' + page.slug + '.html' : '/p/' + page.slug;
      var typeTag = isSystem
        ? '<span style="background:var(--color-primary-bg);color:var(--color-primary);padding:2px 8px;border-radius:4px;font-size:11px;">系统</span>'
        : '<span style="background:var(--color-bg-hover);color:var(--color-text-secondary);padding:2px 8px;border-radius:4px;font-size:11px;">自定义</span>';
      var actions = isSystem
        ? '<button class="btn btn-sm btn-outline" onclick="PagesPage.editPage(' + page.id + ')">编辑</button>'
        : '<button class="btn btn-sm btn-outline" onclick="PagesPage.editPage(' + page.id + ')">编辑</button> <button class="btn btn-sm btn-danger" onclick="PagesPage.deletePage(' + page.id + ', \'' + Utils.escapeHtml(page.title).replace(/'/g, "\\'") + '\')">删除</button>';

      return '<tr>' +
        '<td>' + typeTag + '</td>' +
        '<td><strong>' + Utils.escapeHtml(page.title) + '</strong></td>' +
        '<td><code>' + Utils.escapeHtml(page.slug) + '</code></td>' +
        '<td>' + (page.status === 'published' ? '<span style="color:var(--color-success);">已发布</span>' : '<span style="color:var(--color-text-secondary);">草稿</span>') + '</td>' +
        '<td><a href="' + pageUrl + '" target="_blank" style="color:var(--color-primary);">' + pageUrl + '</a></td>' +
        '<td>' + date + '</td>' +
        '<td>' + actions + '</td>' +
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
        if (page) {
          if (SYSTEM_SLUGS.indexOf(page.slug) !== -1) {
            showSectionEditor(page);
          } else {
            showPageModal(page);
          }
        }
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
            Toast.error(result.message || '操作失败');
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
            Toast.error(result.message || '删除失败');
          }
        } catch (e) {
          Toast.error('删除失败: ' + e.message);
        }
      }
    });
  }

  // 系统页面板块编辑器
  async function showSectionEditor(page) {
    try {
      var result = await API.get('/admin/page-sections?slug=' + page.slug);
      var sections = result.success ? result.data : [];

      if (sections.length === 0) {
        Modal.show({
          title: '编辑：' + page.title,
          content: '<p style="text-align:center;padding:24px;color:var(--color-text-secondary);">该页面暂无可编辑板块</p>',
          showConfirm: false,
          cancelText: '关闭'
        });
        return;
      }

      // 构建表单：每个板块一个区块
      var html = '<div style="max-height:65vh;overflow-y:auto;padding-right:4px;">';
      html += '<p style="margin-bottom:20px;color:var(--color-text-secondary);font-size:14px;">编辑「' + Utils.escapeHtml(page.title) + '」页面的各板块内容，修改后前端页面实时生效。</p>';

      sections.forEach(function(section, index) {
        var isFirst = index === 0;
        html += '<div class="section-block" data-id="' + section.id + '" style="' + (isFirst ? '' : 'margin-top:24px;padding-top:24px;border-top:1px solid var(--color-border);') + '">' +
          '<div class="form-group">' +
            '<label class="form-label">板块标题</label>' +
            '<input type="text" class="form-input section-title" data-id="' + section.id + '" value="' + Utils.escapeHtml(section.title || '') + '">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">板块内容 <span style="font-weight:normal;color:var(--color-text-secondary);">（支持 HTML 格式）</span></label>' +
            '<textarea class="form-input form-textarea section-content" data-id="' + section.id + '" rows="8" style="font-family:var(--font-family-mono);font-size:13px;line-height:1.6;">' + Utils.escapeHtml(section.content || '') + '</textarea>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--color-text-secondary);">板块标识：<code>' + Utils.escapeHtml(section.section_key) + '</code></div>' +
        '</div>';
      });

      html += '</div>';

      Modal.show({
        title: '编辑：' + page.title,
        content: html,
        confirmText: '保存全部',
        showCancel: true,
        contentWidth: '720px',
        onConfirm: function() { saveSections(page.slug); }
      });
    } catch (e) {
      Toast.error('加载板块失败');
    }
  }

  async function saveSections(slug) {
    var blocks = document.querySelectorAll('.section-block');
    var hasError = false;
    var savedCount = 0;

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var id = block.dataset.id;
      var titleInput = block.querySelector('.section-title');
      var contentTextarea = block.querySelector('.section-content');
      var title = titleInput ? titleInput.value : '';
      var content = contentTextarea ? contentTextarea.value : '';

      try {
        var result = await API.put('/admin/page-sections/' + id, { title: title, content: content });
        if (!result.success) {
          Toast.error('保存失败: ' + result.message);
          hasError = true;
          break;
        }
        savedCount++;
      } catch (e) {
        Toast.error('保存失败: ' + e.message);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      Toast.success('已保存 ' + savedCount + ' 个板块');
    }
  }

  window.PagesPage = {
    showAddModal: showAddModal,
    editPage: editPage,
    deletePage: deletePage
  };

  document.addEventListener('DOMContentLoaded', init);
})();
