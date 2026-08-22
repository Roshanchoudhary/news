// Dynamic XML sitemap for Mithila Live / Mithili News
// Route: /sitemap.xml

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=UTF-8",
  "Cache-Control": "public, max-age=300, s-maxage=300"
};

function xml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(origin, path) {
  return new URL(path, origin).toString();
}

function lastmod(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  const urls = new Map();

  // Homepage
  urls.set(origin + "/", null);

  try {
    // Published news
    const newsResult = await env.DB.prepare(`
      SELECT slug, published_at, created_at
      FROM news
      WHERE status = 'published'
        AND slug IS NOT NULL
        AND TRIM(slug) <> ''
      ORDER BY COALESCE(published_at, created_at) DESC
    `).all();

    for (const row of (newsResult.results || [])) {
      const loc = absoluteUrl(origin, "/news/" + encodeURIComponent(row.slug));
      urls.set(loc, lastmod(row.published_at || row.created_at));
    }
  } catch (error) {
    console.error("SITEMAP NEWS ERROR:", error);
  }

  try {
    // Categories and subcategories use the same /category/:slug route.
    const categoryResult = await env.DB.prepare(`
      SELECT slug, updated_at, created_at
      FROM categories
      WHERE status = 'active'
        AND slug IS NOT NULL
        AND TRIM(slug) <> ''
      ORDER BY id
    `).all();

    for (const row of (categoryResult.results || [])) {
      const loc = absoluteUrl(origin, "/category/" + encodeURIComponent(row.slug));
      urls.set(loc, lastmod(row.updated_at || row.created_at));
    }
  } catch (error) {
    console.error("SITEMAP CATEGORY ERROR:", error);
  }

  try {
    // Tags
    const tagResult = await env.DB.prepare(`
      SELECT slug, updated_at, created_at
      FROM tags
      WHERE slug IS NOT NULL
        AND TRIM(slug) <> ''
      ORDER BY id
    `).all();

    for (const row of (tagResult.results || [])) {
      const loc = absoluteUrl(origin, "/tag/" + encodeURIComponent(row.slug));
      urls.set(loc, lastmod(row.updated_at || row.created_at));
    }
  } catch (error) {
    // Tags are optional in some older databases; don't break the sitemap.
    console.error("SITEMAP TAG ERROR:", error);
  }

  const body = [...urls.entries()].map(([loc, mod]) => {
    return [
      "  <url>",
      `    <loc>${xml(loc)}</loc>`,
      mod ? `    <lastmod>${xml(mod)}</lastmod>` : null,
      "  </url>"
    ].filter(Boolean).join("\n");
  }).join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    body +
    `\n</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: XML_HEADERS
  });
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, {
    status: response.status,
    headers: response.headers
  });
}
