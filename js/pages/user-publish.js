// ========================================
// 文件说明：发表文章页脚本
// 文件路径：js/pages/user-publish.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return;
    }

    loadUserInfo();
    loadCategories();

    document.getElementById('publish-form').onsubmit = function(e) {
      e.preventDefault();
      publishArticle('pending');
    };

    document.getElementById('btn-save-draft').onclick = function() {
      publishArticle('draft');
    };

    // 封面图片上传
    document.getElementById('cover-file').onchange = function() {
      uploadCover(this.files[0]);
    };
  }

  function loadUserInfo() {
    var user = Auth.getUser();
    if (user) {
      document.getElementById('user-name').textContent = user.username;
      document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();
    }
  }

  async function loadCategories() {
    try {
      var result = await API.get('/categories');
      if (result.success) {
        var select = document.getElementById('category-select');
        result.data.forEach(function(cat) {
          var option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          select.appendChild(option);
        });
      }
    } catch (e) {
      console.error('Load categories error:', e);
    }
  }

  async function uploadCover(file) {
    if (!file) return;

    if (!CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      Toast.error('仅支持 JPG、PNG、WebP 格式');
      return;
    }

    if (file.size > CONFIG.UPLOAD_IMAGE_MAX_SIZE) {
      Toast.error('图片大小不能超过5MB');
      return;
    }

    try {
      var result = await API.upload(file, 'image');
      if (result.success) {
        document.getElementById('cover-image-input').value = result.data.url;
        document.getElementById('cover-preview-img').src = result.data.url;
        document.getElementById('cover-preview').style.display = 'block';
        document.getElementById('cover-upload-btn').style.display = 'none';
        Toast.success('封面上传成功');
      }
    } catch (e) {
      Toast.error('上传失败: ' + e.message);
    }
  }

  window.removeCover = function() {
    document.getElementById('cover-image-input').value = '';
    document.getElementById('cover-preview').style.display = 'none';
    document.getElementById('cover-upload-btn').style.display = 'block';
    document.getElementById('cover-file').value = '';
  };

  async function publishArticle(status) {
    var form = document.getElementById('publish-form');
    var title = form.title.value.trim();
    var content = form.content.value.trim();

    if (!title) {
      Toast.error('请输入文章标题');
      return;
    }

    if (!content) {
      Toast.error('请输入文章内容');
      return;
    }

    var btn = status === 'draft' ? document.getElementById('btn-save-draft') : document.getElementById('btn-publish');
    btn.disabled = true;
    var originalText = btn.textContent;
    btn.textContent = '提交中...';

    try {
      var data = {
        title: title,
        content: content,
        summary: form.summary.value.trim(),
        cover_image: form.cover_image.value,
        category_id: form.category_id.value || null
      };

      var result = await API.post('/articles', data);
      if (result.success) {
        Toast.success(status === 'draft' ? '草稿已保存' : '文章已提交');
        setTimeout(function() {
          window.location.href = '/user/articles.html';
        }, 1500);
      } else {
        Toast.error(result.error?.message || '提交失败');
      }
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
