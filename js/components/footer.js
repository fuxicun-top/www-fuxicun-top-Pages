// ========================================
// 文件说明：底部组件
// 文件路径：js/components/footer.js
// ========================================

(function() {
  'use strict';

  // 默认底部信息
  var defaults = {
    site_name: '福溪村',
    site_description: '福溪村位于广西贺州市富川瑶族自治县，是一座历史悠久、文化底蕴深厚的古村落。这里保存着完好的明清古建筑群，是理学文化的重要传承地。',
    contact_email: 'www@fuxicun.top',
    contact_phone: '',
    contact_address: '广西贺州市富川瑶族自治县朝东镇福溪村',
    icp_number: '',
    copyright_text: ''
  };

  function initFooter() {
    var footer = document.getElementById('site-footer');
    if (!footer) return;

    renderFooter(defaults);
    loadConfig();
  }

  function loadConfig() {
    API.get('/config').then(function(result) {
      if (result.success && result.data) {
        var config = {};
        for (var key in defaults) {
          config[key] = result.data[key] || defaults[key];
        }
        renderFooter(config);
      }
    }).catch(function() {
      // 加载失败，保持默认
    });
  }

  function renderFooter(config) {
    var footer = document.getElementById('site-footer');
    if (!footer) return;

    var year = new Date().getFullYear();
    var copyright = config.copyright_text || ('© ' + year + ' ' + (config.site_name || '福溪村') + ' All Rights Reserved.');

    footer.innerHTML = '<div class="footer-content">' +
      '<div class="footer-brand">' +
        '<div class="footer-brand__name">' + Utils.escapeHtml(config.site_name || '福溪村') + '</div>' +
        '<p class="footer-brand__desc">' + Utils.escapeHtml(config.site_description || '') + '</p>' +
      '</div>' +
      '<div class="footer-section">' +
        '<h4 class="footer-section__title">快速导航</h4>' +
        '<div class="footer-links">' +
          '<a href="/about.html">走进福溪</a>' +
          '<a href="/culture.html">理学文化</a>' +
          '<a href="/scenery.html">古村风貌</a>' +
          '<a href="/travel.html">旅游指南</a>' +
        '</div>' +
      '</div>' +
      '<div class="footer-section">' +
        '<h4 class="footer-section__title">社区</h4>' +
        '<div class="footer-links">' +
          '<a href="/articles.html?category=village-news">新闻动态</a>' +
          '<a href="/articles.html">全部文章</a>' +
          '<a href="/articles.html?category=villager-stories">村民故事</a>' +
          '<a href="/gallery.html">图片画廊</a>' +
        '</div>' +
      '</div>' +
      '<div class="footer-section">' +
        '<h4 class="footer-section__title">联系我们</h4>' +
        '<div class="footer-links">' +
          (config.contact_email ? '<a href="mailto:' + Utils.escapeHtml(config.contact_email) + '">' + Utils.escapeHtml(config.contact_email) + '</a>' : '') +
          (config.contact_phone ? '<a href="tel:' + Utils.escapeHtml(config.contact_phone) + '">' + Utils.escapeHtml(config.contact_phone) + '</a>' : '') +
          (config.contact_address ? '<a href="#">' + Utils.escapeHtml(config.contact_address) + '</a>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '<span>' + copyright + '</span>' +
      (config.icp_number ? '<span>' + Utils.escapeHtml(config.icp_number) + '</span>' : '') +
      '<span><a href="/terms.html" style="color:inherit;">用户协议</a> | <a href="/privacy.html" style="color:inherit;">隐私政策</a></span>' +
    '</div>';
  }

  document.addEventListener('DOMContentLoaded', initFooter);
})();
