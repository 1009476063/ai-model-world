import Link from 'next/link';
import { UniversePageHeader } from '@/components/universe/UniversePageHeader';
import { UniverseOrb } from '@/components/universe/UniverseOrb';
import { buildUniverseData } from '@/lib/universe';
import { loadSnapshot } from '@/lib/snapshot';
import { kindOf } from '@/lib/kind';
import { modelHref, UNIVERSE_ROUTES } from '@/lib/routes';
import '../universe.css';

export const metadata = { title: '发布编年史' };

export default function UniverseChroniclePage() {
  const snapshot = loadSnapshot();
  const data = buildUniverseData(snapshot);
  const vendors = new Map(data.vendors.map((vendor) => [vendor.id, vendor]));
  const byMonth = new Map<string, typeof snapshot.models>();
  for (const model of snapshot.models) {
    const key = model.releaseDate?.slice(0, 7) ?? 'unknown';
    const list = byMonth.get(key) ?? [];
    list.push(model);
    byMonth.set(key, list);
  }
  const months = [...byMonth.entries()]
    .map(([key, models]) => ({
      key,
      models: models.sort(
        (a, b) =>
          (b.benchmarks.eci ?? -1) - (a.benchmarks.eci ?? -1) ||
          a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) =>
      a.key === 'unknown' ? 1 : b.key === 'unknown' ? -1 : b.key.localeCompare(a.key),
    );
  const busiest = Math.max(...months.map((month) => month.models.length), 1);

  return (
    <main className="universe-page universe-data-page">
      <UniversePageHeader
        eyebrow="TEMPORAL ARCHIVE · RELEASE CHRONICLE"
        title="发布编年史"
        description={`${snapshot.models.length} 个模型按发布月份排列，最新在上。月份节点越大，当月发布越密集。`}
        active="chronicle"
      />
      <section className="universe-data-shell">
        <ol className="universe-chronicle">
          {months.map((month) => {
            const weight = month.models.length / busiest;
            return (
              <li key={month.key} className="universe-chronicle-month">
                <span
                  className="universe-chronicle-node"
                  style={{
                    width: 9 + Math.round(weight * 11),
                    height: 9 + Math.round(weight * 11),
                  }}
                  aria-hidden
                />
                <header>
                  <h2>{month.key === 'unknown' ? '发布日期不详' : month.key.replace('-', '.')}</h2>
                  <span>{month.models.length} 个发布</span>
                </header>
                <div className="universe-chronicle-grid">
                  {month.models.map((model) => {
                    const vendor = vendors.get(model.vendorId);
                    const universeModel = vendor?.models.find((item) => item.slug === model.slug);
                    if (!vendor || !universeModel) return null;
                    return (
                      <Link
                        key={model.id}
                        href={modelHref(UNIVERSE_ROUTES, model.slug)}
                        className="universe-chronicle-item"
                        style={{ ['--item-accent' as string]: vendor.accentColor }}
                        title={`${vendor.name} · ${kindOf(model) ?? '未知类型'}`}
                      >
                        {/*
                          lite by design. This page renders every model in the
                          snapshot (722 at the time of writing) in one unbroken
                          list — the full-size orb put 722 blur/ring/ember layer
                          stacks on the compositor and froze mobile browsers.
                          A chronicle row only needs "which vendor, retired or
                          not", which the tinted disc answers at 28px.
                        */}
                        <UniverseOrb
                          model={universeModel}
                          accent={vendor.accentColor}
                          size={28}
                          lite
                        />
                        <span>
                          <strong>{model.name}</strong>
                          <small>{vendor.name}</small>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
