// ========================================
// 文件说明：文章编辑页面脚本（Markdown 编辑器）
// 文件路径：js/admin/article-edit.js
// 功能：新建/编辑文章、Markdown 工具栏、图片视频上传、文章保存
// ========================================

(function() {
  'use strict';

  /** @type {number|null} 当前编辑的文章 ID（null 表示新建） */
  var articleId = null;

  /**
   * 页面初始化入口
   */
  function init() {
    if (!Admin.init()) return;

    // 从 URL 获取文章 ID（编辑模式）
    var params = new URLSearchParams(window.location.search);
    articleId = params.get('id') ? parseInt(params.get('id')) : null;

    if (articleId) {
      document.getElementById('page-title').textContent = '编辑文章 #' + articleId;
      document.title = '编辑文章 #' + articleId + ' - 福溪村后台';
    }

    // 实时预览：输入时同步渲染 Markdown
    var input = document.getElementById('md-input');
    input.addEventListener('input', function() {
      var preview = document.getElementById('md-preview');
      if (!preview.classList.contains('md-preview-hidden')) {
        preview.innerHTML = renderMarkdown(input.value);
      }
    });

    loadCategories();
    loadArticle();
  }

  /**
   * 简易 Markdown 渲染器（支持常用语法）
   * @param {string} md - Markdown 文本
   * @returns {string} HTML 字符串
   */
  function renderMarkdown(md) {
    if (!md) return '<p style="color:#999;">暂无内容</p>';
    var html = md
      // 代码块（先处理，避免内部被替换）
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // 粗体和斜体
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 图片（在链接之前处理）
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;">')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--color-primary);">$1</a>')
      // 引用块
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // 水平线
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">')
      // 无序列表
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      // 有序列表
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // 段落（双换行）
      .replace(/\n\n/g, '</p><p>')
      // 单换行
      .replace(/\n/g, '<br>');

    return '<p>' + html + '</p>';
  }

  /**
   * HTML 转 Markdown（用于加载旧文章内容）
   * @param {string} html - HTML 字符串
   * @returns {string} Markdown 字符串
   */
  function htmlToMarkdown(html) {
    if (!html) return '';
    // 如果内容不包含 HTML 标签，直接返回（已经是 Markdown）
    if (!/<[a-z][\s\S]*>/i.test(html)) return html;

    var md = html
      // 标题
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
      // 粗体和斜体
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
      .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
      // 行内代码
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
      // 代码块
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n')
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n')
      // 链接
      .replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      // 图片
      .replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
      .replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
      // 引用
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, function(m, content) {
        return content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '> $1\n').replace(/<[^>]+>/g, '') + '\n';
      })
      // 分割线
      .replace(/<hr[^>]*\/?>/gi, '\n---\n')
      // 列表
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(m, items) {
        return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
      })
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, function(m, items) {
        var i = 0;
        return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, function() { return (++i) + '. ' + RegExp.$1 + '\n'; });
      })
      // 段落和换行
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // 移除剩余 HTML 标签
      .replace(/<[^>]+>/g, '')
      // HTML 实体
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return md;
  }

  /**
   * 切换编辑/预览标签页
   * @param {string} tab - 'edit' 或 'preview'
   */
  function switchTab(tab) {
    var input = document.getElementById('md-input');
    var preview = document.getElementById('md-preview');
    var tabs = document.querySelectorAll('.md-editor__tab');

    tabs.forEach(function(t) { t.classList.remove('md-editor__tab--active'); });

    if (tab === 'edit') {
      tabs[0].classList.add('md-editor__tab--active');
      input.style.display = '';
      preview.classList.add('md-preview-hidden');
    } else {
      tabs[1].classList.add('md-editor__tab--active');
      preview.innerHTML = renderMarkdown(input.value);
      input.style.display = 'none';
      preview.classList.remove('md-preview-hidden');
    }
  }

  /**
   * 分屏模式（编辑 + 预览并排）
   */
  function splitView() {
    var input = document.getElementById('md-input');
    var preview = document.getElementById('md-preview');
    var tabs = document.querySelectorAll('.md-editor__tab');

    tabs.forEach(function(t) { t.classList.remove('md-editor__tab--active'); });
    tabs[2].classList.add('md-editor__tab--active');

    input.style.display = '';
    preview.classList.remove('md-preview-hidden');
    preview.innerHTML = renderMarkdown(input.value);

    // 输入时实时更新预览
    input.removeEventListener('input', splitViewUpdate);
    input.addEventListener('input', splitViewUpdate);
  }

  function splitViewUpdate() {
    var input = document.getElementById('md-input');
    var preview = document.getElementById('md-preview');
    if (!preview.classList.contains('md-preview-hidden')) {
      preview.innerHTML = renderMarkdown(input.value);
    }
  }

  /**
   * 在光标位置插入 Markdown 前缀/后缀
   * @param {string} prefix - 前缀
   * @param {string} suffix - 后缀
   */
  function insertMd(prefix, suffix) {
    var input = document.getElementById('md-input');
    var start = input.selectionStart;
    var end = input.selectionEnd;
    var text = input.value;
    var selected = text.substring(start, end) || '文本';
    input.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    input.focus();
    input.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
  }

  /**
   * 在当前行前插入前缀
   * @param {string} prefix - 行前缀
   */
  function insertLine(prefix) {
    var input = document.getElementById('md-input');
    var start = input.selectionStart;
    var text = input.value;
    // 找到当前行的开头
    var lineStart = text.lastIndexOf('\n', start - 1) + 1;
    input.value = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    input.focus();
    input.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
  }

  /**
   * 插入表格模板
   */
  function insertTable() {
    var table = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n';
    var input = document.getElementById('md-input');
    var start = input.selectionStart;
    input.value = input.value.substring(0, start) + table + input.value.substring(start);
    input.focus();
  }

  /**
   * 上传图片
   * @param {File} file - 图片文件
   */
  async function uploadImage(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Toast.error('图片不能超过 5MB');
      return;
    }

    var progress = document.getElementById('upload-progress');
    progress.style.display = 'block';
    progress.textContent = '正在上传: ' + file.name + '...';

    try {
      var result = await API.upload(file, 'image');
      if (result.success) {
        var md = '\n![' + file.name + '](' + result.data.url + ')\n';
        var input = document.getElementById('md-input');
        var pos = input.selectionStart;
        input.value = input.value.substring(0, pos) + md + input.value.substring(pos);
        Toast.success('图片上传成功');
      } else {
        Toast.error('上传失败: ' + (result.error?.message || file.name));
      }
    } catch (e) {
      Toast.error('上传失败: ' + e.message);
    } finally {
      progress.style.display = 'none';
    }
  }

  /**
   * 上传视频
   * @param {File} file - 视频文件
   */
  async function uploadVideo(file) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      Toast.error('视频不能超过 100MB');
      return;
    }

    var progress = document.getElementById('upload-progress');
    progress.style.display = 'block';
    progress.textContent = '正在上传: ' + file.name + '...';

    try {
      var result = await API.upload(file, 'video');
      if (result.success) {
        var md = '\n[视频: ' + file.name + '](' + result.data.url + ')\n';
        var input = document.getElementById('md-input');
        var pos = input.selectionStart;
        input.value = input.value.substring(0, pos) + md + input.value.substring(pos);
        Toast.success('视频上传成功');
      } else {
        Toast.error('上传失败: ' + (result.error?.message || file.name));
      }
    } catch (e) {
      Toast.error('上传失败: ' + e.message);
    } finally {
      progress.style.display = 'none';
    }
  }

  /**
   * 加载分类列表
   */
  async function loadCategories() {
    try {
      var result = await API.get('/categories');
      if (result.success) {
        var select = document.getElementById('article-category');
        result.data.forEach(function(cat) {
          var option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          select.appendChild(option);
        });
      }
    } catch (e) {
      console.error('加载分类失败:', e);
    }
  }

  /**
   * 加载文章详情（编辑模式）
   */
  async function loadArticle() {
    if (!articleId) return;

    try {
      var result = await API.get('/articles/' + articleId);
      if (!result.success) {
        Toast.error('文章不存在');
        setTimeout(function() { window.location.href = '/admin/articles.html'; }, 1500);
        return;
      }

      var article = result.data;

      document.getElementById('article-title').value = article.title || '';
      document.getElementById('article-excerpt').value = article.excerpt || '';
      document.getElementById('article-cover').value = article.cover_image || '';
      // 旧文章内容可能是 HTML，自动转换为 Markdown
      document.getElementById('md-input').value = htmlToMarkdown(article.content || '');

      if (article.category_id) {
        document.getElementById('article-category').value = article.category_id;
      }
      if (article.is_top) {
        document.getElementById('article-featured').checked = true;
      }
      if (article.cover_image) {
        previewCover(article.cover_image);
      }
    } catch (e) {
      Toast.error('加载文章失败: ' + e.message);
    }
  }

  /**
   * 预览封面图片
   * @param {string} url - 图片 URL
   */
  function previewCover(url) {
    var preview = document.getElementById('cover-preview');
    if (url && url.trim()) {
      preview.src = url;
      preview.style.display = 'block';
      preview.onerror = function() { this.style.display = 'none'; };
    } else {
      preview.style.display = 'none';
    }
  }

  /**
   * 保存文章
   * @param {string} status - 目标状态
   */
  async function save(status) {
    var title = document.getElementById('article-title').value.trim();
    var content = document.getElementById('md-input').value.trim();
    var excerpt = document.getElementById('article-excerpt').value.trim();
    var coverImage = document.getElementById('article-cover').value.trim();
    var categoryId = document.getElementById('article-category').value;

    if (!title) {
      Toast.warning('请输入文章标题');
      document.getElementById('article-title').focus();
      return;
    }
    if (!content) {
      Toast.warning('请输入文章内容');
      document.getElementById('md-input').focus();
      return;
    }

    var isTop = document.getElementById('article-featured').checked;

    var data = {
      title: title,
      content: content,
      excerpt: excerpt,
      cover_image: coverImage,
      category_id: categoryId || null,
      status: status,
      is_top: isTop
    };

    var btnId = status === 'published' ? 'btn-publish' : 'btn-save';
    var btn = document.getElementById(btnId);
    var originalText = btn.textContent;
    btn.textContent = '保存中...';
    btn.disabled = true;

    try {
      var result;
      if (articleId) {
        result = await API.put('/admin/articles/' + articleId, data);
      } else {
        result = await API.post('/admin/articles', data);
      }

      if (result.success) {
        Toast.success(articleId ? '文章更新成功' : '文章创建成功');
        setTimeout(function() { window.location.href = '/admin/articles.html'; }, 1000);
      } else {
        Toast.error(result.error?.message || '保存失败');
      }
    } catch (e) {
      Toast.error('保存失败: ' + e.message);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  // 暴露全局方法
  window.ArticleEdit = {
    save: save,
    previewCover: previewCover,
    insertMd: insertMd,
    insertLine: insertLine,
    insertTable: insertTable,
    switchTab: switchTab,
    splitView: splitView,
    uploadImage: uploadImage,
    uploadVideo: uploadVideo
  };

  document.addEventListener('DOMContentLoaded', init);
})();
