import Link from 'next/link';
import {
  kindLabelOf,
  type UniverseChampion,
  type UniverseKindGroup,
  type UniverseModel,
} from '@/lib/universe';
import { modelHref, UNIVERSE_ROUTES } from '@/lib/routes';
import { UniverseOrb } from './UniverseOrb';

function ChampionCard({ champion }: { champion: UniverseChampion }) {
  return (
    <Link
      href={modelHref(UNIVERSE_ROUTES, champion.model.slug)}
      className="universe-champion-card"
      style={{ ['--card-accent' as string]: champion.vendor.accentColor }}
      title={`${champion.model.name} · ${champion.detail}`}
    >
      <span className="universe-champion-label">{champion.label}</span>
      <UniverseOrb
        model={champion.model}
        accent={champion.vendor.accentColor}
        size={54}
      />
      <strong>{champion.model.name}</strong>
      <small>{champion.vendor.name}</small>
      <em>{champion.figure}</em>
      <span className="universe-champion-detail">{champion.detail}</span>
    </Link>
  );
}

function KindCard({ group }: { group: UniverseKindGroup }) {
  return (
    <Link
      href={`${UNIVERSE_ROUTES.allModels}?kind=${group.kind}`}
      className="universe-kind-card"
    >
      <span className="universe-kind-name">{kindLabelOf(group.kind)}</span>
      <span className="universe-kind-orbs" aria-hidden>
        {group.representatives.map((model: UniverseModel) => (
          <UniverseOrb
            key={model.slug}
            model={model}
            accent="#a9c5db"
            size={32}
          />
        ))}
      </span>
      <strong>{group.count}</strong>
      <small>{group.representatives.map((model) => model.name).join(' · ')}</small>
    </Link>
  );
}

export function UniverseOverview({
  champions,
  kinds,
}: {
  champions: UniverseChampion[];
  kinds: UniverseKindGroup[];
}) {
  return (
    <section className="universe-overview" aria-label="今日格局与能力类型">
      <div className="universe-overview-heading">
        <div>
          <p className="universe-kicker">CURRENT CONSTELLATION</p>
          <h2>今日格局</h2>
        </div>
        <p>八项结论直接取自旧版同一套数据判据；每张卡都能进入完整天体档案。</p>
      </div>
      <div className="universe-champion-grid">
        {champions.map((champion) => (
          <ChampionCard key={champion.key} champion={champion} />
        ))}
      </div>
      <div className="universe-kind-heading">
        <p className="universe-kicker">ABILITY CLASSES</p>
        <h2>按能力类型浏览</h2>
      </div>
      <div className="universe-kind-grid">
        {kinds.map((group) => <KindCard key={group.kind} group={group} />)}
      </div>
    </section>
  );
}
