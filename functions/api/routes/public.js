// ========================================
// 文件说明：公开数据路由（无需认证）
// 文件路径：functions/api/routes/public.js
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst } from '../utils/db.js';
import { sanitizeHtml } from '../utils/helpers.js';
import { isCacheEnabled, withCacheHeader } from '../utils/cache.js';

export async function handlePublic(request, env, path, method) {
  if (method !== 'GET') {
    return errorResponse('方法不允许', 405);
  }

  if (path === '/categories') {
    return await getCategories(env);
  }

  if (path === '/banners') {
    return await getBanners(env);
  }

  if (path === '/config') {
    return await getPublicConfig(env);
  }

  if (path === '/nav') {
    return await getNavItems(env);
  }

  if (path === '/home-modules') {
    return await getHomeModules(env);
  }

  if (path === '/page-articles') {
    return await getPageArticles(request, env);
  }

  if (path === '/page-sections') {
    return await getPageSections(request, env);
  }

  // 自定义页面：/pages/:slug
  const pageMatch = path.match(/^\/pages\/([^\/]+)$/);
  if (pageMatch && method === 'GET') {
    return await getPageBySlug(env, pageMatch[1]);
  }

  // 公开媒体列表：/media
  if (path === '/media' && method === 'GET') {
    return await getPublicMedia(request, env);
  }

  return errorResponse('接口不存在', 404);
}

async function getCategories(env) {
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get('cache:categories', 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const categories = await dbQuery(
    env.FUXICUN_DB,
    'SELECT id, name, slug, description FROM categories ORDER BY sort_order'
  );
  const list = categories.results || [];

  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('cache:categories', JSON.stringify(list), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(list), 'MISS');
}

async function getBanners(env) {
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get('cache:banners', 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const banners = await dbQuery(
    env.FUXICUN_DB,
    "SELECT id, title, subtitle, image_url, link_url FROM banners WHERE status = 'active' ORDER BY sort_order"
  );
  const list = banners.results || [];

  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('cache:banners', JSON.stringify(list), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(list), 'MISS');
}

async function getPublicConfig(env) {
  // 尝试从 KV 缓存读取
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get('cache:config', 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const configs = await dbQuery(
    env.FUXICUN_DB,
    "SELECT key, value FROM site_config WHERE key IN ('site_name', 'site_description', 'site_keywords', 'contact_email', 'contact_phone', 'contact_address', 'icp_number', 'copyright_text', 'theme_primary_color', 'theme_primary_light', 'theme_primary_bg', 'theme_secondary_color', 'theme_memorial_dates', 'theme_memorial_mode', 'home_featured', 'home_news')"
  );
  const result = {};
  (configs.results || []).forEach(function(c) {
    result[c.key] = c.value;
  });

  // 写入 KV 缓存（10分钟）
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('cache:config', JSON.stringify(result), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(result), 'MISS');
}

// 获取导航菜单（公开，带 KV 缓存）
async function getNavItems(env) {
  // 尝试从 KV 缓存读取
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get('cache:nav', 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const items = await dbQuery(
    env.FUXICUN_DB,
    "SELECT id, name, url, is_external FROM nav_items WHERE status = 'active' ORDER BY sort_order"
  );
  const list = items.results || [];

  // 写入 KV 缓存（10分钟）
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('cache:nav', JSON.stringify(list), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(list), 'MISS');
}

// 通过 slug 获取自定义页面（公开，带 KV 缓存）
async function getPageBySlug(env, slug) {
  // 尝试从 KV 缓存读取
  const cacheKey = 'cache:page:' + slug;
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const page = await dbQueryFirst(
    env.FUXICUN_DB,
    "SELECT id, title, slug, content, cover_image, created_at, updated_at FROM pages WHERE slug = ? AND status = 'published'",
    [slug]
  );

  if (!page) {
    return errorResponse('页面不存在', 404);
  }

  // 对页面内容做 XSS 防护清理
  page.content = sanitizeHtml(page.content);

  // 写入 KV 缓存（10分钟）
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(page), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(page), 'MISS');
}

// 公开媒体列表（仅返回图片，用于首页画廊预览）
async function getPublicMedia(request, env) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 8));
  const type = url.searchParams.get('type') || 'image';
  const offset = (page - 1) * pageSize;

  const cacheKey = 'cache:media:' + type + ':' + page + ':' + pageSize;
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM media WHERE type LIKE ?',
    [type + '%']
  );

  const result = await dbQuery(
    env.FUXICUN_DB,
    'SELECT id, filename, original_name, url, type, created_at FROM media WHERE type LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [type + '%', pageSize, offset]
  );

  const data = {
    list: result.results || [],
    total: countResult?.count || 0
  };

  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(data), 'MISS');
}

