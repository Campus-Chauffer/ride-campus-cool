const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                 // max 20 simultaneous DB connections
  min: 2,                  // keep 2 connections warm at all times
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if no connection available in 5s
  ssl: { rejectUnauthorized: false },
});

// Log pool errors so they don't crash the process silently
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

module.exports = pool;