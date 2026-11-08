/* =====================================================================
 * app.js — Logika toko (storefront)
 * ===================================================================== */

const state = {
  settings: null,
  menu: [],
  cart: [],          // [{ id, name, emoji, price, qty }]
  selectedCourier: null,
  selectedPay: "tunai",
};

/* ---------- Utilitas ---------- */
const $ = (sel) => document.querySelector(sel);
const money = (n) => "Rp " + Number(n).toLocaleString("id-ID");
const uid = () => "ID-" + Date.now().toString(36).toUpperCase().slice(-6);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  toast.style.position = "fixed";
  toast.style.bottom = "80px";
  toast.style.right = "20px";
  toast.style.background = "#1f2937";
  toast.style.color = "#fff";
  toast.style.borderRadius = "10px";
  toast.style.padding = "12px 20px";
  toast.style.fontSize = "14px";
  toast.style.zIndex = "200";
  toast.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = "none"; }, 2500);
}

/* ---------- Muat data ---------- */
async function init() {
  await Store.init();
  state.settings = await Store.get("settings", DEFAULT_SETTINGS);
  state.menu = await Store.get("menu", DEFAULT_MENU);

  renderHeader();
  renderCategories();
  renderMenu("all");
  renderCart();
  bindEvents();

  // Cek pesanan aktif yang belum diantar (dari store atau localStorage)
  try {
    const orders = await Store.getOrders();
    const active = orders.find((o) => o.status !== "delivered" && o.status !== "cancelled");
    if (active) {
      showOrderPopup(active);
      startOrderPolling();
    }
  } catch (err) {
    // Jika server tidak tersedia, cek localStorage
    const localOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    const active = localOrders.find((o) => o.status !== "delivered" && o.status !== "cancelled");
    if (active) {
      showOrderPopup(active);
      startOrderPolling();
    }
  }
}

function renderHeader() {
  const name = state.settings.shopName;
  $("#shopName").textContent = name;
  $("#heroTitle").textContent = name;
  $("#shopAddress").textContent = "📍 " + (state.settings.address || "");
  $("#footerShop").textContent = name;
  $("#maxKmLabel").textContent = state.settings.maxDistanceKm + " km";
  document.title = name + " — Warung Online";

  // Logo toko (dari pengaturan admin)
  const logoEl = $("#brandLogo");
  if (state.settings.logo) {
    logoEl.innerHTML = `<img src="${state.settings.logo}" alt="logo" style="width:42px;height:42px;border-radius:10px;object-fit:contain;background:#fff;" />`;
  } else {
    logoEl.textContent = "☕🍹";
  }

  // WA Bubble — gunakan nomor WA dari settings atau phone
  const waBubble = $("#headerWaBubble");
  const waNumber = (state.settings.couriers && state.settings.couriers.kurirresto && state.settings.couriers.kurirresto.waNumber) || state.settings.phone || "";
  if (waNumber) {
    waBubble.href = "https://wa.me/" + waNumber.replace(/[^0-9]/g, "");
    waBubble.hidden = false;
  } else {
    waBubble.hidden = true;
  }
}

function renderPaymentDetails() {
  const el = $("#paymentDetails");
  const s = state.settings;
  const parts = [];

  // QRIS image
  if (s.qrisImage) {
    parts.push(`
      <div class="pay-detail-item">
        <div class="pay-detail-title">📷 QRIS</div>
        <img src="${s.qrisImage}" class="qris-img" alt="QRIS" />
        <div class="pay-detail-desc">Scan QRIS dengan dompet digital (GoPay, OVO, DANA, ShopeePay, dll)</div>
      </div>`);
  }

  // Bank transfer
  if (s.bankName || s.bankAccount) {
    parts.push(`
      <div class="pay-detail-item">
        <div class="pay-detail-title">🏦 Transfer Bank</div>
        <div class="pay-detail-desc">
          ${s.bankName ? `<strong>${escapeHtml(s.bankName)}</strong> ` : ""}
          ${s.bankAccount ? `a.n. <strong>${escapeHtml(s.shopAccountName || "-")}</strong> · <strong>${escapeHtml(s.bankAccount)}</strong>` : ""}
        </div>
      </div>`);
  }

  // GoPay / E-Wallet
  if (s.gopayAccount) {
    parts.push(`
      <div class="pay-detail-item">
        <div class="pay-detail-title">📱 E-Wallet</div>
        <div class="pay-detail-desc">Nomor GoPay: <strong>${escapeHtml(s.gopayAccount)}</strong> (GoPay, OVO, ShopeePay, GrabPay, DANA)</div>
      </div>`);
  }

  el.innerHTML = parts.length > 0
    ? `<div class="pay-details-box">${parts.join("")}</div>`
    : "";
}

