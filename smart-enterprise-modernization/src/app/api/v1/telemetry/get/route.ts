// src/app/api/v1/telemetry/get/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";

function parseTimeRange(range: string) {
  const now = Date.now();
  const map: Record<string, number> = {
    "1h": 60*60*1000,
    "6h": 6*60*60*1000,
    "24h": 24*60*60*1000,
    "7d": 7*24*60*60*1000,
    "30d": 30*24*60*60*1000,
  };
  return new Date(now - (map[range] ?? map["24h"]));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const enterpriseId = url.searchParams.get("enterpriseId");
    const vehicleId = url.searchParams.get("vehicleId");
    const timeRange = url.searchParams.get("timeRange") ?? "24h";

    if (!enterpriseId) return NextResponse.json({ error: "enterpriseId required" }, { status: 400 });

    const startDate = parseTimeRange(timeRange);
    let q;
    const telemetryRef = collection(db, "telemetry");

    if (vehicleId) {
      q = query(telemetryRef, where("enterpriseId", "==", enterpriseId), where("vehicleId", "==", vehicleId), where("timestamp", ">=", startDate.getTime()), orderBy("timestamp", "desc"));
    } else {
      q = query(telemetryRef, where("enterpriseId", "==", enterpriseId), where("timestamp", ">=", startDate.getTime()), orderBy("timestamp", "desc"));
    }

    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const avg = (key: string) => {
      const vals = rows.map(r => Number(r[key] ?? 0));
      return vals.length ? (vals.reduce((a,b) => a + b, 0)/vals.length) : 0;
    };

    return NextResponse.json({
      enterpriseId,
      vehicleId,
      timeRange,
      count: rows.length,
      avgSpeed: avg("speed").toFixed(2),
      avgTemp: avg("temperature").toFixed(2),
      avgPressure: avg("pressure").toFixed(2),
      avgBattery: avg("batteryLevel").toFixed(2),
      data: rows,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
