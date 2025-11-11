import { encodeStateAsUpdate, Doc as YDoc } from 'yjs';
import type { CollaborationParams } from '@superdoc-dev/superdoc-yjs-collaboration';
import { Pool } from 'pg';

// Initialize your PostgreSQL connection pool
const pool = new Pool({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: true
});

/**
 * Load Yjs document state from PostgreSQL
 * Returns a properly encoded empty Yjs document if it doesn't exist or is invalid
 */
export const loadFromPostgres = async (documentId: string): Promise<Uint8Array> => {
  const result = await pool.query(
    `SELECT state FROM documents WHERE document_id = $1`,
    [documentId]
  );

  if (result.rows.length === 0) {
    console.log(`[Postgres] Document ${documentId} not found, returning empty encoded state`);
    // Return a properly encoded empty Yjs document
    const emptyDoc = new YDoc();
    return encodeStateAsUpdate(emptyDoc);
  }

  const state = result.rows[0].state;

  // If the state is empty (0 bytes), treat it as a new document
  if (!state || state.length === 0) {
    console.log(`[Postgres] Document ${documentId} has empty state, returning empty encoded state`);
    // Return a properly encoded empty Yjs document
    const emptyDoc = new YDoc();
    return encodeStateAsUpdate(emptyDoc);
  }

  console.log(`[Postgres] Loaded document ${documentId}, size: ${state.length} bytes`);
  return state;
};

/**
 * Save entire Yjs document state to PostgreSQL
 * Stores as binary BYTEA column
 */
export const saveToPostgres = async (params: CollaborationParams): Promise<void> => {
  const { documentId, document } = params;

  if (!document) {
    console.warn(`[Postgres] No document provided for ${documentId}, skipping save`);
    return;
  }

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

  console.log(`[Postgres] Saved document ${documentId}, size: ${state.length} bytes`);
};
