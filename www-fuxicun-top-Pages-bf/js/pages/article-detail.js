// ========================================
// 文件说明：文章详情页脚本（含 SEO 优化）
// 文件路径：js/pages/article-detail.js
// 功能：加载文章详情、点赞、评论
//       支持三种访问方式：
//       1. /articles/slug - 友好 URL（服务端已渲染内容和 meta 标签）
//       2. /article-detail.html?id=123 - 传统 URL（客户端渲染）
//       3. 服务端渲染页面通过 window.__ARTICLE_ID__ 传递文章 ID
// ========================================

(function() {
  'use strict';

  /** @type {number|null} 文章 ID */
  var articleId = null;

  /** @type {Object|null} 文章数据缓存 */
  var articleData = null;

  /** @type {string} 当前文章生效的评论策略：'open' | 'login_required' | 'closed'，由 GET /articles/:id/comments 返回 */
  var commentPolicy = 'open';

  /**
   * 页面初始化入口
   * 判断文章加载方式并初始化各模块
   */
  function init() {
    // 优先使用服务端注入的文章 ID（友好 URL 服务端渲染模式）
    if (window.__ARTICLE_ID__) {
      articleId = window.__ARTICLE_ID__;
      // 服务端已渲染内容，只需加载评论和绑定事件
      loadComments();
      setupCommentForm();
      bindLikeButton();
      return;
    }

    // 检查 URL 路径是否为 /articles/slug 格式
    var pathMatch = window.location.pathname.match(/^\/articles\/(.+)$/);
    if (pathMatch) {
      var slug = pathMatch[1];
      // 如果是纯数字，视为 ID
      if (/^\d+$/.test(slug)) {
        articleId = parseInt(slug);
      } else {
        // 通过 slug 加载文章（客户端渲染模式）
        loadArticleBySlug(slug);
        return;
      }
    }

    // 传统 URL 模式：从查询参数获取文章 ID
    var params = new URLSearchParams(window.location.search);
    articleId = params.get('id');

    if (!articleId) {
      // 无文章 ID，保留页面默认静态内容
      setupCommentForm();
      bindLikeButton();
      return;
    }

    loadArticle();
    loadComments();
    setupCommentForm();
  }

  /**
   * 通过 slug 加载文章（客户端渲染模式）
   * 当用户直接访问 /articles/slug 但页面非服务端渲染时调用
   * @param {string} slug - 文章的 URL 友好标识
   */
  async function loadArticleBySlug(slug) {
    try {
      // 尝试通过 API 按 slug 查询
      var result = await API.get('/articles?keyword=' + encodeURIComponent(slug));
      if (result.success && result.data.list && result.data.list.length > 0) {
        // 找到匹配的文章
        var matched = result.data.list.find(function(a) { return a.slug === slug; });
        if (matched) {
          articleId = matched.id;
          loadArticle();
          loadComments();
          setupCommentForm();
          return;
        }
      }
      // 未找到匹配文章，保留默认静态内容
      setupCommentForm();
      bindLikeButton();
    } catch (e) {
      // API 失败，保留默认静态内容
      setupCommentForm();
      bindLikeButton();
    }
  }

  /**
   * 通过 ID 加载文章详情（传统 URL 模式）
   * 同时设置 SEO meta 标签和 JSON-LD 结构化数据
   */
  async function loadArticle() {
    try {
      var result = await API.get('/articles/' + articleId);
      if (result.success) {
        articleData = result.data;
        renderArticle(result.data);
        // 客户端渲染模式下动态设置 SEO 标签
        setSEOTags(result.data);
      }
      // API 成功但文章不存在，保留默认静态内容
    } catch (e) {
      // API 失败，保留默认静态内容
    }
  }

  /**
   * 动态设置 SEO meta 标签（客户端渲染模式）
   * 包含 Open Graph、Twitter Card、JSON-LD 结构化数据
   * @param {Object} article - 文章数据对象
   */
  function setSEOTags(article) {
    var baseUrl = window.location.origin;
    var articleUrl = article.slug
      ? baseUrl + '/articles/' + article.slug
      : baseUrl + '/article-detail.html?id=' + article.id;
    var coverImage = article.cover_image
      ? (article.cover_image.startsWith('http') ? article.cover_image : baseUrl + article.cover_image)
      : baseUrl + '/images/logo/logo.svg';
    var description = article.excerpt || article.title;
    var plainContent = article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 200) : '';
    var desc = description || plainContent;

    // 设置页面标题
    document.title = article.title + ' - 福溪村';

    // 设置 Open Graph 标签
    setMetaTag('og:type', 'article', true);
    setMetaTag('og:title', article.title, true);
    setMetaTag('og:description', desc, true);
    setMetaTag('og:image', coverImage, true);
    setMetaTag('og:url', articleUrl, true);
    setMetaTag('og:site_name', '福溪村', true);
    setMetaTag('og:locale', 'zh_CN', true);

    // 设置 Twitter Card 标签
    setMetaTag('twitter:card', 'summary_large_image', false);
    setMetaTag('twitter:title', article.title, false);
    setMetaTag('twitter:description', desc, false);
    setMetaTag('twitter:image', coverImage, false);

    // 设置 canonical 链接
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = articleUrl;

    // 设置 description meta
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = desc;
    }

    // 设置 JSON-LD 结构化数据
    var jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.title,
      'description': desc,
      'image': coverImage,
      'datePublished': article.published_at || '',
      'dateModified': article.updated_at || article.published_at || '',
      'author': {
        '@type': 'Person',
        'name': article.author_name || '福溪村'
      },
      'publisher': {
        '@type': 'Organization',
        'name': '福溪村',
        'logo': {
          '@type': 'ImageObject',
          'url': baseUrl + '/images/logo/logo.svg'
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': articleUrl
      },
      'articleSection': article.category_name || '新闻动态',
      'inLanguage': 'zh-CN'
    };

    var script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd, null, 2);
  }

  /**
   * 设置或更新 meta 标签
   * @param {string} property - 属性名（property 或 name）
   * @param {string} content - 属性值
   * @param {boolean} isProperty - 是否使用 property 属性（OG 标签用 property，Twitter 用 name）
   */
  function setMetaTag(property, content, isProperty) {
    var selector = isProperty
      ? 'meta[property="' + property + '"]'
      : 'meta[name="' + property + '"]';
    var meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      if (isProperty) {
        meta.setAttribute('property', property);
      } else {
        meta.setAttribute('name', property);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  /**
   * 渲染文章内容到页面
   * @param {Object} article - 文章数据对象
   */
  function renderArticle(article) {
    document.title = article.title + ' - 福溪村';
    document.getElementById('breadcrumb-title').textContent = article.title;

    var date = Utils.formatDate(article.published_at || article.created_at);
    var cover = article.cover_image
      ? '<img src="' + article.cover_image + '" alt="' + Utils.escapeHtml(article.title) + '" class="article-detail__cover" loading="lazy">'
      : '';

    var html = '<div class="article-detail__header">' +
      '<h1 class="article-detail__title">' + Utils.escapeHtml(article.title) + '</h1>' +
      '<div class="article-detail__meta">' +
        '<span>作者：' + Utils.escapeHtml(article.author_name || '匿名') + '</span>' +
        (article.category_name ? '<span>分类：' + Utils.escapeHtml(article.category_name) + '</span>' : '') +
        '<span>发布时间：' + date + '</span>' +
        '<span>' + (article.views || 0) + ' 浏览</span>' +
      '</div>' +
    '</div>' +
    cover +
    '<div class="article-detail__content">' + article.content + '</div>' +
    '<div class="article-detail__actions">' +
      '<button class="btn-like" id="btn-like">' +
        '<span>&#9829;</span> <span id="like-count">' + (article.likes || 0) + '</span>' +
      '</button>' +
    '</div>';

    document.getElementById('article-detail').innerHTML = html;

    // 绑定点赞按钮事件
    document.getElementById('btn-like').onclick = function() {
      likeArticle();
    };
  }

  /**
   * 绑定点赞按钮事件（服务端渲染模式使用）
   * 查找页面上已渲染的点赞按钮并绑定点击事件
   */
  function bindLikeButton() {
    var btn = document.getElementById('btn-like');
    if (btn) {
      btn.onclick = function() {
        likeArticle();
      };
    }
  }

  /**
   * 点赞/取消点赞文章
   * 后端默认开放给所有人（按 IP 去重）；如果全局策略 like_policy=login_required，
   * 后端会返回 401，前端再引导登录
   */
  async function likeArticle() {
    try {
      var result = await API.post('/articles/' + articleId + '/like');
      if (result.success) {
        var btn = document.getElementById('btn-like');
        var count = document.getElementById('like-count');
        var currentCount = parseInt(count.textContent) || 0;

        if (result.data.liked) {
          btn.classList.add('liked');
          count.textContent = currentCount + 1;
        } else {
          btn.classList.remove('liked');
          count.textContent = Math.max(0, currentCount - 1);
        }
      } else if (result.error && (result.error.code === 401 || /登录/.test(result.error.message || ''))) {
        // 后端要求登录
        Toast.warning(result.error.message || '请先登录后再点赞');
        setTimeout(function() { window.location.href = '/login.html'; }, 1000);
      } else {
        Toast.error((result.error && result.error.message) || '操作失败');
      }
    } catch (e) {
      // 401 也会走 catch（API 模块对 401 抛错）
      if (e.message && (e.message.indexOf('401') >= 0 || e.message.indexOf('登录') >= 0)) {
        Toast.warning('请先登录后再点赞');
        setTimeout(function() { window.location.href = '/login.html'; }, 1000);
      } else {
        Toast.error(e.message || '操作失败');
      }
    }
  }

  /**
   * 根据当前评论策略 + 登录状态渲染评论表单
   *   - closed         → 隐藏表单，显示"评论已关闭"
   *   - login_required → 未登录显示"请登录"，登录后显示评论框
   *   - open           → 始终显示评论框；未登录时多一个"昵称"输入框 + Turnstile
   */
  function setupCommentForm() {
    var formEl = document.getElementById('comment-form');
    var loginTipEl = document.getElementById('comment-login-tip');
    var btn = document.getElementById('btn-submit-comment');
    if (!formEl) return;

    // 清掉之前可能注入的 guest 字段（避免策略变化后残留）
    var oldGuestRow = document.getElementById('guest-fields');
    if (oldGuestRow) oldGuestRow.parentNode.removeChild(oldGuestRow);

    if (commentPolicy === 'closed') {
      formEl.style.display = 'none';
      if (loginTipEl) {
        loginTipEl.style.display = 'block';
        loginTipEl.innerHTML = '<p style="text-align:center;color:var(--color-text-placeholder);padding:20px;">该文章已关闭评论</p>';
      }
      return;
    }

    if (commentPolicy === 'login_required') {
      if (Auth.isLoggedIn()) {
        formEl.style.display = 'block';
        if (loginTipEl) loginTipEl.style.display = 'none';
      } else {
        formEl.style.display = 'none';
        if (loginTipEl) {
          loginTipEl.style.display = 'block';
          loginTipEl.innerHTML = '<p style="text-align:center;padding:20px;">该文章仅允许登录用户评论 · <a href="/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search) + '">前往登录</a></p>';
        }
        return;
      }
    } else {
      // open：所有人可评
      formEl.style.display = 'block';
      if (loginTipEl) loginTipEl.style.display = 'none';

      // 未登录用户：注入"昵称"输入 + Turnstile 占位
      if (!Auth.isLoggedIn()) {
        var contentField = formEl.querySelector('#comment-content');
        if (contentField && !document.getElementById('guest-fields')) {
          var guestRow = document.createElement('div');
          guestRow.id = 'guest-fields';
          guestRow.style.marginBottom = '12px';
          guestRow.innerHTML =
            '<input type="text" id="guest-name" placeholder="您的昵称（必填，1-30字）" maxlength="30" required ' +
            'style="width:100%;padding:10px;border:1px solid var(--color-border);border-radius:6px;margin-bottom:8px;">' +
            '<div id="comment-turnstile"></div>';
          contentField.parentNode.insertBefore(guestRow, contentField);

          // 加载 Turnstile（如果项目已配置 sitekey）
          if (window.CONFIG && window.CONFIG.TURNSTILE_SITE_KEY && !document.getElementById('cf-turnstile-script')) {
            var s = document.createElement('script');
            s.id = 'cf-turnstile-script';
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            s.async = true;
            s.defer = true;
            document.head.appendChild(s);
            s.onload = function() {
              if (window.turnstile) {
                window.turnstile.render('#comment-turnstile', {
                  sitekey: window.CONFIG.TURNSTILE_SITE_KEY,
                  callback: function(token) { window._commentTurnstileToken = token; }
                });
              }
            };
          }
        }
      }
    }

    if (btn) {
      btn.onclick = function() { submitComment(); };
    }
  }

  /**
   * 加载文章评论列表（同时获得当前生效策略）
   */
  async function loadComments() {
    try {
      var result = await API.get('/articles/' + articleId + '/comments');
      if (result.success) {
        // 兼容新旧返回格式：新版 {list, policy} / 旧版直接是数组
        var list, policy;
        if (Array.isArray(result.data)) {
          list = result.data;
          policy = 'open';
        } else {
          list = result.data.list || [];
          policy = result.data.policy || 'open';
        }
        commentPolicy = policy;
        renderComments(list);
        // 拿到 policy 后重新评估表单显示
        setupCommentForm();
      }
    } catch (e) {
      // 失败时维持默认 open，让用户至少能尝试评论
    }
  }

  /**
   * 渲染评论列表
   * @param {Array} comments - 评论数据数组
   */
  function renderComments(comments) {
    var container = document.getElementById('comments-list');

    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无评论，快来发表第一条评论吧</div>';
      return;
    }

    container.innerHTML = comments.map(function(comment) {
      return renderCommentItem(comment);
    }).join('');
  }

  /**
   * 渲染单条评论（支持嵌套回复 + 游客标识）
   * 后端返回字段：
   *   - display_name: 已合并好的显示名（登录用户=username；游客=昵称（游客））
   *   - is_guest: 是否游客
   *   - username, avatar: 仅登录用户有
   * @param {Object} comment - 评论对象
   * @returns {string} 评论 HTML 字符串
   */
  function renderCommentItem(comment) {
    var displayName = comment.display_name || comment.username || '匿名';
    var initial = (displayName[0] || '匿').toUpperCase();
    var time = Utils.formatDate(comment.created_at);
    var guestBadge = comment.is_guest
      ? '<span class="badge badge-guest" style="font-size:11px;color:var(--color-text-placeholder);margin-left:6px;">访客</span>'
      : '';

    var repliesHtml = '';
    if (comment.replies && comment.replies.length > 0) {
      repliesHtml = '<div class="comment-replies">' +
        comment.replies.map(function(reply) {
          return renderCommentItem(reply);
        }).join('') +
      '</div>';
    }

    return '<div class="comment-item">' +
      '<div class="comment-avatar">' + Utils.escapeHtml(initial) + '</div>' +
      '<div class="comment-body">' +
        '<div class="comment-header">' +
          '<span class="comment-username">' + Utils.escapeHtml(displayName) + '</span>' + guestBadge +
          '<span class="comment-time">' + time + '</span>' +
        '</div>' +
        '<div class="comment-content">' + Utils.escapeHtml(comment.content) + '</div>' +
        '<div class="comment-actions">' +
          '<button class="comment-reply-btn" onclick="showReplyForm(' + comment.id + ')">回复</button>' +
        '</div>' +
      '</div>' +
    '</div>' + repliesHtml;
  }

  /**
   * 提交评论
   * - 登录用户：仅需 content
   * - 游客（commentPolicy=open 时）：需 guest_name + turnstile_token
   * @param {number} [parentId] - 父评论 ID（回复时使用）
   */
  async function submitComment(parentId) {
    var contentEl = document.getElementById('comment-content');
    var content = contentEl.value.trim();

    if (!content) {
      Toast.warning('请输入评论内容');
      return;
    }

    var data = { content: content };
    if (parentId) data.parent_id = parentId;

    if (!Auth.isLoggedIn()) {
      var nameEl = document.getElementById('guest-name');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) {
        Toast.warning('请输入您的昵称');
        if (nameEl) nameEl.focus();
        return;
      }
      data.guest_name = name;
      // Turnstile token（如果配置了 sitekey）
      if (window.CONFIG && window.CONFIG.TURNSTILE_SITE_KEY) {
        if (!window._commentTurnstileToken) {
          Toast.warning('请完成人机校验');
          return;
        }
        data.turnstile_token = window._commentTurnstileToken;
      }
    }

    try {
      var result = await API.post('/articles/' + articleId + '/comments', data);
      if (result.success) {
        Toast.success(result.message || '评论成功');
        contentEl.value = '';
        // 重置 Turnstile（如果用了）
        if (window.turnstile && document.getElementById('comment-turnstile')) {
          try { window.turnstile.reset('#comment-turnstile'); } catch (e) {}
          window._commentTurnstileToken = null;
        }
        // 若开启了审核（status=pending），刷新列表也不会显示新评论
        loadComments();
      } else {
        Toast.error((result.error && result.error.message) || '评论失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  /**
   * 全局回复表单显示函数（游客也可回复，前提是策略允许）
   * @param {number} parentId - 父评论 ID
   */
  window.showReplyForm = function(parentId) {
    if (commentPolicy === 'closed') {
      Toast.warning('该文章已关闭评论');
      return;
    }
    if (commentPolicy === 'login_required' && !Auth.isLoggedIn()) {
      Toast.warning('请先登录');
      return;
    }
    var content = prompt('请输入回复内容：');
    if (!content) return;

    var data = { content: content, parent_id: parentId };
    if (!Auth.isLoggedIn()) {
      var name = prompt('请输入您的昵称：');
      if (!name) return;
      data.guest_name = name;
      if (window.CONFIG && window.CONFIG.TURNSTILE_SITE_KEY && window._commentTurnstileToken) {
        data.turnstile_token = window._commentTurnstileToken;
      }
    }
    submitCommentDirect(data);
  };

  /**
   * 直接提交评论（用于回复场景，已组装好的 data）
   */
  async function submitCommentDirect(data) {
    try {
      var result = await API.post('/articles/' + articleId + '/comments', data);
      if (result.success) {
        Toast.success(result.message || '回复成功');
        loadComments();
      } else {
        Toast.error((result.error && result.error.message) || '回复失败');
      }
    } catch (e) {
      Toast.error(e.message);
    }
  }

  // DOM 加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);
})();
