#!/bin/bash
echo "╔═══════════════════════════════════════════════════╗"
echo "║   ☕ WARUNG KOPI & JUS ONLINE — START SERVER     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo

echo "[1/3] Cek Node.js..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak terinstall!"
  echo "Unduh di: https://nodejs.org/"
  exit 1
fi
echo "✅ Node.js terinstall"

echo
echo "[2/3] Install dependencies..."
npm install express

echo
echo "[3/3] Mulai server..."
echo "📋 Admin: http://localhost:3000/admin.html"
echo "🛒 Store: http://localhost:3000"
echo
echo "💡 Login admin: 666666"
echo
echo "⏳ Tekan Ctrl+C untuk stop server"
echo

# Open admin in browser (Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "http://localhost:3000/admin.html"
# Open admin in browser (Linux)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open "http://localhost:3000/admin.html" 2>/dev/null &
fi

node server.js
