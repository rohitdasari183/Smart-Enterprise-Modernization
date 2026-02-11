// src/app/api/v1/erp/sync-incremental/route.ts
import { NextResponse } from 'next/server';
import { syncTableIncremental } from '@/lib/incrementalSync';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // You can supply enterprise override or explicit table list
    const enterpriseOverride = body.enterprise || null;

    // Table config - prefer env override else defaults
    const config = [
      { table: process.env.ERP_TABLE_ENTERPRISE || 'companies', collection: 'enterprises', pkCol: process.env.ERP_PK_ENTERPRISE || 'id' },
      { table: process.env.ERP_TABLE_USERS || 'employees', collection: 'users', pkCol: process.env.ERP_PK_USERS || 'id' },
      { table: process.env.ERP_TABLE_ASSETS || 'vehicles', collection: 'assets', pkCol: process.env.ERP_PK_ASSETS || 'id' },
      { table: process.env.ERP_TABLE_TELEMETRY || 'telemetry_data', collection: 'telemetry', pkCol: process.env.ERP_PK_TELEMETRY || 'id' },
    ];

    const results: any = {};

    // If enterprise override provided, create or update enterprise doc first
    let enterpriseId: string | null = null;
    if (enterpriseOverride) {
      const ref = enterpriseOverride.id ? adminDb.collection('enterprises').doc(enterpriseOverride.id) : adminDb.collection('enterprises').doc();
      await ref.set({ ...enterpriseOverride, importedAt: Date.now() }, { merge: true });
      enterpriseId = ref.id;
      results.enterpriseId = enterpriseId;
    }

    // Run incremental sync for each configured table sequentially (you can run in parallel if desired)
    for (const c of config) {
      try {
        const mappingEnvVar = process.env.ERP_FIELD_MAPPING || '';
        const mappingAll = mappingEnvVar ? JSON.parse(mappingEnvVar) : {};
        const mapping = mappingAll[c.collection] ?? undefined;

        const res = await syncTableIncremental({
          table: c.table,
          collection: c.collection,
          pkCol: c.pkCol,
          mapping,
          enterpriseId,
        });
        results[c.collection] = res;
      } catch (err: any) {
        results[c.collection] = { error: String(err?.message ?? err) };
      }
    }

    // set job record in etlJobs for audit
    const jobRef = adminDb.collection('etlJobs').doc();
    await jobRef.set({ createdAt: Date.now(), summary: results });

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err: any) {
    console.error('sync-incremental error', err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
