// ========================================
// 文件说明：文章路由（前台公开+用户操作）
// 文件路径：functions/api/routes/articles.js
// 功能：文章列表、详情、创建、更新、删除、点赞
// ========================================

import { successResponse, errorResponse, listResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst, dbRun } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateSlug, sanitizeHtml, escapeHtml } from '../utils/helpers.js';
import { clearArticlesCache } from '../utils/cache.js';

/**
 * 文章路由分发
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量
 * @param {string} path - 请求路径
 * @param {string} method - HTTP 方法
 */
export async function handleArticles(request, env, path, method) {
  // === 公开接口（无需认证） ===

  // 文章列表
  if (path === '/articles' && method === 'GET') {
    return await getArticles(request, env);
  }

  // 文章详情 - 数字 ID 方式
  const detailMatch = path.match(/^\/articles\/(\d+)$/);
  if (detailMatch && method === 'GET') {
    return await getArticleDetail(env, detailMatch[1]);
  }

  // 文章详情 - slug 友好 URL 查询
  const slugMatch = path.match(/^\/articles\/([^\/]+)$/);
  if (slugMatch && method === 'GET' && !/^\d+$/.test(slugMatch[1])) {
    var decodedSlug;
    try {
      decodedSlug = decodeURIComponent(slugMatch[1]);
    } catch (e) {
      decodedSlug = slugMatch[1];
    }
    return await getArticleDetailBySlug(env, decodedSlug);
  }

  // === 需要登录的接口 ===

  // 创建文章
  if (path === '/articles' && method === 'POST') {
    return await createArticle(request, env);
  }

  // 更新文章
  const updateMatch = path.match(/^\/articles\/(\d+)$/);
  if (updateMatch && method === 'PUT') {
    return await updateArticle(request, env, updateMatch[1]);
  }

  // 删除文章
  const deleteMatch = path.match(/^\/articles\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    return await deleteArticle(request, env, deleteMatch[1]);
  }

  // 点赞/取消点赞
  const likeMatch = path.match(/^\/articles\/(\d+)\/like$/);
  if (likeMatch && method === 'POST') {
    return await likeArticle(request, env, likeMatch[1]);
  }

  return errorResponse('接口不存在', 404);
}

// ==============================
// 获取文章列表（公开，带 KV 缓存）
// ==============================
async function getArticles(request, env) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 10));
  const category = url.searchParams.get('category') || '';
  const keyword = url.searchParams.get('keyword') || '';
  const featured = url.searchParams.get('featured') || '';
  const sort = url.searchParams.get('sort') || '';
  const offset = (page - 1) * pageSize;

  // 构建缓存键（基于查询参数）
  const cacheKey = 'articles:list:' + page + ':' + pageSize + ':' + category + ':' + keyword + ':' + featured + ':' + sort;

  // 尝试从 KV 缓存读取（仅在无关键词搜索时使用缓存）
  if (!keyword && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) {
        return listResponse(cached.list, cached.total, page, pageSize);
      }
    } catch (e) {
      console.error('KV 读取失败:', e.message);
    }
  }

  // 构建查询条件
  let where = "a.status = 'published'";
  let params = [];

  if (category) {
    where += ' AND c.slug = ?';
    params.push(category);
  }
  if (keyword) {
    where += ' AND a.title LIKE ?';
    params.push('%' + keyword + '%');
  }
  if (featured === '1') {
    where += ' AND a.is_top = 1';
  }

  // 排序方式
  let orderBy = 'a.published_at DESC';
  if (sort === 'likes') {
    orderBy = 'a.likes DESC, a.published_at DESC';
  } else if (sort === 'views') {
    orderBy = 'a.views DESC, a.published_at DESC';
  }

  // 统计总数
  const countResult = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT COUNT(*) as count FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE ' + where,
    params
  );

  // 查询文章列表
  const articles = await dbQuery(
    env.FUXICUN_DB,
    'SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.views, a.likes, a.is_top, a.created_at, a.published_at, u.username as author_name, c.name as category_name, c.slug as category_slug FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id WHERE ' + where + ' ORDER BY ' + orderBy + ' LIMIT ? OFFSET ?',
    [...params, pageSize, offset]
  );

  const resultList = articles.results || [];
  const total = countResult?.count || 0;

  // 为缺少 slug 的文章自动生成
  for (const article of resultList) {
    if (!article.slug) {
      article.slug = generateSlug(article.title);
      await dbRun(
        env.FUXICUN_DB,
        'UPDATE articles SET slug = ? WHERE id = ?',
        [article.slug, article.id]
      );
    }
  }

  // 写入 KV 缓存（TTL 5分钟，仅缓存无关键词的查询）
  if (!keyword && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify({ list: resultList, total: total }), {
        expirationTtl: 300
      });
    } catch (e) {
      console.error('KV 写入失败:', e.message);
    }
  }

  return listResponse(resultList, total, page, pageSize);
}

// ==============================
// 获取文章详情（公开，自增浏览量）
// ==============================
async function getArticleDetail(env, id) {
  const article = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT a.*, u.username as author_name, u.avatar as author_avatar, c.name as category_name, c.slug as category_slug FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id WHERE a.id = ? AND a.status = \'published\'',
    [id]
  );

  if (!article) {
    return errorResponse('文章不存在', 404);
  }

  // 如果文章没有 slug，自动生成并更新
  if (!article.slug) {
    const slug = generateSlug(article.title);
    await dbRun(
      env.FUXICUN_DB,
      'UPDATE articles SET slug = ? WHERE id = ?',
      [slug, id]
    );
    article.slug = slug;
  }

  // 自增浏览量
  await dbRun(
    env.FUXICUN_DB,
    'UPDATE articles SET views = views + 1 WHERE id = ?',
    [id]
  );

  // 对文章内容做 XSS 防护清理
  article.content = sanitizeHtml(article.content);

  return successResponse(article);
}

