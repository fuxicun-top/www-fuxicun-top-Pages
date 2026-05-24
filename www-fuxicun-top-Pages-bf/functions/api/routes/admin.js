// ========================================
// 文件说明：后台管理路由
// 文件路径：functions/api/routes/admin.js
// 功能：仪表盘、文章管理、评论管理、用户管理、分类管理、
//       轮播图管理、网站设置、媒体管理、操作日志、导航管理、自定义页面管理
// ========================================

import { successResponse, errorResponse, listResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst, dbRun } from '../utils/db.js';
import { requireAdmin, requireEditor } from '../middleware/auth.js';
import { generateSlug, sanitizeHtml, escapeHtml } from '../utils/helpers.js';
import { clearArticlesCache, clearNavCache, clearPageCache, clearConfigCache } from '../utils/cache.js';

/**
 * 后台管理路由分发
 * 权限分层：
 *   - admin-only：用户管理、网站设置、导航管理、自定义页面管理
 *   - editor-allowed：仪表盘、文章管理、评论管理、媒体管理、分类管理、轮播图、操作日志
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量
 * @param {string} path - 请求路径
 * @param {string} method - HTTP 方法
 */
export async function handleAdmin(request, env, path, method) {
  // 管理员专属路由（用户管理、网站设置、导航管理、自定义页面管理）
  const adminOnlyPaths = [
    '/admin/users',
    '/admin/config',
    '/admin/nav',
    '/admin/pages'
  ];
  const isAdminOnly = adminOnlyPaths.some(function(p) { return path.startsWith(p); });

  const auth = isAdminOnly
    ? await requireAdmin(request, env)
    : await requireEditor(request, env);
  if (auth.error) return auth.error;

  const user = auth.user;

  // === 仪表盘统计 ===
  if (path === '/admin/stats' && method === 'GET') {
    return await getStats(env);
  }
  if (path === '/admin/recent-articles' && method === 'GET') {
    return await getRecentArticles(env);
  }

  // === 用户管理（admin-only） ===
  if (path === '/admin/users' && method === 'GET') {
    return await getUsers(request, env);
  }
  if (path.match(/^\/admin\/users\/\d+\/role$/) && method === 'PUT') {
    return await updateUserRole(request, env, path, user);
  }
  if (path.match(/^\/admin\/users\/\d+\/status$/) && method === 'PUT') {
    return await updateUserStatus(request, env, path, user);
  }
  if (path.match(/^\/admin\/users\/\d+$/) && method === 'DELETE') {
    return await deleteUser(env, path, user);
  }

  // === 分类管理 ===
  if (path === '/admin/categories' && method === 'GET') {
    return await getCategories(env);
  }
  if (path === '/admin/categories' && method === 'POST') {
    return await createCategory(request, env);
  }
  // === 分类管理 - 批量更新排序 ===
  if (path === '/admin/categories/sort' && method === 'PUT') {
    return await sortCategories(request, env);
  }

  // === 分类管理 - 更新 ===
  if (path.match(/^\/admin\/categories\/\d+$/) && method === 'PUT') {
    return await updateCategory(request, env, path);
  }
  if (path.match(/^\/admin\/categories\/\d+$/) && method === 'DELETE') {
    return await deleteCategory(env, path);
  }

  // === 轮播图管理 ===
  if (path === '/admin/banners' && method === 'GET') {
    return await getBanners(env);
  }
  if (path === '/admin/banners' && method === 'POST') {
    return await createBanner(request, env);
  }
  // === 轮播图管理 - 批量更新排序 ===
  if (path === '/admin/banners/sort' && method === 'PUT') {
    return await sortBanners(request, env);
  }
  if (path.match(/^\/admin\/banners\/\d+$/) && method === 'PUT') {
    return await updateBanner(request, env, path);
  }
  if (path.match(/^\/admin\/banners\/\d+$/) && method === 'DELETE') {
    return await deleteBanner(env, path);
  }

  // === 网站设置（admin-only） ===
  if (path === '/admin/config' && method === 'GET') {
    return await getConfig(env);
  }
  if (path === '/admin/config' && method === 'PUT') {
    return await updateConfig(request, env);
  }

  // === 文章管理 ===
  if (path === '/admin/articles' && method === 'GET') {
    return await getArticles(request, env);
  }
  if (path === '/admin/articles' && method === 'POST') {
    return await createArticle(request, env, user);
  }
  if (path.match(/^\/admin\/articles\/\d+$/) && method === 'PUT') {
    return await updateArticle(request, env, path);
  }
  if (path.match(/^\/admin\/articles\/\d+$/) && method === 'DELETE') {
    return await deleteArticle(env, path);
  }
  if (path.match(/^\/admin\/articles\/\d+\/status$/) && method === 'PUT') {
    return await updateArticleStatus(request, env, path);
  }

  // === 评论管理 ===
  if (path === '/admin/comments' && method === 'GET') {
    return await getComments(request, env);
  }
  if (path.match(/^\/admin\/comments\/\d+\/status$/) && method === 'PUT') {
    return await updateCommentStatus(request, env, path);
  }
  if (path.match(/^\/admin\/comments\/\d+$/) && method === 'DELETE') {
    return await deleteComment(env, path);
  }

  // === 媒体管理 ===
  if (path === '/admin/media' && method === 'GET') {
    return await getMedia(request, env);
  }
  if (path.match(/^\/admin\/media\/\d+$/) && method === 'DELETE') {
    return await deleteMedia(env, path);
  }

  // === 操作日志 ===
  if (path === '/admin/logs' && method === 'GET') {
    return await getLogs(request, env);
  }

  // === 数据备份 ===
  if (path === '/admin/backup' && method === 'GET') {
    return await exportBackup(env);
  }
  if (path === '/admin/backup/r2' && method === 'POST') {
    return await backupToR2(request, env);
  }
  if (path === '/admin/backup/list' && method === 'GET') {
    return await listBackups(env);
  }

  // === 导航管理（admin-only） ===
  if (path === '/admin/nav' && method === 'GET') {
    return await getNavItems(env);
  }
  if (path === '/admin/nav' && method === 'POST') {
    return await createNavItem(request, env);
  }
  if (path.match(/^\/admin\/nav\/\d+$/) && method === 'PUT') {
    return await updateNavItem(request, env, path);
  }
  if (path.match(/^\/admin\/nav\/\d+$/) && method === 'DELETE') {
    return await deleteNavItem(env, path);
  }

  // === 自定义页面管理（admin-only） ===
  if (path === '/admin/pages' && method === 'GET') {
    return await getPages(env);
  }
  if (path === '/admin/pages' && method === 'POST') {
    return await createPage(request, env);
  }
  if (path.match(/^\/admin\/pages\/\d+$/) && method === 'PUT') {
    return await updatePage(request, env, path);
  }
  if (path.match(/^\/admin\/pages\/\d+$/) && method === 'DELETE') {
    return await deletePage(env, path);
  }

  return errorResponse('接口不存在', 404);
}

