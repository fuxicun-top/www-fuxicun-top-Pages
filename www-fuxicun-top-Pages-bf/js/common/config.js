// ========================================
// 文件说明：配置文件（API地址等）
// 文件路径：js/common/config.js
// ========================================

var CONFIG = {
  // API 基础地址（同源部署，使用相对路径）
  API_BASE: '/api',

  // Turnstile 站点密钥
  TURNSTILE_SITE_KEY: '0x4AAAAAADSdNszTnxh_YMYy',

  // 分页默认值
  PAGE_SIZE: 12,

  // 上传限制
  UPLOAD_IMAGE_MAX_SIZE: 5 * 1024 * 1024,   // 5MB
  UPLOAD_VIDEO_MAX_SIZE: 100 * 1024 * 1024,  // 100MB

  // 允许的文件类型
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4'],

  // 网站名称
  SITE_NAME: '福溪村'
};
