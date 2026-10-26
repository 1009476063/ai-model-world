import { CompareButton } from '@/components/compare/CompareButton';
import { guideLinkFor } from '@/lib/guide';
import { loadGuideLibrary } from '@/lib/guide-library';
import { getDict, type Lang } from '@/lib/i18n';

/**
 * B 站搜索页。搜索词由模型名现算，所以新模型上线当天这个按钮就是通的，
 * 不需要维护「模型 → 视频」的对应表，也不需要抓取、存储任何站外内容。
 */
function bilibiliSearch(modelName: string): string {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${modelName} 测评`)}`;
}

function PlayIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="2" width="10" height="8" fill="currentColor" opacity="0.25" />
      <rect x="4" y="4" width="1" height="4" fill="currentColor" />
      <rect x="5" y="5" width="1" height="2" fill="currentColor" />
      <rect x="6" y="5" width="1" height="2" fill="currentColor" />
      <rect x="7" y="6" width="1" height="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="1" width="8" height="10" fill="currentColor" opacity="0.25" />
      <rect x="4" y="3" width="4" height="1" fill="currentColor" />
      <rect x="4" y="5" width="4" height="1" fill="currentColor" />
      <rect x="4" y="7" width="3" height="1" fill="currentColor" />
    </svg>
  );
}

/**
 * 两个站外深链接，跟在一句话定位后面。
 *
 * 不给它单开一节：那一节里除了按钮什么都没有，标题与免责声明加起来比按钮还长，
 * 等于用一整块版面说「这里没内容」。本站只出门、不搬运正文，读者点出去看的是原始出处。
 *
 * 「查看评测文章」按 slug 查 `data/guide-articles.json`（`npm run guide` 从模型动态
 * 指南仓库拉回来）：有专文的直达那一篇，没有的落合集页，连数据都没拉过时**整个不出
 * 这个按钮**。原先它对所有模型都跳同一个固定地址。
 *
 * 只查表、不按模型名猜文章：文件名是给人看的（「Claude Fable 5 编程能力实测 - 对比
 * Opus 4.8 和 GPT-5.5」），按名匹配实测出两类错链——`GPT-5` 前缀溢出命中 GPT-5.6 那篇、
 * `Claude Fable 5` 同时命中 5 与 5.1。给一个模型挂一篇讲别的模型的文章，在这个
 * 「每个数字都要有出处」的站上比不挂更糟。所以认领关系写在指南仓库里由作者逐条核对
 * （21 条，人工可核），这里只查不猜。
 */
export function ReviewLinks({
  modelName,
  slug,
  lang,
  compareBase,
}: {
  modelName: string;
  slug: string;
  lang: Lang;
  compareBase?: string;
}) {
  const dict = getDict(lang);
  // 服务端渲染，直接读构建期落盘的映射，不必从两个 page 一路传 props 下来
  const article = guideLinkFor(loadGuideLibrary(), slug);
  const cls =
    'pixel-button flex items-center gap-1.5 px-2 py-0.5 text-[12px] leading-tight text-[var(--color-ink)] hover:bg-[var(--color-gold)]';
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {/* 站内的动作排在两个出站链接前面 */}
      <CompareButton slug={slug} className={cls} compareBase={compareBase} />
      <a
        href={bilibiliSearch(modelName)}
        target="_blank"
        rel="noopener noreferrer"
        title={dict.reviews.videoHint(modelName)}
        className={cls}
      >
        <PlayIcon />
        {dict.reviews.video}
      </a>
      {article && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          title={dict.reviews.articleHint(article.title, !!article.article)}
          className={cls}
        >
          <DocIcon />
          {dict.reviews.article}
        </a>
      )}
    </div>
  );
}
