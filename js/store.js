/* ===================================================================
 * store.js — Lapisan penyimpanan (storage)
 *
 * Cara kerja:
 *   - "gist"  : memakai GitHub Gist sebagai database pusat (GRATIS,
 *                tidak perlu server, tidak perlu build, jalan di GitHub Pages)
 *   - "local" : memakai localStorage (backup / offline)
 *
 * GitHub Gist adalah "file JSON" di GitHub yang bisa dibaca & ditulis
 * dari browser. Ini jadi "pusat" yang bisa diakses customer & admin
 * dari device berbeda — order dari HP customer langsung muncul di
 * laptop admin.
 *
 * SETUP (setelahdeploy):
 *   1. Buat Gist di gist.github.com → file: data.json → isi: {}
 *   2. Buat Token di github.com/settings/tokens → scope: gist
 *   3. Masukkan GIST_ID dan GIST_TOKEN di bawah ini
 * =================================================================== */

// >>> GANTI DENGAN DATA KAMU <<<
// GIST_ID: dari URL gist.github.com/xxx/xxxxxxxxxxxxxxxxx
const GIST_ID = "acrestehsolo/0c7b1bea37d66c42014819340666203f/4be4e9207dec9ee156a74af7b2cf1eb2f9ad2801";
// GIST_TOKEN: GitHub Personal Access Token (scope: gist)
const GIST_TOKEN = "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";

const GIST_API = "https://api.github.com/gists";

const Store = {
  mode: "local",
  data: null, // cache untuk data.json dari Gist

  async init() {
    if (GIST_ID && GIST_ID !== "YOUR_GIST_ID") {
      this.mode = "gist";
      await this.loadData();
    }
    document.documentElement.setAttribute("data-mode", this.mode);
  },

  // --- Baca data.json dari Gist ---
  async loadData() {
    try {
      const res = await fetch(GIST_API + "/" + GIST_ID);
      if (res.ok) {
        const gist = await res.json();
        const dataFile = gist.files["data.json"];
        if (dataFile) {
          this.data = JSON.parse(dataFile.content);
        }
      }
    } catch {}
    if (!this.data) this.data = {};
    // Seed data jika kosong — jangan set null karena get() mengembalikan null (bukan fallback)
    if (!this.data.orders) this.data.orders = [];
    // settings & menu: biarkan undefined agar Store.get() kembalikan fallback
    if (this.data.settings === null) delete this.data.settings;
    if (this.data.menu === null) delete this.data.menu;
  },

  // --- Simpan data.json ke Gist ---
  async saveData() {
    if (!GIST_TOKEN || GIST_TOKEN === "YOUR_GIST_TOKEN") return false;
    try {
      const content = JSON.stringify(this.data, null, 2);
      const res = await fetch(GIST_API + "/" + GIST_ID, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "token " + GIST_TOKEN,
        },
        body: JSON.stringify({
          files: { "data.json": { content } },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- Baca data (key = orders / settings / menu) ---
  async get(key, fallback) {
    if (this.mode === "gist") {
      return this.data[key] !== undefined ? this.data[key] : fallback;
    }
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  },

  // --- Simpan data ---
  async set(key, value, headers = {}) {
    if (this.mode === "gist") {
      this.data[key] = value;
      await this.saveData();
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  },

  // --- Daftar pesanan ---
  async getOrders() {
    if (this.mode === "gist") {
      return this.data.orders || [];
    }
    return await this.get("orders", []);
  },

  // --- Tambah pesanan baru ---
  async addOrder(order) {
    if (this.mode === "gist") {
      this.data.orders = this.data.orders || [];
      this.data.orders.unshift(order);
      await this.saveData();
      localStorage.setItem("orders", JSON.stringify(this.data.orders));
      return order;
    }
    const orders = await this.get("orders", []);
    orders.unshift(order);
    await this.set("orders", orders);
    return order;
  },

  // --- Ubah status pesanan (dengan tracking timeline) ---
  async updateOrderStatus(id, status, headers = {}) {
    if (this.mode === "gist") {
      this.data.orders = this.data.orders || [];
      const order = this.data.orders.find(o => o.id === id);
      if (order) {
        order.status = status;
        order.timeline = order.timeline || [];
        const lastEntry = order.timeline[order.timeline.length - 1];
        if (!lastEntry || lastEntry.status !== status) {
          order.timeline.push({ status, time: new Date().toISOString() });
        }
      }
      await this.saveData();
      localStorage.setItem("orders", JSON.stringify(this.data.orders));
      return;
    }
    const orders = await this.get("orders", []);
    const order = orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      order.timeline = order.timeline || [];
      const lastEntry = order.timeline[order.timeline.length - 1];
      if (!lastEntry || lastEntry.status !== status) {
        order.timeline.push({ status, time: new Date().toISOString() });
      }
    }
    await this.set("orders", orders);
  },
};
