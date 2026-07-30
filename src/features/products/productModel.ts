import {
  AssuranceTier,
  CartLineItem,
  CatalogProduct,
  CultivationMethod,
  CULTIVATION_METHODS,
  ProductQualityRange,
  ProductSelection,
  ProductVariant,
  SOURCING_TIERS,
  StockStatus,
} from '../../types';

const DEFAULT_STOCK_STATUS: StockStatus = 'in_stock';

function isAssuranceTier(value: unknown): value is AssuranceTier {
  return SOURCING_TIERS.includes(value as AssuranceTier);
}

function isCultivationMethod(value: unknown): value is CultivationMethod {
  return CULTIVATION_METHODS.includes(value as CultivationMethod);
}

function normalizeStockStatus(value: unknown): StockStatus {
  return value === 'in_stock' || value === 'low_stock' || value === 'out_of_stock'
    ? value
    : DEFAULT_STOCK_STATUS;
}

function deterministicId(prefix: string, seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

export function createStableId(prefix: 'range' | 'variant'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parsePackLabel(label: string): {
  quantity?: number;
  unit?: string;
} {
  const match = label.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\b/);
  if (!match) return {};

  return {
    quantity: Number(match[1]),
    unit: match[2],
  };
}

function normalizeVariant(
  rawVariant: Partial<ProductVariant> & Record<string, unknown>,
  seed: string
): ProductVariant {
  const label = String(rawVariant.label || rawVariant.packSize || '').trim();
  const parsedPack = parsePackLabel(label);
  const sellingPrice =
    typeof rawVariant.sellingPrice === 'number'
      ? rawVariant.sellingPrice
      : typeof rawVariant.price === 'number'
        ? rawVariant.price
        : 0;
  const previousPrice =
    typeof rawVariant.previousPrice === 'number'
      ? rawVariant.previousPrice
      : typeof rawVariant.mrp === 'number'
        ? rawVariant.mrp
        : undefined;
  const quantity =
    typeof rawVariant.quantity === 'number' && Number.isFinite(rawVariant.quantity)
      ? rawVariant.quantity
      : parsedPack.quantity;
  const unit =
    typeof rawVariant.unit === 'string' && rawVariant.unit.trim()
      ? rawVariant.unit.trim()
      : parsedPack.unit;
  const sku =
    typeof rawVariant.sku === 'string' && rawVariant.sku.trim()
      ? rawVariant.sku.trim()
      : undefined;

  return {
    id:
      typeof rawVariant.id === 'string' && rawVariant.id.trim()
        ? rawVariant.id
        : deterministicId(
            'variant',
            `${seed}:${label}:${sellingPrice}:${quantity ?? ''}:${unit ?? ''}:${sku ?? ''}`
          ),
    label,
    quantity,
    unit,
    sellingPrice,
    ...(previousPrice !== undefined ? { previousPrice } : {}),
    active: rawVariant.active !== false,
    stockStatus: normalizeStockStatus(rawVariant.stockStatus),
    ...(sku ? { sku } : {}),
    // Read aliases are retained in memory for older callers, but are not written by new saves.
    price: sellingPrice,
    ...(previousPrice !== undefined ? { mrp: previousPrice } : {}),
  };
}

function deriveCultivationMethod(values: unknown[]): CultivationMethod {
  const normalized = values
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map((value) => value.trim().toLowerCase());

  if (normalized.some((value) => value.includes('hydropon'))) {
    return 'Hydroponically Grown';
  }
  if (normalized.some((value) => value.includes('protected') || value.includes('greenhouse'))) {
    return 'Protected Cultivation';
  }
  if (normalized.some((value) => value.includes('open-field') || value.includes('open field'))) {
    return 'Open-field Grown';
  }
  if (normalized.some((value) => value.includes('soil'))) {
    return 'Soil-grown';
  }

  return 'Other';
}

function deriveRangeStockStatus(variants: ProductVariant[]): StockStatus {
  if (variants.some((variant) => variant.active !== false && variant.stockStatus === 'in_stock')) {
    return 'in_stock';
  }
  if (variants.some((variant) => variant.active !== false && variant.stockStatus === 'low_stock')) {
    return 'low_stock';
  }
  return 'out_of_stock';
}

function normalizeExistingRange(
  rawRange: Partial<ProductQualityRange> & Record<string, unknown>,
  productSeed: string
): ProductQualityRange {
  const rawVariants = Array.isArray(rawRange.variants) ? rawRange.variants : [];
  const rangeSeed = `${productSeed}:${String(rawRange.id || '')}:${String(
    rawRange.assuranceTier || ''
  )}:${String(rawRange.cultivationMethod || '')}`;
  const variants = rawVariants.map((variant) =>
    normalizeVariant(
      variant as Partial<ProductVariant> & Record<string, unknown>,
      rangeSeed
    )
  );
  const assuranceTier = isAssuranceTier(rawRange.assuranceTier)
    ? rawRange.assuranceTier
    : undefined;
  const cultivationMethod = isCultivationMethod(rawRange.cultivationMethod)
    ? rawRange.cultivationMethod
    : deriveCultivationMethod([
        rawRange.cultivationMethod,
        rawRange.internalNotes,
      ]);

  return {
    id:
      typeof rawRange.id === 'string' && rawRange.id.trim()
        ? rawRange.id
        : deterministicId('range', rangeSeed),
    ...(assuranceTier ? { assuranceTier } : {}),
    cultivationMethod,
    active: rawRange.active !== false,
    stockStatus:
      rawRange.stockStatus === 'in_stock' ||
      rawRange.stockStatus === 'low_stock' ||
      rawRange.stockStatus === 'out_of_stock'
        ? rawRange.stockStatus
        : deriveRangeStockStatus(variants),
    variants,
    ...(typeof rawRange.sourceFarm === 'string' && rawRange.sourceFarm.trim()
      ? { sourceFarm: rawRange.sourceFarm.trim() }
      : {}),
    ...(typeof rawRange.certificationDetails === 'string' &&
    rawRange.certificationDetails.trim()
      ? { certificationDetails: rawRange.certificationDetails.trim() }
      : {}),
    ...(typeof rawRange.certificationDocumentUrl === 'string' &&
    rawRange.certificationDocumentUrl.trim()
      ? { certificationDocumentUrl: rawRange.certificationDocumentUrl.trim() }
      : {}),
    ...(typeof rawRange.labReportUrl === 'string' && rawRange.labReportUrl.trim()
      ? { labReportUrl: rawRange.labReportUrl.trim() }
      : {}),
    ...(typeof rawRange.minimumOrderQuantity === 'number' &&
    Number.isFinite(rawRange.minimumOrderQuantity) &&
    rawRange.minimumOrderQuantity > 0
      ? { minimumOrderQuantity: rawRange.minimumOrderQuantity }
      : {}),
    ...(typeof rawRange.internalNotes === 'string' && rawRange.internalNotes.trim()
      ? { internalNotes: rawRange.internalNotes.trim() }
      : {}),
    requiresManualReview: rawRange.requiresManualReview === true || !assuranceTier,
  };
}

function normalizeLegacyRange(
  product: CatalogProduct & Record<string, unknown>
): ProductQualityRange[] {
  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  if (rawVariants.length === 0) return [];

  const productSeed = String(product.id || product.slug || product.name);
  const variants = rawVariants.map((variant) =>
    normalizeVariant(
      variant as Partial<ProductVariant> & Record<string, unknown>,
      `${productSeed}:legacy`
    )
  );
  const productTierCandidates = [
    product.assuranceTier,
    product.sourcingTier,
    ...rawVariants.map((variant) => variant.sourcingTier),
  ].filter(isAssuranceTier);
  const distinctTiers = Array.from(new Set(productTierCandidates));
  const assuranceTier = distinctTiers.length === 1 ? distinctTiers[0] : undefined;
  const cultivationMethod = deriveCultivationMethod([
    product.cultivationMethod,
    product.growingMethod,
    ...rawVariants.map((variant) => variant.note),
  ]);

  return [
    {
      id: deterministicId('range', `${productSeed}:legacy-default-range`),
      ...(assuranceTier ? { assuranceTier } : {}),
      cultivationMethod,
      active: true,
      stockStatus: deriveRangeStockStatus(variants),
      variants,
      ...(typeof product.farmSource === 'string' && product.farmSource.trim()
        ? { sourceFarm: product.farmSource.trim() }
        : {}),
      ...(typeof product.certificationDetails === 'string' &&
      product.certificationDetails.trim()
        ? { certificationDetails: product.certificationDetails.trim() }
        : {}),
      ...(typeof product.certificationDocumentUrl === 'string' &&
      product.certificationDocumentUrl.trim()
        ? { certificationDocumentUrl: product.certificationDocumentUrl.trim() }
        : {}),
      ...(typeof product.labReportUrl === 'string' && product.labReportUrl.trim()
        ? { labReportUrl: product.labReportUrl.trim() }
        : {}),
      requiresManualReview: !assuranceTier || distinctTiers.length > 1,
    },
  ];
}

export function normalizeProductQualityRanges(
  product: CatalogProduct & Record<string, unknown>
): ProductQualityRange[] {
  if (Array.isArray(product.qualityRanges) && product.qualityRanges.length > 0) {
    const productSeed = String(product.id || product.slug || product.name);
    return product.qualityRanges.map((range) =>
      normalizeExistingRange(
        range as ProductQualityRange & Record<string, unknown>,
        productSeed
      )
    );
  }

  return normalizeLegacyRange(product);
}

export function normalizeCatalogProduct<T extends CatalogProduct>(
  product: T
): T & { qualityRanges: ProductQualityRange[] } {
  return {
    ...product,
    qualityRanges: normalizeProductQualityRanges(
      product as CatalogProduct & Record<string, unknown>
    ),
  };
}

export function getActiveQualityRanges(product: CatalogProduct): ProductQualityRange[] {
  return normalizeProductQualityRanges(
    product as CatalogProduct & Record<string, unknown>
  ).filter((range) => range.active !== false);
}

export function getActiveVariants(range: ProductQualityRange): ProductVariant[] {
  return (range.variants || []).filter((variant) => variant.active !== false);
}

export function isQualityRangeAvailable(range: ProductQualityRange): boolean {
  return (
    range.active !== false &&
    range.stockStatus !== 'out_of_stock' &&
    getActiveVariants(range).some((variant) => variant.stockStatus !== 'out_of_stock')
  );
}

export function isProductAvailable(product: CatalogProduct): boolean {
  return getActiveQualityRanges(product).some(isQualityRangeAvailable);
}

export function getAvailableRangeVariants(product: CatalogProduct) {
  return getActiveQualityRanges(product).flatMap((range) =>
    getActiveVariants(range)
      .filter(
        (variant) =>
          range.stockStatus !== 'out_of_stock' && variant.stockStatus !== 'out_of_stock'
      )
      .map((variant) => ({ range, variant }))
  );
}

export function getLowestAvailablePrice(product: CatalogProduct): number | null {
  const prices = getAvailableRangeVariants(product)
    .map(({ variant }) => variant.sellingPrice ?? variant.price)
    .filter(
      (price): price is number =>
        typeof price === 'number' && Number.isFinite(price) && price > 0
    );

  return prices.length > 0 ? Math.min(...prices) : null;
}

export function getDefaultProductSelection(
  product: CatalogProduct
): ProductSelection | null {
  const ranges = getActiveQualityRanges(product);
  const range = ranges.find(isQualityRangeAvailable) ?? ranges[0];
  if (!range) return null;

  const variants = getActiveVariants(range);
  const variant =
    variants.find((item) => item.stockStatus !== 'out_of_stock') ?? variants[0];
  if (!variant) return null;

  return {
    qualityRangeId: range.id,
    variantId: variant.id,
    quantity: Math.max(1, Math.floor(range.minimumOrderQuantity || 1)),
  };
}

export function getQualityRangeDisplayLabel(range: ProductQualityRange): string {
  if (!range.assuranceTier) {
    return 'Quality details available on request';
  }
  if (range.cultivationMethod === 'Hydroponically Grown') {
    return `${range.cultivationMethod} · ${range.assuranceTier}`;
  }
  return range.assuranceTier;
}

export function getProductRangeSummary(product: CatalogProduct): string | null {
  const ranges = getActiveQualityRanges(product);
  if (ranges.length === 0) return null;
  if (ranges.length === 1) return getQualityRangeDisplayLabel(ranges[0]);
  return `${ranges.length} quality ranges available`;
}

export function getCartLineId(
  productId: string,
  qualityRangeId: string,
  variantId: string
): string {
  return `${productId}::${qualityRangeId}::${variantId}`;
}

export function createCartLineItem(
  product: CatalogProduct,
  selection: ProductSelection
): CartLineItem | null {
  const range = getActiveQualityRanges(product).find(
    (item) => item.id === selection.qualityRangeId
  );
  const variant = range
    ? getActiveVariants(range).find((item) => item.id === selection.variantId)
    : undefined;
  const unitPrice = variant?.sellingPrice ?? variant?.price;

  if (
    !range ||
    !variant ||
    range.stockStatus === 'out_of_stock' ||
    variant.stockStatus === 'out_of_stock' ||
    typeof unitPrice !== 'number' ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return null;
  }

  return {
    id: getCartLineId(product.id, range.id, variant.id),
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    qualityRangeId: range.id,
    variantId: variant.id,
    assuranceTier: range.assuranceTier,
    cultivationMethod: range.cultivationMethod,
    qualityRangeLabel: getQualityRangeDisplayLabel(range),
    packLabel: variant.label,
    unitPrice,
    quantity: Math.max(1, Math.floor(selection.quantity)),
    imageUrl: product.images?.[0],
  };
}

export function dedupeCatalogueProducts(products: CatalogProduct[]): CatalogProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.slug?.trim().toLowerCase() || product.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface QualityRangeValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateQualityRanges(
  qualityRanges: ProductQualityRange[]
): QualityRangeValidationResult {
  const errors: string[] = [];
  if (qualityRanges.length < 1) {
    errors.push('At least one quality range is required.');
  }
  if (qualityRanges.length > 3) {
    errors.push('A product can have no more than three quality ranges.');
  }

  const combinations = new Set<string>();
  qualityRanges.forEach((range, rangeIndex) => {
    const rangeLabel = `Quality range ${rangeIndex + 1}`;
    if (!range.id?.trim()) errors.push(`${rangeLabel} requires a stable ID.`);
    if (!isAssuranceTier(range.assuranceTier)) {
      errors.push(`${rangeLabel} requires an approved assurance tier.`);
    }
    if (!isCultivationMethod(range.cultivationMethod)) {
      errors.push(`${rangeLabel} requires an approved cultivation method.`);
    }

    if (range.assuranceTier && isCultivationMethod(range.cultivationMethod)) {
      const combination = `${range.assuranceTier}::${range.cultivationMethod}`;
      if (combinations.has(combination)) {
        errors.push(
          `${rangeLabel} duplicates the same assurance tier and cultivation method.`
        );
      }
      combinations.add(combination);
    }

    if (!Array.isArray(range.variants) || range.variants.length === 0) {
      errors.push(`${rangeLabel} requires at least one pack-size variant.`);
      return;
    }

    const activeVariants = getActiveVariants(range);
    if (range.active !== false && activeVariants.length === 0) {
      errors.push(`${rangeLabel} must contain at least one active pack-size variant.`);
    }

    const variantIds = new Set<string>();
    range.variants.forEach((variant, variantIndex) => {
      const variantLabel = `${rangeLabel}, variant ${variantIndex + 1}`;
      if (!variant.id?.trim()) errors.push(`${variantLabel} requires a stable ID.`);
      if (variantIds.has(variant.id)) errors.push(`${variantLabel} has a duplicate ID.`);
      variantIds.add(variant.id);
      if (!variant.label?.trim()) errors.push(`${variantLabel} requires a pack label.`);
      if (
        typeof variant.quantity !== 'number' ||
        !Number.isFinite(variant.quantity) ||
        variant.quantity <= 0
      ) {
        errors.push(`${variantLabel} requires a valid positive pack quantity.`);
      }
      if (!variant.unit?.trim()) errors.push(`${variantLabel} requires a pack unit.`);

      if (variant.active !== false) {
        const price = variant.sellingPrice ?? variant.price;
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
          errors.push(`${variantLabel} requires a valid positive price.`);
        }
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

export function createEmptyQualityRange(): ProductQualityRange {
  return {
    id: createStableId('range'),
    cultivationMethod: 'Soil-grown',
    active: true,
    stockStatus: 'in_stock',
    variants: [createEmptyPackVariant()],
  };
}

export function createEmptyPackVariant(): ProductVariant {
  return {
    id: createStableId('variant'),
    label: '250 g',
    quantity: 250,
    unit: 'g',
    sellingPrice: 99,
    active: true,
    stockStatus: 'in_stock',
    price: 99,
  };
}
