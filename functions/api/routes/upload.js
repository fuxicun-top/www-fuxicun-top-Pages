// ========================================
// 文件说明：文件上传路由（支持图片和视频）
// 文件路径：functions/api/routes/upload.js
// 功能：图片上传、视频上传到 R2 存储，元数据记录到 D1
// ========================================

import { successResponse, errorResponse } from '../utils/response.js';
import { dbRun } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

/** 允许的图片类型 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** 允许的视频类型 */
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

/** 图片最大大小：5MB */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** 视频最大大小：100MB */
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/**
 * 上传路由分发
 * @param {Request} request - 请求对象
 * @param {object} env - 环境变量
 * @param {string} path - 请求路径
 * @param {string} method - 请求方法
 */
export async function handleUpload(request, env, path, method) {
  if (path === '/upload/image' && method === 'POST') {
    return await uploadFile(request, env, 'image');
  }

  if (path === '/upload/video' && method === 'POST') {
    return await uploadFile(request, env, 'video');
  }

  // 通用上传接口（自动判断类型）
  if (path === '/upload' && method === 'POST') {
    return await uploadFile(request, env, 'auto');
  }

  return errorResponse('接口不存在', 404);
}

/**
 * 通用文件上传处理
 * 支持图片（JPG/PNG/WebP/GIF，最大 5MB）和视频（MP4/WebM，最大 100MB）
 * @param {Request} request - 请求对象
 * @param {object} env - 环境变量（含 FUXICUN_BUCKET、FUXICUN_DB）
 * @param {string} type - 上传类型（image/video/auto）
 */
async function uploadFile(request, env, type) {
  // 身份验证
  const auth = await authenticate(request, env);
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return errorResponse('请选择文件');
    }

    // 判断文件类型
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    // 验证类型
    if (type === 'image' && !isImage) {
      return errorResponse('仅支持 JPG、PNG、WebP、GIF 格式图片');
    }
    if (type === 'video' && !isVideo) {
      return errorResponse('仅支持 MP4、WebM 格式视频');
    }
    if (type === 'auto' && !isImage && !isVideo) {
      return errorResponse('不支持的文件类型，仅支持图片（JPG/PNG/WebP/GIF）和视频（MP4/WebM）');
    }

    // 验证大小
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return errorResponse('图片大小不能超过 5MB');
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return errorResponse('视频大小不能超过 100MB');
    }

    // 生成唯一文件名（校验扩展名存在性）
    const nameParts = file.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : (isImage ? 'jpg' : 'mp4');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const folder = isImage ? 'images' : 'videos';
    const key = `${folder}/${timestamp}-${random}.${ext}`;

    // 上传到 R2 存储桶
    await env.FUXICUN_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000'
      }
    });

    // 文件访问 URL（通过 R2 公开访问或绑定域名）
    const fileUrl = '/cdn/' + key;

    // 记录到 media 表
    await dbRun(
      env.FUXICUN_DB,
      'INSERT INTO media (filename, original_name, type, size, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [key, file.name, file.type, file.size, fileUrl, auth.user.id]
    );

    return successResponse({
      url: fileUrl,
      key: key,
      originalName: file.name,
      size: file.size,
      type: file.type
    }, '上传成功');
  } catch (e) {
    console.error('Upload error:', e);
    return errorResponse('上传失败');
  }
}
