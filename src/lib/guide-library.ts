/**
 * 读取 `data/guide-articles.json`（由 `npm run guide` 从指南仓库拉取并提交进仓库）。
 *
 * 类型与查表规则在 `./guide.ts`，这里只管落盘读取，分工与
 * `videos.ts` / `video-library.ts` 一致。
 *
 * **这个文件缺失不算错误**（同 `video-library.ts`）：模型数据缺了页面就没内容，
 * 必须硬失败；评测文章入口只是多给一条去路，有人 clone 完仓库还没跑过
 * `npm run guide` 时，站点照常构建，详情页只是少一个按钮。
 */
import fs from 'node:fs';
import path from 'node:path';

import { EMPTY_GUIDE, type GuideLibrary } from './guide';

let cache: GuideLibrary | null = null;

/** 只在生产构建里缓存；开发时每次重读磁盘，`npm run guide` 后刷新页面即可见 */
export function loadGuideLibrary(): GuideLibrary {
  if (cache && process.env.NODE_ENV === 'production') return cache;
  let out = EMPTY_GUIDE;
  try {
    const file = path.join(process.cwd(), 'data', 'guide-articles.json');
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<GuideLibrary>;
      if (parsed.models && typeof parsed.collection?.url === 'string') {
        out = { ...EMPTY_GUIDE, ...parsed, models: parsed.models };
      }
    }
  } catch {
    out = EMPTY_GUIDE;
  }
  cache = out;
  return out;
}
