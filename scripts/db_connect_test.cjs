/* Try to connect to the Supabase Postgres pooler using the secret key as the DB password. */
const { Client } = require('pg')
const fs = require('fs')

const REF = 'fntmrkgwrhepctbhfaql'
const SECRET = process.env.SUPABASE_SECRET

const user = `postgres.${REF}`
const regions = [
  'aws-0-ap-northeast-1', // Tokyo
  'aws-0-ap-southeast-1', // Singapore
  'aws-0-us-east-1',
  'aws-0-us-west-1',
]

async function tryConnect(host) {
  const client = new Client({
    host,
    port: 5432,
    user,
    password: SECRET,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000,
  })
  try {
    await client.connect()
    const res = await client.query('select 1 as ok')
    console.log('CONNECTED via', host, '->', JSON.stringify(res.rows))
    return client
  } catch (e) {
    console.log('fail', host, ':', String(e.message).slice(0, 90))
    try { await client.end() } catch {}
    return null
  }
}

;(async () => {
  for (const r of regions) {
    const c = await tryConnect(`${r}.pooler.supabase.com`)
    if (c) {
      process.exit(0)
    }
  }
  // also try direct db host
  for (const h of [`db.${REF}.supabase.co`]) {
    const c = await tryConnect(h)
    if (c) process.exit(0)
  }
  process.exit(1)
})()
