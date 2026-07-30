import { CatalogProduct, ProductQualityRange } from '../../types';
import {
  normalizeCatalogProduct,
  validateQualityRanges,
} from './productModel';

export interface ProductQualityRangeMigrationPlan {
  productId: string;
  slug: string;
  qualityRanges: ProductQualityRange[];
  alreadyUsesQualityRanges: boolean;
  requiresManualReview: boolean;
  reviewReasons: string[];
}

/**
 * Creates an idempotent, read-only migration plan for one product.
 * It never writes to Firestore and never changes product IDs, slugs, images, or copy.
 */
export function prepareProductQualityRangeMigration(
  product: CatalogProduct
): ProductQualityRangeMigrationPlan {
  const alreadyUsesQualityRanges =
    Array.isArray(product.qualityRanges) && product.qualityRanges.length > 0;
  const normalized = normalizeCatalogProduct(product);
  const reviewReasons: string[] = [];

  normalized.qualityRanges.forEach((range, index) => {
    if (!range.assuranceTier) {
      reviewReasons.push(
        `Quality range ${index + 1} has no verified assurance tier.`
      );
    }
    if (range.requiresManualReview) {
      reviewReasons.push(`Quality range ${index + 1} is marked for admin review.`);
    }
  });

  const validation = validateQualityRanges(normalized.qualityRanges);
  validation.errors.forEach((error) => {
    if (!reviewReasons.includes(error)) reviewReasons.push(error);
  });

  return {
    productId: product.id,
    slug: product.slug,
    qualityRanges: normalized.qualityRanges,
    alreadyUsesQualityRanges,
    requiresManualReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

export function buildProductQualityRangeMigrationPlan(
  products: CatalogProduct[]
): ProductQualityRangeMigrationPlan[] {
  return products.map(prepareProductQualityRangeMigration);
}
