// src/services/crudService.ts
import { db } from '@/lib/firebaseClient';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { toast } from 'sonner'; // ✅ import Sonner

export async function listCollection(name: string) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDocument(name: string, id: string) {
  const ref = doc(db, name, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createDocument(name: string, data: any) {
  const ref = data.id ? doc(db, name, data.id) : doc(collection(db, name));
  await setDoc(ref, { ...data, createdAt: Date.now() }, { merge: true });
  toast.success(`New ${name.slice(0, -1)} created successfully 🚀`, {
    style: { background: '#0f172a', color: '#f8fafc', border: '1px solid #22c55e' },
  });
}

export async function updateDocument(name: string, id: string, data: any) {
  const ref = doc(db, name, id);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
  toast.info(`${name.slice(0, -1)} updated successfully ✨`, {
    style: { background: '#1e3a8a', color: '#f8fafc', border: '1px solid #3b82f6' },
  });
}

export async function deleteDocument(name: string, id: string) {
  await deleteDoc(doc(db, name, id));
  toast.error(`${name.slice(0, -1)} deleted ⚠️`, {
    style: { background: '#450a0a', color: '#fef2f2', border: '1px solid #ef4444' },
  });
}
