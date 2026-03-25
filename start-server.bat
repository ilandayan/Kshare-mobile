@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
echo Starting Expo on port 8082...
npx expo start --web --port 8082
