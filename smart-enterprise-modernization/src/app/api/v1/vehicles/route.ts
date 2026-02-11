// src/app/api/v1/vehicles/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
  try {
    const q = adminDb.collection('assets').orderBy('createdAt', 'desc');
    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(items);
  } catch (err: any) {
    console.error('GET /api/v1/vehicles error', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = { ...body, createdAt: Date.now() };
    const ref = body.id ? adminDb.collection('assets').doc(body.id) : adminDb.collection('assets').doc();
    await ref.set(payload, { merge: true });
    return NextResponse.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/v1/vehicles error', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
