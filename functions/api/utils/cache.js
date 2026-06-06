// ========================================
// 文件说明：KV 缓存工具模块
// 文件路径：functions/api/utils/cache.js
// 功能：文章列表缓存清除、导航缓存清除、页面缓存清除
// ========================================

/**
 * 给响应添加 X-Cache 头（HIT/MISS），方便调试
 * @param {Response} response - 原始响应
 * @param {string} status - 'HIT' 或 'MISS'
 * @returns {Response} 带 X-Cache 头的响应
 */
export function withCacheHeader(response, status) {
  const headers = new Headers(response.headers);
  headers.set('X-Cache', status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

/**
 * 检查 KV 缓存是否启用
 * 从 KV 读取 setting:cache_enabled，避免每次查 DB
 * @param {Object} env - Cloudflare 环境对象
 * @returns {boolean} 是否启用缓存
 */
export async function isCacheEnabled(env) {
  if (!env.FUXICUN_KV) return false;
  try {
    const val = await env.FUXICUN_KV.get('setting:cache_enabled');
    if (val === null) return false; // 默认关闭
    return val === 'true';
  } catch (e) {
    return false; // KV 异常时默认关闭
  }
}

/**
 * 清除文章列表的 KV 缓存
 * 在文章增删改时调用，确保列表数据一致性
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearArticlesCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    // 列出所有文章列表缓存键并删除
    const keys = await env.FUXICUN_KV.list({ prefix: 'articles:list:' });
    for (const key of keys.keys) {
      await env.FUXICUN_KV.delete(key.name);
    }
  } catch (e) {
    console.error('清除文章缓存失败:', e.message);
  }
}

/**
 * 清除导航菜单的 KV 缓存
 * 在导航项增删改时调用
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearNavCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    await env.FUXICUN_KV.delete('cache:nav');
  } catch (e) {
    console.error('清除导航缓存失败:', e.message);
  }
}

/**
 * 清除指定 slug 的自定义页面 KV 缓存
 * @param {Object} env - Cloudflare 环境对象
 * @param {string} slug - 页面标识
 */
export async function clearPageCache(env, slug) {
  if (!env.FUXICUN_KV || !slug) return;
  try {
    await env.FUXICUN_KV.delete('cache:page:' + slug);
  } catch (e) {
    console.error('清除页面缓存失败:', e.message);
  }
}

/**
 * 清除网站配置的 KV 缓存
 * 在配置更新时调用
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearConfigCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    await env.FUXICUN_KV.delete('cache:config');
  } catch (e) {
    console.error('清除配置缓存失败:', e.message);
  }
}

/**
 * 清除分类列表的 KV 缓存
 * 在分类增删改时调用
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearCategoriesCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    await env.FUXICUN_KV.delete('cache:categories');
  } catch (e) {
    console.error('清除分类缓存失败:', e.message);
  }
}

/**
 * 清除轮播图的 KV 缓存
 * 在轮播图增删改时调用
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearBannersCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    await env.FUXICUN_KV.delete('cache:banners');
  } catch (e) {
    console.error('清除轮播图缓存失败:', e.message);
  }
}

/**
 * 清除指定文章评论的 KV 缓存
 * 在评论发表/删除时调用
 * @param {Object} env - Cloudflare 环境对象
 * @param {number} articleId - 文章 ID
 */
export async function clearCommentsCache(env, articleId) {
  if (!env.FUXICUN_KV) return;
  try {
    await env.FUXICUN_KV.delete('cache:comments:' + articleId);
  } catch (e) {
    console.error('清除评论缓存失败:', e.message);
  }
}

/**
 * 清除指定文章评论策略的 KV 缓存
 * 在文章评论策略变更时调用
 * @param {Object} env - Cloudflare 环境对象
 * @param {number} articleId - 文章 ID
 */
export async function clearCommentPolicyCache(env, articleId) {
  if (!env.FUXICUN_KV) return;
  try {
    await env.FUXICUN_KV.delete('cache:comment-policy:' + articleId);
  } catch (e) {
    console.error('清除评论策略缓存失败:', e.message);
  }
}

/**
 * 清除所有文章评论策略的 KV 缓存
 * 在全局评论策略变更时调用
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearAllCommentPolicyCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    const keys = await env.FUXICUN_KV.list({ prefix: 'cache:comment-policy:' });
    for (const key of keys.keys) {
      await env.FUXICUN_KV.delete(key.name);
    }
  } catch (e) {
    console.error('清除评论策略缓存失败:', e.message);
  }
}

/**
 * 清除媒体列表的 KV 缓存
 * 在媒体上传/删除时调用
 * @param {Object} env - Cloudflare 环境对象
 */
export async function clearMediaCache(env) {
  if (!env.FUXICUN_KV) return;
  try {
    const keys = await env.FUXICUN_KV.list({ prefix: 'cache:media:' });
    for (const key of keys.keys) {
      await env.FUXICUN_KV.delete(key.name);
    }
  } catch (e) {
    console.error('清除媒体缓存失败:', e.message);
  }
}
