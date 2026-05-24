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
  }

  async function loadProfile() {
    try {
      var result = await API.get('/auth/me');
      if (result.success) {
        var user = result.data;
        document.getElementById('user-name').textContent = user.username;
        document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();

        var form = document.getElementById('profile-form');
        form.username.value = user.username || '';
        form.phone.value = user.phone || '';
        form.email.value = user.email || '';
      }
    } catch (e) {
      Toast.error('加载个人信息失败');
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

    if (newPassword.length < 8) {
      Toast.error('密码长度不能少于8位');
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
