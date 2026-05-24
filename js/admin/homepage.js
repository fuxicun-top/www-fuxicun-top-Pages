// ========================================
// 文件说明：首页配置页面脚本
// 文件路径：js/admin/homepage.js
// ========================================

(function() {
  'use strict';

  var articlesList = [];

  function init() {
    if (!Admin.init()) return;
    loadConfig();
  }

  async function loadConfig() {
    try {
      var result = await API.get('/admin/homepage');
      if (!result.success) {
        Toast.error('加载配置失败');
        return;
      }

      var data = result.data;
      articlesList = data.articles || [];

      var featured = JSON.parse(data.home_featured || '{}');
      var news = JSON.parse(data.home_news || '{}');

      renderPositions('featured-positions', featured, 5, '自动（按点赞排行）');
      renderPositions('news-positions', news, 4, '自动（最新发布）');
    } catch (e) {
      Toast.error('加载配置失败: ' + e.message);
    }
  }

  function renderPositions(containerId, config, count, autoLabel) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '';
    for (var i = 1; i <= count; i++) {
      var selectedId = config[String(i)] || '';
      html += '<div class="position-row">' +
        '<label>位置 ' + i + '</label>' +
        '<select class="form-input" id="' + containerId + '-' + i + '">' +
          '<option value="">' + autoLabel + '</option>' +
          renderArticleOptions(selectedId) +
        '</select>' +
      '</div>';
    }
    container.innerHTML = html;
  }

  function renderArticleOptions(selectedId) {
    return articlesList.map(function(a) {
      var label = a.title;
      if (a.category_name) label = '[' + a.category_name + '] ' + label;
      var selected = a.id === selectedId ? ' selected' : '';
      return '<option value="' + a.id + '"' + selected + '>' + Utils.escapeHtml(Utils.truncate(label, 50)) + '</option>';
    }).join('');
  }

  async function save() {
    var featured = {};
    for (var i = 1; i <= 5; i++) {
      var val = document.getElementById('featured-positions-' + i).value;
      featured[String(i)] = val ? parseInt(val) : null;
    }

    var news = {};
    for (var j = 1; j <= 4; j++) {
      var val2 = document.getElementById('news-positions-' + j).value;
      news[String(j)] = val2 ? parseInt(val2) : null;
    }

    try {
      var result = await API.put('/admin/homepage', {
        home_featured: JSON.stringify(featured),
        home_news: JSON.stringify(news)
      });

      if (result.success) {
        Toast.success('首页配置已保存');
      } else {
        Toast.error(result.error?.message || '保存失败');
      }
    } catch (e) {
      Toast.error('保存失败: ' + e.message);
    }
  }

  window.HomepageConfig = {
    save: save
  };

  document.addEventListener('DOMContentLoaded', init);
})();
