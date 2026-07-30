import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp
} from 'firebase/firestore/lite';
import { auth } from '../lib/firebase-auth';
import { firestoreDb as db } from '../lib/firebase-firestore';
import { CatalogProduct } from '../types';
import { normalizeCatalogProduct } from '../features/products/productModel';

const IS_DEVELOPMENT = Boolean(
  (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV
);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  const developmentDetails = JSON.stringify(errInfo);
  if (IS_DEVELOPMENT) {
    console.error('Product service error:', developmentDetails);
  }
  throw new Error(
    IS_DEVELOPMENT ? developmentDetails : 'Product service is temporarily unavailable.'
  );
}

const PRODUCTS_COLLECTION = 'products';

/**
 * Fetch all products from Firestore `products` collection
 */
export async function fetchProductsFromFirestore(): Promise<CatalogProduct[]> {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const querySnapshot = await getDocs(productsRef);
    
    const products: CatalogProduct[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawVariants = Array.isArray(data.variants) ? data.variants : [];
      const normalizedVariants = rawVariants.map((v: any) => {
        const sellingPrice = typeof v.sellingPrice === 'number' ? v.sellingPrice : (typeof v.price === 'number' ? v.price : 0);
        const previousPrice = typeof v.previousPrice === 'number' ? v.previousPrice : (typeof v.mrp === 'number' ? v.mrp : undefined);
        return {
          id: v.id || '',
          sourcingTier: v.sourcingTier || undefined,
          label: v.label || v.packSize || '',
          sellingPrice,
          previousPrice,
          stockStatus: v.stockStatus || 'in_stock',
          note: v.note || v.growingMethod || undefined,
          price: sellingPrice,
          mrp: previousPrice,
        };
      });

      const product: CatalogProduct & Record<string, any> = {
        id: docSnap.id,
        name: data.name || 'Unnamed Produce',
        slug: data.slug || docSnap.id,
        category: data.category || 'Vegetables',
        scientificName: data.scientificName || '',
        displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : (typeof data.order === 'number' ? data.order : 100),
        shortIntro: data.shortIntro || data.shortIntroduction || '',
        highlights: Array.isArray(data.highlights) ? data.highlights : (Array.isArray(data.keyHighlights) ? data.keyHighlights : []),
        description: data.description || data.shortIntro || data.shortIntroduction || '',
        regionalNameKannada: data.regionalNameKannada || data.regionalNames?.kannada || '',
        regionalNameHindi: data.regionalNameHindi || data.regionalNames?.hindi || '',
        images: Array.isArray(data.images) ? data.images : [],
        qualityRanges: Array.isArray(data.qualityRanges) ? data.qualityRanges : [],
        variants: normalizedVariants,
        isActive: data.isActive ?? data.active ?? true,
        featuredProduct: data.featuredProduct === true,
        promotionalPriority: ['low', 'medium', 'high'].includes(data.promotionalPriority)
          ? data.promotionalPriority
          : 'none',
        excludeFromRecommendations: data.excludeFromRecommendations === true,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
        // Preserve optional fields if present in Firestore
        priceRange: data.priceRange || undefined,
        farmSource: data.farmSource || undefined,
        weeklyTestStatus: data.weeklyTestStatus || undefined,
        active: data.active ?? data.isActive ?? true,
      };
      products.push(normalizeCatalogProduct(product));
    });

    products.sort((a, b) => (a.displayOrder ?? 100) - (b.displayOrder ?? 100));

    return products;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('Failed to fetch products:', error);
    }
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
    return [];
  }
}

