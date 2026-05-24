// ========================================
// 文件说明：媒体库管理页面脚本
// 文件路径：js/admin/media.js
// 功能：媒体文件列表（网格视图）、上传、删除、筛选
// ========================================

(function() {
  'use strict';

  /** @type {number} 当前页码 */
  var currentPage = 1;

  /** @type {string} 当前类型筛选 */
  var currentType = '';

  /**
   * 页面初始化入口
   */
  function init() {
    if (!Admin.init()) return;
    loadMedia();
    bindEvents();
  }

  /**
   * 绑定筛选、上传、拖拽事件
   */
  function bindEvents() {
    // 类型筛选
    document.getElementById('filter-type').addEventListener('change', function() {
      currentType = this.value;
      currentPage = 1;
      loadMedia();
    });

    // 文件上传
    document.getElementById('file-upload').addEventListener('change', function(e) {
      handleFiles(e.target.files);
    });

    // 拖拽上传
    var uploadArea = document.getElementById('upload-area');
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', function() {
      this.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    uploadArea.addEventListener('click', function() {
      document.getElementById('file-upload').click();
    });
  }

  /**
   * 处理文件上传
   * @param {FileList} files - 待上传的文件列表
   */
  async function handleFiles(files) {
    if (!files || files.length === 0) return;

    for (var i = 0; i < files.length; i++) {
      await uploadFile(files[i]);
    }

    // 上传完成后刷新列表
    loadMedia();
  }

  /**
   * 上传单个文件
   * @param {File} file - 文件对象
   */
  async function uploadFile(file) {
    // 验证文件类型和大小
    var isImage = file.type.startsWith('image/');
    var isVideo = file.type === 'video/mp4';

    if (!isImage && !isVideo) {
      Toast.error('不支持的文件类型: ' + file.name);
      return;
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      Toast.error('图片文件过大（最大 5MB）: ' + file.name);
      return;
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      Toast.error('视频文件过大（最大 100MB）: ' + file.name);
      return;
    }

    try {
      var formData = new FormData();
      formData.append('file', file);

      var token = Storage.get('token');
      var response = await fetch('/api/upload/' + (isImage ? 'image' : 'video'), {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });

      var result = await response.json();
      if (result.success) {
        Toast.success('上传成功: ' + file.name);
      } else {
        Toast.error('上传失败: ' + (result.error?.message || file.name));
      }
    } catch (e) {
      Toast.error('上传失败: ' + file.name + ' (' + e.message + ')');
    }
  }

  /**
   * 加载媒体列表
   * 调用 GET /admin/media 接口
   */
  async function loadMedia() {
    var grid = document.getElementById('media-grid');
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">加载中...</p>';

    try {
      var params = { page: currentPage, pageSize: 24 };
      if (currentType) params.type = currentType;

      var result = await API.get('/admin/media', params);
      if (result.success) {
        renderMedia(result.data.list);
        renderPagination(result.data.total, result.data.page, result.data.pageSize);
      }
    } catch (e) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#c62828;">加载失败: ' + e.message + '</p>';
    }
  }

  /**
   * 渲染媒体网格
   * @param {Array} mediaList - 媒体数据数组
   */
  function renderMedia(mediaList) {
    var grid = document.getElementById('media-grid');

    if (!mediaList || mediaList.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">暂无媒体文件</p>';
      return;
    }

    grid.innerHTML = mediaList.map(function(item) {
      var isImage = item.type && item.type.startsWith('image/');
      var size = formatFileSize(item.size);

      var preview = '';
      if (isImage) {
        preview = '<img src="' + item.url + '" alt="' + Utils.escapeHtml(item.original_name) + '" class="media-item__img" loading="lazy">';
      } else {
        preview = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;font-size:32px;">&#127916;</div>';
      }

      return '<div class="media-item" onclick="MediaPage.showDetail(' + item.id + ')" data-id="' + item.id + '">' +
        preview +
        '<button class="media-item__delete" onclick="event.stopPropagation();MediaPage.deleteMedia(' + item.id + ')" title="删除">&times;</button>' +
        '<div class="media-item__overlay">' +
          '<div class="media-item__name">' + Utils.escapeHtml(item.original_name) + '</div>' +
          '<div class="media-item__size">' + size + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /**
   * 显示媒体详情（弹窗预览）
   * @param {number} id - 媒体 ID
   */
  function showDetail(id) {
    var item = document.querySelector('.media-item[data-id="' + id + '"]');
    if (!item) return;

    var img = item.querySelector('.media-item__img');
    var name = item.querySelector('.media-item__name').textContent;
    var size = item.querySelector('.media-item__size').textContent;

    var previewHtml = '';
    if (img) {
      previewHtml = '<img src="' + img.src + '" class="media-detail-preview">';
    } else {
      previewHtml = '<div style="padding:40px;text-align:center;font-size:48px;background:#f5f5f5;border-radius:4px;margin-bottom:16px;">&#127916;</div>';
    }

    var content = previewHtml +
      '<div class="media-detail-info">' +
        '<p><strong>文件名：</strong>' + Utils.escapeHtml(name) + '</p>' +
        '<p><strong>大小：</strong>' + size + '</p>' +
        '<p><strong>URL：</strong><input type="text" value="' + (img ? img.src : '') + '" readonly style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;font-size:12px;" onclick="this.select()"></p>' +
      '</div>';

    if (typeof Modal !== 'undefined') {
      Modal.show({
        title: '媒体详情',
        content: content,
        showCancel: false,
        confirmText: '关闭'
      });
    }
  }

  /**
   * 删除媒体文件
   * @param {number} id - 媒体 ID
   */
  async function deleteMedia(id) {
    if (!confirm('确定要删除该媒体文件吗？此操作不可恢复。')) return;

    try {
      var result = await API.delete('/admin/media/' + id);
      if (result.success) {
        Toast.success('媒体文件已删除');
        loadMedia();
      } else {
        Toast.error(result.error?.message || '删除失败');
      }
    } catch (e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  function formatFileSize(bytes) {
    if (!bytes) return '未知';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * 渲染分页
   * @param {number} total - 总记录数
   * @param {number} page - 当前页码
   * @param {number} pageSize - 每页数量
   */
  function renderPagination(total, page, pageSize) {
    var totalPages = Math.ceil(total / pageSize);
    document.getElementById('pagination-info').textContent = '共 ' + total + ' 个文件';
    Pagination.render('pagination', page, totalPages, 'MediaPage.goToPage');
  }

  /**
   * 跳转到指定页
   * @param {number} page - 页码
   */
  function goToPage(page) {
    currentPage = page;
    loadMedia();
  }

  // 暴露全局方法
  window.MediaPage = {
    goToPage: goToPage,
    showDetail: showDetail,
    deleteMedia: deleteMedia
  };

  document.addEventListener('DOMContentLoaded', init);
})();
