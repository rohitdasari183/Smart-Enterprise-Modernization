import { NextResponse } from "next/server";
import { syncLegacyERP } from "@/lib/legacyAdapter";

export async function GET() {
  try {
    await syncLegacyERP();
    return NextResponse.json({ ok: true, message: "ERP → Firestore sync completed successfully!" });
  } catch (err: any) {
    console.error("Sync API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
