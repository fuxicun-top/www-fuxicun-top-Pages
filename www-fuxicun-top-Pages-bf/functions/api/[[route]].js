// ========================================
// 文件说明：API 主入口（路由分发）
// 文件路径：functions/api/[[route]].js
// 功能：所有 /api/* 请求的统一入口，根据路径分发到对应路由处理器
// 路由结构：
//   /api/auth/*      → 认证（注册/登录/找回密码）
//   /api/user/*      → 用户中心（文章管理/头像上传）
//   /api/install/*   → 安装向导
//   /api/categories  → 分类（公开）
//   /api/banners     → 轮播图（公开）
//   /api/config      → 网站配置（公开）
//   /api/nav         → 导航菜单（公开）
//   /api/media       → 媒体列表（公开）
//   /api/pages/*     → 自定义页面（公开）
//   /api/admin/*     → 后台管理（需认证）
//   /api/articles/*  → 文章（公开+需认证）
//   /api/comments/*  → 评论
//   /api/upload/*    → 文件上传（需认证）
// ========================================

import { handleAuth } from './routes/auth.js';
import { handleInstall } from './routes/install.js';
import { handleAdmin } from './routes/admin.js';
import { handleArticles } from './routes/articles.js';
import { handleComments } from './routes/comments.js';
import { handleUpload } from './routes/upload.js';
import { handlePublic } from './routes/public.js';
import { handleUser } from './routes/user.js';
import { errorResponse } from './utils/response.js';

/**
 * API 请求处理入口
 * 所有 /api/* 请求经 Cloudflare Pages Functions 路由到此处
 * @param {Object} context - Pages Functions 上下文
 * @param {Request} context.request - 请求对象
 * @param {Object} context.env - 环境变量（含 D1/KV/R2 绑定）
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // 提取 /api 后的路径，如 /api/auth/login → /auth/login
  const path = url.pathname.replace('/api', '');
  const method = request.method;

  // 处理 CORS 预检请求（同源部署不需要，但保留以防调试）
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    // 认证相关路由（注册/登录/找回密码/个人信息）
    if (path.startsWith('/auth')) {
      return await handleAuth(request, env, path, method);
    }

    // 用户中心路由（我的文章/发布/头像/密码）
    if (path.startsWith('/user')) {
      return await handleUser(request, env, path, method);
    }

    // 安装向导路由（初始化数据库/创建管理员）
    if (path.startsWith('/install')) {
      return await handleInstall(request, env, path, method);
    }

    // 公开接口（无需认证）：分类、轮播图、网站配置、导航菜单、自定义页面
    if (['/categories', '/banners', '/config', '/nav', '/media'].includes(path) || path.startsWith('/pages/')) {
      return await handlePublic(request, env, path, method);
    }

    // 后台管理路由（需认证，权限按路径区分）
    if (path.startsWith('/admin')) {
      return await handleAdmin(request, env, path, method);
    }

    // 文章评论路由（/articles/:id/comments）
    if (path.match(/^\/articles\/\d+\/comments/)) {
      return await handleComments(request, env, path, method);
    }

    // 文章路由（列表/详情/创建/更新/删除/点赞）
    if (path.startsWith('/articles')) {
      return await handleArticles(request, env, path, method);
    }

    // 评论路由（独立删除接口）
    if (path.startsWith('/comments')) {
      return await handleComments(request, env, path, method);
    }

    // 文件上传路由（图片/视频）
    if (path.startsWith('/upload')) {
      return await handleUpload(request, env, path, method);
    }

    // 未匹配任何路由
    return errorResponse('接口不存在', 404);
  } catch (e) {
    console.error('API 服务器错误:', e);
    return errorResponse('服务器内部错误', 500);
  }
}
