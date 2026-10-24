'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { UniverseModel, UniverseVendor } from '@/lib/universe';
import { modelHref, UNIVERSE_ROUTES } from '@/lib/routes';
import { UniverseOrb } from './UniverseOrb';

const KIND_LABEL: Record<string, string> = {
  text: '文本',
  vision: '视觉',
  omni: '全模态',
  'image-gen': '图像生成',
  'video-gen': '视频生成',
  speech: '语音',
  unknown: '未知',
};

export function UniverseVendorCatalog({ vendor }: { vendor: UniverseVendor }) {
  const [kind, setKind] = useState('all');
  const [showRetired, setShowRetired] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);

  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of vendor.models) {
      if (!showRetired && model.retired) continue;
      counts.set(model.kind, (counts.get(model.kind) ?? 0) + 1);
    }
    return counts;
  }, [vendor.models, showRetired]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vendor.models.filter((model) => {
      if (!showRetired && model.retired) return false;
      if (kind !== 'all' && model.kind !== kind) return false;
      return !needle || model.name.toLowerCase().includes(needle);
    });
  }, [kind, query, showRetired, vendor.models]);

  const shown = filtered.slice(0, limit);
  const monthGroups = useMemo(() => {
    const groups = new Map<string, UniverseModel[]>();
    for (const model of filtered.slice(0, limit)) {
      const key = model.releaseDate?.slice(0, 7) || 'unknown';
      const list = groups.get(key) ?? [];
      list.push(model);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)))
      .map(([key, models]) => ({
        key,
        models,
        total: models.length,
      }));
  }, [filtered, limit]);

  return (
    <section className="universe-vendor-catalog" aria-labelledby="universe-vendor-catalog-title">
      <div className="universe-section-head">
        <div>
          <p className="universe-kicker">FULL FAMILY · OBJECT CATALOG</p>
          <h2 id="universe-vendor-catalog-title">全部天体</h2>
        </div>
        <span>{filtered.length} / {vendor.models.length} 个模型</span>
      </div>
      <div className="universe-catalog-filters">
        <label>
          <span>搜索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(30);
            }}
            placeholder="搜索这家厂商的模型"
          />
        </label>
        <div role="group" aria-label="按能力类型筛选">
          <button type="button" aria-pressed={kind === 'all'} onClick={() => setKind('all')}>
            全部 {vendor.models.filter((model) => showRetired || !model.retired).length}
          </button>
          {[...kindCounts.entries()].map(([id, count]) => (
            <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)}>
              {KIND_LABEL[id] ?? id} {count}
            </button>
          ))}
        </div>
        <label className="universe-checkbox">
          <input
            type="checkbox"
            checked={showRetired}
            onChange={(event) => setShowRetired(event.target.checked)}
          />
          含已退役
        </label>
      </div>

      <div className="universe-vendor-months">
        {monthGroups.map((month) => (
          <section key={month.key} className="universe-vendor-month">
            <header>
              <h3>{month.key === 'unknown' ? '发布日期不详' : month.key.replace('-', '.')}</h3>
              <span>{month.total} 个发布</span>
            </header>
            <div className="universe-vendor-catalog-grid">
              {month.models.map((model) => (
                <Link
                  key={model.slug}
                  href={modelHref(UNIVERSE_ROUTES, model.slug)}
                  className={`universe-vendor-catalog-item ${model.retired ? 'is-retired' : ''}`}
                  style={{ ['--item-accent' as string]: vendor.accentColor }}
                >
                  <UniverseOrb model={model} accent={vendor.accentColor} size={48} />
                  <span>
                    <strong>{model.name}</strong>
                    <small>
                      {KIND_LABEL[model.kind] ?? model.kind}
                      {model.retired ? ' · 已退役' : ''}
                    </small>
                  </span>
                  <em>{model.eci == null ? '未测' : model.eci.toFixed(0)}</em>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      {shown.length === 0 && <p className="universe-empty-state">当前筛选条件下没有模型。</p>}
      {filtered.length > shown.length && (
        <button
          type="button"
          className="universe-show-all"
          onClick={() => setLimit((value) => value + 60)}
        >
          再展开 {Math.min(60, filtered.length - shown.length)} 个
        </button>
      )}
    </section>
  );
}
