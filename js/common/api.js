// ========================================
// 文件说明：API 调用封装
// 文件路径：js/common/api.js
// ========================================

var API = (function() {
  'use strict';

  function getHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    var token = Storage.get('token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  async function request(method, path, data) {
    var options = {
      method: method,
      headers: getHeaders()
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    var url = CONFIG.API_BASE + path;
    if (data && method === 'GET') {
      var params = new URLSearchParams();
      Object.keys(data).forEach(function(key) {
        if (data[key] !== undefined && data[key] !== null) {
          params.append(key, data[key]);
        }
      });
      var qs = params.toString();
      if (qs) url += '?' + qs;
    }

    var response = await fetch(url, options);
    var result = await response.json();

    if (response.status === 401) {
      Storage.remove('token');
      Storage.remove('user');
      window.location.href = '/login.html';
      return result;
    }

    if (!response.ok) {
      throw new Error(result.error?.message || '请求失败');
    }

    return result;
  }

  return {
    get: function(path, params) { return request('GET', path, params); },
    post: function(path, data) { return request('POST', path, data); },
    put: function(path, data) { return request('PUT', path, data); },
    del: function(path) { return request('DELETE', path); },
    'delete': function(path) { return request('DELETE', path); },

    upload: async function(file, type) {
      var token = Storage.get('token');
      var formData = new FormData();
      formData.append('file', file);
      if (type) formData.append('type', type);

      var endpoint = type === 'video' ? '/upload/video' : '/upload/image';
      var response = await fetch(CONFIG.API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });

      var result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || '上传失败');
      }
      return result;
    }
  };
})();
