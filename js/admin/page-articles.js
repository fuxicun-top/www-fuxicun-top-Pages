// ========================================
// 文件说明：页面文章管理脚本（每条目独立模式）
// 文件路径：js/admin/page-articles.js
// ========================================

var PageArticles = (function() {
  'use strict';

  var currentSlug = 'about';
  var currentData = null;

  var MODE_OPTIONS = [
    { value: 'latest', label: '最新发布' },
    { value: 'likes', label: '最多点赞' },
    { value: 'views', label: '最多浏览' },
    { value: 'manual', label: '管理员自定义' }
  ];

  function init() {
    if (!Admin.init()) return;

    document.querySelectorAll('.page-tab').forEach(function(tab) {
      tab.onclick = function() {
        document.querySelectorAll('.page-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        currentSlug = this.dataset.slug;
        loadPageArticles();
      };
    });

    loadPageArticles();
  }

  async function loadPageArticles() {
    try {
      var result = await API.get('/admin/page-articles?slug=' + currentSlug);
      if (result.success) {
        currentData = result.data;
        renderArticleList(currentData.articles);
      }
    } catch (e) {
      Toast.error('加载失败');
    }
  }

  function renderArticleList(articles) {
    var container = document.getElementById('article-list');
    if (!articles || articles.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-secondary);text-align:center;padding:24px;">暂无文章条目，点击下方按钮添加</p>';
      return;
    }

    container.innerHTML = articles.map(function(article, index) {
      var modeSelect = '<select class="form-input mode-select" data-id="' + article.id + '" onchange="PageArticles.changeMode(' + article.id + ', this.value)" style="width:auto;min-width:120px;">';
      MODE_OPTIONS.forEach(function(opt) {
        modeSelect += '<option value="' + opt.value + '"' + (article.mode === opt.value ? ' selected' : '') + '>' + opt.label + '</option>';
      });
      modeSelect += '</select>';

      // 手动模式下显示文章选择下拉框
      var articleSelect = '';
      if (article.mode === 'manual') {
        articleSelect = buildArticleSelector(article.id, article.article_id);
      }

      // 显示当前文章信息
      var info = '';
      if (article.mode === 'manual' && article.title) {
        info = '<span class="article-info">' + Utils.escapeHtml(article.title) + '</span>';
      } else if (article.mode !== 'manual') {
        var modeLabel = MODE_OPTIONS.find(function(o) { return o.value === article.mode; });
        info = '<span class="article-info article-info--auto">' + (modeLabel ? modeLabel.label : article.mode) + '</span>';
      }

      return '<div class="article-slot" data-id="' + article.id + '">' +
        '<div class="article-slot__header">' +
          '<span class="article-slot__num">#' + (index + 1) + '</span>' +
          modeSelect +
          info +
          '<button class="article-slot__delete" onclick="PageArticles.removeArticle(' + article.id + ')" title="删除">✕</button>' +
        '</div>' +
        '<div class="article-slot__detail" id="detail-' + article.id + '">' +
          articleSelect +
        '</div>' +
      '</div>';
    }).join('');
  }

  function buildArticleSelector(slotId, selectedId) {
    if (!currentData || !currentData.allArticles) return '';
    var html = '<select class="form-input article-select" data-slot="' + slotId + '" onchange="PageArticles.selectArticle(' + slotId + ', this.value)" style="margin-top:8px;">';
    html += '<option value="">-- 选择文章 --</option>';
    currentData.allArticles.forEach(function(a) {
      html += '<option value="' + a.id + '"' + (a.id === selectedId ? ' selected' : '') + '>' + Utils.escapeHtml(a.title) + ' [' + Utils.escapeHtml(a.category_name || '') + ']</option>';
    });
    html += '</select>';
    return html;
  }

  function showAddModal() {
    // 先获取该分类的文章列表
    API.get('/admin/page-articles?slug=' + currentSlug).then(function(result) {
      var allArticles = result.success ? result.data.allArticles : [];

      var articleOptions = allArticles.map(function(a) {
        return '<option value="' + a.id + '">' + Utils.escapeHtml(a.title) + '</option>';
      }).join('');

      var html = '<p style="margin-bottom:16px;color:var(--color-text-secondary);font-size:14px;">选择新条目的默认显示方式：</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<button class="btn btn-outline" onclick="PageArticles.addSlot(\'latest\')" style="text-align:left;">🕐 最新发布 — 自动显示该分类最新文章</button>' +
          '<button class="btn btn-outline" onclick="PageArticles.addSlot(\'likes\')" style="text-align:left;">👍 最多点赞 — 自动显示该分类最热文章</button>' +
          '<button class="btn btn-outline" onclick="PageArticles.addSlot(\'views\')" style="text-align:left;">👁️ 最多浏览 — 自动显示该分类最多浏览文章</button>' +
          '<div style="border:1px solid var(--color-border);border-radius:var(--radius-base);padding:12px;">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
              '<span style="font-weight:600;">📝 管理员自定义</span>' +
            '</div>' +
            '<select class="form-input" id="manual-article-select" style="width:100%;">' +
              '<option value="">-- 选择文章 --</option>' +
              articleOptions +
            '</select>' +
            '<button class="btn btn-primary btn-sm" style="margin-top:8px;width:100%;" onclick="PageArticles.addManualSlot()">添加自定义文章</button>' +
          '</div>' +
        '</div>';

      Modal.show({
        title: '添加文章条目',
        content: html,
        showConfirm: false,
        cancelText: '取消'
      });
    });
  }

  async function addSlot(mode) {
    Modal.close();
    try {
      var result = await API.post('/admin/page-articles', {
        page_slug: currentSlug,
        mode: mode || 'latest'
      });
      if (result.success) {
        Toast.success('添加成功');
        loadPageArticles();
      } else {
        Toast.error(result.message || '添加失败');
      }
    } catch (e) {
      Toast.error('添加失败');
    }
  }

  async function addManualSlot() {
    var select = document.getElementById('manual-article-select');
    var articleId = select ? select.value : '';
    if (!articleId) {
      Toast.warning('请先选择一篇文章');
      return;
    }
    Modal.close();
    try {
      var result = await API.post('/admin/page-articles', {
        page_slug: currentSlug,
        mode: 'manual',
        article_id: parseInt(articleId)
      });
      if (result.success) {
        Toast.success('添加成功');
        loadPageArticles();
      } else {
        Toast.error(result.message || '添加失败');
      }
    } catch (e) {
      Toast.error('添加失败');
    }
  }

  async function changeMode(slotId, mode) {
    // 手动模式：显示文章选择器，不立即调用 API
    if (mode === 'manual') {
      var detailEl = document.getElementById('detail-' + slotId);
      if (detailEl) {
        detailEl.innerHTML = buildArticleSelector(slotId, null);
      }
      return;
    }
    // 自动模式：直接更新
    try {
      var result = await API.put('/admin/page-articles/' + slotId + '/mode', { mode: mode });
      if (result.success) {
        loadPageArticles();
      } else {
        Toast.error(result.message || '更新失败');
      }
    } catch (e) {
      Toast.error('更新失败');
    }
  }

  async function selectArticle(slotId, articleId) {
    if (!articleId) return;
    try {
      var result = await API.put('/admin/page-articles/' + slotId + '/mode', { mode: 'manual', article_id: parseInt(articleId) });
      if (result.success) {
        Toast.success('设置成功');
        loadPageArticles();
      } else {
        Toast.error(result.message || '设置失败');
      }
    } catch (e) {
      Toast.error('设置失败');
    }
  }

  async function removeArticle(id) {
    if (!confirm('确定删除此条目？')) return;
    try {
      var result = await API.delete('/admin/page-articles/' + id);
      if (result.success) {
        Toast.success('删除成功');
        loadPageArticles();
      } else {
        Toast.error(result.message || '删除失败');
      }
    } catch (e) {
      Toast.error('删除失败');
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    showAddModal: showAddModal,
    addSlot: addSlot,
    addManualSlot: addManualSlot,
    changeMode: changeMode,
    selectArticle: selectArticle,
    removeArticle: removeArticle
  };
})();
