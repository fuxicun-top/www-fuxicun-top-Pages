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
import { checkRateLimit, getRateLimitCount, incrementRateLimit, clearRateLimit } from '../utils/rate-limit.js';
import { dbQuery } from '../utils/db.js';

/**
 * 获取客户端真实 IP
 * 优先级：cf-connecting-ip > x-forwarded-for > x-real-ip
 */
function getClientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

/**
 * 检查 IP 是否在限流豁免白名单中
 * 从 site_config 读取 rate_limit_exempt_ips（逗号分隔）
 */
async function isIpExempt(env, ip) {
  try {
    const row = await dbQueryFirst(
      env.FUXICUN_DB,
      "SELECT value FROM site_config WHERE key = 'rate_limit_exempt_ips'"
    );
    if (!row || !row.value) return false;
    const ips = row.value.split(',').map(function(s) { return s.trim(); });
    // 本地开发环境：unknown 也视为 localhost
    if (ip === 'unknown' && (ips.indexOf('127.0.0.1') !== -1 || ips.indexOf('localhost') !== -1)) {
      return true;
    }
    return ips.indexOf(ip) !== -1;
  } catch (e) {
    return false;
  }
}

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
  if (path === '/auth/verify-password' && method === 'POST') {
    return await verifyCurrentUserPassword(request, env);
  }

  return errorResponse('接口不存在', 404);
}

