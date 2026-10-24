import { canonicalVendorId, profileFor, VENDOR_REGISTRY } from '@/data/vendor-registry';
import { buildChampions } from './champions';
import { buildAptitudeScale, type AptitudeRow } from './aptitude';
import { buildPersonaContext, personaFor } from './persona';
import { assignTraits, buildTraitContext, type Trait } from './traits';
import {
  buildPlazaRoster,
  newerThanFlagship,
  type PlazaTier,
  type RosterEntry,
} from './roster';
import type { Continent } from './types';
import type { ModelKind } from './kind';
import { kindOf } from './kind';
import type { ModelRecord, Vendor, WorldSnapshot } from './types';

/**
 * The Universe view reads the production snapshot rather than inventing demo data.
 * Every vendor is a system and every model remains addressable. The map shows a
 * bounded visual layer, while catalog, ranking, search and comparison routes use
 * the complete snapshot.
 */
export const UNIVERSE_VENDOR_IDS = ['openai', 'anthropic', 'google', 'deepseek', 'alibaba'] as const;

export interface UniverseVendor {
  id: string;
  name: string;
  nameZh: string;
  accentColor: string;
  homepage: string | null;
  continent: Vendor['continent'];
  motif: string;
  starName: string;
  coordinates: string;
  totalModels: number;
  aliveModels: number;
  /** Full family for catalog and vendor routes. */
  models: UniverseModel[];
  /** A legible selection for the overview map. */
  representativeModels: UniverseModel[];
}

export interface UniverseModel {
  slug: string;
  name: string;
  vendorId: string;
  kind: ModelKind | 'unknown';
  eci: number | null;
  eciPercentile: number | null;
  influence: 1 | 2 | 3 | 4 | 5;
  price: number | null;
  contextWindow: number | null;
  retired: boolean;
  orbit: number;
  angle: number;
  body: 'planet' | 'dwarf' | 'gas-giant' | 'ice-giant' | 'pulsar';
  ring: 'none' | 'single' | 'double' | 'broken';
  capabilities: string[];
  releaseDate: string | null;
  openWeights: boolean | null;
  maxOutput: number | null;
  inputPrice: number | null;
  cachedPrice: number | null;
  license: string | null;
  knowledgeCutoff: string | null;
  reasoning: boolean | null;
  toolCall: boolean | null;
  promptCaching: boolean | null;
  inputs: string[];
  outputs: string[];
  eciRank: number | null;
}

export interface UniverseStar {
  id: string;
  name: string;
  vendorId: string;
  accentColor: string;
  continent: Vendor['continent'];
  x: number;
  y: number;
  radius: number;
  count: number;
  lead: boolean;
}

export interface UniverseData {
  generatedAt: string;
  vendors: UniverseVendor[];
  models: UniverseModel[];
  stars: UniverseStar[];
}

export interface UniverseChampion {
  key: 'smart' | 'code' | 'value' | 'cheap' | 'memory' | 'newest' | 'east' | 'open';
  label: string;
  model: UniverseModel;
  vendor: UniverseVendor;
  figure: string;
  detail: string;
  rank: number | null;
}

const STAR_NAMES: Record<string, string> = {
  openai: 'Helix Bloom',
  anthropic: 'Ember Meridian',
  google: 'Gemini Arc',
  deepseek: 'Abyssal Tide',
  alibaba: 'Qilin Expanse',
};

const COORDINATES: Record<string, string> = {
  openai: 'W 01 / 42',
  anthropic: 'W 02 / 18',
  google: 'W 03 / 66',
  deepseek: 'E 01 / 27',
  alibaba: 'E 02 / 51',
};

/** Anchors keep the five lead systems memorable. Other systems occupy a wider belt. */
const STAR_POSITIONS: Record<string, { x: number; y: number }> = {
  openai: { x: 22, y: 28 },
  anthropic: { x: 42, y: 20 },
  google: { x: 72, y: 30 },
  deepseek: { x: 37, y: 72 },
  alibaba: { x: 70, y: 70 },
};

const LEAD_VENDORS = new Set<string>(UNIVERSE_VENDOR_IDS);

