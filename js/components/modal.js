// ========================================
// 文件说明：弹窗组件
// 文件路径：js/components/modal.js
// ========================================

var Modal = (function() {
  'use strict';

  function show(options) {
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    var modal = document.createElement('div');
    modal.className = 'modal' + (options.className ? ' ' + options.className : '');

    var html = '<div class="modal-header">' +
      '<h3 class="modal-title">' + Utils.escapeHtml(options.title || '提示') + '</h3>' +
      '<button class="modal-close" onclick="Modal.close()">&times;</button>' +
    '</div>';

    html += '<div class="modal-body">' + (options.content || '') + '</div>';

    if (options.showFooter !== false) {
      html += '<div class="modal-footer">';
      if (options.showCancel !== false) {
        html += '<button class="btn btn-outline" onclick="Modal.close()">' + (options.cancelText || '取消') + '</button>';
      }
      if (options.onConfirm) {
        html += '<button class="btn btn-primary" id="modal-confirm-btn">' + (options.confirmText || '确定') + '</button>';
      }
      html += '</div>';
    }

    modal.innerHTML = html;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    if (options.onConfirm) {
      document.getElementById('modal-confirm-btn').onclick = function() {
        options.onConfirm();
        if (options.closeOnConfirm !== false) close();
      };
    }

    backdrop.onclick = function(e) {
      if (e.target === backdrop) close();
    };

    return backdrop;
  }

  function confirm(message, onConfirm, options) {
    options = options || {};
    return show({
      title: options.title || '确认操作',
      content: '<div class="modal-confirm"><div class="modal-icon">&#9888;</div><p class="modal-message">' + message + '</p></div>',
      onConfirm: onConfirm,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      className: 'modal-confirm'
    });
  }

  function close() {
    var backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.remove();
  }

  return {
    show: show,
    confirm: confirm,
    close: close
  };
})();
