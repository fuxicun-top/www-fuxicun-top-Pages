// ========================================
// 文件说明：R2 文件公开访问（CDN 代理）
// 文件路径：functions/cdn/[[path]].js
// 功能：将 R2 存储桶中的图片/视频文件通过 Pages 域名公开提供访问
// ========================================

// 允许的 R2 路径前缀（防止任意文件访问）
const ALLOWED_PREFIXES = ['images/', 'videos/', 'avatars/'];

export async function onRequest(context) {
  const { params, env } = context;
  const key = params.path.join('/');

  if (!key) {
    return new Response('Not Found', { status: 404 });
  }

  // 安全检查：只允许访问指定目录下的文件
  if (!ALLOWED_PREFIXES.some(function(prefix) { return key.startsWith(prefix); })) {
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