function renderCategories() {
  const bar = $("#categoryBar");
  bar.innerHTML = "";
  const all = document.createElement("button");
  all.className = "cat-chip active";
  all.textContent = "🍽️ Semua";
  all.dataset.cat = "all";
  bar.appendChild(all);
  CATEGORIES.forEach((c) => {
    const chip = document.createElement("button");
    chip.className = "cat-chip";
    chip.textContent = c.emoji + " " + c.name;
    chip.dataset.cat = c.id;
    bar.appendChild(chip);
  });
}

function renderMenu(cat) {
  const grid = $("#menuGrid");
  grid.innerHTML = "";
  const list = cat === "all" ? state.menu : state.menu.filter((m) => m.category === cat);
  $("#emptyHint").hidden = list.length > 0;

  list.forEach((m) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    const imgContent = m.image
      ? `<img src="${m.image}" alt="${escapeHtml(m.name)}" class="menu-img-photo" />`
      : (m.emoji || "🥤");
    card.innerHTML = `
      <div class="menu-img">${imgContent}</div>
      <div class="menu-body">
        <div class="menu-name">${escapeHtml(m.name)}</div>
        <div class="menu-desc">${escapeHtml(m.desc || "")}</div>
        <div class="menu-foot">
          <div class="menu-price">${money(m.price)} <small>/pcs</small></div>
          <button class="btn-add" data-id="${m.id}">+ Tambah</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ---------- Keranjang ---------- */
function renderCart() {
  const wrap = $("#cartItems");
  wrap.innerHTML = "";
  if (state.cart.length === 0) {
    wrap.innerHTML = '<p style="text-align:center;color:#8a7a6a;padding:30px 0;">Keranjang masih kosong 😅</p>';
  }
  state.cart.forEach((item) => {
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${money(item.price)}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-act="dec" data-id="${item.id}">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" data-act="inc" data-id="${item.id}">+</button>
      </div>
      <button class="cart-item-remove" data-act="del" data-id="${item.id}" title="Hapus">✕</button>`;
    wrap.appendChild(el);
  });

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  $("#cartTotal").textContent = money(subtotal);
  $("#cartCount").textContent = count;
  $("#checkoutBtn").disabled = state.cart.length === 0;

  // Update floating cart badge
  const badge = $("#floatCartBadge");
  badge.textContent = count;
  badge.hidden = count === 0;
}

function addToCart(id) {
  const item = state.menu.find((m) => m.id === id);
  if (!item) return;
  const existing = state.cart.find((i) => i.id === id);
  if (existing) existing.qty++;
  else state.cart.push({ id: item.id, name: item.name, emoji: item.emoji, price: item.price, qty: 1 });
  renderCart();
}

function changeQty(id, act) {
  const item = state.cart.find((i) => i.id === id);
  if (!item) return;
  if (act === "inc") item.qty++;
  else if (act === "dec") {
    item.qty--;
    if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== id);
  }
  renderCart();
}

function removeItem(id) {
  state.cart = state.cart.filter((i) => i.id !== id);
  renderCart();
}

function cartSubtotal() {
  return state.cart.reduce((s, i) => s + i.price * i.qty, 0);
}

