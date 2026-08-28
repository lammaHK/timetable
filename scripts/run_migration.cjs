/* Run the init migration SQL against Supabase via the Management API. */
const https = require('https')
const fs = require('fs')

const PAT = process.env.SUPABASE_PAT
const REF = 'fntmrkgwrhepctbhfaql'
const sql = fs.readFileSync('supabase/migrations/00001_init.sql', 'utf8')

function runQuery(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query })
    const req = https.request(
      {
        host: 'api.supabase.com',
        path: `/v1/projects/${REF}/database/query`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAT}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

;(async () => {
  const r = await runQuery(sql)
  console.log('STATUS', r.status)
  console.log('BODY', r.body.slice(0, 1200))
})()
