// ========================================
// 文件说明：安装页面脚本
// 文件路径：js/pages/install.js
// ========================================

(function() {
  'use strict';

  var currentStep = 1;
  var configData = {};

  async function init() {
    // 检查是否已安装
    try {
      var result = await API.get('/install/check');
      if (result.success && result.data.installed) {
        showAlreadyInstalled();
        return;
      }
    } catch (e) {
      // API 可能还未部署，继续安装流程
    }

    setupEvents();
  }

  function showAlreadyInstalled() {
    document.querySelector('.install-steps').style.display = 'none';
    document.querySelectorAll('.install-panel').forEach(function(p) {
      p.classList.remove('active');
    });
    var panel = document.getElementById('step-5');
    panel.classList.add('active');
    panel.querySelector('.install-panel__title').textContent = '系统已安装';
    panel.querySelector('.install-panel__desc').textContent = '如需重新安装，请先清空数据库';
    document.getElementById('success-info').innerHTML = '';
  }

  function setupEvents() {
    document.getElementById('btn-next-1').onclick = function() { goToStep(2); };
    document.getElementById('btn-prev-2').onclick = function() { goToStep(1); };
    document.getElementById('btn-next-2').onclick = function() { goToStep(3); };
    document.getElementById('btn-prev-3').onclick = function() { goToStep(2); };
    document.getElementById('btn-init-db').onclick = function() { initDatabase(); };
    document.getElementById('btn-prev-4').onclick = function() { goToStep(3); };
    document.getElementById('btn-install').onclick = function() { createAdmin(); };
  }

  function goToStep(step) {
    currentStep = step;

    // 更新步骤条
    document.querySelectorAll('.step').forEach(function(s, i) {
      var stepNum = i + 1;
      s.classList.remove('active', 'completed');
      if (stepNum < step) s.classList.add('completed');
      if (stepNum === step) s.classList.add('active');
    });

    // 更新连接线
    document.querySelectorAll('.step__line').forEach(function(line, i) {
      line.classList.remove('active', 'completed');
      if (i < step - 1) line.classList.add('completed');
      if (i === step - 2) line.classList.add('active');
    });

    // 切换面板
    document.querySelectorAll('.install-panel').forEach(function(p) {
      p.classList.remove('active');
    });
    document.getElementById('step-' + step).classList.add('active');

    // 步骤2自动运行连接测试
    if (step === 2) runConnectionTest();
  }

  // 步骤2：连接测试
  async function runConnectionTest() {
    var form = document.getElementById('config-form');
    var data = Form.getData(form);
    configData = data;

    var items = document.querySelectorAll('#conn-checks .env-item');
    document.getElementById('btn-next-2').disabled = true;

    // 重置状态
    items.forEach(function(item) {
      item.classList.remove('success', 'error');
      item.querySelector('.env-icon').textContent = '⏳';
      item.querySelector('.env-status').textContent = '测试中...';
    });

    try {
      var result = await API.post('/install/test-bindings', {
        d1Binding: data.d1Binding,
        kvBinding: data.kvBinding,
        r2Binding: data.r2Binding
      });

      if (result.success) {
        var r = result.data;

        updateCheckItem(items[0], r.d1.success, r.d1.success ? '连接正常' : r.d1.error);
        updateCheckItem(items[1], r.kv.success, r.kv.success ? '连接正常' : r.kv.error);
        updateCheckItem(items[2], r.r2.success, r.r2.success ? '连接正常' : r.r2.error);

        if (r.d1.success && r.kv.success && r.r2.success) {
          document.getElementById('btn-next-2').disabled = false;
        }
      } else {
        items.forEach(function(item) {
          updateCheckItem(item, false, '测试失败');
        });
      }
    } catch (e) {
      items.forEach(function(item) {
        updateCheckItem(item, false, '请求失败: ' + e.message);
      });
    }
  }

  function updateCheckItem(item, success, message) {
    item.classList.remove('success', 'error');
    item.classList.add(success ? 'success' : 'error');
    item.querySelector('.env-icon').textContent = success ? '✓' : '✕';
    item.querySelector('.env-status').textContent = message;
  }

  // 步骤3：初始化数据库
  async function initDatabase() {
    var btn = document.getElementById('btn-init-db');
    btn.disabled = true;
    btn.textContent = '初始化中...';

    document.getElementById('db-init-status').style.display = 'block';

    var createStatus = document.getElementById('db-create-status');
    var seedStatus = document.getElementById('db-seed-status');

    // 创建数据表
    try {
      var result = await API.post('/install/init-db', {
        d1Binding: configData.d1Binding,
        kvBinding: configData.kvBinding,
        r2Binding: configData.r2Binding
      });

      if (result.success) {
        updateCheckItem(createStatus, true, '创建成功');
        updateCheckItem(seedStatus, true, '插入成功');

        btn.textContent = '初始化完成';
        btn.style.display = 'none';

        // 显示下一步按钮
        var nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary btn-lg';
        nextBtn.textContent = '下一步';
        nextBtn.onclick = function() { goToStep(4); };
        btn.parentNode.appendChild(nextBtn);
      } else {
        updateCheckItem(createStatus, false, result.error?.message || '创建失败');
        btn.disabled = false;
        btn.textContent = '重试';
      }
    } catch (e) {
      updateCheckItem(createStatus, false, '失败: ' + e.message);
      btn.disabled = false;
      btn.textContent = '重试';
    }
  }

  // 步骤4：创建管理员
  async function createAdmin() {
    var form = document.getElementById('admin-form');
    var data = Form.getData(form);

    var rules = {
      adminUsername: { required: true, minLength: 2, maxLength: 20, message: '用户名长度为2-20个字符' },
      adminPassword: { required: true, minLength: 8, message: '密码长度不能少于8位' },
      adminPasswordConfirm: { required: true, confirm: 'adminPassword', message: '两次密码不一致' },
      adminPhone: { required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
    };

    var errors = Form.validate(rules, data);
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-install');
    Form.setLoading(btn, true);

    try {
      var result = await API.post('/install/create-admin', {
        d1Binding: configData.d1Binding,
        adminUsername: data.adminUsername,
        adminPassword: data.adminPassword,
        adminPhone: data.adminPhone,
        adminEmail: data.adminEmail
      });

      if (result.success) {
        goToStep(5);
        document.getElementById('success-info').innerHTML =
          '<p><strong>后台地址：</strong><a href="' + result.data.adminUrl + '">' + result.data.adminUrl + '</a></p>' +
          '<p><strong>管理员账号：</strong>' + Utils.escapeHtml(result.data.username) + '</p>' +
          '<p style="color:var(--color-danger);margin-top:8px;">请妥善保管以上信息！</p>';
      } else {
        Toast.error(result.error?.message || '创建失败');
      }
    } catch (e) {
      Toast.error(e.message || '创建失败');
    } finally {
      Form.setLoading(btn, false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
