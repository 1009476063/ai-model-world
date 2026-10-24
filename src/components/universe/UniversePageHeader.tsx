import Link from 'next/link';
import { UNIVERSE_ROUTES } from '@/lib/routes';
import { UniverseNav } from './UniverseNav';

export function UniversePageHeader({
  eyebrow,
  title,
  description,
  active,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  active?: string;
  aside?: React.ReactNode;
}) {
  return (
    <>
      <UniverseNav active={active ?? 'credits'} />
      <header className="universe-page-header">
        <div>
          <p className="universe-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="universe-page-description">{description}</p>
        </div>
        {aside && <div className="universe-page-aside">{aside}</div>}
      </header>
    </>
  );
}

export function UniverseBreadcrumb({
  href = UNIVERSE_ROUTES.home,
  children = '返回模型星图',
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="universe-detail-back">
      <Link href={href}>← {children}</Link>
    </div>
  );
}
