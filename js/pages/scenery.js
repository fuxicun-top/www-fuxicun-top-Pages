// ========================================
// 文件说明：古村风貌页脚本
// 文件路径：js/pages/scenery.js
// ========================================

(function() {
  'use strict';

  function init() {
    loadSections();
    loadRelatedArticles();
  }

  async function loadSections() {
    try {
      var result = await API.get('/page-sections', { slug: 'scenery' });
      if (result.success && result.data && result.data.length > 0) {
        result.data.forEach(function(section) {
          if (section.title) {
            var titleEl = document.querySelector('[data-section-title="' + section.section_key + '"]');
            if (titleEl) titleEl.textContent = section.title;
          }
          var el = document.querySelector('[data-section="' + section.section_key + '"]');
          if (el && section.content) {
            el.innerHTML = section.content;
          }
        });
      }
    } catch (e) { /* API 不可用 */ }
  }

  async function loadRelatedArticles() {
    var container = document.getElementById('related-articles');
    if (!container) return;

    try {
      var result = await API.get('/page-articles', { slug: 'scenery' });
      if (result.success && result.data && result.data.articles && result.data.articles.length > 0) {
        renderArticles(container, result.data.articles);
        return;
      }
    } catch (e) { /* API 不可用 */ }
    var section = container.closest('.content-section');
    if (section) section.style.display = 'none';
  }

  function renderArticles(container, articles) {
    container.innerHTML = articles.map(function(article) {
      var date = Utils.formatDate(article.published_at || article.created_at);
      var cover = article.cover_image || '/images/default-cover.svg';
      var url = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;

      return '<div class="article-item">' +
        '<img src="' + cover + '" alt="' + Utils.escapeHtml(article.title) + '" class="article-item__image" loading="lazy">' +
        '<div class="article-item__content">' +
          '<h3 class="article-item__title"><a href="' + url + '">' + Utils.escapeHtml(article.title) + '</a></h3>' +
          '<p class="article-item__excerpt">' + Utils.escapeHtml(article.excerpt || '') + '</p>' +
          '<div class="article-item__meta">' +
            '<span>' + Utils.escapeHtml(article.author_name || '匿名') + '</span>' +
            '<span>' + date + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
