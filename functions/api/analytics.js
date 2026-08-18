// functions/api/analytics.js
// Privacy-friendly first-party analytics. No IP address is stored.

async function ensureAnalyticsTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      news_id INTEGER,
      visitor_id TEXT NOT NULL,
      path TEXT,
      country TEXT,
      city TEXT,
      region TEXT,
      device TEXT,
      browser TEXT,
      os TEXT,
      referrer TEXT,
      language TEXT,
      screen TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_analytics_news ON analytics_events(news_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_analytics_country ON analytics_events(country)`).run();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    await ensureAnalyticsTable(env);

    const body = await request.json();
    const visitorId = String(body.visitor_id || '').trim().slice(0, 120);
    if (!visitorId) return Response.json({ success: false, error: 'visitor_id जरूरी अछि' }, { status: 400 });

    const newsId = Number(body.news_id || 0) || null;
    const path = String(body.path || '').slice(0, 500);
    const referrer = String(body.referrer || '').slice(0, 500);
    const language = String(body.language || '').slice(0, 100);
    const screen = String(body.screen || '').slice(0, 50);
    const cf = request.cf || {};

    const ua = request.headers.get('User-Agent') || '';
    const device = detectDevice(ua);
    const browser = detectBrowser(ua);
    const os = detectOS(ua);

    await env.DB.prepare(`
      INSERT INTO analytics_events
        (news_id, visitor_id, path, country, city, region, device, browser, os, referrer, language, screen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newsId,
      visitorId,
      path,
      String(cf.country || 'Unknown').slice(0, 100),
      String(cf.city || 'Unknown').slice(0, 150),
      String(cf.region || '').slice(0, 150),
      device,
      browser,
      os,
      referrer,
      language,
      screen
    ).run();

    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('ANALYTICS POST ERROR:', error);
    return Response.json({ success: false, error: error.message || "Analytics save नहि भ' सकल" }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const admin = await requireAdmin(request, env);
    if (!admin) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await ensureAnalyticsTable(env);
    const url = new URL(request.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') || 30)));
    const newsId = Number(url.searchParams.get('news_id') || 0) || null;
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');

    const where = ['a.created_at >= ?'];
    const params = [since];
    if (newsId) { where.push('news_id = ?'); params.push(newsId); }
    const w = where.join(' AND ');

    const [summary, posts, countries, cities, devices, browsers, daily] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS unique_visitors FROM analytics_events a WHERE ${w}`).bind(...params).first(),
      env.DB.prepare(`
        SELECT a.news_id, COALESCE(n.title, 'Homepage / Other') AS title,
               COUNT(*) AS views, COUNT(DISTINCT a.visitor_id) AS unique_visitors
        FROM analytics_events a LEFT JOIN news n ON n.id = a.news_id
        WHERE ${w} GROUP BY a.news_id, n.title ORDER BY unique_visitors DESC, views DESC LIMIT 100
      `).bind(...params).all(),
      env.DB.prepare(`SELECT COALESCE(country,'Unknown') AS name, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM analytics_events a WHERE ${w} GROUP BY country ORDER BY visitors DESC LIMIT 30`).bind(...params).all(),
      env.DB.prepare(`SELECT COALESCE(city,'Unknown') AS name, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM analytics_events a WHERE ${w} GROUP BY city ORDER BY visitors DESC LIMIT 30`).bind(...params).all(),
      env.DB.prepare(`SELECT COALESCE(device,'Unknown') AS name, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM analytics_events a WHERE ${w} GROUP BY device ORDER BY visitors DESC`).bind(...params).all(),
      env.DB.prepare(`SELECT COALESCE(browser,'Unknown') AS name, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM analytics_events a WHERE ${w} GROUP BY browser ORDER BY visitors DESC LIMIT 20`).bind(...params).all(),
      env.DB.prepare(`SELECT substr(a.created_at,1,10) AS day, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM analytics_events a WHERE ${w} GROUP BY day ORDER BY day DESC LIMIT 60`).bind(...params).all()
    ]);

    return Response.json({
      success: true,
      range_days: days,
      summary: { pageviews: Number(summary?.pageviews || 0), unique_visitors: Number(summary?.unique_visitors || 0) },
      posts: posts.results || [],
      countries: countries.results || [],
      cities: cities.results || [],
      devices: devices.results || [],
      browsers: browsers.results || [],
      daily: daily.results || []
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('ANALYTICS GET ERROR:', error);
    return Response.json({ success: false, error: error.message || "Analytics load नहि भ' सकल" }, { status: 500 });
  }
}

async function requireAdmin(request, env) {
  const user = await getAuthenticatedUser(request, env);
  return user && user.status === 'active' && user.role === 'admin' ? user : null;
}

async function getAuthenticatedUser(request, env) {
  try {
    if (!env.AUTH_SECRET) return null;
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    if (!cookies.session) return null;
    const session = await verifySessionToken(cookies.session, env.AUTH_SECRET);
    if (!session?.id) return null;
    return await env.DB.prepare(`SELECT id,name,email,role,status FROM users WHERE id=? LIMIT 1`).bind(session.id).first();
  } catch { return null; }
}
function parseCookies(s) { const out={}; String(s).split(';').forEach(p=>{const i=p.indexOf('=');if(i<0)return;out[p.slice(0,i).trim()]=p.slice(i+1).trim();}); return out; }
async function verifySessionToken(token, secret) {
  try {
    const parts=String(token).split('.'); if(parts.length!==2)return null;
    const payload=parts[0], sig=parts[1], expected=await sign(payload,secret);
    if(!timingSafeEqual(sig,expected))return null;
    const data=JSON.parse(fromBase64url(payload));
    if(!data.exp || data.exp < Math.floor(Date.now()/1000)) return null;
    return data;
  } catch { return null; }
}
async function sign(value, secret) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));
  return base64url(new Uint8Array(sig));
}
function base64url(bytes){let b='';for(const x of bytes)b+=String.fromCharCode(x);return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromBase64url(v){let b=String(v).replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';return new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0)));}
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0;}
function detectDevice(ua){ua=ua.toLowerCase();if(/ipad|tablet/.test(ua))return 'Tablet';if(/mobile|iphone|android/.test(ua))return 'Mobile';return 'Desktop';}
function detectBrowser(ua){if(/edg\//i.test(ua))return 'Edge';if(/firefox\//i.test(ua))return 'Firefox';if(/chrome\//i.test(ua) && !/edg\//i.test(ua))return 'Chrome';if(/safari\//i.test(ua) && !/chrome\//i.test(ua))return 'Safari';if(/opera|opr\//i.test(ua))return 'Opera';return 'Other';}
function detectOS(ua){if(/windows/i.test(ua))return 'Windows';if(/android/i.test(ua))return 'Android';if(/iphone|ipad|ios/i.test(ua))return 'iOS';if(/mac os/i.test(ua))return 'macOS';if(/linux/i.test(ua))return 'Linux';return 'Other';}
