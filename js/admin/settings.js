// ========================================
// 文件说明：网站设置脚本
// 文件路径：js/admin/settings.js
// ========================================

(function() {
  'use strict';

  var DEFAULT_COLORS = {
    theme_primary_color: '#2d6a4f',
    theme_primary_light: '#40916c',
    theme_primary_bg: '#f0f7f4',
    theme_secondary_color: '#d4a373'
  };

  var memorialDates = [];

  function init() {
    if (!Admin.init()) return;
    loadConfig();
    setupColorPickers();
    setupMemorialDates();

    document.getElementById('btn-save').onclick = function() {
      saveConfig();
    };

    document.getElementById('btn-reset-colors').onclick = function() {
      resetColors();
    };
  }

  function setupColorPickers() {
    var colorInputs = document.querySelectorAll('.color-picker-input');
    colorInputs.forEach(function(input) {
      var textInput = document.querySelector('.color-picker-text[data-for="' + input.name + '"]');

      input.addEventListener('input', function() {
        if (textInput) textInput.value = input.value;
        previewTheme();
      });

      if (textInput) {
        textInput.addEventListener('input', function() {
          var val = textInput.value;
          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            input.value = val;
            previewTheme();
          }
        });
      }
    });
  }

  // 实时预览主题颜色
  function previewTheme() {
    if (!window.ThemeLoader) return;
    var config = {};
    Object.keys(DEFAULT_COLORS).forEach(function(key) {
      var input = document.querySelector('[name="' + key + '"]');
      if (input) config[key] = input.value;
    });
    config.theme_memorial_dates = JSON.stringify(memorialDates);
    var memorialMode = document.getElementById('theme_memorial_mode');
    config.theme_memorial_mode = memorialMode && memorialMode.checked ? 'true' : 'false';
    window.ThemeLoader.applyTheme(config);
  }

  function setupMemorialDates() {
    document.getElementById('btn-add-memorial').onclick = function() {
      var dateInput = document.getElementById('memorial-date-input');
      var date = dateInput.value;
      if (!date) return;
      if (memorialDates.indexOf(date) === -1) {
        memorialDates.push(date);
        memorialDates.sort();
        renderMemorialTags();
        previewTheme();
      }
      dateInput.value = '';
    };

    var memorialCheckbox = document.getElementById('theme_memorial_mode');
    if (memorialCheckbox) {
      memorialCheckbox.addEventListener('change', previewTheme);
    }
  }

  function renderMemorialTags() {
    var container = document.getElementById('memorial-dates-list');
    document.getElementById('theme_memorial_dates').value = JSON.stringify(memorialDates);

    if (memorialDates.length === 0) {
      container.innerHTML = '<span style="font-size:13px;color:var(--color-text-placeholder);">暂无设置纪念日</span>';
      return;
    }

    container.innerHTML = memorialDates.map(function(date) {
      return '<span class="memorial-tag">' +
        date +
        '<span class="memorial-tag__remove" data-date="' + date + '">&times;</span>' +
      '</span>';
    }).join('');

    container.querySelectorAll('.memorial-tag__remove').forEach(function(btn) {
      btn.onclick = function() {
        var d = btn.getAttribute('data-date');
        memorialDates = memorialDates.filter(function(item) { return item !== d; });
        renderMemorialTags();
        previewTheme();
      };
    });
  }

  function resetColors() {
    Object.keys(DEFAULT_COLORS).forEach(function(key) {
      var colorInput = document.querySelector('[name="' + key + '"]');
      var textInput = document.querySelector('.color-picker-text[data-for="' + key + '"]');
      if (colorInput) colorInput.value = DEFAULT_COLORS[key];
      if (textInput) textInput.value = DEFAULT_COLORS[key];
    });
    previewTheme();
    Toast.success('已恢复默认颜色');
  }

  async function loadConfig() {
    try {
      var result = await API.get('/admin/config');
      if (result.success) {
        var form = document.getElementById('config-form');
        var data = result.data;

        // 填充普通表单字段
        Object.keys(data).forEach(function(key) {
          var input = form.querySelector('[name="' + key + '"]');
          if (input && input.type !== 'color' && input.type !== 'hidden' && input.type !== 'checkbox') {
            input.value = data[key] || '';
          }
        });

        // 填充颜色选择器
        Object.keys(DEFAULT_COLORS).forEach(function(key) {
          var colorInput = document.querySelector('[name="' + key + '"]');
          var textInput = document.querySelector('.color-picker-text[data-for="' + key + '"]');
          var val = data[key] || DEFAULT_COLORS[key];
          if (colorInput) colorInput.value = val;
          if (textInput) textInput.value = val;
        });

        // 填充纪念日
        try {
          memorialDates = JSON.parse(data.theme_memorial_dates || '[]');
        } catch (e) {
          memorialDates = [];
        }
        renderMemorialTags();

        // 填充黑白模式开关
        var memorialMode = document.getElementById('theme_memorial_mode');
        if (memorialMode) {
          memorialMode.checked = data.theme_memorial_mode === 'true';
        }
      }
    } catch (e) {
      Toast.error('加载配置失败');
    }
  }

  async function saveConfig() {
    var form = document.getElementById('config-form');
    var data = Form.getData(form);
    var btn = document.getElementById('btn-save');

    // 收集颜色值
    Object.keys(DEFAULT_COLORS).forEach(function(key) {
      var input = document.querySelector('[name="' + key + '"]');
      if (input) data[key] = input.value;
    });

    // 收集纪念日
    data.theme_memorial_dates = JSON.stringify(memorialDates);

    // 收集黑白模式开关
    var memorialMode = document.getElementById('theme_memorial_mode');
    data.theme_memorial_mode = memorialMode.checked ? 'true' : 'false';

    Form.setLoading(btn, true);

    try {
      var result = await API.put('/admin/config', data);
      if (result.success) {
        Toast.success('设置保存成功');

        // 立即应用主题并更新缓存
        var themeConfig = {};
        themeConfig.theme_primary_color = data.theme_primary_color;
        themeConfig.theme_primary_light = data.theme_primary_light;
        themeConfig.theme_primary_bg = data.theme_primary_bg;
        themeConfig.theme_secondary_color = data.theme_secondary_color;
        themeConfig.theme_memorial_dates = data.theme_memorial_dates;
        themeConfig.theme_memorial_mode = data.theme_memorial_mode;

        try {
          localStorage.setItem('theme_config', JSON.stringify(themeConfig));
        } catch (e) {}

        if (window.ThemeLoader) {
          window.ThemeLoader.applyTheme(themeConfig);
        }
      } else {
        Toast.error(result.error?.message || '保存失败');
      }
    } catch (e) {
      Toast.error(e.message);
    } finally {
      Form.setLoading(btn, false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
