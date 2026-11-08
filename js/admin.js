/* =====================================================================
 * admin.js — Logika panel admin
 * ===================================================================== */

const state = {
  settings: null,
  menu: [],
  orders: [],
  loggedIn: false,
};

const $ = (sel) => document.querySelector(sel);
const money = (n) => "Rp " + Number(n).toLocaleString("id-ID");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { t.hidden = true; }, 2500);
}

function statusBadge(status) {
  const s = ORDER_STATUS.find((x) => x.id === status) || { name: status, color: "#9ca3af" };
  return `<span class="status-badge" style="background:${s.color}">${s.name}</span>`;
}

async function init() {
  try {
    await Store.init();
    let settings = await Store.get("settings", DEFAULT_SETTINGS);
    let menu = await Store.get("menu", DEFAULT_MENU);
    // Fix: Store.get() bisa return null (bukan fallback) jika Gist punya settings: null
    if (!settings || typeof settings !== "object" || !settings.adminPassword) {
      console.warn("Settings invalid/null, pakai DEFAULT_SETTINGS");
      settings = DEFAULT_SETTINGS;
    }
    if (!menu || !Array.isArray(menu) || menu.length === 0) {
      console.warn("Menu kosong, pakai DEFAULT_MENU");
      menu = DEFAULT_MENU;
    }
    state.settings = settings;
    state.menu = menu;
    state.orders = await Store.getOrders();
  } catch (err) {
    console.error("Admin init error:", err);
    state.settings = DEFAULT_SETTINGS;
    state.menu = DEFAULT_MENU;
    state.orders = [];
  }

  // Cek login persisten (session storage)
  if (sessionStorage.getItem("adminLoggedIn") === "1") {
    showAdmin();
    startAutoRefresh();
  } else {
    showLogin();
  }
  try {
    bindEvents();
  } catch (err) {
    console.error("bindEvents error:", err);
  }
}

// Auto-refresh pesanan setiap 5 detik
let autoRefreshTimer = null;
function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(async () => {
    if (state.loggedIn) {
      try {
        const freshOrders = await Store.getOrders();
        if (JSON.stringify(freshOrders) !== JSON.stringify(state.orders)) {
          state.orders = freshOrders;
          renderDashboard();
          renderOrders();
        }
      } catch (err) {
        // ignore
      }
    }
  }, 5000); // 5 detik
}

function stopAutoRefresh() {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
}

/* ---------- Login ---------- */
function showLogin() {
  $("#loginView").hidden = false;
  $("#adminView").hidden = true;
}

function showAdmin() {
  $("#loginView").hidden = true;
  $("#adminView").hidden = false;
  $("#adminTitle").textContent = state.settings.shopName;
  renderAll();
}

function doLogin(e) {
  e.preventDefault();
  const pass = $("#loginPassword").value;
  if (pass === state.settings.adminPassword) {
    sessionStorage.setItem("adminLoggedIn", "1");
    state.loggedIn = true;
    $("#loginPassword").value = "";
    $("#loginError").textContent = "";
    showAdmin();
    startAutoRefresh();
  } else {
    $("#loginError").textContent = "Kata sandi salah. Coba lagi.";
  }
}

function doLogout() {
  sessionStorage.removeItem("adminLoggedIn");
  state.loggedIn = false;
  stopAutoRefresh();
  showLogin();
}

/* ---------- Render ---------- */
function renderAll() {
  try { renderDashboard(); } catch(e) { console.error("renderDashboard:", e); }
  try { renderOrders(); } catch(e) { console.error("renderOrders:", e); }
  try { renderMenuTable(); } catch(e) { console.error("renderMenuTable:", e); }
  try { renderSettingsForm(); } catch(e) { console.error("renderSettingsForm:", e); }
  try { renderCourierFees(); } catch(e) { console.error("renderCourierFees:", e); }
  try { renderCourierApis(); } catch(e) { console.error("renderCourierApis:", e); }
}

