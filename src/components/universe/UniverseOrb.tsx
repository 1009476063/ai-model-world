import type { CSSProperties } from 'react';
import type { UniverseMapModel, UniverseModel } from '@/lib/universe';

/**
 * A deterministic CSS-only celestial body. Keeping this as a DOM element makes
 * the same object usable inside cards, detail panels and the mobile list without
 * shipping a raster texture or a second rendering runtime.
 *
 * Two things here exist purely because of the chronicle page's mobile freeze, and
 * must not be "improved" back:
 *
 *  1. No `filter` on this element or its subtree. The glow used to be a blurred
 *     div and the selected halo an inline drop-shadow; with 722 orbs on one page
 *     that put 722 live blur layers on the compositor. The glow is now a radial
 *     gradient and selection is the `.is-selected` class (see universe.css).
 *  2. `lite` collapses the body to a single tinted disc for dense, non-hero
 *     listings. A chronicle row only has to answer "which vendor, retired or
 *     not" — rings, surface banding and ember are decoration at that size, and
 *     they were ~5 extra painted layers per row.
 */
export function UniverseOrb({
  model,
  accent,
  size = 72,
  selected = false,
  lite = false,
}: {
  /** Only the visual encoding fields are needed, so the star map can pass its lean payload. */
  model: Pick<UniverseModel, 'body' | 'ring' | 'retired' | 'influence'> | UniverseMapModel;
  accent: string;
  size?: number;
  selected?: boolean;
  /** Dense lists: one disc, no rings or surface layers. */
  lite?: boolean;
}) {
  if (lite) {
    const style: CSSProperties = {
      width: size,
      height: size,
      ['--orb-accent-raw' as string]: accent,
    };
    return (
      <span
        className={`universe-orb universe-orb-lite ${model.retired ? 'is-retired' : ''}`}
        style={style}
        aria-hidden
      />
    );
  }

  const ring = model.ring !== 'none';
  const doubleRing = model.ring === 'double';
  const style: CSSProperties = {
    width: size,
    height: size,
    ['--orb-accent-raw' as string]: accent,
    ['--orb-size' as string]: `${size}px`,
  };

  return (
    <span
      className={
        `universe-orb universe-orb-${model.body} ${ring ? 'has-ring' : ''} ` +
        `${doubleRing ? 'has-double-ring' : ''} ${model.retired ? 'is-retired' : ''} ` +
        `${selected ? 'is-selected' : ''}`
      }
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
