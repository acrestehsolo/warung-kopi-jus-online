# ☕ Warung Kopi & Jus Online

Online shop untuk warung kopi/jus/detok dengan sistem pengantaran via kurir (GoFood, GrabFood, ShopeeFood, Maxim, Kurir Resto).

## ✨ Fitur

- **Menu kopi, jus, detoks, camilan** — dengan gambar asli dari web
- **Keranjang belanja** — dengan ongkir berdasarkan jarak (5km / 10km)
- **Pilihan kurir** — GoFood 🟢, GrabFood 🟢, ShopeeFood 🟠, Maxim 🟡, Kurir Resto 💜
- **Deep link kurir** — arahkan ke map resto untuk jemput pesanan
- **Payment method** — Tunai, QRIS, Transfer Bank, GoPay
- **Pop-up pesanan aktif** — live order tracking di bawah keranjang
- **Admin dashboard** — lihat & manage pesanan
- **Cetak struk** — thermal printer receipt untuk customer
- **Pengaturan toko** — nama, alamat, WA, logo, QRIS, bank, GoPay, Google Maps
- **27 menu items** — kopi spesial, jus segar, detoks, camilan

## 🚀 Cara Install

### Opsi 1: Run Locally (One-Click)

**Windows:**
```bat
# 1. Download zip dari GitHub
# 2. Extract
# 3. Double-click start.bat
# → otomatis install + mulai server + buka admin
```

**Mac/Linux:**
```bash
# 1. Download zip dari GitHub
# 2. Extract
# 3. chmod +x start.sh && ./start.sh
# → otomatis install + mulai server + buka admin
```

**Manual:**
```bash
git clone https://github.com/username/warung-kopi-jus-online.git
cd warung-kopi-jus-online
npm install express
node server.js
# → browser auto-buka di http://localhost:3000/admin.html
```

### Opsi 2: Deploy ke Railway/Render (Gratis)

```bash
# 1. Push ke GitHub
git init
git add .
git commit -m "Deploy warung kopi jus online"
git remote add origin https://github.com/username/warung-kopi-jus-online.git
git push -u origin main

# 2. Deploy di Railway
# - buka railway.com → sign up
# - New Project → Connect GitHub → pilih repo
# - Build: npm install
# - Start: node server.js
# - Dapatkan URL: https://warung-kopi-xxx.up.railway.app

# Atau di Render
# - buka render.com → sign up
# - New Service → Web Service → GitHub → pilih repo
# - Build: npm install
# - Start: node server.js
```

### Opsi 3: GitHub Pages (Static Only)

```bash
# 1. Push ke GitHub
git push origin main

# 2. Aktifkan GitHub Pages
# GitHub → Settings → Pages → Source: main branch → Save

# 3. Buka di:
# https://username.github.io/warung-kopi-jus-online/
```

> ⚠️ GitHub Pages hanya static — tanpa backend, order tersimpan di localStorage browser (tidak sync antar device). **Untuk sync order → admin, perlu backend Deno Deploy (Opsi 4).**

### Opsi 4: Backend Deno Deploy (REKOMENDED untuk GitHub Pages)

Ini yang bikin order dari pelanggan **langsung muncul di admin**, walaupun situs static di GitHub Pages.

**Langkah-langkah:**

1. **Push file backend ke GitHub**
   - File `api/deno.ts` dan `deno.json` sudah ada di repo. Push ke GitHub:
   ```bash
   git add api/deno.ts deno.json js/store.js
   git commit -m "Add Deno Deploy backend"
   git push origin main
   ```

2. **Deploy di Deno Deploy** (gratis, tidak tidur)
   - Buka https://dash.deno.com → sign in dengan GitHub
   - Click **New Project** → Connect GitHub → pilih repo `warung-kopi-jus-online`
   - Entry point: **`api/deno.ts`** (atau otomatis terdeteksi dari `deno.json`)
   - Klik **Deploy** → tunggu beberapa detik
   - Salin URL yang dihasilkan, contoh:
     `https://warung-kopi-jus-online.acrestehsolo.deno.dev`

3. **Pasang URL ke store.js**
   - Buka file `js/store.js` di repo
   - Cari baris: `const SERVER_URL = "YOUR-DENO-URL";`
   - Ganti dengan URL Deno Deploy kamu, contoh:
     ```js
     const SERVER_URL = "https://warung-kopi-jus-online.acrestehsolo.deno.dev";
     ```
   - Push ke GitHub:
   ```bash
   git add js/store.js
   git commit -m "Set Deno Deploy URL"
   git push origin main
   ```

4. **Verifikasi**
   - Buka `https://{URL-DENO}/api/health` → harus return `{"ok":true,"mode":"server"}`
   - Buka storefront → place order → buka admin.html → order harus muncul

