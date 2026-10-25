import Link from 'next/link';
import { UniverseNav } from '@/components/universe/UniverseNav';
import { UniverseOverview } from '@/components/universe/UniverseOverview';
import { UniverseDistricts } from '@/components/universe/UniverseDistricts';
import { UniverseStarMap } from '@/components/universe/UniverseStarMap';
import {
  buildUniverseChampions,
  buildUniverseData,
  buildUniverseKindGroups,
  buildUniverseDistricts,
  buildUniverseMapData,
} from '@/lib/universe';
import { loadSnapshot } from '@/lib/snapshot';
import { vendorHref, UNIVERSE_ROUTES } from '@/lib/routes';

/**
 * 宇宙版首页正文。`/` 与 `/universe/` 共用这一份实现。
 *
 * 之前两个路由各抄了一遍（约 114 行逐字重复），后果是改一个就会漏另一个：
 * 根路由切成宇宙版时，署名页脚只留在 `/universe/` 的 layout 里，
 * `/` 上 Epoch 与 LMArena 的 CC-BY 署名、以及站长那排引流位一起消失了。
 * 抽成一份之后，「两个本该等价的页面悄悄不等价」没有立足之地。
 *
 * 页脚不在这里渲染：`/universe/` 由 `src/app/universe/layout.tsx` 负责，
 * `/` 由 `src/app/page.tsx` 负责。两条路径各挂一次，不会重复。
 */
export function UniverseHome() {
  const snapshot = loadSnapshot();
  const data = buildUniverseData(snapshot);
  const champions = buildUniverseChampions(snapshot, data);
  const kinds = buildUniverseKindGroups(data);
  const districts = buildUniverseDistricts(snapshot, data);
  // 星图是唯一进客户端的组件，喂给它一份精简载荷，而不是整份 UniverseData
  const mapData = buildUniverseMapData(data);
  const date = new Date(snapshot.generatedAt);

  return (
    <main className="universe-page">
      <UniverseNav />
      <section className="universe-hero">
        <div className="universe-hero-copy">
          <p className="universe-kicker">AI MODEL OBSERVATORY · COMPLETE FIELD</p>
          <h1>在星图里，<br />看见模型格局。</h1>
          <p className="universe-hero-desc">
            把厂商看作星系，把模型看作天体。亮度来自 ECI，大小来自综合影响力，颜色来自厂商，环系记录能力类型。
          </p>
          <div className="universe-hero-meta">
            <span>{date.getUTCFullYear()}.{String(date.getUTCMonth() + 1).padStart(2, '0')}.{String(date.getUTCDate()).padStart(2, '0')}</span>
            <span>{data.vendors.length} 个星系</span>
            <span>{data.models.length} 个天体档案</span>
          </div>
        </div>
        <div className="universe-hero-orbit" aria-hidden>
          <span className="orbit-line orbit-line-one" />
          <span className="orbit-line orbit-line-two" />
          <span className="orbit-core" />
          <span className="orbit-label orbit-label-one">W / 01</span>
          <span className="orbit-label orbit-label-two">E / 02</span>
        </div>
      </section>

      <UniverseOverview champions={champions} kinds={kinds} />

      <UniverseDistricts districts={districts} />

      <section className="universe-map-section" aria-labelledby="universe-map-title">
        <div className="universe-section-head">
          <div>
            <p className="universe-kicker">INTERACTIVE STAR MAP</p>
            <h2 id="universe-map-title">模型星图</h2>
          </div>
          <p>缩放星图，选择天体，进入厂商星系。</p>
        </div>
        <UniverseStarMap data={mapData} />
      </section>

      <section className="universe-vendor-section" aria-labelledby="universe-vendor-title">
        <div className="universe-section-head">
          <div>
            <p className="universe-kicker">OBSERVED SYSTEMS</p>
            <h2 id="universe-vendor-title">厂商星系</h2>
          </div>
          <p>五家主星系保持固定坐标，其余厂商组成外围观测带。</p>
        </div>
        <div className="universe-vendor-list">
          {data.vendors.map((vendor, index) => (
            <Link key={vendor.id} href={vendorHref(UNIVERSE_ROUTES, vendor.id)} className="universe-vendor-row">
              <span className="universe-vendor-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="universe-vendor-swatch" style={{ background: vendor.accentColor }} />
              <span className="universe-vendor-name">
                <strong>{vendor.name}</strong>
                <small>{vendor.nameZh} · {vendor.starName}</small>
              </span>
              <span className="universe-vendor-coords">{vendor.coordinates}</span>
              <span className="universe-vendor-count">{vendor.aliveModels} 在役 / {vendor.totalModels} 模型</span>
              <span className="universe-vendor-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="universe-spec-section">
        <p className="universe-kicker">VISUAL ENCODING</p>
        <h2>四种读数，同一张图。</h2>
        <div className="universe-spec-grid">
          <div><span className="spec-number">01</span><strong>大小</strong><p>综合影响力。综合 ECI 与上下文规模，保留不同模型的量级差异。</p></div>
          <div><span className="spec-number">02</span><strong>亮度</strong><p>ECI 分位。越靠前越明亮；没有第三方评测的模型发暗，不会被误读成强模型。</p></div>
          <div><span className="spec-number">03</span><strong>颜色</strong><p>厂商。每家厂商一颗品牌色，同一片星域里谁是谁一目了然。</p></div>
          <div><span className="spec-number">04</span><strong>形状与环系</strong><p>能力类型。文本、视觉、全模态、图像与视频生成、语音各有一种天体形制。</p></div>
        </div>
      </section>

      <footer className="universe-footer">
        <span>大模型世界 · Universe</span>
        <span>真实快照 · 全部厂商 · 程序化天体</span>
        <Link href={UNIVERSE_ROUTES.credits}>数据与素材署名</Link>
        <Link href="/legacy/">返回旧版广场</Link>
      </footer>
    </main>
  );
}
