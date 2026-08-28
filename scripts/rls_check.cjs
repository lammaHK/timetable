/* Verify RLS behavior with an ANON (publishable) key.
   Insert a 'public' event as anon? should FAIL. Read should show only public. */
const https = require('https')

const REF = 'fntmrkgwrhepctbhfaql'
const PUB = 'sb_publishable_dFNl_Ahe9muDXa1fbu4ADw_hYt5g9tF'

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const req = https.request(
      {
        host: `${REF}.supabase.co`,
        path,
        method,
        headers: {
          apikey: PUB,
          Authorization: `Bearer ${PUB}`,
          'Content-Type': 'application/json',
          ...headers,
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => resolve({ status: res.statusCode, body: d }))
      },
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

;(async () => {
  console.log('--- anon read events (expect 200, maybe empty) ---')
  const r1 = await req('GET', '/rest/v1/events?select=*')
  console.log(r1.status, r1.body.slice(0, 300))

  console.log('--- anon INSERT event (expect 401/row-level denied) ---')
  const r2 = await req('POST', '/rest/v1/events', {
    owner_id: '00000000-0000-0000-0000-000000000000',
    date: '2026-08-28',
    title: 'hack test',
    visibility: 'public',
  })
  console.log(r2.status, r2.body.slice(0, 300))
})()
