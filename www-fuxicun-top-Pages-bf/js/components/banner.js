// ========================================
// 文件说明：轮播图组件
// 文件路径：js/components/banner.js
// ========================================

var Banner = (function() {
  'use strict';

  var current = 0;
  var total = 0;
  var timer = null;
  var container = null;

  function init(elementId) {
    container = document.getElementById(elementId);
    if (!container) return;
    loadBanners();
  }

  // 默认轮播图（API 加载失败或未安装时的降级方案）
  var defaultBanners = [
    { title: '欢迎来到福溪村', subtitle: '千年古村 · 理学圣地', image_url: '/images/banners/banner1.svg' },
    { title: '爱莲亭畔 · 荷塘月色', subtitle: '周敦颐理学传承之地', image_url: '/images/banners/banner2.svg' },
    { title: '福溪穿村 · 古桥流水', subtitle: '溪水潺潺 · 岁月静好', image_url: '/images/banners/banner3.svg' }
  ];

  function loadBanners() {
    // 先渲染默认轮播图
    render(defaultBanners);
    // 异步加载动态数据
    API.get('/banners').then(function(result) {
      if (result.success && result.data && result.data.length > 0) {
        render(result.data);
      }
    }).catch(function() {
      // 加载失败，保持默认轮播图
    });
  }

  function render(banners) {
    total = banners.length;

    var html = '<div class="banner__slides" id="banner-slides">';
    banners.forEach(function(b) {
      html += '<div class="banner__slide">' +
        '<img src="' + Utils.escapeHtml(b.image_url) + '" alt="' + Utils.escapeHtml(b.title) + '">' +
        '<div class="banner__overlay">' +
          '<h2 class="banner__title">' + Utils.escapeHtml(b.title) + '</h2>' +
          (b.subtitle ? '<p class="banner__subtitle">' + Utils.escapeHtml(b.subtitle) + '</p>' : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';

    if (total > 1) {
      html += '<div class="banner__dots" id="banner-dots">';
      banners.forEach(function(_, i) {
        html += '<div class="banner__dot' + (i === 0 ? ' active' : '') + '" onclick="Banner.goTo(' + i + ')"></div>';
      });
      html += '</div>';
      html += '<div class="banner__arrow banner__arrow--prev" onclick="Banner.prev()">&#8249;</div>';
      html += '<div class="banner__arrow banner__arrow--next" onclick="Banner.next()">&#8250;</div>';
    }

    container.innerHTML = html;
    startAutoPlay();
  }

  function goTo(index) {
    current = index;
    var slides = document.getElementById('banner-slides');
    if (slides) {
      slides.style.transform = 'translateX(-' + (current * 100) + '%)';
    }
    updateDots();
  }

  function next() {
    goTo((current + 1) % total);
  }

  function prev() {
    goTo((current - 1 + total) % total);
  }

  function updateDots() {
    var dots = document.querySelectorAll('.banner__dot');
    dots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === current);
    });
  }

  function startAutoPlay() {
    stopAutoPlay();
    timer = setInterval(next, 5000);
  }

  function stopAutoPlay() {
    if (timer) clearInterval(timer);
  }

  return {
    init: init,
    goTo: goTo,
    next: next,
    prev: prev
  };
})();
