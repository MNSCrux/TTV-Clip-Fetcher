import { mkdir, readFile, writeFile } from 'node:fs/promises';

const data = JSON.parse(await readFile('sqlite-export.json', 'utf8'));
const tableOrder = [
  'Streamer',
  'StreamerList',
  'StreamerListEntry',
  'FetchRun',
  'AppSetting',
  'ClipList',
  'Clip',
  'StreamerFetchError',
];
const batchSize = { Clip: 200 };

function sqlValue(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalize(table, row) {
  const next = { ...row };
  for (const key of Object.keys(next)) {
    if (
      ['active', 'is_active', 'selected', 'rejected', 'downloaded'].includes(key) &&
      next[key] != null
    ) {
      next[key] = Boolean(next[key]);
    }
  }
  return next;
}

await mkdir('tmp-import-sql', { recursive: true });
let fileIndex = 0;
for (const table of tableOrder) {
  const rows = data[table].map((row) => normalize(table, row));
  const size = batchSize[table] ?? (rows.length || 1);
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const columns = Object.keys(batch[0]);
    const values = batch
      .map((row) => `(${columns.map((column) => sqlValue(row[column])).join(', ')})`)
      .join(',\n');
    const sql = `INSERT INTO public."${table}" (${columns
      .map((column) => `"${column}"`)
      .join(', ')}) VALUES\n${values};\n`;
    const name = `${String(fileIndex).padStart(2, '0')}-${table}-${i}.sql`;
    await writeFile(`tmp-import-sql/${name}`, sql);
    fileIndex++;
  }
}

const resets = [
  'Streamer',
  'StreamerList',
  'StreamerListEntry',
  'FetchRun',
  'ClipList',
  'StreamerFetchError',
]
  .map(
    (table) =>
      `SELECT setval(pg_get_serial_sequence('public."${table}"', 'id'), COALESCE((SELECT MAX("id") FROM public."${table}"), 1), (SELECT COUNT(*) > 0 FROM public."${table}"));`
  )
  .join('\n');
await writeFile('tmp-import-sql/99-reset-sequences.sql', resets);
