import type { ModelKind } from './kind';
import { kindOf } from './kind';
import type { ModelRecord, Vendor } from './types';

/**
 * The Universe prototype deliberately reads the production snapshot rather than
 * inventing demo data. It narrows to five representative vendors so the visual
 * language can be reviewed before all 719 models are rendered.
 */
export const UNIVERSE_VENDOR_IDS = ['openai', 'anthropic', 'google', 'deepseek', 'alibaba'] as const;

export interface UniverseVendor {
  id: string;
  name: string;
  nameZh: string;
  accentColor: string;
  continent: Vendor['continent'];
  motif: string;
  starName: string;
  coordinates: string;
  totalModels: number;
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
}

export interface UniverseData {
  generatedAt: string;
  vendors: UniverseVendor[];
  models: UniverseModel[];
  stars: UniverseStar[];
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

/** Fixed positions keep the map legible and give each family a memorable place. */
const STAR_POSITIONS: Record<string, { x: number; y: number }> = {
  openai: { x: 22, y: 28 },
  anthropic: { x: 42, y: 20 },
  google: { x: 72, y: 30 },
  deepseek: { x: 37, y: 72 },
  alibaba: { x: 70, y: 70 },
};

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

function representative(models: ModelRecord[]): ModelRecord[] {
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
    if (selected.length === 7) break;
  }
  return selected;
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

export function buildUniverseData(vendors: Vendor[], models: ModelRecord[]): UniverseData {
  const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const allowed = new Set<string>(UNIVERSE_VENDOR_IDS);
  const scopedModels = models.filter((model) => allowed.has(model.vendorId));
  const maxContext = Math.max(1, ...scopedModels.map((model) => model.contextWindow ?? 0));
  const scored = scopedModels
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

  const universeModels: UniverseModel[] = [];
  const universeVendors: UniverseVendor[] = [];

  for (const id of UNIVERSE_VENDOR_IDS) {
    const vendor = vendorMap.get(id);
    if (!vendor) continue;
    const vendorModels = scopedModels.filter((model) => model.vendorId === id);
    const selected = representative(vendorModels);
    const modelsForVendor: UniverseModel[] = selected.map((model, index) => {
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
        angle: (index * 51 + (id.length * 23) % 90) % 360,
        body: BODY_BY_KIND[kind],
        ring: RING_BY_KIND[kind],
        capabilities: capabilitiesOf(model),
      };
    });
    universeModels.push(...modelsForVendor);
    universeVendors.push({
      id: vendor.id,
      name: vendor.name,
      nameZh: vendor.nameZh,
      accentColor: vendor.accentColor,
      continent: vendor.continent,
      motif: vendor.motif,
      starName: STAR_NAMES[id] ?? `${vendor.name} Expanse`,
      coordinates: COORDINATES[id] ?? 'U 00 / 00',
      totalModels: vendorModels.length,
      representativeModels: modelsForVendor,
    });
  }

  const stars: UniverseStar[] = universeVendors.map((vendor) => {
    const position = STAR_POSITIONS[vendor.id] ?? { x: 50, y: 50 };
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
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    vendors: universeVendors,
    models: universeModels,
    stars,
  };
}

export function formatUniverseMetric(value: number | null, suffix = ''): string {
  if (value == null) return '—';
  return `${value.toFixed(value >= 10 ? 0 : 2)}${suffix}`;
}
