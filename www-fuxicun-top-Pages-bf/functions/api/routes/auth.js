// ========================================
// 文件说明：认证路由
// 文件路径：functions/api/routes/auth.js
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbQueryFirst, dbRun } from '../utils/db.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signJWT } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { verifyTurnstile } from '../utils/turnstile.js';
import { checkRateLimit } from '../utils/rate-limit.js';
import { escapeHtml } from '../utils/helpers.js';

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
  // 找回密码分支②（无邮箱用户）：用户名 + 手机号双因素校验 → 输入接收邮箱（不绑定）→ 发链接
  if (path === '/auth/forgot-password/with-phone' && method === 'POST') {
    return await forgotPasswordWithPhone(request, env);
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
    if (env.TURNSTILE_SECRET_KEY) {
      const verified = await verifyTurnstile(turnstile_token, env.TURNSTILE_SECRET_KEY, clientIp);
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
    if (env.TURNSTILE_SECRET_KEY) {
      const verified = await verifyTurnstile(turnstile_token, env.TURNSTILE_SECRET_KEY, clientIp);
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

// ==============================
// 找回密码 - 分支②（无邮箱用户）
// 用户名 + 手机号双因素校验通过 → 接收一次性投递邮箱 → 发链接 → 设新密码 → 自动登录
//
// 业务规则（写在 MEMORY.md，不要随便改）：
//   - "接收邮箱"是一次性投递地址，绝不写回 users.email
//   - 很多中老年用户用家人/朋友代收邮箱，自动绑定会把代收人邮箱锁死为本人邮箱
//   - 用户如需正式绑定，登录后到「个人中心 → 修改邮箱」自行设置
// ==============================
async function forgotPasswordWithPhone(request, env) {
  try {
    const body = await request.json();
    const username = body.username;
    const phone = body.phone;
    const recipientEmail = body.recipient_email;
    const turnstileToken = body.turnstile_token;

    if (!username || !phone || !recipientEmail) {
      return errorResponse('请填写完整信息（用户名、手机号、接收邮箱）');
    }

    // 简单格式校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return errorResponse('接收邮箱格式不正确');
    }

    // 限流：同 IP 每小时最多 3 次（与分支①共用配额）
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await checkRateLimit(env.FUXICUN_KV, 'forgot:' + clientIp, 3, 3600);
    if (rateLimit.limited) {
      return errorResponse('操作过于频繁，请稍后再试', 429);
    }

    // 可选 Turnstile（防机器人扫描手机号）
    if (env.TURNSTILE_SECRET) {
      const ok = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET);
      if (!ok) {
        return errorResponse('人机校验失败，请重试');
      }
    }

    // 双因素校验：用户名 + 手机号同时匹配同一用户
    // 如果失败，依然返回"假装成功"防止他人通过尝试枚举手机号
    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, username, email FROM users WHERE username = ? AND phone = ?',
      [username, phone]
    );

    const fakeOkMessage = '如该账号信息无误，重置链接已发送至您填写的邮箱';

    if (!user) {
      return successResponse(null, fakeOkMessage);
    }

    // 生成 token，与分支①完全一致的逻辑
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // 发送邮件到"接收邮箱"（不是 user.email，因为很多用户没有 email）
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
            to: recipientEmail,
            subject: '福溪村官网 - 密码重置',
            html: '<p>您好，</p>' +
                  '<p>用户 ' + escapeHtml(user.username) + ' 申请通过此邮箱接收密码重置链接（24 小时内有效）：</p>' +
                  '<p><a href="' + resetUrl + '/reset-password.html?token=' + token + '">点此重置密码</a></p>' +
                  '<p style="color:#666;font-size:13px;">提示：本次重置邮箱仅用于一次性投递，<strong>不会绑定到该账户</strong>；' +
                  '如非本人操作请忽略此邮件。</p>'
          })
        });
      } catch (e) {
        console.error('Send email error:', e);
      }
    }

    // 记录到审计日志（注意：不写 recipient_email 避免泄漏）
    try {
      await dbRun(
        env.FUXICUN_DB,
        "INSERT INTO audit_logs (user_id, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, 'forgot_password_with_phone', 'user', user.id, '通过手机号双因素校验申请密码重置（邮箱仅一次投递，未绑定）', clientIp]
      );
    } catch (e) { /* 日志失败不影响主流程 */ }

    return successResponse(null, fakeOkMessage);
  } catch (e) {
    console.error('Forgot password (with phone) error:', e);
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

    // 重置成功后自动登录：取用户信息并签发新的 JWT
    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, username, role, status FROM users WHERE id = ?',
      [reset.user_id]
    );

    // 兜底：用户被禁用 / 删除 → 不下发 token，让前端引导用户重新登录
    if (!user || user.status === 'disabled') {
      return successResponse(null, '密码重置成功，请登录');
    }

    const jwt = await signJWT(
      { id: user.id, username: user.username, role: user.role || 'user' },
      env.JWT_SECRET
    );

    return successResponse({
      token: jwt,
      user: { id: user.id, username: user.username, role: user.role || 'user' }
    }, '密码重置成功，已自动登录');
  } catch (e) {
    console.error('Reset password error:', e);
    return errorResponse('操作失败');
  }
}
