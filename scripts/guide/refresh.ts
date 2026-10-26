/**
 * 从「模型动态」指南仓库拉一份 模型 -> 文章 的映射，写进 `data/guide-articles.json`。
 *
 *   npm run guide
 *
 * **手动跑，不在 `npm run sync` 里，也不在构建期。** 和 `npm run bilibili` 同一套理由：
 * 构建不能依赖别人的可用性，产物提交进仓库、构建期完全离线。变化频率也完全不同——
 * 模型数据一天两次，文章一周多几篇。
 *
 * 读的是**仓库里的源文件**（`guide-model-map.json`，由指南仓库构建期生成并提交），
 * 不是线上站点：抓 HTML 要处理 DOM、还会被对方的改版打断，而映射本来就是结构化产物。
 * 也不自己按模型名去猜文章标题——那是这条链路上最容易链错的一环，理由见
 * `src/lib/guide.ts`。
 *
 * 默认从 `raw.githubusercontent.com` 取 main 分支，也支持本地路径（同机开发时直接
 * 读工作副本，改完即测）：
 *
 *   npm run guide -- ../ai-guide-fork
 */

import fs from 'node:fs';
import path from 'node:path';

type Source = { kind: 'url'; value: string } | { kind: 'file'; value: string };

const DEFAULT_URL =
  'https://raw.githubusercontent.com/1009476063/ai-guide-model-dynamics/main/guide-model-map.json';
const OUT = path.join(process.cwd(), 'data', 'guide-articles.json');

function source(): Source {
  const arg = process.argv[2];
  if (!arg) return { kind: 'url', value: DEFAULT_URL };
  if (/^https?:\/\//.test(arg)) return { kind: 'url', value: arg };
  const file = path.resolve(arg, fs.statSync(path.resolve(arg)).isDirectory() ? 'guide-model-map.json' : arg);
  return { kind: 'file', value: file };
}

interface RawArticle {
  url: string;
  title: string;
  file?: string;
}
interface RawMap {
  generatedFrom?: string;
  baseUrl?: string;
  collection?: { url?: string; title?: string };
  models?: Record<string, RawArticle>;
}

function absolute(value: string | undefined, base: string): string | null {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  // the guide's own build writes relative paths when GUIDE_BASE_URL is unset;
  // a relative href here would point at *this* site and 404, so reject it loudly
  if (!base) return null;
  return new URL(value.replace(/^\//, ''), base.endsWith('/') ? base : base + '/').href;
}

async function load(): Promise<RawMap> {
  const src = source();
  const text =
    src.kind === 'file'
      ? fs.readFileSync(src.value, 'utf8')
      : await (await fetch(src.value, { headers: { 'user-agent': 'ai-model-world/guide-refresh' } })).text();
  try {
    return JSON.parse(text) as RawMap;
  } catch {
    throw new Error(`响应不是 JSON（${src.kind}=${src.value}），可能被限流或文件不存在`);
  }
}

async function main() {
  const raw = await load();
  const baseUrl = (raw.baseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('映射里没有 baseUrl，无法把相对路径补成绝对地址');

  const collectionUrl = absolute(raw.collection?.url, baseUrl);
  if (!collectionUrl) throw new Error('映射缺少可用的合集页地址');

  const models: Record<string, RawArticle> = {};
  const skipped: string[] = [];
  for (const [slug, a] of Object.entries(raw.models || {})) {
    const url = absolute(a.url, baseUrl);
    if (!url || !a.title) {
      skipped.push(slug);
      continue;
    }
    models[slug] = { url, title: a.title, ...(a.file ? { file: a.file } : {}) };
  }
  if (Object.keys(models).length === 0) throw new Error('映射里没有任何可用条目，拒绝写空文件');

  const out = {
    refreshedAt: new Date().toISOString(),
    generatedFrom: raw.generatedFrom ?? '模型动态指南',
    baseUrl,
    collection: { url: collectionUrl, title: raw.collection?.title || '模型动态 · 全部实测文章' },
    models,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

  /*
   * 和本站快照对一遍：表里的 slug 若在本库不存在，按钮永远不会命中，等于白写一条。
   * 只报不拦——指南可以先收录还没进快照的新模型，那种链接指向的文章是真的。
   */
  const snapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'models.json'), 'utf8')) as {
    models: { slug: string }[];
  };
  const known = new Set(snapshot.models.map((m) => m.slug));
  const unknown = Object.keys(models).filter((s) => !known.has(s));

  console.log(`[guide] ${Object.keys(models).length} 条映射 -> data/guide-articles.json（合集 ${collectionUrl}）`);
  if (skipped.length) console.log(`[guide] 跳过缺 url/title 的条目：${skipped.join(', ')}`);
  if (unknown.length) console.log(`[guide] 注意：这些 slug 不在本站快照里，按钮暂不会命中：${unknown.join(', ')}`);
}

main().catch((err) => {
  console.error(`[guide] ERROR ${String((err && err.message) || err)}`);
  process.exit(1);
});
