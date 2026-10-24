'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import type { UniverseModel, UniverseVendor } from '@/lib/universe';
import { modelHref, UNIVERSE_ROUTES } from '@/lib/routes';
import { UniverseOrb } from './UniverseOrb';

const UniverseGalaxyScene = dynamic(() => import('./UniverseGalaxyScene'), {
  ssr: false,
  loading: () => (
    <div className="universe-scene-loading">
      <span className="universe-loading-ring" />
      <p>正在建立三维星系坐标</p>
    </div>
  ),
});

export function UniverseGalaxyView({ vendor }: { vendor: UniverseVendor }) {
  const [selected, setSelected] = useState<UniverseModel | null>(
    vendor.representativeModels[0] ?? null,
  );
  return (
    <>
      <div className="universe-scene">
        <div className="universe-scene-corners" aria-hidden />
        <UniverseGalaxyScene
          models={vendor.representativeModels}
          accent={vendor.accentColor}
          selectedSlug={selected?.slug ?? null}
          onSelect={setSelected}
        />
        <div className="universe-scene-caption">
          <span>3D ORBITAL VIEW</span>
          <span>拖动旋转 · 点击星体查看</span>
        </div>
      </div>

      <section className="universe-catalog" aria-labelledby="universe-catalog-title">
        <div className="universe-section-head">
          <div>
            <p className="universe-kicker">OBJECT CATALOG</p>
            <h2 id="universe-catalog-title">星系天体目录</h2>
          </div>
          <span>{vendor.representativeModels.length} 个代表天体</span>
        </div>
        <div className="universe-catalog-grid">
          {vendor.representativeModels.map((model) => (
            <button
              key={model.slug}
              type="button"
              className={`universe-catalog-item ${selected?.slug === model.slug ? 'is-selected' : ''}`}
              onClick={() => setSelected(model)}
            >
              <UniverseOrb model={model} accent={vendor.accentColor} size={48} />
              <span>
                <strong>{model.name}</strong>
                <small>{model.eci == null ? '未测 ECI' : `ECI ${model.eci.toFixed(0)}`}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="universe-object-strip" aria-label={`${selected.name} 档案`}>
          <div>
            <p className="universe-kicker">SELECTED OBJECT</p>
            <h3>{selected.name}</h3>
            <p>{selected.capabilities.length ? selected.capabilities.join(' · ') : '基础能力档案'}</p>
          </div>
          <dl>
            <div><dt>ECI</dt><dd>{selected.eci == null ? '未测' : selected.eci.toFixed(0)}</dd></div>
            <div><dt>输出价</dt><dd>{selected.price == null ? '—' : `$${selected.price.toFixed(2)}`}</dd></div>
            <div><dt>上下文</dt><dd>{selected.contextWindow == null ? '—' : `${Math.round(selected.contextWindow / 1000)}K`}</dd></div>
          </dl>
          <Link href={modelHref(UNIVERSE_ROUTES, selected.slug)}>打开完整天体档案</Link>
        </section>
      )}
    </>
  );
}
