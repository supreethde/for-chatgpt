import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  CataloguePreferences,
  CataloguePreferencesInput,
} from '../features/personalization/types';

const PREFERENCES_COLLECTION = 'cataloguePreferences';

export async function fetchCataloguePreferences(
  userId: string
): Promise<CataloguePreferences | null> {
  const snapshot = await getDoc(doc(db, PREFERENCES_COLLECTION, userId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  if (!data.businessType) return null;

  return {
    enabled: data.enabled !== false,
    businessType: data.businessType,
    cuisine: data.cuisine || undefined,
    averageDailyCovers:
      typeof data.averageDailyCovers === 'number' ? data.averageDailyCovers : undefined,
    interestedCategories: Array.isArray(data.interestedCategories)
      ? data.interestedCategories
      : [],
    updatedAt: data.updatedAt?.toDate
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt || undefined,
  } as CataloguePreferences;
}

export async function saveCataloguePreferences(
  userId: string,
  preferences: CataloguePreferencesInput
): Promise<CataloguePreferences> {
  const normalized: CataloguePreferences = {
    ...preferences,
    enabled: true,
    interestedCategories: preferences.interestedCategories || [],
  };

  await setDoc(
    doc(db, PREFERENCES_COLLECTION, userId),
    {
      ...normalized,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return normalized;
}

export async function disableCataloguePreferences(userId: string): Promise<void> {
  await setDoc(
    doc(db, PREFERENCES_COLLECTION, userId),
    {
      enabled: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
