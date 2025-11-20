import { encodeStateAsUpdate, Doc as YDoc } from 'yjs';
import type { CollaborationParams } from '@superdoc-dev/superdoc-yjs-collaboration';
import { Pool } from 'pg';

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  ssl: true
});

export const loadFromPostgres = async (documentId: string): Promise<Uint8Array | null> => {
  const result = await pool.query(
    `SELECT state FROM documents WHERE document_id = $1`,
    [documentId]
  );

  const state = result.rows[0]?.state || null;
  return state;
};

export const saveToPostgres = async (params: CollaborationParams): Promise<Boolean> => {
  const { documentId, document } = params;
  if (!document) return false;

  // Encode the entire document state as binary
  const state = encodeStateAsUpdate(document);

  // Store in database (upsert)
  await pool.query(
    `INSERT INTO documents (document_id, name, state, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (document_id)
     DO UPDATE SET name = $2, state = $3, updated_at = NOW()`,
    [documentId, 'Untitled Document', state]
  );

  return true;
};