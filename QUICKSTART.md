# Quick Start Guide

## ⚡ Get Running in 5 Minutes

### Prerequisites
- Node.js 18+

### Step 1: Setup

```bash
copy .env.example .env.local
setup.bat
```

Add Twitch credentials to `.env.local` when prompted, then run `setup.bat` again.

### Step 2: Start

Double-click `start.bat`, then open http://localhost:3000

### Manual Setup (if scripts don't work)

```bash
npm install
npm run db:push
npm run build
npm start
```

Open http://localhost:3000

### Step 3: Use the App

1. **Go to /streamers**
   - Choose or create a list
   - Select `poe_streamers_app_import.csv`
   - Or add handles manually

2. **Go to /clips**
   - Fetch clips
   - New Twitch IDs resolve and cache automatically
   - Export selected links
   - Use fetch history for older runs

Done! 🎉

## Troubleshooting

**No clips found?**
- Make sure streamers are active in selected list
- Check failed fetch messages on Clips page

See [README.md](README.md) for detailed docs.
