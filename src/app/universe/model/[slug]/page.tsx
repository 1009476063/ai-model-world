import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AbilityBars } from '@/components/character/AbilityBars';
import { CodingLedger } from '@/components/character/CodingLedger';
import { ReviewLinks } from '@/components/character/ReviewLinks';
import { ScoreLedger } from '@/components/leaderboard/ScoreLedger';
import { VideoList } from '@/components/character/VideoList';
import { UniverseNav } from '@/components/universe/UniverseNav';
import { UniverseOrb } from '@/components/universe/UniverseOrb';
import { buildAptitudeScale } from '@/lib/aptitude';
import { isSingleSource } from '@/lib/derive';
import { buildLineage } from '@/lib/lineage';
import { kindOf } from '@/lib/kind';
import { buildPersonaContext, contextAnchor, personaFor } from '@/lib/persona';
import {
  formatBool,
  formatContext,
  formatCount,
  formatDate,
  formatModalities,
  formatParams,
  formatPrice,
  formatScore,
} from '@/lib/format';
import { DEFAULT_LANG, getDict } from '@/lib/i18n';
import { modelHref, UNIVERSE_ROUTES, vendorHref } from '@/lib/routes';
import { buildUniverseData, formatUniverseMetric } from '@/lib/universe';
import { loadSnapshot } from '@/lib/snapshot';
import { loadVideoLibrary } from '@/lib/video-library';
import { videosFor } from '@/lib/videos';
import '../../universe.css';