// 首页模块列表（公开，仅返回 active 模块）
async function getHomeModules(env) {
  // 尝试从 KV 缓存读取
  const cacheKey = 'cache:home-modules';
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const modules = await dbQuery(
    env.FUXICUN_DB,
    "SELECT id, type, title, subtitle, sort_order, config FROM home_modules WHERE status = 'active' ORDER BY sort_order"
  );

  const list = (modules.results || []).map(function(m) {
    // 解析 config JSON
    if (m.config) {
      try { m.config = JSON.parse(m.config); } catch (e) { m.config = {}; }
    } else {
      m.config = {};
    }
    return m;
  });

  // 写入 KV 缓存（5分钟）
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(list), { expirationTtl: 300 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(list), 'MISS');
}

// 获取内容页面相关文章（公开，带 KV 缓存）
async function getPageArticles(request, env) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';

  if (!slug) {
    return errorResponse('缺少页面标识');
  }

  const cacheKey = 'cache:page-articles:' + slug;
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  // 页面与分类的对应关系
  const pageCategoryMap = {
    'about': 'village-news',
    'culture': 'lixue-culture',
    'scenery': 'architecture',
    'ethnic': 'folk-custom',
    'travel': 'travel-guide'
  };

  const categorySlug = pageCategoryMap[slug];
  if (!categorySlug) {
    return errorResponse('无效的页面标识');
  }

  // 获取该页面所有槽位
  const slots = await dbQuery(
    env.FUXICUN_DB,
    "SELECT id, article_id, mode FROM page_articles WHERE page_slug = ? ORDER BY sort_order",
    [slug]
  );

  const slotList = slots.results || [];
  const articles = [];

  for (const slot of slotList) {
    if (slot.mode === 'manual' && slot.article_id) {
      // 手动模式：获取指定文章
      const article = await dbQueryFirst(
        env.FUXICUN_DB,
        `SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.published_at,
                COALESCE(u.display_name, u.username) as author_name
         FROM articles a LEFT JOIN users u ON a.author_id = u.id
         WHERE a.id = ? AND a.status = 'published'`,
        [slot.article_id]
      );
      if (article) articles.push(article);
    } else if (slot.mode === 'latest' || slot.mode === 'likes' || slot.mode === 'views') {
      // 自动模式：按分类获取一篇未使用的文章
      const sortField = slot.mode === 'likes' ? 'a.likes DESC' : slot.mode === 'views' ? 'a.views DESC' : 'a.published_at DESC';
      const usedIds = articles.map(a => a.id);
      const excludeClause = usedIds.length > 0 ? 'AND a.id NOT IN (' + usedIds.join(',') + ')' : '';
      const article = await dbQueryFirst(
        env.FUXICUN_DB,
        `SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.published_at,
                COALESCE(u.display_name, u.username) as author_name
         FROM articles a
         LEFT JOIN users u ON a.author_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.status = 'published' AND c.slug = ? ${excludeClause}
         ORDER BY ${sortField} LIMIT 1`,
        [categorySlug]
      );
      if (article) articles.push(article);
    }
  }

  const data = { articles: articles };

  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 300 });
    } catch (e) { /* 忽略 */ }
  }

  return withCacheHeader(successResponse(data), 'MISS');
}

// 获取页面板块内容（公开，带 KV 缓存）
async function getPageSections(request, env) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';

  if (!slug) return errorResponse('缺少页面标识');

  const cacheKey = 'cache:page-sections:' + slug;
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const sections = await dbQuery(
    env.FUXICUN_DB,
    "SELECT section_key, title, content, sort_order FROM page_sections WHERE page_slug = ? ORDER BY sort_order",
    [slug]
  );

  const result = sections.results || [];

  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 600 });
    } catch (e) { /* 忽略 */ }
  }

  return withCacheHeader(successResponse(result), 'MISS');
}
