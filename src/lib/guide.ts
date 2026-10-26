/**
 * 模型详情页「查看评测文章」的落点：从固定跳转改成按模型直达对应那一篇。
 *
 * 数据从哪来：`data/guide-articles.json`，由「模型动态」指南仓库
 * （ai-guide-model-dynamics）的 `scripts/apply-articles.mjs` 生成，
 * 用 `npm run guide` 拉回来。那份映射的作者就是文章作者本人——每篇认领哪些模型写在
 * 指南仓库的 `.vuepress/articles.json` 里，逐条按 `data/models.json` 的模型 slug
 * 核对过，**不是从文件名猜的**。这是这里最重要的设计决定：
 *
 * 按模型名匹配文件名会链错，实测过两类错法——
 *   - 前缀溢出：`GPT-5` 命中「GPT-5.6 三模型横评」；
 *   - 一对多：`Claude Fable 5` 同时命中 5 与 5.1 两篇，`GPT-6 Astra` 有实测与发布解读两篇。
 * 所以这里不做任何匹配：查表，命中就直达，没命中就落合集页。错链比没链糟得多，
 * 而这张表小到可以人工核对（21 条）。
 *
 * 为什么不走构建期联网抓指南站：那是另一个人的站（虽然现在内容归同一位作者），
 * 把「能不能发版」押在它的可用性上不值得；提交进仓库、构建期离线读取，
 * 和 `data/bilibili.json` 是同一套取舍。
 */

export interface GuideArticle {
  url: string;
  title: string;
  /** 指南仓库里的源文件名，链错时可以追溯到出处 */
  file?: string;
}

export interface GuideCollection {
  url: string;
  title: string;
}

export interface GuideLibrary {
  generatedFrom?: string;
  baseUrl?: string;
  collection: GuideCollection;
  models: Record<string, GuideArticle>;
}

/**
 * 空库。URL **不写死在这里**：指南现在挂在 pages.dev 预览域上，将来会换自定义域，
 * 抄一份兜底地址等于埋一条指向旧域名的死链。地址的唯一来源是
 * `data/guide-articles.json`（`npm run guide` 拉回来），缺了就当没有这个入口。
 */
export const EMPTY_GUIDE: GuideLibrary = {
  collection: { url: '', title: '' },
  models: {},
};

/**
 * 详情页要展示的链接。`article` 为 null 时按钮退回合集页文案，
 * 这样「这条有专文」和「只是进了合集」在 UI 上是可分辨的。
 */
export interface GuideLink {
  url: string;
  title: string;
  /** 有专文时是文章标题；没有则为 null */
  article: GuideArticle | null;
}

/**
 * 查这个模型的评测文章。
 *
 * 只认 slug，不做名字模糊匹配（见文件头）。命中给专文，未命中给合集页；
 * 两者都没有（数据文件没拉过）时返回 null，调用方据此**整个不出这个按钮**——
 * 一个点了打不开的按钮比没有按钮更糟，这和搜索框禁用 JS 时不渲染是同一条原则。
 */
export function guideLinkFor(guide: GuideLibrary, modelSlug: string): GuideLink | null {
  const article = guide.models[modelSlug];
  if (article && /^https?:\/\//.test(article.url)) {
    return { url: article.url, title: article.title || '评测文章', article };
  }
  if (/^https?:\/\//.test(guide.collection.url)) {
    return { url: guide.collection.url, title: guide.collection.title, article: null };
  }
  return null;
}
