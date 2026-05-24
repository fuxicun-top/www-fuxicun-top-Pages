// ========================================
// 文件说明：认证路由
// 文件路径：functions/api/routes/auth.js
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbQueryFirst, dbRun } from '../utils/db.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signJWT } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { escapeHtml } from '../utils/helpers.js';
import { verifyTurnstile } from '../utils/turnstile.js';
import { checkRateLimit } from '../utils/rate-limit.js';

export async function handleAuth(request, env, path, method) {
  if (path === '/auth/register' && method === 'POST') {
    return await register(request, env);
  }
  if (path === '/auth/login' && method === 'POST') {
    return await login(request, env);
  }
  if (path === '/auth/logout' && method === 'POST') {
    return await logout(request, env);
  }
  if (path === '/auth/me' && method === 'GET') {
    return await getMe(request, env);
  }
  if (path === '/auth/profile' && method === 'PUT') {
    return await updateProfile(request, env);
  }
  if (path === '/auth/password' && method === 'PUT') {
    return await changePassword(request, env);
  }
  if (path === '/auth/forgot-password' && method === 'POST') {
    return await forgotPassword(request, env);
  }
  if (path === '/auth/reset-password' && method === 'POST') {
    return await resetPassword(request, env);
  }

  return errorResponse('接口不存在', 404);
}

async function register(request, env) {
  try {
    const { username, password, phone, email, turnstile_token } = await request.json();

    // 限流：同 IP 每小时最多 5 次注册
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await checkRateLimit(env.FUXICUN_KV, 'register:' + clientIp, 5, 3600);
    if (rateLimit.limited) {
      return errorResponse('注册操作过于频繁，请稍后再试', 429);
    }

    // Turnstile 验证（如果配置了 secret key）
    if (env.TURNSTILE_SECRET) {
      const verified = await verifyTurnstile(turnstile_token, env.TURNSTILE_SECRET, clientIp);
      if (!verified) {
        return errorResponse('人机验证失败，请重试');
      }
    }

    if (!username || !password || !phone) {
      return errorResponse('用户名、密码、手机号为必填项');
    }

    if (username.length < 2 || username.length > 20) {
      return errorResponse('用户名长度为2-20个字符');
    }

    // 统一密码最小长度为 8 位
    if (password.length < 8) {
      return errorResponse('密码长度不能少于8位');
    }

    const existing = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id FROM users WHERE username = ? OR phone = ?',
      [username, phone]
    );

    if (existing) {
      return errorResponse('用户名或手机号已存在');
    }

    const passwordHash = await hashPassword(password);
    const result = await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO users (username, password_hash, phone, email) VALUES (?, ?, ?, ?)',
      [username, passwordHash, phone, email || null]
    );

    const token = await signJWT(
      { id: result.meta.last_row_id, username, role: 'user' },
      env.JWT_SECRET
    );

    return successResponse({
      token,
      user: { id: result.meta.last_row_id, username, role: 'user' }
    }, '注册成功');
  } catch (e) {
    console.error('Register error:', e);
    return errorResponse('注册失败');
  }
}

async function login(request, env) {
  try {
    const { username, password, turnstile_token } = await request.json();

    if (!username || !password) {
      return errorResponse('请输入用户名和密码');
    }

    // 限流：同 IP 每小时最多 10 次登录
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await checkRateLimit(env.FUXICUN_KV, 'login:' + clientIp, 10, 3600);
    if (rateLimit.limited) {
      return errorResponse('登录操作过于频繁，请稍后再试', 429);
    }

    // Turnstile 验证（如果配置了 secret key）
    if (env.TURNSTILE_SECRET) {
      const verified = await verifyTurnstile(turnstile_token, env.TURNSTILE_SECRET, clientIp);
      if (!verified) {
        return errorResponse('人机验证失败，请重试');
      }
    }

    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM users WHERE username = ? OR phone = ?',
      [username, username]
    );

    if (!user) {
      return errorResponse('用户名或密码错误');
    }

    if (user.status === 'disabled') {
      return errorResponse('账号已被禁用');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return errorResponse('用户名或密码错误');
    }

    const role = user.role;

    const token = await signJWT(
      { id: user.id, username: user.username, role: role },
      env.JWT_SECRET
    );

    await dbRun(
      env.FUXICUN_DB,
      "UPDATE users SET updated_at = datetime('now') WHERE id = ?",
      [user.id]
    );

    return successResponse({
      token,
      user: { id: user.id, username: user.username, role: role, avatar: user.avatar }
    }, '登录成功');
  } catch (e) {
    console.error('Login error:', e);
    return errorResponse('登录失败');
  }
}

