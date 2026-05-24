// ========================================
// 文件说明：找回密码页面脚本
// 文件路径：js/pages/forgot-password.js
//
// 双路径方案（纯邮箱，不接入短信）：
//   分支① 用户绑定了邮箱：username/phone → 发邮件到 users.email → 重置 → 自动登录
//   分支② 用户没有邮箱：username + 手机号双因素校验 → 输入"接收邮箱"（不绑定）→ 发邮件 → 重置 → 自动登录
// ========================================

(function() {
  'use strict';

  // 两个 Turnstile token（分支①/②各一个）
  window._turnstileToken = null;
  window._turnstileToken2 = null;

  function init() {
    // 初始化两个 Turnstile widget
    if (window.CONFIG && window.CONFIG.TURNSTILE_SITE_KEY) {
      var renderTurnstile = function() {
        if (window.turnstile) {
          window.turnstile.render('#turnstile-container', {
            sitekey: window.CONFIG.TURNSTILE_SITE_KEY,
            callback: function(token) { window._turnstileToken = token; }
          });
          window.turnstile.render('#turnstile-container-2', {
            sitekey: window.CONFIG.TURNSTILE_SITE_KEY,
            callback: function(token) { window._turnstileToken2 = token; }
          });
        } else {
          setTimeout(renderTurnstile, 200);
        }
      };
      setTimeout(renderTurnstile, 300);
    }

    // 分支①：发送重置邮件（按 username 找邮箱）
    var form1 = document.getElementById('forgot-form');
    if (form1) {
      form1.onsubmit = function(e) {
        e.preventDefault();
        handleSendBranch1();
      };
    }

    // 分支②：用手机号 + 接收邮箱
    var form2 = document.getElementById('forgot-form-with-phone');
    if (form2) {
      form2.onsubmit = function(e) {
        e.preventDefault();
        handleSendBranch2();
      };
    }

    // "我没有绑定邮箱" → 切到分支②
    var linkNoEmail = document.getElementById('link-no-email');
    if (linkNoEmail) {
      linkNoEmail.onclick = function() {
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('forgot-form-with-phone').style.display = 'block';
      };
    }

    // "返回上一步" → 切回分支①
    var linkBack = document.getElementById('link-back-to-email');
    if (linkBack) {
      linkBack.onclick = function() {
        document.getElementById('forgot-form-with-phone').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'block';
      };
    }
  }

  function resetTurnstile() {
    if (window.turnstile) {
      try { window.turnstile.reset('#turnstile-container'); } catch (e) {}
      try { window.turnstile.reset('#turnstile-container-2'); } catch (e) {}
    }
    window._turnstileToken = null;
    window._turnstileToken2 = null;
  }

  // 分支①：仅用户名/手机号（如果该账号绑了邮箱就发过去）
  async function handleSendBranch1() {
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
        Toast.success(result.message || '如该账号绑定了邮箱，重置链接已发送');
        renderSentScreen('如该账号已绑定邮箱', data.username);
      } else {
        Toast.error((result.error && result.error.message) || '发送失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '发送失败');
      resetTurnstile();
    } finally {
      Form.setLoading(btn, false);
    }
  }

  // 分支②：用户名 + 手机号双因素 + 接收邮箱
  async function handleSendBranch2() {
    var form = document.getElementById('forgot-form-with-phone');
    var data = Form.getData(form);

    var rules = {
      username: { required: true, message: '请输入用户名' },
      phone: { required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入正确的 11 位手机号' },
      recipient_email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入正确的接收邮箱' }
    };

    var errors = Form.validate(rules, data);
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-send-with-phone');
    Form.setLoading(btn, true);

    try {
      var result = await API.post('/auth/forgot-password/with-phone', {
        username: data.username,
        phone: data.phone,
        recipient_email: data.recipient_email,
        turnstile_token: window._turnstileToken2
      });

      if (result.success) {
        Toast.success(result.message || '重置链接已发送');
        renderSentScreen('重置链接已发送至', data.recipient_email);
      } else {
        Toast.error((result.error && result.error.message) || '发送失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '发送失败');
      resetTurnstile();
    } finally {
      Form.setLoading(btn, false);
    }
  }

  // 通用"已发送"提示页（替换整个表单区域）
  function renderSentScreen(title, target) {
    var card = document.querySelector('.auth-card');
    if (!card) return;
    // 移除两个表单
    var f1 = document.getElementById('forgot-form');
    var f2 = document.getElementById('forgot-form-with-phone');
    if (f1) f1.style.display = 'none';
    if (f2) f2.style.display = 'none';

    // 注入提示
    var tip = document.createElement('div');
    tip.style.textAlign = 'center';
    tip.style.padding = '20px 0';
    tip.innerHTML =
      '<p style="font-size:48px;margin-bottom:16px;">📧</p>' +
      '<p style="color:var(--color-text-secondary);">' + Utils.escapeHtml(title) + '</p>' +
      '<p style="font-weight:600;margin:8px 0;">' + Utils.escapeHtml(target || '') + '</p>' +
      '<p style="color:var(--color-text-placeholder);font-size:13px;margin-top:16px;">请在 24 小时内点击邮件中的链接重置密码；如未收到，请检查垃圾邮件文件夹或联系管理员</p>' +
      '<a href="/login.html" class="btn btn-primary" style="margin-top:20px;">返回登录</a>';
    card.appendChild(tip);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
