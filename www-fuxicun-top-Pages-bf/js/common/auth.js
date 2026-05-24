// ========================================
// 文件说明：用户认证
// 文件路径：js/common/auth.js
// ========================================

var Auth = (function() {
  'use strict';

  function getUser() {
    try {
      var user = Storage.get('user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!Storage.get('token');
  }

  function isAdmin() {
    var user = getUser();
    return user && user.role === 'admin';
  }

  function isEditor() {
    var user = getUser();
    return user && (user.role === 'editor' || user.role === 'admin');
  }

  function logout() {
    API.post('/auth/logout').catch(function() {});
    Storage.remove('token');
    Storage.remove('user');
    window.location.href = '/login.html';
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }

  function requireAdmin() {
    if (!isAdmin()) {
      window.location.href = '/';
      return false;
    }
    return true;
  }

  function updateUI() {
    var user = getUser();
    var authElements = document.querySelectorAll('[data-auth]');
    authElements.forEach(function(el) {
      var auth = el.getAttribute('data-auth');
      if (auth === 'logged-in' && !isLoggedIn()) el.style.display = 'none';
      if (auth === 'logged-out' && isLoggedIn()) el.style.display = 'none';
      if (auth === 'admin' && !isAdmin()) el.style.display = 'none';
    });

    var usernameEls = document.querySelectorAll('[data-username]');
    if (user) {
      usernameEls.forEach(function(el) { el.textContent = user.username; });
    }
  }

  /**
   * 获取当前登录 token
   * @returns {string|null}
   */
  function getToken() {
    return Storage.get('token');
  }

  return {
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    isEditor: isEditor,
    getToken: getToken,
    logout: logout,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    updateUI: updateUI
  };
})();
