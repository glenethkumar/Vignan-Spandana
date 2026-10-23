@echo off
title Vignan Spandana - AI Parent Communication System
cd /d "%~dp0"

echo ==========================================================
echo   Vignan Spandana - AI Parent Communication System
echo ==========================================================
echo Starting local web server...
echo.

:: Automatically open default browser after a 2-second delay
start "" http://127.0.0.1:5000

:: Run the Flask server
python app.py

pause
