// ========================================
// 文件说明：评论内容敏感词检测
// 文件路径：functions/api/utils/content-filter.js
//
// 用途：评论提交时调用 detectSensitive(text, env)，命中任一规则即返回 true，
//      调用方应将该评论 status 强制为 'pending'，进入后台人工审核流程。
//
// 词库来源：
//   1) 内置基础词表（辱骂 / 政治敏感 / 涉黄涉赌涉毒 / 诈骗常见词）
//   2) site_config.sensitive_words（管理员在「后台 → 网站设置」自行扩展，
//      逗号 / 换行 / 顿号分隔均可）
//
// 设计说明：
//   - 仅做"分流"，不做硬拦截 —— 命中只是把评论丢到 pending 队列让人工再确认，
//     避免误伤（"这家店真黄"等中性表述也可能命中"黄"，统一靠人工把关）
//   - 内置词表故意保留中等强度，**真实敏感词**留给管理员补充
//   - 使用方需要清楚：本模块不能替代专业的内容审核服务（如阿里云、腾讯云的内容安全 API），
//     仅作为零成本基础防线
// ========================================

/**
 * 内置基础敏感词（中等强度，按主题分类，便于将来调整）
 * 写在代码里，不在 site_config，避免管理员误删导致防线裸奔。
 * 词条故意保留克制 —— 真正高危词由管理员在 site_config.sensitive_words 中扩展。
 */
const BUILTIN_WORDS = [
  // 辱骂常见词（仅举例）
  '傻逼', '操你', '草你', '狗逼', '婊子', '贱人', '滚蛋', '去死',
  // 涉黄常见隐语
  '约炮', '小姐上门',
  // 涉赌涉毒
  '六合彩', '赌博', '冰毒',
  // 诈骗 / 黑产
  '办证', '代开发票', '出售银行卡', '私人贷款', '加微信赚',
  // 政治极端（仅典型词，避免冒犯，真实词由管理员补）
  // 留空 — 此项目主要面向村民和游客，政治词留给管理员视情况决定
];

/**
 * 解析管理员配置的敏感词字符串
 * 支持的分隔符：逗号 ,、中文逗号 ，、换行 \n、顿号 、、空格、分号 ;
 * @param {string} raw 来自 site_config.sensitive_words 的原始字符串
 * @returns {string[]} 去重去空白后的词数组
 */
export function parseSensitiveWords(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/[\s,，、;；\r\n]+/)
    .map(function(w) { return w.trim(); })
    .filter(function(w) { return w.length > 0 && w.length <= 30; });
}

/**
 * 检测文本是否命中敏感词
 * @param {string} text 用户提交的文本（评论 / 昵称都可以丢进来）
 * @param {Object} env Cloudflare 环境变量（用于读取 site_config 扩展词表）
 * @returns {Promise<{hit: boolean, word: string|null}>} hit=是否命中，word=命中的具体词（用于日志）
 */
export async function detectSensitive(text, env) {
  if (!text) return { hit: false, word: null };
  const lower = text.toLowerCase();

  // 1) 内置词表
  for (const w of BUILTIN_WORDS) {
    if (w && lower.indexOf(w.toLowerCase()) !== -1) {
      return { hit: true, word: w };
    }
  }

  // 2) site_config.sensitive_words 管理员扩展
  try {
    if (env && env.FUXICUN_DB) {
      const row = await env.FUXICUN_DB
        .prepare("SELECT value FROM site_config WHERE key = 'sensitive_words'")
        .first();
      const extras = parseSensitiveWords(row && row.value);
      for (const w of extras) {
        if (lower.indexOf(w.toLowerCase()) !== -1) {
          return { hit: true, word: w };
        }
      }
    }
  } catch (e) {
    // 取词表失败不影响主流程，只是少了一层兜底
    console.error('detectSensitive: load sensitive_words failed:', e.message);
  }

  return { hit: false, word: null };
}
