# 福溪村网站 Cloudflare Pages 部署指南

## 前置条件

- GitHub 仓库：`fuxicun-top/www-fuxicun-top-Pages`（代码已推送）
- Cloudflare 账号（免费版即可）

---

## 第一步：创建 Pages 项目

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages**
3. 点击 **Create Application** → **Pages** → **Connect to Git**
4. 选择 GitHub 仓库 `fuxicun-top/www-fuxicun-top-Pages`
5. 配置构建设置：
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: 留空（不填）
   - **Build output directory**: `/`
   - **Root directory**: `/`
6. 点击 **Save and Deploy**

---

## 第二步：配置环境变量

进入项目 → **Settings** → **Environment variables** → **Production**

添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `JWT_SECRET` | 你的密钥 | 用户登录 Token 加密密钥（建议 32 位以上随机字符串） |
| `TURNSTILE_SECRET` | 你的 Turnstile 密钥 | Cloudflare Turnstile 验证码密钥 |
| `RESEND_API_KEY` | 你的 Resend API Key | Resend 邮件服务 API Key |

添加后点击 **Save**。

---

## 第三步：创建 D1 数据库

1. 左侧菜单 → **Workers & Pages** → **D1 SQL Database**
2. 点击 **Create database**
3. 数据库名称：`www-fuxicun-top-d1`
4. 点击 **Create**
5. 记录数据库 ID（页面上显示的 UUID）

---

## 第四步：创建 KV 命名空间

1. 左侧菜单 → **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 命名空间名称：`FUXICUN_KV`
4. 点击 **Add**

---

## 第五步：创建 R2 存储桶

1. 左侧菜单 → **R2 Object Storage**
2. 点击 **Create bucket**
3. 存储桶名称：`www-fuxicun-top-r2`
4. 点击 **Create bucket**

---

## 第六步：绑定资源到 Pages

进入 Pages 项目 → **Settings** → **Functions** → **Bindings**

依次添加以下绑定：

### D1 Database 绑定
- 点击 **Add binding**
- Variable name: `FUXICUN_DB`
- D1 database: 选择 `www-fuxicun-top-d1`
- 点击 **Save**

### KV Namespace 绑定
- 点击 **Add binding**
- Variable name: `FUXICUN_KV`
- KV namespace: 选择 `FUXICUN_KV`
- 点击 **Save**

### R2 Bucket 绑定
- 点击 **Add binding**
- Variable name: `FUXICUN_BUCKET`
- R2 bucket: 选择 `www-fuxicun-top-r2`
- 点击 **Save**

---

## 第七步：重新部署

绑定资源后需要重新部署才能生效：

1. 进入 **Deployments** 页面
2. 找到最新一次部署，点击右侧 **···** → **Retry deployment**
3. 等待部署完成（约 15-30 秒）

---

## 第八步：执行安装初始化

1. 访问 `https://fuxicun.top/install.html`（或你的 Pages 默认域名）
2. 创建管理员账号：
   - 用户名：自定义（如 `admin`）
   - 密码：自定义（建议强密码）
   - 邮箱：`www@fuxicun.top`
3. 点击 **安装**
4. 安装完成后会自动创建：
   - 13 张数据表
   - 7 个文章分类
   - 3 张轮播图
   - 8 个导航菜单
   - 7 篇默认文章
   - 20+ 个网站配置项

---

## 第九步：绑定自定义域名

进入 Pages 项目 → **Settings** → **Custom domains**

1. 点击 **Set up a custom domain**
2. 输入域名：`fuxicun.top`
3. 按提示配置 DNS 记录（CNAME 或 A 记录）
4. 等待 SSL 证书自动签发（通常 5-15 分钟）
5. 重复步骤添加 `www.fuxicun.top`

### DNS 配置示例

在你的域名注册商（如阿里云、腾讯云）DNS 管理中添加：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | `@` | `fuxicun-website.pages.dev` | 600 |
| CNAME | `www` | `fuxicun-website.pages.dev` | 600 |

---

## 第十步：验证部署

访问以下地址确认功能正常：

- [ ] `https://fuxicun.top` — 首页正常加载
- [ ] `https://fuxicun.top/articles.html` — 文章列表正常
- [ ] `https://fuxicun.top/article-detail.html?id=1` — 文章详情正常
- [ ] `https://fuxicun.top/gallery.html` — 图片画廊正常
- [ ] `https://fuxicun.top/admin/` — 后台管理可登录
- [ ] `https://fuxicun.top/install.html` — 安装页面（已安装后会提示已安装）

---

## 常见问题

### Q: 部署后页面显示空白或 404？
A: 检查 Build output directory 是否为 `/`，Build command 是否留空。

### Q: API 接口返回 500 错误？
A: 检查 D1/KV/R2 绑定是否正确，环境变量是否配置。

### Q: 安装页面打不开？
A: 确认 `functions/api/routes/install.js` 文件存在，且 Cloudflare Pages 已成功编译 Functions。

### Q: 如何更新网站内容？
A: 在 GitHub 推送代码，Cloudflare Pages 会自动重新部署。或登录后台管理页面直接修改内容。

### Q: 如何重新安装（清空数据库）？
A: 在 Cloudflare 控制台 → D1 → 选择数据库 → Console → 执行 `DROP TABLE` 删除所有表，然后重新访问 install.html。

---

## 项目技术栈

| 组件 | 技术 |
|------|------|
| 前端 | 纯 HTML/CSS/JS（无框架） |
| 后端 | Cloudflare Pages Functions（Serverless） |
| 数据库 | Cloudflare D1（SQLite） |
| 缓存 | Cloudflare KV |
| 存储 | Cloudflare R2 |
| 部署 | Cloudflare Pages + GitHub 自动部署 |

---

## 文件结构

```
├── *.html                    # 前端页面
├── admin/                    # 后台管理页面
├── css/                      # 样式文件
├── js/                       # 前端脚本
├── images/                   # 图片资源
├── functions/                # 后端 API（Cloudflare Functions）
├── user/                     # 用户中心页面
├── fonts/                    # 字体文件
├── package.json              # 依赖配置
├── wrangler.toml.example     # Cloudflare 配置模板
└── robots.txt                # 搜索引擎爬虫配置
```
