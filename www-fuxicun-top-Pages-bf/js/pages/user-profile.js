// ========================================
// 文件说明：用户个人资料页脚本
// 文件路径：js/pages/user-profile.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html';
      return;
    }

    loadProfile();

    document.getElementById('profile-form').onsubmit = function(e) {
      e.preventDefault();
      saveProfile();
    };

    document.getElementById('password-form').onsubmit = function(e) {
      e.preventDefault();
      changePassword();
    };

    // 头像文件选择 → 上传到 /user/avatar
    var avatarInput = document.getElementById('avatar-file');
    if (avatarInput) {
      avatarInput.onchange = function(e) {
        var file = e.target.files && e.target.files[0];
        if (file) uploadAvatar(file);
        // 清空选中以便选同一文件能再次触发
        e.target.value = '';
      };
    }
  }

  async function loadProfile() {
    try {
      var result = await API.get('/auth/me');
      if (result.success) {
        var user = result.data;
        document.getElementById('user-name').textContent = user.username;
        // 优先用真实头像 URL；没有则用首字母占位
        renderAvatar(user.username, user.avatar);

        var form = document.getElementById('profile-form');
        form.username.value = user.username || '';
        form.phone.value = user.phone || '';
        form.email.value = user.email || '';
      }
    } catch (e) {
      Toast.error('加载个人信息失败');
    }
  }

  // 渲染头像：有 URL 用图片，无则首字母圆形
  function renderAvatar(username, avatarUrl) {
    var box = document.getElementById('user-avatar');
    if (!box) return;
    if (avatarUrl) {
      box.innerHTML = '<img src="' + Utils.escapeHtml(avatarUrl) + '" alt="头像" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">';
    } else {
      box.textContent = (username && username[0] ? username[0] : 'U').toUpperCase();
    }
  }

  // 上传头像
  async function uploadAvatar(file) {
    // 客户端体积/类型预校验，提示更直观
    var allowed = ['image/jpeg','image/png','image/webp','image/gif'];
    if (allowed.indexOf(file.type) === -1) {
      Toast.error('仅支持 JPG/PNG/WebP/GIF 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Toast.error('头像不能超过 2MB');
      return;
    }
    try {
      Toast.info('正在上传头像...');
      var token = Storage.get('token');
      var formData = new FormData();
      formData.append('avatar', file);
      var resp = await fetch(CONFIG.API_BASE + '/user/avatar', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      var result = await resp.json();
      if (resp.ok && result && result.success) {
        Toast.success('头像更新成功');
        var username = document.getElementById('profile-form').username.value || '';
        renderAvatar(username, result.data && result.data.avatar);
      } else {
        Toast.error((result && result.error && result.error.message) || '上传失败');
      }
    } catch (e) {
      Toast.error('上传失败：' + e.message);
    }
  }

  async function saveProfile() {
    var form = document.getElementById('profile-form');
    var btn = document.getElementById('btn-save-profile');
    var email = form.email.value.trim();

    btn.disabled = true;
    btn.textContent = '保存中...';

    try {
      var result = await API.put('/auth/profile', { email: email });
      if (result.success) {
        Toast.success('保存成功');
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

  async function changePassword() {
    var form = document.getElementById('password-form');
    var btn = document.getElementById('btn-change-password');
    var oldPassword = form.old_password.value;
    var newPassword = form.new_password.value;
    var confirmPassword = form.confirm_password.value;

    if (newPassword !== confirmPassword) {
      Toast.error('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      Toast.error('密码长度不能少于6位');
      return;
    }

    btn.disabled = true;
    btn.textContent = '修改中...';

    try {
      var result = await API.put('/auth/password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      if (result.success) {
        Toast.success('密码修改成功');
        form.reset();
      } else {
        Toast.error(result.error?.message || '修改失败');
      }
    } catch (e) {
      Toast.error(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '修改密码';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
