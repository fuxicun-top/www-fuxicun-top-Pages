// ========================================
// 文件说明：JWT 工具（HS256 签发/校验）
// 文件路径：functions/api/utils/jwt.js
// 功能：生成和验证 JWT 令牌，用于用户认证
// ========================================

/**
 * Base64URL 编码（JWT 标准编码方式）
 * 将 JSON 对象或字符串编码为 URL 安全的 Base64 格式
 * @param {*} data - 待编码的数据
 * @returns {string} Base64URL 编码字符串
 */
function base64UrlEncode(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL 解码
 * 将 Base64URL 编码的字符串还原为原始字符串
 * @param {string} str - Base64URL 编码字符串
 * @returns {string} 解码后的原始字符串
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function hmacSign(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signJWT(payload, secret, expiresIn = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresIn };

  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(claims);
  const signature = await hmacSign(headerB64 + '.' + payloadB64, secret);

  return headerB64 + '.' + payloadB64 + '.' + signature;
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = await hmacSign(headerB64 + '.' + payloadB64, secret);

  // 恒定时间比较签名（防时序攻击）
  if (signature.length !== expectedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  const payload = JSON.parse(base64UrlDecode(payloadB64));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) return null;

  return payload;
}
