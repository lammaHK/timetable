/* Fetch the FULL anon + publishable keys (they may be truncated in list; fetch individually). */
const https = require('https')
const PAT = process.env.SUPABASE_PAT
const REF = 'fntmrkgwrhepctbhfaql'

function get(urlHost, path, headers) {
  return new Promise((resolve) => {
    https.get({ host: urlHost, path, headers }, (r) => {
      let d=''; r.on('data',(c)=>d+=c); r.on('end',()=>resolve({status:r.statusCode,body:d}))
    }).on('error',(e)=>resolve({status:-1,body:String(e)}))
  })
}

;(async () => {
  // Try to get anon key via project API keys (full value)
  const r = await get('api.supabase.com', `/v1/projects/${REF}/api-keys`, { Authorization: `Bearer ${PAT}` })
  try {
    const arr = JSON.parse(r.body)
    for (const k of arr) {
      console.log('KEY', k.name, k.type, '=', k.api_key)
    }
  } catch (e) {
    console.log('raw', r.status, r.body.slice(0, 400))
  }
})()
