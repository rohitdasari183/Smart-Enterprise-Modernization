import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// ✅ GET all assets
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const enterpriseId = searchParams.get("enterpriseId");

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      adminDb.collection("assets");

    if (enterpriseId) query = query.where("enterpriseId", "==", enterpriseId);

    const snapshot = await query.get();
    const assets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ count: assets.length, assets });
  } catch (err: any) {
    console.error("❌ Assets GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST new asset
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.enterpriseId || !body.name) {
      return NextResponse.json(
        { error: "enterpriseId and name required" },
        { status: 400 }
      );
    }

    const asset = {
      enterpriseId: body.enterpriseId,
      name: body.name,
      type: body.type ?? "vehicle",
      vin: body.vin ?? null,
      status: body.status ?? "Active",
      createdAt: Date.now(),
      imageUrl:
        body.imageUrl ??
        `https://picsum.photos/seed/${body.name.replace(/\s/g, "")}/400/200`,
    };

    const ref = await adminDb.collection("assets").add(asset);
    return NextResponse.json({ id: ref.id, ...asset }, { status: 201 });
  } catch (err: any) {
    console.error("❌ Assets POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
