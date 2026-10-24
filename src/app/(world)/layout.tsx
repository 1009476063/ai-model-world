import { SiteFooter } from '@/components/world/SiteFooter';

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
