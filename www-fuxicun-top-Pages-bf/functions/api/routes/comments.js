// ========================================
// 文件说明：评论路由
// 文件路径：functions/api/routes/comments.js
// 功能：获取文章评论、发表评论（含游客）、删除评论
// 安全：评论内容做 HTML 转义防 XSS，查询过滤审核状态
//
// 评论权限策略（合并文章级 + 全局）：
//   1. articles.comment_policy 不为 NULL 时走文章级；NULL 时取 site_config.comment_policy
//   2. open           → 任何人可评（游客需填昵称 + Turnstile）
//   3. login_required → 仅登录用户可评
//   4. closed         → 关闭评论
//   site_config.comment_review = 'true' 时新评论 status=pending（需审核）；否则 approved 直显
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbQuery, dbQueryFirst, dbRun } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { escapeHtml } from '../utils/helpers.js';
import { verifyTurnstile } from '../utils/turnstile.js';
import { detectSensitive } from '../utils/content-filter.js';

/**
 * 获取客户端 IP（优先 Cloudflare 提供的 cf-connecting-ip）
 * @param {Request} request
 * @returns {string} IP 地址，取不到时返回 'unknown'
 */
function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
}

/**
 * 取全局站点配置项的值
 * @param {Object} env
 * @param {string} key
 * @param {string} fallback
 */
