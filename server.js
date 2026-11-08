/* =====================================================================
 * server.js — Server opsional (Node.js + Express)
 * ------------------------------------------------------------------
 * Fungsi:
 *   1. Menyimpan data (settings, menu, orders) di server (JSON file),
 *      sehingga data tersimpan permanen dan bisa diakses dari device lain.
 *   2. Menyediakan endpoint API:
 *        GET  /api/health
 *        GET  /api/data/<key>       — baca data
 *        POST /api/data/<key>       — simpan data
 *        GET  /api/orders           — daftar semua pesanan
 *        POST /api/orders           — tambah pesanan baru
 *        PATCH /api/orders/<id>     — ubah status pesanan
 *   3. Menjelajahi folder public sebagai static files (index.html, admin.html, dll)
 *
 * Cara menjalankan:
 *   npm install express
 *   node server.js
 *   Buka http://localhost:3000
 *
 * Catatan: Jika dijalankan di hosting gratis (Render, Railway, Glitch),
 * data disimpan di data.json. Untuk produksi, ganti dengan database.
 * ===================================================================== */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

/* ---------- Load / save data ---------- */
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static(__dirname));

/* ---------- API routes ---------- */
// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, mode: "server" });
});

// Read data by key
app.get("/api/data/:key", (req, res) => {
  const data = loadData();
  const value = data[req.params.key];
  if (value === undefined) return res.status(404).json({ error: "not found" });
  res.json(value);
});

// Save data by key
app.post("/api/data/:key", (req, res) => {
  const data = loadData();
  data[req.params.key] = req.body;
  saveData(data);
  res.json({ ok: true });
});

// Get all orders
app.get("/api/orders", (req, res) => {
  const data = loadData();
  res.json(data.orders || []);
});

// Add new order
app.post("/api/orders", (req, res) => {
  const data = loadData();
  data.orders = data.orders || [];
  data.orders.unshift(req.body);
  saveData(data);
  res.json(req.body);
});

// Update order status
app.patch("/api/orders/:id", (req, res) => {
  const data = loadData();
  data.orders = data.orders || [];
  const order = data.orders.find((o) => o.id === req.params.id);
  if (order) order.status = req.body.status;
  saveData(data);
  res.json({ ok: true });
});

/* ---------- Start ---------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`☕ Warung kopi server berjalan di http://localhost:${PORT}`);
  console.log(`📁 Data disimpan di ${DATA_FILE}`);
  console.log(`📋 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`💡 Login admin: 666666`);

  // Auto-open browser (local only)
  const isLocal = !process.env.PORT; // PORT env = cloud deploy
  if (isLocal) {
    try {
      const { exec } = require("child_process");
      const url = `http://localhost:${PORT}/admin.html`;
      if (process.platform === "win32") exec(`start "" ${url}`);
      else if (process.platform === "darwin") exec(`open ${url}`);
      else if (process.platform === "linux") exec(`xdg-open ${url} 2>/dev/null &`);
    } catch (e) { /* ignore */ }
  }
});
