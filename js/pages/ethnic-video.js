// ========================================
// 文件说明：民族文化页面视频播放器（弹窗播放，三级降级）
// 文件路径：js/pages/ethnic-video.js
// ========================================

var EthnicVideo = (function() {
  'use strict';

  // 视频源（按优先级排列：在线CDN → R2 → 静态文件）
  var videoSources = [
    // 'https://your-cdn-url/fxccths.mp4',  // 在线链接（待CDN托管后填入）
    'https://newcntv.qcloudcdn.com/asp/hls/main/0303000a/3/default/f726d0dc2533498798ccc566d90bdcb1/main.m3u8?maxbr=2048',
    '/cdn/videos/fxccths.mp4',
    '/videos/fxccths.mp4'
  ].filter(function(s) { return s; });

  var LOAD_TIMEOUT = 8000;
  var player = null;
  var modal = null;

  function play() {
    modal = document.getElementById('ethnic-video-modal');
    player = document.getElementById('ethnic-video-player');
    if (!modal || !player) return;

    // 先恢复状态再打开
    player.pause();
    player.removeAttribute('src');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    trySource(0);
  }

  function trySource(index) {
    if (index >= videoSources.length) {
      close();
      return;
    }

    var loaded = false;
    var timer = null;

    player.onloadedmetadata = function() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      player.play().catch(function() {});
    };

    player.onerror = function() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      trySource(index + 1);
    };

    player.src = videoSources[index];

    timer = setTimeout(function() {
      if (!loaded) {
        loaded = true;
        player.onloadedmetadata = null;
        player.onerror = null;
        trySource(index + 1);
      }
    }, LOAD_TIMEOUT);
  }

  function close(event) {
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('video-modal__close')) {
      return;
    }
    if (modal && modal.classList.contains('is-open')) {
      modal.classList.remove('is-open');
      player.pause();
      player.removeAttribute('src');
      player.onloadedmetadata = null;
      player.onerror = null;
      document.body.style.overflow = '';
    }
  }

  return { play: play, close: close };
})();
