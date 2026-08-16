// functions/api/news.js

// ============================================
// GET NEWS
// /api/news
// /api/news?id=123
// /api/news?status=published
// ============================================

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const status = url.searchParams.get("status");

    // ----------------------------------------
    // SINGLE NEWS
    // ----------------------------------------
    if (id) {
      const news = await env.DB
        .prepare(`
          SELECT
            n.*,
            c.name AS category_name,
            u.name AS author_name
          FROM news n
          LEFT JOIN categories c
            ON n.category_id = c.id
          LEFT JOIN users u
            ON n.author_id = u.id
          WHERE n.id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

      if (!news) {
        return Response.json(
          {
            success: false,
            error: "समाचार नहि भेटल"
          },
          { status: 404 }
        );
      }

      // Public view count
      if (news.status === "published") {
        await env.DB
          .prepare(`
            UPDATE news
            SET views = views + 1
            WHERE id = ?
          `)
          .bind(id)
          .run();

        news.views = Number(news.views || 0) + 1;
      }

      return Response.json({
        success: true,
        news
      });
    }

    // ----------------------------------------
    // NEWS LIST
    // ----------------------------------------

    let query = `
      SELECT
        n.id,
        n.title,
        n.slug,
        n.summary,
        n.image_url,
        n.category_id,
        n.author_id,
        n.status,
        n.featured,
        n.views,
        n.seo_title,
        n.seo_description,
        n.published_at,
        n.created_at,
        n.updated_at,
        c.name AS category_name,
        u.name AS author_name
      FROM news n
      LEFT JOIN categories c
        ON n.category_id = c.id
      LEFT JOIN users u
        ON n.author_id = u.id
    `;

    const params = [];

    // Public website पर default केवल published
    if (!status) {
      query += `
        WHERE n.status = 'published'
        ORDER BY
          COALESCE(n.published_at, n.created_at) DESC
        LIMIT 100
      `;
    }

    // Admin dashboard status अनुसार
    else if (
      status === "draft" ||
      status === "published"
    ) {
      query += `
        WHERE n.status = ?
        ORDER BY n.created_at DESC
        LIMIT 100
      `;

      params.push(status);
    }

    // Admin dashboard के लेल all
    else if (status === "all") {
      query += `
        ORDER BY n.created_at DESC
        LIMIT 100
      `;
    }

    else {
      return Response.json(
        {
          success: false,
          error: "Invalid status"
        },
        { status: 400 }
      );
    }

    const result = await env.DB
      .prepare(query)
      .bind(...params)
      .all();

    return Response.json({
      success: true,
      news: result.results || []
    });

  } catch (error) {

    console.error("GET NEWS ERROR:", error);

    return Response.json(
      {
        success: false,
        error: "समाचार लोड नहि भ' सकल"
      },
      { status: 500 }
    );
  }
}


// ============================================
// CREATE NEWS
// POST /api/news
// ============================================

export async function onRequestPost(context) {
  const { request, env } = context;

  try {

    // Admin authentication
    const user = await requireAdmin(request, env);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized"
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const title =
      String(body.title || "").trim();

    const summary =
      String(body.summary || "").trim();

    const content =
      String(body.content || "").trim();

    const imageUrl =
      String(body.image_url || "").trim();

    const categoryId =
      body.category_id
        ? Number(body.category_id)
        : null;

    const status =
      body.status === "published"
        ? "published"
        : "draft";

    const featured =
      body.featured ? 1 : 0;

    const seoTitle =
      String(body.seo_title || "").trim();

    const seoDescription =
      String(body.seo_description || "").trim();

    if (!title || !content) {
      return Response.json(
        {
          success: false,
          error: "शीर्षक आ समाचार जरूरी अछि"
        },
        { status: 400 }
      );
    }

    const slug =
      await createUniqueSlug(
        title,
        env
      );

    const publishedAt =
      status === "published"
        ? new Date().toISOString()
        : null;

    const result = await env.DB
      .prepare(`
        INSERT INTO news (
          title,
          slug,
          summary,
          content,
          image_url,
          category_id,
          author_id,
          status,
          featured,
          views,
          seo_title,
          seo_description,
          published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `)
      .bind(
        title,
        slug,
        summary,
        content,
        imageUrl || null,
        categoryId,
        user.id,
        status,
        featured,
        seoTitle || title,
        seoDescription || summary,
        publishedAt
      )
      .run();

    return Response.json({
      success: true,
      message: "समाचार सफलतापूर्वक जोड़ल गेल",
      id: result.meta.last_row_id,
      slug
    });

  } catch (error) {

    console.error("CREATE NEWS ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


// ============================================
// UPDATE NEWS
// PUT /api/news?id=123
// ============================================

export async function onRequestPut(context) {
  const { request, env } = context;

  try {

    const user =
      await requireAdmin(request, env);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized"
        },
        { status: 401 }
      );
    }

    const url =
      new URL(request.url);

    const id =
      url.searchParams.get("id");

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "News ID जरूरी अछि"
        },
        { status: 400 }
      );
    }

    const existing =
      await env.DB
        .prepare(`
          SELECT id, title, status
          FROM news
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: "समाचार नहि भेटल"
        },
        { status: 404 }
      );
    }

    const body =
      await request.json();

    const title =
      String(
        body.title ?? existing.title
      ).trim();

    const summary =
      String(
        body.summary ?? ""
      ).trim();

    const content =
      String(
        body.content ?? ""
      ).trim();

    const imageUrl =
      String(
        body.image_url ?? ""
      ).trim();

    const categoryId =
      body.category_id
        ? Number(body.category_id)
        : null;

    const status =
      body.status === "published"
        ? "published"
        : "draft";

    const featured =
      body.featured ? 1 : 0;

    const seoTitle =
      String(
        body.seo_title ?? ""
      ).trim();

    const seoDescription =
      String(
        body.seo_description ?? ""
      ).trim();

    if (!title || !content) {
      return Response.json(
        {
          success: false,
          error: "शीर्षक आ समाचार जरूरी अछि"
        },
        { status: 400 }
      );
    }

    // Publish time only when first published
    let publishedAt = null;

    if (status === "published") {

      const old =
        await env.DB
          .prepare(`
            SELECT published_at
            FROM news
            WHERE id = ?
          `)
          .bind(id)
          .first();

      publishedAt =
        old?.published_at ||
        new Date().toISOString();

    }

    await env.DB
      .prepare(`
        UPDATE news
        SET
          title = ?,
          summary = ?,
          content = ?,
          image_url = ?,
          category_id = ?,
          status = ?,
          featured = ?,
          seo_title = ?,
          seo_description = ?,
          published_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        title,
        summary,
        content,
        imageUrl || null,
        categoryId,
        status,
        featured,
        seoTitle || title,
        seoDescription || summary,
        publishedAt,
        id
      )
      .run();

    return Response.json({
      success: true,
      message: "समाचार अपडेट भ' गेल"
    });

  } catch (error) {

    console.error("UPDATE NEWS ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


// ============================================
// DELETE NEWS
// DELETE /api/news?id=123
// ============================================

export async function onRequestDelete(context) {
  const { request, env } = context;

  try {

    const user =
      await requireAdmin(request, env);

    if (!user) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized"
        },
        { status: 401 }
      );
    }

    const url =
      new URL(request.url);

    const id =
      url.searchParams.get("id");

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "News ID जरूरी अछि"
        },
        { status: 400 }
      );
    }

    const existing =
      await env.DB
        .prepare(`
          SELECT id
          FROM news
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!existing) {
      return Response.json(
        {
          success: false,
          error: "समाचार नहि भेटल"
        },
        { status: 404 }
      );
    }

    await env.DB
      .prepare(`
        DELETE FROM news
        WHERE id = ?
      `)
      .bind(id)
      .run();

    return Response.json({
      success: true,
      message: "समाचार delete भ' गेल"
    });

  } catch (error) {

    console.error("DELETE NEWS ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}


// ============================================
// ADMIN AUTHENTICATION
// ============================================

async function requireAdmin(
  request,
  env
) {

  try {

    if (!env.AUTH_SECRET) {
      return null;
    }

    const cookies =
      parseCookies(
        request.headers.get("Cookie") || ""
      );

    const token =
      cookies.session;

    if (!token) {
      return null;
    }

    const session =
      await verifySessionToken(
        token,
        env.AUTH_SECRET
      );

    if (!session || !session.id) {
      return null;
    }

    const user =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            email,
            role,
            status
          FROM users
          WHERE id = ?
          LIMIT 1
        `)
        .bind(session.id)
        .first();

    if (
      !user ||
      user.status !== "active" ||
      user.role !== "admin"
    ) {
      return null;
    }

    return user;

  } catch {
    return null;
  }
}


// ============================================
// SLUG
// ============================================

async function createUniqueSlug(
  title,
  env
) {

  let base =
    slugify(title);

  if (!base) {
    base =
      "news-" +
      Date.now();
  }

  let slug = base;
  let number = 2;

  while (true) {

    const existing =
      await env.DB
        .prepare(`
          SELECT id
          FROM news
          WHERE slug = ?
          LIMIT 1
        `)
        .bind(slug)
        .first();

    if (!existing) {
      return slug;
    }

    slug =
      `${base}-${number}`;

    number++;
  }
}


function slugify(value) {

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}


// ============================================
// COOKIE
// ============================================

function parseCookies(
  cookieString
) {

  const cookies = {};

  cookieString
    .split(";")
    .forEach(part => {

      const index =
        part.indexOf("=");

      if (index === -1) return;

      const key =
        part.slice(0, index).trim();

      const value =
        part.slice(index + 1).trim();

      cookies[key] = value;

    });

  return cookies;
}


// ============================================
// SESSION TOKEN
// ============================================

async function verifySessionToken(
  token,
  secret
) {

  try {

    const parts =
      String(token).split(".");

    if (parts.length !== 2) {
      return null;
    }

    const payload =
      parts[0];

    const signature =
      parts[1];

    const expected =
      await sign(
        payload,
        secret
      );

    if (
      !timingSafeEqualString(
        signature,
        expected
      )
    ) {
      return null;
    }

    const data =
      JSON.parse(
        fromBase64url(payload)
      );

    if (
      !data.exp ||
      data.exp <
        Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;

  } catch {
    return null;
  }
}


// ============================================
// HMAC
// ============================================

async function sign(
  value,
  secret
) {

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    );

  return base64urlBytes(
    new Uint8Array(signature)
  );
}


// ============================================
// ENCODING
// ============================================

function base64urlBytes(bytes) {

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}


function fromBase64url(value) {

  let base64 =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (base64.length % 4) {
    base64 += "=";
  }

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new TextDecoder()
    .decode(bytes);
}


function timingSafeEqualString(
  a,
  b
) {

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}
