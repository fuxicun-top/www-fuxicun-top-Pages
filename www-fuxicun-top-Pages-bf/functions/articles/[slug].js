// ========================================
// 文件说明：文章友好 URL 处理（SEO 优化）
// 文件路径：functions/articles/[slug].js
// 功能：处理 /articles/xxx 友好 URL，服务端渲染文章页面
//       包含完整的 OG/Twitter Card meta 标签和 JSON-LD 结构化数据
// ========================================

/**
 * Cloudflare Pages Function - 处理 /articles/:slug 请求
 * 通过 slug 查找文章，返回带有完整 SEO meta 标签的 HTML 页面
 * 这样搜索引擎爬虫可以直接获取 meta 信息，无需执行 JavaScript
 */
export async function onRequest(context) {
  const { params, env } = context;
  // 解码 URL 编码的中文字符
  var slug;
  try {
    slug = decodeURIComponent(params.slug);
  } catch (e) {
    slug = params.slug;
  }

  // 如果 slug 是纯数字，视为文章 ID，重定向到友好 URL
  if (/^\d+$/.test(slug)) {
    try {
      var article = await env.FUXICUN_DB.prepare(
        "SELECT id, slug FROM articles WHERE id = ? AND status = 'published'"
      ).bind(parseInt(slug)).first();

      if (article && article.slug) {
        // 301 永久重定向到友好 URL
        return Response.redirect('/articles/' + article.slug, 301);
      } else if (article) {
        // 没有 slug，重定向到传统 URL
        return Response.redirect('/article-detail.html?id=' + article.id, 301);
      }
    } catch (e) {
      console.error('文章查询失败:', e.message);
    }
    return new Response('文章不存在', { status: 404 });
  }

  // 通过 slug 查询文章详情（包含作者和分类信息）
  try {
    var article = await env.FUXICUN_DB.prepare(
      `SELECT a.id, a.title, a.slug, a.content, a.excerpt, a.cover_image,
              a.published_at, a.updated_at, a.views, a.likes,
              u.username AS author_name,
              c.name AS category_name, c.slug AS category_slug
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.slug = ? AND a.status = 'published'`
    ).bind(slug).first();

    if (!article) {
      // slug 未找到，尝试按标题模糊匹配
      article = await env.FUXICUN_DB.prepare(
        `SELECT a.id, a.title, a.slug, a.content, a.excerpt, a.cover_image,
                a.published_at, a.updated_at, a.views, a.likes,
                u.username AS author_name,
                c.name AS category_name, c.slug AS category_slug
         FROM articles a
         LEFT JOIN users u ON a.author_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.id = ? AND a.status = 'published'`
      ).bind(parseInt(slug) || 0).first();

      if (!article) {
        return new Response(generate404Page(), {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }

    // 生成带 SEO 标签的 HTML 页面
    var html = generateArticlePage(article);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=1800' // 30分钟缓存
      }
    });
  } catch (e) {
    console.error('文章页面生成失败:', e.message);
    return new Response('服务器错误', { status: 500 });
  }
}

/**
 * 生成文章详情页完整 HTML
 * 包含 OG 标签、Twitter Card、JSON-LD 结构化数据
 * @param {Object} article - 文章数据对象
 * @returns {string} 完整的 HTML 页面字符串
 */
