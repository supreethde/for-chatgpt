import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage, auth } from './firebase';
import { UploadProgressCallback, UploadResult } from '../types';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type (JPG, JPEG, PNG, WebP, GIF) and size (<= 5MB).
 */
export function validateImageFile(file: File): FileValidationResult {
  const fileType = file.type?.toLowerCase();
  const validMime = ALLOWED_IMAGE_TYPES.includes(fileType);
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');

  if (!validMime && !validExt) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || ext || 'unknown'}). Only JPG, JPEG, PNG, WebP, and GIF images are allowed.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMB} MB) exceeds the 5 MB limit.`,
    };
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Generates a clean, unique file path under products/{product-slug}/{timestamp}-{sanitized-filename}
 */
export function generateStoragePath(productSlug: string, filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const cleanSlug = productSlug
    ? productSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
    : 'product';
  const timestamp = Date.now();
  return `products/${cleanSlug}/${timestamp}-${sanitized}`;
}

/**
 * Uploads a validated image file directly to Firebase Storage using the Firebase Web SDK.
 */
export async function uploadProductImage(
  file: File,
  productSlug: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required: Admin login required to upload product images.');
  }

  const storagePath = generateStoragePath(productSlug, file.name);
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        reject(new Error(error.message || 'Image upload failed.'));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: storagePath,
          });
        } catch (err: any) {
          reject(new Error(err.message || 'Failed to retrieve download URL.'));
        }
      }
    );
  });
}

/**
 * Deletes a single image from Firebase Storage given its storage path.
 */
export async function deleteProductImage(storagePath: string): Promise<void> {
  if (!storagePath || storagePath.trim() === '') {
    return;
  }

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    // If object does not exist or was already deleted, ignore storage/object-not-found
    if (error?.code === 'storage/object-not-found') {
      console.warn(`Storage object not found at path "${storagePath}", skipping deletion.`);
      return;
    }
    console.error(`Error deleting image at path "${storagePath}":`, error);
    throw new Error(error?.message || `Failed to delete image at path "${storagePath}"`);
  }
}

/**
 * Deletes multiple images from Firebase Storage given an array of storage paths.
 */
export async function deleteProductImageBatch(storagePaths: string[]): Promise<void> {
  const validPaths = storagePaths.filter((p) => p && p.trim().length > 0);
  if (validPaths.length === 0) return;

  const results = await Promise.allSettled(
    validPaths.map((p) => deleteProductImage(p))
  );

  const errors = results.filter((r) => r.status === 'rejected');
  if (errors.length > 0) {
    console.warn(`Encountered ${errors.length} error(s) during batch deletion of product images.`);
  }
}
