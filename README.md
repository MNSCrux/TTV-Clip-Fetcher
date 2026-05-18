# PoE Clip Checker

A fast, local clip review dashboard for Twitch streamers. Import streamer handles, fetch Twitch clip metadata through Helix, and export selected clip links.

## Features

- **Streamer Management**
  - Add streamers by handle
  - Import handles from CSV
  - Append/merge or replace whole list
  - Enable/disable fetching and bulk delete streamers
  - Auto-resolve Twitch handles to broadcaster IDs

- **Clip Fetching**
  - Fetch clips with official Twitch API
  - Fetch clips from last 24 hours by default
  - Custom date range support
  - Batch resolution of unresolved streamers
  - Graceful error handling per streamer
  - Continue fetching even if individual streamers fail

- **Clip Dashboard**
  - View clips with metadata (views, duration, creator, game)
  - Sort by newest, oldest, most viewed, duration, or streamer name
  - Filter by core Twitch game buckets and views
  - Search clip titles
  - Keyboard shortcuts for fast navigation and review

- **Quick Review**
  - Clip preview with thumbnail
  - One-click actions: Select, Reject, Reset, Copy URL, Open on Twitch

- **Export**
  - Export selected clip links as grouped TXT lists
  - Keep dated saved lists for past exports

- **Settings**
  - Configure Twitch API credentials
  - Test authentication
  - View setup instructions

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase Postgres with Prisma ORM
- **API**: Twitch Helix API
- **Auth**: Twitch app access token

## Prerequisites

1. **Node.js 18+** and npm/yarn
2. **Twitch Developer App**

3. **Your CSV file**: `poe_streamers_app_import.csv` with one column:
   - `handle` (normalized Twitch login, lowercase)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```
# Twitch API credentials
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

DEFAULT_CLIP_PROVIDER=twitch_api

# Supabase pooled runtime connection string
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase direct connection string for Prisma migrations
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"

# App URL for Twitch embed (local testing)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

⚠️ **Keep `.env.local` secret!** Never commit it to version control.

### 3. Initialize Database

```bash
npm run db:migrate:deploy
```

This applies the Postgres migrations to Supabase. Prisma CLI reads `.env`; app runtime reads `.env.local`.

### 4. Build and Start

```bash
npm run build
npm start
```

The app will be available at `http://localhost:3000`.


## Usage Workflow

### Step 1: Import Streamers

1. Go to **Streamers** page
2. Click file input and select your `poe_streamers_app_import.csv`
3. Confirm import succeeded (shows imported/updated count)

### Step 2: Fetch Clips

1. Go to **Clips** page
2. Click **"Fetch Clips"**
3. Missing Twitch IDs are resolved and cached automatically
4. Watch progress in the UI (total streamers, completed, failed, clips found)
5. When complete, clips are loaded into the dashboard

**Optional**: Use custom date range by modifying the fetch request (see API routes).

### Step 3: Export Clip Links

1. On **Clips**, fetch clips
2. Keep or clear selections
3. Click **Export Selected Links**
4. Saved list is stored with date and TXT file downloads
5. Click **Start New List** before next day's fetch

### Optional: Download Clips

Currently, the "Download" button is a placeholder. Twitch clip downloads require broadcaster/editor permissions and are not part of the MVP. To implement:

1. Set up a backend service for downloading clips
2. Store downloaded file paths in `clips.local_file_path`
3. Mark `clips.downloaded = true`

## API Routes Reference

### Streamers
- **GET** `/api/streamers` - List streamers with filters (search, active)
- **POST** `/api/streamers` - Import CSV file
- **PATCH** `/api/streamers/[id]` - Update streamer properties
- **DELETE** `/api/streamers/[id]` - Delete one streamer

### Clips
- **GET** `/api/clips` - List clips with pagination and filters (status, game, minViews, search, sort)
- **POST** `/api/clips/reset` - Clear current working clip list
- **GET/POST** `/api/clip-lists` - Read/save dated exported link lists

### Twitch Integration
- **POST** `/api/twitch/test-auth` - Test optional Twitch API authentication
- **POST** `/api/twitch/resolve-users` - Resolve streamer handles for optional Twitch API use
- **POST** `/api/twitch/fetch-clips` - Fetch clips through selected provider

### Settings
- **GET** `/api/settings` - Check Twitch auth configuration status

## Database Schema

### Streamers Table
```sql
- id (PRIMARY KEY)
- handle (UNIQUE)
- twitch_user_id (UNIQUE, nullable)
- display_name
- twitch_display_name
- profile_image_url
- game_group
- active (boolean)
- email
- notes
- source_section
- original_sheet_status
- restriction_status
- last_resolved_at
- created_at
- updated_at
```