function generateArticlePage(article) {
  var baseUrl = 'https://www.fuxicun.top';
  var articleUrl = baseUrl + '/articles/' + (article.slug || article.id);
  var title = escapeHtml(article.title) + ' - 福溪村';
  var description = escapeHtml(article.excerpt || article.title);
  var publishedTime = article.published_at || '';
  var modifiedTime = article.updated_at || publishedTime;
  var authorName = escapeHtml(article.author_name || '福溪村');
  var categoryName = escapeHtml(article.category_name || '新闻动态');
  var coverImage = article.cover_image ? (article.cover_image.startsWith('http') ? article.cover_image : baseUrl + article.cover_image) : baseUrl + '/images/logo/logo.svg';

  // 截取正文前 200 字作为摘要（去除 HTML 标签）
  var plainContent = article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 200) : '';
  var excerpt = escapeHtml(article.excerpt || plainContent);

  // JSON-LD 结构化数据（NewsArticle 类型）
  var jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': article.title,
    'description': excerpt,
    'image': coverImage,
    'datePublished': publishedTime,
    'dateModified': modifiedTime,
    'author': {
      '@type': 'Person',
      'name': authorName
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
    'articleSection': categoryName,
    'inLanguage': 'zh-CN'
  };

  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    // SEO 基础 meta 标签
    '  <title>' + title + '</title>\n' +
    '  <meta name="description" content="' + description + '">\n' +
    '  <meta name="author" content="' + authorName + '">\n' +
    '  <meta name="keywords" content="' + categoryName + ',福溪村,' + escapeHtml(article.title) + '">\n' +
    '  <link rel="canonical" href="' + articleUrl + '">\n' +
    // Open Graph 标签（Facebook/微信等社交平台分享）
    '  <meta property="og:type" content="article">\n' +
    '  <meta property="og:title" content="' + escapeHtml(article.title) + '">\n' +
    '  <meta property="og:description" content="' + description + '">\n' +
    '  <meta property="og:image" content="' + coverImage + '">\n' +
    '  <meta property="og:url" content="' + articleUrl + '">\n' +
    '  <meta property="og:site_name" content="福溪村">\n' +
    '  <meta property="og:locale" content="zh_CN">\n' +
    (publishedTime ? '  <meta property="article:published_time" content="' + publishedTime + '">\n' : '') +
    (modifiedTime ? '  <meta property="article:modified_time" content="' + modifiedTime + '">\n' : '') +
    '  <meta property="article:author" content="' + authorName + '">\n' +
    '  <meta property="article:section" content="' + categoryName + '">\n' +
    // Twitter Card 标签
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <meta name="twitter:title" content="' + escapeHtml(article.title) + '">\n' +
    '  <meta name="twitter:description" content="' + description + '">\n' +
    '  <meta name="twitter:image" content="' + coverImage + '">\n' +
    // JSON-LD 结构化数据
    '  <script type="application/ld+json">\n' +
    JSON.stringify(jsonLd, null, 2) + '\n' +
    '  </script>\n' +
    // 页面资源
    '  <link rel="icon" href="/images/favicon.ico">\n' +
    '  <link rel="stylesheet" href="/css/common/reset.css">\n' +
    '  <link rel="stylesheet" href="/css/common/variables.css">\n' +
    '  <link rel="stylesheet" href="/css/common/typography.css">\n' +
    '  <link rel="stylesheet" href="/css/common/utilities.css">\n' +
    '  <link rel="stylesheet" href="/css/common/animations.css">\n' +
    '  <link rel="stylesheet" href="/css/components/header.css">\n' +
    '  <link rel="stylesheet" href="/css/components/footer.css">\n' +
    '  <link rel="stylesheet" href="/css/components/breadcrumb.css">\n' +
    '  <link rel="stylesheet" href="/css/components/form.css">\n' +
    '  <link rel="stylesheet" href="/css/pages/article-detail.css">\n' +
    '  <script src="/js/common/theme-loader.js"></script>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <header class="site-header" id="site-header"></header>\n' +
    '  <main class="main-content">\n' +
    '    <div class="container">\n' +
    '      <nav class="breadcrumb">\n' +
    '        <a href="/">首页</a>\n' +
    '        <span class="breadcrumb__sep">/</span>\n' +
    '        <a href="/articles.html">新闻动态</a>\n' +
    '        <span class="breadcrumb__sep">/</span>\n' +
    '        <span class="breadcrumb__current">' + escapeHtml(article.title) + '</span>\n' +
    '      </nav>\n' +
    '      <article class="article-detail" id="article-detail">\n' +
    // 服务端预渲染文章内容（同时给 JS 客户端提供数据）
    '        <div class="article-detail__header">\n' +
    '          <h1 class="article-detail__title">' + escapeHtml(article.title) + '</h1>\n' +
    '          <div class="article-detail__meta">\n' +
    '            <span>作者：' + authorName + '</span>\n' +
    (categoryName ? '            <span>分类：' + categoryName + '</span>\n' : '') +
    '            <span>发布时间：' + (publishedTime || '未知') + '</span>\n' +
    '            <span>' + (article.views || 0) + ' 浏览</span>\n' +
    '          </div>\n' +
    '        </div>\n' +
    (article.cover_image ? '        <img src="' + escapeHtml(article.cover_image) + '" alt="' + escapeHtml(article.title) + '" class="article-detail__cover" loading="lazy">\n' : '') +
    '        <div class="article-detail__content">' + article.content + '</div>\n' +
    '        <div class="article-detail__actions">\n' +
    '          <button class="btn-like" id="btn-like">\n' +
    '            <span>&#9829;</span> <span id="like-count">' + (article.likes || 0) + '</span>\n' +
    '          </button>\n' +
    '        </div>\n' +
    '      </article>\n' +
    // 评论区
    '      <section class="comments-section" id="comments-section">\n' +
    '        <h3 class="comments-title">评论</h3>\n' +
    '        <div class="comment-form" id="comment-form" style="display:none;">\n' +
    '          <textarea class="form-input form-textarea" id="comment-content" placeholder="写下你的评论..." rows="3"></textarea>\n' +
    '          <button class="btn btn-primary" id="btn-submit-comment">发表评论</button>\n' +
    '        </div>\n' +
    '        <div class="comment-login-tip" id="comment-login-tip" style="display:none;">\n' +
    '          <a href="/login.html">登录</a>后可以发表评论\n' +
    '        </div>\n' +
    '        <div class="comments-list" id="comments-list"></div>\n' +
    '      </section>\n' +
    '    </div>\n' +
    '  </main>\n' +
    '  <footer class="site-footer" id="site-footer"></footer>\n' +
    // 注入文章 ID 给客户端脚本使用
    '  <script>window.__ARTICLE_ID__ = ' + article.id + ';</script>\n' +
    '  <script src="/js/common/config.js"></script>\n' +
    '  <script src="/js/common/storage.js"></script>\n' +
    '  <script src="/js/common/utils.js"></script>\n' +
    '  <script src="/js/common/api.js"></script>\n' +
    '  <script src="/js/common/auth.js"></script>\n' +
    '  <script src="/js/common/toast.js"></script>\n' +
    '  <script src="/js/components/header.js"></script>\n' +
    '  <script src="/js/components/footer.js"></script>\n' +
    '  <script src="/js/pages/article-detail.js"></script>\n' +
    '</body>\n' +
    '</html>';
}

