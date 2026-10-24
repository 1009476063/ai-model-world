import Link from 'next/link';
import { UNIVERSE_ROUTES } from '@/lib/routes';
import { UniverseSearch } from './UniverseSearch';

const ITEMS = [
  { key: 'map', href: UNIVERSE_ROUTES.home, label: '星图' },
  { key: 'leaderboard', href: UNIVERSE_ROUTES.leaderboard, label: '排行榜' },
  { key: 'models', href: UNIVERSE_ROUTES.allModels, label: '全部模型' },
  { key: 'compare', href: UNIVERSE_ROUTES.compare, label: '对比' },
  { key: 'chronicle', href: UNIVERSE_ROUTES.chronicle, label: '编年史' },
];

export function UniverseNav({ active }: { active?: string }) {
  const current = active === 'vendor' || active === 'model' ? 'map' : active;
  return (
    <header className="universe-nav-shell">
      <div className="universe-nav">
        <Link href={UNIVERSE_ROUTES.home} className="universe-brand">
          <span className="universe-brand-mark" aria-hidden>
            <span />
          </span>
          <span>
            <strong>大模型世界</strong>
            <small>OBSERVATORY</small>
          </span>
        </Link>
        <nav aria-label="宇宙预览导航" className="universe-links">
          {ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={current === item.key || (!current && item.key === 'map') ? 'is-active' : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/">旧版广场</Link>
        </nav>
        <UniverseSearch />
      </div>
    </header>
  );
}
