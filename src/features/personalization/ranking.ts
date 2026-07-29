import { CatalogProduct } from '../../types';
import { BUSINESS_INGREDIENT_TERMS, CUISINE_INGREDIENT_TERMS } from './knowledgeBase';
import { CataloguePreferences, RecommendationSignals } from './types';

const PROMOTIONAL_PRIORITY_WEIGHT = {
  none: 0,
  low: 3,
  medium: 7,
  high: 12,
} as const;

function getProductSearchText(product: CatalogProduct): string {
  return [
    product.name,
    product.category,
    product.scientificName,
    product.regionalNameKannada,
    product.regionalNameHindi,
    product.shortIntro,
    product.description,
    ...(product.highlights || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getAvailabilityScore(product: CatalogProduct): number {
  if (!product.variants?.length) return 0;
  if (product.variants.some((variant) => variant.stockStatus === 'in_stock')) return 16;
  if (product.variants.some((variant) => variant.stockStatus === 'low_stock')) return 7;
  return -18;
}

function getSeasonalScore(product: CatalogProduct, month: number): number {
  const text = getProductSearchText(product);
  const seasonalTerms =
    month >= 2 && month <= 4
      ? ['mango', 'melon', 'cucumber', 'summer']
      : month >= 5 && month <= 8
        ? ['corn', 'leafy', 'mushroom', 'rain', 'spinach']
        : month >= 9 && month <= 10
          ? ['apple', 'beetroot', 'carrot', 'festive', 'orange']
          : ['broccoli', 'carrot', 'cauliflower', 'lettuce', 'pea', 'winter'];

  return seasonalTerms.some((term) => text.includes(term)) ? 5 : 0;
}

function countMatchingTerms(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

export function rankCatalogueProducts(
  products: CatalogProduct[],
  preferences: CataloguePreferences | null,
  signals: RecommendationSignals = {},
  now = new Date()
): CatalogProduct[] {
  if (!preferences?.enabled) {
    return products;
  }

  return products
    .map((product, originalIndex) => {
      const text = getProductSearchText(product);
      const categoryMatch = preferences.interestedCategories.includes(product.category) ? 20 : 0;
      const businessMatch =
        countMatchingTerms(text, BUSINESS_INGREDIENT_TERMS[preferences.businessType] || []) * 4;
      const cuisineMatch = preferences.cuisine
        ? countMatchingTerms(text, CUISINE_INGREDIENT_TERMS[preferences.cuisine] || []) * 6
        : 0;
      const purchaseSignal = Math.min(signals.purchaseCounts?.[product.slug] || 0, 10) * 2;
      const learnedSignal = Math.max(
        -10,
        Math.min(signals.learnedProductAffinity?.[product.slug] || 0, 20)
      );
      const adminSignal =
        (product.featuredProduct ? 10 : 0) +
        PROMOTIONAL_PRIORITY_WEIGHT[product.promotionalPriority || 'none'];
      const score = product.excludeFromRecommendations
        ? -1_000
        : categoryMatch +
          businessMatch +
          cuisineMatch +
          getAvailabilityScore(product) +
          getSeasonalScore(product, now.getMonth()) +
          purchaseSignal +
          learnedSignal +
          adminSignal;

      return { product, score, originalIndex };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.product.displayOrder ?? 100) - (right.product.displayOrder ?? 100) ||
        left.originalIndex - right.originalIndex
    )
    .map(({ product }) => product);
}
