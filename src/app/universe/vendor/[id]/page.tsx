import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UniverseNav } from '@/components/universe/UniverseNav';
import { UniverseGalaxyView } from '@/components/universe/UniverseGalaxyView';
import { buildUniverseData } from '@/lib/universe';
import { loadSnapshot } from '@/lib/snapshot';
import '../../universe.css';

export function generateStaticParams() {
  return ['openai', 'anthropic', 'google', 'deepseek', 'alibaba'].map((id) => ({ id }));
}

export default async function UniverseVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snapshot = loadSnapshot();
  const data = buildUniverseData(snapshot.vendors, snapshot.models);
  const vendor = data.vendors.find((item) => item.id === id);
  if (!vendor) notFound();

  return (
    <main className="universe-page">
      <UniverseNav active={id} />
      <section className="universe-detail-hero">
        <div>
          <p className="universe-kicker">{vendor.coordinates} · OBSERVED SYSTEM</p>
          <h1>{vendor.name}</h1>
          <p className="universe-detail-subtitle">{vendor.nameZh} · {vendor.starName}</p>
        </div>
        <div className="universe-detail-meta">
          <span><small>观测模型</small><strong>{vendor.totalModels}</strong></span>
          <span><small>代表天体</small><strong>{vendor.representativeModels.length}</strong></span>
          <span><small>所属星域</small><strong>{vendor.continent === 'east' ? '国内' : '国外'}</strong></span>
        </div>
      </section>
      <div className="universe-detail-back">
        <Link href="/universe/">← 返回模型星图</Link>
        <span>拖动旋转 · 缩放观察 · 点击星体</span>
      </div>
      <UniverseGalaxyView vendor={vendor} />
      <footer className="universe-footer">
        <span>{vendor.name} · {vendor.starName}</span>
        <span>三维场景按需加载</span>
        <Link href="/universe/">返回星图</Link>
      </footer>
    </main>
  );
}
