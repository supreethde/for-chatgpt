import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from './firebase';
import { UploadProgressCallback, UploadResult } from '../types';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type and size.
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || 'unknown'}). Only JPEG, PNG, and WebP images are allowed.`,
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

/**
 * Generates a clean, unique file path under products/{productId}/
 */
export function generateStoragePath(productId: string, filename: string): string {
  const sanitizedFilename = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const cleanProductId = productId || 'temp';
  return `products/${cleanProductId}/${uniqueId}_${sanitizedFilename}`;
}

/**
 * Uploads a validated image file to Firebase Storage under products/{productId}/
 */
export function uploadProductImage(
  file: File,
  productId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // 1. Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return reject(new Error(validation.error || 'Invalid file'));
    }

    // 2. Generate storage path and reference
    const path = generateStoragePath(productId, file.name);
    const storageRef = ref(storage, path);

    // 3. Start resumable upload
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      }
    });

    // 4. Track progress and state changes
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        let errorMessage = 'Failed to upload image to Firebase Storage.';
        if (error.code === 'storage/unauthorized') {
          errorMessage = 'Permission denied: Admin authorization required to upload product images.';
        } else if (error.code === 'storage/canceled') {
          errorMessage = 'Image upload was canceled.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        reject(new Error(errorMessage));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url,
            path,
          });
        } catch (err) {
          reject(new Error('Failed to retrieve download URL for uploaded image.'));
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
