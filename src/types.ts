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
  // Firebase Storage image fields
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
