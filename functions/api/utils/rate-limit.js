// ========================================
// 文件说明：基于 KV 的请求限流工具
// 文件路径：functions/api/utils/rate-limit.js
// 功能：IP 限流检查，防止暴力破解和滥用
// 原理：在 KV 中维护每个限流键的请求计数和窗口起始时间
// ========================================

/**
 * 检查请求是否超过限流
 * 使用滑动窗口算法，基于 KV 存储实现分布式限流
 * @param {Object} kv - KV 命名空间绑定
 * @param {string} key - 限流键（格式建议：操作类型:IP，如 "login:192.168.1.1"）
 * @param {number} maxRequests - 时间窗口内允许的最大请求数（默认 10）
 * @param {number} windowSeconds - 时间窗口长度，单位秒（默认 3600，即1小时）
 * @returns {Promise<{limited: boolean, remaining: number, retryAfter: number}>}
 *   - limited: 是否被限流
 *   - remaining: 窗口内剩余可用次数
 *   - retryAfter: 被限流时需等待的秒数
 */
export async function checkRateLimit(kv, key, maxRequests = 10, windowSeconds = 3600) {
  // KV 不可用时降级为不限流
  if (!kv) return { limited: false, remaining: maxRequests, retryAfter: 0 };

  const rateLimitKey = 'ratelimit:' + key;

  try {
    const data = await kv.get(rateLimitKey, { type: 'json' });
    const now = Math.floor(Date.now() / 1000);

    if (!data || now - data.windowStart >= windowSeconds) {
      // 新的限流窗口：重置计数
      await kv.put(rateLimitKey, JSON.stringify({
        windowStart: now,
        count: 1
      }), { expirationTtl: windowSeconds + 60 });

      return { limited: false, remaining: maxRequests - 1, retryAfter: 0 };
    }

    if (data.count >= maxRequests) {
      // 已超过限流阈值：计算需要等待的时间
      const retryAfter = windowSeconds - (now - data.windowStart);
      return { limited: true, remaining: 0, retryAfter };
    }

    // 请求计数加一
    await kv.put(rateLimitKey, JSON.stringify({
      windowStart: data.windowStart,
      count: data.count + 1
    }), { expirationTtl: windowSeconds + 60 });

    return { limited: false, remaining: maxRequests - data.count - 1, retryAfter: 0 };
  } catch (e) {
    // KV 异常时降级为不限流，避免阻塞正常请求
    console.error('限流检查异常:', e);
    return { limited: false, remaining: maxRequests, retryAfter: 0 };
  }
}
