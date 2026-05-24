// ========================================
// 文件说明：编辑文章页脚本
// 文件路径：js/pages/user-edit-article.js
// ========================================

(function() {
  'use strict';

  var articleId = null;

  function init() {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return;
    }

    var params = new URLSearchParams(window.location.search);
    articleId = params.get('id');

    if (!articleId) {
      Toast.error('文章ID不存在');
      window.location.href = '/user/articles.html';
      return;
    }

    document.getElementById('article-id').value = articleId;

    loadUserInfo();
    loadCategories();
    loadArticle();

    document.getElementById('edit-form').onsubmit = function(e) {
      e.preventDefault();
      saveArticle();
    };

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

  async function loadArticle() {
    try {
      var result = await API.get('/articles/' + articleId);
      if (result.success) {
        var article = result.data;
        var form = document.getElementById('edit-form');

        form.title.value = article.title || '';
        form.summary.value = article.summary || '';
        form.content.value = article.content || '';
        form.category_id.value = article.category_id || '';

        if (article.cover_image) {
          document.getElementById('cover-image-input').value = article.cover_image;
          document.getElementById('cover-preview-img').src = article.cover_image;
          document.getElementById('cover-preview').style.display = 'block';
          document.getElementById('cover-upload-btn').style.display = 'none';
        }
      } else {
        Toast.error('文章不存在');
        window.location.href = '/user/articles.html';
      }
    } catch (e) {
      Toast.error('加载文章失败');
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

  async function saveArticle() {
    var form = document.getElementById('edit-form');
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

    var btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.textContent = '保存中...';

    try {
      var data = {
        title: title,
        content: content,
        summary: form.summary.value.trim(),
        cover_image: form.cover_image.value,
        category_id: form.category_id.value || null
      };

      var result = await API.put('/articles/' + articleId, data);
      if (result.success) {
        Toast.success('保存成功');
        setTimeout(function() {
          window.location.href = '/user/articles.html';
        }, 1500);
      } else {
        Toast.error(result.error?.message || '保存失败');
      }
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '保存修改';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
