export type ProductCategory = 
  | 'Vegetables' 
  | 'Fruits' 
  | 'Leafy Greens' 
  | 'Microgreens' 
  | 'Exotics' 
  | 'Mushrooms';

export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock';

export interface ProductVariant {
  id: string;
  label: string; // e.g. "250 g", "500 g", "1 kg", "1 bunch", "1 pc"
  price: number; // selling price
  mrp?: number; // optional previous price / MRP
  stockStatus: StockStatus;
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

