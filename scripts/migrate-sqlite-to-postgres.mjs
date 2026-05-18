import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';

const sqlitePath = process.env.SQLITE_SOURCE_PATH ?? 'prisma/dev.db';
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const prisma = new PrismaClient();

const tables = [
  'Streamer',
  'StreamerList',
  'StreamerListEntry',
  'FetchRun',
  'AppSetting',
  'ClipList',
  'Clip',
  'StreamerFetchError',
];

const dateColumns = {
  Streamer: ['last_resolved_at', 'created_at', 'updated_at'],
  StreamerList: ['created_at', 'updated_at'],
  FetchRun: ['started_at', 'ended_at', 'created_at', 'finished_at'],
  AppSetting: ['updated_at'],
  ClipList: ['created_at'],
  Clip: ['created_at', 'fetched_at', 'scraped_at', 'updated_at'],
  StreamerFetchError: ['created_at'],
};

const booleanColumns = {
  Streamer: ['active'],
  StreamerList: ['is_active'],
  StreamerListEntry: ['active'],
  Clip: ['selected', 'rejected', 'downloaded'],
};

const prismaModels = {
  Streamer: prisma.streamer,
  StreamerList: prisma.streamerList,
  StreamerListEntry: prisma.streamerListEntry,
  FetchRun: prisma.fetchRun,
  AppSetting: prisma.appSetting,
  ClipList: prisma.clipList,
  Clip: prisma.clip,
  StreamerFetchError: prisma.streamerFetchError,
};

const serialTables = [
  'Streamer',
  'StreamerList',
  'StreamerListEntry',
  'FetchRun',
  'ClipList',
  'StreamerFetchError',
];

function normalizeRow(table, row) {
  const next = { ...row };
  for (const column of dateColumns[table] ?? []) {
    if (next[column] != null) {
      next[column] = new Date(next[column]);
    }
  }
  for (const column of booleanColumns[table] ?? []) {
    next[column] = Boolean(next[column]);
  }
  return next;
}

async function resetSequence(table) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${table}"', 'id'),
      COALESCE((SELECT MAX("id") FROM "${table}"), 1),
      (SELECT COUNT(*) > 0 FROM "${table}")
    )
  `);
}

async function main() {
  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
    if (rows.length === 0) {
      console.log(`${table}: 0`);
      continue;
    }
    await prismaModels[table].createMany({
      data: rows.map((row) => normalizeRow(table, row)),
    });
    console.log(`${table}: ${rows.length}`);
  }

  for (const table of serialTables) {
    await resetSequence(table);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
