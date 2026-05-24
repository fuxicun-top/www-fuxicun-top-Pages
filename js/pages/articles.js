// ========================================
// 文件说明：文章列表页脚本
// 文件路径：js/pages/articles.js
// ========================================

(function() {
  'use strict';

  var currentPage = 1;
  var currentCategory = '';

  function init() {
    // 从 URL 获取分类参数
    var params = new URLSearchParams(window.location.search);
    currentCategory = params.get('category') || '';
    currentPage = parseInt(params.get('page')) || 1;

    if (currentCategory) {
      // 指定分类：隐藏筛选栏，更新页面标题
      var filterEl = document.getElementById('category-filter');
      if (filterEl) filterEl.style.display = 'none';
      updateCategoryTitle(currentCategory);
    } else {
      // 全部文章：显示分类筛选
      loadCategories();
    }

    loadArticles();
  }

  // 根据分类 slug 更新页面标题和面包屑
  function updateCategoryTitle(slug) {
    var nameMap = {
      'village-news': '新闻动态',
      'lixue-culture': '理学文化',
      'architecture': '古建筑',
      'folk-custom': '民俗风情',
      'travel-guide': '旅游攻略',
      'villager-stories': '村民故事',
      'announcements': '通知公告'
    };
    var name = nameMap[slug] || '文章列表';
    document.title = name + ' - 福溪村';
    var breadcrumb = document.querySelector('.breadcrumb__current');
    if (breadcrumb) breadcrumb.textContent = name;
  }

  // 默认分类（API 不可用时显示）
  var defaultCategories = [
    { name: '村内新闻', slug: 'village-news' },
    { name: '理学文化', slug: 'lixue-culture' },
    { name: '古建筑', slug: 'architecture' },
    { name: '民俗风情', slug: 'folk-custom' },
    { name: '旅游攻略', slug: 'travel-guide' },
    { name: '村民故事', slug: 'villager-stories' },
    { name: '通知公告', slug: 'announcements' }
  ];

  async function loadCategories() {
    try {
      var result = await API.get('/categories');
      if (result.success && result.data.length > 0) {
        renderCategories(result.data);
        return;
      }
    } catch (e) {
      // API 失败
    }
    // API 不可用时使用默认分类
    renderCategories(defaultCategories);
  }

  function renderCategories(categories) {
    var container = document.getElementById('category-filter');
    var html = '<button class="filter-btn active" data-category="">全部</button>';

    categories.forEach(function(cat) {
      html += '<button class="filter-btn" data-category="' + cat.slug + '">' + cat.name + '</button>';
    });

    container.innerHTML = html;

    // 绑定筛选事件
    container.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.onclick = function() {
        currentCategory = this.dataset.category;
        currentPage = 1;
        container.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        // 更新页面标题
        document.title = currentCategory ? this.textContent + ' - 福溪村' : '全部文章 - 福溪村';
        var breadcrumb = document.querySelector('.breadcrumb__current');
        if (breadcrumb) breadcrumb.textContent = currentCategory ? this.textContent : '全部文章';
        loadArticles();
      };
    });
  }

  async function loadArticles() {
    var container = document.getElementById('articles-list');
    // 显示加载状态
    container.innerHTML = '<div class="skeleton" style="height:300px;"></div><div class="skeleton" style="height:300px;"></div><div class="skeleton" style="height:300px;"></div>';

    try {
      var params = { page: currentPage, pageSize: CONFIG.PAGE_SIZE };
      if (currentCategory) params.category = currentCategory;

      var result = await API.get('/articles', params);
      if (result.success) {
        if (result.data.list.length > 0) {
          renderArticles(result.data.list);
          renderPagination(result.data.total, result.data.page, result.data.pageSize);
        } else {
          // 无数据时恢复默认静态内容（按分类筛选）
          container.innerHTML = getDefaultArticlesHtml(currentCategory);
        }
      } else {
        container.innerHTML = getDefaultArticlesHtml(currentCategory);
      }
    } catch (e) {
      // API 失败，显示默认静态内容（按分类筛选）
      container.innerHTML = getDefaultArticlesHtml(currentCategory);
    }
  }

  // 默认静态文章（API 不可用时显示，覆盖全部 7 篇种子文章）
  // categorySlug 对应数据库 categories 表的 slug 字段
  var defaultArticlesList = [
    { title: '千年古村 山水人和：央视镜头下的福溪', category: '村内新闻', categorySlug: 'village-news', excerpt: '2025年央视"文化中国行"以《千年古村 山水人和》为题报道福溪。这座始建于宋代、2012年列入首批中国传统村落的古村，正焕发新生。', image: '/images/banners/banner1.svg', id: 1 },
    { title: '周敦颐与福溪：理学沿潇贺古道南传的活证', category: '理学文化', categorySlug: 'lixue-culture', excerpt: '周敦颐父亲曾任贺州桂岭县令，理学思想沿古道南传至福溪，村中讲学堂遗址、周氏宗祠、爱莲堂构成完整的理学文化轴。', image: '/images/culture/zhou-dunyi.svg', id: 2 },
    { title: '120 根木柱与门楣之上：福溪古建筑群解码', category: '古建筑', categorySlug: 'architecture', excerpt: '从120根木柱的木构体系，到央视报道的门楣石雕；从风雨桥的瑶族智慧，到24座古戏台的戏曲鼎盛。', image: '/images/scenery/ancient-architecture.svg', id: 3 },
    { title: '炸龙闹元宵：千年瑶俗与潇贺古道的回响', category: '民俗风情', categorySlug: 'folk-custom', excerpt: '正月初十到十五的炸龙狂欢已传承千年，据传沿秦潇贺古道传入富川。叠加盘王节、芦笙长鼓舞、二声部民歌。', image: '/images/ethnic/dance.svg', id: 4 },
    { title: '福溪村旅游攻略：2 天 1 晚串联潇贺古道三村', category: '旅游攻略', categorySlug: 'travel-guide', excerpt: '福溪2天1晚行程：第一天深度游讲学堂、爱莲堂、门楣石雕；第二天串联岔山村、秀水状元村。', image: '/images/scenery/ancient-architecture.svg', id: 5 },
    { title: '老人讲古：风雨桥头听来的福溪百年', category: '村民故事', categorySlug: 'villager-stories', excerpt: '风雨桥头听老人讲古：周姓族人从湖南道州迁来、村里曾有24座戏台、五代时期124名汉族士兵驻守。', image: '/images/ethnic/yao-people.svg', id: 6 },
    { title: '关于福溪村官方网站正式上线的公告', category: '通知公告', categorySlug: 'announcements', excerpt: '福溪村官方网站正式上线。本站系统展示福溪历史文化、古建筑、民族风情与旅游信息。', image: '/images/about/village-overview.svg', id: 7 }
  ];

  function getDefaultArticlesHtml(categorySlug) {
    var list = defaultArticlesList;
    // 按分类筛选
    if (categorySlug) {
      list = list.filter(function(a) { return a.categorySlug === categorySlug; });
    }
    if (list.length === 0) {
      return '<div class="empty-state">该分类暂无文章</div>';
    }
    return list.map(function(a) {
      var url = '/article-detail.html?id=' + a.id;
      return '<div class="card article-card">' +
        '<a href="' + url + '" class="card__image-link">' +
          '<img src="' + a.image + '" alt="' + Utils.escapeHtml(a.title) + '" class="card__image" loading="lazy">' +
        '</a>' +
        '<div class="card__body">' +
          '<span class="card__category">' + Utils.escapeHtml(a.category) + '</span>' +
          '<h3 class="card__title"><a href="' + url + '">' + Utils.escapeHtml(a.title) + '</a></h3>' +
          '<p class="card__summary">' + Utils.escapeHtml(a.excerpt) + '</p>' +
          '<div class="card__meta">' +
            '<span class="card__author">福溪村</span>' +
            '<span class="card__date">' + Utils.formatDate(new Date().toISOString()) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderArticles(articles) {
    var container = document.getElementById('articles-list');

    if (!articles || articles.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无文章</div>';
      return;
    }

    var html = articles.map(function(article) {
      var date = Utils.formatDate(article.published_at || article.created_at);
      var cover = article.cover_image || '/images/default-cover.svg';
      // 优先使用 slug 友好 URL，否则使用传统 ID URL
      var articleUrl = article.slug ? '/articles/' + article.slug : '/article-detail.html?id=' + article.id;

      return '<div class="card article-card">' +
        '<a href="' + articleUrl + '" class="card__image-link">' +
          '<img src="' + cover + '" alt="' + Utils.escapeHtml(article.title) + '" class="card__image" loading="lazy">' +
        '</a>' +
        '<div class="card__body">' +
          (article.category_name ? '<span class="card__category">' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
          '<h3 class="card__title"><a href="' + articleUrl + '">' + Utils.escapeHtml(article.title) + '</a></h3>' +
          '<p class="card__summary">' + Utils.escapeHtml(article.summary || '') + '</p>' +
          '<div class="card__meta">' +
            '<span class="card__author">' + Utils.escapeHtml(article.author_name || '匿名') + '</span>' +
            '<span class="card__date">' + date + '</span>' +
            '<span class="card__views">' + (article.views || 0) + ' 浏览</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = html;
  }

  function renderPagination(total, page, pageSize) {
    var container = document.getElementById('pagination');
    if (typeof Pagination !== 'undefined') {
      Pagination.render(container, total, page, pageSize, function(newPage) {
        currentPage = newPage;
        loadArticles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
