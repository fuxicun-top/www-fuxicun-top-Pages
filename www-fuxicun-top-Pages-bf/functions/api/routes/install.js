// ========================================
// 文件说明：安装路由
// 文件路径：functions/api/routes/install.js
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbQueryFirst, dbRun } from '../utils/db.js';
import { hashPassword } from '../utils/hash.js';
import { initDatabase } from '../utils/schema.js';

// 检查是否已安装（防止重复安装）
// 仅检查 D1 管理员是否存在，不依赖 KV 标记（避免 KV 缓存导致无法重装）
async function isInstalled(env) {
  try {
    const admin = await dbQueryFirst(
      env.FUXICUN_DB,
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    return !!admin;
  } catch (e) {
    return false;
  }
}

// 标记安装已完成
async function markInstalled(env) {
  if (env.FUXICUN_KV) {
    try {
      await env.FUXICUN_KV.put('install:completed', 'true');
    } catch (e) { /* 忽略 */ }
  }
}

export async function handleInstall(request, env, path, method) {
  if (path === '/install/check' && method === 'GET') {
    return await checkInstalled(env);
  }
  if (path === '/install/test-bindings' && method === 'POST') {
    return await testBindings(request, env);
  }
  if (path === '/install/init-db' && method === 'POST') {
    return await initDb(request, env);
  }
  if (path === '/install/create-admin' && method === 'POST') {
    return await createAdmin(request, env);
  }

  return errorResponse('接口不存在', 404);
}

// 检查是否已安装
async function checkInstalled(env) {
  try {
    const db = env.FUXICUN_DB;
    if (!db) return successResponse({ installed: false });

    const admin = await dbQueryFirst(
      db,
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    return successResponse({ installed: !!admin });
  } catch (e) {
    return successResponse({ installed: false });
  }
}

// 测试绑定连接（添加安装锁保护，防止探测环境变量）
async function testBindings(request, env) {
  // 安全检查：已安装后禁止测试绑定
  const installed = await isInstalled(env);
  if (installed) {
    return errorResponse('系统已安装，禁止测试绑定', 403);
  }

  try {
    const { d1Binding, kvBinding, r2Binding } = await request.json();
    const results = { d1: { success: false }, kv: { success: false }, r2: { success: false } };

    // 测试 D1
    try {
      const db = env[d1Binding];
      if (!db) {
        results.d1.error = '绑定 "' + d1Binding + '" 不存在，请检查 Pages 控制台配置';
      } else {
        await db.prepare('SELECT 1').first();
        results.d1.success = true;
      }
    } catch (e) {
      results.d1.error = '连接失败: ' + e.message;
    }

    // 测试 KV
    try {
      const kv = env[kvBinding];
      if (!kv) {
        results.kv.error = '绑定 "' + kvBinding + '" 不存在，请检查 Pages 控制台配置';
      } else {
        await kv.put('__test__', 'ok', { expirationTtl: 60 });
        const val = await kv.get('__test__');
        results.kv.success = val === 'ok';
        await kv.delete('__test__');
        if (!results.kv.success) results.kv.error = '读写验证失败';
      }
    } catch (e) {
      results.kv.error = '连接失败: ' + e.message;
    }

    // 测试 R2
    try {
      const r2 = env[r2Binding];
      if (!r2) {
        results.r2.error = '绑定 "' + r2Binding + '" 不存在，请检查 Pages 控制台配置';
      } else {
        await r2.put('__test__.txt', 'ok');
        await r2.delete('__test__.txt');
        results.r2.success = true;
      }
    } catch (e) {
      results.r2.error = '连接失败: ' + e.message;
    }

    return successResponse(results);
  } catch (e) {
    return errorResponse('绑定测试失败: ' + e.message);
  }
}

// 初始化数据库
async function initDb(request, env) {
  // 安装锁：已安装则拒绝
  const installed = await isInstalled(env);
  if (installed) {
    return errorResponse('系统已安装，禁止重复初始化', 403);
  }

  try {
    const { d1Binding } = await request.json();
    const db = env[d1Binding];

    if (!db) {
      return errorResponse('D1 绑定不存在');
    }

    await initDatabase(db);
    return successResponse(null, '数据库初始化成功');
  } catch (e) {
    console.error('Init DB error:', e);
    return errorResponse('数据库初始化失败');
  }
}

// 创建管理员
async function createAdmin(request, env) {
  // 安装锁：已安装则拒绝
  const installed = await isInstalled(env);
  if (installed) {
    return errorResponse('系统已安装，禁止重复创建管理员', 403);
  }

  try {
    const { d1Binding, adminUsername, adminPassword, adminPhone, adminEmail } = await request.json();
    const db = env[d1Binding];

    if (!db) {
      return errorResponse('D1 绑定不存在');
    }

    if (!adminUsername || !adminPassword || !adminPhone) {
      return errorResponse('管理员用户名、密码、手机号为必填项');
    }

    if (adminPassword.length < 8) {
      return errorResponse('管理员密码长度不能少于8位');
    }

    // 检查是否已有管理员
    const existing = await dbQueryFirst(
      db,
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (existing) {
      return errorResponse('已存在管理员账号，如需重新安装请先清空数据库');
    }

    // 创建管理员
    const passwordHash = await hashPassword(adminPassword);

    await dbRun(
      db,
      'INSERT INTO users (username, password_hash, phone, email, role) VALUES (?, ?, ?, ?, ?)',
      [adminUsername, passwordHash, adminPhone, adminEmail || null, 'admin']
    );

    // 更新联系邮箱配置
    if (adminEmail) {
      await dbRun(
        db,
        "UPDATE site_config SET value = ?, updated_at = datetime('now') WHERE key = 'contact_email'",
        [adminEmail]
      );
    }

    // 标记安装完成
    await markInstalled(env);

    return successResponse({
      adminUrl: '/admin/index.html',
      username: adminUsername
    }, '管理员创建成功！');
  } catch (e) {
    console.error('Create admin error:', e);
    return errorResponse('创建失败');
  }
}