### Clips Table
```sql
- id (PRIMARY KEY, Twitch clip ID)
- url
- embed_url
- broadcaster_id
- broadcaster_name
- creator_id, creator_name
- video_id
- game_id, game_name
- language
- title
- view_count
- created_at
- thumbnail_url
- duration
- vod_offset
- fetched_at
- review_status (default: "unreviewed")
- selected (boolean, default: false)
- rejected (boolean, default: false)
- downloaded (boolean, default: false)
- local_file_path
- notes
- streamer_id (FOREIGN KEY)
- updated_at
```

### FetchRuns Table
Tracks the history of clip fetch jobs:
```sql
- id
- started_at, ended_at
- status (running, completed, failed)
- total_streamers, completed_streamers, failed_streamers
- total_clips_found
- error_summary
- created_at, finished_at
```

### StreamerFetchErrors Table
Logs individual streamer fetch failures:
```sql
- id
- fetch_run_id (FOREIGN KEY)
- handle
- twitch_user_id
- error_message
- created_at
```

## Error Handling

- **Individual Streamer Failures**: If one streamer fails to fetch clips, the app logs the error and continues with the next streamer. Never crashes the entire fetch job.
- **Twitch Rate Limits**: Token is cached with expiration. Requests are made efficiently in batches.
- **Invalid Handles**: Unresolved handles are clearly marked in the UI.
- **Missing Permissions**: Download feature is optional and requires explicit permissions from Twitch.

## Development & Debugging

### View Database with Prisma Studio

```bash
npm run db:studio
```

Opens an interactive UI at `http://localhost:5555` to browse and modify data.

### Supabase + Vercel Deployment

1. Create Supabase project and copy two Prisma-compatible URLs:
   - pooled runtime URL into `DATABASE_URL`
   - direct database URL into `DIRECT_URL`
2. Put `DATABASE_URL`, `DIRECT_URL`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `DEFAULT_CLIP_PROVIDER`, and `NEXT_PUBLIC_APP_URL` into Vercel project environment variables.
3. Run `npm run db:migrate:deploy` once against Supabase before first production use.
4. If moving current local data, run `npm run db:migrate:sqlite-data` once while `DATABASE_URL` points at the empty Supabase database.
5. Set `NEXT_PUBLIC_APP_URL` to final Vercel domain so Twitch embeds use deployed host.

`/api/twitch/fetch-clips` is configured for a 300 second Vercel function limit because full-list fetches can take longer than default short serverless jobs.

### Check Node Logs

Development server logs appear in the terminal where you ran `npm run dev`.

## Production Build

```bash
npm run build
npm start
```

The production build includes optimizations and is ready for deployment.

## Keyboard Navigation Tips

On the **/clips** dashboard:
1. Use **J** and **K** to navigate through clips quickly
2. Press **S** to select the current clip
3. Press **R** to reject
4. Press **C** to copy the URL (perfect for quick sharing)
5. Press **O** to preview on Twitch in a new tab

This workflow is designed for fast clip review: fetch → sort → navigate → select/reject → export.

## Troubleshooting

### "Twitch credentials not configured"
- Check that `.env.local` exists in the project root
- Verify `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are not empty
- Restart the development server after updating `.env.local`

- App only fetches clip metadata by default. It does not auto-download clips.

### "Failed to resolve users"
- Ensure streamer handles are correctly spelled (lowercase, as they appear on Twitch)
- Call `POST /api/twitch/test-auth` to verify server-side Twitch auth
- Check browser console and terminal logs for detailed errors

### "No clips found"
- Verify streamers are marked as `active: true`
- Ensure their `restriction_status` is not `banned` or `copyright_issue`
- Check that the date range includes the clips (default: last 24 hours)
- Some streamers may not have any clips in the time window


## Future Enhancements

- [ ] Download clips (with permission handling)
- [ ] Twitch user authentication for editor-specific features
- [ ] Custom clip ordering/ranking
- [ ] Automatic tags/categories for clips
- [ ] Google Sheets sync
- [ ] Discord webhook notifications
- [ ] Batch operations (multi-select)
- [ ] Advanced analytics (views over time, best performers)

## License

This project is for personal use. Twitch is a trademark of Twitch Interactive, Inc. This tool complies with Twitch's API terms of service.

## Support

For issues, bugs, or feature requests, check:
1. The troubleshooting section above
2. Browser console (F12 → Console tab)
3. Terminal logs from `npm run dev`
4. [Twitch API Documentation](https://dev.twitch.tv/docs/api/reference)

---

**Happy clip reviewing!** 🎬
