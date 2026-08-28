/* Get auth config + full anon key + config (incl SMTP) via management API. */
const https = require('https')
const PAT = process.env.SUPABASE_PAT
const REF = 'fntmrkgwrhepctbhfaql'

function get(path) {
  return new Promise((res) => {
    https.get({ host: 'api.supabase.com', path: `/v1/projects/${REF}${path}`, headers: { Authorization: `Bearer ${PAT}` } }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => res({ status: r.statusCode, body: d }))
    }).on('error', (e) => res({ status: -1, body: String(e) }))
  })
}

;(async () => {
  const auth = await get('/config/auth')
  console.log('AUTH', auth.status, auth.body.slice(0, 1500))
  const ext = await get('/config/auth/email')
  console.log('\nEMAIL', ext.status, ext.body.slice(0, 800))
})()
