import { ProductCategory } from '../../types';

export const BUSINESS_TYPES = [
  'Restaurant',
  'Café',
  'Hotel & Resort',
  'Cloud Kitchen',
  'Pub & Bar',
  'Caterer',
  'Retail Store',
  'Event Organiser',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const CUISINES = [
  'South Indian',
  'North Indian',
  'Chinese',
  'Italian',
  'Continental',
  'American',
  'Mexican',
  'Japanese',
  'Pan Asian',
  'Bakery',
  'Multi Cuisine',
] as const;

export type Cuisine = (typeof CUISINES)[number];

export const PERSONALIZATION_CATEGORIES: ProductCategory[] = [
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Mushrooms',
  'Microgreens',
  'Exotics',
];

export const CUISINE_BUSINESS_TYPES: BusinessType[] = [
  'Restaurant',
  'Café',
  'Hotel & Resort',
  'Cloud Kitchen',
];

export interface CataloguePreferencesInput {
  businessType: BusinessType;
  cuisine?: Cuisine;
  averageDailyCovers?: number;
  interestedCategories: ProductCategory[];
}

export interface CataloguePreferences extends CataloguePreferencesInput {
  enabled: boolean;
  updatedAt?: string;
}

export interface RecommendationSignals {
  purchaseCounts?: Record<string, number>;
  learnedProductAffinity?: Record<string, number>;
}