/* ---------- Checkout ---------- */
function renderCheckout() {
  const couriers = state.settings.couriers;
  const grid = $("#courierGrid");
  grid.innerHTML = "";
    Object.entries(couriers).forEach(([key, c]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "courier-card" + (state.selectedCourier === key ? " selected" : "");
    card.dataset.courier = key;
    const brandClass = `courier-${key}`;
    const waBubble = (key === "kurirresto" && c.waNumber) ? `
      <div class="courier-wa-bubble" onclick="event.stopPropagation(); if(c.waNumber) window.open('https://wa.me/${c.waNumber.replace(/[^0-9]/g,'')}', '_blank');">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.5 3.39 1.41 4.83L2 22l5.35-1.36A10 10 0 1 0 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M8.5 14.5c-.3 0-.5-.1-.7-.3-.2-.2-.5-.2-.7-.2-.3 0-.5-.1-.7-.3-1.4-1.4-1.4-3.6 0-5 1.4-1.4 3.6-1.4 5 0 .3.3.3.7.3 1 .05.08.08.16.13.24-.3.9-.9 1.7-1.8 2.3-.5.3-1 .5-1.6.5z"/></svg>
        <span>WA ${c.waNumber}</span>
      </div>` : "";
    card.innerHTML = `
      <div class="courier-name ${brandClass}">${c.emoji} ${c.name}</div>
      <div class="courier-fee">Ongkir ${money(c.fee5)} (5km) · ${money(c.fee10)} (10km)</div>
      ${waBubble}`;
    grid.appendChild(card);
  });

  const payGrid = $("#payGrid");
  payGrid.innerHTML = "";
  PAYMENT_METHODS.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "pay-card" + (state.selectedPay === p.id ? " selected" : "");
    card.dataset.pay = p.id;
    card.innerHTML = `
      <div class="pay-name">${p.icon} ${p.name}</div>
      <div class="pay-desc">${p.desc}</div>`;
    payGrid.appendChild(card);
  });

  // Tombol "Buka Aplikasi [Kurir] ke Map Resto" untuk jemput pesanan
  renderCourierOrderButtons();

  if (!state.selectedCourier) {
    const keys = Object.keys(couriers);
    state.selectedCourier = keys[0];
    $("#courierGrid .courier-card").classList.add("selected");
  }
  renderPaymentDetails();
  updateSummary();
}

function renderCourierOrderButtons() {
  const btnContainer = $("#courierOrderBtns");
  if (!btnContainer) return;

  const apis = state.settings.courierApis || {};
  const btns = [];

  Object.entries(state.settings.couriers).forEach(([key, c]) => {
    const api = apis[key];
    if (api && api.locateUrl) {
      const url = api.locateUrl.replace("{lat}", state.settings.lat).replace("{lng}", state.settings.lng);
      btns.push(`
        <button type="button" class="courier-order-btn" data-courier-order="${key}" data-url="${escapeHtml(url)}">
          ${c.emoji} ${c.name} → Map Resto (Jemput)
        </button>`);
    }
  });

  btnContainer.innerHTML = btns.length > 0
    ? `<label class="section-label">📍 Arahkan kurir ke map resto untuk jemput pesanan:</label><div class="courier-order-grid">${btns.join("")}</div>`
    : "";
}

function courierForDistance(key, km) {
  const c = state.settings.couriers[key];
  return km <= 5 ? c.fee5 : c.fee10;
}

function updateSummary() {
  const subtotal = cartSubtotal();
  const km = parseFloat($("#custDistance").value) || 5;
  const warn = $("#courierWarn");

  let shipping = 0;
  let courierName = "-";
  if (state.selectedCourier) {
    const c = state.settings.couriers[state.selectedCourier];
    courierName = c.name;
    if (km > state.settings.maxDistanceKm) {
      warn.hidden = false;
      warn.textContent = `⚠️ Jarak ${km} km melebihi maksimal pengantaran (${state.settings.maxDistanceKm} km). Silakan ubah jarak.`;
      shipping = 0;
    } else {
      warn.hidden = true;
      shipping = courierForDistance(state.selectedCourier, km);
    }
  } else {
    warn.hidden = true;
  }

  $("#sumSubtotal").textContent = money(subtotal);
  $("#sumCourierName").textContent = courierName;
  $("#sumShipping").textContent = money(shipping);
  $("#sumTotal").textContent = money(subtotal + shipping);
}

let pendingOrderData = null; // Data pesanan yang menunggu pembayaran

function placeOrder(e) {
  e.preventDefault();
  const name = $("#custName").value.trim();
  const phone = $("#custPhone").value.trim();
  const address = $("#custAddress").value.trim();
  const km = parseFloat($("#custDistance").value);
  const note = $("#custNote").value.trim();

  if (!state.selectedCourier) {
    alert("Pilih kurir penyampai.");
    return;
  }
  if (km > state.settings.maxDistanceKm) {
    alert("Jarak melebihi area pengantaran.");
    return;
  }

  const c = state.settings.couriers[state.selectedCourier];
  const shipping = courierForDistance(state.selectedCourier, km);
  const subtotal = cartSubtotal();
  const total = subtotal + shipping;

  // Simpan data pesanan sementara
  pendingOrderData = {
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    distanceKm: km,
    note: note,
    courier: state.selectedCourier,
    courierName: c.name,
    courierEmoji: c.emoji,
    subtotal: subtotal,
    shippingFee: shipping,
    total: total,
  };

  // Tutup checkout modal, buka payment modal
  $("#checkoutModal").hidden = true;
  showPayModal();
}

