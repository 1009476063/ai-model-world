import Link from 'next/link';
import { UniverseNav } from '@/components/universe/UniverseNav';
import { UniverseStarMap } from '@/components/universe/UniverseStarMap';
import { buildUniverseData } from '@/lib/universe';
import { loadSnapshot } from '@/lib/snapshot';
import './universe.css';

export default function UniversePage() {
  const snapshot = loadSnapshot();
  const data = buildUniverseData(snapshot.vendors, snapshot.models);
  const date = new Date(snapshot.generatedAt);

  return (
    <main className="universe-page">
      <UniverseNav />
      <section className="universe-hero">
        <div className="universe-hero-copy">
          <p className="universe-kicker">AI MODEL OBSERVATORY · SAMPLE FIELD</p>
          <h1>在星图里，<br />看见模型格局。</h1>
          <p className="universe-hero-desc">
            把厂商看作星系，把模型看作天体。亮度来自 ECI，大小来自综合影响力，环系记录能力类型。
          </p>
          <div className="universe-hero-meta">
            <span>{date.getUTCFullYear()}.{String(date.getUTCMonth() + 1).padStart(2, '0')}.{String(date.getUTCDate()).padStart(2, '0')}</span>
            <span>{data.vendors.length} 个星系</span>
            <span>{data.models.length} 个代表天体</span>
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

      <section className="universe-map-section" aria-labelledby="universe-map-title">
        <div className="universe-section-head">
          <div>
            <p className="universe-kicker">INTERACTIVE STAR MAP</p>
            <h2 id="universe-map-title">模型星图</h2>
          </div>
          <p>缩放星图，选择天体，进入厂商星系。</p>
        </div>
        <UniverseStarMap data={data} />
      </section>

      <section className="universe-vendor-section" aria-labelledby="universe-vendor-title">
        <div className="universe-section-head">
          <div>
            <p className="universe-kicker">OBSERVED SYSTEMS</p>
            <h2 id="universe-vendor-title">厂商星系</h2>
          </div>
          <p>先看五个代表星系，确认视觉语法后再扩展到全部厂商。</p>
        </div>
        <div className="universe-vendor-list">
          {data.vendors.map((vendor, index) => (
            <Link key={vendor.id} href={`/universe/vendor/${vendor.id}/`} className="universe-vendor-row">
              <span className="universe-vendor-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="universe-vendor-swatch" style={{ background: vendor.accentColor }} />
              <span className="universe-vendor-name">
                <strong>{vendor.name}</strong>
                <small>{vendor.nameZh} · {vendor.starName}</small>
              </span>
              <span className="universe-vendor-coords">{vendor.coordinates}</span>
              <span className="universe-vendor-count">{vendor.totalModels} 个模型</span>
              <span className="universe-vendor-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="universe-spec-section">
        <p className="universe-kicker">VISUAL ENCODING</p>
        <h2>一张图，三种读数。</h2>
        <div className="universe-spec-grid">
          <div><span className="spec-number">01</span><strong>大小</strong><p>综合影响力。综合 ECI 与上下文规模，保留不同模型的量级差异。</p></div>
          <div><span className="spec-number">02</span><strong>亮度</strong><p>ECI 分位。越靠前，星体越明亮，避免把没有评测数据的模型误读成强模型。</p></div>
          <div><span className="spec-number">03</span><strong>环系</strong><p>能力类型。视觉、全模态、图像生成和开放权重，通过环系与能力标签区分。</p></div>
        </div>
      </section>

      <footer className="universe-footer">
        <span>大模型世界 · Universe Prototype</span>
        <span>真实快照 · 程序化天体 · 无外部图片依赖</span>
        <Link href="/">返回旧版广场</Link>
      </footer>
    </main>
  );
}
