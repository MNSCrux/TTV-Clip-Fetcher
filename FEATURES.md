# Features & Architecture

## MVP Features (Version 1.0)

### ✅ Implemented

#### 1. Streamer Management (`/streamers`)
- [x] Import CSV file
- [x] Display streamer table with search and filters
- [x] Batch resolve Twitch handles to IDs
- [x] Show unresolved/invalid handles
- [x] Edit active status, game_group, notes
- [x] Filter by active, game_group, restriction_status

#### 2. Clip Fetching & Management
- [x] Fetch clips from last 24 hours
- [x] Support custom date ranges
- [x] Batch resolution of unresolved streamers
- [x] Graceful error handling (skip failed streamers, continue rest)
- [x] Store clip metadata (title, views, duration, creator, etc.)
- [x] Preserve review status, selected, rejected flags on re-fetch

#### 3. Clip Dashboard (`/clips`)
- [x] Display clips with thumbnails and metadata
- [x] Filter by status (unreviewed, selected, rejected, all)
- [x] Filter by game_group (poe1, poe2, both, unknown, all)
- [x] Sort by newest, oldest, most viewed, longest, shortest, streamer A-Z
- [x] Search by clip title
- [x] Paginated view (20 clips per page)
- [x] Quick actions: Select, Reject, Reset, Copy URL, Open on Twitch
- [x] Keyboard shortcuts (J, K, S, R, U, C, O)
- [x] Clip preview with details

#### 4. Selected Clips (`/selected`)
- [x] View all selected clips
- [x] Export as JSON with full metadata
- [x] Export as CSV for spreadsheets
- [x] Export as TXT (URLs only)
- [x] Remove/deselect clips
- [x] Copy individual clip URLs

#### 5. Settings & Configuration (`/settings`)
- [x] Check Twitch API configuration status
- [x] Display setup instructions
- [x] Show which environment variables are set
- [x] Test Twitch authentication

#### 6. Dashboard (`/`)
- [x] Display stats (total streamers, active, resolved, etc.)
- [x] Quick start guide
- [x] Clip stats (selected, rejected, unreviewed)
- [x] Navigation to all sections

### 🔲 Not Yet Implemented (Future)

- [ ] Download clips (requires broadcaster/editor permissions)
- [ ] Custom reordering of selected clips
- [ ] Notes/annotations on clips
- [ ] Batch operations (select/reject multiple)
- [ ] Advanced search (multiple filters at once)
- [ ] Performance metrics (views/hr, trending clips)
- [ ] Google Sheets sync
- [ ] Discord webhook notifications
- [ ] Dark/Light theme toggle
- [ ] Clip categories/tags
- [ ] Favorite/star clips
- [ ] Clip comparison view
- [ ] Export to YouTube playlist format

## Architecture

### Frontend (Client-Side)
- **Framework**: Next.js 15 with App Router
- **UI**: React 19, Tailwind CSS
- **State**: React hooks (useState, useEffect, useCallback)
- **Client-side rendering**: All pages use `'use client'` for interactivity

### Backend (Server-Side)
- **API Routes**: Next.js API routes at `/app/api/`
- **Authentication**: Twitch OAuth2 client credentials (server-side only)
- **All secrets stay on server**: Twitch credentials never exposed to frontend

### Database
- **Engine**: SQLite (file-based, lightweight)
- **ORM**: Prisma (type-safe queries, migrations)
- **Database file**: `dev.db` (created after first `npm run db:push`)
- **Schema**: 4 tables (Streamers, Clips, FetchRuns, StreamerFetchErrors)
- **Indexes**: created_at, view_count, broadcaster_id, review_status for performance

### Twitch API Integration
- **Endpoint 1**: `GET /users` - Resolve handles to broadcaster IDs (batch up to 100)
- **Endpoint 2**: `GET /clips` - Fetch clips by broadcaster_id, date range, pagination
- **Token Caching**: Access tokens cached in memory with expiration
- **Error Handling**: Individual streamer failures don't crash the entire job
- **Rate Limiting**: Efficient batching to stay within Twitch limits

### Data Flow

