// ========================================
// 文件说明：修改密码页脚本
// 文件路径：js/pages/user-password.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!UserPanel.init()) return;

    document.getElementById('password-form').onsubmit = function(e) {
      e.preventDefault();
      changePassword();
    };
  }

  async function changePassword() {
    var form = document.getElementById('password-form');
    var btn = document.getElementById('btn-change-password');
    var oldPassword = form.old_password.value;
    var newPassword = form.new_password.value;
    var confirmPassword = form.confirm_password.value;

    // 验证两次密码一致
    if (newPassword !== confirmPassword) {
      Toast.error('两次输入的新密码不一致');
      return;
    }

    // 验证密码长度
    if (newPassword.length < 8) {
      Toast.error('新密码长度不能少于8位');
      return;
    }

    btn.disabled = true;
    btn.textContent = '提交中...';

    try {
      var result = await API.put('/user/password', {
        old_password: oldPassword,
        new_password: newPassword
      });

      if (result.success) {
        Toast.success('密码修改成功');
        form.reset();
      } else {
        Toast.error(result.message || '修改失败');
      }
    } catch (e) {
      Toast.error(e.message || '修改失败');
    } finally {
      btn.disabled = false;
      btn.textContent = '确认修改';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