async function register(request, env) {
  try {
    const { username, password, phone, email, turnstile_token } = await request.json();

    // 限流：同 IP 每小时最多 5 次注册
    const clientIp = getClientIp(request);
    if (!(await isIpExempt(env, clientIp))) {
      const rateLimit = await checkRateLimit(env.FUXICUN_KV, 'register:' + clientIp, 5, 3600);
      if (rateLimit.limited) {
        return errorResponse('注册操作过于频繁，请稍后再试', 429);
      }
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

    if (username.length < 3 || username.length > 20) {
      return errorResponse('用户名长度为3-20个字符');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return errorResponse('用户名只能包含字母、数字、连字符和下划线');
    }

    if (/^\d{11}$/.test(username)) {
      return errorResponse('用户名不能为11位纯数字');
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
      'INSERT INTO users (username, display_name, password_hash, phone, email) VALUES (?, ?, ?, ?, ?)',
      [username, username, passwordHash, phone, email || null]
    );

    const token = await signJWT(
      { id: result.meta.last_row_id, username, role: 'user' },
      env.JWT_SECRET
    );

    return successResponse({
      token,
      user: { id: result.meta.last_row_id, username, display_name: username, role: 'user' }
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

    const clientIp = getClientIp(request);

    // 限流：按账号失败次数限制（每小时最多 10 次失败）
    // 成功登录不计入限制，共享 IP 的不同用户各自独立计数
    const failLimit = await getRateLimitCount(env.FUXICUN_KV, 'login_fail:' + username.toLowerCase(), 10, 3600);
    if (failLimit.limited) {
      return errorResponse('该账号登录失败次数过多，请 ' + Math.ceil(failLimit.retryAfter / 60) + ' 分钟后再试', 429);
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
      await incrementRateLimit(env.FUXICUN_KV, 'login_fail:' + username.toLowerCase(), 3600);
      return errorResponse('用户名或密码错误');
    }

    if (user.status === 'disabled') {
      return errorResponse('账号已被禁用');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await incrementRateLimit(env.FUXICUN_KV, 'login_fail:' + username.toLowerCase(), 3600);
      return errorResponse('用户名或密码错误');
    }

    const role = user.role;

    // 登录成功，清除该账号的失败计数
    await clearRateLimit(env.FUXICUN_KV, 'login_fail:' + username.toLowerCase());

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
      user: { id: user.id, username: user.username, display_name: user.display_name || user.username, role: role, avatar: user.avatar }
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
      'SELECT id, username, display_name, phone, email, avatar, role, created_at FROM users WHERE id = ?',
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
    const { email, display_name } = await request.json();

    if (display_name !== undefined) {
      const dn = (display_name || '').trim();
      if (dn && (dn.length < 2 || dn.length > 20)) {
        return errorResponse('显示名称长度为2-20个字符');
      }
      await dbRun(
        env.FUXICUN_DB,
        "UPDATE users SET display_name = ?, email = ?, updated_at = datetime('now') WHERE id = ?",
        [dn || '', email || null, auth.user.id]
      );
    } else {
      await dbRun(
        env.FUXICUN_DB,
        "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?",
        [email || null, auth.user.id]
      );
    }

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

// 找回密码（双路径，纯邮箱方案）
// 阶段1：输入用户名 → 自动判断有无邮箱 → 有邮箱直接发
// 阶段2：无邮箱 → 验证手机号 → 输入代收邮箱 → 发送
async function forgotPassword(request, env) {
  try {
    const { username, phone, recipient_email, turnstile_token } = await request.json();

    if (!username) {
      return errorResponse('请输入用户名或手机号');
    }

    // 限流：同 IP 每小时最多 3 次找回密码
    const clientIp = getClientIp(request);
    if (!(await isIpExempt(env, clientIp))) {
      const rateLimit = await checkRateLimit(env.FUXICUN_KV, 'forgot:' + clientIp, 3, 3600);
      if (rateLimit.limited) {
        return errorResponse('操作过于频繁，请稍后再试', 429);
      }
    }

    // ===== 阶段 2：仅验证手机号（无 recipient_email） =====
    if (phone && !recipient_email) {
      const user = await dbQueryFirst(
        env.FUXICUN_DB,
        'SELECT id, username FROM users WHERE username = ? AND phone = ?',
        [username, phone]
      );

      if (!user) {
        return errorResponse('用户名或手机号验证失败，请检查后重试');
      }

      return successResponse({ verified: true }, '手机号验证通过');
    }

    // ===== 阶段 3：验证手机号 + 发送到代收邮箱 =====
    if (phone && recipient_email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email)) {
        return errorResponse('请输入有效的邮箱地址');
      }

      // 用 username + phone 双因素校验
      const user = await dbQueryFirst(
        env.FUXICUN_DB,
        'SELECT id, username FROM users WHERE username = ? AND phone = ?',
        [username, phone]
      );

      // 验证不通过（用户名不存在或手机号不匹配）
      if (!user) {
        return successResponse({ sent: false }, '用户名或手机号验证失败，请检查后重试');
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await dbRun(
        env.FUXICUN_DB,
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt]
      );

      // 发送邮件到一次性代收邮箱（不绑定到用户账号）
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
              to: recipient_email,
              subject: '福溪村官网 - 密码重置',
              html: '<p>您好 ' + escapeHtml(user.username) + '，</p><p>请点击以下链接重置密码（24小时内有效）：</p><p><a href="' + resetUrl + '/reset-password.html?token=' + token + '">重置密码</a></p><p>如非本人操作，请忽略此邮件。</p>'
            })
          });
        } catch (e) {
          console.error('Send email error:', e);
        }
      }

      return successResponse({ sent: true, email_hint: recipient_email }, '重置链接已发送到 ' + recipient_email);
    }

    // ===== 阶段 1：输入用户名，自动判断有无邮箱 =====
    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT id, username, email FROM users WHERE username = ? OR phone = ?',
      [username, username]
    );

    // 防枚举：用户不存在时表现和"无邮箱"一样
    if (!user || !user.email) {
      // 如果第一步输入的本身就是手机号，则跳过验证步骤
      const isPhoneInput = /^1[3-9]\d{9}$/.test(username);
      return successResponse({ has_email: false, phone_verified: isPhoneInput }, '该账号未绑定邮箱，请验证手机号后输入接收邮箱');
    }

    // 有邮箱：直接生成 token 并发送
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // 生成邮箱掩码提示（如 x***@163.com）
    const emailHint = maskEmail(user.email);

    // 发送邮件到用户绑定邮箱
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

    return successResponse({ has_email: true, sent: true, email_hint: emailHint }, '重置链接已发送到 ' + emailHint);
  } catch (e) {
    console.error('Forgot password error:', e);
    return errorResponse('操作失败');
  }
}

/**
 * 邮箱掩码：zhangsan@163.com → z***@163.com
 */
function maskEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***';
  const name = parts[0];
  const domain = parts[1];
  return (name.charAt(0) + '***@' + domain);
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

// 验证当前登录用户的密码（用于敏感操作前的二次确认）
async function verifyCurrentUserPassword(request, env) {
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const { password } = await request.json();

    if (!password) {
      return errorResponse('请输入密码');
    }

    const user = await dbQueryFirst(
      env.FUXICUN_DB,
      'SELECT password_hash FROM users WHERE id = ?',
      [auth.user.id]
    );

    if (!user) {
      return errorResponse('用户不存在');
    }

    const valid = await verifyPassword(password, user.password_hash);
    return successResponse({ valid: valid }, valid ? '密码正确' : '密码错误');
  } catch (e) {
    console.error('Verify password error:', e);
    return errorResponse('验证失败');
  }
}