/* ---------- Payment Modal ---------- */
function showPayModal() {
  const d = pendingOrderData;
  const subtotal = d.subtotal;
  const shipping = d.shippingFee;
  const total = d.total;

  $("#payModalSummary").innerHTML = `
    <div class="pay-summary-line"><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div class="pay-summary-line"><span>Ongkir (${d.courierEmoji} ${d.courierName})</span><span>${money(shipping)}</span></div>
    <div class="pay-summary-line pay-summary-total"><span>Total Bayar</span><span>${money(total)}</span></div>`;

  // Render payment method cards
  const grid = $("#payGridModal");
  grid.innerHTML = "";
  PAYMENT_METHODS.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "pay-card-modal" + (state.selectedPay === p.id ? " selected" : "");
    card.dataset.pay = p.id;
    card.innerHTML = `
      <div class="pay-modal-icon">${p.icon}</div>
      <div class="pay-modal-name">${p.name}</div>`;
    grid.appendChild(card);
  });

  $("#payInstructions").hidden = true;
  $("#payConfirm").disabled = true;
  $("#payModal").hidden = false;

  // Pilih default payment
  if (state.selectedPay) selectPayMethod(state.selectedPay);
}

function selectPayMethod(payId) {
  state.selectedPay = payId;
  document.querySelectorAll("#payGridModal .pay-card-modal").forEach((c) => {
    c.classList.toggle("selected", c.dataset.pay === payId);
  });

  const d = pendingOrderData;
  const pay = PAYMENT_METHODS.find((p) => p.id === payId);
  const total = d.total;

  // Generate payment reference number
  const refCode = "PAY-" + uid().substring(0, 8).toUpperCase();

  const instructions = $("#payInstructions");
  if (payId === "qris" && state.settings.qrisImage) {
    instructions.innerHTML = `
      <div class="pay-ref-label">📋 Nomor Referensi Pembayaran:</div>
      <div class="pay-ref-code">${refCode}</div>
      <div class="pay-qris-img"><img src="${state.settings.qrisImage}" alt="QRIS"></div>
      <div style="text-align:center;font-size:12px;">Scan QRIS untuk bayar ${money(total)}</div>`;
  } else if (payId === "bank" && state.settings.bankAccount) {
    instructions.innerHTML = `
      <div class="pay-ref-label">📋 Nomor Referensi Pembayaran:</div>
      <div class="pay-ref-code">${refCode}</div>
      <div style="margin-top:8px;">Transfer ke:</div>
      <div style="font-weight:700;margin-top:4px;">${escapeHtml(state.settings.bankName)} ${escapeHtml(state.settings.bankAccount)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">A/n: ${escapeHtml(state.settings.shopAccountName || state.settings.shopName)}</div>
      <div style="margin-top:8px;font-size:12px;">Jumlah: <strong>${money(total)}</strong></div>`;
  } else if (payId === "gopay" && state.settings.gopayAccount) {
    instructions.innerHTML = `
      <div class="pay-ref-label">📋 Nomor Referensi Pembayaran:</div>
      <div class="pay-ref-code">${refCode}</div>
      <div style="margin-top:8px;">Bayar via GoPay:</div>
      <div style="font-weight:700;margin-top:4px;">${escapeHtml(state.settings.gopayAccount)}</div>
      <div style="margin-top:8px;font-size:12px;">Jumlah: <strong>${money(total)}</strong></div>`;
  } else {
    instructions.innerHTML = `
      <div class="pay-ref-label">📋 Nomor Referensi Pembayaran:</div>
      <div class="pay-ref-code">${refCode}</div>
      <div style="margin-top:8px;font-size:12px;">Bayar tunai saat pesanan tiba. Jumlah: <strong>${money(total)}</strong></div>`;
  }

  instructions.hidden = false;
  $("#payConfirm").disabled = false;

  // Simpan ref code untuk order
  pendingOrderData.paymentRef = refCode;
  pendingOrderData.payment = payId;
  pendingOrderData.paymentName = pay ? pay.name : payId;
}

