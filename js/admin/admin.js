// ========================================
// 文件说明：后台公共脚本
// 文件路径：js/admin/admin.js
// ========================================

var Admin = (function() {
  'use strict';

  var menuItems = [
    { group: '概览', items: [
      { icon: '📊', text: '仪表盘', href: '/admin/index.html' }
    ]},
    { group: '内容管理', items: [
      { icon: '📝', text: '文章管理', href: '/admin/articles.html' },
      { icon: '📁', text: '分类管理', href: '/admin/categories.html' },
      { icon: '💬', text: '评论管理', href: '/admin/comments.html' },
      { icon: '🖼️', text: '媒体库', href: '/admin/media.html' }
    ]},
    { group: '网站设置', items: [
      { icon: '🏠', text: '首页配置', href: '/admin/homepage.html' },
      { icon: '🧭', text: '导航管理', href: '/admin/nav.html' },
      { icon: '📄', text: '页面管理', href: '/admin/pages.html' },
      { icon: '🎨', text: '轮播图管理', href: '/admin/banners.html' },
      { icon: '⚙️', text: '网站设置', href: '/admin/settings.html' }
    ]},
    { group: '系统', items: [
      { icon: '👥', text: '用户管理', href: '/admin/users.html' },
      { icon: '📋', text: '操作日志', href: '/admin/logs.html' }
    ]}
  ];

  function init() {
    // 权限校验：editor 和 admin 均可访问后台
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }

    if (!Auth.isEditor()) {
      Toast.error('无权访问后台');
      setTimeout(function() { window.location.href = '/'; }, 1000);
      return false;
    }

    renderLayout();
    setActiveMenu();
    Auth.updateUI();
    return true;
  }

  function renderLayout() {
    var user = Auth.getUser();
    var initial = user ? user.username.charAt(0).toUpperCase() : 'A';
    var isAdmin = user && user.role === 'admin';

    var sidebar = document.getElementById('admin-sidebar');
    if (!sidebar) return;

    // editor 角色隐藏管理员专属菜单项
    var menuItemsFiltered = menuItems.map(function(group) {
      var filteredItems = group.items.filter(function(item) {
        if (!isAdmin) {
          // editor 无法访问的菜单
          var adminOnly = ['/admin/users.html', '/admin/settings.html', '/admin/homepage.html', '/admin/nav.html', '/admin/pages.html'];
          return adminOnly.indexOf(item.href) === -1;
        }
        return true;
      });
      if (filteredItems.length === 0) return null;
      return { group: group.group, items: filteredItems };
    }).filter(Boolean);

    var html = '<div class="sidebar-logo"><a href="/admin/index.html" style="color:#fff;text-decoration:none;">福溪村后台</a></div>';
    html += '<nav class="sidebar-menu">';

    menuItemsFiltered.forEach(function(group) {
      html += '<div class="menu-group__title">' + group.group + '</div>';
      group.items.forEach(function(item) {
        html += '<a href="' + item.href + '" class="menu-item" data-href="' + item.href + '">' +
          '<span class="menu-item__icon">' + item.icon + '</span>' +
          '<span class="menu-item__text">' + item.text + '</span>' +
        '</a>';
      });
    });

    html += '</nav>';
    html += '<div class="sidebar-footer">福溪村管理系统 v1.0</div>';
    sidebar.innerHTML = html;

    // 顶部栏
    var header = document.getElementById('admin-header');
    if (header) {
      header.innerHTML = '<div class="admin-header__left">' +
        '<button class="admin-header__toggle" onclick="Admin.toggleSidebar()">☰</button>' +
        '<span class="admin-header__breadcrumb" id="admin-breadcrumb"></span>' +
      '</div>' +
      '<div class="admin-header__right">' +
        '<a href="/" target="_blank" style="font-size:13px;color:var(--color-text-secondary);">访问前台</a>' +
        '<div class="admin-user" onclick="Auth.logout()">' +
          '<div class="admin-user__avatar">' + initial + '</div>' +
          '<span class="admin-user__name">' + Utils.escapeHtml(user ? user.username : '') + '</span>' +
        '</div>' +
      '</div>';
    }
  }

  function setActiveMenu() {
    var path = window.location.pathname;
    document.querySelectorAll('.menu-item').forEach(function(item) {
      var href = item.getAttribute('data-href');
      item.classList.toggle('menu-item--active', path === href || path.startsWith(href.replace('.html', '')));
    });

    // 设置面包屑
    var breadcrumb = document.getElementById('admin-breadcrumb');
    if (breadcrumb) {
      var activeItem = document.querySelector('.menu-item--active .menu-item__text');
      if (activeItem) {
        breadcrumb.textContent = activeItem.textContent;
      }
    }
  }

  function toggleSidebar() {
    var sidebar = document.getElementById('admin-sidebar');
    sidebar.classList.toggle('admin-sidebar--collapsed');
    sidebar.classList.toggle('admin-sidebar--mobile-open');
  }

  return {
    init: init,
    toggleSidebar: toggleSidebar
  };
})();
