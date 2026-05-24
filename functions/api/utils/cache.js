// ========================================
// 文件说明：KV 缓存工具模块
// 文件路径：functions/api/utils/cache.js
// 功能：文章列表缓存清除、导航缓存清除、页面缓存清除
// ========================================

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
