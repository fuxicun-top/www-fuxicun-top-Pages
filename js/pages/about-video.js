// ========================================
// 文件说明：走进福溪页面视频播放器（图片框内播放，三级降级）
// 文件路径：js/pages/about-video.js
// ========================================

var AboutVideo = (function() {
  'use strict';

  var videoSources = [
    'https://finder.video.qq.com/251/20302/stodownload?encfilekey=Cvvj5Ix3eewK0tHtibORqcsqchXNh0Gf3sJcaYqC2rQAUBibl0LLq7UOedP9QW56ShgKYTgltAlBBictgicoiaPTHcadJvDC1ItD6TE1wVrggSt9aBjv5bE9tw3HQiaktaQuZh&token=2lt8WBSnjTkVz01Z1DjdzjNC9JIdH9qI8cHU0srAeC1QWhXqUOF1W8lJeGVw4rRHnqyGhqgTXK25PLVlqibPic4lUnHll0QhiaW7pLhFkrlBsQMxJ38X6icZCETujnunXRKALzGd9GLnFiaicR1KguhrhTC04azO5bELea40xShbA5S8I4qwjSPtQORq72q1rC2nnc8IXxwJzN0QbuaBGEW2Mw4nmMAxffqOSwrfHoEYnJxvo',
    '/cdn/videos/fuxicun.mp4',
    '/videos/fuxicun.mp4'
  ];

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
