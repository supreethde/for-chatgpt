export type ProductCategory = 
  | 'Vegetables' 
  | 'Fruits' 
  | 'Leafy Greens' 
  | 'Microgreens' 
  | 'Exotics' 
  | 'Mushrooms';

export type SourcingTier = 
  | 'Certified Organic'
  | 'Organically Grown'
  | 'Pesticide Residue Free';

export const SOURCING_TIERS: SourcingTier[] = [
  'Certified Organic',
  'Organically Grown',
  'Pesticide Residue Free',
];

export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock';

export interface ProductVariant {
  id: string;
  sourcingTier?: SourcingTier; // Required on save, optional for un-updated legacy docs
  label: string; // Pack size e.g. "250 g", "500 g", "1 kg", "Bunch", "Piece"
  sellingPrice?: number; // Selling price
  previousPrice?: number; // Optional previous price / MRP
  stockStatus: StockStatus;
  note?: string; // Optional Growing Method / Note
  // Legacy backward compatibility aliases
  price?: number;
  mrp?: number;
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
  images: string[]; // Up to 5 product image URLs
  variants: ProductVariant[];
  isActive: boolean;
  featuredProduct?: boolean;
  promotionalPriority?: 'none' | 'low' | 'medium' | 'high';
  excludeFromRecommendations?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
