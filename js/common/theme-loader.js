// ========================================
// 文件说明：主题加载器 - 从配置动态应用主题颜色和纪念日黑白模式
// 文件路径：js/common/theme-loader.js
// ========================================

(function() {
  'use strict';

  // 默认颜色值（与 variables.css 一致）
  var DEFAULTS = {
    theme_primary_color: '#2d6a4f',
    theme_primary_light: '#40916c',
    theme_primary_bg: '#f0f7f4',
    theme_secondary_color: '#d4a373'
  };

  // 判断当前页面是否为后台管理页面
  var isAdminPage = window.location.pathname.indexOf('/admin/') === 0;

  // 从 localStorage 快速读取缓存的主题配置（避免闪烁）
  function applyCachedTheme() {
    try {
      var cached = localStorage.getItem('theme_config');
      if (cached) {
        var config = JSON.parse(cached);
        applyTheme(config);
      }
    } catch (e) {
      // 忽略缓存错误
    }
  }

  // 将十六进制颜色转换为 RGB 分量
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  // 基于主色调生成派生颜色
  function deriveColors(primary) {
    var rgb = hexToRgb(primary);
    // 生成 darker 版本（降低亮度 30%）
    var darkR = Math.max(0, Math.round(rgb.r * 0.7));
    var darkG = Math.max(0, Math.round(rgb.g * 0.7));
    var darkB = Math.max(0, Math.round(rgb.b * 0.7));
    // 生成 lighter 版本（提高亮度 20%）
    var lightR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.2));
    var lightG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.2));
    var lightB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.2));

    return {
      dark: '#' + [darkR, darkG, darkB].map(function(c) { return c.toString(16).padStart(2, '0'); }).join(''),
      light: '#' + [lightR, lightG, lightB].map(function(c) { return c.toString(16).padStart(2, '0'); }).join('')
    };
  }

  // 应用主题颜色到 CSS 变量
  function applyTheme(config) {
    var root = document.documentElement;
    var primary = config.theme_primary_color || DEFAULTS.theme_primary_color;
    var primaryLight = config.theme_primary_light || DEFAULTS.theme_primary_light;
    var primaryBg = config.theme_primary_bg || DEFAULTS.theme_primary_bg;
    var secondary = config.theme_secondary_color || DEFAULTS.theme_secondary_color;

    var derived = deriveColors(primary);

    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-light', primaryLight);
    root.style.setProperty('--color-primary-lighter', derived.light);
    root.style.setProperty('--color-primary-dark', derived.dark);
    root.style.setProperty('--color-primary-bg', primaryBg);
    root.style.setProperty('--color-secondary', secondary);

    // 纪念日黑白模式仅对前台公开页面生效
    if (isAdminPage) {
      root.classList.remove('memorial-mode');
      root.style.removeProperty('--memorial-filter');
      return;
    }

    var memorialMode = config.theme_memorial_mode === 'true';
    var isMemorialDay = false;

    if (!memorialMode) {
      // 检查当前日期是否在纪念日列表中
      try {
        var dates = JSON.parse(config.theme_memorial_dates || '[]');
        var today = new Date();
        var todayStr = today.getFullYear() + '-' +
          String(today.getMonth() + 1).padStart(2, '0') + '-' +
          String(today.getDate()).padStart(2, '0');
        isMemorialDay = dates.indexOf(todayStr) !== -1;
      } catch (e) {
        // 忽略解析错误
      }
    }

    if (memorialMode || isMemorialDay) {
      root.classList.add('memorial-mode');
    } else {
      root.classList.remove('memorial-mode');
    }
  }

  // 立即应用缓存的主题（同步，无闪烁）
  applyCachedTheme();

  // 异步获取最新配置并更新
  function fetchAndApplyTheme() {
    fetch('/api/config')
      .then(function(response) { return response.json(); })
      .then(function(result) {
        if (result.success && result.data) {
          var config = result.data;
          applyTheme(config);
          // 缓存到 localStorage
          try {
            localStorage.setItem('theme_config', JSON.stringify(config));
          } catch (e) {
            // 忽略存储错误
          }
        }
      })
      .catch(function() {
        // 网络错误时使用缓存的配置
      });
  }

  // 页面加载后获取最新配置
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApplyTheme);
  } else {
    fetchAndApplyTheme();
  }

  // 暴露接口供其他脚本调用（如后台设置页面保存后立即应用主题）
  window.ThemeLoader = {
    applyTheme: applyTheme,
    refresh: fetchAndApplyTheme
  };
})();
