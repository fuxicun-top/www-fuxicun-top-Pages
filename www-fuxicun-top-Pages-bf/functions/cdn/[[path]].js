// ========================================
// 文件说明：R2 文件公开访问（CDN 代理）
// 文件路径：functions/cdn/[[path]].js
// 功能：将 R2 存储桶中的图片/视频文件通过 Pages 域名公开提供访问
// 安全：路径前缀白名单 — 仅 images/ videos/ avatars/ 三个公开目录
//       backups/ 等敏感目录绝不允许通过 CDN 下载
// ========================================

// 仅允许这些前缀的文件公开访问（防止路径遍历泄露备份/敏感文件）
const ALLOWED_PREFIXES = ['images/', 'videos/', 'avatars/'];

export async function onRequest(context) {
  const { params, env } = context;
  const key = params.path.join('/');

  if (!key) {
    return new Response('Not Found', { status: 404 });
  }

  // 路径白名单校验：只允许公开资源前缀
  // 备份（backups/）、临时文件等任何不在白名单的前缀一律拒绝
  const isAllowed = ALLOWED_PREFIXES.some(function(prefix) {
    return key.startsWith(prefix);
  });
  if (!isAllowed) {
    return new Response('Forbidden', { status: 403 });
  }

  // 防御性：拒绝任何路径遍历尝试（../ 在 join 后理论上不会出现，做兜底）
  if (key.indexOf('..') !== -1) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    // 从 R2 获取文件
    const object = await env.FUXICUN_BUCKET.get(key);

    if (!object) {
      return new Response('File Not Found', { status: 404 });
    }

    // 获取文件的 MIME 类型
    const contentType = object.httpMetadata?.contentType || getMimeType(key);

    // 构建响应头
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    // 如果有 Content-Length
    if (object.size) {
      headers.set('Content-Length', object.size.toString());
    }

    return new Response(object.body, { headers });
  } catch (e) {
    console.error('R2 get error:', e);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 根据文件扩展名获取 MIME 类型
 * @param {string} key - 文件路径
 * @returns {string} MIME 类型
 */
function getMimeType(key) {
  const ext = key.split('.').pop().toLowerCase();
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  return mimeMap[ext] || 'application/octet-stream';
}
