// ========================================
// 文件说明：视频库页脚本
// 文件路径：js/pages/videos.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;

  function init() {
    loadVideos();
    bindEvents();
  }

  function bindEvents() {
    // 点击弹窗背景关闭
    document.getElementById('video-modal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    // ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  async function loadVideos() {
    var container = document.getElementById('videos-list');
    container.innerHTML = '<div class="skeleton" style="height:240px;border-radius:var(--radius-lg);"></div>'.repeat(3);

    try {
      var result = await API.get('/media', { type: 'video', page: currentPage, pageSize: 12 });
      if (result.success) {
        if (result.data.list && result.data.list.length > 0) {
          renderVideos(result.data.list);
          renderPagination(result.data.total, result.data.page, result.data.pageSize);
        } else {
          container.innerHTML = '<div class="empty-state">暂无视频，敬请期待</div>';
        }
      } else {
        container.innerHTML = '<div class="empty-state">暂无视频，敬请期待</div>';
      }
    } catch (e) {
      // API 失败，显示友好提示
      container.innerHTML = '<div class="empty-state">暂无视频，敬请期待</div>';
    }
  }

  function renderVideos(items) {
    var container = document.getElementById('videos-list');
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无视频</div>';
      return;
    }

    container.innerHTML = items.map(function(item) {
      var url = item.url || '/cdn/' + item.filename;
      var name = item.original_name || item.filename || '';
      var date = Utils.formatDate(item.created_at);

      return '<div class="video-card" onclick="VideosPage.playVideo(\'' + url + '\', \'' + Utils.escapeHtml(name).replace(/'/g, "\\'") + '\')">' +
        '<div class="video-card__thumbnail">' +
          '<img src="/images/default-video-cover.svg" alt="' + Utils.escapeHtml(name) + '" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22><rect fill=%22%23222%22 width=%22320%22 height=%22180%22/><text x=%22160%22 y=%2296%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2248%22>&#9654;</text></svg>\'">' +
          '<div class="video-card__play"><div class="video-card__play-icon">&#9654;</div></div>' +
        '</div>' +
        '<div class="video-card__body">' +
          '<h3 class="video-card__title">' + Utils.escapeHtml(name) + '</h3>' +
          '<div class="video-card__meta"><span>' + date + '</span></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderPagination(total, page, pageSize) {
    var container = document.getElementById('pagination');
    if (typeof Pagination !== 'undefined' && total > pageSize) {
      Pagination.render(container, total, page, pageSize, function(newPage) {
        currentPage = newPage;
        loadVideos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function playVideo(url, title) {
    var player = document.getElementById('video-player');
    var modal = document.getElementById('video-modal');
    player.src = url;
    document.getElementById('video-title').textContent = title;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    player.play();
  }

  function closeModal() {
    var player = document.getElementById('video-player');
    var modal = document.getElementById('video-modal');
    player.pause();
    player.src = '';
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.VideosPage = {
    playVideo: playVideo,
    closeModal: closeModal
  };

  document.addEventListener('DOMContentLoaded', init);
})();
