@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installing website dependencies...
  npm install
)

if not exist dist\index.js (
  echo Building website...
  npm run build
)

set PORT=3000
echo.
echo Grace ^& Grind is starting on http://localhost:%PORT%
echo Booking requests will save to data\bookings.jsonl
echo.
npm start
pause
