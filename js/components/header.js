// ========================================
// 文件说明：头部导航组件
// 文件路径：js/components/header.js
// ========================================

(function() {
  'use strict';

  // 默认导航（API 加载失败时的降级方案）
  var defaultNavItems = [
    { name: '首页', url: '/', is_external: 0 },
    { name: '走进福溪', url: '/about.html', is_external: 0 },
    { name: '理学文化', url: '/culture.html', is_external: 0 },
    { name: '古村风貌', url: '/scenery.html', is_external: 0 },
    { name: '民族文化', url: '/ethnic.html', is_external: 0 },
    { name: '旅游指南', url: '/travel.html', is_external: 0 },
    { name: '新闻动态', url: '/news.html', is_external: 0 },
    { name: '全部文章', url: '/articles.html', is_external: 0 }
  ];

  function initHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;

    // 先用默认导航渲染，再异步加载动态导航
    renderNav(defaultNavItems);
    loadDynamicNav();
  }

  function loadDynamicNav() {
    API.get('/nav').then(function(result) {
      if (result.success && result.data && result.data.length > 0) {
        renderNav(result.data);
      }
    }).catch(function() {
      // 加载失败，保持默认导航
    });
  }

  function renderNav(items) {
    var header = document.getElementById('site-header');
    if (!header) return;

    var navHtml = items.map(function(item) {
      var target = item.is_external ? ' target="_blank"' : '';
      return '<a href="' + Utils.escapeHtml(item.url) + '" class="header-nav__link"' + target + '>' + Utils.escapeHtml(item.name) + '</a>';
    }).join('');

    var mobileHtml = items.map(function(item) {
      var target = item.is_external ? ' target="_blank"' : '';
      return '<a href="' + Utils.escapeHtml(item.url) + '" class="mobile-nav__link"' + target + '>' + Utils.escapeHtml(item.name) + '</a>';
    }).join('');

    header.innerHTML = '<div class="header-inner">' +
      '<a href="/" class="header-logo">' +
        '<img src="/images/logo/logo-icon.svg" alt="福溪村" class="header-logo__img">' +
        '<span class="header-logo__text">福溪村</span>' +
      '</a>' +
      '<nav class="header-nav">' + navHtml + '</nav>' +
      '<div class="header-actions">' +
        '<div data-auth="logged-out"><a href="/login.html" class="btn btn-outline btn-sm">登录</a></div>' +
        '<div data-auth="logged-in" style="display:none" class="header-user">' +
          '<button class="header-user__toggle" onclick="toggleUserDropdown(this)" aria-label="用户菜单">' +
            '<img class="header-user__avatar" data-avatar src="/images/default/avatar.svg" alt="">' +
          '</button>' +
          '<div class="header-user__dropdown" id="user-dropdown">' +
            '<div class="header-user__dropdown-header">' +
              '<span class="header-user__dropdown-name" data-username></span>' +
            '</div>' +
            '<a href="/user/profile.html" class="header-user__dropdown-item">个人中心</a>' +
            '<a href="/admin/index.html" data-auth="admin" style="display:none" class="header-user__dropdown-item">后台管理</a>' +
            '<div class="header-user__dropdown-divider"></div>' +
            '<button class="header-user__dropdown-item header-user__dropdown-item--danger" onclick="Auth.logout()">退出登录</button>' +
          '</div>' +
        '</div>' +
        '<button class="header-menu-btn" onclick="toggleMobileMenu(this)">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="mobile-nav" id="mobile-nav">' +
      mobileHtml +
      '<div data-auth="logged-in" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--color-border-light);">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:0 16px 12px;">' +
          '<img class="header-user__avatar" data-avatar src="/images/default/avatar.svg" alt="" style="width:32px;height:32px;">' +
          '<span data-username style="font-weight:600;"></span>' +
        '</div>' +
        '<a href="/user/profile.html" class="mobile-nav__link">个人中心</a>' +
        '<a href="/admin/index.html" data-auth="admin" style="display:none" class="mobile-nav__link">后台管理</a>' +
        '<a href="#" onclick="Auth.logout();return false;" class="mobile-nav__link">退出登录</a>' +
      '</div>' +
    '</div>';

    setActiveNav();
    initScrollEffect(header);
    Auth.updateUI();
  }

  function setActiveNav() {
    var path = window.location.pathname;
    var links = document.querySelectorAll('.header-nav__link');
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href === path || (href !== '/' && path.startsWith(href.replace('.html', '')))) {
        link.classList.add('header-nav__link--active');
      }
    });
  }

  function initScrollEffect(header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 10) {
        header.classList.add('site-header--scrolled');
      } else {
        header.classList.remove('site-header--scrolled');
      }
    });
  }

  window.toggleMobileMenu = function(btn) {
    btn.classList.toggle('active');
    document.getElementById('mobile-nav').classList.toggle('active');
  };

  window.toggleUserDropdown = function(btn) {
    var dropdown = document.getElementById('user-dropdown');
    if (!dropdown) return;
    var isOpen = dropdown.classList.toggle('header-user__dropdown--open');
    btn.classList.toggle('header-user__toggle--active', isOpen);
  };

  // 点击下拉菜单外部关闭
  document.addEventListener('click', function(e) {
    var dropdown = document.getElementById('user-dropdown');
    if (!dropdown || !dropdown.classList.contains('header-user__dropdown--open')) return;
    if (e.target.closest('.header-user')) return;
    dropdown.classList.remove('header-user__dropdown--open');
    var toggle = dropdown.parentElement.querySelector('.header-user__toggle');
    if (toggle) toggle.classList.remove('header-user__toggle--active');
  });

  document.addEventListener('DOMContentLoaded', initHeader);
})();
