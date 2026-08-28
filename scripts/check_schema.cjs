/* Check tables exist and fetch API keys / settings. */
const https = require('https')

const PAT = process.env.SUPABASE_PAT
const REF = 'fntmrkgwrhepctbhfaql'

function get(path) {
  return new Promise((resolve, reject) => {
    https
      .get(
        { host: 'api.supabase.com', path: `/v1/projects/${REF}${path}`, headers: { Authorization: `Bearer ${PAT}` } },
        (res) => {
          let d = ''
          res.on('data', (c) => (d += c))
          res.on('end', () => resolve({ status: res.statusCode, body: d }))
        },
      )
      .on('error', reject)
  })
}

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload || {})
    const req = https.request(
      { host: 'api.supabase.com', path: `/v1/projects/${REF}${path}`, method: 'POST', headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let d=''; res.on('data',(c)=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:d})) },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

;(async () => {
  // tables via query
  const q = await post('/database/query', { query: "select tablename from pg_tables where schemaname='public' and tablename in ('events','user_settings');" })
  console.log('TABLES', q.status, q.body)

  // rest api keys
  const keys = await get('/api-keys')
  console.log('APIKEYS', keys.status, keys.body.slice(0, 900))
})()
