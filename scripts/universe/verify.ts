/**
 * Universe coverage guard.
 *
 * The Universe is not a curated demo: every snapshot model and vendor must remain
 * addressable from the shared catalogs. Run this before a static deployment so a
 * future data sync cannot silently drop a family from the new experience.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalVendorId, VENDOR_REGISTRY } from '../../src/data/vendor-registry';
import { buildCompareData } from '../../src/lib/compare';
import { buildPlazaRoster } from '../../src/lib/roster';
import { loadSnapshot } from '../../src/lib/snapshot';
import { buildUniverseData, buildUniverseDistricts } from '../../src/lib/universe';
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

/*
 * District parity.
 *
 * The 国外 / 国内 sections must show exactly the vendors the old plaza shows, with
 * the same flagship and the same street, because both read `buildPlazaRoster`.
 * Comparing against the roster rather than a hardcoded count means a data sync
 * that adds a vendor cannot make this check lie.
 */
const now = new Date(snapshot.generatedAt);
const registryHas = (id: string) => canonicalVendorId(id) in VENDOR_REGISTRY;
const rosters = buildPlazaRoster(snapshot.models, snapshot.vendors, now, registryHas);
const districts = buildUniverseDistricts(snapshot, universe);

for (const roster of rosters) {
  const district = districts.find((item) => item.continent === roster.continent);
  if (roster.entries.length === 0) {
    if (district) fail(`${roster.continent}: roster is empty but a district was built`);
    continue;
  }
  if (!district) fail(`${roster.continent}: plaza roster has ${roster.entries.length} vendors but no district`);

  const expected = new Map(roster.entries.map((entry) => [entry.model.slug, entry.tier]));
  const actual = new Map(
    district.streets.flatMap((street) => street.cards.map((card) => [card.model.slug, card.tier])),
  );
  if (actual.size !== district.streets.reduce((n, street) => n + street.cards.length, 0)) {
    fail(`${roster.continent}: duplicate flagship slug across streets`);
  }
  const missing = [...expected.keys()].filter((slug) => !actual.has(slug));
  const extra = [...actual.keys()].filter((slug) => !expected.has(slug));
  const moved = [...actual.keys()].filter(
    (slug) => expected.has(slug) && expected.get(slug) !== actual.get(slug),
  );
  if (missing.length || extra.length || moved.length) {
    fail(
      `${roster.continent} district does not match the plaza roster — ` +
        `missing ${missing.length ? missing.join(', ') : '—'}; ` +
        `unexpected ${extra.length ? extra.join(', ') : '—'}; ` +
        `wrong street ${moved.length ? moved.join(', ') : '—'}`,
    );
  }
  if (district.vendorCount !== roster.entries.length) {
    fail(
      `${roster.continent}: header says ${district.vendorCount} vendors, roster has ${roster.entries.length}`,
    );
  }
  if (district.others.length !== roster.others.length) {
    fail(
      `${roster.continent}: collapsed tail holds ${district.others.length} vendors, roster has ${roster.others.length}`,
    );
  }

  // Every card must carry the four aptitude bars and a persona, or the section
  // has silently degraded into a name list.
  const bare = district.streets
    .flatMap((street) => street.cards)
    .filter((card) => !card.persona || Object.keys(card.aptitude.values).length !== 4);
  if (bare.length > 0) {
    fail(`${roster.continent}: ${bare.length} district card(s) missing aptitude or persona`);
  }
}

const districtHtml = readFileSync(join(process.cwd(), 'out', 'index.html'), 'utf8');
const aliasHtml = readFileSync(join(process.cwd(), 'out', 'universe', 'index.html'), 'utf8');
for (const continent of ['west', 'east'] as const) {
  if (!districtHtml.includes(`universe-district is-${continent}`)) {
    fail(`Static root export is missing the ${continent} district section`);
  }
  if (!aliasHtml.includes(`universe-district is-${continent}`)) {
    fail(`Static /universe/ alias is missing the ${continent} district section`);
  }
}
const renderedCards =
  (districtHtml.match(/<article class="universe-district-card"/g) ?? []).length;
const expectedCards = districts.reduce((n, district) => n + district.vendorCount + district.others.length, 0);
if (renderedCards !== expectedCards) {
  fail(`Static export rendered ${renderedCards} district cards, expected ${expectedCards}`);
}

console.log(
  `[universe:verify] ${snapshot.models.length} models / ${snapshot.vendors.length} vendors / ` +
    `${universe.vendors.length} observed systems / ${compare.models.length} compare records / ` +
    `districts ${districts.map((d) => `${d.continent}:${d.vendorCount}+${d.others.length}`).join(' ')}`,
);