/**
 * 生成 404 页面
 * @returns {string} 404 页面 HTML
 */
function generate404Page() {
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>页面不存在 - 福溪村</title>\n' +
    '  <link rel="stylesheet" href="/css/common/reset.css">\n' +
    '  <link rel="stylesheet" href="/css/common/variables.css">\n' +
    '  <link rel="stylesheet" href="/css/common/typography.css">\n' +
    '  <link rel="stylesheet" href="/css/common/utilities.css">\n' +
    '  <style>\n' +
    '    .error-page { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:80vh; text-align:center; }\n' +
    '    .error-code { font-size:6rem; font-weight:700; color:var(--color-primary,#2d6a4f); margin-bottom:1rem; }\n' +
    '    .error-msg { font-size:1.25rem; color:#666; margin-bottom:2rem; }\n' +
    '    .error-link { padding:0.75rem 2rem; background:var(--color-primary,#2d6a4f); color:#fff; border-radius:8px; text-decoration:none; }\n' +
    '  </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div class="error-page">\n' +
    '    <div class="error-code">404</div>\n' +
    '    <p class="error-msg">抱歉，您访问的文章不存在</p>\n' +
    '    <a href="/" class="error-link">返回首页</a>\n' +
    '  </div>\n' +
    '</body>\n' +
    '</html>';
}

/**
 * 转义 HTML 特殊字符（防止 XSS）
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
