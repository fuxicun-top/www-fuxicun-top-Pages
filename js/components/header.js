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
    { name: '新闻动态', url: '/articles.html?category=village-news', is_external: 0 },
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
        '<div data-auth="logged-in" style="display:none">' +
          '<a href="/user/profile.html" class="header-nav__link" data-username></a>' +
          '<a href="/admin/index.html" data-auth="admin" style="display:none" class="btn btn-primary btn-sm">后台</a>' +
          '<button onclick="Auth.logout()" class="btn btn-outline btn-sm">退出</button>' +
        '</div>' +
        '<button class="header-menu-btn" onclick="toggleMobileMenu(this)">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="mobile-nav" id="mobile-nav">' +
      mobileHtml +
      '<div data-auth="logged-in" style="display:none;margin-top:16px;">' +
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

  document.addEventListener('DOMContentLoaded', initHeader);
})();
