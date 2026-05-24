// ========================================
// 文件说明：提示消息组件
// 文件路径：js/common/toast.js
// ========================================

var Toast = (function() {
  'use strict';

  var container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:600;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    var icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
    var colors = {
      success: '#52b788',
      error: '#e63946',
      warning: '#e9c46a',
      info: '#457b9d'
    };

    var toast = document.createElement('div');
    toast.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:8px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;animation:slideUp 0.25s ease;min-width:240px;';

    var icon = document.createElement('span');
    icon.style.cssText = 'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;flex-shrink:0;background:' + colors[type];
    icon.textContent = icons[type];

    var text = document.createElement('span');
    text.style.cssText = 'color:#1a1a2e;';
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    getContainer().appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function() { toast.remove(); }, 300);
    }, duration);
  }

  return {
    success: function(msg, dur) { show(msg, 'success', dur); },
    error: function(msg, dur) { show(msg, 'error', dur); },
    warning: function(msg, dur) { show(msg, 'warning', dur); },
    info: function(msg, dur) { show(msg, 'info', dur); }
  };
})();
