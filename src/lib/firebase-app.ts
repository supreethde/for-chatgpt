import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

export const firebaseApp = initializeApp(firebaseConfig);
export { firebaseConfig };