// ==============================
// 仪表盘 - 统计数据
// ==============================
async function getStats(env) {
  try {
    const users = await dbQueryFirst(env.FUXICUN_DB, 'SELECT COUNT(*) as count FROM users');
    const articles = await dbQueryFirst(env.FUXICUN_DB, 'SELECT COUNT(*) as count FROM articles');
    const comments = await dbQueryFirst(env.FUXICUN_DB, 'SELECT COUNT(*) as count FROM comments');
    const views = await dbQueryFirst(env.FUXICUN_DB, 'SELECT COALESCE(SUM(views), 0) as count FROM articles');

    return successResponse({
      users: users?.count || 0,
      articles: articles?.count || 0,
      comments: comments?.count || 0,
      totalViews: views?.count || 0
    });
  } catch (e) {
    console.error('获取统计数据失败:', e);
    return errorResponse('获取统计数据失败');
  }
}

// ==============================
// 仪表盘 - 最近文章
// ==============================
async function getRecentArticles(env) {
  const articles = await dbQuery(
    env.FUXICUN_DB,
    'SELECT id, title, status, created_at FROM articles ORDER BY created_at DESC LIMIT 10'
  );
  return successResponse(articles.results || []);
}

// ==============================
// 用户管理 - 列表
// ==============================
async function getUsers(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20));
  const keyword = url.searchParams.get('keyword') || '';
  const role = url.searchParams.get('role') || '';
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  let params = [];

  if (keyword) {
    where += ' AND (username LIKE ? OR phone LIKE ?)';
    params.push('%' + keyword + '%', '%' + keyword + '%');
  }
  if (role) {
    where += ' AND role = ?';
    params.push(role);
  }

  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM users WHERE ' + where,
    params
  );

  const users = await dbQuery(
    env.FUXICUN_DB,
    'SELECT id, username, phone, email, role, status, created_at FROM users WHERE ' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [...params, pageSize, offset]
  );

  return listResponse(users.results || [], countResult?.count || 0, page, pageSize);
}

