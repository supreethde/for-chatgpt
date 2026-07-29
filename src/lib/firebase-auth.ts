import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { firebaseApp } from './firebase-app';

export const auth = getAuth(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();
