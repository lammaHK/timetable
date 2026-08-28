/* Try PATCH and correct conventions for auth config update. */
const https = require('https')
const PAT = process.env.SUPABASE_PAT
const REF = 'fntmrkgwrhepctbhfaql'
const patch = { site_url: 'https://lammahk.github.io/timetable/' }

function request(method, path, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload)
    const req = https.request(
      {
        host: 'api.supabase.com',
        path: `/v1/projects/${REF}${path}`,
        method,
        headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => { let d=''; res.on('data',(c)=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:d})) },
    )
    req.on('error', (e) => resolve({ status: -1, body: String(e) }))
    req.write(data)
    req.end()
  })
}

;(async () => {
  const r = await request('PATCH', '/config/auth', patch)
  console.log('PATCH /config/auth ->', r.status, r.body.slice(0, 500))
})()
