// ========================================
// 文件说明：用户中心路由（统一用户相关操作）
// 文件路径：functions/api/routes/user.js
// 功能：我的文章、发布文章、更新文章、头像上传、个人信息编辑
// ========================================

import { successResponse, errorResponse, listResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst, dbRun } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { clearArticlesCache } from '../utils/cache.js';
import { generateSlug } from '../utils/helpers.js';

/**
 * 用户中心路由分发
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量
 * @param {string} path - 请求路径
 * @param {string} method - HTTP 方法
 */
export async function handleUser(request, env, path, method) {
  // 认证检查：所有用户中心接口都需要登录
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  // === 我的文章 ===
  if (path === '/user/articles' && method === 'GET') {
    return await getUserArticles(request, env, auth.user.id);
  }

  // === 发布文章（普通用户投稿，需审核） ===
  if (path === '/user/articles' && method === 'POST') {
    return await createUserArticle(request, env, auth.user);
  }

  // === 更新我的文章 ===
  const updateMatch = path.match(/^\/user\/articles\/(\d+)$/);
  if (updateMatch && method === 'PUT') {
    return await updateUserArticle(request, env, updateMatch[1], auth.user);
  }

  // === 删除我的文章 ===
  const deleteMatch = path.match(/^\/user\/articles\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    return await deleteUserArticle(request, env, deleteMatch[1], auth.user);
  }

  // === 头像上传 ===
  if (path === '/user/avatar' && method === 'POST') {
    return await uploadAvatar(request, env, auth.user);
  }

  // === 修改密码 ===
  if (path === '/user/password' && method === 'PUT') {
    return await changePassword(request, env, auth.user);
  }

  return errorResponse('接口不存在', 404);
}

// ==============================
// 我的文章列表
// ==============================
async function getUserArticles(request, env, userId) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 10));
  const offset = (page - 1) * pageSize;

  // 统计总数
  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM articles WHERE author_id = ?',
    [userId]
  );

  // 查询文章列表
  const articles = await dbQuery(
    env.FUXICUN_DB,
    'SELECT id, title, slug, excerpt, cover_image, status, views, likes, created_at, updated_at FROM articles WHERE author_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset]
  );

  return listResponse(articles.results || [], countResult?.count || 0, page, pageSize);
}

// ==============================
// 用户发布文章（普通用户投稿，需审核）
// ==============================
async function createUserArticle(request, env, user) {
  try {
    const { title, content, excerpt, cover_image, category_id } = await request.json();

    // 参数校验
    if (!title || !content) {
      return errorResponse('标题和内容为必填项');
    }

    if (title.length > 200) {
      return errorResponse('标题不能超过200个字符');
    }

    // 普通用户投稿状态为 pending（待审核），编辑者/管理员直接发布
    const status = ['editor', 'admin'].includes(user.role) ? 'published' : 'pending';
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    // 生成 SEO 友好的 slug
    const slug = generateSlug(title);

    const result = await dbRun(
      env.FUXICUN_DB,
      "INSERT INTO articles (title, slug, content, excerpt, cover_image, category_id, author_id, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [title, slug, content, excerpt || '', cover_image || '', category_id || null, user.id, status, publishedAt]
    );

    // 清除文章列表缓存
    await clearArticlesCache(env);

    return successResponse(
      { id: result.meta.last_row_id, slug: slug },
      status === 'published' ? '发布成功' : '提交成功，等待审核'
    );
  } catch (e) {
    console.error('用户创建文章失败:', e);
    return errorResponse('创建文章失败');
  }
}

// ==============================
// 用户更新自己的文章
// ==============================
async function updateUserArticle(request, env, id, user) {
  try {
    // 查询文章并验证所有权
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    // 只有作者本人可以修改自己的文章
    if (article.author_id !== user.id) {
      return errorResponse('无权限修改此文章', 403);
    }

    const { title, content, excerpt, cover_image, category_id } = await request.json();

    await dbRun(
      env.FUXICUN_DB,
      "UPDATE articles SET title = ?, content = ?, excerpt = ?, cover_image = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?",
      [title || article.title, content || article.content, excerpt ?? article.excerpt, cover_image ?? article.cover_image, category_id ?? article.category_id, id]
    );

    // 清除文章列表缓存
    await clearArticlesCache(env);

    return successResponse(null, '更新成功');
  } catch (e) {
    console.error('用户更新文章失败:', e);
    return errorResponse('更新文章失败');
  }
}

// ==============================
// 用户删除自己的文章
// ==============================
async function deleteUserArticle(request, env, id, user) {
  try {
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    // 只有作者本人可以删除自己的文章
    if (article.author_id !== user.id) {
      return errorResponse('无权限删除此文章', 403);
    }

    // 级联删除评论和点赞（先删关联数据，再删文章）
    await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE article_id = ?', [id]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM likes WHERE article_id = ?', [id]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM articles WHERE id = ?', [id]);

    // 清除文章列表缓存
    await clearArticlesCache(env);

    return successResponse(null, '删除成功');
  } catch (e) {
    console.error('用户删除文章失败:', e);
    return errorResponse('删除文章失败');
  }
}

// ==============================
// 头像上传
// ==============================
async function uploadAvatar(request, env, user) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!file) {
      return errorResponse('请选择头像图片');
    }

    // 允许的图片类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('仅支持 JPG、PNG、WebP、GIF 格式图片');
    }

    // 头像最大 2MB
    if (file.size > 2 * 1024 * 1024) {
      return errorResponse('头像图片大小不能超过 2MB');
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop().toLowerCase();
    const key = 'avatars/' + user.id + '-' + Date.now() + '.' + ext;

    // 上传到 R2
    await env.FUXICUN_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=86400'
      }
    });

    // 头像访问 URL
    const avatarUrl = '/cdn/' + key;

    // 更新用户头像
    await dbRun(
      env.FUXICUN_DB,
      "UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ?",
      [avatarUrl, user.id]
    );

    return successResponse({ avatar: avatarUrl }, '头像更新成功');
  } catch (e) {
    console.error('头像上传失败:', e);
    return errorResponse('头像上传失败');
  }
}

// ==============================
// 修改密码
// ==============================
async function changePassword(request, env, user) {
  try {
    const { old_password, new_password } = await request.json();

    if (!old_password || !new_password) {
      return errorResponse('请输入当前密码和新密码');
    }

    // 统一密码最小长度为 8 位
    if (new_password.length < 8) {
      return errorResponse('新密码长度不能少于8位');
    }

    // 验证旧密码
    const userRecord = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT password_hash FROM users WHERE id = ?',
      [user.id]
    );

    const valid = await verifyPassword(old_password, userRecord.password_hash);
    if (!valid) {
      return errorResponse('当前密码错误');
    }

    // 更新密码
    const newHash = await hashPassword(new_password);
    await dbRun(
      env.FUXICUN_DB,
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [newHash, user.id]
    );

    return successResponse(null, '密码修改成功');
  } catch (e) {
    console.error('修改密码失败:', e);
    return errorResponse('修改失败');
  }
}
