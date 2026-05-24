// ========================================
// 文件说明：分页组件
// 文件路径：js/components/pagination.js
// ========================================

var Pagination = (function() {
  'use strict';

  /**
   * 渲染分页组件
   * 支持两种调用方式：
   * 后台：Pagination.render('pagination', page, totalPages, 'PageName.goToPage')
   * 前台：Pagination.render(container, total, page, pageSize, function(newPage) {...})
   */
  function render(containerIdOrEl, pageOrTotal, totalPagesOrPage, onPageChangeOrPageSize, maybeCallback) {
    var container;
    var page;
    var totalPages;
    var onPageChange;

    // 判断调用方式：第5个参数存在说明是前台调用
    if (typeof maybeCallback === 'function') {
      // 前台调用：render(container, total, page, pageSize, callback)
      container = containerIdOrEl;
      var total = pageOrTotal;
      page = totalPagesOrPage;
      var pageSize = onPageChangeOrPageSize;
      onPageChange = maybeCallback;
      totalPages = Math.ceil(total / pageSize) || 1;
    } else if (typeof maybeCallback === 'string') {
      // 前台调用变体：render(container, total, page, pageSize, 'funcName')
      container = containerIdOrEl;
      var total = pageOrTotal;
      page = totalPagesOrPage;
      var pageSize = onPageChangeOrPageSize;
      totalPages = Math.ceil(total / pageSize) || 1;
      onPageChange = function(p) { if (typeof window[maybeCallback] === 'function') window[maybeCallback](p); };
    } else {
      // 后台调用：render('pagination', page, totalPages, 'PageName.goToPage')
      var containerId = containerIdOrEl;
      container = document.getElementById(containerId);
      page = pageOrTotal;
      totalPages = totalPagesOrPage;
      var funcName = onPageChangeOrPageSize;
      onPageChange = function(p) { if (typeof window[funcName] === 'function') window[funcName](p); };
    }

    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    var pages = Utils.generatePagination(page, totalPages);
    var html = '';

    html += '<div class="pagination__item' + (page <= 1 ? ' pagination__item--disabled' : '') + '" ' +
      (page > 1 ? 'data-page="' + (page - 1) + '"' : '') + '>&laquo;</div>';

    pages.forEach(function(p) {
      if (p === '...') {
        html += '<span class="pagination__info">...</span>';
      } else {
        html += '<div class="pagination__item' + (p === page ? ' pagination__item--active' : '') + '" ' +
          'data-page="' + p + '">' + p + '</div>';
      }
    });

    html += '<div class="pagination__item' + (page >= totalPages ? ' pagination__item--disabled' : '') + '" ' +
      (page < totalPages ? 'data-page="' + (page + 1) + '"' : '') + '>&raquo;</div>';

    container.innerHTML = html;

    // 使用事件委托绑定点击事件
    container.onclick = function(e) {
      var target = e.target.closest('[data-page]');
      if (target && !target.classList.contains('pagination__item--disabled')) {
        var newPage = parseInt(target.getAttribute('data-page'));
        if (newPage && onPageChange) {
          onPageChange(newPage);
        }
      }
    };
  }

  return { render: render };
})();