**Cara ganti URL Deno Deploy nanti (jika mau):**
- Edit satu baris `SERVER_URL` di `js/store.js`, push ke GitHub. Selesai.

**Fitur backend:**
- ✅ Order dari pelanggan → langsung masuk backend (KV persisten)
- ✅ Admin auto-refresh 5s → order baru langsung muncul
- ✅ Settings (nama toko, WA, bank, QRIS, tarif ongkir) sync semua device
- ✅ 1 juta request/bulan, 1 GB storage — gratis, tidak tidur

## 🔐 Admin Login

- **Password**: `666666`
- **URL**: `http://localhost:3000/admin.html` (atau URL deployed)

## 🎛️ Pengaturan Admin

### ⚙️ Pengaturan Toko
- Nama warung
- Nomor HP
- Alamat
- Pesan terima kasih
- Kata sandi admin
- Radius pengantaran (max km)
- Logo toko (JPG upload)
- QRIS image (JPG upload)
- Informasi pembayaran (bank, GoPay)

### 🗺️ Google Maps
- Latitude & Longitude resto
- Preview map + buka di Google Maps

### 💰 Tarif Ongkir
- Fee per kurir (5km / 10km)
- Minimal pesanan
- Nomor WhatsApp untuk Kurir Resto

### 🔗 API & Deep Link Kurir
- Locate URL per kurir (gunakan `{lat}` dan `{lng}`)
- Buka aplikasi kurir ke map resto untuk jemput

### 🍽️ Kelola Menu
- Tambah / hapus / edit menu
- Edit harga & deskripsi (inline, double-click)
- Upload gambar item (JPG)

## 📦 Struktur File

```
warung-kopi-jus-online/
├── index.html          # Storefront (customer)
├── admin.html          # Admin panel
├── server.js           # Express server (local)
├── api/
│   └── deno.ts         # Backend Deno Deploy (cloud — pusat order)
├── deno.json           # Deno Deploy config (entrypoint)
├── css/
│   └── style.css       # Teal-green theme
├── js/
│   ├── data.js         # DEFAULT_SETTINGS, MENU, PAYMENT_METHODS
│   ├── store.js        # Store layer (server=Deno Deploy / localStorage)
│   ├── app.js          # Storefront logic
│   └── admin.js        # Admin logic
├── assets/             # Menu images + hero banner
├── test-jsdom.js       # 13 tests (all pass)
└── .gitignore
```

## 🛒 Menu

### Kopi (9 items)
| Menu | Price |
|------|-------|
| Kopi Susu Gula Aren | Rp 12,000 |
| Kopi Hitam Tubruk | Rp 9,000 |
| Kopi Float | Rp 15,000 |
| Kopi Kelapa Muda | Rp 16,000 |
| Es Kopi Susu | Rp 13,000 |
| Kopi Espreso | Rp 12,000 |
| Kopi Susu | Rp 14,000 |
| Kopi Robusta | Rp 12,000 |
| Kopi Temanggung | Rp 15,000 |

### Jus Segar (8 items)
| Menu | Price |
|------|-------|
| Jus Mangga | Rp 12,000 |
| Jus Alpukat Susu | Rp 14,000 |
| Jus Jeruk Segar | Rp 12,000 |
| Jus Banana | Rp 12,000 |
| Jus Sawo | Rp 12,000 |
| Es Teh Tarik | Rp 8,000 |
| Jus Nanas | Rp 12,000 |
| Jus Melon | Rp 12,000 |

### Jus Detoks (5 items)
| Menu | Price |
|------|-------|
| Green Detox | Rp 15,000 |
| Detoks Smoothie | Rp 15,000 |
| Detoks Hijau | Rp 15,000 |
| Detoks Buah | Rp 15,000 |
| Detoks Matcha | Rp 18,000 |

### Camilan (5 items)
| Menu | Price |
|------|-------|
| Roti Bakar Cokelat | Rp 8,000 |
| French Fries | Rp 10,000 |
| Nasi Goreng Spesial | Rp 15,000 |
| Mie Goreng Telor | Rp 12,000 |
| Roti Kecil | Rp 6,000 |

## 🤖 Teknis

- **Backend (recommended)**: Deno Deploy + Deno KV (cloud, selalu aktif, gratis) — untuk sync order di GitHub Pages
- **Backend (local)**: Node.js + Express (`server.js`)
- **Frontend**: Vanilla JS, HTML5, CSS3
- **Data**: Deno KV (cloud) / `data.json` (Express local) / localStorage (fallback)
- **Test**: jsdom (13 tests, all pass) + mock KV API test (all routes pass)
- **Palette**: Teal-green (#0d9488) + fresh green gradient

## 📄 License

MIT License — bebas digunakan.

---

**Powered by Bolang** ☕🍹
