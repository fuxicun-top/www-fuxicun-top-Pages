// ========================================
// 文件说明：表单验证组件
// 文件路径：js/components/form.js
// ========================================

var Form = (function() {
  'use strict';

  function validate(rules, data) {
    var errors = {};

    Object.keys(rules).forEach(function(field) {
      var rule = rules[field];
      var value = data[field];

      if (rule.required && (!value || !value.trim())) {
        errors[field] = rule.message || '此项为必填项';
        return;
      }

      if (value && rule.minLength && value.length < rule.minLength) {
        errors[field] = '最少输入' + rule.minLength + '个字符';
        return;
      }

      if (value && rule.maxLength && value.length > rule.maxLength) {
        errors[field] = '最多输入' + rule.maxLength + '个字符';
        return;
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.message || '格式不正确';
        return;
      }

      if (rule.confirm && value !== data[rule.confirm]) {
        errors[field] = '两次输入不一致';
      }
    });

    return errors;
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach(function(field) {
      var input = document.querySelector('[name="' + field + '"]');
      if (input) {
        input.classList.add('form-input--error');
        var error = document.createElement('div');
        error.className = 'form-error';
        error.textContent = errors[field];
        input.parentNode.appendChild(error);
      }
    });
  }

  function clearErrors() {
    document.querySelectorAll('.form-input--error').forEach(function(el) {
      el.classList.remove('form-input--error');
    });
    document.querySelectorAll('.form-error').forEach(function(el) {
      el.remove();
    });
  }

  function getData(formElement) {
    var data = {};
    var inputs = formElement.querySelectorAll('input, select, textarea');
    inputs.forEach(function(input) {
      if (input.name) {
        if (input.type === 'checkbox') {
          data[input.name] = input.checked;
        } else if (input.type === 'radio') {
          if (input.checked) data[input.name] = input.value;
        } else {
          data[input.name] = input.value;
        }
      }
    });
    return data;
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn._text = btn.textContent;
      btn.textContent = '加载中...';
    } else {
      btn.disabled = false;
      if (btn._text) btn.textContent = btn._text;
    }
  }

  return {
    validate: validate,
    showErrors: showErrors,
    clearErrors: clearErrors,
    getData: getData,
    setLoading: setLoading
  };
})();
