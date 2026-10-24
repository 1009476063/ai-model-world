import type { CSSProperties } from 'react';
import type { UniverseModel } from '@/lib/universe';

/**
 * A deterministic CSS-only celestial body. Keeping this as a DOM element makes
 * the same object usable inside cards, detail panels and the mobile list without
 * shipping a raster texture or a second rendering runtime.
 */
export function UniverseOrb({
  model,
  accent,
  size = 72,
  selected = false,
}: {
  model: UniverseModel;
  accent: string;
  size?: number;
  selected?: boolean;
}) {
  const ring = model.ring !== 'none';
  const doubleRing = model.ring === 'double';
  const dim = model.retired ? 0.5 : 1;
  const style: CSSProperties = {
    width: size,
    height: size,
    ['--orb-accent' as string]: accent,
    ['--orb-size' as string]: `${size}px`,
    opacity: dim,
    filter: selected ? `drop-shadow(0 0 ${size * 0.18}px ${accent})` : undefined,
  };

  return (
    <span
      className={`universe-orb universe-orb-${model.body} ${ring ? 'has-ring' : ''} ${doubleRing ? 'has-double-ring' : ''} ${model.retired ? 'is-retired' : ''}`}
      style={style}
      aria-hidden
    >
      <span className="universe-orb-glow" />
      <span className="universe-orb-sphere">
        <span className="universe-orb-surface" />
        <span className="universe-orb-shade" />
      </span>
      {ring && <span className="universe-orb-ring" />}
      {doubleRing && <span className="universe-orb-ring universe-orb-ring-inner" />}
      {model.influence >= 4 && <span className="universe-orb-ember" />}
    </span>
  );
}