function confirmPayment() {
  const d = pendingOrderData;
  const pay = PAYMENT_METHODS.find((p) => p.id === d.payment);

  const order = {
    id: uid(),
    createdAt: new Date().toISOString(),
    customerName: d.customerName,
    customerPhone: d.customerPhone,
    customerAddress: d.customerAddress,
    distanceKm: d.distanceKm,
    courier: d.courier,
    courierName: d.courierName,
    courierEmoji: d.courierEmoji,
    payment: d.payment,
    paymentName: d.paymentName,
    paymentRef: d.paymentRef || "",
    note: d.note,
    items: state.cart.map((i) => ({ ...i })),
    subtotal: d.subtotal,
    shippingFee: d.shippingFee,
    total: d.total,
    status: "pending",
    timeline: [{ status: "pending", time: new Date().toISOString() }],
  };

  $("#payModal").hidden = true;
  pendingOrderData = null;

  state.cart = [];
  renderCart();

  Store.addOrder(order);
  showConfirm(order);
  showOrderPopup(order);
  startOrderPolling();
}

function closePayModal() {
  $("#payModal").hidden = true;
  pendingOrderData = null;
  // Kembali ke checkout
  renderCheckout();
  $("#checkoutModal").hidden = false;
}

function showConfirm(order) {
  $("#confirmShopName").textContent = state.settings.shopName;
  $("#confirmThanks").textContent = state.settings.thankYou;
  $("#confirmDetail").innerHTML = `
    <p><strong>No. Pesanan:</strong> ${order.id}</p>
    <p><strong>No. Referensi Bayar:</strong> ${order.paymentRef || "—"}</p>
    <p><strong>Pembayaran:</strong> ${order.paymentName}</p>
    <p><strong>Kurir:</strong> ${order.courierEmoji} ${order.courierName}</p>
    <p><strong>Jarak:</strong> ${order.distanceKm} km</p>
    <p><strong>Total:</strong> ${money(order.total)}</p>`;
  $("#checkoutModal").hidden = true;
  $("#confirmModal").hidden = false;

  state.cart = [];
  renderCart();

  // Tampilkan pop-up pesanan aktif setelah konfirmasi
  showOrderPopup(order);
  startOrderPolling();
}

/* ---------- Order Pop-up (Pesanan Aktif) ---------- */
let orderPollTimer = null;

function statusBadgeClass(status) {
  switch (status) {
    case "pending":    return "pending";
    case "working":    return "working";
    case "sending":    return "sending";
    case "delivered":  return "delivered";
    case "cancelled":  return "cancelled";
    default:           return "pending";
  }
}

function statusBadgeText(status) {
  switch (status) {
    case "pending":   return "🟡 Menunggu Konfirmasi";
    case "working":   return "⚙️ Dikerjakan";
    case "sending":   return "🚚 Dikirim";
    case "delivered": return "✅ Diantar";
    case "cancelled": return "❌ Dibatalkan";
    default:          return "🟡 " + status;
  }
}

function showOrderPopup(order) {
  const popup = $("#orderPopup");
  popup.hidden = false;
  popup.classList.remove("slide-out");
  renderOrderPopup(order);
}

function renderOrderPopup(order) {
  const popup = $("#orderPopup");
  popup.dataset.orderId = order.id;
  const cls = statusBadgeClass(order.status);
  popup.classList.remove("pending");
  if (order.status === "pending") popup.classList.add("pending");

  $("#orderPopupStatus").className = "order-popup-badge " + cls;
  $("#orderPopupStatus").textContent = statusBadgeText(order.status);

  const itemsHtml = order.items.map((i) =>
    `<div class="popup-item">
      <span>${i.emoji} ${escapeHtml(i.name)} <span class="popup-qty">×${i.qty}</span></span>
      <span>${money(i.price * i.qty)}</span>
    </div>`
  ).join("");

  $("#orderPopupBody").innerHTML = `
    <div class="popup-order-id">${order.id}</div>
    ${itemsHtml}
    <div class="popup-total">Total: ${money(order.total)}</div>
    <div class="popup-courier">${order.courierEmoji} ${order.courierName} · ${order.distanceKm} km · ${order.paymentName}</div>`;

  const time = new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  $("#orderPopupTime").textContent = "🕒 " + time;
}

function dismissOrderPopup() {
  const popup = $("#orderPopup");
  popup.classList.add("slide-out");
  setTimeout(() => { popup.hidden = true; }, 300);
}

