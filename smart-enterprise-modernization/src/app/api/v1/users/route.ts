// src/app/api/v1/users/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
  try {
    const snap = await adminDb.collection('users').orderBy('createdAt', 'desc').get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(items);
  } catch (err: any) {
    console.error('GET /api/v1/users error', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = { ...body, createdAt: Date.now() };
    const ref = body.id ? adminDb.collection('users').doc(body.id) : adminDb.collection('users').doc();
    await ref.set(payload, { merge: true });
    return NextResponse.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/v1/users error', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
