import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { legacyAdapter } from "@/lib/legacyAdapter";

// Parse uploaded JSON data (file or text)
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let data: any;

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("text/csv")) {
      const csvText = await req.text();
      data = parseCSV(csvText); // convert CSV to array of objects
    } else {
      return NextResponse.json(
        { error: "Unsupported file format (use JSON or CSV)" },
        { status: 400 }
      );
    }

    if (!data.enterprise?.name) {
      return NextResponse.json(
        { error: "Enterprise object with name required" },
        { status: 400 }
      );
    }

    // Create enterprise doc
    const enterpriseRef = await adminDb.collection("enterprises").add({
      ...data.enterprise,
      createdAt: Date.now(),
    });
    const enterpriseId = enterpriseRef.id;

    // Send to legacyAdapter (handles Firestore + RTDB)
    const result = await legacyAdapter(adminDb, enterpriseId, data);

    return NextResponse.json({
      message: "Upload successful",
      enterpriseId,
      summary: result,
    });
  } catch (err: any) {
    console.error("❌ Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Simple CSV parser (only for developer testing)
function parseCSV(csvText: string) {
  const [headerLine, ...lines] = csvText.trim().split("\n");
  const headers = headerLine.split(",").map((h) => h.trim());
  const records = lines.map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: any = {};
    headers.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });
  return { users: records };
}
