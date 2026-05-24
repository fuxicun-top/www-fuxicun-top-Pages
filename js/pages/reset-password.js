// ========================================
// 文件说明：重置密码页面脚本
// 文件路径：js/pages/reset-password.js
// ========================================

(function() {
  'use strict';

  function init() {
    var token = Utils.getUrlParam('token');
    if (!token) {
      Toast.error('无效的重置链接');
      setTimeout(function() { window.location.href = '/forgot-password.html'; }, 1500);
      return;
    }

    document.getElementById('reset-token').value = token;

    document.getElementById('reset-form').onsubmit = function(e) {
      e.preventDefault();
      handleReset();
    };
  }

  async function handleReset() {
    var form = document.getElementById('reset-form');
    var data = Form.getData(form);

    var rules = {
      password: { required: true, minLength: 8, message: '密码长度不能少于8位' },
      passwordConfirm: { required: true, confirm: 'password', message: '两次密码不一致' }
    };

    var errors = Form.validate(rules, data);
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-reset');
    Form.setLoading(btn, true);

    try {
      var result = await API.post('/auth/reset-password', {
        token: data.token,
        password: data.password
      });

      if (result.success) {
        Toast.success('密码重置成功');
        form.innerHTML = '<div style="text-align:center;padding:20px 0;">' +
          '<p style="font-size:48px;margin-bottom:16px;">✓</p>' +
          '<p style="font-weight:600;">密码重置成功！</p>' +
          '<p style="color:var(--color-text-secondary);margin-top:8px;">请使用新密码登录</p>' +
          '<a href="/login.html" class="btn btn-primary" style="margin-top:20px;">前往登录</a>' +
        '</div>';
      } else {
        Toast.error(result.error?.message || '重置失败');
      }
    } catch (e) {
      Toast.error(e.message || '重置失败');
    } finally {
      Form.setLoading(btn, false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
