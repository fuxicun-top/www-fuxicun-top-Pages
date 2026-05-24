// ========================================
// 文件说明：评论路由
// 文件路径：functions/api/routes/comments.js
// 功能：获取文章评论、发表评论、删除评论
// 安全：评论内容做 HTML 转义防 XSS，查询过滤审核状态
// ========================================

import { successResponse, errorResponse, listResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst, dbRun } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { escapeHtml } from '../utils/helpers.js';

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
  const comments = await dbQuery(
    env.FUXICUN_DB,
    "SELECT c.id, c.content, c.parent_id, c.created_at, u.username, u.avatar FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.article_id = ? AND c.status = 'approved' ORDER BY c.created_at ASC",
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

  return successResponse(roots);
}

// ==============================
// 发表评论
// 登录用户可评论，内容做 HTML 转义
// ==============================
async function createComment(request, env, articleId) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const { content, parent_id } = await request.json();

    // 内容校验
    if (!content || content.trim().length === 0) {
      return errorResponse('评论内容不能为空');
    }

    if (content.length > 1000) {
      return errorResponse('评论不能超过1000个字符');
    }

    // 检查文章是否存在
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id FROM articles WHERE id = ?',
      [articleId]
    );

    if (!article) {
      return errorResponse('文章不存在', 404);
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

    // 对评论内容做 HTML 转义，防止 XSS 攻击
    const safeContent = escapeHtml(content.trim());

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO comments (content, article_id, user_id, parent_id, status) VALUES (?, ?, ?, ?, ?)',
      [safeContent, articleId, auth.user.id, parent_id || null, 'pending']
    );

    return successResponse(null, '评论成功');
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

    return successResponse(null, '删除成功');
  } catch (e) {
    console.error('删除评论失败:', e);
    return errorResponse('删除失败');
  }
}