async function getConfig(env, key, fallback) {
  try {
    const row = await dbQueryFirst(env.FUXICUN_DB, 'SELECT value FROM site_config WHERE key = ?', [key]);
    return (row && row.value !== null && row.value !== undefined) ? row.value : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * 计算文章实际生效的评论策略：
 *   全局 site_config.comment_policy 是"默认值"。
 *   单篇 articles.comment_policy：
 *     - NULL  → 继承全局
 *     - 非 NULL → 直接覆盖（可放宽也可收紧，由编辑/管理员自行决定）
 *
 * 典型用法：
 *   ① 全局 login_required（默认所有文章要登录）→ 某篇 open（设为允许游客评论）
 *   ② 全局 open（默认所有文章开放评论）→ 某篇 login_required（敏感文章只允许登录用户评）
 *   ③ 全局或单篇任一 closed 都直接关闭（closed 永远生效，不被对方"放宽"）
 *
 * @returns {string} 'open' | 'login_required' | 'closed'
 */
async function resolveCommentPolicy(env, article) {
  const article_policy = article && article.comment_policy ? article.comment_policy : null;

  // 单篇明确填值 → 直接覆盖全局
  if (article_policy) return article_policy;

  // 单篇为 NULL → 继承全局（默认值）
  return await getConfig(env, 'comment_policy', 'open');
}

/**
 * 评论路由分发
 */
export async function handleComments(request, env, path, method) {
  // 获取文章评论（公开，仅返回已审核通过的评论）
  const commentsMatch = path.match(/^\/articles\/(\d+)\/comments$/);
  if (commentsMatch && method === 'GET') {
    return await getComments(env, commentsMatch[1]);
  }

  // 发表评论（按策略校验：游客 / 登录用户）
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
// 获取文章评论（含嵌套回复 + 游客昵称）
// 同时返回文章生效的 comment_policy，前端据此渲染 UI
// ==============================
async function getComments(env, articleId) {
  // 取文章 comment_policy 用于解析策略
  const article = await dbQueryFirst(
    env.FUXICUN_DB,
    'SELECT id, comment_policy FROM articles WHERE id = ?',
    [articleId]
  );

  if (!article) {
    return errorResponse('文章不存在', 404);
  }

  const policy = await resolveCommentPolicy(env, article);

  const comments = await dbQuery(
    env.FUXICUN_DB,
    "SELECT c.id, c.content, c.parent_id, c.user_id, c.guest_name, c.created_at, " +
    "u.username, u.avatar " +
    "FROM comments c " +
    "LEFT JOIN users u ON c.user_id = u.id " +
    "WHERE c.article_id = ? AND c.status = 'approved' " +
    "ORDER BY c.created_at ASC",
    [articleId]
  );

  const list = comments.results || [];

  const map = {};
  const roots = [];
  list.forEach(function(c) {
    c.replies = [];
    // 评论内容已在写入时 escapeHtml 过；这里再保险一次（防止历史脏数据）
    c.content = escapeHtml(c.content);
    // 显示名：登录用户用 username，游客用 guest_name 加"(游客)"标识
    if (c.user_id && c.username) {
      c.display_name = c.username;
      c.is_guest = false;
    } else {
      c.display_name = (c.guest_name || '游客') + '（游客）';
      c.is_guest = true;
    }
    // 不返回 user_id 给前端（避免泄露内部 ID）
    delete c.user_id;
    delete c.guest_name;
    map[c.id] = c;
  });
  list.forEach(function(c) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(c);
    } else {
      roots.push(c);
    }
  });

  return successResponse({
    list: roots,
    policy: policy
  });
}

// ==============================
// 发表评论
// 按文章 + 全局策略决定是否要登录
// 游客需填昵称 + Turnstile；登录用户跳过 Turnstile（已通过 JWT 校验）
// ==============================
async function createComment(request, env, articleId) {
  try {
    const body = await request.json();
    const content = body.content;
    const parent_id = body.parent_id;
    const guest_name = body.guest_name;
    const turnstile_token = body.turnstile_token;

    // 内容校验
    if (!content || content.trim().length === 0) {
      return errorResponse('评论内容不能为空');
    }
    if (content.length > 1000) {
      return errorResponse('评论不能超过1000个字符');
    }

    // 检查文章 + 取策略
    const article = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, comment_policy FROM articles WHERE id = ?',
      [articleId]
    );
    if (!article) {
      return errorResponse('文章不存在', 404);
    }

    const policy = await resolveCommentPolicy(env, article);

    // 关闭评论
    if (policy === 'closed') {
      return errorResponse('该文章已关闭评论', 403);
    }

    // 尝试认证（JWT），不强制 —— 失败也允许游客流程兜底
    let authUser = null;
    const authResult = await authenticate(request, env);
    if (!authResult.error) {
      authUser = authResult.user;
    }

    // 仅登录可评：游客被拦
    if (policy === 'login_required' && !authUser) {
      return errorResponse('该文章仅允许登录用户评论', 401);
    }

    // 游客流程：必须填昵称 + Turnstile
    if (!authUser) {
      if (!guest_name || guest_name.trim().length === 0) {
        return errorResponse('请输入您的昵称');
      }
      if (guest_name.length > 30) {
        return errorResponse('昵称不能超过30个字符');
      }
      // Turnstile 校验
      if (env.TURNSTILE_SECRET) {
        const ok = await verifyTurnstile(turnstile_token, env.TURNSTILE_SECRET);
        if (!ok) {
          return errorResponse('人机校验失败，请重试');
        }
      }
    }

    // 检查父评论
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

    // 防 XSS：转义内容 + 转义昵称
    const safeContent = escapeHtml(content.trim());
    const safeGuestName = guest_name ? escapeHtml(guest_name.trim()) : null;
    const guestIp = authUser ? null : getClientIp(request);

    // 判定是否需要审核（取并集）：
    //   1. 全局开关 comment_review = 'true'
    //   2. 内容或昵称命中敏感词（自动分流到人工审核）
    //   admin 角色一律免审 —— 内部成员发的内容不卡审核，避免维护卡顿
    const reviewStr = await getConfig(env, 'comment_review', 'false');
    const reviewByConfig = (reviewStr === 'true' || reviewStr === true);

    // 在转义前的原文上检测敏感词（转义后 < > 等会变实体，影响匹配）
    const detectContent = await detectSensitive(content, env);
    const detectName = guest_name ? await detectSensitive(guest_name, env) : { hit: false, word: null };
    const reviewBySensitive = detectContent.hit || detectName.hit;

    const isAdmin = !!(authUser && authUser.role === 'admin');
    const needReview = !isAdmin && (reviewByConfig || reviewBySensitive);
    const status = needReview ? 'pending' : 'approved';

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO comments (content, article_id, user_id, guest_name, guest_ip, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        safeContent,
        articleId,
        authUser ? authUser.id : null,
        authUser ? null : safeGuestName,
        guestIp,
        parent_id || null,
        status
      ]
    );

    // 命中敏感词记日志（方便管理员复盘"为什么这条进了审核队列"）
    if (reviewBySensitive) {
      try {
        await dbRun(
          env.FUXICUN_DB,
          "INSERT INTO audit_logs (user_id, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)",
          [
            authUser ? authUser.id : null,
            'comment_sensitive_hit',
            'article',
            articleId,
            '评论命中敏感词，自动转入审核：' + (detectContent.word || detectName.word || ''),
            guestIp || 'unknown'
          ]
        );
      } catch (e) { /* 日志失败不影响主流程 */ }
    }

    var msg;
    if (status === 'pending') {
      msg = reviewBySensitive ? '评论包含敏感词，已转入审核队列' : '评论已提交，等待审核通过后显示';
    } else {
      msg = '评论成功';
    }
    return successResponse({ status: status }, msg);
  } catch (e) {
    console.error('发表评论失败:', e);
    return errorResponse('评论失败：' + e.message);
  }
}

// ==============================
// 删除评论
// 仅评论作者和管理员/编辑者可以删除，同时删除子回复
// 游客评论无法自删（无法证明身份），只能由 admin/editor 删
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

    // admin / editor 任意删；普通用户只能删自己（user_id 匹配）
    const isStaff = auth.user.role === 'admin' || auth.user.role === 'editor';
    const isAuthor = comment.user_id !== null && comment.user_id === auth.user.id;
    if (!isStaff && !isAuthor) {
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
