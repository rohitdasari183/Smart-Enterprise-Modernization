import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// 📍 GET /api/v1/telemetry/:id
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const ref = adminDb.collection("telemetry").doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Telemetry record not found" }, { status: 404 });
    }

    return NextResponse.json({ id: snapshot.id, ...snapshot.data() }, { status: 200 });
  } catch (err: any) {
    console.error("❌ GET Telemetry Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📍 PUT /api/v1/telemetry/:id  (optional update)
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const ref = adminDb.collection("telemetry").doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Telemetry record not found" }, { status: 404 });
    }

    await ref.update({ ...body, updatedAt: Date.now() });

    return NextResponse.json({ message: "Telemetry updated successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("❌ PUT Telemetry Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📍 DELETE /api/v1/telemetry/:id
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ref = adminDb.collection("telemetry").doc(id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Telemetry record not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ message: "Telemetry deleted successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("❌ DELETE Telemetry Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
