// ========================================
// 文件说明：首页配置页面脚本（模块化管理）
// 文件路径：js/admin/homepage.js
// ========================================

(function() {
  'use strict';

  var modulesList = [];
  var articlesList = [];
  var bannersList = [];
  var dragState = { dragging: null };

  var TYPE_META = {
    banner:   { icon: '🖼️', label: '轮播图' },
    intro:    { icon: '📖', label: '走进福溪村' },
    articles: { icon: '📰', label: '文章列表' },
    gallery:  { icon: '🖼️', label: '图片画廊' },
    travel:   { icon: '🗺️', label: '旅游指南' },
    custom:   { icon: '✏️', label: '自定义内容' }
  };

  function init() {
    if (!Admin.init()) return;
    loadModules();
  }

  async function loadModules() {
    try {
      var result = await API.get('/admin/home-modules');
      if (!result.success) {
        Toast.error('加载配置失败');
        return;
      }
      modulesList = result.data.modules || [];
      articlesList = result.data.articles || [];

      // 同时加载轮播图列表
      try {
        var bannerRes = await API.get('/admin/banners');
        if (bannerRes.success) bannersList = bannerRes.data || [];
      } catch (e) { /* 忽略 */ }

      renderModuleList();
    } catch (e) {
      Toast.error('加载配置失败: ' + e.message);
    }
  }

  function renderModuleList() {
    var container = document.getElementById('module-list');
    if (!container) return;

    if (modulesList.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-placeholder);padding:40px;">暂无模块，点击"添加模块"开始配置首页</p>';
      return;
    }

    container.innerHTML = modulesList.map(function(m) {
      var meta = TYPE_META[m.type] || { icon: '📦', label: m.type };
      var isActive = m.status === 'active';
      var desc = getModuleDesc(m);
      var isBanner = m.type === 'banner';
      return '<div class="module-item' + (isBanner ? ' module-item--fixed' : '') + '" ' + (isBanner ? '' : 'draggable="true"') + ' data-id="' + m.id + '">' +
        '<span class="module-item__drag">' + (isBanner ? '📌' : '⠿') + '</span>' +
        '<span class="module-item__icon">' + meta.icon + '</span>' +
        '<div class="module-item__info">' +
          '<div class="module-item__title">' + Utils.escapeHtml(m.title) + '</div>' +
          '<div class="module-item__subtitle">' + Utils.escapeHtml(meta.label) + (desc ? ' · ' + Utils.escapeHtml(desc) : '') + (isBanner ? ' · 固定首位' : '') + '</div>' +
        '</div>' +
        '<span class="module-item__badge' + (isActive ? '' : ' module-item__badge--inactive') + '">' +
          (isActive ? '显示' : '隐藏') +
        '</span>' +
        '<div class="module-item__actions">' +
          '<button class="module-item__btn" onclick="HomepageConfig.toggleStatus(' + m.id + ',' + !isActive + ')" title="' + (isActive ? '隐藏' : '显示') + '">' +
            (isActive ? '👁️' : '👁️‍🗨️') +
          '</button>' +
          '<button class="module-item__btn" onclick="HomepageConfig.editModule(' + m.id + ')" title="编辑">✏️</button>' +
          (m.protected ? '' : '<button class="module-item__btn module-item__btn--danger" onclick="HomepageConfig.deleteModule(' + m.id + ')" title="删除">🗑️</button>') +
        '</div>' +
      '</div>';
    }).join('');

    initDragSort();
  }

  function getModuleDesc(m) {
    var config = m.config || {};
    switch (m.type) {
      case 'articles':
        var count = config.count || 5;
        var modeLabel = config.mode === 'auto_likes' ? '按点赞' : config.mode === 'auto_latest' ? '按最新' : '手动';
        return count + '篇 · ' + modeLabel;
      case 'banner':
        return bannersList.length + '张轮播图';
      case 'gallery':
        return '媒体库图片';
      case 'travel':
        return (config.cards || []).length + '张卡片';
      case 'intro':
        return (config.cards || []).length + '张卡片';
      case 'custom':
        return 'HTML内容';
      default:
        return '';
    }
  }

  // ==============================
  // 拖拽排序
  // ==============================
  function initDragSort() {
    var items = document.querySelectorAll('.module-item[draggable="true"]');
    items.forEach(function(item) {
      item.addEventListener('dragstart', function(e) {
        dragState.dragging = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', function() {
        item.classList.remove('dragging');
        dragState.dragging = null;
        saveSortOrder();
      });
      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (dragState.dragging && dragState.dragging !== item) {
          var container = document.getElementById('module-list');
          var draggingIdx = Array.from(container.children).indexOf(dragState.dragging);
          var overIdx = Array.from(container.children).indexOf(item);
          // 禁止拖到固定模块（轮播图）前面
          var fixedItems = container.querySelectorAll('.module-item--fixed');
          var firstDraggableIdx = fixedItems.length;
          if (draggingIdx < overIdx) {
            container.insertBefore(dragState.dragging, item.nextSibling);
          } else if (overIdx >= firstDraggableIdx) {
            container.insertBefore(dragState.dragging, item);
          }
        }
      });
    });
  }

  async function saveSortOrder() {
    var items = document.querySelectorAll('.module-item');
    var ids = Array.from(items).map(function(el) { return parseInt(el.dataset.id); });
    try {
      await API.put('/admin/home-modules/sort', { ids: ids });
      var sorted = [];
      ids.forEach(function(id) {
        var found = modulesList.find(function(m) { return m.id === id; });
        if (found) sorted.push(found);
      });
      modulesList = sorted;
    } catch (e) {
      Toast.error('排序保存失败');
    }
  }

  // ==============================
  // 状态切换 / 删除
  // ==============================
  async function toggleStatus(id, newStatus) {
    try {
      var result = await API.put('/admin/home-modules/' + id, { status: newStatus ? 'active' : 'inactive' });
      if (result.success) {
        var module = modulesList.find(function(m) { return m.id === id; });
        if (module) module.status = newStatus ? 'active' : 'inactive';
        renderModuleList();
        Toast.success(newStatus ? '模块已显示' : '模块已隐藏');
      }
    } catch (e) {
      Toast.error('操作失败');
    }
  }

  async function deleteModule(id) {
    if (!confirm('确定删除此模块？')) return;
    try {
      var result = await API.delete('/admin/home-modules/' + id);
      if (result.success) {
        modulesList = modulesList.filter(function(m) { return m.id !== id; });
        renderModuleList();
        Toast.success('模块已删除');
      }
    } catch (e) {
      Toast.error('删除失败');
    }
  }

  // ==============================
  // 添加模块
  // ==============================
  function showAddModal() {
    var html = '<div class="modal-overlay" onclick="HomepageConfig.closeModal(event)">' +
      '<div class="modal" onclick="event.stopPropagation()">' +
        '<div class="modal__title">添加模块</div>' +
        '<div class="type-grid">' +
          Object.keys(TYPE_META).map(function(type) {
            var meta = TYPE_META[type];
            return '<div class="type-option" data-type="' + type + '" onclick="HomepageConfig.selectType(this)">' +
              '<div class="type-option__icon">' + meta.icon + '</div>' +
              '<div class="type-option__label">' + meta.label + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">模块标题</label>' +
          '<input type="text" class="form-input" id="add-title" placeholder="如：精选推荐">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">副标题（可选）</label>' +
          '<input type="text" class="form-input" id="add-subtitle" placeholder="如：按点赞量排行">' +
        '</div>' +
        '<div class="modal__actions">' +
          '<button class="btn" onclick="HomepageConfig.closeModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="HomepageConfig.confirmAdd()">添加</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function selectType(el) {
    document.querySelectorAll('.type-option').forEach(function(opt) { opt.classList.remove('selected'); });
    el.classList.add('selected');
  }

  function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    var modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
  }

  async function confirmAdd() {
    var selected = document.querySelector('.type-option.selected');
    if (!selected) { Toast.warning('请选择模块类型'); return; }
    var type = selected.dataset.type;
    var title = document.getElementById('add-title').value.trim();
    var subtitle = document.getElementById('add-subtitle').value.trim();
    if (!title) { Toast.warning('请输入模块标题'); return; }

    var defaultConfig = {};
    if (type === 'articles') {
      defaultConfig = { mode: 'auto_likes', count: 4, articles: [{ sort: 'likes' }, { sort: 'likes' }, { sort: 'likes' }, { sort: 'likes' }] };
    } else if (type === 'intro') {
      defaultConfig = { description: '', cards: [] };
    } else if (type === 'travel') {
      defaultConfig = { cards: [] };
    } else if (type === 'custom') {
      defaultConfig = { content: '' };
    }

    try {
      var result = await API.post('/admin/home-modules', {
        type: type, title: title, subtitle: subtitle || null, config: defaultConfig
      });
      if (result.success) {
        Toast.success('模块已添加');
        closeModal();
        await loadModules();
      }
    } catch (e) {
      Toast.error('添加失败');
    }
  }

  // ==============================
  // 编辑模块
  // ==============================
  function editModule(id) {
    var module = modulesList.find(function(m) { return m.id === id; });
    if (!module) return;

    var config = module.config || {};
    var formHtml = buildEditForm(module.type, config);

    var html = '<div class="modal-overlay" onclick="HomepageConfig.closeModal(event)">' +
      '<div class="modal" onclick="event.stopPropagation()">' +
        '<div class="modal__title">编辑模块：' + Utils.escapeHtml(module.title) + '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">模块标题</label>' +
          '<input type="text" class="form-input" id="edit-title" value="' + Utils.escapeHtml(module.title) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">副标题</label>' +
          '<input type="text" class="form-input" id="edit-subtitle" value="' + Utils.escapeHtml(module.subtitle || '') + '">' +
        '</div>' +
        formHtml +
        '<div class="modal__actions">' +
          '<button class="btn" onclick="HomepageConfig.closeModal()">取消</button>' +
          '<button class="btn btn-primary" onclick="HomepageConfig.confirmEdit(' + id + ',\'' + module.type + '\')">保存</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function buildEditForm(type, config) {
    switch (type) {
      case 'banner':
        return buildBannerForm();
      case 'intro':
        return buildIntroForm(config);
      case 'articles':
        return buildArticlesForm(config);
      case 'gallery':
        return '<p style="color:var(--color-text-secondary);font-size:13px;">图片画廊自动从媒体库获取最新图片，无需额外配置。</p>';
      case 'travel':
        return buildTravelForm(config);
      case 'custom':
        return '<div class="form-group">' +
          '<label class="form-label">自定义 HTML 内容</label>' +
          '<textarea class="form-input form-textarea" id="edit-custom-content" rows="8">' + Utils.escapeHtml(config.content || '') + '</textarea>' +
        '</div>';
      default:
        return '';
    }
  }

  // ==============================
  // 轮播图编辑表单（完整管理界面）
  // ==============================
  function buildBannerForm() {
    var html = '<div class="form-group">' +
      '<label class="form-label">轮播图列表</label>' +
      '<div id="banner-manage-list">' +
        bannersList.map(function(b, i) { return buildBannerItemRow(b, i); }).join('') +
      '</div>' +
      '<button class="btn" style="margin-top:8px;" onclick="HomepageConfig.addBannerItem()">+ 添加轮播图</button>' +
    '</div>';
    return html;
  }

  function buildBannerItemRow(banner, index) {
    var b = banner || {};
    return '<div class="banner-manage-row" style="display:flex;flex-direction:column;gap:6px;padding:12px;background:var(--color-bg-hover);border-radius:8px;margin-bottom:8px;">' +
      '<div style="display:flex;gap:8px;align-items:flex-start;">' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:6px;">' +
          '<input type="text" class="form-input banner-field" data-field="title" placeholder="标题" value="' + Utils.escapeHtml(b.title || '') + '">' +
          '<input type="text" class="form-input banner-field" data-field="subtitle" placeholder="副标题" value="' + Utils.escapeHtml(b.subtitle || '') + '">' +
          '<input type="text" class="form-input banner-field" data-field="image_url" placeholder="图片URL" value="' + Utils.escapeHtml(b.image_url || '') + '">' +
          '<div style="display:flex;gap:8px;">' +
            '<input type="text" class="form-input banner-field" data-field="link_url" placeholder="链接URL（可选）" value="' + Utils.escapeHtml(b.link_url || '') + '" style="flex:1;">' +
            '<input type="number" class="form-input banner-field" data-field="sort_order" placeholder="排序" value="' + (b.sort_order || index + 1) + '" style="width:80px;">' +
          '</div>' +
        '</div>' +
        (b.image_url ? '<img src="' + Utils.escapeHtml(b.image_url) + '" style="width:120px;height:75px;object-fit:cover;border-radius:4px;flex-shrink:0;" alt="">' : '') +
        '<button class="article-row__remove" onclick="this.closest(\'.banner-manage-row\').remove()" title="删除">✕</button>' +
      '</div>' +
      (b.id ? '<input type="hidden" class="banner-field" data-field="id" value="' + b.id + '">' : '') +
    '</div>';
  }

  function addBannerItem() {
    var container = document.getElementById('banner-manage-list');
    container.insertAdjacentHTML('beforeend', buildBannerItemRow(null, container.children.length));
  }

  async function saveBannerConfig() {
    var rows = document.querySelectorAll('#banner-manage-list .banner-manage-row');
    var banners = [];
    rows.forEach(function(row, index) {
      var fields = row.querySelectorAll('.banner-field');
      var item = { sort_order: index + 1 };
      fields.forEach(function(f) {
        var field = f.dataset.field;
        if (field === 'sort_order') {
          item[field] = parseInt(f.value) || index + 1;
        } else if (field === 'id') {
          item[field] = parseInt(f.value);
        } else {
          item[field] = f.value.trim();
        }
      });
      if (item.title && item.image_url) {
        banners.push(item);
      }
    });

    try {
      // 获取现有轮播图 ID 列表
      var existingIds = bannersList.map(function(b) { return b.id; });
      var savedIds = [];

      for (var i = 0; i < banners.length; i++) {
        var b = banners[i];
        if (b.id) {
          // 更新现有轮播图
          await API.put('/admin/banners/' + b.id, {
            title: b.title, subtitle: b.subtitle, image_url: b.image_url,
            link_url: b.link_url, sort_order: b.sort_order, status: 'active'
          });
          savedIds.push(b.id);
        } else {
          // 创建新轮播图
          var res = await API.post('/admin/banners', {
            title: b.title, subtitle: b.subtitle, image_url: b.image_url,
            link_url: b.link_url, sort_order: b.sort_order
          });
          if (res.success && res.data) savedIds.push(res.data.id);
        }
      }

      // 删除不再存在的轮播图
      for (var j = 0; j < existingIds.length; j++) {
        if (savedIds.indexOf(existingIds[j]) === -1) {
          await API.delete('/admin/banners/' + existingIds[j]);
        }
      }

      // 重新加载轮播图列表
      var bannerRes = await API.get('/admin/banners');
      if (bannerRes.success) bannersList = bannerRes.data || [];

      return true;
    } catch (e) {
      Toast.error('轮播图保存失败: ' + e.message);
      return false;
    }
  }

  // ==============================
  // 走进福溪村编辑表单
  // ==============================
  function buildIntroForm(config) {
    var desc = config.description || '';
    var cards = config.cards || [];
    var html = '<div class="form-group">' +
      '<label class="form-label">介绍文字</label>' +
      '<textarea class="form-input form-textarea" id="edit-intro-desc" rows="3">' + Utils.escapeHtml(desc) + '</textarea>' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">介绍卡片</label>' +
      '<div id="intro-cards">' +
        cards.map(function(c, i) { return buildIntroCardRow(i, c); }).join('') +
      '</div>' +
      '<button class="btn" style="margin-top:8px;" onclick="HomepageConfig.addIntroCard()">+ 添加卡片</button>' +
    '</div>';
    return html;
  }

  function buildIntroCardRow(index, card) {
    return '<div class="intro-card-row">' +
      '<input type="text" class="form-input" placeholder="图标" value="' + Utils.escapeHtml(card.icon || '') + '" style="max-width:60px;">' +
      '<input type="text" class="form-input" placeholder="标题" value="' + Utils.escapeHtml(card.title || '') + '">' +
      '<input type="text" class="form-input" placeholder="描述" value="' + Utils.escapeHtml(card.desc || '') + '">' +
      '<input type="text" class="form-input" placeholder="链接" value="' + Utils.escapeHtml(card.link || '') + '" style="max-width:120px;">' +
      '<button class="article-row__remove" onclick="this.parentElement.remove()">✕</button>' +
    '</div>';
  }

  function addIntroCard() {
    var container = document.getElementById('intro-cards');
    container.insertAdjacentHTML('beforeend', buildIntroCardRow(container.children.length, {}));
  }

  // ==============================
  // 文章列表编辑表单
  // ==============================
  function buildArticlesForm(config) {
    var mode = config.mode || 'auto_likes';
    var count = config.count || 5;
    var articles = config.articles || [];

    var html = '<div class="form-group">' +
      '<label class="form-label">显示文章数</label>' +
      '<input type="number" class="form-input" id="edit-articles-count" value="' + count + '" min="1" max="20" style="width:100px;">' +
      '<span style="font-size:12px;color:var(--color-text-secondary);margin-left:8px;">篇</span>' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">默认自动填充模式</label>' +
      '<select class="form-input" id="edit-articles-mode">' +
        '<option value="auto_likes"' + (mode === 'auto_likes' ? ' selected' : '') + '>按点赞量排行</option>' +
        '<option value="auto_latest"' + (mode === 'auto_latest' ? ' selected' : '') + '>按最新发布</option>' +
        '<option value="manual"' + (mode === 'manual' ? ' selected' : '') + '>仅显示手动指定的文章</option>' +
      '</select>' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">文章列表 <span style="font-weight:400;color:var(--color-text-secondary);font-size:12px;">（可拖拽排序，每项可指定固定文章或自动填充方式）</span></label>' +
      '<div id="edit-articles-list">' +
        articles.map(function(a, i) { return buildArticleSlotRow(i, a); }).join('') +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button class="btn" onclick="HomepageConfig.addArticleSlot(\'custom\')">+ 指定文章</button>' +
        '<button class="btn" onclick="HomepageConfig.addArticleSlot(\'likes\')">+ 自动(点赞)</button>' +
        '<button class="btn" onclick="HomepageConfig.addArticleSlot(\'latest\')">+ 自动(最新)</button>' +
      '</div>' +
    '</div>';
    return html;
  }

  function buildArticleSlotRow(index, slot) {
    if (slot.article_id) {
      // 固定文章
      var options = '<option value="">-- 选择文章 --</option>' +
        articlesList.map(function(a) {
          var label = (a.category_name ? '[' + a.category_name + '] ' : '') + a.title;
          var sel = a.id === slot.article_id ? ' selected' : '';
          return '<option value="' + a.id + '"' + sel + '>' + Utils.escapeHtml(Utils.truncate(label, 50)) + '</option>';
        }).join('');
      return '<div class="article-row" data-type="custom">' +
        '<span style="font-size:11px;color:var(--color-primary);min-width:40px;">固定</span>' +
        '<select class="form-input" data-slot-type="custom">' + options + '</select>' +
        '<button class="article-row__remove" onclick="this.parentElement.remove()">✕</button>' +
      '</div>';
    } else {
      // 自动填充
      var sortMode = slot.sort || 'likes';
      var sortLabel = sortMode === 'likes' ? '按点赞排行' : '按最新发布';
      return '<div class="article-row" data-type="auto">' +
        '<span style="font-size:11px;color:var(--color-text-secondary);min-width:40px;">自动</span>' +
        '<select class="form-input" data-slot-type="auto">' +
          '<option value="likes"' + (sortMode === 'likes' ? ' selected' : '') + '>按点赞排行</option>' +
          '<option value="latest"' + (sortMode === 'latest' ? ' selected' : '') + '>按最新发布</option>' +
        '</select>' +
        '<button class="article-row__remove" onclick="this.parentElement.remove()">✕</button>' +
      '</div>';
    }
  }

  function addArticleSlot(type) {
    var container = document.getElementById('edit-articles-list');
    var index = container.children.length;
    if (type === 'custom') {
      container.insertAdjacentHTML('beforeend', buildArticleSlotRow(index, { article_id: 0 }));
    } else {
      container.insertAdjacentHTML('beforeend', buildArticleSlotRow(index, { sort: type }));
    }
  }

  // ==============================
  // 旅游指南编辑表单
  // ==============================
  function buildTravelForm(config) {
    var cards = config.cards || [];
    var html = '<div class="form-group">' +
      '<label class="form-label">旅游信息卡片</label>' +
      '<div id="travel-cards">' +
        cards.map(function(c, i) { return buildTravelCardRow(i, c); }).join('') +
      '</div>' +
      '<button class="btn" style="margin-top:8px;" onclick="HomepageConfig.addTravelCard()">+ 添加卡片</button>' +
    '</div>';
    return html;
  }

  function buildTravelCardRow(index, card) {
    return '<div class="travel-card-row">' +
      '<input type="text" class="form-input" placeholder="图标" value="' + Utils.escapeHtml(card.icon || '') + '" style="max-width:60px;">' +
      '<input type="text" class="form-input" placeholder="标题" value="' + Utils.escapeHtml(card.title || '') + '">' +
      '<input type="text" class="form-input" placeholder="描述" value="' + Utils.escapeHtml(card.desc || '') + '">' +
      '<button class="article-row__remove" onclick="this.parentElement.remove()">✕</button>' +
    '</div>';
  }

  function addTravelCard() {
    var container = document.getElementById('travel-cards');
    container.insertAdjacentHTML('beforeend', buildTravelCardRow(container.children.length, {}));
  }

  // ==============================
  // 保存编辑
  // ==============================
  async function confirmEdit(id, type) {
    var title = document.getElementById('edit-title').value.trim();
    var subtitle = document.getElementById('edit-subtitle').value.trim();
    if (!title) { Toast.warning('请输入模块标题'); return; }

    var config = {};

    switch (type) {
      case 'banner':
        // 轮播图需要先保存轮播图的增删改，再保存模块标题
        var bannerSaved = await saveBannerConfig();
        if (!bannerSaved) return;
        config = modulesList.find(function(m) { return m.id === id; }).config || {};
        break;

      case 'intro':
        config.description = document.getElementById('edit-intro-desc').value;
        config.cards = [];
        document.querySelectorAll('#intro-cards .intro-card-row').forEach(function(row) {
          var inputs = row.querySelectorAll('input');
          config.cards.push({
            icon: inputs[0].value.trim(),
            title: inputs[1].value.trim(),
            desc: inputs[2].value.trim(),
            link: inputs[3].value.trim()
          });
        });
        break;

      case 'articles':
        config.mode = document.getElementById('edit-articles-mode').value;
        config.count = parseInt(document.getElementById('edit-articles-count').value) || 5;
        config.articles = [];
        document.querySelectorAll('#edit-articles-list .article-row').forEach(function(row) {
          var select = row.querySelector('select');
          var slotType = select.dataset.slotType;
          if (slotType === 'custom') {
            var val = select.value;
            config.articles.push({ article_id: val ? parseInt(val) : null });
          } else {
            config.articles.push({ sort: select.value });
          }
        });
        break;

      case 'travel':
        config.cards = [];
        document.querySelectorAll('#travel-cards .travel-card-row').forEach(function(row) {
          var inputs = row.querySelectorAll('input');
          config.cards.push({
            icon: inputs[0].value.trim(),
            title: inputs[1].value.trim(),
            desc: inputs[2].value.trim()
          });
        });
        break;

      case 'custom':
        config.content = document.getElementById('edit-custom-content').value;
        break;
    }

    try {
      var result = await API.put('/admin/home-modules/' + id, {
        title: title, subtitle: subtitle || null, config: config
      });
      if (result.success) {
        Toast.success('模块已更新');
        closeModal();
        await loadModules();
      }
    } catch (e) {
      Toast.error('保存失败');
    }
  }

  window.HomepageConfig = {
    showAddModal: showAddModal,
    selectType: selectType,
    closeModal: closeModal,
    confirmAdd: confirmAdd,
    editModule: editModule,
    toggleStatus: toggleStatus,
    deleteModule: deleteModule,
    addIntroCard: addIntroCard,
    addArticleSlot: addArticleSlot,
    addTravelCard: addTravelCard,
    addBannerItem: addBannerItem,
    confirmEdit: confirmEdit
  };

  document.addEventListener('DOMContentLoaded', init);
})();
