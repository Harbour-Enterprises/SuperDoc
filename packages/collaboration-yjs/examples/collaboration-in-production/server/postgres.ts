import { encodeStateAsUpdate, applyUpdate, Doc as YDoc } from 'yjs';
import type { CollaborationParams } from '@superdoc-dev/superdoc-yjs-collaboration';
import { Pool } from 'pg';
import type { StorageFunction } from './storage-types.js';

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  ssl: true
});

export const loadFromPostgres: StorageFunction = async (id: string) => {
  const result = await pool.query(
    `SELECT state FROM documents WHERE document_id = $1`,
    [id]
  );

  const state = result.rows[0]?.state || null;
  return state;
};

export const saveToPostgres: StorageFunction = async (id: string, file?: Uint8Array) => {
  if (!file) return false;

  try {
    // Store in database (upsert)
    await pool.query(
      `INSERT INTO documents (document_id, name, state, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (document_id)
       DO UPDATE SET name = $2, state = $3, updated_at = NOW()`,
      [id, 'Untitled Document', file]
    );

    return true;
  } catch (error) {
    console.error('Error saving to Postgres:', error);
    return false;
  }
};