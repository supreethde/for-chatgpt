export type ProductCategory = 
  | 'Vegetables' 
  | 'Fruits' 
  | 'Leafy Greens' 
  | 'Microgreens' 
  | 'Exotics' 
  | 'Mushrooms';

export type AssuranceTier =
  | 'Certified Organic'
  | 'Organically Grown'
  | 'Pesticide Residue Free';

// Kept as an alias so existing filter labels and persisted preferences remain compatible.
export type SourcingTier = AssuranceTier;

export const SOURCING_TIERS: AssuranceTier[] = [
  'Certified Organic',
  'Organically Grown',
  'Pesticide Residue Free',
];

export type CultivationMethod =
  | 'Soil-grown'
  | 'Hydroponically Grown'
  | 'Protected Cultivation'
  | 'Open-field Grown'
  | 'Other';

export const CULTIVATION_METHODS: CultivationMethod[] = [
  'Soil-grown',
  'Hydroponically Grown',
  'Protected Cultivation',
  'Open-field Grown',
  'Other',
];

export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock';

export interface ProductVariant {
  id: string;
  label: string; // Pack size e.g. "250 g", "500 g", "1 kg", "Bunch", "Piece"
  quantity?: number;
  unit?: string;
  sellingPrice?: number; // Selling price
  previousPrice?: number; // Optional previous price / MRP
  active?: boolean;
  stockStatus: StockStatus;
  sku?: string;
  // Legacy backward compatibility aliases
  sourcingTier?: SourcingTier;
  note?: string;
  price?: number;
  mrp?: number;
}

export interface ProductQualityRange {
  id: string;
  assuranceTier?: AssuranceTier;
  cultivationMethod: CultivationMethod;
  active: boolean;
  stockStatus: StockStatus;
  sourceFarm?: string;
  certificationDetails?: string;
  certificationDocumentUrl?: string;
  labReportUrl?: string;
  minimumOrderQuantity?: number;
  internalNotes?: string;
  requiresManualReview?: boolean;
  variants: ProductVariant[];
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  scientificName?: string;
  displayOrder?: number;
  shortIntro: string; // Concise max 2-sentence intro
  highlights: string[]; // Array of exactly 4 key highlights
  description: string; // ~80-120 words short description
  regionalNameKannada?: string;
  regionalNameHindi?: string;
  images: string[]; // Exactly 4 URLs: botanical, real product, benefits, why organic
  qualityRanges?: ProductQualityRange[];
  /** Legacy input only. Newly saved products use qualityRanges. */
  variants?: ProductVariant[];
  isActive: boolean;
  featuredProduct?: boolean;
  promotionalPriority?: 'none' | 'low' | 'medium' | 'high';
  excludeFromRecommendations?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSelection {
  qualityRangeId: string;
  variantId: string;
  quantity: number;
}

export interface CartLineItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  qualityRangeId: string;
  variantId: string;
  assuranceTier?: AssuranceTier;
  cultivationMethod: CultivationMethod;
  qualityRangeLabel: string;
  packLabel: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export interface ProductImage {
  url: string;
  path: string;
  altText: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  farmSource: string;
  weeklyTestStatus: string;
  description: string;
  primaryImageUrl: string;
  primaryImagePath: string;
  imageAltText: string;
  additionalImages: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadResult {
  url: string;
  path: string;
}
