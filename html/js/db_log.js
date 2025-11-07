// logger.js
import mariadb from 'mariadb';
import { DB_CONFIG, LOGGING } from './config.js';

let pool;

// Verbindungspool initialisieren
async function initPool() {
  if (!pool) {
    pool = mariadb.createPool({
      ...DB_CONFIG,
      connectionLimit: 5
    });
  }
  return pool;
}

// Tabelle automatisch anlegen (falls noch nicht existiert)
async function ensureLogTable() {
  const pool = await initPool();
  const sql = `
    CREATE TABLE IF NOT EXISTS ${LOGGING.table} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level VARCHAR(20),
      message TEXT,
      context JSON NULL
    );
  `;
  const conn = await pool.getConnection();
  await conn.query(sql);
  conn.release();
}

// Eintrag schreiben
export async function log(level, message, context = null) {
  try {
    const pool = await initPool();
    await ensureLogTable();
    const conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO ${LOGGING.table} (level, message, context) VALUES (?, ?, ?)`,
      [level, message, context ? JSON.stringify(context) : null]
    );
    conn.release();

    if (LOGGING.enableConsole)
      console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
  } catch (err) {
    console.error('Fehler beim Loggen:', err);
  }
}
