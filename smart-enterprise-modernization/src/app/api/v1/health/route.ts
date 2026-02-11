import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Smart Enterprise Modernization API running successfully ✅",
    timestamp: Date.now(),
  });
}
