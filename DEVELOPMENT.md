# Development Guide

This guide explains how to extend and maintain the PoE Clip Checker app.

## Project Structure

```
poe-clip-checker/
├── app/
│   ├── api/                 # Next.js API routes (server-side)
│   │   ├── twitch/          # Twitch API integration
│   │   ├── streamers/       # Streamer management
│   │   ├── clips/           # Clip management & export
│   │   └── settings/        # App configuration
│   ├── clips/               # /clips page (client-side)
│   ├── selected/            # /selected page
│   ├── settings/            # /settings page
│   ├── streamers/           # /streamers page
│   ├── globals.css          # Global Tailwind styles
│   ├── layout.tsx           # Root layout (nav, header)
│   └── page.tsx             # / homepage
├── lib/
│   └── types.ts             # TypeScript type definitions
├── prisma/
│   └── schema.prisma        # Database schema
├── .env.local               # Environment variables (secrets)
├── .env.example             # Template for .env.local
├── package.json             # Dependencies & scripts
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
└── README.md                # Full documentation
```

## Adding a New Feature

### 1. Modify Database Schema

Edit `prisma/schema.prisma`:

```prisma
model MyTable {
  id        Int     @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
}
```

Then apply migration:

```bash
npm run db:push
```

### 2. Create API Route

Add file in `app/api/myfeature/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.myTable.findMany();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    );
  }
}
```

### 3. Create UI Page

Add file in `app/myfeature/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function MyFeaturePage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const res = await fetch('/api/myfeature');
      const result = await res.json();
      setData(result);
    };
    fetch();
  }, []);

  return <div>{/* Your UI here */}</div>;
}
```

### 4. Add Navigation Link

Edit `app/layout.tsx`:

```typescript
<a href="/myfeature" className="hover:text-yellow-400 transition">
  My Feature
</a>
```

## Common Tasks

### Fetch Data from API Route

```typescript
const res = await fetch('/api/endpoint', {
  method: 'GET',
  // or POST, PATCH, etc.
});
const data = await res.json();
```

### Update Clip or Streamer

```typescript
const res = await fetch(`/api/clips/${clipId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ selected: true, notes: 'My note' }),
});
```

### Query Database with Prisma

```typescript
// Find many
const streamers = await prisma.streamer.findMany({
  where: { active: true },
  orderBy: { display_name: 'asc' },
});

// Find unique
const clip = await prisma.clip.findUnique({
  where: { id: 'clip-id' },
});

// Create
const newStreamer = await prisma.streamer.create({
  data: { handle: 'newhandle', display_name: 'New Streamer' },
});

// Update
const updated = await prisma.clip.update({
  where: { id: 'clip-id' },
  data: { selected: true },
});

// Delete
await prisma.clip.delete({
  where: { id: 'clip-id' },
});
```

### Use Tailwind for Styling

```typescript
<div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
  <h2 className="text-2xl font-bold text-yellow-400 mb-4">Title</h2>
  <button className="btn btn-primary">Click me</button>
</div>
```

Available classes:
- `.btn` - Base button
- `.btn-primary` - Yellow button (primary action)
- `.btn-secondary` - Gray button
- `.btn-danger` - Red button
- `.card` - Card container
- `.input` - Text input
- `.label` - Form label
- `.badge` - Small badge
- `.badge-approved`, `.badge-rejected`, etc. - Status badges

### Add Keyboard Shortcuts

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 's':
    case 'S':
      e.preventDefault();
      // Do something
      break;
  }
};

useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Format Dates

```typescript
// Relative time (e.g., "2 hours ago")
import { formatDistanceToNow } from 'date-fns';
formatDistanceToNow(new Date(clip.created_at), { addSuffix: true });

// Or use native Date methods
new Date(clip.created_at).toLocaleDateString()
new Date(clip.created_at).toLocaleTimeString()
```

## Performance Tips

1. **Use pagination** - Don't load thousands of items at once
2. **Add database indexes** - Already done for common queries
3. **Cache Twitch tokens** - Already implemented
4. **Batch API requests** - Group requests when possible
5. **Lazy load images** - Use `loading="lazy"` on img tags

## Testing

### Manual Testing
```bash
npm run dev
```

Open http://localhost:3000 and test workflows manually.

### Database Testing
```bash
npm run db:studio
```

Opens http://localhost:5555 for interactive database inspection.

## Debugging

### Check Browser Console
Press **F12** in browser → **Console** tab

### Check Terminal Logs
Look at the terminal where you ran `npm run dev`

### Check Database
```bash
npm run db:studio
```

### Add Console Logs
```typescript
console.log('Debug info:', variable);
console.error('Error:', error);
```

## Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel (Recommended)
1. Push code to GitHub
2. Go to https://vercel.com
3. Import repository
4. Add `.env.local` variables in Vercel dashboard
5. Deploy

**Note**: Change `DATABASE_URL` to use a remote database (e.g., Neon, Turso) or use Vercel KV for persistence.

## Code Style

- **TypeScript**: Always use types
- **React**: Use functional components with hooks
- **CSS**: Use Tailwind, avoid CSS files
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Comments**: Add comments for complex logic
- **Error Handling**: Always try/catch async operations

## Git Workflow

```bash
# Create a branch for your feature
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add my feature"

# Push to GitHub
git push origin feature/my-feature

# Create Pull Request
```

## Future Feature Ideas

1. **Download Clips**
   - Add download button to clip card
   - Implement server-side download service
   - Store path in `clips.local_file_path`

2. **Custom Clip Ordering**
   - Add drag-and-drop in /selected
   - Store order in database
   - Preserve when exporting

3. **Tags & Categories**
   - Add `tags` column to clips table
   - UI for adding/editing tags
   - Filter by tag

4. **Google Sheets Sync**
   - Read streamer list from Google Sheets
   - Update with selected clips
   - Two-way sync

5. **Discord Webhooks**
   - Post selected clips to Discord
   - Send fetch job summaries
   - Notify on failures

6. **Analytics**
   - Dashboard showing views over time
   - Trending clips
   - Best performers by streamer

## Environment Variables Reference

```
# Twitch API (required for all features)
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# Database (required)
DATABASE_URL="file:./dev.db"

# App (optional, for Twitch embed)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Add your own custom variables as needed
```

## Troubleshooting Development

### TypeScript Errors
```bash
# Restart TypeScript server
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Database Issues
```bash
# Reset database
rm dev.db
npm run db:push
```

### Dependencies Not Working
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

## Contact & Support

For questions or issues:
1. Check README.md
2. Check browser console (F12)
3. Check terminal logs
4. Review this development guide
5. Check Twitch API documentation

---

Happy coding! 🚀
