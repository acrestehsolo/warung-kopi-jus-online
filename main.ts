// ===================================================================
// api/deno.ts — Backend pusat untuk Warung Kopi Mas Wahyu
// Menjalankan API yang sama seperti server.js (Express),
// tapi berjalan di Deno Deploy dengan Deno KV sebagai penyimpanan
// yang persisten & global (tidak tidur, gratis).
//
// Route:
//   GET    /api/health
//   GET    /api/data/:key        (settings / menu / orders)
//   POST   /api/data/:key
//   GET    /api/orders
//   POST   /api/orders           (tambah order)
//   PATCH  /api/orders/:id       (ubah status order)
//
// Semua response pakai CORS * supaya bisa dipanggil dari
// GitHub Pages (acrestehsolo.github.io) — origin berbeda.
// ===================================================================

const kv = await Deno.openKv();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Wrapper KV yang defensif: kalau KV gagal, kembalikan null / jangan throw
async function kvGet(key) {
  try {
    const entry = await kv.get(key);
    return entry.value;
  } catch {
    return null;
  }
}
async function kvSet(key, value) {
  try {
    await kv.set(key, value);
  } catch {
    /* ignore */
  }
}

// Helper: baca seluruh array order dari KV (key = "orders")
async function getOrdersArr() {
  const v = await kvGet("orders");
  return Array.isArray(v) ? v : [];
}
async function setOrdersArr(arr) {
  await kvSet("orders", arr);
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // --- Health check ---
  if (path === "/api/health" && req.method === "GET") {
    return json({ ok: true, mode: "server" });
  }

  // --- Data umum: /api/data/:key ---
  const dataMatch = path.match(/^\/api\/data\/([^/]+)$/);
  if (dataMatch) {
    const key = dataMatch[1];
    if (!key) return json({ error: "invalid key" }, 400);
    if (req.method === "GET") {
      const value = await kvGet(key);
      if (value === null) return json({ error: "not found" }, 404);
      return json(value);
    }
    if (req.method === "POST") {
      const body = await req.json();
      await kvSet(key, body);
      return json({ ok: true });
    }
  }

  // --- Daftar order ---
  if (path === "/api/orders" && req.method === "GET") {
    return json(await getOrdersArr());
  }

  // --- Tambah order baru ---
  if (path === "/api/orders" && req.method === "POST") {
    const order = await req.json();
    const arr = await getOrdersArr();
    arr.unshift(order);
    await setOrdersArr(arr);
    return json(order);
  }

  // --- Ubah status order ---
  const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch && req.method === "PATCH") {
    const id = orderMatch[1];
    const body = await req.json();
    const arr = await getOrdersArr();
    const order = arr.find((o) => o.id === id);
    if (!order) return json({ error: "order not found" }, 404);
    order.status = body.status;
    order.timeline = order.timeline || [];
    const lastEntry = order.timeline[order.timeline.length - 1];
    if (!lastEntry || lastEntry.status !== body.status) {
      order.timeline.push({
        status: body.status,
        time: new Date().toISOString(),
      });
    }
    await setOrdersArr(arr);
    return json(order);
  }

  return json({ error: "not found" }, 404);
});
