import Link from 'next/link';
import { LeaderboardExplorer } from '@/components/leaderboard/LeaderboardExplorer';
import { serializeExplorer } from '@/components/leaderboard/serialize';
import { UniversePageHeader } from '@/components/universe/UniversePageHeader';
import { loadSnapshot } from '@/lib/snapshot';
import { buildTrackIndex } from '@/lib/scores';
import { UNIVERSE_ROUTES } from '@/lib/routes';
import '../universe.css';

export const metadata = { title: '排行榜' };

export default function UniverseLeaderboardPage() {
  const snapshot = loadSnapshot();
  const tracks = buildTrackIndex(snapshot);
  const data = serializeExplorer(snapshot, tracks);
  const benchmarkTracks = tracks.filter((track) => track.category !== '实用指标' && !track.superseded).length;

  return (
    <main className="universe-page universe-data-page">
      <UniversePageHeader
        eyebrow="OBSERVATION LEDGER · ALL TRACKS"
        title="排行榜"
        description={`${benchmarkTracks} 个公开榜单，${snapshot.models.length} 个模型。按榜单分池比较，跨榜不混算。`}
        active="leaderboard"
        aside={
          <Link href={UNIVERSE_ROUTES.allModels} className="universe-action-link">
            查看全部模型 ↗
          </Link>
        }
      />
      <section className="universe-data-shell">
        <LeaderboardExplorer data={data} routes={UNIVERSE_ROUTES} universe />
        <p className="universe-data-note">
          分数来自 Epoch AI、LiveBench 与 LMArena 官方数据集；厂商自报成绩单独标注。
          没有公开成绩的模型显示为未参赛，不使用估算值填补。
        </p>
      </section>
    </main>
  );
}
