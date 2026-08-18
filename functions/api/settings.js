// functions/api/settings.js

async function ensureSettings(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS news_ads (news_id INTEGER PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
}

export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    await ensureSettings(env);
    const url = new URL(request.url);
    const newsId = Number(url.searchParams.get('news_id') || 0) || null;
    const rows = await env.DB.prepare(`SELECT key,value FROM site_settings`).all();
    const settings = {};
    for (const row of (rows.results || [])) settings[row.key] = row.value;

    let adsEnabled = false;
    if (newsId) {
      const row = await env.DB.prepare(`SELECT enabled FROM news_ads WHERE news_id=? LIMIT 1`).bind(newsId).first();
      adsEnabled = Number(row?.enabled || 0) === 1;
    }

    return Response.json({
      success: true,
      settings: {
        ads_enabled: settings.ads_enabled === '1',
        adsense_publisher_id: settings.adsense_publisher_id || '',
        adsense_display_slot: settings.adsense_display_slot || '',
        adsense_inarticle_slot: settings.adsense_inarticle_slot || '',
        adsense_auto_ads: settings.adsense_auto_ads === '1'
      },
      news_ads_enabled: adsEnabled
    }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error('SETTINGS GET ERROR:', error);
    return Response.json({ success:false, error:error.message || "Settings load नहि भ' सकल" }, {status:500});
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  try {
    const admin = await requireAdmin(request, env);
    if (!admin) return Response.json({success:false,error:'Unauthorized'}, {status:401});
    await ensureSettings(env);
    const body = await request.json();
    const values = {
      ads_enabled: body.ads_enabled ? '1' : '0',
      adsense_publisher_id: String(body.adsense_publisher_id || '').trim(),
      adsense_display_slot: String(body.adsense_display_slot || '').trim(),
      adsense_inarticle_slot: String(body.adsense_inarticle_slot || '').trim(),
      adsense_auto_ads: body.adsense_auto_ads ? '1' : '0'
    };
    for (const [key,value] of Object.entries(values)) {
      await env.DB.prepare(`INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).bind(key,value).run();
    }
    const newsId = Number(body.news_id || 0) || null;
    if (newsId) {
      await env.DB.prepare(`INSERT INTO news_ads(news_id,enabled,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(news_id) DO UPDATE SET enabled=excluded.enabled, updated_at=CURRENT_TIMESTAMP`).bind(newsId, body.news_ads_enabled ? 1 : 0).run();
    }
    return Response.json({success:true,message:"Ad settings save भ' गेल"});
  } catch (error) {
    console.error('SETTINGS PUT ERROR:',error);
    return Response.json({success:false,error:error.message || "Settings save नहि भ' सकल"}, {status:500});
  }
}

export async function onRequestPost(context) { return onRequestPut(context); }

async function requireAdmin(request,env){const u=await getUser(request,env);return u&&u.status==='active'&&u.role==='admin'?u:null;}
async function getUser(request,env){try{if(!env.AUTH_SECRET)return null;const c=parseCookies(request.headers.get('Cookie')||'');if(!c.session)return null;const s=await verify(c.session,env.AUTH_SECRET);if(!s?.id)return null;return await env.DB.prepare(`SELECT id,name,email,role,status FROM users WHERE id=? LIMIT 1`).bind(s.id).first();}catch{return null;}}
function parseCookies(s){const o={};String(s).split(';').forEach(p=>{const i=p.indexOf('=');if(i>=0)o[p.slice(0,i).trim()]=p.slice(i+1).trim();});return o;}
async function verify(t,secret){try{const p=String(t).split('.');if(p.length!==2)return null;const e=await sign(p[0],secret);if(!eq(p[1],e))return null;const d=JSON.parse(from64(p[0]));return d.exp && d.exp>=Math.floor(Date.now()/1000)?d:null;}catch{return null;}}
async function sign(v,s){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(s),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(v))));}
function b64(a){let b='';for(const x of a)b+=String.fromCharCode(x);return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function from64(v){let b=String(v).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0)));}
function eq(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0;}
