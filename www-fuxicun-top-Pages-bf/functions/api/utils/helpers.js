// ========================================
// 文件说明：公共工具函数模块
// 文件路径：functions/api/utils/helpers.js
// 功能：slug 生成、HTML 转义（防 XSS）、内容清理等公共函数
// ========================================

/**
 * 生成 URL 友好的 slug
 * 将中文标题转为 URL 安全的标识字符串
 * 中文标题会附加时间戳确保唯一性
 * @param {string} title - 原始标题
 * @returns {string} URL 友好的 slug
 */
export function generateSlug(title) {
  if (!title) return '';
  // 转小写，非字母数字中文替换为连字符，去首尾连字符，限制长度
  var slug = title.toLowerCase()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  // 全中文标题附加时间戳确保唯一性
  if (/^[一-龥-]+$/.test(slug)) {
    slug = slug.replace(/-+$/g, '') + '-' + Date.now().toString(36);
  }
  return slug || ('article-' + Date.now().toString(36));
}

/**
 * HTML 转义（防 XSS 攻击）
 * 将特殊字符转义为 HTML 实体，防止恶意脚本注入
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的安全字符串
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 清理 HTML 内容（保留基本格式，移除危险标签）
 * 用于文章内容渲染前的安全处理
 *
 * 历史：5/22 修复过 CRITICAL #6 "sanitizeHtml 可被绕过"，
 * 5/23 测试发现部分清理规则被回归（漏掉无引号事件属性 / expression() / data: 协议）。
 * 本版本是最完整的清理规则，禁止再回归到只清理引号包裹事件属性的简化版。
 *
 * @param {string} html - 原始 HTML 内容
 * @returns {string} 清理后的安全 HTML
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  return html
    // 移除 script 标签及内容
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 移除事件处理属性（onclick / onload 等）—— 同时支持引号、单引号、无引号
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
    // 移除 javascript: 协议链接（href / src，引号 / 无引号都管）
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'")
    .replace(/href\s*=\s*javascript:[^\s>]*/gi, 'href="#"')
    .replace(/src\s*=\s*"javascript:[^"]*"/gi, 'src=""')
    .replace(/src\s*=\s*'javascript:[^']*'/gi, "src=''")
    .replace(/src\s*=\s*javascript:[^\s>]*/gi, 'src=""')
    // 移除 data: 协议（防止 data:text/html 嵌入脚本）
    .replace(/href\s*=\s*"data:[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'data:[^']*'/gi, "href='#'")
    .replace(/src\s*=\s*"data:text\/html[^"]*"/gi, 'src=""')
    // 移除 CSS expression() 表达式（IE 旧漏洞）
    .replace(/expression\s*\([^)]*\)/gi, '')
    // 移除 iframe 标签
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // 移除 object / embed 标签
    .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
}
