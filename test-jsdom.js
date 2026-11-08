/* Test DOM dengan jsdom — verifikasi alur modal & logika order */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
const css = fs.readFileSync(path.join(ROOT, "css/style.css"), "utf-8");
const dataJs = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf-8");
const storeJs = fs.readFileSync(path.join(ROOT, "js/store.js"), "utf-8");
const appJs = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf-8");

const results = [];
const log = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log((ok ? "✅" : "❌") + " " + name + (detail ? " — " + detail : ""));
};

// Mock fetch untuk Store.init() (health check) — return not ok supaya mode local
async function runTest() {
  const dom = new JSDOM(html, {
    url: "http://localhost:3000/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    resources: "usable",
  });

  const { window } = dom;
  const { document } = window;

  // Mock fetch
  window.fetch = async (url, opts) => {
    if (url.includes("/api/health")) {
      return { ok: false, json: async () => ({}) };
    }
    return { ok: false, json: async () => ({}) };
  };
  // jsdom tidak punya AbortSignal.timeout — patch
  if (!window.AbortSignal) window.AbortSignal = {};
  window.AbortSignal.timeout = () => {};
  window.localStorage = window.localStorage || {};

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Jalankan scripts di window context (gabung jadi 1 eval supaya const scope sama)
  window.eval(dataJs + "\n" + storeJs + "\n" + appJs);

  // Tunggu init async
  await new Promise((r) => setTimeout(r, 500));

  // Helper: cek hidden attribute
  const hidden = (sel) => document.querySelector(sel).hasAttribute("hidden");
  const click = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("Element tidak ada: " + sel);
    el.click();
  };
  const type = (sel, val) => {
    const el = document.querySelector(sel);
    el.value = val;
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  };

  // 1. Modals hidden di awal
  log("checkoutModal hidden saat load", hidden("#checkoutModal"));
  log("confirmModal hidden saat load", hidden("#confirmModal"));

  // 2. Menu render
  const menuCards = document.querySelectorAll("#menuGrid .menu-card");
  log("Menu di-render", menuCards.length > 0, menuCards.length + " item");

  // 3. Tambah 2 item ke cart
  const addBtns = document.querySelectorAll("#menuGrid .btn-add");
  addBtns[0].click();
  addBtns[0].click();
  await new Promise((r) => setTimeout(r, 200));
  log("Keranjang count = 2", document.querySelector("#cartCount").textContent === "2");

  // 4. Buka checkout
  click("#checkoutBtn");
  await new Promise((r) => setTimeout(r, 200));
  log("checkoutModal tampil setelah klik", !hidden("#checkoutModal"));

  // 5. Isi form
  type("#custName", "Budi");
  type("#custPhone", "081234567890");
  type("#custAddress", "Jl. Merdeka 10");
  type("#custDistance", "5");

  // Pilih payment di checkout
  click("#payGrid .pay-card");

  // 6. Pesan
  click("#submitOrder");
  await new Promise((r) => setTimeout(r, 300));

  // 7. Payment modal tampil setelah submit
  log("payModal tampil setelah submit order", !hidden("#payModal"));

  // 8. Pilih payment method di payModal
  const payCards = document.querySelectorAll("#payGridModal .pay-card-modal");
  if (payCards.length > 0) {
    payCards[0].click();
    await new Promise((r) => setTimeout(r, 200));
  }

  // 9. Klik Bayar & Lanjutkan
  click("#payConfirm");
  await new Promise((r) => setTimeout(r, 500));

  // 10. Confirm modal tampil
  log("confirmModal tampil setelah pembayaran", !hidden("#confirmModal"));
  const thanks = document.querySelector("#confirmThanks").textContent;
  log("Ucapan terima kasih ada", thanks.length > 0, thanks.slice(0, 30));

  // 8. Klik "Oke, Siap!" — modal harus hidden lagi (BUG yang diperbaiki)
  click("#confirmClose");
  await new Promise((r) => setTimeout(r, 200));
  log("confirmModal tertutup setelah Oke (BUG FIX)", hidden("#confirmModal"));

  // 9. Cart kosong setelah order
  log("Cart kosong setelah order", document.querySelector("#cartCount").textContent === "0");

  // 10. Pesanan tersimpan di localStorage
  const orders = JSON.parse(window.localStorage.getItem("orders") || "[]");
  log("Pesanan tersimpan di localStorage", orders.length === 1, "total=" + orders.length);
  if (orders.length > 0) {
    log("Pesanan punya customerName", orders[0].customerName === "Budi");
    log("Pesanan punya status pending", orders[0].status === "pending");
  }

  // 11. CSS fix ada
  const cssHasFix = css.includes("[hidden] { display: none !important; }");
  log("CSS fix [hidden] !important ada", cssHasFix);

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + (failed.length === 0 ? "🎉 SEMUA TES PASS!" : failed.length + " TES FAIL!"));
  process.exit(failed.length === 0 ? 0 : 1);
}

runTest().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
