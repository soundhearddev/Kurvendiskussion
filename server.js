// Simple Express server that accepts logs and writes them to MySQL
// Usage: set env vars DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (optional DB_PORT and PORT)

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'kurvendb',
  DB_PORT = 3306,
  PORT = 3000
} = process.env;

async function createPool() {
  try {
    const pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: Number(DB_PORT),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // quick test
    await pool.query('SELECT 1');
    console.log('Connected to MySQL at', DB_HOST);
    return pool;
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message || err);
    process.exit(1);
  }
}

let pool;
createPool().then(p => { pool = p; });

// Ensure the logs table exists (best-effort)
async function ensureTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(32),
        message TEXT,
        context JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Ensured logs table exists');
  } catch (err) {
    console.warn('Could not ensure logs table:', err.message || err);
  }
}

app.post('/log', async (req, res) => {
  const payload = req.body || {};
  const { level = 'info', message = null, context = null } = payload;

  if (!pool) {
    return res.status(500).json({ error: 'db not ready' });
  }

  try {
    await ensureTable();
    const [result] = await pool.execute(
      'INSERT INTO logs (level, message, context) VALUES (?, ?, ?)',
      [level, message, JSON.stringify(context)]
    );

    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error('DB insert error:', err);
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/', (req, res) => res.json({ ok: true, msg: 'Log server running' }));

app.listen(Number(PORT), () => {
  console.log(`Log server listening on port ${PORT}`);
});
