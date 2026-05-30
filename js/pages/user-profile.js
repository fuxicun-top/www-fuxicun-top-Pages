// ========================================
// 文件说明：用户个人资料页脚本
// 文件路径：js/pages/user-profile.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!UserPanel.init()) return;

    loadProfile();

    document.getElementById('profile-form').onsubmit = function(e) {
      e.preventDefault();
      saveProfile();
    };

    document.getElementById('btn-upload-avatar').onclick = function() {
      document.getElementById('avatar-file').click();
    };

    document.getElementById('avatar-file').onchange = function(e) {
      if (e.target.files && e.target.files[0]) {
        uploadAvatar(e.target.files[0]);
      }
    };
  }

  async function loadProfile() {
    try {
      var result = await API.get('/auth/me');
      if (result.success) {
        var user = result.data;
        var form = document.getElementById('profile-form');
        form.username.value = user.username || '';
        form.phone.value = user.phone || '';
        form.email.value = user.email || '';
        form.display_name.value = user.display_name || '';

        // 显示头像
        if (user.avatar) {
          document.getElementById('avatar-img').src = user.avatar;
          document.getElementById('avatar-img').style.display = 'block';
          document.getElementById('avatar-initial').style.display = 'none';
        } else {
          document.getElementById('avatar-initial').textContent = (user.display_name || user.username).charAt(0).toUpperCase();
        }
      }
    } catch (e) {
      Toast.error('加载个人信息失败');
    }
  }

  async function saveProfile() {
    var form = document.getElementById('profile-form');
    var btn = document.getElementById('btn-save-profile');
    var email = form.email.value.trim();
    var displayName = form.display_name.value.trim();

    if (displayName && (displayName.length < 2 || displayName.length > 20)) {
      Toast.error('显示名称长度为2-20个字符');
      return;
    }

    btn.disabled = true;
    btn.textContent = '保存中...';

    try {
      var result = await API.put('/auth/profile', { email: email, display_name: displayName });
      if (result.success) {
        // 更新 localStorage 中的用户信息
        var user = Auth.getUser();
        if (user) {
          user.display_name = displayName || user.username;
          Storage.setObject('user', user);
        }
        Toast.success('保存成功');
      } else {
        Toast.error(result.message || '保存失败');
      }
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '保存修改';
    }
  }

  async function uploadAvatar(file) {
    if (file.size > 2 * 1024 * 1024) {
      Toast.error('图片大小不能超过 2MB');
      return;
    }

    var allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.indexOf(file.type) === -1) {
      Toast.error('仅支持 JPG、PNG、WebP、GIF 格式');
      return;
    }

    try {
      var result = await API.upload(file, 'image');
      if (result.success && result.data) {
        var avatarUrl = result.data.url;
        document.getElementById('avatar-img').src = avatarUrl;
        document.getElementById('avatar-img').style.display = 'block';
        document.getElementById('avatar-initial').style.display = 'none';

        // 更新 localStorage 中的用户信息
        var user = Auth.getUser();
        if (user) {
          user.avatar = avatarUrl;
          Storage.setObject('user', user);
        }

        Toast.success('头像上传成功');
      }
    } catch (e) {
      Toast.error(e.message || '上传失败');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
