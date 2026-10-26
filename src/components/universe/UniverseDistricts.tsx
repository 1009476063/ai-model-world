import Link from 'next/link';
import { AbilityBars } from '@/components/character/AbilityBars';
import { TraitTags } from '@/components/character/TraitTags';
import { DEFAULT_LANG, getDict } from '@/lib/i18n';
import { kindLabelOf } from '@/lib/universe';
import { modelHref, UNIVERSE_ROUTES } from '@/lib/routes';
import type { PlazaTier } from '@/lib/roster';
import type { Continent } from '@/lib/types';
import type { UniverseDistrict, UniverseDistrictCard } from '@/lib/universe';
import { UniverseOrb } from './UniverseOrb';

/**
 * 国外 / 国内两栏，各自按厂商实力分三条街。
 *
 * 选拔完全复用旧版广场的 `buildPlazaRoster`（见 `buildUniverseDistricts`），
 * 这里只换渲染语言：屋子换成天体，路牌换成街区分隔，能力条与特征标签沿用
 * 旧版同一套组件——它们是这个站的主要信息通道，重新画一遍只会画歪。
 */

const CONTINENT_LABEL: Record<Continent, string> = { west: '国外', east: '国内' };

/** 街区名与判据说明直接取旧版字典，两版永远不会写出两套措辞 */
const dict = getDict(DEFAULT_LANG);
const TIER_HINT: Record<PlazaTier, string> = dict.plaza.tierHint;
const TIER_LABEL: Record<PlazaTier, string> = dict.plaza.tier;

function monthLabel(card: UniverseDistrictCard): string {
  const model = card.source;
  if (!model.releaseDate) return '日期不详';
  const [y, m] = model.releaseDate.split('-');
  if (!m) return y;
  if (model.releaseDatePrecision === 'year') return y;
  return `${y}.${m}`;
}

function priceLabel(card: UniverseDistrictCard): string {
  const price = card.source.pricing.outputPerMTok;
  if (price == null) return '价格未知';
  if (price === 0) return '$0';
  return `$${price < 10 ? price.toFixed(price < 0.1 ? 3 : 2) : price.toFixed(0)}`;
}

function ObjectCard({ card }: { card: UniverseDistrictCard }) {
  const dict = getDict(DEFAULT_LANG);
  const detailHref = modelHref(UNIVERSE_ROUTES, card.model.slug);
  const title =
    `${card.model.name} · ${monthLabel(card)} · ${kindLabelOf(card.model.kind)}` +
    (card.strengthRank != null ? ` · 厂商实力第 ${card.strengthRank} 名` : '');

  return (
    <article
      className="universe-district-card"
      style={{ ['--card-accent' as string]: card.vendorAccent }}
    >
      <Link
        href={detailHref}
        className="universe-district-head"
        title={title}
      >
        <span className="universe-district-date">{monthLabel(card)}</span>
        <UniverseOrb model={card.model} accent={card.vendorAccent} size={64} />
        <span className="universe-district-name">
          <strong>{card.model.name}</strong>
          <small>
            {card.vendorNameZh} · {kindLabelOf(card.model.kind)}
          </small>
        </span>
      </Link>
      <div className="universe-district-traits">
        <TraitTags traits={card.traits} />
      </div>
      <AbilityBars row={card.aptitude} compact />
      <p className="universe-district-persona">{card.persona}</p>
      <footer className="universe-district-foot">
        <span className="universe-district-price">{priceLabel(card)}</span>
        {card.model.eci != null && (
          <span className="universe-district-rank">世界#{card.model.eciRank ?? '—'}</span>
        )}
        <Link href={detailHref} className="universe-district-more">
          档案 ↗
        </Link>
      </footer>
      {card.newer && (
        <Link
          href={modelHref(UNIVERSE_ROUTES, card.newer.slug)}
          className="universe-district-newer"
          title={dict.plaza.newerHint(card.newer.name, card.newer.releaseDate ?? '未知日期')}
        >
          ▲ {dict.plaza.newer(card.newer.name)}
        </Link>
      )}
    </article>
  );
}

function Street({ tier, cards }: { tier: PlazaTier; cards: UniverseDistrictCard[] }) {
  return (
    <section className="universe-street">
      <header className="universe-street-head" title={TIER_HINT[tier]}>
        <h4 className={tier === 'top' ? 'is-top' : undefined}>
          {TIER_LABEL[tier]}
        </h4>
        <span>{cards.length} 家 · {TIER_HINT[tier]}</span>
      </header>
      <div className="universe-street-grid">
        {cards.map((card) => <ObjectCard key={card.model.slug} card={card} />)}
      </div>
    </section>
  );
}

function District({ district }: { district: UniverseDistrict }) {
  return (
    <section
      id={`universe-region-${district.continent}`}
      className={`universe-district is-${district.continent}`}
      aria-labelledby={`universe-district-title-${district.continent}`}
    >
      <header className="universe-district-header">
        <h3 id={`universe-district-title-${district.continent}`}>
          {CONTINENT_LABEL[district.continent]}
        </h3>
        <span>{district.vendorCount} 家厂商</span>
      </header>
      {district.streets.map((street) => (
        <Street key={street.tier} tier={street.tier} cards={street.cards} />
      ))}
      {district.others.length > 0 && (
        <details className="universe-district-more-vendors">
          <summary>▸ 还有 {district.others.length} 家资料不全的厂商</summary>
          <div className="universe-street-grid">
            {district.others.map((card) => <ObjectCard key={card.model.slug} card={card} />)}
          </div>
        </details>
      )}
    </section>
  );
}

/** 与旧版 PageJump 同样的动机：读者要的是「带我到国内那一段」，不是筛选器 */
function DistrictJump({ districts }: { districts: UniverseDistrict[] }) {
  if (districts.length < 2) return null;
  return (
    <nav className="universe-district-jump" aria-label="跳到星域">
      {districts.map((district) => (
        <a key={district.continent} href={`#universe-region-${district.continent}`}>
          <span aria-hidden />
          {CONTINENT_LABEL[district.continent]}
          <em>{district.vendorCount}</em>
        </a>
      ))}
    </nav>
  );
}

export function UniverseDistricts({ districts }: { districts: UniverseDistrict[] }) {
  if (districts.length === 0) return null;
  return (
    <section className="universe-districts" aria-label="国外与国内厂商阵容">
      <div className="universe-districts-intro">
        <div>
          <p className="universe-kicker">FIELD SECTIONS · OVERSEAS AND DOMESTIC</p>
          <h2>两个星域</h2>
        </div>
        <p>
          每家厂商推一位当家天体，按厂商实力分成头部、主力与尚无评测三档。
        </p>
      </div>
      <DistrictJump districts={districts} />
      {districts.map((district) => <District key={district.continent} district={district} />)}
    </section>
  );
}
