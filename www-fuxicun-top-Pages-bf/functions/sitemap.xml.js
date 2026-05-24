// ========================================
// 文件说明：动态生成 sitemap.xml（SEO 站点地图）
// 文件路径：functions/sitemap.xml.js
// 功能：从数据库读取已发布文章，生成包含所有页面的 XML 站点地图
// ========================================

/**
 * Cloudflare Pages Function - 处理 /sitemap.xml 请求
 * 动态生成包含所有已发布文章的 XML 站点地图
 * 静态页面使用固定优先级，文章页面根据发布时间动态调整
 */
export async function onRequest(context) {
  const { env } = context;
  const baseUrl = 'https://www.fuxicun.top';
  const now = new Date().toISOString().split('T')[0];

  // 静态页面配置（优先级和更新频率）
  const staticPages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/about.html', changefreq: 'monthly', priority: '0.8' },
    { path: '/culture.html', changefreq: 'monthly', priority: '0.8' },
    { path: '/scenery.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/ethnic.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/travel.html', changefreq: 'monthly', priority: '0.7' },
    { path: '/stories.html', changefreq: 'weekly', priority: '0.7' },
    { path: '/articles.html', changefreq: 'daily', priority: '0.9' }
  ];

  // 构建 XML 头部
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  // 添加静态页面
  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += '    <loc>' + baseUrl + page.path + '</loc>\n';
    xml += '    <lastmod>' + now + '</lastmod>\n';
    xml += '    <changefreq>' + page.changefreq + '</changefreq>\n';
    xml += '    <priority>' + page.priority + '</priority>\n';
    xml += '  </url>\n';
  }

  // 从数据库获取已发布文章
  try {
    const articles = await env.FUXICUN_DB.prepare(
      "SELECT id, title, slug, excerpt, cover_image, published_at, updated_at, category_id FROM articles WHERE status = 'published' ORDER BY published_at DESC"
    ).all();

    if (articles.results && articles.results.length > 0) {
      // 获取分类信息用于构建分类页面链接
      const categories = await env.FUXICUN_DB.prepare(
        'SELECT id, slug FROM categories'
      ).all();
      const categoryMap = {};
      if (categories.results) {
        categories.results.forEach(function(cat) {
          categoryMap[cat.id] = cat.slug;
        });
      }

      for (const article of articles.results) {
        // 优先使用 slug 作为友好 URL，否则使用 id
        var articlePath = article.slug
          ? '/articles/' + article.slug
          : '/article-detail.html?id=' + article.id;

        var lastmod = article.updated_at || article.published_at || now;

        xml += '  <url>\n';
        xml += '    <loc>' + baseUrl + articlePath + '</loc>\n';
        xml += '    <lastmod>' + lastmod + '</lastmod>\n';
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';

        // Google News 扩展标签（有助于新闻类内容索引）
        if (article.published_at) {
          xml += '    <news:news>\n';
          xml += '      <news:publication>\n';
          xml += '        <news:name>福溪村</news:name>\n';
          xml += '        <news:language>zh</news:language>\n';
          xml += '      </news:publication>\n';
          xml += '      <news:publication_date>' + article.published_at + '</news:publication_date>\n';
          xml += '      <news:title>' + escapeXml(article.title) + '</news:title>\n';
          xml += '    </news:news>\n';
        }

        // 图片扩展标签（有助于图片搜索索引）
        if (article.cover_image) {
          xml += '    <image:image>\n';
          xml += '      <image:loc>' + escapeXml(article.cover_image) + '</image:loc>\n';
          xml += '      <image:title>' + escapeXml(article.title) + '</image:title>\n';
          if (article.excerpt) {
            xml += '      <image:caption>' + escapeXml(article.excerpt) + '</image:caption>\n';
          }
          xml += '    </image:image>\n';
        }

        xml += '  </url>\n';
      }
    }
  } catch (e) {
    // 数据库查询失败时不添加文章链接，但静态页面仍然可用
    console.error('Sitemap: 读取文章列表失败:', e.message);
  }

  // 从数据库获取已发布的自定义页面（/p/:slug）
  try {
    const pages = await env.FUXICUN_DB.prepare(
      "SELECT slug, updated_at, created_at FROM pages WHERE status = 'published' AND slug IS NOT NULL"
    ).all();

    if (pages.results && pages.results.length > 0) {
      for (const p of pages.results) {
        var pageLastmod = (p.updated_at || p.created_at || now).split('T')[0];
        xml += '  <url>\n';
        xml += '    <loc>' + baseUrl + '/p/' + encodeURIComponent(p.slug) + '</loc>\n';
        xml += '    <lastmod>' + pageLastmod + '</lastmod>\n';
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '    <priority>0.5</priority>\n';
        xml += '  </url>\n';
      }
    }
  } catch (e) {
    console.error('Sitemap: 读取自定义页面失败:', e.message);
  }

  xml += '</urlset>';

  // 返回 XML 响应，设置缓存头（1小时浏览器缓存）
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

/**
 * 转义 XML 特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
