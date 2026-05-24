// ========================================
// 文件说明：Cloudflare Turnstile 人机验证
// 文件路径：functions/api/utils/turnstile.js
// ========================================

/**
 * 验证 Turnstile token
 * @param {string} token - 前端传来的 turnstile token
 * @param {string} secretKey - Turnstile secret key
 * @param {string} remoteIp - 用户 IP（可选）
 * @returns {Promise<boolean>} 验证是否通过
 */
export async function verifyTurnstile(token, secretKey, remoteIp) {
  if (!token || !secretKey) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const outcome = await result.json();
    return outcome.success === true;
  } catch (e) {
    console.error('Turnstile verification error:', e);
    return false;
  }
}
