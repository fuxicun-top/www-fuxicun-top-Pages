// ========================================
// 文件说明：用户中心面板布局组件
// 文件路径：js/components/user-panel.js
// ========================================

var UserPanel = (function() {
  'use strict';

  var menuItems = [
    { group: '个人中心', items: [
      { icon: '👤', text: '个人资料', href: '/user/profile.html' },
      { icon: '🔑', text: '修改密码', href: '/user/password.html' }
    ]},
    { group: '内容管理', items: [
      { icon: '📝', text: '我的文章', href: '/user/articles.html' },
      { icon: '✏️', text: '发表文章', href: '/user/publish.html' },
      { icon: '💬', text: '我的评论', href: '/user/comments.html' }
    ]}
  ];

  function init() {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }

    renderLayout();
    setActiveMenu();
    return true;
  }

  function renderLayout() {
    var user = Auth.getUser();
    var initial = user ? (user.display_name || user.username).charAt(0).toUpperCase() : 'U';
    var avatarSrc = user && user.avatar ? user.avatar : '/images/default/avatar.svg';

    var sidebar = document.getElementById('user-panel-sidebar');
    if (!sidebar) return;

    var html = '<div class="user-panel-logo">' +
      '<img src="/images/logo/logo-icon.svg" alt="" style="width:28px;height:28px;border-radius:50%;">' +
      '<span>用户中心</span>' +
    '</div>';
    html += '<nav class="user-panel-menu">';

    menuItems.forEach(function(group) {
      html += '<div class="user-panel-menu__title">' + group.group + '</div>';
      group.items.forEach(function(item) {
        html += '<a href="' + item.href + '" class="user-panel-menu__item" data-href="' + item.href + '">' +
          '<span class="user-panel-menu__icon">' + item.icon + '</span>' +
          '<span class="user-panel-menu__text">' + item.text + '</span>' +
        '</a>';
      });
    });

    html += '</nav>';
    html += '<div class="user-panel-footer">福溪村用户中心</div>';
    sidebar.innerHTML = html;

    // 顶部栏
    var header = document.getElementById('user-panel-header');
    if (header) {
      header.innerHTML = '<div class="user-panel-header__left">' +
        '<button class="user-panel-header__toggle" onclick="UserPanel.toggleSidebar()">☰</button>' +
        '<span class="user-panel-header__breadcrumb" id="user-panel-breadcrumb"></span>' +
      '</div>' +
      '<div class="user-panel-header__right">' +
        '<a href="/" style="font-size:13px;color:var(--color-text-secondary);">访问前台</a>' +
        '<div class="user-panel-user">' +
          '<img class="user-panel-user__avatar" src="' + avatarSrc + '" alt="" onerror="this.src=\'/images/default/avatar.svg\'">' +
          '<span class="user-panel-user__name">' + Utils.escapeHtml(user ? (user.display_name || user.username) : '') + '</span>' +
          '<button onclick="Auth.logout()" class="btn btn-outline btn-sm" style="margin-left:8px;">退出</button>' +
        '</div>' +
      '</div>';
    }
  }

  function setActiveMenu() {
    var path = window.location.pathname;
    document.querySelectorAll('.user-panel-menu__item').forEach(function(item) {
      var href = item.getAttribute('data-href');
      item.classList.toggle('user-panel-menu__item--active', path === href || path.startsWith(href.replace('.html', '')));
    });

    var breadcrumb = document.getElementById('user-panel-breadcrumb');
    if (breadcrumb) {
      var activeItem = document.querySelector('.user-panel-menu__item--active .user-panel-menu__text');
      if (activeItem) {
        breadcrumb.textContent = activeItem.textContent;
      }
    }
  }

  function toggleSidebar() {
    var sidebar = document.getElementById('user-panel-sidebar');
    sidebar.classList.toggle('user-panel-sidebar--collapsed');
    sidebar.classList.toggle('user-panel-sidebar--mobile-open');
  }

  return {
    init: init,
    toggleSidebar: toggleSidebar
  };
})();
