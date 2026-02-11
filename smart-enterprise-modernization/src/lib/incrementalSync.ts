// src/lib/incrementalSync.ts
/**
 * Incremental sync helper
 *
 * Behavior:
 *  - Pulls rows from legacy DB tables in chunks using Knex.
 *  - Keeps checkpoint (last processed PK) per table in Firestore collection "etlCheckpoints".
 *  - Writes to Firestore collections in batches (BATCH_SIZE).
 *  - Preserves legacy IDs when found (id/vin/uuid), else generates Firestore doc id.
 *  - Safe to run repeatedly; idempotent (uses set(..., {merge: true})).
 */

import { getKnex } from './erpKnex';
import admin from 'firebase-admin';
import { adminDb } from './firebaseAdmin';

type Row = Record<string, any>;

const CHUNK_SIZE = Number(process.env.ERP_CHUNK_SIZE || 2000);
const BATCH_SIZE = Number(process.env.ERP_BATCH_SIZE || 500);
const CHECKPOINT_COLLECTION = 'etlCheckpoints'; // stores { table, lastPk, updatedAt }

function chooseIdFromRow(row: Row) {
  for (const k of ['id', 'id_str', 'vin', 'uuid', 'uid', 'asset_id', 'user_id']) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return String(row[k]);
  }
  return null;
}

async function getCheckpoint(table: string) {
  const ref = adminDb.collection(CHECKPOINT_COLLECTION).doc(table);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as { lastPk?: any; updatedAt?: number } | null;
}

async function setCheckpoint(table: string, lastPk: any) {
  const ref = adminDb.collection(CHECKPOINT_COLLECTION).doc(table);
  await ref.set({ lastPk, updatedAt: Date.now() }, { merge: true });
}

async function writeBatched(collectionName: string, docs: { id: string; data: Row }[]) {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    for (const d of chunk) {
      const ref = adminDb.collection(collectionName).doc(d.id);
      batch.set(ref, d.data, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Pull chunk from table using cursor on pk (preferred) or offset fallback.
 * - table: legacy table name
 * - pkCol: primary key column name (string) or null
 * - startAfter: starting pk value (cursor) or null
 */
async function pullChunk(table: string, pkCol: string | null, startAfter: any, limit = CHUNK_SIZE): Promise<Row[]> {
  const knex = getKnex();
  if (pkCol) {
    // cursor approach
    if (startAfter === null || startAfter === undefined) {
      const rows = await knex(table).select('*').orderBy(pkCol, 'asc').limit(limit);
      return rows as Row[];
    } else {
      const rows = await knex(table).select('*').where(pkCol, '>', startAfter).orderBy(pkCol, 'asc').limit(limit);
      return rows as Row[];
    }
  } else {
    // offset fallback (less efficient)
    // store offset in checkpoint if pkCol absent (not recommended for huge tables)
    const checkpoint = await getCheckpoint(table);
    const offset = checkpoint?.lastPk ? Number(checkpoint.lastPk) : 0;
    const rows = await knex(table).select('*').limit(limit).offset(offset);
    return rows as Row[];
  }
}

/**
 * Sync a legacy table into a Firestore collection incrementally.
 * Returns { inserted, lastPk }
 */
export async function syncTableIncremental(params: {
  table: string;           // legacy table name
  collection: string;      // target firestore collection
  pkCol?: string | null;   // primary key column in legacy DB
  idCandidates?: string[]; // prefered id columns
  mapping?: Record<string, string> | undefined; // optional mapping legacy->target
  enterpriseId?: string | null; // optional assign enterpriseId
}) {
  const { table, collection, pkCol = null, idCandidates = ['id', 'vin', 'uuid', 'asset_id', 'user_id'], mapping, enterpriseId } = params;
  const checkpoint = await getCheckpoint(table);
  const startAfter = checkpoint?.lastPk ?? null;

  let lastProcessed: any = startAfter;
  let totalInserted = 0;

  while (true) {
    const rows = await pullChunk(table, pkCol, lastProcessed, CHUNK_SIZE);
    if (!rows || rows.length === 0) break;

    const docsToWrite: { id: string; data: Row }[] = [];

    for (const r of rows) {
      // apply mapping if provided
      let doc: Row = {};
      if (mapping) {
        for (const k of Object.keys(r)) {
          const targetKey = mapping[k] ?? k;
          doc[targetKey] = r[k];
        }
      } else {
        doc = { ...r };
      }

      // add enterpriseId if provided
      if (enterpriseId) doc.enterpriseId = enterpriseId;

      // pick a stable id
      let docId: string | null = null;
      for (const cand of idCandidates) {
        if (doc[cand]) { docId = String(doc[cand]); break; }
      }
      if (!docId) {
        docId = adminDb.collection(collection).doc().id;
      }
      doc.id = docId;
      doc.importedAt = Date.now();

      docsToWrite.push({ id: docId, data: doc });
      totalInserted++;

      // update lastProcessed if pkCol present
      if (pkCol && r[pkCol] !== undefined && r[pkCol] !== null) {
        lastProcessed = r[pkCol];
      }
    }

    if (docsToWrite.length) {
      await writeBatched(collection, docsToWrite);
    }

    // save checkpoint
    if (pkCol) {
      await setCheckpoint(table, lastProcessed);
    } else {
      // offset fallback: increment offset
      const checkpointNow = await getCheckpoint(table);
      const prev = (checkpointNow?.lastPk && Number(checkpointNow.lastPk)) || 0;
      await setCheckpoint(table, prev + rows.length);
    }

    // small throttle to avoid hammering DB (tweakable)
    await new Promise((res) => setTimeout(res, 50));

    // continue loop until row count < CHUNK_SIZE (end)
    if (rows.length < CHUNK_SIZE) break;
  }

  return { inserted: totalInserted, lastPk: lastProcessed };
}
