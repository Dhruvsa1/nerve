// Verify DB connectivity + role isolation. Run: node --env-file=.env.local scripts/test-db.mjs
import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
})

await client.connect()
const who = await client.query('select current_user, current_schema()')
console.log('connected as', who.rows[0])

// Show the tables we can see in the nerve schema + their columns.
const cols = await client.query(
  `select table_name, column_name, data_type
   from information_schema.columns
   where table_schema = 'nerve'
   order by table_name, ordinal_position`,
)
const byTable = {}
for (const r of cols.rows) {
  ;(byTable[r.table_name] ??= []).push(`${r.column_name}:${r.data_type}`)
}
for (const [t, c] of Object.entries(byTable)) {
  console.log(`\nnerve.${t}\n  ${c.join('\n  ')}`)
}

// DML round-trip on users_anon (the role can insert/select/delete here).
const uid = crypto.randomUUID()
await client.query(`insert into nerve.users_anon (id) values ($1)`, [uid])
const sel = await client.query('select level from nerve.users_anon where id = $1', [uid])
await client.query('delete from nerve.users_anon where id = $1', [uid])
console.log('\nDML ok — insert/select/delete worked. default level =', sel.rows[0]?.level)

await client.end()
