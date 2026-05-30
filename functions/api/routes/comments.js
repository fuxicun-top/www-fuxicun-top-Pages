// ========================================
// 文件说明：评论路由
// 文件路径：functions/api/routes/comments.js
// 功能：获取文章评论、发表评论、删除评论
// 安全：评论内容做 HTML 转义防 XSS，查询过滤审核状态
// ========================================

import { successResponse, errorResponse, listResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst, dbRun } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { checkSensitiveWords } from '../utils/content-filter.js';
import { escapeHtml } from '../utils/helpers.js';
import { isCacheEnabled, withCacheHeader, clearCommentsCache } from '../utils/cache.js';

/**
 * 评论路由分发
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量
 * @param {string} path - 请求路径
 * @param {string} method - HTTP 方法
 */
export async function handleComments(request, env, path, method) {
  // 获取文章评论（公开，仅返回已审核通过的评论）
  const commentsMatch = path.match(/^\/articles\/(\d+)\/comments$/);
  if (commentsMatch && method === 'GET') {
    return await getComments(env, commentsMatch[1]);
  }

  // 发表评论（需登录，默认状态为 approved）
  if (commentsMatch && method === 'POST') {
    return await createComment(request, env, commentsMatch[1]);
  }

  // 删除评论（需登录，仅作者和管理员可删除）
  const deleteMatch = path.match(/^\/comments\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    return await deleteComment(request, env, deleteMatch[1]);
  }

  return errorResponse('接口不存在', 404);
}

// ==============================
// 获取文章评论（含嵌套回复）
// 仅返回审核通过（approved）的评论
// ==============================
async function getComments(env, articleId) {
  const cacheKey = 'cache:comments:' + articleId;
  const cacheEnabled = await isCacheEnabled(env);
  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      const cached = await env.FUXICUN_KV.get(cacheKey, 'json');
      if (cached) return withCacheHeader(successResponse(cached), 'HIT');
    } catch (e) { /* 降级到数据库 */ }
  }

  const comments = await dbQuery(
    env.FUXICUN_DB,
    "SELECT c.id, c.content, c.parent_id, c.created_at, c.guest_name, COALESCE(u.display_name, u.username) as username, u.avatar FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.article_id = ? AND c.status = 'approved' ORDER BY c.created_at ASC",
    [articleId]
  );

  const list = comments.results || [];

  // 构建嵌套结构（父评论 → 子回复）
  const map = {};
  const roots = [];
  list.forEach(function(c) {
    c.replies = [];
    // 对评论内容做 HTML 转义防 XSS
    c.content = escapeHtml(c.content);
    map[c.id] = c;
  });
  list.forEach(function(c) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(c);
    } else {
      roots.push(c);
    }
  });

  if (cacheEnabled && env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put(cacheKey, JSON.stringify(roots), { expirationTtl: 60 });
    } catch (e) { /* 忽略缓存写入失败 */ }
  }

  return withCacheHeader(successResponse(roots), 'MISS');
}

