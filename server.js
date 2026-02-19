require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SECRET = process.env.JWT_SECRET || "losgarcias_secret";

// Crear tablas
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT,
      cost NUMERIC,
      price NUMERIC,
      stock INTEGER,
      minstock INTEGER,
      qr TEXT
    );
  `);

  console.log("Base de datos lista");
}

initDB();

// Crear admin inicial
app.get("/create-admin", async (req, res) => {
  const hash = await bcrypt.hash("admin123", 10);
  await pool.query(
    "INSERT INTO users (id, username, password, role) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING",
    [uuidv4(), "admin", hash, "admin"]
  );
  res.send("Admin creado");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (result.rows.length === 0)
    return res.status(401).send("Usuario no encontrado");

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).send("Contraseña incorrecta");

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET);

  res.json({ token });
});

app.get("/", (req, res) => {
  res.send("LOS GARCIAS API funcionando 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor corriendo"));
