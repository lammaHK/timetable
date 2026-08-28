/* Scan Supabase pooler regions to find this project's tenant. */
const { Client } = require('pg')

const REF = 'fntmrkgwrhepctbhfaql'
const SECRET = process.env.SUPABASE_SECRET
const user = `postgres.${REF}`

const regions = [
  'aws-0-ap-northeast-1','aws-0-ap-northeast-2','aws-0-ap-southeast-1','aws-0-ap-southeast-2',
  'aws-0-ap-south-1','aws-0-ap-east-1','aws-0-us-east-1','aws-0-us-east-2','aws-0-us-west-1','aws-0-us-west-2',
  'aws-0-eu-central-1','aws-0-eu-west-1','aws-0-eu-west-2','aws-0-eu-west-3','aws-0-eu-north-1',
  'aws-1-ap-northeast-1','aws-1-ap-southeast-1','aws-1-us-east-1',
]

async function tryConnect(host) {
  const client = new Client({
    host, port: 5432, user, password: SECRET, database: 'postgres',
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
  })
  try {
    await client.connect()
    const res = await client.query('select current_database() as db, current_user as u')
    console.log('SUCCESS', host, JSON.stringify(res.rows[0]))
    await client.end()
    return true
  } catch (e) {
    console.log('fail', host, ':', String(e.message).slice(0, 70))
    try { await client.end() } catch {}
    return false
  }
}

;(async () => {
  for (const r of regions) {
    if (await tryConnect(`${r}.pooler.supabase.com`)) break
  }
})()
