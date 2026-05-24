// ========================================
// 文件说明：自定义页面友好 URL 处理（SSR 注入 SEO meta）
// 文件路径：functions/p/[slug].js
// 功能：处理 /p/xxx URL，从数据库取页面元数据并注入到 page.html 头部
//   - <title>
//   - <meta name="description">
//   - Open Graph (og:title / og:description / og:url / og:type)
//   - <link rel="canonical">
//   - JSON-LD Article 结构化数据
// ========================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function onRequest(context) {
  const { params, env, request } = context;
  var slug;
  try {
    slug = decodeURIComponent(params.slug);
  } catch (e) {
    slug = params.slug;
  }

  // 从数据库查询页面信息（用于 SEO meta 标签）
  var pageTitle = '页面';
  var pageDesc = '';
  var pageUpdatedAt = '';
  try {
    var page = await env.FUXICUN_DB.prepare(
      "SELECT title, content, updated_at, created_at FROM pages WHERE slug = ? AND status = 'published'"
    ).bind(slug).first();

    if (!page) {
      return new Response('页面不存在', { status: 404 });
    }

    pageTitle = page.title;
    // 取内容前 160 字符作为描述
    if (page.content) {
      pageDesc = page.content.replace(/<[^>]+>/g, '').replace(/[#*`>\-\[\]()]/g, '').substring(0, 160);
    }
    pageUpdatedAt = page.updated_at || page.created_at || '';
  } catch (e) {
    console.error('页面查询失败:', e.message);
  }

  // 转义所有注入文本，防 XSS
  var safeTitle = escapeHtml(pageTitle);
  var safeDesc = escapeHtml(pageDesc);

  // 构造 canonical / OG URL
  var requestUrl = new URL(request.url);
  var canonicalUrl = requestUrl.origin + '/p/' + encodeURIComponent(slug);

  // JSON-LD Article 结构化数据
  var jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: pageTitle,
    description: pageDesc,
    url: canonicalUrl,
    dateModified: pageUpdatedAt
  };

  // 加载 page.html 模板并注入 SEO 头部
  var htmlUrl = requestUrl.origin + '/page.html';

  try {
    var response = await fetch(htmlUrl);
    var html = await response.text();

    // 准备要注入到 <head> 的额外 meta 标签
    var seoBlock =
      '<meta name="description" content="' + safeDesc + '">\n' +
      '  <meta name="keywords" content="' + safeTitle + ',福溪村">\n' +
      '  <meta property="og:type" content="article">\n' +
      '  <meta property="og:title" content="' + safeTitle + ' - 福溪村">\n' +
      '  <meta property="og:description" content="' + safeDesc + '">\n' +
      '  <meta property="og:url" content="' + canonicalUrl + '">\n' +
      '  <meta property="og:site_name" content="福溪村">\n' +
      '  <link rel="canonical" href="' + canonicalUrl + '">\n' +
      '  <script type="application/ld+json">' + JSON.stringify(jsonLd) + '</script>\n  ';

    // 在 <title> 标签前插入 seoBlock
    html = html.replace('<title>', seoBlock + '<title>');

    // 替换 <title>
    html = html.replace(/<title>.*?<\/title>/, '<title>' + safeTitle + ' - 福溪村</title>');
    // 兼容旧静态文本替换
    html = html.replace('页面 - 福溪村', safeTitle + ' - 福溪村');

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  } catch (e) {
    return new Response('页面加载失败', { status: 500 });
  }
}