export function generateStaticParams() {
  return loadSnapshot().models.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({ params }: PageProps<'/universe/model/[slug]'>) {
  const { slug } = await params;
  const model = loadSnapshot().models.find((item) => item.slug === slug);
  if (!model) return { title: '未知天体' };
  return {
    title: model.name,
    description: `${model.name} 的完整模型档案：能力分位、上下文、价格、评测成绩与来源。`,
  };
}

function Row({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source?: string;
}) {
  return (
    <div className="universe-spec-row">
      <dt>{label}</dt>
      <dd>
        {value}
        {source && <small>{source}</small>}
      </dd>
    </div>
  );
}

export default async function UniverseModelPage({
  params,
}: PageProps<'/universe/model/[slug]'>) {
  const { slug } = await params;
  const lang = DEFAULT_LANG;
  const dict = getDict(lang);
  const snapshot = loadSnapshot();
  const model = snapshot.models.find((item) => item.slug === slug);
  if (!model) notFound();

  const universe = buildUniverseData(snapshot);
  const universeModel = universe.models.find((item) => item.slug === model.slug);
  const vendor = universe.vendors.find((item) => item.id === model.vendorId);
  if (!universeModel || !vendor) notFound();

  const aptitude = buildAptitudeScale(snapshot.models).rowOf(model);
  const lineage = buildLineage(model, snapshot.models);
  const kind = kindOf(model);
  const persona = personaFor(
    model,
    buildPersonaContext(snapshot.models, snapshot.vendors),
  );
  const anchor = contextAnchor(model.contextWindow);
  const videoLibrary = loadVideoLibrary();
  const videos = videosFor(videoLibrary, model.id, model.name);

  return (
    <main className="universe-page universe-data-page">
      <UniverseNav active="models" />
      <section className="universe-model-hero universe-model-archive-hero">
        <div className="universe-model-visual">
          <span className="universe-model-orbit" aria-hidden />
          <UniverseOrb model={universeModel} accent={vendor.accentColor} size={258} selected />
          <span className="universe-model-coordinate">{vendor.coordinates}</span>
        </div>
        <div className="universe-model-copy">
          <p className="universe-kicker">
            {vendor.name} · {vendor.starName} · {model.retiredAt ? 'ARCHIVED OBJECT' : 'ACTIVE OBJECT'}
          </p>
          <h1>{model.name}</h1>
          <p className="universe-model-desc">
            {vendor.nameZh} · {kind ? dict.kind.label[kind] : dict.kind.unknown}模型
            {model.retiredAt ? '，已退役并保留在历史档案中。' : '，记录在最新观测快照中。'}
          </p>
          <p className="universe-model-persona">{persona}</p>
          <div className="universe-model-tags">
            <span>{kind ? dict.kind.label[kind] : dict.kind.unknown}</span>
            {universeModel.capabilities.map((capability) => <span key={capability}>{capability}</span>)}
            {model.openWeights === true && <span>开放权重</span>}
            {model.retiredAt && <span>已退役</span>}
          </div>
          <div className="universe-model-stats">
            <div><small>ECI</small><strong>{formatUniverseMetric(model.benchmarks.eci)}</strong><span>{model.benchmarks.eci == null ? '暂无排名' : `全球第 ${universeModel.eciRank} 名`}</span></div>
            <div><small>输出价格 / 1M tokens</small><strong>{model.pricing.outputPerMTok == null ? '—' : `$${model.pricing.outputPerMTok.toFixed(2)}`}</strong><span>按当前快照</span></div>
            <div><small>上下文窗口</small><strong>{formatContext(model.contextWindow, lang)}</strong><span>标称上限</span></div>
            <div><small>发布</small><strong>{formatDate(model.releaseDate, model.releaseDatePrecision, lang)}</strong><span>精确到原始粒度</span></div>
          </div>
          <ReviewLinks
            modelName={model.name}
            slug={model.slug}
            lang={lang}
            compareBase={UNIVERSE_ROUTES.compare}
          />
          <div className="universe-inline-actions">
            <Link href={vendorHref(UNIVERSE_ROUTES, vendor.id)} className="universe-inline-link">
              查看 {vendor.name} 星系 ↗
            </Link>
            <Link href={`${UNIVERSE_ROUTES.leaderboard}?track=eci`} className="universe-inline-link">
              查看综合智力榜 ↗
            </Link>
          </div>
          {isSingleSource(model) && (
            <p className="universe-model-warning">{dict.unknown.singleSource}</p>
          )}
        </div>
      </section>

      <section className="universe-ability-band" aria-labelledby="universe-ability-title">
        <div>
          <p className="universe-kicker">ABILITY SIGNATURE</p>
          <h2 id="universe-ability-title">能力分位</h2>
          <p>四条能力都按全库分位显示；悬停可查看原始口径与来源。</p>
          {anchor && <p>上下文体感：{anchor}</p>}
        </div>
        <AbilityBars row={aptitude} />
      </section>

      {lineage && (
        <section className="universe-lineage" aria-labelledby="universe-lineage-title">
          <div className="universe-section-head">
            <div>
              <p className="universe-kicker">EVOLUTION TRACK</p>
              <h2 id="universe-lineage-title">{lineage.stem} 系列 · {kind ? dict.kind.label[kind] : '模型'}</h2>
            </div>
            <span>共 {lineage.total} 个同系列模型</span>
          </div>
          <ol>
            {lineage.entries.map((entry, index) => (
              <li key={entry.id}>
                <Link
                  href={modelHref(UNIVERSE_ROUTES, entry.slug)}
                  aria-current={index === lineage.currentIndex ? 'page' : undefined}
                  className={index === lineage.currentIndex ? 'is-current' : undefined}
                >
                  <small>{entry.releaseDate?.slice(0, 7).replace('-', '.') ?? '日期不详'}</small>
                  <strong>{entry.name}</strong>
                  <span>{entry.benchmarks.eci == null ? '未参评' : `ECI ${entry.benchmarks.eci.toFixed(1)}`}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="universe-archive-grid">
        <div className="universe-archive-section universe-archive-list">
          <div>
            <p className="universe-kicker">ORIGIN RECORD</p>
            <h2>身世与规格</h2>
          </div>
          <dl>
            <Row label={dict.attr.releaseDate} value={formatDate(model.releaseDate, model.releaseDatePrecision, lang)} source={model.provenance.releaseDate} />
            <Row label={dict.attr.knowledgeCutoff} value={model.knowledgeCutoff ?? dict.unknown.noData} />
            <Row label={dict.attr.params} value={formatParams(model, lang)} />
            <Row label={dict.attr.openWeights} value={formatBool(model.openWeights, lang)} />
            <Row label={dict.attr.license} value={model.license ?? dict.unknown.noData} />
            <Row label={dict.attr.contextWindow} value={formatContext(model.contextWindow, lang)} />
            <Row label={dict.attr.maxOutput} value={formatCount(model.maxOutput) ?? dict.unknown.noData} />
            <Row label={dict.attr.inputPrice} value={formatPrice(model.pricing.inputPerMTok, lang)} />
            <Row label={dict.attr.outputPrice} value={formatPrice(model.pricing.outputPerMTok, lang)} />
            <Row label={dict.attr.kind} value={kind ? dict.kind.label[kind] : dict.kind.unknown} source={kind ? dict.kind.hint[kind] : undefined} />
            <Row label={dict.attr.modalities} value={`${formatModalities(model.modalities.input, lang)} → ${formatModalities(model.modalities.output, lang)}`} />
            <Row label={dict.attr.toolCall} value={formatBool(model.capabilities.toolCall, lang)} />
            <Row label={dict.attr.reasoning} value={formatBool(model.capabilities.reasoning, lang)} />
            <Row label={dict.attr.promptCaching} value={formatBool(model.capabilities.promptCaching, lang)} />
          </dl>
        </div>
        <div className="universe-archive-section universe-archive-list">
          <div>
            <p className="universe-kicker">CORE OBSERVATIONS</p>
            <h2>核心战绩</h2>
          </div>
          <dl>
            <Row label={dict.track.eci} value={formatScore(model.benchmarks.eci, lang)} />
            <Row label="AIME 数学" value={formatScore(model.benchmarks.aime, lang, '%')} />
            <Row label="GPQA Diamond 科学" value={formatScore(model.benchmarks.gpqa_diamond, lang, '%')} />
            <Row label="ARC-AGI-2 抽象推理" value={formatScore(model.benchmarks.arc_agi_2, lang, '%')} />
            <Row label="Fiction.liveBench 长文本" value={formatScore(model.benchmarks.fiction_live, lang, '%')} />
          </dl>
          <p className="universe-data-note">
            综合智力、数学、科学、抽象推理与长文本数据来自 Epoch AI（CC-BY 4.0）。
            「未参赛」表示没有公开成绩，不是零分。
          </p>
        </div>
      </section>

      <section className="universe-ledger-section">
        <div className="universe-section-head">
          <div>
            <p className="universe-kicker">CODING TELEMETRY</p>
            <h2>编程战绩（按赛制分列）</h2>
          </div>
          <span>{model.coding?.length ?? 0} 个公开赛制</span>
        </div>
        <CodingLedger scores={model.coding ?? []} />
      </section>

      <ScoreLedger model={model} models={snapshot.models} routes={UNIVERSE_ROUTES} />

      {videos.videos.length > 0 && (
        <section className="universe-video-section">
          <VideoList
            videos={videos.videos}
            modelName={videos.queryName}
            keyword={videoLibrary.keyword}
            authorMid={videoLibrary.authorMid}
          />
        </section>
      )}

      <div className="universe-detail-back">
        <Link href={UNIVERSE_ROUTES.home}>← 返回模型星图</Link>
        <Link href={UNIVERSE_ROUTES.allModels}>在全部模型中继续查看 →</Link>
      </div>
    </main>
  );
}
