// ========================================
// 文件说明：文件上传组件（通用拖拽上传 UI）
// 文件路径：js/components/upload.js
// 当前状态：未被任何 HTML 直接引用（保留供未来组件化使用）
//   - 实际文件上传功能均通过 js/common/api.js 的 API.upload() 完成
//   - 本组件为可选 UI 封装，需要拖拽 + 预览交互时再按需引入
// ========================================

var Upload = (function() {
  'use strict';

  function createUploader(options) {
    var container = document.getElementById(options.containerId);
    if (!container) return;

    var inputId = options.inputId || 'file-upload';

    container.innerHTML = '<div class="upload-area" id="' + inputId + '-area">' +
      '<input type="file" id="' + inputId + '" style="display:none" ' +
        'accept="' + (options.accept || 'image/*') + '" ' +
        (options.multiple ? 'multiple' : '') + '>' +
      '<div class="upload-placeholder">' +
        '<span class="upload-icon">+</span>' +
        '<p>' + (options.placeholder || '点击或拖拽上传') + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="upload-preview" id="' + inputId + '-preview"></div>';

    var input = document.getElementById(inputId);
    var area = document.getElementById(inputId + '-area');

    area.onclick = function() { input.click(); };

    area.ondragover = function(e) {
      e.preventDefault();
      area.classList.add('dragover');
    };

    area.ondragleave = function() {
      area.classList.remove('dragover');
    };

    area.ondrop = function(e) {
      e.preventDefault();
      area.classList.remove('dragover');
      handleFiles(e.dataTransfer.files, options);
    };

    input.onchange = function() {
      handleFiles(input.files, options);
    };
  }

  function handleFiles(files, options) {
    Array.from(files).forEach(function(file) {
      if (options.maxSize && file.size > options.maxSize) {
        Toast.error('文件大小不能超过' + Math.round(options.maxSize / 1024 / 1024) + 'MB');
        return;
      }

      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        Toast.error('不支持的文件类型');
        return;
      }

      if (options.onSelect) {
        options.onSelect(file);
      }

      if (options.autoUpload !== false) {
        doUpload(file, options);
      }
    });
  }

  async function doUpload(file, options) {
    try {
      var result = await API.upload(file, options.type);
      if (result.success && options.onSuccess) {
        options.onSuccess(result.data);
      }
    } catch (e) {
      Toast.error(e.message);
      if (options.onError) options.onError(e);
    }
  }

  function showPreview(containerId, url) {
    var preview = document.getElementById(containerId + '-preview');
    if (preview) {
      preview.innerHTML = '<div class="preview-item">' +
        '<img src="' + url + '" alt="预览">' +
        '<button class="preview-remove" onclick="this.parentNode.remove()">&times;</button>' +
      '</div>';
    }
  }

  return {
    createUploader: createUploader,
    showPreview: showPreview
  };
})();
