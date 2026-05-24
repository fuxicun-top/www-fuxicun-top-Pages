// ========================================
// 文件说明：图片画廊页脚本
// 文件路径：js/pages/gallery.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;
  var images = [];
  var currentIndex = 0;

  function init() {
    loadGallery();
    bindKeyboard();
  }

  // 默认图片画廊（API 不可用时显示）
  var defaultGalleryImages = [
    { url: '/images/scenery/ancient-architecture.svg', name: '古建筑群' },
    { url: '/images/culture/ai-lian-tang.svg', name: '爱莲堂' },
    { url: '/images/culture/zhou-dunyi.svg', name: '周敦颐像' },
    { url: '/images/ethnic/yao-people.svg', name: '瑶族风情' },
    { url: '/images/ethnic/costume.svg', name: '瑶族服饰' },
    { url: '/images/about/village-overview.svg', name: '福溪全景' }
  ];

  async function loadGallery() {
    var container = document.getElementById('gallery-list');
    container.innerHTML = '<div class="skeleton" style="height:240px;border-radius:var(--radius-lg);"></div>'.repeat(4);

    try {
      var result = await API.get('/media', { type: 'image', page: currentPage, pageSize: 40 });
      if (result.success) {
        images = result.data.list || [];
        if (images.length > 0) {
          renderGallery(images);
          renderPagination(result.data.total, result.data.page, result.data.pageSize);
        } else {
          // 无上传图片，显示默认画廊
          images = defaultGalleryImages;
          renderGallery(images);
        }
      } else {
        images = defaultGalleryImages;
        renderGallery(images);
      }
    } catch (e) {
      // API 失败，显示默认画廊
      images = defaultGalleryImages;
      renderGallery(images);
    }
  }

  function renderGallery(items) {
    var container = document.getElementById('gallery-list');
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无图片</div>';
      return;
    }

    container.innerHTML = items.map(function(item, index) {
      var url = item.url || '/cdn/' + item.filename;
      var name = item.original_name || item.filename || '';

      return '<div class="gallery-masonry__item" onclick="GalleryPage.openLightbox(' + index + ')">' +
        '<img src="' + url + '" alt="' + Utils.escapeHtml(name) + '" loading="lazy">' +
        '<div class="gallery-masonry__overlay">' +
          '<div class="gallery-masonry__name">' + Utils.escapeHtml(name) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderPagination(total, page, pageSize) {
    var container = document.getElementById('pagination');
    if (typeof Pagination !== 'undefined' && total > pageSize) {
      Pagination.render(container, total, page, pageSize, function(newPage) {
        currentPage = newPage;
        loadGallery();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
  }

  function prevImage() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateLightbox();
  }

  function nextImage() {
    currentIndex = (currentIndex + 1) % images.length;
    updateLightbox();
  }

  function updateLightbox() {
    var item = images[currentIndex];
    if (!item) return;
    var url = item.url || '/cdn/' + item.filename;
    document.getElementById('lightbox-image').src = url;
    document.getElementById('lightbox-image').alt = item.original_name || '';
    document.getElementById('lightbox-info').textContent = (currentIndex + 1) + ' / ' + images.length;
  }

  function bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      if (!document.getElementById('lightbox').classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    });
  }

  window.GalleryPage = {
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    prevImage: prevImage,
    nextImage: nextImage
  };

  document.addEventListener('DOMContentLoaded', init);
})();
