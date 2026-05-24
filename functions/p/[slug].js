// ========================================
// 文件说明：自定义页面友好 URL 处理
// 文件路径：functions/p/[slug].js
// 功能：处理 /p/xxx URL，返回通用页面模板
// ========================================

export async function onRequest(context) {
  const { params, env } = context;
  var slug;
  try {
    slug = decodeURIComponent(params.slug);
  } catch (e) {
    slug = params.slug;
  }

  // 从数据库查询页面信息（用于 SEO meta 标签）
  var pageTitle = '页面';
  var pageDesc = '';
  try {
    var page = await env.FUXICUN_DB.prepare(
      "SELECT title, content FROM pages WHERE slug = ? AND status = 'published'"
    ).bind(slug).first();

    if (!page) {
      return new Response('页面不存在', { status: 404 });
    }

    pageTitle = page.title;
    // 取内容前 160 字符作为描述
    if (page.content) {
      pageDesc = page.content.replace(/<[^>]+>/g, '').replace(/[#*`>\-\[\]()]/g, '').substring(0, 160);
    }
    // 转义 HTML 特殊字符防止 XSS
    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    pageTitle = escapeHtml(pageTitle);
    pageDesc = escapeHtml(pageDesc);
  } catch (e) {
    console.error('页面查询失败:', e.message);
  }

  // 获取 page.html 的内容
  var pageUrl = new URL(context.request.url);
  var htmlUrl = pageUrl.origin + '/page.html';

  try {
    var response = await fetch(htmlUrl);
    var html = await response.text();

    // 替换 meta 信息
    html = html.replace(/<title>.*?<\/title>/, '<title>' + pageTitle + ' - 福溪村</title>');
    html = html.replace('页面 - 福溪村', pageTitle + ' - 福溪村');
    if (pageDesc) {
      html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + pageDesc + '">');
    }

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  } catch (e) {
    return new Response('页面加载失败', { status: 500 });
  }
}
