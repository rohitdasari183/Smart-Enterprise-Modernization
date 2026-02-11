import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const snap = await adminDb.collection('enterprises').doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (err: any) {
    console.error('GET /api/v1/enterprise/[id] error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const ref = adminDb.collection('enterprises').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await ref.set({ ...body, updatedAt: Date.now() }, { merge: true });
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error('PUT /api/v1/enterprise/[id] error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await adminDb.collection('enterprises').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/v1/enterprise/[id] error', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
