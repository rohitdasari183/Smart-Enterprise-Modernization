// src/app/api/v1/telemetry/add/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const enterpriseId = body.enterpriseId;
    const vehicleId = body.vehicleId || body.id || body.vin;

    if (!enterpriseId || !vehicleId) {
      return NextResponse.json({ error: "enterpriseId and vehicleId required" }, { status: 400 });
    }

    const telemetry = {
      enterpriseId,
      vehicleId,
      speed: body.speed ?? Math.floor(Math.random() * 120),
      temperature: body.temperature ?? (20 + Math.random() * 25),
      pressure: body.pressure ?? (30 + Math.random() * 10),
      batteryLevel: body.batteryLevel ?? Math.floor(50 + Math.random() * 50),
      location: body.location ?? null,
      timestamp: Date.now(),
      meta: body.meta ?? {},
    };

    const ref = await adminDb.collection("telemetry").add(telemetry);
    // update vehicle document summary
    await adminDb.collection("vehicles").doc(vehicleId).set({ lastSeen: telemetry.timestamp, telemetry }, { merge: true });

    return NextResponse.json({ ok: true, id: ref.id, telemetry });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
