// ========================================
// 文件说明：评论内容敏感词检测
// 文件路径：functions/api/utils/content-filter.js
// 功能：违禁词统一存储在 site_config.sensitive_words，后台可管理
// ========================================

/**
 * 检测内容是否包含违禁词
 * @param {string} content - 待检测内容（评论文本）
 * @param {string} wordsStr - 违禁词库（逗号/换行/顿号分隔，来自 site_config.sensitive_words）
 * @returns {{ blocked: boolean, words: string[] }} blocked=true 表示命中
 */
export function checkSensitiveWords(content, wordsStr) {
  if (!content) return { blocked: false, words: [] };

  const words = parseWords(wordsStr);
  if (words.length === 0) return { blocked: false, words: [] };

  const lowerContent = content.toLowerCase();
  const matched = [];

  for (const word of words) {
    if (lowerContent.includes(word.toLowerCase())) {
      matched.push(word);
    }
  }

  return {
    blocked: matched.length > 0,
    words: matched
  };
}

/**
 * 解析违禁词字符串为数组
 * 支持逗号、换行、中文顿号、分号分隔
 * @param {string} str
 * @returns {string[]}
 */
function parseWords(str) {
  if (!str || !str.trim()) return [];
  return str
    .split(/[,，\n\r、;；]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
}