function startOrderPolling() {
  if (orderPollTimer) clearInterval(orderPollTimer);
  orderPollTimer = setInterval(async () => {
    try {
      const popup = $("#orderPopup");
      if (popup.hidden) return;
      const orderId = popup.dataset.orderId;
      if (!orderId) return;
      const orders = await Store.getOrders();
      const fresh = orders.find((o) => o.id === orderId);
      if (fresh && fresh.status !== "delivered" && fresh.status !== "cancelled") {
        renderOrderPopup(fresh);
      } else if (fresh && (fresh.status === "delivered" || fresh.status === "cancelled")) {
        // Update final status then close
        renderOrderPopup(fresh);
        setTimeout(() => {
          dismissOrderPopup();
          stopOrderPolling();
        }, 2500);
      }
    } catch (err) {
      // ignore polling errors
    }
  }, 5000); // poll every 5 seconds
}

function stopOrderPolling() {
  if (orderPollTimer) { clearInterval(orderPollTimer); orderPollTimer = null; }
}

/* ---------- Event binding ---------- */
function bindEvents() {
  // Kategori
  $("#categoryBar").addEventListener("click", (e) => {
    const chip = e.target.closest(".cat-chip");
    if (!chip) return;
    document.querySelectorAll(".cat-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    renderMenu(chip.dataset.cat);
  });

  // Tambah ke keranjang
  $("#menuGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add");
    if (btn) addToCart(btn.dataset.id);
  });

  // Tracking pesanan
  $("#checkStatusBtn").addEventListener("click", openTrackModal);
  $("#closeTrack").addEventListener("click", closeTrackModal);
  $("#trackModal").addEventListener("click", (e) => {
    if (e.target.id === "trackModal") closeTrackModal();
  });
  $("#trackSearchBtn").addEventListener("click", trackSearch);
  $("#trackInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") trackSearch();
  });

  // Keranjang
  $("#cartBtn").addEventListener("click", openCart);
  $("#floatCartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);

  $("#cartItems").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === "inc") changeQty(id, "inc");
    else if (btn.dataset.act === "dec") changeQty(id, "dec");
    else if (btn.dataset.act === "del") removeItem(id);
  });

  // Checkout
  $("#checkoutBtn").addEventListener("click", () => {
    renderCheckout();
    $("#checkoutModal").hidden = false;
  });
  $("#closeCheckout").addEventListener("click", () => { $("#checkoutModal").hidden = true; });
  $("#checkoutModal").addEventListener("click", (e) => {
    if (e.target.id === "checkoutModal") $("#checkoutModal").hidden = true;
  });

  // Courier & payment selection
  $("#courierGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".courier-card");
    if (!card) return;
    state.selectedCourier = card.dataset.courier;
    document.querySelectorAll("#courierGrid .courier-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    updateSummary();
  });

  // Tombol "Buka Aplikasi [Kurir] → Map Resto" — jemput pesanan
  $("#courierOrderBtns").addEventListener("click", (e) => {
    const btn = e.target.closest(".courier-order-btn");
    if (!btn) return;
    const url = btn.dataset.url;
    if (url) {
      window.open(url, "_blank");
      showToast("Membuka " + btn.textContent.trim() + " — navigasi ke resto untuk jemput pesanan...");
    }
  });
  $("#payGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".pay-card");
    if (!card) return;
    state.selectedPay = card.dataset.pay;
    document.querySelectorAll("#payGrid .pay-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
  });

  // Distance live update
  $("#custDistance").addEventListener("input", updateSummary);

  $("#checkoutForm").addEventListener("submit", placeOrder);
  $("#confirmClose").addEventListener("click", () => { $("#confirmModal").hidden = true; });

  // Payment modal
  $("#payGridModal").addEventListener("click", (e) => {
    const card = e.target.closest(".pay-card-modal");
    if (!card) return;
    selectPayMethod(card.dataset.pay);
  });
  $("#payConfirm").addEventListener("click", confirmPayment);
  $("#payCancel").addEventListener("click", closePayModal);
  $("#closePay").addEventListener("click", closePayModal);
  $("#payModal").addEventListener("click", (e) => {
    if (e.target.id === "payModal") closePayModal();
  });

  // Order Pop-up
  $("#orderPopupClose").addEventListener("click", () => { dismissOrderPopup(); stopOrderPolling(); });
  $("#orderPopupDetail").addEventListener("click", () => {
    const popup = $("#orderPopup");
    const orderId = popup.dataset.orderId;
    if (orderId) {
      $("#trackInput").value = orderId;
      $("#trackModal").hidden = false;
    }
  });

  $("#year").textContent = new Date().getFullYear();
}