// ==============================
// 通过 slug 获取文章详情（SEO 友好 URL）
// ==============================
async function getArticleDetailBySlug(env, slug) {
  const article = await dbQueryFirst(
    env.FUXICUN_DB,
    "SELECT a.*, u.username as author_name, u.avatar as author_avatar, c.name as category_name, c.slug as category_slug FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN categories c ON a.category_id = c.id WHERE a.slug = ? AND a.status = 'published'",
    [slug]
  );

  if (!article) {
    return errorResponse('文章不存在', 404);
  }

  // 自增浏览量
  await dbRun(
    env.FUXICUN_DB,
    'UPDATE articles SET views = views + 1 WHERE id = ?',
    [article.id]
  );

  // 对文章内容做 XSS 防护清理
  article.content = sanitizeHtml(article.content);

  return successResponse(article);
}

// ==============================
// 创建文章（普通用户投稿需审核）
// ==============================
async function createArticle(request, env) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const { title, content, excerpt, cover_image, category_id, is_top } = await request.json();

    if (!title || !content) {
      return errorResponse('标题和内容为必填项');
    }

    if (title.length > 200) {
      return errorResponse('标题不能超过200个字符');
    }

    // 普通用户发的文章需要审核，编辑者和管理员直接发布
    const status = ['editor', 'admin'].includes(auth.user.role) ? 'published' : 'pending';
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    // 生成 SEO 友好的 slug
    const slug = generateSlug(title);

    // 只有编辑者和管理员可以设置精选
    const topValue = (['editor', 'admin'].includes(auth.user.role) && is_top) ? 1 : 0;

    const result = await dbRun(
      env.FUXICUN_DB,
      "INSERT INTO articles (title, slug, content, excerpt, cover_image, category_id, author_id, status, is_top, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [title, slug, content, excerpt || '', cover_image || '', category_id || null, auth.user.id, status, topValue, publishedAt]
    );

    // 清除文章列表 KV 缓存
    await clearArticlesCache(env);

    return successResponse({ id: result.meta.last_row_id, slug: slug }, status === 'published' ? '发布成功' : '提交成功，等待审核');
  } catch (e) {
    console.error('创建文章失败:', e);
    return errorResponse('创建文章失败');
  }
}

// ==============================
// 更新文章
// ==============================
async function updateArticle(request, env, id) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    // 只有作者、编辑者、管理员可以修改
    if (article.author_id !== auth.user.id && !['editor', 'admin'].includes(auth.user.role)) {
      return errorResponse('无权限修改此文章', 403);
    }

    const { title, content, excerpt, cover_image, category_id, is_top } = await request.json();

    // 只有编辑者和管理员可以修改精选状态
    const topValue = ['editor', 'admin'].includes(auth.user.role)
      ? (is_top !== undefined ? (is_top ? 1 : 0) : article.is_top)
      : article.is_top;

    await dbRun(
      env.FUXICUN_DB,
      "UPDATE articles SET title = ?, content = ?, excerpt = ?, cover_image = ?, category_id = ?, is_top = ?, updated_at = datetime('now') WHERE id = ?",
      [title || article.title, content || article.content, excerpt ?? article.excerpt, cover_image ?? article.cover_image, category_id ?? article.category_id, topValue, id]
    );

    // 清除文章列表 KV 缓存
    await clearArticlesCache(env);

    return successResponse(null, '更新成功');
  } catch (e) {
    console.error('更新文章失败:', e);
    return errorResponse('更新文章失败');
  }
}

// ==============================
// 删除文章
// ==============================
async function deleteArticle(request, env, id) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    // 只有作者和管理员可以删除
    if (article.author_id !== auth.user.id && auth.user.role !== 'admin') {
      return errorResponse('无权限删除此文章', 403);
    }

    // 级联删除评论和点赞（先删关联数据，再删文章）
    await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE article_id = ?', [id]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM likes WHERE article_id = ?', [id]);
    await dbRun(env.FUXICUN_DB, 'DELETE FROM articles WHERE id = ?', [id]);

    // 清除文章列表 KV 缓存
    await clearArticlesCache(env);

    return successResponse(null, '删除成功');
  } catch (e) {
    console.error('删除文章失败:', e);
    return errorResponse('删除文章失败');
  }
}

// ==============================
// 点赞/取消点赞
// ==============================
async function likeArticle(request, env, id) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id FROM articles WHERE id = ?',
      [id]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    // 检查是否已点赞
    const existing = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id FROM likes WHERE user_id = ? AND article_id = ?',
      [auth.user.id, id]
    );

    if (existing) {
      // 取消点赞
      await dbRun(env.FUXICUN_DB, 'DELETE FROM likes WHERE user_id = ? AND article_id = ?', [auth.user.id, id]);
      await dbRun(env.FUXICUN_DB, 'UPDATE articles SET likes = MAX(0, likes - 1) WHERE id = ?', [id]);
      return successResponse({ liked: false }, '已取消点赞');
    } else {
      // 点赞
      await dbRun(env.FUXICUN_DB, 'INSERT INTO likes (user_id, article_id) VALUES (?, ?)', [auth.user.id, id]);
      await dbRun(env.FUXICUN_DB, 'UPDATE articles SET likes = likes + 1 WHERE id = ?', [id]);
      return successResponse({ liked: true }, '点赞成功');
    }
  } catch (e) {
    console.error('点赞操作失败:', e);
    return errorResponse('操作失败');
  }
}
