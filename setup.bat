@echo off
REM Quick start script for PoE Clip Checker

echo PoE Clip Checker - Quick Start Setup

REM Check Node.js
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        exit /b 1
    )
) else (
    echo Dependencies already installed
)

REM Check if .env.local exists
if not exist ".env.local" (
    echo Creating .env.local from template...
    copy .env.example .env.local > nul
    echo.
    echo Add your Twitch Client ID and Client Secret to .env.local, then run setup.bat again.
    pause
    exit /b 1
)

REM Initialize database
echo.
echo Initializing database...
call npm run db:push
if errorlevel 1 (
    echo Failed to initialize database
    pause
    exit /b 1
)

REM Build optimized app
echo.
echo Building optimized app...
call npm run build
if errorlevel 1 (
    echo Failed to build app
    pause
    exit /b 1
)

echo.
echo Setup complete.
echo Double-click start.bat to run the app.
echo.
pause
