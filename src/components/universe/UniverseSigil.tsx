import { readableOnDark } from '@/lib/color';

/**
 * 宇宙版的厂商徽记。
 *
 * 旧版用 12×12 的像素家徽（`VendorCrest`）认厂商，母题来自 `vendor.motif`。
 * 宇宙版的约定是把厂商母题整体换成星系语言：颜色 = 厂商，环系 = 能力形制，
 * 所以这里不查表、不画像素格，只由厂商品牌色加一个稳定哈希生成一枚微型星系。
 *
 * 确定性是硬要求：同一厂商在任何页面、任何构建里长得完全一样，
 * 新厂商进来自动获得一枚，不需要人工补录，也不会缺图。
 */

interface UniverseSigilProps {
  /** 厂商 id。只用来取稳定哈希，不参与显示 */
  seed: string;
  /** 厂商品牌色，过暗的会自动提亮 */
  accent: string;
  size?: number;
  className?: string;
  title?: string;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function UniverseSigil({ seed, accent, size = 14, className = '', title }: UniverseSigilProps) {
  const h = hash(seed);
  const base = readableOnDark(accent, 0.2);
  const core = readableOnDark(accent, 0.55);
  const ringAngle = (h % 180) - 90;
  const ringCount = 1 + (h >> 3) % 2;
  const dotCount = 1 + h % 3;
  const dots = Array.from({ length: dotCount }, (_, i) => {
    const a = ((h >> (4 + i * 3)) % 360) * (Math.PI / 180);
    return { x: 6 + Math.cos(a) * 4.6, y: 6 + Math.sin(a) * 1.7 };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <circle cx="6" cy="6" r="2.7" fill={base} />
      <circle cx="5.1" cy="5.1" r="0.9" fill={core} opacity="0.85" />
      {Array.from({ length: ringCount }, (_, i) => (
        <ellipse
          key={i}
          cx="6"
          cy="6"
          rx={4.6 - i * 0.9}
          ry={1.7 - i * 0.4}
          fill="none"
          stroke={base}
          strokeWidth="0.5"
          opacity={0.62 - i * 0.16}
          transform={`rotate(${ringAngle} 6 6)`}
        />
      ))}
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r="0.6" fill={core} opacity="0.9" transform={`rotate(${ringAngle} 6 6)`} />
      ))}
    </svg>
  );
}
