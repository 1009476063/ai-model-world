import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UniverseNav } from '@/components/universe/UniverseNav';
import { UniverseOrb } from '@/components/universe/UniverseOrb';
import { buildUniverseData, formatUniverseMetric } from '@/lib/universe';
import { loadSnapshot } from '@/lib/snapshot';
import '../../universe.css';

export function generateStaticParams() {
  const snapshot = loadSnapshot();
  const data = buildUniverseData(snapshot.vendors, snapshot.models);
  return data.models.map((model) => ({ slug: model.slug }));
}

export default async function UniverseModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = loadSnapshot();
  const data = buildUniverseData(snapshot.vendors, snapshot.models);
  const model = data.models.find((item) => item.slug === slug);
  const vendor = model ? data.vendors.find((item) => item.id === model.vendorId) : null;
  if (!model || !vendor) notFound();

  return (
    <main className="universe-page">
      <UniverseNav active={vendor.id} />
      <section className="universe-model-hero">
        <div className="universe-model-visual">
          <span className="universe-model-orbit" aria-hidden />
          <UniverseOrb model={model} accent={vendor.accentColor} size={258} selected />
          <span className="universe-model-coordinate">{vendor.coordinates}</span>
        </div>
        <div className="universe-model-copy">
          <p className="universe-kicker">{vendor.name} · {vendor.starName}</p>
          <h1>{model.name}</h1>
          <p className="universe-model-desc">
            {model.retired ? '这是一颗已退役天体，保留在历史观测档案中。' : '这是一颗活跃天体，记录在最新模型观测快照中。'}
          </p>
          <div className="universe-model-tags">
            <span>{model.kind}</span>
            {model.capabilities.map((capability) => <span key={capability}>{capability}</span>)}
          </div>
          <div className="universe-model-stats">
            <div><small>ECI</small><strong>{formatUniverseMetric(model.eci)}</strong><span>{model.eciPercentile == null ? '暂无分位' : `前 ${100 - model.eciPercentile}%`}</span></div>
            <div><small>输出价格 / 1M tokens</small><strong>{model.price == null ? '—' : `$${model.price.toFixed(2)}`}</strong><span>按当前快照</span></div>
            <div><small>上下文窗口</small><strong>{model.contextWindow == null ? '—' : `${Math.round(model.contextWindow / 1000)}K`}</strong><span>tokens</span></div>
            <div><small>综合影响力</small><strong>{model.influence} / 5</strong><span>视觉档位</span></div>
          </div>
          <Link href={`/universe/vendor/${vendor.id}/`} className="universe-inline-link">
            查看 {vendor.name} 星系 ↗
          </Link>
        </div>
      </section>
      <section className="universe-archive-section">
        <div>
          <p className="universe-kicker">OBSERVATION NOTES</p>
          <h2>天体档案</h2>
        </div>
        <dl>
          <div><dt>天体类型</dt><dd>{model.body}</dd></div>
          <div><dt>环系</dt><dd>{model.ring}</dd></div>
          <div><dt>所属星域</dt><dd>{vendor.continent === 'east' ? '国内' : '国外'}</dd></div>
          <div><dt>状态</dt><dd>{model.retired ? '已退役' : '活跃'}</dd></div>
        </dl>
      </section>
      <footer className="universe-footer">
        <span>{vendor.name} · {vendor.starName}</span>
        <span>单颗星体视觉样张</span>
        <Link href="/universe/">返回星图</Link>
      </footer>
    </main>
  );
}
