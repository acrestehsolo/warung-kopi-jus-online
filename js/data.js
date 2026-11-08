/* ===================================================================
 * data.js — Data default warung kopi, jus & jus detok
 * Semua ini bisa diubah melalui halaman Admin > Pengaturan
 * =================================================================== */

// --- Pengaturan warung (bisa diubah di Admin) ---
const DEFAULT_SETTINGS = {
  shopName: "Warung Kopi Mas Wahyu Banyuany",
  phone: "0812-3456-7890",
  shopWaNumber: "0812-3456-7890", // No. WA kasir untuk konfirmasi pembayaran
  address: "Jl. Bone Barat Utama No 12, Banyuany",
  thankYou: "Terima kasih atas pesanannya! Semoga kopi dan jusnya enak serta menyegarkan hari Anda 😊",
  adminPassword: "666666",
  maxDistanceKm: 10, // radius maksimal pengantaran (km)
  // Lokasi resto (latitude, longitude) untuk Google Maps
  lat: -7.4217,
  lng: 110.7456,
  // Logo toko (base64 data URL dari JPG upload)
  logo: "",
  // Gambar QRIS (base64 data URL dari JPG upload)
  qrisImage: "",
  // Informasi pembayaran
  bankName: "",       // Nama bank, mis: "BCA"
  bankAccount: "",    // Nomor rekening
  shopAccountName: "", // Nama pemilik rekening
  gopayAccount: "",   // Nomor GoPay / e-wallet
  // API & Deep Link kurir (isi di Admin > Pengaturan > API Kurir)
  // locateUrl: deep-link yang membuka aplikasi kurir ke map resto untuk pickup pesanan
  // Gunakan placeholder {lat} dan {lng} — diganti dengan koordinat resto
  courierApis: {
    gofood:     { locateUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}", apiKey: "" },
    grabfood:   { locateUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}", apiKey: "" },
    shopeefood: { locateUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}", apiKey: "" },
    maxim:      { locateUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}", apiKey: "" },
  },
  // Tarif ongkir per kurir: fee5 = jarak 0–5 km, fee10 = jarak 5–10 km (Rp)
  couriers: {
    gofood:     { name: "GoFood",      emoji: "🟢", fee5: 6000, fee10: 10500, minOrder: 15000 },
    grabfood:   { name: "GrabFood",    emoji: "🟢", fee5: 6500, fee10: 11000, minOrder: 15000 },
    shopeefood: { name: "ShopeeFood",  emoji: "🟠", fee5: 5500, fee10: 9500,  minOrder: 10000 },
    maxim:      { name: "Maxim",       emoji: "🟡", fee5: 5000, fee10: 8500,  minOrder: 10000 },
    kurirresto: { name: "Kurir Resto", emoji: "🟢", fee5: 5000, fee10: 5000,  minOrder: 5000,  waNumber: "" },
  },
};

// --- Kategori menu ---
const CATEGORIES = [
  { id: "kopi",      name: "Kopi",      emoji: "☕" },
  { id: "jus",       name: "Jus Segar", emoji: "🍹" },
  { id: "detoks",    name: "Jus Detoks",emoji: "🌿" },
  { id: "camilan",   name: "Camilan",   emoji: "🍪" },
];

