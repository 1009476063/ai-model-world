import { CompareView } from '@/components/compare/CompareView';
import { UniversePageHeader } from '@/components/universe/UniversePageHeader';
import { asset } from '@/lib/asset';
import { loadSnapshot } from '@/lib/snapshot';
import { UNIVERSE_ROUTES } from '@/lib/routes';
import { buildUniverseData } from '@/lib/universe';
import '../universe.css';

export const metadata = { title: '模型对比' };

export default function UniverseComparePage() {
  const data = buildUniverseData(loadSnapshot());
  const universeModels = Object.fromEntries(
    data.models.map((model) => [model.slug, model]),
  );

  return (
    <main className="universe-page universe-data-page">
      <UniversePageHeader
        eyebrow="DUAL OBSERVATION · HEAD TO HEAD"
        title="模型对比"
        description="把 1–4 个模型放进同一观测场。选择会写入地址栏，刷新或分享都不会丢失。"
        active="compare"
      />
      <section className="universe-data-shell universe-compare-shell">
        <CompareView
          dataUrl={asset('/compare-data.json')}
          spriteBase={asset('/sprites/')}
          universeModels={universeModels}
          routes={UNIVERSE_ROUTES}
          universe
        />
      </section>
    </main>
  );
}
