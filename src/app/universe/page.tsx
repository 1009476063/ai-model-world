import { UniverseHome } from '@/components/universe/UniverseHome';
import './universe.css';

/**
 * `/universe/` 是 `/` 的历史地址，两者渲染同一份 UniverseHome。
 * 署名页脚由 `src/app/universe/layout.tsx` 在这一分支上挂。
 */
export default function UniverseAliasPage() {
  return <UniverseHome />;
}

export const metadata = {
  title: {
    absolute: '模型星图 · 大模型世界',
  },
  description: '用星系与天体浏览 AI 模型格局。亮度对应 ECI 分位，大小对应综合影响力，颜色对应厂商，形状与环系对应能力类型。',
};
