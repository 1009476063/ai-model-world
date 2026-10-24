import { UniversePageHeader } from '@/components/universe/UniversePageHeader';
import '../universe.css';

export const metadata = { title: '数据与素材署名' };

export default function UniverseCreditsPage() {
  return (
    <main className="universe-page universe-data-page">
      <UniversePageHeader
        eyebrow="ATTRIBUTION · DATA PROVENANCE"
        title="数据与素材署名"
        description="宇宙版的天体、轨道与星场均由程序生成，不依赖外部图片素材。"
        active="credits"
      />
      <section className="universe-credits">
        <article>
          <h2>模型与价格</h2>
          <p>
            模型元数据、发布日期、上下文和定价来自 models.dev（MIT），缺项由 LiteLLM、
            OpenRouter、Vercel AI Gateway 的公开目录补齐。
          </p>
        </article>
        <article>
          <h2>评测成绩</h2>
          <p>
            综合智力与学术榜单来自 Epoch AI《AI Benchmarking Hub》（CC-BY 4.0）；
            编程成绩来自 LiveBench（Apache-2.0）；竞技场成绩来自 LMArena 官方榜单数据集（CC-BY 4.0）。
            本站只做模型名匹配与分榜重排，分数原样引用。
          </p>
        </article>
        <article>
          <h2>视觉系统</h2>
          <p>
            星系、天体和轨道由 CSS、Canvas 与 Three.js 在浏览器中实时生成。
            字体使用系统无衬线字体；旧版像素字体仅保留在旧版广场。
          </p>
        </article>
        <article>
          <h2>项目与商标</h2>
          <p>
            项目代码与数据来自 liyupi/ai-model-world。厂商名称、商标与品牌色归各自所有者，
            仅用于识别与比较。
          </p>
        </article>
      </section>
    </main>
  );
}