// ==============================
// 用户管理 - 修改角色
// ==============================
async function updateUserRole(request, env, path, currentUser) {
  try {
    const id = path.match(/\/admin\/users\/(\d+)\/role/)[1];
    const { role } = await request.json();

    if (!['user', 'editor', 'admin'].includes(role)) {
      return errorResponse('无效的角色');
    }

    await dbRun(env.FUXICUN_DB, "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, id]);

    // 写入操作日志（使用当前操作者ID）
    await writeAuditLog(env, currentUser.id, 'user_role_change', 'user', id, '角色变更为: ' + role);

    return successResponse(null, '角色更新成功');
  } catch (e) {
    console.error('修改用户角色失败:', e);
    return errorResponse('修改角色失败: ' + e.message);
  }
}

// ==============================
// 用户管理 - 修改状态
// ==============================
async function updateUserStatus(request, env, path, currentUser) {
  try {
    const id = path.match(/\/admin\/users\/(\d+)\/status/)[1];
    const { status } = await request.json();

    if (!['active', 'disabled'].includes(status)) {
      return errorResponse('无效的状态');
    }

    await dbRun(env.FUXICUN_DB, "UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);

    // 写入操作日志（使用当前操作者ID）
    await writeAuditLog(env, currentUser.id, 'user_status_change', 'user', id, '状态变更为: ' + status);

    return successResponse(null, '状态更新成功');
  } catch (e) {
    console.error('修改用户状态失败:', e);
    return errorResponse('修改状态失败: ' + e.message);
  }
}

// ==============================
// 用户管理 - 删除用户
// ==============================
async function deleteUser(env, path, currentUser) {
  try {
    const id = path.match(/\/admin\/users\/(\d+)/)[1];

  // 不能删除自己
  if (parseInt(id) === currentUser.id) {
    return errorResponse('不能删除自己的账号');
  }

  const user = await dbQueryFirst(env.FUXICUN_DB, 'SELECT * FROM users WHERE id = ?', [id]);
  if (!user) {
    return errorResponse('用户不存在', 404);
  }

  // 不能删除最后一个管理员
  if (user.role === 'admin') {
    const adminCount = await dbQueryFirst(env.FUXICUN_DB, "SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    if (adminCount?.count <= 1) {
      return errorResponse('不能删除最后一个管理员');
    }
  }

  // 级联删除用户相关数据：先删该用户文章的评论/点赞，再删文章，
  // 然后删用户其他评论/点赞/会话，最后删用户本身。
  // 顺序非常关键 — 否则 comments.article_id 会指向已删除文章，
  // 或 likes.article_id 同样产生孤儿，浏览前台时 JOIN 会出现幽灵数据。

  // 1) 该用户名下所有文章的 ID
  const userArticles = await dbQuery(env.FUXICUN_DB, 'SELECT id FROM articles WHERE author_id = ?', [id]);
  const articleIds = (userArticles.results || []).map(function(a) { return a.id; });

  // 2) 先清理这些文章下的评论与点赞
  for (const aid of articleIds) {
    await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE article_id = ?', [aid]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM likes WHERE article_id = ?', [aid]);
  }

  // 3) 再删该用户的所有文章
  await dbRun(env.FUXICUN_DB, 'DELETE FROM articles WHERE author_id = ?', [id]);

  // 4) 删该用户在别人文章下的评论 / 点赞 / 会话
  await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE user_id = ?', [id]);
  await dbRun(env.FUXICUN_DB, 'DELETE FROM likes WHERE user_id = ?', [id]);
  await dbRun(env.FUXICUN_DB, 'DELETE FROM sessions WHERE user_id = ?', [id]);

  // 5) 最后删用户记录
  await dbRun(env.FUXICUN_DB, 'DELETE FROM users WHERE id = ?', [id]);

  // 写入操作日志
  await writeAuditLog(env, currentUser.id, 'user_delete', 'user', id, '删除用户: ' + user.username);

  return successResponse(null, '用户删除成功');
  } catch (e) {
    console.error('删除用户失败:', e);
    return errorResponse('删除用户失败');
  }
}

// ==============================
// 分类管理 - 列表
// ==============================
async function getCategories(env) {
  const categories = await dbQuery(
    env.FUXICUN_DB,
    'SELECT c.*, (SELECT COUNT(*) FROM articles WHERE category_id = c.id) as article_count FROM categories c ORDER BY sort_order'
  );
  return successResponse(categories.results || []);
}

// ==============================
// 分类管理 - 创建
// ==============================
async function createCategory(request, env) {
  try {
    const { name, slug, description, sort_order } = await request.json();

  if (!name || !slug) {
    return errorResponse('名称和别名为必填项');
  }

  // 检查唯一性
  const existing = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT id FROM categories WHERE name = ? OR slug = ?',
    [name, slug]
  );
  if (existing) {
    return errorResponse('分类名称或别名已存在');
  }

  await dbRun(
    env.FUXICUN_DB,
    'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)',
    [name, slug, description || '', sort_order || 0]
  );

  // 写入操作日志
  await writeAuditLog(env, null, 'category_create', 'category', null, '创建分类: ' + name);

  return successResponse(null, '分类创建成功');
  } catch (e) {
    console.error('创建分类失败:', e);
    return errorResponse('创建分类失败');
  }
}

