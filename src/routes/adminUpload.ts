import { Router, Request, Response } from 'express';
import multer from 'multer';
import { adminAuth, adminDb, adminBucket } from '../lib/firebase-admin.ts';
import firebaseConfig from '../../firebase-applet-config.json';

const router = Router();

// Configure Multer in-memory storage with 5MB file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum size limit
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

router.post(
  '/api/admin/upload',
  (req: Request, res: Response, next) => {
    // Handle form upload for field 'file' or 'image'
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ])(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 5 MB limit.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      // 1. Read Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      }

      const token = authHeader.substring(7).trim();
      let decodedToken;
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (authError) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      // 2. Fetch user record from Firestore database
      const userRef = adminDb.collection('users').doc(decodedToken.uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return res.status(403).json({ error: 'Forbidden: User profile not found.' });
      }

      const userData = userSnap.data();
      if (userData?.role !== 'admin' || userData?.active !== true) {
        return res.status(403).json({ error: 'Forbidden: Requires active administrator role.' });
      }

      // 3. Retrieve and validate attached image file
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const file = files?.file?.[0] || files?.image?.[0];

      if (!file) {
        return res.status(400).json({ error: 'No image file provided in request.' });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Unsupported file type. Only JPEG, PNG, and WebP images are allowed.',
        });
      }

      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds 5 MB limit.' });
      }

      // 4. Sanitize filename and create storage path
      const originalName = file.originalname || 'upload.jpg';
      const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${Date.now()}_${sanitizedFilename}`;
      const storagePath = `products/${uniqueFileName}`;

      // 5. Upload file using Firebase Admin Storage SDK
      const blob = adminBucket.file(storagePath);
      await blob.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false,
      });

      try {
        await blob.makePublic();
      } catch {
        // Bucket-level permissions or ACL setting fallback
      }

      const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(
        storagePath
      )}?alt=media`;

      return res.status(200).json({
        storagePath,
        downloadURL,
        fileName: uniqueFileName,
        contentType: file.mimetype,
        size: file.size,
      });
    } catch (error: any) {
      console.error('Server upload error:', error?.message || error);
      return res.status(500).json({ error: 'Internal server error during upload.' });
    }
  }
);

export default router;
