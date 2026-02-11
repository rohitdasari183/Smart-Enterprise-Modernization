// src/services/enterpriseService.ts
// # Firebase Web config (client)
// NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbomQAC_x2HFt31MmGXxiw_JBQBqUS7JU
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=smart-enterprise-modernizer.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=smart-enterprise-modernizer
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=smart-enterprise-modernizer.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=491930273397
// NEXT_PUBLIC_FIREBASE_APP_ID=1:491930273397:web:2e56ebb0b4906447891a3c

// # Firebase admin (server)
// FIREBASE_SERVICE_ACCOUNT_JSON="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCcMf/R2ZFRY3/6\n...<rest of your key>...\n-----END PRIVATE KEY-----\n"

// FIREBASE_DATABASE_URL=https://smart-enterprise-modernizer-default-rtdb.firebaseio.com/

import { db } from '@/lib/firebaseClient';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

export interface Enterprise {
  id?: string;
  name: string;
  industry: string;
  location: string;
  status: 'active' | 'inactive';
  lastUpdated?: string;
}

/**
 * Fetch all enterprises from Firestore (with safe id handling)
 */
export async function getEnterprises(): Promise<Enterprise[]> {
  const snapshot = await getDocs(collection(db, 'enterprises'));
  const enterprises: Enterprise[] = [];

  snapshot.forEach((d) => {
    const data = d.data();
    enterprises.push({
      ...(data as Omit<Enterprise, 'id'>),
      id: d.id, // Explicitly append Firestore ID
    });
  });

  return enterprises;
}

/**
 * Fetch a single enterprise by ID
 */
export async function getEnterpriseById(
  id: string
): Promise<Enterprise | null> {
  const docRef = doc(db, 'enterprises', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Enterprise, 'id'>) };
}

/**
 * Add a new enterprise
 */
export async function addEnterprise(data: Omit<Enterprise, 'id'>) {
  const ref = await addDoc(collection(db, 'enterprises'), {
    ...data,
    lastUpdated: new Date().toISOString(),
  });
  return ref.id;
}

/**
 * Update enterprise dynamically
 */
export async function updateEnterprise(
  id: string,
  updates: Partial<Enterprise>
) {
  const ref = doc(db, 'enterprises', id);
  await updateDoc(ref, { ...updates, lastUpdated: new Date().toISOString() });
}

/**
 * Delete an enterprise
 */
export async function deleteEnterprise(id: string) {
  const ref = doc(db, 'enterprises', id);
  await deleteDoc(ref);
}