// ==============================
// 分类管理 - 更新
// ==============================
async function updateCategory(request, env, path) {
  const id = path.match(/\/admin\/categories\/(\d+)/)[1];
  const { name, slug, description, sort_order } = await request.json();

  await dbRun(
    env.FUXICUN_DB,
    'UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?',
    [name, slug, description || '', sort_order || 0, id]
  );

  // 清除文章列表缓存（分类变更可能影响文章显示）
  await clearArticlesCache(env);

  return successResponse(null, '分类更新成功');
}

// ==============================
// 分类管理 - 批量更新排序
// 接收格式：[{ id: 1, sort_order: 0 }, { id: 2, sort_order: 1 }, ...]
// ==============================
async function sortCategories(request, env) {
  try {
    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse('排序数据格式无效');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id || item.sort_order === undefined) continue;
      await dbRun(
        env.FUXICUN_DB,
        'UPDATE categories SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }

    await clearArticlesCache(env);

    await writeAuditLog(env, null, 'category_sort', 'category', null, '更新分类排序');

    return successResponse(null, '排序更新成功');
  } catch (e) {
    return errorResponse('排序更新失败: ' + e.message);
  }
}

// ==============================
// 分类管理 - 删除
// ==============================
async function deleteCategory(env, path) {
  const id = path.match(/\/admin\/categories\/(\d+)/)[1];

  // 检查分类下是否有文章
  const articles = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM articles WHERE category_id = ?',
    [id]
  );

  if (articles?.count > 0) {
    return errorResponse('该分类下有 ' + articles.count + ' 篇文章，无法删除');
  }

  await dbRun(env.FUXICUN_DB, 'DELETE FROM categories WHERE id = ?', [id]);
  await clearArticlesCache(env);

  return successResponse(null, '分类删除成功');
}

// ==============================
// 轮播图管理 - 列表
// ==============================
async function getBanners(env) {
  const banners = await dbQuery(
    env.FUXICUN_DB,
    'SELECT * FROM banners ORDER BY sort_order'
  );
  return successResponse(banners.results || []);
}

// ==============================
// 轮播图管理 - 创建
// ==============================
async function createBanner(request, env) {
  const { title, subtitle, image_url, link_url, sort_order, status } = await request.json();

  if (!title || !image_url) {
    return errorResponse('标题和图片为必填项');
  }

  await dbRun(
    env.FUXICUN_DB,
    'INSERT INTO banners (title, subtitle, image_url, link_url, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
    [title, subtitle || '', image_url, link_url || '', sort_order || 0, status || 'active']
  );

  await writeAuditLog(env, null, 'banner_create', 'banner', null, '创建轮播图: ' + title);

  return successResponse(null, '轮播图创建成功');
}

// ==============================
// 轮播图管理 - 批量更新排序
// 接收格式：[{ id: 1, sort_order: 0 }, { id: 2, sort_order: 1 }, ...]
// ==============================
async function sortBanners(request, env) {
  try {
    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse('排序数据格式无效');
    }

    // 逐条更新排序值
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.id || item.sort_order === undefined) continue;
      await dbRun(
        env.FUXICUN_DB,
        'UPDATE banners SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }

    await writeAuditLog(env, null, 'banner_sort', 'banner', null, '更新轮播图排序');

    return successResponse(null, '排序更新成功');
  } catch (e) {
    return errorResponse('排序更新失败: ' + e.message);
  }
}

// ==============================
// 轮播图管理 - 更新
// ==============================
async function updateBanner(request, env, path) {
  const id = path.match(/\/admin\/banners\/(\d+)/)[1];
  const { title, subtitle, image_url, link_url, sort_order, status } = await request.json();

  await dbRun(
    env.FUXICUN_DB,
    'UPDATE banners SET title = ?, subtitle = ?, image_url = ?, link_url = ?, sort_order = ?, status = ? WHERE id = ?',
    [title, subtitle || '', image_url, link_url || '', sort_order || 0, status || 'active', id]
  );

  return successResponse(null, '轮播图更新成功');
}

// ==============================
// 轮播图管理 - 删除
// ==============================
async function deleteBanner(env, path) {
  try {
    const id = path.match(/\/admin\/banners\/(\d+)/)[1];
    await dbRun(env.FUXICUN_DB, 'DELETE FROM banners WHERE id = ?', [id]);
    return successResponse(null, '轮播图删除成功');
  } catch (e) {
    console.error('删除轮播图失败:', e);
    return errorResponse('删除轮播图失败');
  }
}

// ==============================
// 网站设置 - 读取
// ==============================
async function getConfig(env) {
  const configs = await dbQuery(env.FUXICUN_DB, 'SELECT key, value FROM site_config');
  const result = {};
  (configs.results || []).forEach(function(c) {
    result[c.key] = c.value;
  });
  return successResponse(result);
}

