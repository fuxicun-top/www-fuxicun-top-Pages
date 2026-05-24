// ========================================
// 文件说明：注册页面脚本
// 文件路径：js/pages/register.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (Auth.isLoggedIn()) {
      window.location.href = '/';
      return;
    }

    initTurnstile();

    document.getElementById('register-form').onsubmit = function(e) {
      e.preventDefault();
      handleRegister();
    };
  }

  function initTurnstile() {
    var container = document.getElementById('turnstile-container');
    if (!container) return;

    // 检测是否为本地开发环境
    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (window.turnstile) {
      try {
        turnstile.render(container, {
          sitekey: CONFIG.TURNSTILE_SITE_KEY,
          callback: function(token) {
            window._turnstileToken = token;
          }
        });
      } catch (e) {
        console.warn('Turnstile加载失败，本地开发环境可跳过验证');
        if (isLocal) {
          container.style.display = 'none';
        }
      }
    } else if (isLocal) {
      // 本地开发时如果turnstile未加载，隐藏容器
      container.style.display = 'none';
    }
  }

  async function handleRegister() {
    var form = document.getElementById('register-form');
    var data = Form.getData(form);

    var rules = {
      username: { required: true, minLength: 2, maxLength: 20, message: '用户名长度为2-20个字符' },
      phone: { required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
      password: { required: true, minLength: 8, message: '密码长度不能少于8位' },
      passwordConfirm: { required: true, confirm: 'password', message: '两次密码不一致' }
    };

    var errors = Form.validate(rules, data);
    if (!data.agree) {
      errors.agree = '请同意用户协议和隐私政策';
    }
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-register');
    Form.setLoading(btn, true);

    try {
      var postData = {
        username: data.username,
        password: data.password,
        phone: data.phone,
        email: data.email
      };

      // Turnstile token (本地开发时可能为空)
      if (window._turnstileToken) {
        postData.turnstile_token = window._turnstileToken;
      }

      var result = await API.post('/auth/register', postData);

      if (result.success) {
        Storage.set('token', result.data.token);
        Storage.setObject('user', result.data.user);
        Toast.success('注册成功');
        setTimeout(function() {
          window.location.href = '/';
        }, 500);
      } else {
        Toast.error(result.error?.message || '注册失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '注册失败');
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
