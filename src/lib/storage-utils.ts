import { 
  ref, 
  deleteObject 
} from 'firebase/storage';
import { storage, auth } from './firebase';
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
 * Uploads a validated image file using the server Admin upload API endpoint
 */
export async function uploadProductImage(
  file: File,
  productId: string,
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

  const idToken = await currentUser.getIdToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.downloadURL,
            path: data.storagePath,
          });
        } catch {
          reject(new Error('Invalid server response during image upload.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during image upload.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
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
