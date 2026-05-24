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
      // 与后端 auth.js / user.js 保持一致：8 位最小长度
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
        // 后端在重置成功后会下发新 token + user，前端写入并自动跳转
        if (result.data && result.data.token) {
          Storage.set('token', result.data.token);
          Storage.set('user', result.data.user);
          Toast.success('密码重置成功，正在为您登录...');
          form.innerHTML = '<div style="text-align:center;padding:20px 0;">' +
            '<p style="font-size:48px;margin-bottom:16px;">✓</p>' +
            '<p style="font-weight:600;">密码重置成功！</p>' +
            '<p style="color:var(--color-text-secondary);margin-top:8px;">已自动登录，正在跳转...</p>' +
          '</div>';
          setTimeout(function() {
            window.location.href = '/user/profile.html';
          }, 1200);
        } else {
          // 兜底（用户已被禁用等情况）：要求手动登录
          Toast.success('密码重置成功');
          form.innerHTML = '<div style="text-align:center;padding:20px 0;">' +
            '<p style="font-size:48px;margin-bottom:16px;">✓</p>' +
            '<p style="font-weight:600;">密码重置成功！</p>' +
            '<p style="color:var(--color-text-secondary);margin-top:8px;">请使用新密码登录</p>' +
            '<a href="/login.html" class="btn btn-primary" style="margin-top:20px;">前往登录</a>' +
          '</div>';
        }
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
