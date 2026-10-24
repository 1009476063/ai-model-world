'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { UniverseData, UniverseModel, UniverseStar, UniverseVendor } from '@/lib/universe';
import { modelHref, UNIVERSE_ROUTES, vendorHref } from '@/lib/routes';
import { UniverseOrb } from './UniverseOrb';
import { UniverseStarfield } from './UniverseStarfield';

const VIEW_W = 1000;
const VIEW_H = 560;

function modelPosition(model: UniverseModel, star: UniverseStar) {
  const orbit = model.orbit;
  const rad = (model.angle * Math.PI) / 180;
  return {
    x: star.x * 10 + Math.cos(rad) * orbit * 5,
    y: star.y * 5.6 + Math.sin(rad) * orbit * 2.7,
  };
}

function SearchResult({
  model,
  vendor,
  onSelect,
}: {
  model: UniverseModel;
  vendor: UniverseVendor;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="universe-search-result" onClick={onSelect}>
      <UniverseOrb model={model} accent={vendor.accentColor} size={26} />
      <span>
        <strong>{model.name}</strong>
        <small>
          {vendor.name} · {model.eci == null ? '未测 ECI' : `ECI ${model.eci.toFixed(0)}`}
        </small>
      </span>
    </button>
  );
}

export function UniverseStarMap({ data }: { data: UniverseData }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [kind, setKind] = useState('all');
  const [region, setRegion] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [weights, setWeights] = useState('all');
  const [year, setYear] = useState('all');
  const [showRetired, setShowRetired] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  const vendorById = useMemo(
    () => new Map(data.vendors.map((vendor) => [vendor.id, vendor])),
    [data.vendors],
  );
  const starById = useMemo(
    () => new Map(data.stars.map((star) => [star.vendorId, star])),
    [data.stars],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.models
      .filter((model) => {
        const vendor = vendorById.get(model.vendorId);
        return (
          `${model.name} ${vendor?.name ?? ''} ${vendor?.nameZh ?? ''} ${model.kind} ${model.capabilities.join(' ')}`
            .toLowerCase()
            .includes(q)
        );
      })
      .slice(0, 10);
  }, [data.models, query, vendorById]);
  const selected = selectedId
    ? data.models.find((model) => model.slug === selectedId) ?? null
    : null;
  const selectedVendor = selected ? vendorById.get(selected.vendorId) : null;

  const years = useMemo(() => {
    const values = new Set<string>();
    for (const model of data.models) {
      if (model.releaseDate) values.add(model.releaseDate.slice(0, 4));
    }
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [data.models]);

  const modelFilter = useCallback(
    (model: UniverseModel) => {
      if (!showRetired && model.retired) return false;
      if (kind === 'multimodal' && model.kind === 'text') return false;
      if (kind !== 'all' && kind !== 'multimodal' && model.kind !== kind) return false;
      if (weights === 'open' && model.openWeights !== true) return false;
      if (weights === 'closed' && model.openWeights !== false) return false;
      if (year !== 'all' && model.releaseDate?.slice(0, 4) !== year) return false;
      return true;
    },
    [showRetired, kind, weights, year],
  );

  const visibleVendors = useMemo(
    () =>
      data.vendors.filter((vendor) => {
        if (vendorFilter !== 'all' && vendor.id !== vendorFilter) return false;
        if (region !== 'all' && vendor.continent !== region) return false;
        return vendor.models.some(modelFilter);
      }),
    [data.vendors, region, vendorFilter, modelFilter],
  );

  const choose = (model: UniverseModel) => {
    setSelectedId(model.slug);
    setQuery('');
    setZoom(1.18);
  };

  const reset = () => {
    setQuery('');
    setSelectedId(null);
    setZoom(1);
    setShowAll(false);
    setKind('all');
    setRegion('all');
    setVendorFilter('all');
    setWeights('all');
    setYear('all');
    setShowRetired(false);
  };

  const visibleCount = visibleVendors.reduce(
    (total, vendor) => total + vendor.models.filter(modelFilter).length,
    0,
  );

  return (
    <div className="universe-map-wrap">
      <div className="universe-map-toolbar">
        <div className="universe-search">
          <span aria-hidden className="universe-search-icon">⌕</span>
          <label htmlFor="universe-search" className="sr-only">搜索模型</label>
          <input
            id="universe-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索全部模型、厂商或类型"
            autoComplete="off"
          />
          {query && (
            <button type="button" className="universe-clear" onClick={() => setQuery('')} aria-label="清空搜索">
              ×
            </button>
          )}
          {matches.length > 0 && (
            <div className="universe-search-results">
              {matches.map((model) => {
                const vendor = vendorById.get(model.vendorId)!;
                return (
                  <SearchResult
                    key={model.slug}
                    model={model}
                    vendor={vendor}
                    onSelect={() => choose(model)}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="universe-tools" aria-label="星图工具">
          <button type="button" onClick={() => setZoom((value) => Math.min(1.8, value + 0.12))} aria-label="放大星图">＋</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.8, value - 0.12))} aria-label="缩小星图">−</button>
          <button type="button" onClick={reset} className="universe-reset">重置</button>
        </div>
      </div>

      <div className="universe-map-filters">
        <label>
          <span>地区</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="按地区筛选星系">
            <option value="all">全部</option>
            <option value="east">国内</option>
            <option value="west">国外</option>
          </select>
        </label>
        <label>
          <span>能力</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="按能力筛选天体">
            <option value="all">全部</option>
            <option value="multimodal">多模态</option>
            <option value="text">文本</option>
            <option value="vision">视觉</option>
            <option value="omni">全模态</option>
            <option value="image-gen">图像生成</option>
            <option value="video-gen">视频生成</option>
            <option value="speech">语音</option>
          </select>
        </label>
        <label>
          <span>星系</span>
          <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} aria-label="只看一个厂商星系">
            <option value="all">全部厂商</option>
            {data.vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name} ({vendor.totalModels})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>权重</span>
          <select value={weights} onChange={(event) => setWeights(event.target.value)} aria-label="按开放权重筛选">
            <option value="all">全部</option>
            <option value="open">开放权重</option>
            <option value="closed">闭源</option>
          </select>
        </label>
        <label>
          <span>年份</span>
          <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="按发布年份筛选">
            <option value="all">全部</option>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="universe-map-check">
          <input
            type="checkbox"
            checked={showRetired}
            onChange={(event) => setShowRetired(event.target.checked)}
          />
          含已退役
        </label>
        <span className="universe-map-filter-count">
          {visibleVendors.length} 个星系 · {visibleCount} 个天体
        </span>
      </div>

      <div className="universe-map" ref={viewport}>
        <UniverseStarfield />
        <div className="universe-map-grid" />
        <div className="universe-map-regions" aria-hidden>
          <span className="region-west">WESTERN FIELD</span>
          <span className="region-east">EASTERN FIELD</span>
        </div>
        <svg className="universe-map-lines" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden>
          <path d="M220 157 L420 112 L720 168 L370 403 L700 392 Z" />
          <path d="M220 157 L370 403" className="is-dim" />
          <path d="M420 112 L700 392" className="is-dim" />
          <path d="M720 168 L370 403" className="is-dim" />
        </svg>
        <div className="universe-map-canvas" style={{ transform: `scale(${zoom})` }}>
          {visibleVendors.map((vendor) => {
            const star = starById.get(vendor.id)!;
            const visibleModels = vendor.representativeModels.filter(modelFilter);
            const starModels = showAll || selectedVendor?.id === vendor.id
              ? visibleModels
              : visibleModels.slice(0, star.lead ? 4 : 2);
            return (
              <div
                key={vendor.id}
                className={`universe-system ${star.lead ? 'is-lead' : 'is-secondary'} ${selectedVendor?.id === vendor.id ? 'is-active' : ''}`}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  ['--system-accent' as string]: vendor.accentColor,
                  ['--system-size' as string]: `${Math.min(1.35, 0.7 + vendor.totalModels / 120)}`,
                }}
              >
                <Link href={vendorHref(UNIVERSE_ROUTES, vendor.id)} className="universe-system-core">
                  <span className="universe-system-halo" aria-hidden />
                  <span className="universe-system-planet" aria-hidden />
                  <span className="universe-system-label">
                    <strong>{vendor.name}</strong>
                    <small>{vendor.starName} · {vendor.totalModels}</small>
                  </span>
                </Link>
                {starModels.map((model) => {
                  const position = modelPosition(model, star);
                  return (
                    <button
                      key={model.slug}
                      type="button"
                      className={`universe-model-node ${selected?.slug === model.slug ? 'is-selected' : ''}`}
                      style={{
                        left: `${position.x - star.x * 10}px`,
                        top: `${position.y - star.y * 5.6}px`,
                        ['--node-accent' as string]: vendor.accentColor,
                      }}
                      onClick={() => choose(model)}
                      aria-label={`${model.name}，${vendor.name}`}
                    >
                      <span className="universe-model-dot" />
                      {selected?.slug === model.slug && <span className="universe-node-label">{model.name}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="universe-map-caption">
          <span>{data.vendors.length} 个观测星系</span>
          <span>{data.models.length} 个天体档案</span>
          <span>亮度 = ECI 分位 · 大小 = 影响力</span>
        </div>
      </div>

      <div className="universe-map-foot">
        <div className="universe-map-legend">
          <span><i className="legend-dot" /> 国内</span>
          <span><i className="legend-dot is-west" /> 国外</span>
          <span><i className="legend-ring" /> 能力环系</span>
        </div>
        <div className="universe-map-foot-actions">
          <Link href={UNIVERSE_ROUTES.allModels}>全部 {data.models.length} 个模型 ↗</Link>
          <button type="button" className="universe-show-all" onClick={() => setShowAll((value) => !value)}>
            {showAll ? '收起代表天体' : '展开代表天体'}
          </button>
        </div>
      </div>

      {selected && selectedVendor && (
        <aside className="universe-selection" aria-label={`${selected.name} 天体详情`}>
          <div className="universe-selection-head">
            <span>SELECTED OBJECT</span>
            <button type="button" onClick={() => setSelectedId(null)} aria-label="关闭详情">×</button>
          </div>
          <div className="universe-selection-body">
            <UniverseOrb model={selected} accent={selectedVendor.accentColor} size={106} selected />
            <div>
              <p className="universe-selection-vendor">{selectedVendor.name} · {selectedVendor.coordinates}</p>
              <h3>{selected.name}</h3>
              <p className="universe-selection-desc">
                {selected.retired ? '已退役星体，保留在观测档案中。' : '活跃星体，当前参与模型格局观测。'}
              </p>
              <div className="universe-selection-stats">
                <span><small>ECI</small><strong>{selected.eci == null ? '未测' : selected.eci.toFixed(0)}</strong></span>
                <span><small>分位</small><strong>{selected.eciPercentile == null ? '—' : `${selected.eciPercentile}%`}</strong></span>
                <span><small>输出价</small><strong>{selected.price == null ? '—' : `$${selected.price.toFixed(2)}`}</strong></span>
              </div>
            </div>
          </div>
          <Link href={modelHref(UNIVERSE_ROUTES, selected.slug)} className="universe-selection-link">
            打开完整天体档案 <span>↗</span>
          </Link>
        </aside>
      )}
    </div>
  );
}
