// ========================================
// 文件说明：数据库管理页面脚本
// 文件路径：js/admin/database.js
// ========================================

var Database = (function() {
  'use strict';

  var pendingFile = null;

  function init() {
    if (!Admin.init()) return;
  }

  // 导出备份
  async function exportBackup(format) {
    format = format || 'json';
    var btnId = format === 'sql' ? 'btn-export-sql' : 'btn-export';
    var btn = document.getElementById(btnId);
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '导出中...';

    try {
      var token = Auth.getToken();
      var response = await fetch(CONFIG.API_BASE + '/admin/database/export?format=' + format, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!response.ok) {
        var err = await response.json();
        throw new Error(err.message || '导出失败');
      }

      var blob = await response.blob();
      var disposition = response.headers.get('Content-Disposition') || '';
      var match = disposition.match(/filename="(.+)"/);
      var filename = match ? match[1] : 'fuxicun-backup.json';

      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      Toast.success('备份文件已下载');
    } catch (e) {
      Toast.error(e.message || '导出失败');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // 文件选择
  function handleFileSelect(input) {
    if (input.files && input.files[0]) {
      pendingFile = input.files[0];
      document.getElementById('import-filename').textContent = pendingFile.name;

      Modal.show({
        title: '确认导入恢复',
        content: '<p style="color:var(--color-text-secondary);font-size:14px;">即将导入备份文件：<strong>' + Utils.escapeHtml(pendingFile.name) + '</strong></p>' +
          '<p style="color:#e74c3c;font-size:14px;margin-top:8px;">当前所有数据将被覆盖，此操作不可恢复！</p>',
        confirmText: '确认导入',
        onConfirm: function() { doImport(); }
      });
    }
  }

  // 执行导入
  async function doImport() {
    if (!pendingFile) return;

    try {
      var text = await pendingFile.text();
      var data = JSON.parse(text);

      var result = await API.post('/admin/database/import', { data: data });

      if (result.success) {
        Toast.success('数据导入成功，共导入 ' + result.data.imported + ' 条记录');
        pendingFile = null;
        document.getElementById('import-file').value = '';
        document.getElementById('import-filename').textContent = '';
      } else {
        Toast.error(result.message || '导入失败');
      }
    } catch (e) {
      Toast.error('导入失败：' + e.message);
    }
  }

  // 重置数据
  function clearData() {
    Modal.show({
      title: '确认重置数据',
      content: '<p style="color:var(--color-text-secondary);font-size:14px;">将清除所有内容数据并恢复为网站默认数据。</p>' +
        '<p style="color:var(--color-text-secondary);font-size:14px;margin-top:8px;">管理员账号和安装管理密码将保留不变。</p>',
      confirmText: '确认重置',
      onConfirm: function() { doClearData(); }
    });
  }

  async function doClearData() {
    try {
      var result = await API.post('/admin/database/clear', {});
      if (result.success) {
        Toast.success('数据已重置为默认状态');
      } else {
        Toast.error(result.message || '重置失败');
      }
    } catch (e) {
      Toast.error(e.message || '清空失败');
    }
  }

  // 重装网站
  function reinstall() {
    Modal.show({
      title: '重新安装网站',
      content: '<p style="color:var(--color-text-secondary);font-size:14px;margin-bottom:16px;">验证管理员密码后将清空所有数据并重新初始化网站。</p>' +
        '<p style="color:#e74c3c;font-size:14px;margin-bottom:16px;">此操作不可恢复！所有数据将被清除并恢复为默认状态。</p>' +
        '<div class="form-group">' +
          '<label class="form-label">请输入管理员密码确认</label>' +
          '<input type="password" id="reinstall-password" class="form-input" placeholder="输入当前管理员密码">' +
        '</div>',
      confirmText: '确认重装',
      closeOnConfirm: false,
      onConfirm: function() { doReinstall(); }
    });
  }

  async function doReinstall() {
    var password = document.getElementById('reinstall-password').value;
    if (!password) {
      Toast.error('请输入管理员密码');
      return;
    }

    var btn = document.getElementById('modal-confirm-btn');
    btn.disabled = true;
    btn.textContent = '重装中...';

    try {
      var result = await API.post('/admin/database/reinstall', { password: password });
      if (result.success) {
        Toast.success('数据库已清空，即将进入安装流程...');
        Modal.close();
        setTimeout(function() {
          window.location.href = '/install.html';
        }, 1500);
      } else {
        Toast.error(result.message || '重装失败');
        btn.disabled = false;
        btn.textContent = '确认重装';
      }
    } catch (e) {
      Toast.error(e.message || '重装失败');
      btn.disabled = false;
      btn.textContent = '确认重装';
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    exportBackup: exportBackup,
    handleFileSelect: handleFileSelect,
    clearData: clearData,
    reinstall: reinstall
  };
})();
