// ========================================
// 文件说明：找回密码页面脚本
// 文件路径：js/pages/forgot-password.js
// ========================================

var ForgotPassword = (function() {
  'use strict';

  var isLocalDev = (function() {
    var hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);
  })();

  var savedUsername = '';

  function init() {
    initTurnstile();
  }

  function initTurnstile() {
    if (!window.turnstile) return;
    var container = document.getElementById('turnstile-container');
    if (!container) return;
    try {
      turnstile.render(container, {
        sitekey: CONFIG.TURNSTILE_SITE_KEY,
        callback: function(token) { window._turnstileToken = token; }
      });
    } catch (e) {
      if (isLocalDev) container.style.display = 'none';
    }
  }

  function getTurnstileToken() {
    return window._turnstileToken || (isLocalDev ? 'XXXX.DUMMY.TOKEN.XXXX' : null);
  }

  function resetTurnstile() {
    window._turnstileToken = null;
    if (window.turnstile) turnstile.reset();
  }

  function showStep(id) {
    ['step-username', 'step-phone', 'step-email', 'step-success'].forEach(function(s) {
      document.getElementById(s).style.display = 'none';
    });
    document.getElementById(id).style.display = '';
  }

  // ===== 步骤 1：输入用户名，自动判断有无邮箱 =====
  async function checkUsername() {
    var form = document.getElementById('forgot-form');
    var username = (form.username.value || '').trim();

    if (!username) {
      Toast.error('请输入用户名或手机号');
      return;
    }

    var btn = document.getElementById('btn-check');
    btn.disabled = true;
    btn.textContent = '检测中...';

    try {
      var result = await API.post('/auth/forgot-password', {
        username: username,
        turnstile_token: getTurnstileToken()
      });

      if (!result.success) {
        Toast.error(result.message || '操作失败');
        resetTurnstile();
        return;
      }

      savedUsername = username;

      if (result.data && result.data.has_email === false) {
        if (result.data.phone_verified) {
          // 输入的是手机号，已自动验证 → 直接进入邮箱输入步骤
          showStep('step-email');
        } else {
          // 输入的是用户名 → 需要验证手机号
          showStep('step-phone');
        }
      } else if (result.data && result.data.sent) {
        // 有邮箱，已发送 → 显示成功
        showSuccess(result.message || '重置链接已发送', result.data.email_hint);
      }
    } catch (e) {
      Toast.error(e.message || '操作失败');
      resetTurnstile();
    } finally {
      btn.disabled = false;
      btn.textContent = '下一步';
    }
  }

  // ===== 步骤 2：验证手机号 =====
  async function verifyPhone() {
    var form = document.getElementById('forgot-form');
    var phone = (form.phone.value || '').trim();

    if (!phone) {
      Toast.error('请输入注册时的手机号');
      return;
    }

    var btn = document.getElementById('btn-verify');
    btn.disabled = true;
    btn.textContent = '验证中...';

    try {
      var result = await API.post('/auth/forgot-password', {
        username: savedUsername,
        phone: phone
      });

      if (result.success && result.data && result.data.verified) {
        // 验证通过 → 显示邮箱输入步骤
        showStep('step-email');
      } else {
        Toast.error(result.message || '验证失败');
      }
    } catch (e) {
      Toast.error(e.message || '验证失败');
    } finally {
      btn.disabled = false;
      btn.textContent = '验证手机号';
    }
  }

  // ===== 步骤 3：发送重置邮件到代收邮箱 =====
  async function sendReset() {
    var form = document.getElementById('forgot-form');
    var phone = (form.phone.value || '').trim();
    var recipientEmail = (form.recipient_email.value || '').trim();

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      Toast.error('请输入有效的接收邮箱地址');
      return;
    }

    var btn = document.getElementById('btn-send');
    btn.disabled = true;
    btn.textContent = '发送中...';

    try {
      var result = await API.post('/auth/forgot-password', {
        username: savedUsername,
        phone: phone,
        recipient_email: recipientEmail,
        turnstile_token: getTurnstileToken()
      });

      if (result.success && result.data && result.data.sent) {
        showSuccess(result.message || '重置链接已发送', result.data.email_hint || recipientEmail);
      } else {
        Toast.error(result.message || '发送失败');
      }
    } catch (e) {
      Toast.error(e.message || '发送失败');
    } finally {
      btn.disabled = false;
      btn.textContent = '发送重置邮件';
    }
  }

  function showSuccess(message, email) {
    showStep('step-success');
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-email').textContent = email || '';
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    checkUsername: checkUsername,
    verifyPhone: verifyPhone,
    sendReset: sendReset
  };
})();