// ==============================
// 网站设置 - 更新
// ==============================
async function updateConfig(request, env) {
  const ALLOWED_CONFIG_KEYS = [
    'site_name', 'site_description', 'site_keywords',
    'contact_email', 'contact_phone', 'contact_address',
    'icp_number', 'copyright_text', 'footer_text',
    'theme_primary_color', 'theme_primary_light', 'theme_primary_bg',
    'theme_secondary_color', 'theme_memorial_dates', 'theme_memorial_mode'
  ];

  const data = await request.json();

  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_CONFIG_KEYS.includes(key)) continue;
    await dbRun(
      env.FUXICUN_DB,
      "INSERT INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [key, String(value).substring(0, 10000)]
    );
  }

  // 清除配置缓存
  await clearConfigCache(env);

  await writeAuditLog(env, null, 'config_update', 'config', null, '更新网站设置');

  return successResponse(null, '设置保存成功');
}

// ==============================
// 文章管理 - 列表
// ==============================
async function getArticles(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20));
  const status = url.searchParams.get('status') || '';
  const keyword = url.searchParams.get('keyword') || '';
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  let params = [];

  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  if (keyword) {
    where += ' AND a.title LIKE ?';
    params.push('%' + keyword + '%');
  }

  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM articles a WHERE ' + where,
    params
  );

  const articles = await dbQuery(
    env.FUXICUN_DB,
    'SELECT a.*, u.username as author_name, c.name as category_name FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id WHERE ' + where + ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?',
    [...params, pageSize, offset]
  );

  return listResponse(articles.results || [], countResult?.count || 0, page, pageSize);
}

// ==============================
// 文章管理 - 创建（管理员直接发布）
// ==============================
async function createArticle(request, env, user) {
  try {
    const { title, content, excerpt, cover_image, category_id, status } = await request.json();

  if (!title || !content) {
    return errorResponse('标题和内容为必填项');
  }

  // 管理员可以直接选择状态，默认为已发布
  const articleStatus = status || 'published';
  const publishedAt = articleStatus === 'published' ? new Date().toISOString() : null;

  // 使用公共 slug 生成函数
  const slug = generateSlug(title);

  const result = await dbRun(
    env.FUXICUN_DB,
    "INSERT INTO articles (title, slug, content, excerpt, cover_image, category_id, author_id, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [title, slug, content, excerpt || '', cover_image || '', category_id || null, user.id, articleStatus, publishedAt]
  );

  // 清除文章列表缓存
  await clearArticlesCache(env);

  // 写入操作日志
  await writeAuditLog(env, user.id, 'article_create', 'article', result.meta.last_row_id, '创建文章: ' + title);

  return successResponse({ id: result.meta.last_row_id, slug: slug }, '文章创建成功');
  } catch (e) {
    console.error('创建文章失败:', e);
    return errorResponse('创建文章失败');
  }
}

// ==============================
// 文章管理 - 更新
// ==============================
async function updateArticle(request, env, path) {
  try {
    const id = path.match(/\/admin\/articles\/(\d+)/)[1];
  const { title, content, excerpt, cover_image, category_id } = await request.json();

  const article = await dbQueryFirst(env.FUXICUN_DB, 'SELECT * FROM articles WHERE id = ?', [id]);
  if (!article) {
    return errorResponse('文章不存在', 404);
  }

  await dbRun(
    env.FUXICUN_DB,
    "UPDATE articles SET title = ?, content = ?, excerpt = ?, cover_image = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?",
    [title || article.title, content || article.content, excerpt ?? article.excerpt, cover_image ?? article.cover_image, category_id ?? article.category_id, id]
  );

  await clearArticlesCache(env);

  await writeAuditLog(env, null, 'article_update', 'article', id, '更新文章: ' + (title || article.title));

  return successResponse(null, '文章更新成功');
  } catch (e) {
    console.error('更新文章失败:', e);
    return errorResponse('更新文章失败');
  }
}

// ==============================
// 文章管理 - 删除（级联删除评论和点赞）
// ==============================
async function deleteArticle(env, path) {
  try {
    const id = path.match(/\/admin\/articles\/(\d+)/)[1];

  const article = await dbQueryFirst(env.FUXICUN_DB, 'SELECT title FROM articles WHERE id = ?', [id]);
  if (!article) {
    return errorResponse('文章不存在', 404);
  }

  await dbRun(env.FUXICUN_DB, 'DELETE FROM articles WHERE id = ?', [id]);
  await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE article_id = ?', [id]);
  await dbRun(env.FUXICUN_DB, 'DELETE FROM likes WHERE article_id = ?', [id]);

  await clearArticlesCache(env);

  await writeAuditLog(env, null, 'article_delete', 'article', id, '删除文章: ' + article.title);

  return successResponse(null, '文章删除成功');
  } catch (e) {
    console.error('删除文章失败:', e);
    return errorResponse('删除文章失败');
  }
}

