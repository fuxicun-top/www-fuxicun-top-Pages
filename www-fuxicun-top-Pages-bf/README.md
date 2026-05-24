# 福溪村官方网站

广西贺州市富川瑶族自治县朝东镇福溪村官方网站，基于 Cloudflare Pages 全栈构建，零服务器成本。

## 项目简介

福溪村是一座历史悠久、文化底蕴深厚的古村落，保存着完好的明清古建筑群，是理学文化的重要传承地。本网站旨在展示福溪村的历史文化、自然风光和民俗风情，为游客和村民提供信息服务平台。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 托管 | Cloudflare Pages | 静态资源托管 + Serverless Functions |
| 后端 | Cloudflare Pages Functions | API 路由，基于 Hono 框架风格 |
| 数据库 | Cloudflare D1 | SQLite 兼容的边缘数据库 |
| 缓存 | Cloudflare KV | 键值存储，用于 API 缓存（10分钟 TTL） |
| 存储 | Cloudflare R2 | 对象存储，用于图片等媒体文件 |
| 前端 | 原生 HTML/CSS/JS | 无框架依赖，轻量高效 |
| 认证 | JWT | 无状态用户认证 |
| 安全 | Cloudflare Turnstile | 人机验证，防机器人注册 |

## 项目结构

```
├── index.html                 # 首页
├── about.html                 # 走进福溪
├── culture.html               # 理学文化
├── scenery.html               # 古村风貌
├── ethnic.html                # 民族文化
├── travel.html                # 旅游指南
├── articles.html              # 新闻动态
├── article-detail.html        # 文章详情
├── stories.html               # 村民故事
├── news.html                  # 最新资讯
├── gallery.html               # 图片画廊
├── videos.html                # 视频库
├── login.html                 # 登录
├── register.html              # 注册
├── forgot-password.html       # 忘记密码
├── install.html               # 安装向导
├── page.html                  # 自定义页面模板
├── terms.html                 # 用户协议
├── privacy.html               # 隐私政策
├── robots.txt                 # 爬虫配置
├── admin/                     # 后台管理
│   ├── index.html             # 仪表盘
│   ├── articles.html          # 文章管理
│   ├── article-edit.html      # 文章编辑（Markdown）
│   ├── categories.html        # 分类管理
│   ├── comments.html          # 评论管理
│   ├── media.html             # 媒体库
│   ├── banners.html           # 轮播图管理
│   ├── nav.html               # 导航管理
│   ├── pages.html             # 页面管理
│   ├── settings.html          # 网站设置
│   ├── users.html             # 用户管理
│   └── logs.html              # 操作日志
├── css/                       # 样式文件
│   ├── common/                # 基础样式（reset、变量、工具类）
│   ├── components/            # 组件样式（header、footer、卡片等）
│   ├── pages/                 # 页面专属样式
│   └── admin/                 # 后台样式
├── js/                        # JavaScript
│   ├── common/                # 工具库（API、Storage、Toast 等）
│   ├── components/            # 公共组件（header、footer）
│   ├── pages/                 # 页面脚本
│   └── admin/                 # 后台脚本
├── images/                    # 图片资源
├── functions/                 # Cloudflare Functions（后端 API）
│   ├── api/
│   │   ├── routes/            # API 路由（auth、admin、public）
│   │   └── utils/             # 工具函数（schema、hash、response 等）
│   └── p/[slug].js            # 自定义页面路由
├── sql/                       # 数据库脚本
│   ├── create-tables.sql      # 建表语句
│   └── default-data.sql       # 默认数据
├── wrangler.toml.example      # Cloudflare 配置模板
├── package.json               # 项目配置
└── LICENSE                    # Apache 2.0 开源协议
```

## 功能特性

### 前台
- 首页轮播图、新闻动态、文化展示
- 文章浏览（分类、搜索、分页、点赞、评论）
- 图片画廊（瀑布流布局、灯箱浏览）
- 视频库（在线播放）
- 响应式设计，支持移动端

### 后台管理
- 仪表盘（数据统计、快速操作）
- 文章管理（Markdown 编辑器、分类、置顶、审核）
- 分类管理、评论管理、媒体库
- 导航菜单管理（支持内部/外部链接）
- 自定义页面管理（`/p/slug` 友好 URL）
- 轮播图管理、网站设置
- 用户管理、操作日志

### 安全机制
- JWT 认证 + 角色权限（admin / editor / user）
- Cloudflare Turnstile 人机验证
- KV 限流（注册 5次/小时、登录 10次/小时）
- 密码 bcrypt 哈希加密
- SQL 注入防护（D1 参数化查询）
- XSS 防护（输出转义）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/fuxicun-website.git
cd fuxicun-website
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Cloudflare 资源

在 [Cloudflare Dashboard](https://dash.cloudflare.com) 中：
- 创建 D1 数据库
- 创建 KV 命名空间
- 创建 R2 存储桶

### 4. 配置环境变量

复制配置模板并填入你的资源 ID：

```bash
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`，填入 D1、KV、R2 的绑定信息。

创建 `.dev.vars` 文件用于本地开发的环境变量：

```
JWT_SECRET=your-jwt-secret-key
TURNSTILE_SECRET=your-turnstile-secret-key
RESEND_API_KEY=your-resend-api-key
```

### 5. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8788/install.html` 完成安装。

### 6. 部署

```bash
npm run deploy
```

部署后访问 `https://your-domain/install.html` 完成生产环境安装。

## Cloudflare 绑定说明

| 绑定名 | 类型 | 用途 |
|--------|------|------|
| FUXICUN_DB | D1 Database | 主数据库（用户、文章、评论等） |
| FUXICUN_KV | KV Namespace | API 缓存（导航、配置、页面） |
| FUXICUN_BUCKET | R2 Bucket | 媒体文件存储 |

## 数据库结构

| 表名 | 说明 |
|------|------|
| users | 用户表（角色、状态） |
| categories | 文章分类 |
| articles | 文章（Markdown 内容） |
| comments | 评论（支持嵌套回复） |
| likes | 文章点赞 |
| media | 媒体文件记录 |
| banners | 轮播图 |
| site_config | 网站配置（KV 缓存） |
| nav_items | 导航菜单（KV 缓存） |
| pages | 自定义页面（KV 缓存） |
| sessions | 会话 |
| password_resets | 密码重置令牌 |
| audit_logs | 操作日志 |

## 开源协议

本项目基于 [Apache License 2.0](LICENSE) 开源。

## 致谢

- [Cloudflare Pages](https://pages.cloudflare.com/) — 全栈托管平台
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — 边缘 SQLite 数据库
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) — 免费人机验证
