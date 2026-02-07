@echo off
echo 🚀 Starting SolarFlow with bootloader...

REM Run auto-start system
node auto-start.js

REM Start the application (if server.js exists)
if exist server.js (
    echo 🌐 Starting production server...
    node server.js
) else (
    echo 📄 Static mode - files served via GitHub Pages
    pause
)
