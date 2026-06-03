// ========================================
// 文件说明：理学文化页面视频播放器（图片框内播放，三级降级）
// 文件路径：js/pages/culture-video.js
// ========================================

var CultureVideo = (function() {
  'use strict';

  // 视频源（按优先级排列）
  var videoSources = [
    'https://vd2.bdstatic.com/mda-qchb5r6juczep70a/sc/cae_h264/1710838361992158161/mda-qchb5r6juczep70a.mp4',
    '/cdn/videos/zhoudunyi.mp4',
    '/videos/zhoudunyi.mp4'
  ];

  var currentSource = 0;
  var isPlaying = false;

  function play() {
    var container = document.querySelector('.video-trigger');
    if (!container || isPlaying) return;

    isPlaying = true;
    var img = container.querySelector('img');
    var overlay = container.querySelector('.video-trigger__overlay');

    // 创建 video 元素
    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.style.width = '100%';
    video.style.display = 'block';
    video.style.borderRadius = 'inherit';

    // 三级降级加载
    currentSource = 0;

    function loadSource(index) {
      if (index >= videoSources.length) {
        isPlaying = false;
        return;
      }
      video.src = videoSources[index];
      video.onerror = function() {
        currentSource++;
        loadSource(currentSource);
      };
    }

    // 等视频可以播放后自动开始
    video.addEventListener('canplay', function onCanPlay() {
      video.removeEventListener('canplay', onCanPlay);
      video.play().catch(function() {});
    });

    loadSource(currentSource);

    // 隐藏图片和播放按钮，显示视频
    if (img) img.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    container.appendChild(video);
  }

  return {
    play: play
  };
})();
