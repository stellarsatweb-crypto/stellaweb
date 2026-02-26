const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ================= POSTGRES CONNECTION ================= */

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'demo',
  password: '12345',
  port: 5432,
});

pool.connect()
  .then(() => console.log('Connected to PostgreSQL ✅'))
  .catch(err => {
    console.error('Database connection error ❌', err);
    process.exit(1);
  });

/* ================= CREATE TABLE ================= */

const createTable = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  id_no VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK 
    (role IN ('Executive','Finance','NOC','Admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(createTable)
  .then(() => console.log('Users table ready ✅'))
  .catch(err => console.error('Table creation error:', err));


/* ================= AUTH ROUTE ================= */

app.post('/api/auth', async (req, res) => {

  console.log("REQUEST BODY:", req.body);

  const { action, id_no, full_name, email, password, role } = req.body || {};

  try {

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action is required' });
    }

    /* ================= SIGN UP ================= */
    if (action === 'signup') {

      if (!id_no || !full_name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required'
        });
      }

      const trimmedId = id_no.trim();
      const trimmedName = full_name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      // Check existing user
      const existing = await pool.query(
        'SELECT id FROM users WHERE id_no = $1 OR email = $2',
        [trimmedId, trimmedEmail]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User already exists'
        });
      }

      // Hash password
      const hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (id_no, full_name, email, password_hash, role)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, id_no, full_name, email, role, created_at`,
        [trimmedId, trimmedName, trimmedEmail, hash, role]
      );

      return res.json({
        success: true,
        user: result.rows[0]
      });
    }

    /* ================= SIGN IN ================= */
    if (action === 'signin') {

      if (!id_no || !password) {
        return res.status(400).json({
          success: false,
          error: 'ID Number and password are required'
        });
      }

      const trimmedId = id_no.trim();

      const result = await pool.query(
        'SELECT * FROM users WHERE id_no = $1',
        [trimmedId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = result.rows[0];

      const validPassword = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      delete user.password_hash;

      return res.json({
        success: true,
        user
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action'
    });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

app.get("/api/terminals/:region", async (req, res) => {
  const { region } = req.params;

  const allowedTables = {
    benguet: "benguet_inventory",
    ifugao: "ifugao_inventory",
    ilocos: "ilocos_inventory",
    kalinga: "kalinga_inventory",
    pangasinan: "pangasinan_inventory",
    quezon: "quezon_inventory"
  };

  const table = allowedTables[region];

  if (!table) {
    return res.status(400).json({ error: "Invalid region" });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${table} LIMIT 100`);
    res.json(result.rows);
  } catch (err) {
    console.error("DB ERROR:", err.message);
    res.status(500).json({ error: "Database query failed" });
  }
});

/* ================= START SERVER ================= */

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});