function systemPosition(id: string, index: number, total: number): { x: number; y: number } {
  const anchored = STAR_POSITIONS[id];
  if (anchored) return anchored;
  const angle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  const ring = index % 2 === 0 ? 0.88 : 0.67;
  return {
    x: 50 + Math.cos(angle) * 38 * ring,
    y: 50 + Math.sin(angle) * 36 * ring,
  };
}

function starNameOf(id: string, vendor: Vendor): string {
  const known = STAR_NAMES[id];
  if (known) return known;
  const seed = [...vendor.name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const stems = ['Aster', 'Nova', 'Vela', 'Orion', 'Lyra', 'Nexus', 'Halo', 'Atlas'];
  const tails = ['Field', 'Drift', 'Reach', 'Bloom', 'Veil', 'Arc'];
  return `${stems[seed % stems.length]} ${tails[Math.floor(seed / 7) % tails.length]}`;
}

function coordinatesOf(id: string, vendor: Vendor, index: number): string {
  const known = COORDINATES[id];
  if (known) return known;
  const sector = vendor.continent === 'east' ? 'E' : 'W';
  return `${sector} ${String((index % 12) + 1).padStart(2, '0')} / ${String(43 + (index % 55)).padStart(2, '0')}`;
}

const BODY_BY_KIND: Record<UniverseModel['kind'], UniverseModel['body']> = {
  text: 'planet',
  vision: 'gas-giant',
  omni: 'gas-giant',
  'image-gen': 'dwarf',
  'video-gen': 'dwarf',
  speech: 'ice-giant',
  unknown: 'pulsar',
};

const RING_BY_KIND: Record<UniverseModel['kind'], UniverseModel['ring']> = {
  text: 'single',
  vision: 'double',
  omni: 'double',
  'image-gen': 'broken',
  'video-gen': 'broken',
  speech: 'single',
  unknown: 'none',
};

function representative(models: ModelRecord[], limit: number): ModelRecord[] {
  const alive = models.filter((model) => !model.retiredAt);
  const scored = alive
    .filter((model) => model.benchmarks.eci != null)
    .sort((a, b) => b.benchmarks.eci! - a.benchmarks.eci!);
  const rest = alive
    .filter((model) => model.benchmarks.eci == null)
    .sort((a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0));
  const byKind = new Map<string, ModelRecord[]>();
  for (const model of [...alive].sort((a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0))) {
    const kind = kindOf(model) ?? 'unknown';
    const list = byKind.get(kind) ?? [];
    list.push(model);
    byKind.set(kind, list);
  }
  const kindPicks = [...byKind.values()].flatMap((list) => list.slice(0, 1));
  const selected: ModelRecord[] = [];
  const seen = new Set<string>();
  for (const model of [...kindPicks, ...scored, ...rest]) {
    const key = model.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(model);
    if (selected.length === limit) break;
  }
  return selected;
}

/**
 * Overview statistics are computed from the same production records as the old
 * plaza. Keeping the data decisions here means the Universe does not acquire a
 * second, subtly different definition of "best" or "cheapest".
 */
export function buildUniverseChampions(
  snapshot: WorldSnapshot,
  data: UniverseData,
): UniverseChampion[] {
  const champions = buildChampions(
    snapshot.models,
    snapshot.vendors,
    new Date(snapshot.generatedAt),
    (vendorId) => canonicalVendorId(vendorId) in VENDOR_REGISTRY,
  );
  const modelBySlug = new Map(data.models.map((model) => [model.slug, model]));
  const vendorById = new Map(data.vendors.map((vendor) => [vendor.id, vendor]));
  const labels: Record<UniverseChampion['key'], string> = {
    smart: '最聪明',
    code: '最会编程',
    value: '性价比最高',
    cheap: '最便宜',
    memory: '记性最好',
    newest: '最新发布',
    east: '国内最强',
    open: '开源最强',
  };

  return champions.flatMap((champion) => {
    const model = modelBySlug.get(champion.model.slug);
    const vendor = vendorById.get(champion.model.vendorId);
    if (!model || !vendor) return [];
    return [{
      key: champion.key,
      label: labels[champion.key],
      model,
      vendor,
      figure: champion.figure,
      detail: champion.detail,
      rank: champion.rank,
    }];
  });
}

export interface UniverseKindGroup {
  kind: ModelKind;
  count: number;
  representatives: UniverseModel[];
}

const KIND_LABELS: Record<ModelKind, string> = {
  text: '文本',
  vision: '视觉',
  omni: '全模态',
  'image-gen': '图像生成',
  'video-gen': '视频生成',
  speech: '语音',
};

export function kindLabelOf(kind: ModelKind | 'unknown'): string {
  return kind === 'unknown' ? '未知' : KIND_LABELS[kind];
}

export function buildUniverseKindGroups(data: UniverseData): UniverseKindGroup[] {
  const alive = data.models.filter((model) => !model.retired);
  return (Object.keys(KIND_LABELS) as ModelKind[]).flatMap((kind) => {
    const pool = alive
      .filter((model) => model.kind === kind)
      .sort(
        (a, b) =>
          (b.eci ?? -1) - (a.eci ?? -1) ||
          (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') ||
          a.name.localeCompare(b.name),
      );
    if (pool.length === 0) return [];
    return [{
      kind,
      count: pool.length,
      representatives: pool.slice(0, 3),
    }];
  });
}

/**
 * The district view ("国外 / 国内", each split into 头部 / 主力 / 尚无评测).
 *
 * It deliberately reuses `buildPlazaRoster` instead of re-deriving a selection.
 * The old plaza already answers "which model represents this vendor" with a
 * heavily debugged rule set (generational succession, service-tier aliases,
 * vendor-level strength ranking), and the Universe must not quietly grow a
 * second definition of "headliner" that disagrees with the first.
 */
export interface UniverseDistrictCard {
  model: UniverseModel;
  /** Full production record: the cards show the same four bars and persona as the old plaza. */
  source: ModelRecord;
  continent: Continent;
  tier: PlazaTier;
  aptitude: AptitudeRow;
  traits: Trait[];
  persona: string;
  /** Flagship strength ranking for the vendor, kept for the card's sort hint. */
  strengthRank: number | null;
  /** Vendor brand colour, the same value that paints the old plaza's roof. */
  vendorAccent: string;
  vendorName: string;
  vendorNameZh: string;
  /** A newer model from the same vendor that has not earned the flagship slot yet. */
  newer: UniverseModel | null;
}

export interface UniverseDistrictStreet {
  tier: PlazaTier;
  cards: UniverseDistrictCard[];
}

export interface UniverseDistrict {
  continent: Continent;
  vendorCount: number;
  streets: UniverseDistrictStreet[];
  /** Long-tail publishers, collapsed by default exactly like the old plaza. */
  others: UniverseDistrictCard[];
}

const TIER_ORDER: PlazaTier[] = ['top', 'main', 'unscored'];

export function buildUniverseDistricts(
  snapshot: WorldSnapshot,
  data: UniverseData,
): UniverseDistrict[] {
  const registryHas = (id: string) => canonicalVendorId(id) in VENDOR_REGISTRY;
  const now = new Date(snapshot.generatedAt);
  const rosters = buildPlazaRoster(snapshot.models, snapshot.vendors, now, registryHas);

  const universeBySlug = new Map(data.models.map((model) => [model.slug, model]));
  const aptitudes = buildAptitudeScale(snapshot.models);
  const personaCtx = buildPersonaContext(snapshot.models, snapshot.vendors);

  /*
   * Same split as the plaza: persona and aptitude scales measure against the whole
   * library, while trait rarity prunes against the headline set actually on screen.
   */
  const displayed = rosters.flatMap((roster) =>
    [...roster.entries, ...roster.others].map((entry) => entry.model),
  );
  const traitMap = assignTraits(displayed, buildTraitContext(snapshot.models), now);

  const byVendor = new Map<string, ModelRecord[]>();
  for (const model of snapshot.models) {
    const list = byVendor.get(model.vendorId);
    if (list) list.push(model);
    else byVendor.set(model.vendorId, [model]);
  }

  const toCard = (entry: RosterEntry): UniverseDistrictCard | null => {
    const universeModel = universeBySlug.get(entry.model.slug);
    if (!universeModel) return null;
    const newer = newerThanFlagship(entry.model, byVendor.get(entry.model.vendorId) ?? []);
    return {
      model: universeModel,
      source: entry.model,
      continent: entry.vendor.continent,
      tier: entry.tier,
      aptitude: aptitudes.rowOf(entry.model),
      traits: traitMap.get(entry.model.id) ?? [],
      persona: personaFor(entry.model, personaCtx),
      strengthRank: entry.strengthRank,
      vendorAccent: entry.vendor.accentColor,
      vendorName: entry.vendor.name,
      vendorNameZh: entry.vendor.nameZh,
      newer: newer ? (universeBySlug.get(newer.slug) ?? null) : null,
    };
  };

  return rosters.flatMap((roster) => {
    const cards = roster.entries.flatMap((entry) => {
      const card = toCard(entry);
      return card ? [card] : [];
    });
    if (cards.length === 0) return [];
    const byTier = new Map<PlazaTier, UniverseDistrictCard[]>();
    for (const card of cards) {
      const list = byTier.get(card.tier);
      if (list) list.push(card);
      else byTier.set(card.tier, [card]);
    }
    return [{
      continent: roster.continent,
      vendorCount: cards.length,
      streets: TIER_ORDER.flatMap((tier) => {
        const street = byTier.get(tier);
        return street && street.length > 0 ? [{ tier, cards: street }] : [];
      }),
      others: roster.others.flatMap((entry) => {
        const card = toCard(entry);
        return card ? [card] : [];
      }),
    }];
  });
}

function influenceOf(model: ModelRecord, maxContext: number): 1 | 2 | 3 | 4 | 5 {
  const eci = model.benchmarks.eci;
  const context = model.contextWindow ?? 0;
  const score =
    (eci == null ? 0.2 : Math.min(1, Math.max(0, (eci - 105) / 65))) * 0.62 +
    (maxContext > 0 ? Math.min(1, context / maxContext) : 0) * 0.38;
  return Math.min(5, Math.max(1, Math.ceil(score * 5))) as 1 | 2 | 3 | 4 | 5;
}

function capabilitiesOf(model: ModelRecord): string[] {
  const result: string[] = [];
  if (model.capabilities.reasoning) result.push('推理');
  if (model.capabilities.toolCall) result.push('工具');
  if (model.modalities.input.includes('image')) result.push('视觉');
  if (model.modalities.output.includes('image')) result.push('图像生成');
  if (model.modalities.output.includes('video')) result.push('视频生成');
  if (model.openWeights) result.push('开放权重');
  return result.slice(0, 3);
}

function leanUniverseModel(
  model: ModelRecord,
  index: number,
  maxContext: number,
  percentile: (value: number | null) => number | null,
  eciRank: number | null,
): UniverseModel {
  const kind = kindOf(model) ?? 'unknown';
  return {
    slug: model.slug,
    name: model.name,
    vendorId: model.vendorId,
    kind,
    eci: model.benchmarks.eci,
    eciPercentile: percentile(model.benchmarks.eci),
    influence: influenceOf(model, maxContext),
    price: model.pricing.outputPerMTok,
    contextWindow: model.contextWindow,
    retired: model.retiredAt != null,
    orbit: 22 + (index % 3) * 13,
    angle: (index * 51 + (model.vendorId.length * 23) % 90) % 360,
    body: BODY_BY_KIND[kind],
    ring: RING_BY_KIND[kind],
    capabilities: capabilitiesOf(model),
    releaseDate: model.releaseDate,
    openWeights: model.openWeights,
    maxOutput: model.maxOutput,
    inputPrice: model.pricing.inputPerMTok,
    cachedPrice: model.pricing.cachedInputPerMTok,
    license: model.license,
    knowledgeCutoff: model.knowledgeCutoff,
    reasoning: model.capabilities.reasoning,
    toolCall: model.capabilities.toolCall,
    promptCaching: model.capabilities.promptCaching,
    inputs: model.modalities.input,
    outputs: model.modalities.output,
    eciRank,
  };
}

export function buildUniverseData(snapshot: WorldSnapshot): UniverseData {
  const vendorMap = new Map(snapshot.vendors.map((vendor) => [vendor.id, vendor]));
  const usedVendorIds = [...new Set(snapshot.models.map((model) => model.vendorId))];
  const modelCountByVendor = new Map<string, number>();
  for (const model of snapshot.models) {
    modelCountByVendor.set(model.vendorId, (modelCountByVendor.get(model.vendorId) ?? 0) + 1);
  }
  const maxContext = Math.max(1, ...snapshot.models.map((model) => model.contextWindow ?? 0));
  const scored = snapshot.models
    .map((model) => model.benchmarks.eci)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const percentile = (value: number | null): number | null => {
    if (value == null || scored.length === 0) return null;
    let lo = 0;
    let hi = scored.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (scored[mid] < value) lo = mid + 1;
      else hi = mid;
    }
    return Math.round((lo / scored.length) * 100);
  };
  const ranked = snapshot.models
    .filter((model) => !model.retiredAt && model.benchmarks.eci != null)
    .sort((a, b) => b.benchmarks.eci! - a.benchmarks.eci!);
  const rankOf = new Map(ranked.map((model, index) => [model.id, index + 1]));

  const universeModels: UniverseModel[] = [];
  const universeVendors: UniverseVendor[] = [];

  // Keep the established five systems first; every other observed family follows
  // in descending family size so the overview has a clear primary/secondary tier.
  const orderedVendorIds = usedVendorIds.sort((a, b) => {
    const leadA = LEAD_VENDORS.has(a) ? UNIVERSE_VENDOR_IDS.indexOf(a as typeof UNIVERSE_VENDOR_IDS[number]) : 99;
    const leadB = LEAD_VENDORS.has(b) ? UNIVERSE_VENDOR_IDS.indexOf(b as typeof UNIVERSE_VENDOR_IDS[number]) : 99;
    const countA = modelCountByVendor.get(a) ?? 0;
    const countB = modelCountByVendor.get(b) ?? 0;
    return leadA - leadB || countB - countA || a.localeCompare(b);
  });

  for (const id of orderedVendorIds) {
    const vendor = vendorMap.get(id) ?? {
      id,
      name: profileFor(id).nameZh,
      nameZh: profileFor(id).nameZh,
      country: profileFor(id).country,
      continent: 'west' as const,
      motif: profileFor(id).motif,
      accentColor: profileFor(id).accentColor,
      homepage: profileFor(id).homepage,
    };
    const vendorModels = snapshot.models
      .filter((model) => model.vendorId === id)
      .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || a.name.localeCompare(b.name));
    const selected = representative(vendorModels, LEAD_VENDORS.has(id) ? 7 : 4);
    const selectedSet = new Set(selected.map((model) => model.id));
    const allForVendor = [
      ...selected,
      ...vendorModels.filter((model) => !selectedSet.has(model.id)),
    ].map((model, index) =>
      leanUniverseModel(model, index, maxContext, percentile, rankOf.get(model.id) ?? null),
    );
    const modelsForVendor = allForVendor.filter((model) =>
      selected.some((selectedModel) => selectedModel.slug === model.slug),
    );
    universeModels.push(...allForVendor);
    universeVendors.push({
      id: vendor.id,
      name: vendor.name,
      nameZh: vendor.nameZh,
      accentColor: vendor.accentColor,
      homepage: profileFor(id).homepage,
      continent: vendor.continent,
      motif: vendor.motif,
      starName: starNameOf(id, vendor),
      coordinates: coordinatesOf(id, vendor, universeVendors.length),
      totalModels: vendorModels.length,
      aliveModels: vendorModels.filter((model) => !model.retiredAt).length,
      models: allForVendor,
      representativeModels: modelsForVendor,
    });
  }

  const stars: UniverseStar[] = universeVendors.map((vendor, index) => {
    const position = systemPosition(vendor.id, index, universeVendors.length);
    return {
      id: vendor.id,
      name: vendor.name,
      vendorId: vendor.id,
      accentColor: vendor.accentColor,
      continent: vendor.continent,
      x: position.x,
      y: position.y,
      radius: 42 + Math.min(18, vendor.totalModels * 0.18),
      count: vendor.totalModels,
      lead: LEAD_VENDORS.has(vendor.id),
    };
  });

  return {
    generatedAt: snapshot.generatedAt,
    vendors: universeVendors,
    models: universeModels,
    stars,
  };
}

export function formatUniverseMetric(value: number | null, suffix = ''): string {
  if (value == null) return '—';
  return `${value.toFixed(value >= 10 ? 0 : 2)}${suffix}`;
}
