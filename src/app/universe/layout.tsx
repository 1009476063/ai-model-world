import type { Metadata } from 'next';
import { SiteFooter } from '@/components/world/SiteFooter';

export const metadata: Metadata = {
  title: {
    absolute: '模型星图 · 大模型世界',
    template: '%s · 模型星图',
  },
  description: '用星系与天体浏览 AI 模型格局。亮度对应 ECI 分位，大小对应综合影响力，颜色对应厂商，形状与环系对应能力类型。',
};

export default function UniverseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter variant="universe" />
    </>
  );
}