async function logout(request, env) {
  return successResponse(null, '退出成功');
}

async function getMe(request, env) {
  try {
    const auth = await authenticate(request, env);
    if (auth.error) return auth.error;

    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, username, phone, email, avatar, role, created_at FROM users WHERE id = ?',
      [auth.user.id]
    );

    if (!user) {
      return errorResponse('用户不存在');
    }

    return successResponse(user);
  } catch (e) {
    console.error('获取用户信息失败:', e);
    return errorResponse('获取用户信息失败');
  }
}

async function updateProfile(request, env) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const { email } = await request.json();

    await dbRun(
      env.FUXICUN_DB,
      "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?",
      [email || null, auth.user.id]
    );

    return successResponse(null, '更新成功');
  } catch (e) {
    console.error('Update profile error:', e);
    return errorResponse('更新失败');
  }
}

async function changePassword(request, env) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const { old_password, new_password } = await request.json();

    if (!old_password || !new_password) {
      return errorResponse('请输入当前密码和新密码');
    }

    // 统一密码最小长度为 8 位
    if (new_password.length < 8) {
      return errorResponse('新密码长度不能少于8位');
    }

    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT password_hash FROM users WHERE id = ?',
      [auth.user.id]
    );

    const valid = await verifyPassword(old_password, user.password_hash);
    if (!valid) {
      return errorResponse('当前密码错误');
    }

    const newHash = await hashPassword(new_password);
    await dbRun(
      env.FUXICUN_DB,
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [newHash, auth.user.id]
    );

    return successResponse(null, '密码修改成功');
  } catch (e) {
    console.error('Change password error:', e);
    return errorResponse('修改失败');
  }
}

// 找回密码
async function forgotPassword(request, env) {
  try {
    const { username } = await request.json();

    if (!username) {
      return errorResponse('请输入用户名或手机号');
    }

    // 限流：同 IP 每小时最多 3 次找回密码
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await checkRateLimit(env.FUXICUN_KV, 'forgot:' + clientIp, 3, 3600);
    if (rateLimit.limited) {
      return errorResponse('操作过于频繁，请稍后再试', 429);
    }

    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, username, email FROM users WHERE username = ? OR phone = ?',
      [username, username]
    );

    // 无论用户是否存在都返回成功，防止枚举攻击
    if (!user || !user.email) {
      return successResponse(null, '如果该账号存在且绑定了邮箱，重置链接已发送');
    }

    // 生成重置 token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // 发送邮件（如果配置了 RESEND_API_KEY）
    if (env.RESEND_API_KEY) {
      try {
        const resetUrl = request.headers.get('origin') || 'https://fuxicun.top';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM || 'noreply@fuxicun.top',
            to: user.email,
            subject: '福溪村官网 - 密码重置',
            html: '<p>您好 ' + escapeHtml(user.username) + '，</p><p>请点击以下链接重置密码（24小时内有效）：</p><p><a href="' + resetUrl + '/reset-password.html?token=' + token + '">重置密码</a></p><p>如非本人操作，请忽略此邮件。</p>'
          })
        });
      } catch (e) {
        console.error('Send email error:', e);
      }
    }

    return successResponse(null, '如果该账号存在且绑定了邮箱，重置链接已发送');
  } catch (e) {
    console.error('Forgot password error:', e);
    return errorResponse('操作失败');
  }
}

// 重置密码
async function resetPassword(request, env) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return errorResponse('参数不完整');
    }

    // 统一密码最小长度为 8 位
    if (password.length < 8) {
      return errorResponse('密码长度不能少于8位');
    }

    const reset = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT * FROM password_resets WHERE token = ? AND used = 0',
      [token]
    );

    if (!reset) {
      return errorResponse('重置链接无效或已过期');
    }

    // 检查是否过期
    if (new Date(reset.expires_at) < new Date()) {
      return errorResponse('重置链接已过期，请重新申请');
    }

    const passwordHash = await hashPassword(password);

    // 更新密码
    await dbRun(
      env.FUXICUN_DB,
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [passwordHash, reset.user_id]
    );

    // 标记 token 已使用
    await dbRun(
      env.FUXICUN_DB,
      'UPDATE password_resets SET used = 1 WHERE id = ?',
      [reset.id]
    );

    return successResponse(null, '密码重置成功，请登录');
  } catch (e) {
    console.error('Reset password error:', e);
    return errorResponse('操作失败');
  }
}
