// ========================================
// 文件说明：本地存储封装
// 文件路径：js/common/storage.js
// ========================================

var Storage = (function() {
  'use strict';

  var PREFIX = 'fuxicun_';

  function get(key) {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch (e) {
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  }

  function getObject(key) {
    try {
      var val = get(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      return null;
    }
  }

  function setObject(key, value) {
    set(key, JSON.stringify(value));
  }

  return {
    get: get,
    set: set,
    remove: remove,
    getObject: getObject,
    setObject: setObject
  };
})();
