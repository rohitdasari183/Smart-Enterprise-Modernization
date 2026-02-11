// src/app/api/v1/enterprise/import/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // Admin Firestore
import admin from "firebase-admin"; // for Realtime DB
import { legacyAdapter } from "@/lib/legacyAdapter";

/**
 * POST /api/v1/enterprise/import
 * Accepts enterprise exports (JSON arrays or legacy payload) and writes normalized records
 * into Firestore 'enterprises', 'users', 'vehicles' (or 'assets'), and 'telemetry' collections,
 * and also into Realtime Database under /realtime/<enterpriseId>/...
 *
 * NOTE: This endpoint is for ingestion (used by IT teams / ETL). Protect it in production.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { enterprise, users = [], assets = [], telemetry = [], legacy } = body;

    if (!enterprise || !enterprise.name) {
      return NextResponse.json({ error: "enterprise object with name required" }, { status: 400 });
    }

    // 1) Create enterprise doc in Firestore
    const entRef = await adminDb.collection("enterprises").add({
      ...enterprise,
      createdAt: Date.now(),
    });
    const enterpriseId = entRef.id;

    // 2) Write users (bulk)
    if (Array.isArray(users) && users.length) {
      const userBatch = adminDb.batch();
      for (const u of users) {
        const uRef = adminDb.collection("users").doc();
        userBatch.set(uRef, {
          id: uRef.id,
          enterpriseId,
          ...u,
          createdAt: Date.now(),
        });
      }
      await userBatch.commit();
    }

    // 3) Write assets (vehicles / equipment)
    if (Array.isArray(assets) && assets.length) {
      const assetBatch = adminDb.batch();
      for (const a of assets) {
        const aRef = adminDb.collection("assets").doc();
        assetBatch.set(aRef, {
          id: aRef.id,
          enterpriseId,
          ...a,
          createdAt: Date.now(),
        });
      }
      await assetBatch.commit();
    }

    // 4) Write telemetry (bulk)
    if (Array.isArray(telemetry) && telemetry.length) {
      const teleBatch = adminDb.batch();
      for (const t of telemetry) {
        const tRef = adminDb.collection("telemetry").doc();
        teleBatch.set(tRef, {
          id: tRef.id,
          enterpriseId,
          ...t,
          timestamp: t.timestamp ?? Date.now(),
        });
      }
      await teleBatch.commit();
    }

    // 5) If legacy payload exists, modernize via legacyAdapter and store results
    if (legacy) {
      // legacyAdapter returns a modernized object or array
      const modern = await legacyAdapter(adminDb, enterpriseId, legacy);
      // store under modernized_legacy collection (legacyAdapter may already store)
      // we add a reference to enterprise for traceability
      if (modern && !(modern.id)) {
        await adminDb.collection("modernized_legacy").add({ enterpriseId, ...modern, migratedAt: Date.now() });
      }
    }

    // 6) Also write a lightweight mirror into Realtime Database (Optional)
    try {
      if (admin.apps && admin.apps.length) {
        const rdb = admin.database();
        await rdb.ref(`/realtime/${enterpriseId}/meta`).set({
          id: enterpriseId,
          name: enterprise.name,
          createdAt: Date.now(),
          counts: {
            users: Array.isArray(users) ? users.length : 0,
            assets: Array.isArray(assets) ? assets.length : 0,
            telemetry: Array.isArray(telemetry) ? telemetry.length : 0,
          },
        });
      }
    } catch (rdbErr) {
      // ignore rdb failures but log
      console.warn("Realtime DB write skipped:", rdbErr);
    }

    return NextResponse.json({
      message: "Enterprise imported successfully",
      enterpriseId,
      users: users.length,
      assets: assets.length,
      telemetry: telemetry.length,
    });
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
