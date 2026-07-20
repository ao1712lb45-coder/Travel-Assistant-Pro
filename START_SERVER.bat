@echo off
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo [無法啟動] 尚未安裝 Node.js 18 或更新版本。
  echo 請參考 README.md 的安裝說明。
  pause
  exit /b 1
)
start "" http://127.0.0.1:4173
node server.js
pause
