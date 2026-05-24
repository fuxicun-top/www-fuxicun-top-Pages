// ========================================
// 文件说明：公开数据路由（无需认证）
// 文件路径：functions/api/routes/public.js
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst } from '../utils/db.js';
import { sanitizeHtml } from '../utils/helpers.js';

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
  const categories = await dbQuery(
    env.FUXICUN_DB,
    'SELECT id, name, slug, description FROM categories ORDER BY sort_order'
  );
  return successResponse(categories.results || []);
}

async function getBanners(env) {
  const banners = await dbQuery(
    env.FUXICUN_DB,
    "SELECT id, title, subtitle, image_url, link_url FROM banners WHERE status = 'active' ORDER BY sort_order"
  );
  return successResponse(banners.results || []);
}

async function getPublicConfig(env) {
  // 尝试从 KV 缓存读取
  if (env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get('cache:config', 'json');
      if (cached) return successResponse(cached);
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
  if (env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('cache:config', JSON.stringify(result), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return successResponse(result);
}

// 获取导航菜单（公开，带 KV 缓存）
async function getNavItems(env) {
  // 尝试从 KV 缓存读取
  if (env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get('cache:nav', 'json');
      if (cached) return successResponse(cached);
    } catch (e) { /* 降级到数据库 */ }
  }

  const items = await dbQuery(
    env.FUXICUN_DB,
    "SELECT id, name, url, is_external FROM nav_items WHERE status = 'active' ORDER BY sort_order"
  );
  const list = items.results || [];

  // 写入 KV 缓存（10分钟）
  if (env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('cache:nav', JSON.stringify(list), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return successResponse(list);
}

// 通过 slug 获取自定义页面（公开，带 KV 缓存）
async function getPageBySlug(env, slug) {
  // 尝试从 KV 缓存读取
  const cacheKey = 'cache:page:' + slug;
  if (env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return successResponse(cached);
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
  if (env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(page), { expirationTtl: 600 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return successResponse(page);
}

// 公开媒体列表（仅返回图片，用于首页画廊预览）
async function getPublicMedia(request, env) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 8));
  const type = url.searchParams.get('type') || 'image';
  const offset = (page - 1) * pageSize;

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

  return successResponse({
    list: result.results || [],
    total: countResult?.count || 0
  });
}
