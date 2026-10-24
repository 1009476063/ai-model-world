import Link from 'next/link';
import { AllModelsTable } from '@/components/leaderboard/AllModelsTable';
import { serializeAllTable } from '@/components/leaderboard/serialize';
import { UniversePageHeader } from '@/components/universe/UniversePageHeader';
import { loadSnapshot } from '@/lib/snapshot';
import { UNIVERSE_ROUTES } from '@/lib/routes';
import '../universe.css';

export const metadata = { title: '全部模型' };

export default function UniverseModelsPage() {
  const snapshot = loadSnapshot();
  const data = serializeAllTable(snapshot);
  const alive = snapshot.models.filter((model) => !model.retiredAt).length;

  return (
    <main className="universe-page universe-data-page">
      <UniversePageHeader
        eyebrow="OBJECT CATALOG · COMPLETE INVENTORY"
        title="全部模型"
        description={`共 ${snapshot.models.length} 个模型，其中 ${alive} 个在役。可按字段排序、组合筛选并进入完整天体档案。`}
        active="models"
        aside={
          <Link href={UNIVERSE_ROUTES.leaderboard} className="universe-action-link">
            查看排行榜 ↗
          </Link>
        }
      />
      <section className="universe-data-shell">
        <AllModelsTable data={data} routes={UNIVERSE_ROUTES} universe />
        <p className="universe-data-note">
          「—」表示没有公开数据，不是零。综合智力、编程、上下文与价格来自不同的测量口径，
          只在各自列内比较。
        </p>
      </section>
    </main>
  );
}
