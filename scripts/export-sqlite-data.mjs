import { writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const sqlite = new DatabaseSync('prisma/dev.db', { readOnly: true });
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

const data = Object.fromEntries(
  tables.map((table) => [table, sqlite.prepare(`SELECT * FROM "${table}"`).all()])
);

await writeFile('sqlite-export.json', JSON.stringify(data));
sqlite.close();
