/**
 * Universe coverage guard.
 *
 * The Universe is not a curated demo: every snapshot model and vendor must remain
 * addressable from the shared catalogs. Run this before a static deployment so a
 * future data sync cannot silently drop a family from the new experience.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCompareData } from '../../src/lib/compare';
import { loadSnapshot } from '../../src/lib/snapshot';
import { buildUniverseData } from '../../src/lib/universe';
import type { CompareData } from '../../src/components/compare/types';

function fail(message: string): never {
  console.error(`[universe:verify] ERROR ${message}`);
  process.exit(1);
}

const snapshot = loadSnapshot();
const universe = buildUniverseData(snapshot);
const modelSlugs = new Set(universe.models.map((model) => model.slug));
const vendorIds = new Set(universe.vendors.map((vendor) => vendor.id));
const missingModels = snapshot.models.filter((model) => !modelSlugs.has(model.slug));
const missingVendors = snapshot.vendors.filter((vendor) => !vendorIds.has(vendor.id));
const missingModelVendors = snapshot.models.filter((model) => !vendorIds.has(model.vendorId));

if (missingModels.length > 0) {
  fail(`Models missing from Universe data: ${missingModels.map((model) => model.slug).join(', ')}`);
}
if (missingVendors.length > 0) {
  fail(`Vendors missing from Universe data: ${missingVendors.map((vendor) => vendor.id).join(', ')}`);
}
if (missingModelVendors.length > 0) {
  fail(
    `Models reference unknown vendors: ${missingModelVendors
      .map((model) => `${model.slug}->${model.vendorId}`)
      .join(', ')}`,
  );
}

for (const vendor of universe.vendors) {
  if (vendor.models.length !== vendor.totalModels) {
    fail(
      `${vendor.id}: catalog has ${vendor.models.length} models, expected ${vendor.totalModels}`,
    );
  }
  if (vendor.aliveModels > vendor.totalModels) {
    fail(`${vendor.id}: alive count exceeds total count`);
  }
}

const compare = JSON.parse(
  readFileSync(join(process.cwd(), 'out', 'compare-data.json'), 'utf8'),
) as CompareData;
const compareSlugs = new Set(compare.models.map((model) => model.slug));
const missingCompare = snapshot.models.filter((model) => !compareSlugs.has(model.slug));
if (missingCompare.length > 0) {
  fail(`Models missing from compare data: ${missingCompare.map((model) => model.slug).join(', ')}`);
}

const expectedCompare = buildCompareData(snapshot, new Set(snapshot.models.map((model) => model.slug)));
if (compare.models.length !== expectedCompare.models.length) {
  fail(`compare model count ${compare.models.length}, expected ${expectedCompare.models.length}`);
}

const duplicates = universe.models.length - modelSlugs.size;
if (duplicates !== 0) fail(`Universe data contains ${duplicates} duplicate model slug(s)`);

console.log(
  `[universe:verify] ${snapshot.models.length} models / ${snapshot.vendors.length} vendors / ` +
    `${universe.vendors.length} observed systems / ${compare.models.length} compare records`,
);
