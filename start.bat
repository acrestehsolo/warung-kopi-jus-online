@echo off
chcp 65001 >nul
echo ╔═══════════════════════════════════════════════════╗
echo ║   ☕ WARUNG KOPI & JUS ONLINE — START SERVER     ║
echo ╚═══════════════════════════════════════════════════╝
echo.

echo [1/3] Cek Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo ❌ Node.js tidak terinstall!
  echo Unduh di: https://nodejs.org/
  pause
  exit /b 1
)
echo ✅ Node.js terinstall

echo.
echo [2/3] Install dependencies...
call npm install express

echo.
echo [3/3] Mulai server...
echo 📋 Admin: http://localhost:3000/admin.html
echo 🛒 Store: http://localhost:3000
echo.
echo 💡 Login admin: 666666
echo.
echo ⏳ Tekan Ctrl+C untuk stop server
echo.
start "" http://localhost:3000/admin.html
node server.js

pause