// ==============================
// 文章管理 - 更新状态（审核）
// ==============================
async function updateArticleStatus(request, env, path) {
  const id = path.match(/\/admin\/articles\/(\d+)\/status/)[1];
  const { status } = await request.json();

  if (!['draft', 'pending', 'published', 'rejected'].includes(status)) {
    return errorResponse('无效的状态');
  }

  const publishedAt = status === 'published' ? new Date().toISOString() : null;

  await dbRun(
    env.FUXICUN_DB,
    "UPDATE articles SET status = ?, published_at = COALESCE(?, published_at), updated_at = datetime('now') WHERE id = ?",
    [status, publishedAt, id]
  );

  await clearArticlesCache(env);

  await writeAuditLog(env, null, 'article_status_change', 'article', id, '状态变更为: ' + status);

  return successResponse(null, '状态更新成功');
}

// ==============================
// 评论管理 - 列表
// ==============================
async function getComments(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20));
  const status = url.searchParams.get('status') || '';
  const keyword = url.searchParams.get('keyword') || '';
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  let params = [];

  if (status) {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (keyword) {
    where += ' AND (c.content LIKE ? OR u.username LIKE ? OR a.title LIKE ?)';
    params.push('%' + keyword + '%', '%' + keyword + '%', '%' + keyword + '%');
  }

  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM comments c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN articles a ON c.article_id = a.id WHERE ' + where,
    params
  );

  const comments = await dbQuery(
    env.FUXICUN_DB,
    `SELECT c.id, c.content, c.status, c.created_at, c.parent_id,
            u.username, u.id as user_id,
            a.title as article_title, a.id as article_id
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN articles a ON c.article_id = a.id
     WHERE ${where}
     ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return listResponse(comments.results || [], countResult?.count || 0, page, pageSize);
}

// ==============================
// 评论管理 - 更新状态（审核通过/拒绝）
// ==============================
async function updateCommentStatus(request, env, path) {
  const id = path.match(/\/admin\/comments\/(\d+)\/status/)[1];
  const { status } = await request.json();

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return errorResponse('无效的状态');
  }

  await dbRun(env.FUXICUN_DB, 'UPDATE comments SET status = ? WHERE id = ?', [status, id]);

  await writeAuditLog(env, null, 'comment_status_change', 'comment', id, '评论状态变更为: ' + status);

  return successResponse(null, '评论状态更新成功');
}

// ==============================
// 评论管理 - 删除（同时删除子评论）
// ==============================
async function deleteComment(env, path) {
  try {
    const id = path.match(/\/admin\/comments\/(\d+)/)[1];

    await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE parent_id = ?', [id]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE id = ?', [id]);

    await writeAuditLog(env, null, 'comment_delete', 'comment', id, '删除评论');

    return successResponse(null, '评论删除成功');
  } catch (e) {
    console.error('删除评论失败:', e);
    return errorResponse('删除评论失败');
  }
}

// ==============================
// 媒体管理 - 列表
// ==============================
async function getMedia(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 24));
  const type = url.searchParams.get('type') || '';
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  let params = [];

  if (type) {
    where += ' AND m.type LIKE ?';
    params.push(type + '%');
  }

  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM media m WHERE ' + where,
    params
  );

  const media = await dbQuery(
    env.FUXICUN_DB,
    `SELECT m.*, u.username as uploader_name
     FROM media m
     LEFT JOIN users u ON m.uploaded_by = u.id
     WHERE ${where}
     ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return listResponse(media.results || [], countResult?.count || 0, page, pageSize);
}

// ==============================
// 媒体管理 - 删除（同时删除 R2 中的文件）
// ==============================
async function deleteMedia(env, path) {
  const id = path.match(/\/admin\/media\/(\d+)/)[1];

  const media = await dbQueryFirst(env.FUXICUN_DB, 'SELECT * FROM media WHERE id = ?', [id]);
  if (!media) {
    return errorResponse('媒体文件不存在', 404);
  }

  // 从 R2 删除文件
  if (env.FUXICUN_BUCKET && media.filename) {
    try {
      await env.FUXICUN_BUCKET.delete(media.filename);
    } catch (e) {
      console.error('R2 删除失败:', e.message);
    }
  }

  await dbRun(env.FUXICUN_DB, 'DELETE FROM media WHERE id = ?', [id]);

  await writeAuditLog(env, null, 'media_delete', 'media', id, '删除媒体: ' + media.original_name);

  return successResponse(null, '媒体文件删除成功');
}

