import { SiteFooter } from '@/components/world/SiteFooter';
import { UniverseHome } from '@/components/universe/UniverseHome';
import './universe/universe.css';

/*
 * 根路由就是宇宙版首页，正文与 `/universe/` 共用 UniverseHome。
 *
 * 署名页脚必须由这一层挂上：`src/app/universe/layout.tsx` 只覆盖 `/universe/**`，
 * 覆盖不到 `/`。少了它，首页就没有 Epoch 与 LMArena 的 CC-BY 署名
 * （那是这个站自己划的合规红线），也没有站长那排引流位。
 */
export default function UniverseRootPage() {
  return (
    <>
      <UniverseHome />
      <SiteFooter variant="universe" />
    </>
  );
}

export const metadata = {
  title: {
    absolute: '模型星图 · 大模型世界',
  },
  description: '用星系与天体浏览 AI 模型格局。亮度对应 ECI 分位，大小对应综合影响力，颜色对应厂商，形状与环系对应能力类型。',
};
