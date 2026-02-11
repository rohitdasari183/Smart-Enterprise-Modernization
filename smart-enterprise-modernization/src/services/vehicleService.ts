import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import type { Vehicle } from '../types/vehicle';

export const getVehicles = async (
  enterpriseId?: string
): Promise<Vehicle[]> => {
  const col = collection(db, 'vehicles');
  const q = enterpriseId
    ? query(col, where('enterpriseId', '==', enterpriseId))
    : col;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Vehicle));
};

export const addVehicle = async (vehicle: Partial<Vehicle>) => {
  const ref = await addDoc(collection(db, 'vehicles'), {
    ...vehicle,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
};

export const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
  await updateDoc(doc(db, 'vehicles', id), updates);
};

export const deleteVehicle = async (id: string) => {
  await deleteDoc(doc(db, 'vehicles', id));
};
