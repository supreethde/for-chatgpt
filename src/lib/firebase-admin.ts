import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: App | null = null;

function getAdminApp(): App {
  if (!appInstance) {
    if (!getApps().length) {
      appInstance = initializeApp({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
    } else {
      appInstance = getApp();
    }
  }
  return appInstance;
}

export const getAdminAuth = () => getAuth(getAdminApp());

export const getAdminDb = () => {
  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId;
  return !dbId || dbId === '(default)' ? getFirestore(app) : getFirestore(app, dbId);
};

export const getAdminBucket = () => {
  const app = getAdminApp();
  return getStorage(app).bucket(firebaseConfig.storageBucket);
};

// Lazy proxy objects to ensure startup never crashes at module load time
export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop, receiver) {
    const authObj = getAdminAuth() as any;
    const value = Reflect.get(authObj, prop, receiver);
    return typeof value === 'function' ? value.bind(authObj) : value;
  },
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop, receiver) {
    const dbObj = getAdminDb() as any;
    const value = Reflect.get(dbObj, prop, receiver);
    return typeof value === 'function' ? value.bind(dbObj) : value;
  },
});

export const adminBucket = new Proxy({} as ReturnType<ReturnType<typeof getStorage>['bucket']>, {
  get(_target, prop, receiver) {
    const bucketObj = getAdminBucket() as any;
    const value = Reflect.get(bucketObj, prop, receiver);
    return typeof value === 'function' ? value.bind(bucketObj) : value;
  },
});

