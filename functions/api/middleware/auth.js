// ========================================
// 文件说明：认证中间件
// 文件路径：functions/api/middleware/auth.js
// 功能：JWT 令牌验证、角色权限检查
// 权限层级：user（普通用户）< editor（编辑者）< admin（管理员）
// ========================================

import { verifyJWT } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';

/**
 * 基础认证：验证 JWT 令牌有效性
 * 从请求头 Authorization: Bearer <token> 中提取并验证 JWT
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量（需包含 JWT_SECRET）
 * @returns {Promise<{user: Object}|{error: Response}>}
 *   - 成功：{ user: { id, username, role, ... } }
 *   - 失败：{ error: 401/403 错误响应 }
 */
export async function authenticate(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: errorResponse('未登录', 401) };
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return { error: errorResponse('登录已过期', 401) };
    }

    return { user: payload };
  } catch (e) {
    // JWT 解析异常时统一返回认证失败
    return { error: errorResponse('认证失败', 401) };
  }
}

/**
 * 管理员权限验证
 * 仅允许 admin 角色通过，用于用户管理、网站设置等敏感操作
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量
 * @returns {Promise<{user: Object}|{error: Response}>}
 */
export async function requireAdmin(request, env) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth;

  if (auth.user.role !== 'admin') {
    return { error: errorResponse('无权限，仅管理员可访问', 403) };
  }

  return auth;
}

/**
 * 编辑者权限验证
 * 允许 admin 和 editor 角色通过，用于文章管理、评论审核等日常运营操作
 * @param {Request} request - 请求对象
 * @param {Object} env - Cloudflare 环境变量
 * @returns {Promise<{user: Object}|{error: Response}>}
 */
export async function requireEditor(request, env) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth;

  if (!['admin', 'editor'].includes(auth.user.role)) {
    return { error: errorResponse('无权限，仅编辑者和管理员可访问', 403) };
  }

  return auth;
}
