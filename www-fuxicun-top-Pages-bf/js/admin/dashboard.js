// ========================================
// 文件说明：后台仪表盘脚本
// 文件路径：js/admin/dashboard.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (!Admin.init()) return;
    loadStats();
    loadRecentArticles();
  }

  async function loadStats() {
    try {
      var result = await API.get('/admin/stats');
      if (result.success) {
        var d = result.data;
        document.getElementById('stat-users').textContent = d.users || 0;
        document.getElementById('stat-articles').textContent = d.articles || 0;
        document.getElementById('stat-comments').textContent = d.comments || 0;
        document.getElementById('stat-views').textContent = d.totalViews || 0;
      }
    } catch (e) {
      console.error('加载统计失败:', e);
    }
  }

  async function loadRecentArticles() {
    try {
      var result = await API.get('/admin/recent-articles');
      if (result.success && result.data.length > 0) {
        var html = '<table class="simple-table"><thead><tr>' +
          '<th>标题</th><th>状态</th><th>发布时间</th></tr></thead><tbody>';

        result.data.forEach(function(article) {
          var statusClass = 'status-badge--' + article.status;
          var statusText = { published: '已发布', pending: '待审核', draft: '草稿' }[article.status] || article.status;

          html += '<tr>' +
            '<td><a href="/article-detail.html?id=' + article.id + '" style="color:var(--color-text-primary);">' +
              Utils.escapeHtml(Utils.truncate(article.title, 30)) + '</a></td>' +
            '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td>' + Utils.timeAgo(article.created_at) + '</td>' +
          '</tr>';
        });

        html += '</tbody></table>';
        document.getElementById('recent-articles').innerHTML = html;
      } else {
        document.getElementById('recent-articles').innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-placeholder);">暂无文章</p>';
      }
    } catch (e) {
      console.error('加载文章失败:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  // ==============================
  // 数据备份 - 导出为 JSON 文件下载
  // ==============================
  window.DashboardPage = {
    exportBackup: async function() {
      if (!confirm('确定要导出数据备份吗？文件将以 JSON 格式下载。')) return;

      try {
        Toast.info('正在生成备份文件...');
        var token = Auth.getToken();
        var response = await fetch('/api/admin/backup', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });

        if (!response.ok) {
          Toast.error('备份导出失败');
          return;
        }

        // 从响应头获取文件名
        var disposition = response.headers.get('Content-Disposition') || '';
        var filename = 'fuxicun-backup.json';
        var match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];

        // 触发浏览器下载
        var blob = await response.blob();
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Toast.success('备份文件已下载');
      } catch (e) {
        Toast.error('备份导出失败: ' + e.message);
      }
    },

    // 备份至云端 R2（用于异地容灾，与 GitHub Actions 定时任务共用同一接口）
    backupToR2: async function() {
      if (!confirm('确定要将当前数据库快照备份至云端 R2 吗？')) return;
      try {
        Toast.info('正在备份至云端...');
        var result = await API.post('/admin/backup/r2', {});
        if (result && result.success) {
          var data = result.data || {};
          Toast.success('云端备份成功：' + (data.key || '已上传'));
        } else {
          Toast.error((result && result.message) || '云端备份失败');
        }
      } catch (e) {
        Toast.error('云端备份失败: ' + e.message);
      }
    }
  };
})();
