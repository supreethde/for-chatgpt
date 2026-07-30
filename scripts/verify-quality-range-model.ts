import assert from 'node:assert/strict';
import {
  CartLineItem,
  CatalogProduct,
  ProductQualityRange,
} from '../src/types';
import {
  createCartLineItem,
  dedupeCatalogueProducts,
  getActiveQualityRanges,
  getDefaultProductSelection,
  getLowestAvailablePrice,
  getQualityRangeDisplayLabel,
  normalizeCatalogProduct,
  validateQualityRanges,
} from '../src/features/products/productModel';
import { prepareProductQualityRangeMigration } from '../src/features/products/productMigration';

function variant(
  id: string,
  label: string,
  quantity: number,
  unit: string,
  price: number,
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock'
) {
  return {
    id,
    label,
    quantity,
    unit,
    sellingPrice: price,
    active: true,
    stockStatus,
  };
}

function range(
  id: string,
  assuranceTier: ProductQualityRange['assuranceTier'],
  cultivationMethod: ProductQualityRange['cultivationMethod'],
  variants: ProductQualityRange['variants'],
  stockStatus: ProductQualityRange['stockStatus'] = 'in_stock'
): ProductQualityRange {
  return {
    id,
    assuranceTier,
    cultivationMethod,
    active: true,
    stockStatus,
    variants,
  };
}

function product(
  id: string,
  name: string,
  qualityRanges: ProductQualityRange[]
): CatalogProduct {
  return {
    id,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    category: 'Vegetables',
    shortIntro: `${name} short introduction.`,
    highlights: ['One', 'Two', 'Three', 'Four'],
    description: `${name} description.`,
    images: [],
    qualityRanges,
    isActive: true,
  };
}

const carrotOneRange = product('carrot', 'Carrot', [
  range('carrot-organic', 'Certified Organic', 'Soil-grown', [
    variant('carrot-250', '250 g', 250, 'g', 79),
    variant('carrot-500', '500 g', 500, 'g', 139),
  ]),
]);
assert.equal(getActiveQualityRanges(carrotOneRange).length, 1);
assert.equal(getLowestAvailablePrice(carrotOneRange), 79);

const carrotThreeRanges = product('carrot', 'Carrot', [
  carrotOneRange.qualityRanges![0],
  range('carrot-grown', 'Organically Grown', 'Soil-grown', [
    variant('carrot-grown-500', '500 g', 500, 'g', 99),
  ]),
  range('carrot-prf', 'Pesticide Residue Free', 'Open-field Grown', [
    variant('carrot-prf-1kg', '1 kg', 1, 'kg', 119),
  ]),
]);
assert.equal(getActiveQualityRanges(carrotThreeRanges).length, 3);

const spinach = product('spinach', 'Spinach', [
  range('spinach-organic', 'Certified Organic', 'Soil-grown', [
    variant('spinach-organic-500', '500 g', 500, 'g', 89),
  ]),
  range('spinach-hydro', 'Pesticide Residue Free', 'Hydroponically Grown', [
    variant('spinach-hydro-500', '500 g', 500, 'g', 69),
  ]),
]);
assert.equal(
  getQualityRangeDisplayLabel(spinach.qualityRanges![1]),
  'Hydroponically Grown · Pesticide Residue Free'
);

const stockFallback = product('stock-fallback', 'Stock Fallback', [
  range(
    'range-out',
    'Certified Organic',
    'Soil-grown',
    [variant('out-pack', '500 g', 500, 'g', 99, 'out_of_stock')],
    'out_of_stock'
  ),
  range('range-in', 'Organically Grown', 'Soil-grown', [
    variant('in-pack', '500 g', 500, 'g', 89),
  ]),
]);
assert.equal(getDefaultProductSelection(stockFallback)?.qualityRangeId, 'range-in');

