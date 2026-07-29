import { getFirestore } from 'firebase/firestore/lite';
import { firebaseApp, firebaseConfig } from './firebase-app';

const databaseId = firebaseConfig.firestoreDatabaseId;

export const firestoreDb =
  !databaseId || databaseId === '(default)'
    ? getFirestore(firebaseApp)
    : getFirestore(firebaseApp, databaseId);
