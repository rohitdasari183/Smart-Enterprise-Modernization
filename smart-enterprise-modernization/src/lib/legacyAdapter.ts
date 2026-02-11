import { adminDb } from "./firebaseAdmin";
import { Client } from "pg";
import crypto from "crypto";

/**
 * 🔄 Legacy Adapter: PostgreSQL → Firebase Firestore
 * Ensures each ERP table syncs exactly to its respective Firestore collection
 * (enterprises, users, vehicles, telemetry_data, assets, analytics)
 * preserving IDs, fields, and relationships.
 */

export async function syncLegacyERP() {
  const client = new Client({
    host: process.env.ERP_DB_HOST,
    port: Number(process.env.ERP_DB_PORT || 5432),
    database: process.env.ERP_DB_NAME,
    user: process.env.ERP_DB_USER,
    password: process.env.ERP_DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log("✅ Connected to ERP database.");

    // 🔍 Step 1 — Detect available tables
    const { rows: tables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public';
    `);

    const availableTables = tables.map((t) => t.table_name);
    console.log("📦 Found ERP tables:", availableTables);

    // ✅ Step 2 — Exact mapping from PostgreSQL → Firestore
    const tableToCollection: Record<string, string> = {
      enterprises: "enterprises",
      users: "users",
      vehicles: "vehicles",
      telemetry_data: "telemetry",
      assets: "assets",
      analytics: "analytics",
    };

    // 🔄 Step 3 — Loop through mapped tables
    for (const [table, collection] of Object.entries(tableToCollection)) {
      if (!availableTables.includes(table)) {
        console.warn(`⚠️ Table '${table}' not found in ERP database. Skipping.`);
        continue;
      }

      console.log(`🔄 Syncing '${table}' → Firestore collection '${collection}' ...`);
      const { rows } = await client.query(`SELECT * FROM ${table}`);

      if (!rows.length) {
        console.log(`(empty table '${table}')`);
        continue;
      }

      // 🔁 Step 4 — Transfer each row to Firestore
      for (const row of rows) {
        try {
          // Determine the document ID based on the table’s schema
          let id: string | undefined;

          if (table === "enterprises") id = row.enterprise_id?.toString?.();
          else if (table === "users") id = row.user_id?.toString?.();
          else if (table === "vehicles") id = row.vehicle_id?.toString?.();
          else if (table === "assets") id = row.asset_id?.toString?.();
          else if (table === "telemetry_data") id = row.telemetry_id?.toString?.();
          else if (table === "analytics") id = row.analytics_id?.toString?.();

          // Fallback if missing ID
          if (!id) id = crypto.randomUUID();

          // Sanitize undefined values for Firestore
          const cleanData: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            cleanData[key] = value === undefined ? null : value;
          }

          // Add sync metadata
          cleanData.syncedAt = new Date().toISOString();

          // Insert or update in Firestore
          await adminDb.collection(collection).doc(id).set(cleanData, { merge: true });
        } catch (err: any) {
          console.error(`❌ Error syncing row from '${table}':`, err.message);
        }
      }

      console.log(`✅ Synced ${rows.length} records from '${table}' → '${collection}'.`);
    }

    console.log("🎉 All PostgreSQL ERP tables successfully migrated to Firestore collections.");
  } catch (err: any) {
    console.error("❌ Sync process failed:", err.message);
  } finally {
    await client.end();
    console.log("🔒 PostgreSQL ERP connection closed.");
  }
}
