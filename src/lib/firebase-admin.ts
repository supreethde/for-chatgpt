import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length
  ? initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    })
  : getApp();

export const adminAuth = getAuth(app);
const dbId = firebaseConfig.firestoreDatabaseId;
export const adminDb = !dbId || dbId === '(default)' ? getFirestore(app) : getFirestore(app, dbId);
export const adminBucket = getStorage(app).bucket(firebaseConfig.storageBucket);

