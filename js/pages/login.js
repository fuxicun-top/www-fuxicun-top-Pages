// ========================================
// 文件说明：登录页面脚本
// 文件路径：js/pages/login.js
// ========================================

(function() {
  'use strict';

  function init() {
    // 已登录则跳转
    if (Auth.isLoggedIn()) {
      var redirect = Utils.getUrlParam('redirect') || '/';
      window.location.href = redirect;
      return;
    }

    // 初始化 Turnstile
    initTurnstile();

    // 绑定表单提交
    document.getElementById('login-form').onsubmit = function(e) {
      e.preventDefault();
      handleLogin();
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

  async function handleLogin() {
    var form = document.getElementById('login-form');
    var data = Form.getData(form);

    // 验证
    var rules = {
      username: { required: true, message: '请输入用户名或手机号' },
      password: { required: true, message: '请输入密码' }
    };

    var errors = Form.validate(rules, data);
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-login');
    Form.setLoading(btn, true);

    try {
      var postData = {
        username: data.username,
        password: data.password
      };

      // Turnstile token (本地开发时可能为空)
      if (window._turnstileToken) {
        postData.turnstile_token = window._turnstileToken;
      }

      var result = await API.post('/auth/login', postData);

      if (result.success) {
        Storage.set('token', result.data.token);
        Storage.setObject('user', result.data.user);
        Toast.success('登录成功');

        var redirect = Utils.getUrlParam('redirect') || '/';
        setTimeout(function() {
          window.location.href = redirect;
        }, 500);
      } else {
        Toast.error(result.error?.message || '登录失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '登录失败');
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