// ==============================
// 操作日志 - 列表
// ==============================
async function getLogs(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20));
  const action = url.searchParams.get('action') || '';
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  let params = [];

  if (action) {
    where += ' AND al.action = ?';
    params.push(action);
  }

  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM audit_logs al WHERE ' + where,
    params
  );

  const logs = await dbQuery(
    env.FUXICUN_DB,
    `SELECT al.*, u.username
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE ${where}
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return listResponse(logs.results || [], countResult?.count || 0, page, pageSize);
}

// ==============================
// 导航管理 - 列表
// ==============================
async function getNavItems(env) {
  const items = await dbQuery(
    env.FUXICUN_DB,
    'SELECT * FROM nav_items ORDER BY sort_order'
  );
  return successResponse(items.results || []);
}

// ==============================
// 导航管理 - 创建
// ==============================
async function createNavItem(request, env) {
  try {
    const { name, url, sort_order, status, is_external } = await request.json();
    if (!name || !url) return errorResponse('名称和链接为必填项');

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO nav_items (name, url, sort_order, status, is_external) VALUES (?, ?, ?, ?, ?)',
      [name, url, sort_order || 0, status || 'active', is_external ? 1 : 0]
    );

    // 清除导航缓存
    await clearNavCache(env);

    await writeAuditLog(env, null, 'nav_create', 'nav', null, '创建导航: ' + name);

    return successResponse(null, '导航添加成功');
  } catch (e) {
    console.error('添加导航失败:', e);
    return errorResponse('添加失败');
  }
}

// ==============================
// 导航管理 - 更新
// ==============================
async function updateNavItem(request, env, path) {
  const id = path.match(/\/admin\/nav\/(\d+)/)[1];
  try {
    const { name, url, sort_order, status, is_external } = await request.json();

    await dbRun(
      env.FUXICUN_DB,
      'UPDATE nav_items SET name = ?, url = ?, sort_order = ?, status = ?, is_external = ? WHERE id = ?',
      [name, url, sort_order || 0, status || 'active', is_external ? 1 : 0, id]
    );

    await clearNavCache(env);

    return successResponse(null, '导航更新成功');
  } catch (e) {
    console.error('更新导航失败:', e);
    return errorResponse('更新失败');
  }
}

// ==============================
// 导航管理 - 删除
// ==============================
async function deleteNavItem(env, path) {
  const id = path.match(/\/admin\/nav\/(\d+)/)[1];
  try {
    await dbRun(env.FUXICUN_DB, 'DELETE FROM nav_items WHERE id = ?', [id]);
    await clearNavCache(env);
    return successResponse(null, '导航删除成功');
  } catch (e) {
    console.error('删除导航失败:', e);
    return errorResponse('删除失败');
  }
}

// ==============================
// 自定义页面管理 - 列表
// ==============================
async function getPages(env) {
  const pages = await dbQuery(
    env.FUXICUN_DB,
    'SELECT * FROM pages ORDER BY created_at DESC'
  );
  return successResponse(pages.results || []);
}

// ==============================
// 自定义页面管理 - 创建
// ==============================
async function createPage(request, env) {
  try {
    const { title, slug, content, cover_image, status } = await request.json();
    if (!title || !slug) return errorResponse('标题和 slug 为必填项');

    // 检查 slug 唯一性
    const existing = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id FROM pages WHERE slug = ?',
      [slug]
    );
    if (existing) return errorResponse('slug 已存在，请使用其他标识');

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO pages (title, slug, content, cover_image, status) VALUES (?, ?, ?, ?, ?)',
      [title, slug, content || '', cover_image || '', status || 'published']
    );

    await writeAuditLog(env, null, 'page_create', 'page', null, '创建页面: ' + title);

    return successResponse(null, '页面创建成功');
  } catch (e) {
    console.error('创建页面失败:', e);
    return errorResponse('创建失败');
  }
}

// ==============================
// 自定义页面管理 - 更新
// ==============================
async function updatePage(request, env, path) {
  const id = path.match(/\/admin\/pages\/(\d+)/)[1];
  try {
    const { title, slug, content, cover_image, status } = await request.json();

    // 查询旧 slug，用于清除缓存
    const oldPage = await dbQueryFirst(env.FUXICUN_DB, 'SELECT slug FROM pages WHERE id = ?', [id]);

    // 检查 slug 唯一性（排除自身）
    if (slug) {
      const existing = await dbQueryFirst(
        env.FUXICUN_DB,
        'SELECT id FROM pages WHERE slug = ? AND id != ?',
        [slug, id]
      );
      if (existing) return errorResponse('slug 已存在');
    }

    await dbRun(
      env.FUXICUN_DB,
      "UPDATE pages SET title = ?, slug = ?, content = ?, cover_image = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
      [title, slug, content, cover_image || '', status || 'published', id]
    );

    // 清除新旧两个 slug 的 KV 缓存
    await clearPageCache(env, slug);
    if (oldPage && oldPage.slug && oldPage.slug !== slug) {
      await clearPageCache(env, oldPage.slug);
    }

    return successResponse(null, '页面更新成功');
  } catch (e) {
    console.error('更新页面失败:', e);
    return errorResponse('更新失败');
  }
}

// ==============================
// 自定义页面管理 - 删除
// ==============================
async function deletePage(env, path) {
  const id = path.match(/\/admin\/pages\/(\d+)/)[1];
  try {
    const page = await dbQueryFirst(env.FUXICUN_DB, 'SELECT slug FROM pages WHERE id = ?', [id]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM pages WHERE id = ?', [id]);

    // 清除页面缓存
    if (page) {
      await clearPageCache(env, page.slug);
    }

    return successResponse(null, '页面删除成功');
  } catch (e) {
    console.error('删除页面失败:', e);
    return errorResponse('删除失败');
  }
}

// ==============================
// 操作日志工具函数
// ==============================

/**
 * 写入操作日志到 audit_logs 表
 * @param {Object} env - Cloudflare 环境变量
 * @param {number|null} userId - 操作用户 ID
 * @param {string} action - 操作类型（如 article_create、user_delete）
 * @param {string} targetType - 目标类型（如 article、user、comment）
 * @param {number|null} targetId - 目标 ID
 * @param {string} detail - 操作详情
 */
async function writeAuditLog(env, userId, action, targetType, targetId, detail) {
  try {
    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO audit_logs (user_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)',
      [userId, action, targetType, targetId, detail]
    );
  } catch (e) {
    console.error('写入操作日志失败:', e.message);
  }
}

// ==============================
// 数据备份 - 导出所有表为 JSON
// ==============================
async function exportBackup(env) {
  try {
    // 需要备份的表清单
    const tables = [
      'users', 'password_resets', 'sessions', 'categories',
      'articles', 'comments', 'media', 'likes', 'banners',
      'site_config', 'audit_logs', 'nav_items', 'pages'
    ];

    const backup = {};

    for (const table of tables) {
      try {
        const result = await dbQuery(env.FUXICUN_DB, 'SELECT * FROM ' + table);
        backup[table] = result.results || [];
      } catch (e) {
        // 表不存在则跳过
        backup[table] = [];
      }
    }

    // 写入操作日志
    await writeAuditLog(env, null, 'backup_export', 'system', null, '导出数据备份');

    // 返回 JSON 格式的备份数据
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fuxicun-backup-' + timestamp + '.json"'
      }
    });
  } catch (e) {
    return errorResponse('备份导出失败: ' + e.message);
  }
}

// ==============================
// 数据备份 - 上传到 R2（用于定时备份/异地容灾）
// 路径：backups/fuxicun-backup-YYYY-MM-DDTHH-MM-SS.json
// ==============================
async function backupToR2(request, env) {
  try {
    if (!env.FUXICUN_BUCKET) {
      return errorResponse('R2 存储桶未配置', 500);
    }

    const tables = [
      'users', 'password_resets', 'sessions', 'categories',
      'articles', 'comments', 'media', 'likes', 'banners',
      'site_config', 'audit_logs', 'nav_items', 'pages'
    ];

    const backup = {};
    for (const table of tables) {
      try {
        const result = await dbQuery(env.FUXICUN_DB, 'SELECT * FROM ' + table);
        backup[table] = result.results || [];
      } catch (e) {
        backup[table] = [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const key = 'backups/fuxicun-backup-' + timestamp + '.json';
    const body = JSON.stringify(backup, null, 2);

    await env.FUXICUN_BUCKET.put(key, body, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' }
    });

    // 仅保留最近 30 个备份，自动清理旧文件
    try {
      const list = await env.FUXICUN_BUCKET.list({ prefix: 'backups/' });
      const objects = (list.objects || []).sort((a, b) => (b.uploaded || 0) - (a.uploaded || 0));
      const toDelete = objects.slice(30);
      for (const obj of toDelete) {
        await env.FUXICUN_BUCKET.delete(obj.key);
      }
    } catch (e) {
      // 清理失败不影响主流程
      console.error('清理旧备份失败:', e.message);
    }

    await writeAuditLog(env, null, 'backup_to_r2', 'system', null, '备份上传至 R2: ' + key);

    return successResponse({
      key: key,
      size: body.length,
      tables: Object.keys(backup).length
    }, '备份已上传到 R2');
  } catch (e) {
    return errorResponse('备份到 R2 失败: ' + e.message);
  }
}

// ==============================
// 数据备份 - 列出 R2 中的备份文件
// ==============================
async function listBackups(env) {
  try {
    if (!env.FUXICUN_BUCKET) {
      return errorResponse('R2 存储桶未配置', 500);
    }
    const list = await env.FUXICUN_BUCKET.list({ prefix: 'backups/', limit: 100 });
    const objects = (list.objects || []).map(o => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded
    })).sort((a, b) => (new Date(b.uploaded)) - (new Date(a.uploaded)));
    return successResponse(objects);
  } catch (e) {
    return errorResponse('列出备份失败: ' + e.message);
  }
}
