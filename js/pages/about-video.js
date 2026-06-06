// ========================================
// 文件说明：走进福溪页面视频播放器（图片框内播放，三级降级）
// 文件路径：js/pages/about-video.js
// ========================================

var AboutVideo = (function() {
  'use strict';

  // 视频源（按优先级排列：在线CDN → R2 → 静态文件）
  var videoSources = [
    // 'https://your-cdn-url/fuxicun.mp4',  // 在线链接（待CDN托管后填入）
    '/cdn/videos/fuxicun.mp4',
    '/videos/fuxicun.mp4'
  ].filter(function(s) { return s; });

  var LOAD_TIMEOUT = 8000;
  var isPlaying = false;

  function play() {
    var container = document.querySelector('.video-trigger');
    if (!container || isPlaying) return;

    isPlaying = true;
    var img = container.querySelector('img');
    var overlay = container.querySelector('.video-trigger__overlay');

    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.style.width = '100%';
    video.style.display = 'block';
    video.style.borderRadius = 'inherit';

    if (img) img.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    container.appendChild(video);

    trySource(video, 0);
  }

  function trySource(video, index) {
    if (index >= videoSources.length) {
      isPlaying = false;
      return;
    }

    var loaded = false;
    var timer = null;

    video.onloadedmetadata = function() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      video.play().catch(function() {});
    };

    video.onerror = function() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      trySource(video, index + 1);
    };

    video.src = videoSources[index];

    timer = setTimeout(function() {
      if (!loaded) {
        loaded = true;
        video.onloadedmetadata = null;
        video.onerror = null;
        trySource(video, index + 1);
      }
    }, LOAD_TIMEOUT);
  }

  return { play: play };
})();