const variantFallback = product('variant-fallback', 'Variant Fallback', [
  range('range-mixed', 'Certified Organic', 'Soil-grown', [
    variant('pack-out', '250 g', 250, 'g', 59, 'out_of_stock'),
    variant('pack-in', '500 g', 500, 'g', 99),
  ]),
]);
assert.equal(getDefaultProductSelection(variantFallback)?.variantId, 'pack-in');

const duplicatedSearchResults = dedupeCatalogueProducts([
  carrotThreeRanges,
  { ...carrotThreeRanges },
]);
assert.equal(
  duplicatedSearchResults.filter((item) =>
    item.name.toLowerCase().includes('carrot')
  ).length,
  1
);
assert.equal(
  getActiveQualityRanges(carrotThreeRanges).filter(
    (item) => item.assuranceTier === 'Certified Organic'
  ).length,
  1
);
assert.equal(
  getActiveQualityRanges(carrotThreeRanges).filter(
    (item) => item.assuranceTier === 'Pesticide Residue Free'
  ).length,
  1
);

const organicSelection = {
  qualityRangeId: 'spinach-organic',
  variantId: 'spinach-organic-500',
  quantity: 1,
};
const hydroSelection = {
  qualityRangeId: 'spinach-hydro',
  variantId: 'spinach-hydro-500',
  quantity: 1,
};
const organicLine = createCartLineItem(spinach, organicSelection) as CartLineItem;
const hydroLine = createCartLineItem(spinach, hydroSelection) as CartLineItem;
assert.notEqual(organicLine.id, hydroLine.id);
assert.equal(organicLine.assuranceTier, 'Certified Organic');
assert.equal(hydroLine.cultivationMethod, 'Hydroponically Grown');
assert.equal(hydroLine.packLabel, '500 g');

const legacyProduct: CatalogProduct = {
  ...product('legacy', 'Legacy Produce', []),
  qualityRanges: undefined,
  variants: [
    {
      id: 'legacy-pack',
      sourcingTier: 'Pesticide Residue Free',
      label: '1 kg',
      sellingPrice: 120,
      stockStatus: 'in_stock',
      note: 'Hydroponically Grown',
    },
  ],
};
const normalizedLegacy = normalizeCatalogProduct(legacyProduct);
assert.equal(normalizedLegacy.qualityRanges.length, 1);
assert.equal(normalizedLegacy.qualityRanges[0].assuranceTier, 'Pesticide Residue Free');
assert.equal(
  normalizedLegacy.qualityRanges[0].cultivationMethod,
  'Hydroponically Grown'
);
assert.equal(normalizedLegacy.qualityRanges[0].variants[0].sellingPrice, 120);

assert.equal(validateQualityRanges(carrotOneRange.qualityRanges!).valid, true);
assert.equal(validateQualityRanges(carrotThreeRanges.qualityRanges!).valid, true);
assert.equal(
  validateQualityRanges([
    ...carrotThreeRanges.qualityRanges!,
    range('fourth', 'Certified Organic', 'Protected Cultivation', [
      variant('fourth-pack', '1 kg', 1, 'kg', 100),
    ]),
  ]).valid,
  false
);
assert.equal(
  validateQualityRanges([
    range('invalid', undefined, 'Soil-grown', [
      variant('invalid-pack', '', 0, '', 0),
    ]),
  ]).valid,
  false
);

const firstPlan = prepareProductQualityRangeMigration(legacyProduct);
const secondPlan = prepareProductQualityRangeMigration({
  ...legacyProduct,
  qualityRanges: firstPlan.qualityRanges,
});
assert.equal(firstPlan.qualityRanges[0].id, secondPlan.qualityRanges[0].id);
assert.equal(
  firstPlan.qualityRanges[0].variants[0].id,
  secondPlan.qualityRanges[0].variants[0].id
);
assert.equal(firstPlan.productId, legacyProduct.id);
assert.equal(firstPlan.slug, legacyProduct.slug);

console.log('Quality-range architecture scenarios passed.');
