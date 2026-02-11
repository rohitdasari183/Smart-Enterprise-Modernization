// src/app/api/v1/telemetry/add/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const enterpriseId = body.enterpriseId || null;
    const vehicleId = body.vehicleId || body.vin || body.id;
    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId required' }, { status: 400 });
    }

    const telemetry = {
      enterpriseId,
      vehicleId,
      speed: body.speed ?? null,
      temperature: body.temperature ?? null,
      pressure: body.pressure ?? null,
      batteryLevel: body.batteryLevel ?? null,
      location: body.location ?? null,
      timestamp: body.timestamp ?? Date.now(),
      meta: body.meta ?? {},
      createdAt: Date.now(),
    };

    const ref = await adminDb.collection('telemetry').add(telemetry);

    // update asset summary
    await adminDb.collection('assets').doc(vehicleId).set({
      lastSeen: telemetry.timestamp,
      lastTelemetry: telemetry,
    }, { merge: true });

    return NextResponse.json({ ok: true, id: ref.id, telemetry });
  } catch (err: any) {
    console.error('POST /api/v1/telemetry/add error', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