// --- Menu default (dengan gambar asli dari web) ---
const DEFAULT_MENU = [
  // ===== Kopi =====
  { id: "m1",  name: "Kopi Susu Gula Aren",     category: "kopi",   price: 12000, emoji: "☕",  image: "assets/kopi-susu-glass-fresh-coffee-drink-prese-1.jpg", desc: "Espresso + susu segar + gula aren, legit dan harum." },
  { id: "m2",  name: "Kopi Hitam Tubruk",        category: "kopi",   price: 9000,  emoji: "☕",  image: "assets/kopi-hitam-tubruk-poured-into-glass-blac-1.jpg", desc: "Kopi tubruk original, aroma kuat tanpa gula." },
  { id: "m3",  name: "Kopi Float",               category: "kopi",   price: 15000, emoji: "🍨",  image: "assets/coffee-float-ice-cream-glass-dessert-1.jpg", desc: "Kopi susu dengan es krim vanila di atasnya." },
  { id: "m4",  name: "Kopi Kelapa Muda",         category: "kopi",   price: 16000, emoji: "🥥",  image: "assets/kopi-susu-glass-fresh-coffee-drink-prese-4.jpg", desc: "Kopi dengan santan kelapa muda segar." },
  { id: "m5",  name: "Es Kopi Susu",             category: "kopi",   price: 13000, emoji: "🧊",  image: "assets/kopi-susu-glass-fresh-coffee-drink-prese-5.jpg", desc: "Kopi susu dingin, segar untuk cuaca panas." },

  // ===== Jus Segar =====
  { id: "m6",  name: "Jus Semangka",             category: "jus",    price: 10000, emoji: "🍉",  image: "assets/fresh-fruit-juice-glass-tropical-beverag-2.jpg", desc: "Semangka segar blend dingin, tanpa gula tambahan." },
  { id: "m7",  name: "Jus Mangga",               category: "jus",    price: 11000, emoji: "🥭",  image: "assets/fresh-fruit-juice-glass-tropical-beverag-3.png", desc: "Mangga harum segar dengan es." },
  { id: "m8",  name: "Jus Alpukat Susu",         category: "jus",    price: 14000, emoji: "🥑",  image: "assets/avocado-smoothie-milk-juice-glass-creamy-2.jpg", desc: "Alpukat lembut dengan susu kental manis." },
  { id: "m9",  name: "Jus Jeruk Lemon",          category: "jus",    price: 10000, emoji: "🍋",  image: "assets/fresh-fruit-juice-glass-tropical-beverag-4.webp", desc: "Jeruk + lemon segar, kaya vitamin C." },
  { id: "m10", name: "Jus Sawo",                 category: "jus",    price: 12000, emoji: "🍑",  image: "assets/sapodilla-fruit-juice-sawo-fresh-glass-2.jpg", desc: "Sawo segar lembut, aroma manis khas." },

  // ===== Jus Detoks =====
  { id: "m11", name: "Detoks Hijau",             category: "detoks", price: 15000, emoji: "🥬",  image: "assets/green-detox-juice-smoothie-healthy-glass-1.jpg", desc: "Bayam, mentimun, apel, jahe — detoks ringan." },
  { id: "m12", name: "Detoks Bit & Lemon",       category: "detoks", price: 16000, emoji: "🍇",  image: "assets/green-detox-juice-smoothie-healthy-glass-2.jpg", desc: "Bit, wortel, lemon, apel — kaya antioksidan." },
  { id: "m13", name: "Detoks Jahe Timun",        category: "detoks", price: 15000, emoji: "🫚",  image: "assets/green-detox-juice-smoothie-healthy-glass-3.jpg", desc: "Jahe, timun, lemon, daun mint — hangat dan menyegarkan." },
  { id: "m14", name: "Detoks Green Tea & Aloe",  category: "detoks", price: 17000, emoji: "🍵",  image: "assets/green-detox-juice-smoothie-healthy-glass-4.webp", desc: "Green tea + aloe vera + madu — detoks lembut." },
  { id: "m15", name: "Detoks Seledri Apel",      category: "detoks", price: 16000, emoji: "🥒",  image: "assets/green-detox-juice-smoothie-healthy-glass-5.jpg", desc: "Seledri, apel hijau, jahe — detoks sehat." },

  // ===== Camilan =====
  { id: "m16", name: "Roti Bakar Cokelat",       category: "camilan",price: 9000,  emoji: "🍞",  image: "assets/roti-bakar-cokelat-indonesian-toast-brea-1.jpg", desc: "Roti bakar isi cokelat dengan taburan keju." },
  { id: "m17", name: "French Fries",             category: "camilan",price: 8000,  emoji: "🍟",  image: "assets/french-fries-kentang-goreng-crispy-golde-1.jpg", desc: "Kentang goreng crispy dengan saus." },
  { id: "m18", name: "Nasi Goreng Spesial",      category: "camilan",price: 15000, emoji: "🍛",  image: "assets/nasi-goreng-indonesian-fried-rice-served-1.jpg", desc: "Nasi goreng dengan telur dan ayam dalam piring." },

  // ===== Minuman Tambahan =====
  { id: "m19", name: "Es Teh Tarik",            category: "jus",    price: 8000,  emoji: "🧋",  image: "assets/es-teh-tarik-teh-tarik-milk-tea-glass-1.jpg", desc: "Teh tarik dingin, harum dan manis." },

  // ===== Jus Buah Segar =====
  { id: "m21", name: "Jus Nanas",                category: "jus",    price: 12000, emoji: "🍍",  image: "assets/pineapple-juice-fresh-glass-tropical-2.webp", desc: "Nanas segar, manis dan segarkan." },
  { id: "m22", name: "Jus Melon",                category: "jus",    price: 12000, emoji: "🍈",  image: "assets/melon-juice-fresh-glass-sweet-2.jpg", desc: "Melon segar, manis dan menyegarkan." },

  // ===== Kopi Spesial =====
  { id: "m24", name: "Kopi Espreso",             category: "kopi",   price: 12000, emoji: "☕",  image: "assets/espresso-coffee-glass-shot-serving-prese-1.jpg", desc: "Espreso pekat, aroma kuat dan bold." },
  { id: "m25", name: "Kopi Susu",                category: "kopi",   price: 14000, emoji: "🥛",  image: "assets/kopi-susu-indonesian-coffee-with-milk-gl-2.jpg", desc: "Kopi susu dengan gula aren, lembut dan manis." },
  { id: "m26", name: "Kopi Robusta",             category: "kopi",   price: 12000, emoji: "☕",  image: "assets/robusta-coffee-indonesian-black-coffee-c-1.webp", desc: "Kopi robusta hitam, strong dan penuh karakter." },
  { id: "m27", name: "Kopi Temanggung",          category: "kopi",   price: 15000, emoji: "☕",  image: "assets/kopi-temanggung-coffee-indonesian-tradit-2.jpg", desc: "Kopi Temanggung tradisional, aroma khas dan kuat." },

  // ===== Camilan Tambahan =====
  { id: "m20", name: "Mie Goreng Telor",         category: "camilan",price: 12000, emoji: "🍜",  image: "assets/mie-goreng-indonesian-fried-noodles-with-2.jpg", desc: "Mie goreng dengan telur dan Sayuran." },
  { id: "m28", name: "Roti Kecil",               category: "camilan",price: 6000,  emoji: "🍞",  image: "assets/roti-kecil-indonesian-small-bread-pastry-1.jpg", desc: "Roti kecil lembut, pas untuk camilan ringan." },
];

// --- Metode pembayaran ---
const PAYMENT_METHODS = [
  { id: "tunai",    name: "Bayar Tunai (COD)", icon: "💵", desc: "Bayar tunai ke kurir saat pesanan diantar." },
  { id: "qris",     name: "QRIS",              icon: "📷", desc: "Scan QRIS dengan dompet digital apa saja." },
  { id: "transfer", name: "Transfer Bank",     icon: "🏦", desc: "Transfer ke rekening bank warung." },
  { id: "ewallet",  name: "E-Wallet",          icon: "📱", desc: "GoPay, OVO, ShopeePay, GrabPay, DANA." },
];

// --- Status pesanan ---
const ORDER_STATUS = [
  { id: "pending",    name: "Menunggu Konfirmasi", color: "#f59e0b" },
  { id: "confirmed",  name: "Dikonfirmasi",         color: "#3b82f6" },
  { id: "preparing",  name: "Dibuat",               color: "#8b5cf6" },
  { id: "delivering", name: "Dalam Pengantaran",    color: "#0ea5e9" },
  { id: "delivered",  name: "Selesai",              color: "#16a34a" },
  { id: "cancelled",  name: "Dibatalkan",           color: "#dc2626" },
];