function renderDashboard() {
  const total = state.orders.length;
  const revenue = state.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const pending = state.orders.filter((o) => o.status === "pending").length;
  const today = state.orders.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  $("#statGrid").innerHTML = `
    <div class="stat-card"><div class="label">Total Pesanan</div><div class="value">${total}</div></div>
    <div class="stat-card"><div class="label">Pending</div><div class="value">${pending}</div></div>
    <div class="stat-card"><div class="label">Hari Ini</div><div class="value">${today}</div></div>
    <div class="stat-card"><div class="label">Pendapatan</div><div class="value">${money(revenue)}</div></div>`;

  const recent = [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  $("#recentOrders").innerHTML = recent.length === 0
    ? '<div class="empty-orders">Belum ada pesanan.</div>'
    : recent.map(orderCardHtml).join("");
}

function orderWaBubble(o) {
  const waNum = state.settings.shopWaNumber || (state.settings.couriers && state.settings.couriers.kurirresto && state.settings.couriers.kurirresto.waNumber) || state.settings.phone || "";
  if (!waNum) return "";
  const isPaid = o.status === "delivered" || o.status === "cancelled";
  const bubbleClass = isPaid ? "order-wa-bubble-paid" : "order-wa-bubble-pending";
  const label = isPaid ? "✅ Konfirmasi" : "⏳ Konfirmasi Bayar";
  const waLink = "https://wa.me/" + waNum.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent(
    `Konfirmasi pembayaran pesanan ${o.id}\nCustomer: ${o.customerName}\nTotal: ${o.total}\nMetode: ${o.paymentName}\nStatus: ${isPaid ? "LUNAS" : "MENUNGGU BAYAR"}`
  );
  return `<a class="btn-mini ${bubbleClass}" href="${waLink}" target="_blank" style="text-decoration:none;">${label} WA</a>`;
}

function orderCardHtml(o) {
  const itemsHtml = o.items.map((i) => `${i.emoji} ${escapeHtml(i.name)} ×${i.qty}`).join(", ");
  const time = new Date(o.createdAt).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const statusActions = renderStatusActions(o);
  return `
    <div class="order-card">
      <div class="order-top">
        <div>
          <div class="order-id">${o.id}</div>
          <div class="order-time">${time}</div>
        </div>
        ${statusBadge(o.status)}
      </div>
      <div class="order-customer"><strong>${escapeHtml(o.customerName)}</strong> · 📞 ${escapeHtml(o.customerPhone)}</div>
      <div class="order-customer">📍 ${escapeHtml(o.customerAddress)}</div>
      <div class="order-items">${escapeHtml(itemsHtml)}</div>
      <div class="order-total">Total: ${money(o.total)} · ${o.courierEmoji} ${o.courierName} · ${o.distanceKm} km</div>
      ${o.paymentRef ? `<div class="order-customer" style="font-size:12px;color:#0d4f33;">💳 ${escapeHtml(o.paymentName)} · Ref: <strong>${escapeHtml(o.paymentRef)}</strong></div>` : ""}
      ${statusActions}
      <div class="order-actions" style="margin-top:6px;">
        ${orderWaBubble(o)}
        <button class="btn-mini" data-print="${o.id}">🖨️ Cetak Struk</button>
      </div>
    </div>`;
}

function buildReceiptHtml(order) {
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const items = order.items.map((i) =>
    `<div class="receipt-line"><span>${i.emoji} ${escapeHtml(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`
  ).join("");

  return `
<h4>${escapeHtml(state.settings.shopName)}</h4>
<div class="receipt-sub">${escapeHtml(state.settings.shopName)} · Online</div>

<div class="receipt-line-no-border"><span>No. Pesanan</span><span>${order.id}</span></div>
<div class="receipt-line-no-border"><span>Tanggal</span><span>${dateStr}</span></div>
<div class="receipt-line-no-border"><span>Status</span><span>${ORDER_STATUS.find(s=>s.id===order.status)?.name || order.status}</span></div>

<div class="receipt-divider">---------------------------</div>

<div class="receipt-line-no-border"><strong>PEMBELIAN</strong></div>
${items}

<div class="receipt-divider">---------------------------</div>

<div class="receipt-line"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
<div class="receipt-line"><span>Ongkir (${order.courierEmoji} ${order.courierName})</span><span>${money(order.shippingFee)}</span></div>
<div class="receipt-line receipt-total"><span>TOTAL BAYAR</span><span>${money(order.total)}</span></div>

<div class="receipt-divider">---------------------------</div>

<div class="receipt-line-no-border"><span>Pembayaran</span><span>${order.paymentName}</span></div>
<div class="receipt-line-no-border"><span>Kurir</span><span>${order.courierEmoji} ${order.courierName}</span></div>
<div class="receipt-line-no-border"><span>Jarak</span><span>${order.distanceKm} km</span></div>
${o.paymentRef ? `<div class="receipt-line-no-border"><span>Ref Bayar</span><span>${order.paymentRef}</span></div>` : ""}

<div class="receipt-thanks">TERIMA KASIH ATAS KEPERCAYAANNYA!</div>
<div class="receipt-barcode">* * * ${order.id} * * *</div>
`;
}

function showReceipt(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) {
    showToast("Pesanan tidak ditemukan.");
    return;
  }
  $("#receiptPaper").innerHTML = buildReceiptHtml(order);
  $("#receiptModal").hidden = false;
  $("#receiptModal").dataset.orderId = orderId;
}

