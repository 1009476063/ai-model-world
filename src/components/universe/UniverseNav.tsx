import Link from 'next/link';
import { UNIVERSE_VENDOR_IDS } from '@/lib/universe';

export function UniverseNav({ active }: { active?: string }) {
  return (
    <header className="universe-nav-shell">
      <div className="universe-nav">
        <Link href="/universe/" className="universe-brand">
          <span className="universe-brand-mark" aria-hidden>
            <span />
          </span>
          <span>
            <strong>大模型世界</strong>
            <small>OBSERVATORY</small>
          </span>
        </Link>
        <nav aria-label="宇宙预览导航" className="universe-links">
          <Link href="/universe/" className={!active ? 'is-active' : undefined}>
            星图
          </Link>
          {UNIVERSE_VENDOR_IDS.slice(0, 3).map((id) => (
            <Link
              key={id}
              href={`/universe/vendor/${id}/`}
              className={active === id ? 'is-active' : undefined}
            >
              {id === 'openai' ? 'OpenAI' : id === 'anthropic' ? 'Anthropic' : 'Google'}
            </Link>
          ))}
          <Link href="/">旧版广场</Link>
        </nav>
      </div>
    </header>
  );
}
