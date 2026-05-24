// ========================================
// 文件说明：找回密码页面脚本
// 文件路径：js/pages/forgot-password.js
// ========================================

(function() {
  'use strict';

  function init() {
    initTurnstile();

    document.getElementById('forgot-form').onsubmit = function(e) {
      e.preventDefault();
      handleSend();
    };
  }

  function initTurnstile() {
    var container = document.getElementById('turnstile-container');
    if (container && window.turnstile) {
      turnstile.render(container, {
        sitekey: CONFIG.TURNSTILE_SITE_KEY,
        callback: function(token) {
          window._turnstileToken = token;
        }
      });
    }
  }

  async function handleSend() {
    var form = document.getElementById('forgot-form');
    var data = Form.getData(form);

    var rules = {
      username: { required: true, message: '请输入用户名或手机号' }
    };

    var errors = Form.validate(rules, data);
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-send');
    Form.setLoading(btn, true);

    try {
      var result = await API.post('/auth/forgot-password', {
        username: data.username,
        turnstile_token: window._turnstileToken
      });

      if (result.success) {
        Toast.success('如果该账号存在且绑定了邮箱，重置链接已发送');
        form.innerHTML = '<div style="text-align:center;padding:20px 0;">' +
          '<p style="font-size:48px;margin-bottom:16px;">📧</p>' +
          '<p style="color:var(--color-text-secondary);">如果该账号存在且绑定了邮箱，重置链接已发送</p>' +
          '<p style="font-weight:600;margin:8px 0;">' + Utils.escapeHtml(data.username) + '</p>' +
          '<p style="color:var(--color-text-placeholder);font-size:13px;margin-top:16px;">请在24小时内点击邮件中的链接重置密码</p>' +
          '<a href="/login.html" class="btn btn-primary" style="margin-top:20px;">返回登录</a>' +
        '</div>';
      } else {
        Toast.error(result.error?.message || '发送失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '发送失败');
      resetTurnstile();
    } finally {
      Form.setLoading(btn, false);
    }
  }

  function resetTurnstile() {
    window._turnstileToken = null;
    if (window.turnstile) {
      turnstile.reset();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
