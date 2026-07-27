import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { CatalogProduct } from '../types';

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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
      const rawVariants = data.variants || [];
      const normalizedVariants = rawVariants.map((v: any, index: number) => {
        const sellingPrice = typeof v.sellingPrice === 'number' ? v.sellingPrice : (typeof v.price === 'number' ? v.price : 0);
        const previousPrice = typeof v.previousPrice === 'number' ? v.previousPrice : (typeof v.mrp === 'number' ? v.mrp : undefined);
        return {
          id: v.id || `var_${index + 1}_${Math.random().toString(36).substring(2, 7)}`,
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

      const product: CatalogProduct = {
        id: docSnap.id,
        name: data.name || '',
        slug: data.slug || docSnap.id,
        category: data.category || 'Vegetables',
        scientificName: data.scientificName || '',
        displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : (data.order || 100),
        shortIntro: data.shortIntro || data.shortIntroduction || '',
        highlights: data.highlights || data.keyHighlights || [],
        description: data.description || '',
        regionalNameKannada: data.regionalNameKannada || data.regionalNames?.kannada || '',
        regionalNameHindi: data.regionalNameHindi || data.regionalNames?.hindi || '',
        images: data.images || [],
        variants: normalizedVariants,
        isActive: data.isActive ?? data.active ?? true,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
      };
      products.push(product);
    });

    return products;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
    return [];
  }
}

function formatVariantsForFirestore(variants: CatalogProduct['variants']) {
  return (variants || []).map((v) => {
    const sellingPrice = typeof v.sellingPrice === 'number' ? v.sellingPrice : (typeof v.price === 'number' ? v.price : 0);
    const previousPrice = typeof v.previousPrice === 'number' ? v.previousPrice : (typeof v.mrp === 'number' ? v.mrp : undefined);

    const formatted: any = {
      id: v.id,
      sourcingTier: v.sourcingTier,
      label: v.label,
      sellingPrice,
      stockStatus: v.stockStatus || 'in_stock',
      // Legacy alias for compatibility
      price: sellingPrice,
    };

    if (previousPrice !== undefined) {
      formatted.previousPrice = previousPrice;
      formatted.mrp = previousPrice;
    }

    if (v.note && v.note.trim()) {
      formatted.note = v.note.trim();
    }

    return formatted;
  });
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

    const payload = {
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
      variants: formatVariantsForFirestore(product.variants),
      isActive: product.isActive,
      active: product.isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

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

      const payload = {
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
        variants: formatVariantsForFirestore(product.variants),
        isActive: product.isActive,
        active: product.isActive,
        createdAt: product.createdAt ? new Date(product.createdAt) : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newDocRef, payload);
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, oldSlug));
    } else {
      const docRef = doc(db, PRODUCTS_COLLECTION, product.slug);
      const payload = {
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
        variants: formatVariantsForFirestore(product.variants),
        isActive: product.isActive,
        active: product.isActive,
        updatedAt: serverTimestamp(),
      };

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