function closeReceipt() {
  $("#receiptModal").hidden = true;
}

function printReceipt() {
  window.print();
}

function downloadReceipt() {
  const orderId = $("#receiptModal").dataset.orderId;
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return;
  const html = buildReceiptHtml(order);
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Struk ${order.id}</title>
<style>
  body { font-family: "Courier New", monospace; font-size: 13px; padding: 20px; line-height: 1.6; }
  h4 { text-align: center; font-size: 16px; }
  .receipt-sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 12px; }
  .receipt-line { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 3px 0; }
  .receipt-line-no-border { display: flex; justify-content: space-between; padding: 3px 0; }
  .receipt-total { font-weight: 700; font-size: 15px; border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
  .receipt-divider { text-align: center; margin: 10px 0; }
  .receipt-thanks { text-align: center; font-weight: 700; margin-top: 12px; }
  .receipt-barcode { text-align: center; font-size: 10px; letter-spacing: 3px; margin-top: 10px; }
</style></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `struk-${order.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Struk didownload.");
}

function renderStatusActions(o) {
  const idx = ORDER_STATUS.findIndex((s) => s.id === o.status);
  const next = ORDER_STATUS[idx + 1];
  let html = '<div class="order-actions">';
  if (next) {
    html += `<button class="status-btn next" data-id="${o.id}" data-next="${next.id}">→ ${next.name}</button>`;
  }
  if (o.status !== "cancelled" && o.status !== "delivered") {
    html += `<button class="status-btn cancel" data-id="${o.id}" data-cancel="1">✕ Batalkan</button>`;
  }
  html += "</div>";
  return html;
}

function renderOrders() {
  $("#allOrders").innerHTML = state.orders.length === 0
    ? '<div class="empty-orders">Belum ada pesanan.</div>'
    : state.orders.map(orderCardHtml).join("");
}

function renderMenuTable() {
  $("#menuTableBody").innerHTML = state.menu.map((m) => {
    const cat = CATEGORIES.find((c) => c.id === m.category) || { name: m.category };
    const imgHtml = m.image
      ? `<img src="${m.image}" class="menu-thumb" alt="${escapeHtml(m.name)}" />`
      : `<span class="menu-thumb-emoji">${m.emoji || "🥤"}</span>`;
    return `
      <tr>
        <td class="emoji">
          ${imgHtml}
          <input type="file" accept="image/jpeg,image/png" class="menu-img-upload" data-id="${m.id}" style="display:inline;width:auto;" />
        </td>
        <td>${escapeHtml(m.name)}</td>
        <td>${cat.emoji || ""} ${cat.name}</td>
        <td class="price price-editable" data-edit-price="${m.id}" title="Klik untuk edit harga">${money(m.price)}</td>
        <td class="desc-editable" data-edit-desc="${m.id}" title="Klik untuk edit deskripsi">${escapeHtml(m.desc || "")}</td>
        <td class="actions">
          <button class="btn-mini" data-edit="${m.id}">✏️ Edit</button>
          <button class="btn-mini danger" data-del="${m.id}">🗑️ Hapus</button>
        </td>
      </tr>`;
  }).join("");
}

function renderSettingsForm() {
  $("#setShopName").value = state.settings.shopName;
  $("#setPhone").value = state.settings.phone;
  $("#setShopWa").value = state.settings.shopWaNumber || "";
  $("#setAddress").value = state.settings.address;
  $("#setThanks").value = state.settings.thankYou;
  $("#setAdminPass").value = state.settings.adminPassword;
  $("#setMaxKm").value = state.settings.maxDistanceKm;

  // Payment info
  $("#setBankName").value = state.settings.bankName || "";
  $("#setBankAccount").value = state.settings.bankAccount || "";
  $("#setShopAccountName").value = state.settings.shopAccountName || "";
  $("#setGopayAccount").value = state.settings.gopayAccount || "";

  // Location (Google Maps)
  $("#setLat").value = state.settings.lat || "";
  $("#setLng").value = state.settings.lng || "";
  renderMapsPreview();

  // Logo & QRIS
  $("#setLogo").value = state.settings.logo || "";
  $("#setQris").value = state.settings.qrisImage || "";
  $("#setLogoFile").value = "";
  $("#setQrisFile").value = "";
  updateImagePreview("#logoPreview", state.settings.logo, "☕");
  updateImagePreview("#qrisPreview", state.settings.qrisImage, "📷");
}

function renderMapsPreview() {
  const lat = $("#setLat").value.trim();
  const lng = $("#setLng").value.trim();
  const el = $("#mapsPreview");
  if (lat && lng) {
    const q = encodeURIComponent(lat + "," + lng);
    el.innerHTML = `
      <div class="maps-wrapper">
        <iframe
          src="https://www.google.com/maps?q=${q}&z=15&output=embed"
          width="100%" height="200"
          style="border:0;border-radius:8px;display:block;"
          loading="lazy"
          allow="fullscreen"
          allowfullscreen></iframe>
        <a class="maps-fallback" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">
          📍 Buka di Google Maps
        </a>
      </div>`;
  } else {
    el.innerHTML = '<span style="color:#9ca3af;font-size:13px;">Masukkan latitude & longitude untuk melihat peta.</span>';
  }
}

function renderCourierApis() {
  const grid = $("#courierApiGrid");
  grid.innerHTML = "";
  const apis = state.settings.courierApis || {};
  Object.entries(state.settings.couriers).forEach(([key, c]) => {
    const api = apis[key] || { locateUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}", apiKey: "" };
    const item = document.createElement("div");
    item.className = "courier-fee-item";
    item.innerHTML = `
      <div class="title">${c.emoji} ${c.name}</div>
      <label style="font-size:12px;">📍 Map Resto / Deep Link (Gunakan {lat} dan {lng})</label>
      <input type="text" data-api="${key}" data-field="locateUrl" value="${escapeHtml(api.locateUrl || "")}" placeholder="https://www.google.com/maps/dir/?api=1&destination={lat},{lng}" />
      <label style="font-size:12px;">API Key (opsional)</label>
      <input type="text" data-api="${key}" data-field="apiKey" value="${escapeHtml(api.apiKey || "")}" placeholder="Isi jika punya API" />`;
    grid.appendChild(item);
  });
}

function updateImagePreview(sel, src, fallback) {
  const el = $(sel);
  if (src) {
    el.innerHTML = `<img src="${src}" style="max-height:120px;border-radius:8px;border:1px solid #e5e7eb;" />`;
  } else {
    el.innerHTML = `<span style="color:#9ca3af;font-size:13px;">Belum ada gambar (${fallback})</span>`;
  }
}

// Konversi file gambar ke base64 (resize maksimal 400x400)
function fileToBase64(file, maxSize = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderCourierFees() {
  const grid = $("#courierFeeGrid");
  grid.innerHTML = "";
  Object.entries(state.settings.couriers).forEach(([key, c]) => {
    const item = document.createElement("div");
    item.className = "courier-fee-item";
    const waField = (key === "kurirresto") ? `
      <label style="font-size:12px;">🟢 Nomor WhatsApp (untuk bubble WA)</label>
      <input type="text" data-courier="${key}" data-fee="waNumber" value="${escapeHtml(c.waNumber || "")}" placeholder="0812-3456-7890" />` : "";
    item.innerHTML = `
      <div class="title">${c.emoji} ${c.name}</div>
      <label style="font-size:12px;">Jarak 0–5 km (Rp)</label>
      <input type="number" data-courier="${key}" data-fee="fee5" value="${c.fee5}" min="0" step="100" />
      <label style="font-size:12px;">Jarak 5–10 km (Rp)</label>
      <input type="number" data-courier="${key}" data-fee="fee10" value="${c.fee10}" min="0" step="100" />
      <label style="font-size:12px;">Minimal pesanan (Rp)</label>
      <input type="number" data-courier="${key}" data-fee="minOrder" value="${c.minOrder}" min="0" step="100" />
      ${waField}`;
    grid.appendChild(item);
  });
}

/* ---------- Mutations ---------- */
async function updateOrderStatus(id, status) {
  await Store.updateOrderStatus(id, status);
  state.orders = await Store.getOrders();
  renderDashboard();
  renderOrders();
  showToast("Status pesanan diperbarui.");
}

async function addMenuItem() {
  const name = $("#newItemName").value.trim();
  const desc = $("#newItemDesc").value.trim();
  const category = $("#newItemCategory").value;
  const price = parseInt($("#newItemPrice").value);
  const emoji = $("#newItemEmoji").value.trim() || "🥤";

  if (!name) { showToast("Masukkan nama item."); return; }
  if (!price || price < 0) { showToast("Masukkan harga yang valid."); return; }

  const item = {
    id: "m" + Date.now().toString(36),
    name, desc, category, price, emoji,
  };
  state.menu.push(item);
  await Store.set("menu", state.menu);
  renderMenuTable();
  $("#newItemName").value = "";
  $("#newItemDesc").value = "";
  $("#newItemPrice").value = "";
  $("#newItemEmoji").value = "";
  showToast("Item ditambahkan.");
}

async function editMenuItem(id) {
  const name = prompt("Nama item:", "");
  if (name === null) return;
  const item = state.menu.find((m) => m.id === id);
  if (!item) return;
  if (name.trim()) item.name = name.trim();

  const price = prompt("Harga (Rp):", item.price);
  if (price === null) return;
  const priceNum = parseInt(price);
  if (!priceNum || priceNum < 0) { showToast("Harga tidak valid."); return; }
  item.price = priceNum;

  await Store.set("menu", state.menu);
  renderMenuTable();
  showToast("Item diperbarui.");
}

async function deleteMenuItem(id) {
  if (!confirm("Hapus item ini?")) return;
  state.menu = state.menu.filter((m) => m.id !== id);
  await Store.set("menu", state.menu);
  renderMenuTable();
  showToast("Item dihapus.");
}

async function saveSettings() {
  const couriers = {};
  Object.keys(state.settings.couriers).forEach((key) => {
    couriers[key] = { ...state.settings.couriers[key] };
  });

  document.querySelectorAll("#courierFeeGrid input").forEach((input) => {
    const key = input.dataset.courier;
    const fee = input.dataset.fee;
    // waNumber adalah string, fee lainnya adalah number
    if (fee === "waNumber") {
      couriers[key][fee] = input.value.trim();
    } else {
      const val = parseInt(input.value);
      if (val >= 0) couriers[key][fee] = val;
    }
  });

  // Baca API kurir dari form
  const courierApis = {};
  Object.keys(state.settings.couriers).forEach((key) => {
    courierApis[key] = { locateUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}", apiKey: "" };
  });
  document.querySelectorAll("#courierApiGrid input").forEach((input) => {
    const key = input.dataset.api;
    const field = input.dataset.field;
    courierApis[key][field] = input.value.trim();
  });

  const newSettings = {
    shopName: $("#setShopName").value.trim() || "Warung",
    phone: $("#setPhone").value.trim(),
    shopWaNumber: $("#setShopWa").value.trim(),
    address: $("#setAddress").value.trim(),
    thankYou: $("#setThanks").value.trim(),
    adminPassword: $("#setAdminPass").value || state.settings.adminPassword,
    maxDistanceKm: parseInt($("#setMaxKm").value) || 10,
    // Location (Google Maps)
    lat: parseFloat($("#setLat").value) || state.settings.lat,
    lng: parseFloat($("#setLng").value) || state.settings.lng,
    // Payment info
    bankName: $("#setBankName").value.trim(),
    bankAccount: $("#setBankAccount").value.trim(),
    shopAccountName: $("#setShopAccountName").value.trim(),
    gopayAccount: $("#setGopayAccount").value.trim(),
    // Logo & QRIS (dari hidden input atau file upload baru)
    logo: $("#setLogo").value || state.settings.logo || "",
    qrisImage: $("#setQris").value || state.settings.qrisImage || "",
    // Courier APIs
    courierApis,
    couriers,
  };

  state.settings = newSettings;
  await Store.set("settings", state.settings);
  $("#adminShopName").textContent = newSettings.shopName;
  showToast("Pengaturan disimpan.");
}

/* ---------- Events ---------- */
function bindEvents() {
  $("#loginBtn").addEventListener("click", doLogin);
  $("#loginPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(e); });
  $("#logoutBtn").addEventListener("click", doLogout);
  $("#refreshOrdersBtn").addEventListener("click", async () => {
    state.orders = await Store.getOrders();
    renderAll();
    showToast("Pesanan refreshed.");
  });

  // Tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      $("#panel-" + tab.dataset.tab).classList.add("active");
    });
  });

  // Order status
  document.addEventListener("click", (e) => {
    const nextBtn = e.target.closest(".status-btn.next");
    const cancelBtn = e.target.closest(".status-btn.cancel");
    if (nextBtn) updateOrderStatus(nextBtn.dataset.id, nextBtn.dataset.next);
    if (cancelBtn) updateOrderStatus(cancelBtn.dataset.id, "cancelled");

    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) editMenuItem(editBtn.dataset.edit);
    const delBtn = e.target.closest("[data-del]");
    if (delBtn) deleteMenuItem(delBtn.dataset.del);

    // Cetak struk
    const printBtn = e.target.closest("[data-print]");
    if (printBtn) showReceipt(printBtn.dataset.print);
  });

  // Receipt modal
  $("#closeReceipt").addEventListener("click", closeReceipt);
  $("#receiptModal").addEventListener("click", (e) => {
    if (e.target.id === "receiptModal") closeReceipt();
  });
  $("#printReceiptBtn").addEventListener("click", printReceipt);
  $("#downloadReceiptBtn").addEventListener("click", downloadReceipt);

  $("#addItemBtn").addEventListener("click", addMenuItem);
  $("#saveSettingsBtn").addEventListener("click", saveSettings);

  // File upload logo
  $("#setLogoFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file, 400, 0.85);
      $("#setLogo").value = base64;
      updateImagePreview("#logoPreview", base64, "☕");
      showToast("Logo diunggah.");
    } catch {
      showToast("Gagal mengunggah logo.");
    }
  });

  // File upload gambar menu (per item)
  $("#menuTableBody").addEventListener("change", async (e) => {
    const input = e.target.closest(".menu-img-upload");
    if (!input) return;
    const id = input.dataset.id;
    const file = input.files[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file, 400, 0.85);
      const item = state.menu.find((m) => m.id === id);
      if (item) {
        item.image = base64;
        await Store.set("menu", state.menu);
        renderMenuTable();
        showToast("Gambar menu diunggah.");
      }
    } catch {
      showToast("Gagal mengunggah gambar.");
    }
  });

  // File upload QRIS
  $("#setQrisFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file, 400, 0.85);
      $("#setQris").value = base64;
      updateImagePreview("#qrisPreview", base64, "📷");
      showToast("QRIS diunggah.");
    } catch {
      showToast("Gagal mengunggah QRIS.");
    }
  });

  // Inline editing: harga
  $("#menuTableBody").addEventListener("dblclick", (e) => {
    const priceCell = e.target.closest(".price-editable");
    if (priceCell) {
      const id = priceCell.dataset.editPrice;
      const item = state.menu.find((m) => m.id === id);
      if (!item) return;
      const currentPrice = item.price;
      const input = document.createElement("input");
      input.type = "number";
      input.value = currentPrice;
      input.style.cssText = "width:80px;font-size:13px;font-weight:700;";
      priceCell.innerHTML = "";
      priceCell.appendChild(input);
      input.focus();
      input.select();
      const save = async () => {
        const val = parseInt(input.value);
        if (val && val >= 0) {
          item.price = val;
          await Store.set("menu", state.menu);
          renderMenuTable();
          showToast("Harga diperbarui: " + money(val));
        } else {
          renderMenuTable();
        }
      };
      input.addEventListener("blur", save);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") { ev.preventDefault(); input.blur(); }
        if (ev.key === "Escape") renderMenuTable();
      });
    }
  });

  // Inline editing: deskripsi
  $("#menuTableBody").addEventListener("dblclick", (e) => {
    const descCell = e.target.closest(".desc-editable");
    if (descCell) {
      const id = descCell.dataset.editDesc;
      const item = state.menu.find((m) => m.id === id);
      if (!item) return;
      const input = document.createElement("input");
      input.type = "text";
      input.value = item.desc || "";
      input.style.cssText = "width:200px;font-size:12px;";
      descCell.innerHTML = "";
      descCell.appendChild(input);
      input.focus();
      input.select();
      const save = async () => {
        item.desc = input.value.trim();
        await Store.set("menu", state.menu);
        renderMenuTable();
        showToast("Deskripsi diperbarui.");
      };
      input.addEventListener("blur", save);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") { ev.preventDefault(); input.blur(); }
        if (ev.key === "Escape") renderMenuTable();
      });
    }
  });

  // Google Maps location picker
  $("#openMapsBtn").addEventListener("click", () => {
    const lat = $("#setLat").value.trim();
    const lng = $("#setLng").value.trim();
    const q = lat && lng ? `${lat},${lng}` : (state.settings.address || "Jl. Bone Barat Utama No 12, Banyuany");
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    // Gunakan anchor element untuk menghindari pop-up blocker
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Live update maps preview
  $("#setLat").addEventListener("input", renderMapsPreview);
  $("#setLng").addEventListener("input", renderMapsPreview);
}

/* ---------- Start ---------- */
init();
