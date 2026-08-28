/* Print full auth config keys that mention email/google/site/url. */
const https = require('https')
const PAT = process.env.SUPABASE_PAT
const REF = 'fntmrkgwrhepctbhfaql'

https.get({ host: 'api.supabase.com', path: `/v1/projects/${REF}/config/auth`, headers: { Authorization: `Bearer ${PAT}` } }, (r) => {
  let d = ''
  r.on('data', (c) => (d += c))
  r.on('end', () => {
    const obj = JSON.parse(d)
    for (const [k, v] of Object.entries(obj)) {
      if (/email|site|url|external|password|otp/i.test(k)) {
        console.log(k, '=', JSON.stringify(v))
      }
    }
  })
})