// ==============================
// 发表评论（支持游客评论）
// 评论策略：文章级 > 全局默认
// 审核策略：全局 comment_review 配置
// ==============================
async function createComment(request, env, articleId) {
  // 认证可选：尝试获取登录用户，未登录则为游客
  let auth = null;
  try {
    const authResult = await authenticate(request, env);
    if (!authResult.error) {
      auth = authResult;
    }
  } catch (e) { /* 未登录 */ }

  try {
    const { content, parent_id, guest_name } = await request.json();

    // 内容校验
    if (!content || content.trim().length === 0) {
      return errorResponse('评论内容不能为空');
    }

    if (content.length > 1000) {
      return errorResponse('评论不能超过1000个字符');
    }

    // 回复评论（有 parent_id）必须登录，便于溯源管理
    if (parent_id && !auth) {
      return errorResponse('请先登录后再回复评论', 401);
    }

    // 一级评论：游客必须填写昵称
    if (!auth && (!guest_name || guest_name.trim().length === 0)) {
      return errorResponse('请输入昵称');
    }

    if (guest_name && guest_name.length > 20) {
      return errorResponse('昵称不能超过20个字符');
    }

    // 检查文章是否存在，并获取文章级评论策略
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, comment_policy FROM articles WHERE id = ?',
      [articleId]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    // 评论策略：文章级 > 全局
    let effectivePolicy = article.comment_policy; // 文章级策略
    if (!effectivePolicy) {
      // 文章未设置，读取全局配置
      const globalPolicy = await dbQueryFirst(
        env.FUXICUN_DB,
        "SELECT value FROM site_config WHERE key = 'comment_policy'"
      );
      effectivePolicy = globalPolicy?.value || 'open';
    }

    // 检查评论权限
    if (effectivePolicy === 'closed') {
      return errorResponse('该文章评论已关闭', 403);
    }
    if (effectivePolicy === 'login_required' && !auth) {
      return errorResponse('该文章需要登录后才能评论', 403);
    }

    // 如果是回复，检查父评论是否存在
    if (parent_id) {
      const parent = await dbQueryFirst(
        env.FUXICUN_DB,
        'SELECT id FROM comments WHERE id = ? AND article_id = ?',
        [parent_id, articleId]
      );
      if (!parent) {
        return errorResponse('回复的评论不存在');
      }
    }

    // 审核策略：读取全局配置
    let status = 'approved';
    const reviewConfig = await dbQueryFirst(
      env.FUXICUN_DB,
      "SELECT value FROM site_config WHERE key = 'comment_review'"
    );
    if (reviewConfig?.value === 'true') {
      status = 'pending';
    }

    // 敏感词检测：命中自动转待审核（admin 角色免检）
    const is_admin = auth && auth.user && auth.user.role === 'admin';
    if (!is_admin) {
      const customWords = await dbQueryFirst(
        env.FUXICUN_DB,
        "SELECT value FROM site_config WHERE key = 'sensitive_words'"
      );
      const filterResult = checkSensitiveWords(content, customWords?.value || '');
      if (filterResult.blocked) {
        status = 'pending';
        // 写入审计日志
        try {
          const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
          await dbRun(
            env.FUXICUN_DB,
            "INSERT INTO audit_logs (user_id, action, target_type, detail, ip, created_at) VALUES (?, 'sensitive_word_hit', 'comment', ?, ?, datetime('now'))",
            [auth?.user?.id || null, '命中敏感词: ' + filterResult.words.join(', '), ip]
          );
        } catch (logErr) { /* 日志失败不影响评论 */ }
      }
    }

    // 获取客户端 IP
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';

    // 对评论内容做 HTML 转义，防止 XSS 攻击
    const safeContent = escapeHtml(content.trim());

    if (auth) {
      // 登录用户评论
      await dbRun(
        env.FUXICUN_DB,
        'INSERT INTO comments (content, article_id, user_id, parent_id, status) VALUES (?, ?, ?, ?, ?)',
        [safeContent, articleId, auth.user.id, parent_id || null, status]
      );
    } else {
      // 游客评论
      await dbRun(
        env.FUXICUN_DB,
        'INSERT INTO comments (content, article_id, guest_name, guest_ip, parent_id, status) VALUES (?, ?, ?, ?, ?, ?)',
        [safeContent, articleId, escapeHtml(guest_name.trim()), clientIp, parent_id || null, status]
      );
    }

    const msg = status === 'pending' ? '评论成功，等待审核' : '评论成功';
    await clearCommentsCache(env, articleId);
    return successResponse(null, msg);
  } catch (e) {
    console.error('发表评论失败:', e);
    return errorResponse('评论失败');
  }
}

// ==============================
// 删除评论
// 仅评论作者和管理员可以删除，同时删除子回复
// ==============================
async function deleteComment(request, env, id) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const comment = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (!comment) {
      return errorResponse('评论不存在', 404);
    }

    // 只有评论作者和管理员可以删除
    if (comment.user_id !== auth.user.id && auth.user.role !== 'admin') {
      return errorResponse('无权限删除此评论', 403);
    }

    // 删除评论及其所有回复
    await dbRun(env.FUXICUN_DB, 'DELETE FROM comments WHERE id = ? OR parent_id = ?', [id, id]);

    await clearCommentsCache(env, comment.article_id);
    return successResponse(null, '删除成功');
  } catch (e) {
    console.error('删除评论失败:', e);
    return errorResponse('删除失败');
  }
}
