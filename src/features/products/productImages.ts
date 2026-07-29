import { CatalogProduct } from '../../types';

export const PRODUCT_IMAGE_ROLES = [
  {
    slot: 0,
    label: 'Botanical Illustration',
    shortLabel: 'Brand Illustration',
    description: 'Premium botanical artwork used as the catalogue image.',
  },
  {
    slot: 1,
    label: 'Real Product Photograph',
    shortLabel: 'Actual Produce',
    description: 'Ultra-high-quality photograph of the produce customers receive.',
  },
  {
    slot: 2,
    label: 'Benefits Image',
    shortLabel: 'Benefits',
    description: 'Educational image explaining product-specific nutritional benefits.',
  },
  {
    slot: 3,
    label: 'Why Organic Image',
    shortLabel: 'Why Organic',
    description: 'Educational image explaining why this product should be organic.',
  },
] as const;

export function getProductImageAlt(
  product: CatalogProduct,
  slot: number
): string {
  switch (slot) {
    case 0:
      return `Botanical illustration of ${product.name}`;
    case 1:
      return `Fresh ${product.name} supplied by The Soil Theory`;
    case 2:
      return `Nutritional and health benefits of ${product.name}`;
    case 3:
      return `Why ${product.name} should be organic`;
    default:
      return product.name;
  }
}

export function getProductGallery(product: CatalogProduct) {
  const galleryOrder = [1, 0, 2, 3];

  return galleryOrder
    .map((slot) => {
      const url = product.images?.[slot];
      const role = PRODUCT_IMAGE_ROLES[slot];
      if (!url || !role) return null;

      return {
        slot,
        url,
        label: role.shortLabel,
        title: role.label,
        alt: getProductImageAlt(product, slot),
      };
    })
    .filter((image): image is NonNullable<typeof image> => Boolean(image));
}