function formatQualityRangesForFirestore(product: CatalogProduct) {
  const normalized = normalizeCatalogProduct(product);
  return normalized.qualityRanges.map((range) => ({
    id: range.id,
    ...(range.assuranceTier ? { assuranceTier: range.assuranceTier } : {}),
    cultivationMethod: range.cultivationMethod,
    active: range.active !== false,
    stockStatus: range.stockStatus || 'in_stock',
    variants: (range.variants || []).map((variant) => {
      const sellingPrice =
        typeof variant.sellingPrice === 'number'
          ? variant.sellingPrice
          : typeof variant.price === 'number'
            ? variant.price
            : 0;
      const previousPrice =
        typeof variant.previousPrice === 'number'
          ? variant.previousPrice
          : typeof variant.mrp === 'number'
            ? variant.mrp
            : undefined;

      return {
        id: variant.id,
        label: variant.label,
        ...(typeof variant.quantity === 'number'
          ? { quantity: variant.quantity }
          : {}),
        ...(variant.unit?.trim() ? { unit: variant.unit.trim() } : {}),
        sellingPrice,
        active: variant.active !== false,
        stockStatus: variant.stockStatus || 'in_stock',
        ...(previousPrice !== undefined ? { previousPrice } : {}),
        ...(variant.sku?.trim() ? { sku: variant.sku.trim() } : {}),
      };
    }),
    ...(range.sourceFarm?.trim() ? { sourceFarm: range.sourceFarm.trim() } : {}),
    ...(range.certificationDetails?.trim()
      ? { certificationDetails: range.certificationDetails.trim() }
      : {}),
    ...(range.certificationDocumentUrl?.trim()
      ? { certificationDocumentUrl: range.certificationDocumentUrl.trim() }
      : {}),
    ...(range.labReportUrl?.trim() ? { labReportUrl: range.labReportUrl.trim() } : {}),
    ...(typeof range.minimumOrderQuantity === 'number'
      ? { minimumOrderQuantity: range.minimumOrderQuantity }
      : {}),
    ...(range.internalNotes?.trim() ? { internalNotes: range.internalNotes.trim() } : {}),
    ...(range.requiresManualReview ? { requiresManualReview: true } : {}),
  }));
}

function createProductPayload(
  product: CatalogProduct,
  createdAtValue: ReturnType<typeof serverTimestamp> | Date,
  removeLegacyVariants = false
) {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    scientificName: product.scientificName || '',
    displayOrder: typeof product.displayOrder === 'number' ? product.displayOrder : 100,
    shortIntro: product.shortIntro,
    shortIntroduction: product.shortIntro,
    highlights: product.highlights,
    keyHighlights: product.highlights,
    description: product.description,
    regionalNameKannada: product.regionalNameKannada || '',
    regionalNameHindi: product.regionalNameHindi || '',
    regionalNames: {
      kannada: product.regionalNameKannada || '',
      hindi: product.regionalNameHindi || ''
    },
    images: product.images,
    qualityRanges: formatQualityRangesForFirestore(product),
    ...(removeLegacyVariants ? { variants: deleteField() } : {}),
    isActive: product.isActive,
    active: product.isActive,
    featuredProduct: product.featuredProduct === true,
    promotionalPriority: product.promotionalPriority || 'none',
    excludeFromRecommendations: product.excludeFromRecommendations === true,
    createdAt: createdAtValue,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Add a new product to Firestore `products` collection with document ID = slug
 */
export async function addProductToFirestore(product: CatalogProduct): Promise<void> {
  const docPath = `${PRODUCTS_COLLECTION}/${product.slug}`;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.slug);
    const existingSnap = await getDoc(docRef);

    if (existingSnap.exists()) {
      throw new Error(`A product with slug "${product.slug}" already exists in Firestore.`);
    }

    const payload = createProductPayload(product, serverTimestamp());

    await setDoc(docRef, payload);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

/**
 * Update an existing product in Firestore `products` collection
 */
export async function updateProductInFirestore(product: CatalogProduct, oldSlug?: string): Promise<void> {
  const docPath = `${PRODUCTS_COLLECTION}/${product.slug}`;
  try {
    const isSlugChanged = oldSlug && oldSlug !== product.slug;

    // If slug changed, delete old doc and set new doc
    if (isSlugChanged) {
      const newDocRef = doc(db, PRODUCTS_COLLECTION, product.slug);
      const newDocSnap = await getDoc(newDocRef);
      if (newDocSnap.exists()) {
        throw new Error(`Cannot rename slug. A product with slug "${product.slug}" already exists.`);
      }

      const payload = createProductPayload(
        product,
        product.createdAt ? new Date(product.createdAt) : serverTimestamp()
      );

      await setDoc(newDocRef, payload);
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, oldSlug));
    } else {
      const docRef = doc(db, PRODUCTS_COLLECTION, product.slug);
      const payload = createProductPayload(
        product,
        product.createdAt ? new Date(product.createdAt) : serverTimestamp(),
        true
      );

      await setDoc(docRef, payload, { merge: true });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

/**
 * Delete a product document from Firestore
 */
export async function deleteProductFromFirestore(slug: string): Promise<void> {
  const docPath = `${PRODUCTS_COLLECTION}/${slug}`;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, slug);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Toggle product active status in Firestore
 */
export async function toggleProductActiveInFirestore(slug: string, newActiveState: boolean): Promise<void> {
  const docPath = `${PRODUCTS_COLLECTION}/${slug}`;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, slug);
    await updateDoc(docRef, {
      isActive: newActiveState,
      active: newActiveState,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}