```
CSV Import → Streamers Table
    ↓
Resolve IDs → Twitch API (Get Users)
    ↓
Fetch Clips → Twitch API (Get Clips) → Clips Table
    ↓
Dashboard Display → Filter/Sort → Select/Reject
    ↓
Export → JSON/CSV/TXT
```

## API Endpoints

### Public (No Auth Required)
- `GET /api/streamers` - List streamers
- `GET /api/clips` - List clips
- `GET /api/settings` - Check Twitch config

### Internal (Server-to-Server)
- `POST /api/twitch/token` - Get Twitch token
- `POST /api/twitch/resolve-users` - Batch resolve handles
- `POST /api/twitch/fetch-clips` - Fetch clips for date range

### Admin
- `POST /api/streamers` - Import CSV
- `PATCH /api/streamers/[id]` - Update streamer
- `PATCH /api/clips/[id]` - Update clip review status
- `GET /api/clips/export` - Export selected clips

## Performance Optimizations

1. **Token Caching**: Twitch tokens cached in memory to avoid repeated auth calls
2. **Batch Requests**: Up to 100 handles resolved per Twitch API call
3. **Pagination**: Clips paginated (20 per page) to keep DOM lightweight
4. **Database Indexes**: Indexed on frequently filtered columns
5. **Lazy Loading**: Thumbnails and embeds load on demand
6. **Client-side Filtering**: Initial filters done on fetched data for speed

## Security Considerations

1. **Secrets Server-Side Only**
   - Twitch Client ID and Secret never sent to frontend
   - All Twitch API calls made from Next.js API routes
   - Environment variables loaded on server only

2. **CORS**
   - API routes share same origin (localhost:3000)
   - No cross-origin issues

3. **Rate Limiting** (not yet implemented)
   - Consider adding if deployed publicly

4. **Database**
   - SQLite file-based, local only
   - No network exposure in default setup

## Keyboard Shortcuts

### On `/clips` page
| Shortcut | Action |
|----------|--------|
| **J** | Next clip |
| **K** | Previous clip |
| **→** | Next clip (alternative) |
| **←** | Previous clip (alternative) |
| **S** | Select current clip |
| **R** | Reject current clip |
| **U** | Reset/unreviewed |
| **C** | Copy URL to clipboard |
| **O** | Open on Twitch |

## Database Schema Rationale

### Streamers Table
- Stores approved streamer list with metadata
- `handle` is unique key for quick lookups
- `twitch_user_id` nullable until resolved
- `last_resolved_at` tracks when IDs were last verified

### Clips Table
- `id` is Twitch clip ID (unique, no duplicates)
- `created_at` indexed for chronological sorting
- `view_count` indexed for popularity sorting
- `review_status`, `selected`, `rejected` for filtering unreviewed/selected
- Foreign key to streamers allows filtering by streamer properties

### FetchRuns Table
- Tracks clip fetch job history
- Helps debug what was fetched and when
- Status field tracks job progression (running → completed/failed)

### StreamerFetchErrors Table
- Per-streamer error logging
- Doesn't block entire fetch job
- Useful for identifying problematic streamers

## Twitch API Rate Limits (Current)

- **Get Users**: 300 requests per 10 seconds (batch up to 100 logins)
- **Get Clips**: 100 requests per 1 minute (with pagination)

The app respects these limits through:
1. Batching resolve requests (100 per request)
2. Efficient pagination (fetch all clips for date range)
3. Token caching (reuse same token)

## Why This Stack?

1. **Next.js**: Full-stack with built-in API routes, simple deployment
2. **React**: Component-based UI, excellent for dashboards
3. **TypeScript**: Type safety, better DX, fewer bugs
4. **Tailwind**: Rapid styling, dark mode, responsive
5. **Prisma**: Type-safe ORM, migrations, excellent for SQLite
6. **SQLite**: Zero setup, file-based, perfect for local tools
7. **Twitch Helix API**: Official, well-documented, no scraping

## Testing (Not Yet Implemented)

Future testing considerations:
- Unit tests for utility functions
- Integration tests for API routes
- E2E tests for workflows (import → resolve → fetch → select → export)
- Mock Twitch API responses
- Database reset between tests

---

**This is a MVP designed to be fast, local, and maintainable. Expand as needed!**
