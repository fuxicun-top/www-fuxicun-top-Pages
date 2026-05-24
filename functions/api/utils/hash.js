// ========================================
// 文件说明：密码加密工具（PBKDF2 算法）
// 文件路径：functions/api/utils/hash.js
// 功能：密码哈希生成、密码验证
// 安全：使用 PBKDF2-SHA256 算法，100000 轮迭代，16字节随机盐
// ========================================

/**
 * 密码哈希生成
 * 使用 PBKDF2 算法对密码进行哈希，生成 salt:hash 格式的存储字符串
 * @param {string} password - 原始明文密码
 * @returns {Promise<string>} 格式为 "salt:hash" 的哈希字符串
 */
export async function hashPassword(password) {
  // 生成 16 字节随机盐值
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  // 导入密码作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );

  // 使用 PBKDF2 派生 256 位密钥（100000 轮迭代）
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );

  // 转换为十六进制字符串
  const hashArray = new Uint8Array(bits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  // 返回 salt:hash 格式（验证时需要盐值）
  return saltHex + ':' + hashHex;
}

/**
 * 密码验证
 * 从存储的哈希字符串中提取盐值，重新计算哈希并比对
 * @param {string} password - 待验证的明文密码
 * @param {string} stored - 存储的 "salt:hash" 格式哈希字符串
 * @returns {Promise<boolean>} 密码是否匹配
 */
export async function verifyPassword(password, stored) {
  // 从存储字符串中分离盐值和哈希值
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();

  // 使用相同的盐值和迭代次数重新派生密钥
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );

  // 恒定时间比较（防时序攻击）：逐字节异或，结果为0才匹配
  const computedHashArray = new Uint8Array(bits);
  let diff = 0;
  const storedHashArray = new Uint8Array(hashHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  for (let i = 0; i < computedHashArray.length; i++) {
    diff |= computedHashArray[i] ^ storedHashArray[i];
  }
  return diff === 0;
}
