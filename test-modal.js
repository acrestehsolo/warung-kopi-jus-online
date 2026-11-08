/* Test verifikasi bug modal "tidak bergerak" */
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("CONSOLE: " + msg.text());
  });

  const url = "http://localhost:3000/index.html";
  await page.goto(url, { waitUntil: "networkidle0" });

  // Helper: cek visibilitas modal
  const isVisible = async (sel) => {
    return await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }, sel);
  };

  const results = [];
  const log = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log((ok ? "✅" : "❌") + " " + name + (detail ? " — " + detail : ""));
  };

  // 1. Modals harus tersembunyi di awal
  log("Modal checkout tersembunyi saat load", !(await isVisible("#checkoutModal")));
  log("Modal confirm tersembunyi saat load", !(await isVisible("#confirmModal")));

  // 2. Tambah item ke cart
  await page.click("#menuGrid .btn-add");
  await page.click("#menuGrid .btn-add");
  await new Promise((r) => setTimeout(r, 300));
  const cartCount = await page.$eval("#cartCount", (el) => el.textContent);
  log("Keranjang bertambah", cartCount === "2", "count=" + cartCount);

  // 3. Buka checkout
  await page.click("#cartBtn");
  await new Promise((r) => setTimeout(r, 200));
  await page.click("#checkoutBtn");
  await new Promise((r) => setTimeout(r, 300));
  log("Modal checkout terbuka", await isVisible("#checkoutModal"));

  // 4. Isi form checkout
  await page.type("#custName", "Budi");
  await page.type("#custPhone", "081234567890");
  await page.type("#custAddress", "Jl. Merdeka 10, Kartasura");
  await page.type("#custDistance", "5");

  // Pilih kurir (sudah terpilih default) dan metode bayar
  await page.click("#payGrid .pay-card");
  await new Promise((r) => setTimeout(r, 200));

  // 5. Pesan
  await page.click("#submitOrder");
  await new Promise((r) => setTimeout(r, 500));

  // 6. Modal confirm harus muncul
  log("Modal confirm muncul setelah order", await isVisible("#confirmModal"));
  const thanksText = await page.$eval("#confirmThanks", (el) => el.textContent);
  log("Ucapan terima kasih muncul", thanksText.length > 0, thanksText.slice(0, 40));

  // 7. Klik "Oke, Siap!" — modal harus hilang (ini yang sebelumnya bug)
  await page.click("#confirmClose");
  await new Promise((r) => setTimeout(r, 300));
  log("Modal confirm tertutup setelah klik Oke", !(await isVisible("#confirmModal")));

  // 8. Pesanan tersimpan (cek via API)
  const orders = await page.evaluate(async () => {
    const res = await fetch("/api/orders");
    return await res.json();
  });
  log("Pesanan tersimpan di server", orders.length > 0, "total=" + orders.length);

  if (errors.length > 0) {
    console.log("\n⚠️  JS errors:");
    errors.forEach((e) => console.log("  " + e));
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + (failed.length === 0 ? "🎉 Semua tes PASS!" : failed.length + " tes FAIL!"));
  process.exit(failed.length === 0 && errors.length === 0 ? 0 : 1);
})();
