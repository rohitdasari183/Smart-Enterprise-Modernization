import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const snap = await adminDb.collection('analytics').doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (err: any) {
    console.error('GET /api/v1/analytics/[id] error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    await adminDb.collection('analytics').doc(id).set({ ...body, lastUpdated: Date.now() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('PUT /api/v1/analytics/[id] error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await adminDb.collection('analytics').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/v1/analytics/[id] error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