function openCart() {
  $("#overlay").hidden = false;
  $("#cartDrawer").style.display = "flex";
}

function closeCart() {
  $("#cartDrawer").style.display = "none";
  $("#overlay").hidden = true;
}

/* ---------- Tracking Pesanan ---------- */
const TRACK_STEPS = [
  { status: "pending",    title: "Diterima",      icon: "📋" },
  { status: "confirmed",  title: "Dikonfirmasi",  icon: "✅" },
  { status: "preparing",  title: "Dikerjakan",    icon: "👨‍🍳" },
  { status: "delivering", title: "Dikirim",       icon: "🚚" },
  { status: "delivered",  title: "Selesai",       icon: "🎉" },
];

const STATUS_ORDER = ["pending", "confirmed", "preparing", "delivering", "delivered"];

function openTrackModal() {
  $("#trackModal").hidden = false;
  $("#trackInput").value = "";
  $("#trackResults").innerHTML = "";
  $("#trackInput").focus();
}

function closeTrackModal() {
  $("#trackModal").hidden = true;
}

async function trackSearch() {
  const query = $("#trackInput").value.trim().toLowerCase();
  const results = $("#trackResults");

  if (!query) {
    results.innerHTML = '<div class="track-empty">Masukkan No. Pesanan atau Nama...</div>';
    return;
  }

  const orders = await Store.getOrders();
  const matched = orders.filter((o) =>
    o.id.toLowerCase().includes(query) ||
    o.customerName.toLowerCase().includes(query)
  );

  if (matched.length === 0) {
    results.innerHTML = `
      <div class="track-not-found">
        ❌ Pesanan tidak ditemukan.<br>
        <small>Pastikan No. Pesanan atau Nama benar.</small>
      </div>`;
    return;
  }

  results.innerHTML = matched.map(trackResultHtml).join("");
}

function trackResultHtml(order) {
  const steps = TRACK_STEPS.map((step) => {
    const stepIndex = STATUS_ORDER.indexOf(step.status);
    const orderIndex = STATUS_ORDER.indexOf(order.status);
    const isDone = stepIndex <= orderIndex && order.status !== "cancelled";
    const isActive = stepIndex === orderIndex;

    // Cari waktu dari timeline
    const timelineEntry = (order.timeline || []).find((t) => t.status === step.status);
    const timeText = timelineEntry
      ? new Date(timelineEntry.time).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })
      : "";

    // Clock icon untuk status "Dikerjakan"
    const clockIcon = step.status === "preparing" && isActive
      ? '<span class="track-clock">Diproses</span>'
      : "";

    const stepClass = isActive ? "active" : (isDone ? "done" : "");

    return `
      <div class="track-step ${stepClass}">
        <div class="track-icon">${isDone || isActive ? step.icon : "○"}</div>
        <div class="track-step-content">
          <div class="track-step-title">${step.title}${clockIcon}</div>
          ${timeText ? `<div class="track-step-time">🕒 ${timeText}</div>` : ""}
        </div>
      </div>`;
  }).join("");

  const cancelled = order.status === "cancelled";
  const thanksNotify = order.status === "delivered"
    ? `
      <div class="track-thanks-notify">
        <div class="track-notify-icon">🎊</div>
        Terima kasih sudah sabar menunggu! 🎉
      </div>`
    : "";

  const itemsHtml = order.items.map((i) => `${i.emoji} ${escapeHtml(i.name)} ×${i.qty}`).join(", ");
  const time = new Date(order.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return `
    <div class="track-result">
      <div class="track-order-id">📦 ${order.id}</div>
      <div class="track-order-date">Dibuat: ${time}</div>
      <div class="track-order-name">👤 ${escapeHtml(order.customerName)} · 📞 ${escapeHtml(order.customerPhone)}</div>
      <div class="track-order-items">${escapeHtml(itemsHtml)}</div>
      <div class="track-order-total">Total: ${money(order.total)} · ${order.courierEmoji} ${order.courierName} · ${order.distanceKm} km</div>
      ${cancelled ? '<div class="track-not-found">❌ Pesanan Dibatalkan</div>' : ""}
      ${cancelled ? "" : `<div class="track-timeline">${steps}</div>`}
      ${thanksNotify}
    </div>`;
}

/* ---------- Start ---------- */
init();
