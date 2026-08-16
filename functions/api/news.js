// functions/api/news.js

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");

  try {
    // --------------------------------------------------
    // SINGLE NEWS
    // --------------------------------------------------
    if (id) {
      const news = await env.DB.prepare(`
        SELECT
          n.*,
          c.name AS category_name,
          u.name AS author_name
        FROM news n
        LEFT JOIN categories c
          ON c.id = n.category_id
        LEFT JOIN users u
          ON u.id = n.author_id
        WHERE n.id = ?
        LIMIT 1
      `).bind(id).first();

      if (!news) {
        return Response.json({
          success: false,
          error: "समाचार नहि भेटल"
        }, { status: 404 });
      }

      // Public visitor के Draft नहि देखाउ
      if (
        news.status !== "published" &&
        !(await isAdmin(request, env))
      ) {
        return Response.json({
          success: false,
          error: "समाचार उपलब्ध नहि अछि"
        }, { status: 404 });
      }

      // ------------------------------------------------
      // VIEW +1
      // ------------------------------------------------
      if (news.status === "published") {
        await env.DB.prepare(`
          UPDATE news
          SET views = COALESCE(views, 0) + 1
          WHERE id = ?
        `).bind(id).run();

        news.views =
          Number(news.views || 0) + 1;
      }

      return Response.json({
        success: true,
        news
      });
    }

    // --------------------------------------------------
    // NEWS LIST
    // --------------------------------------------------

    let query = `
      SELECT
        n.*,
        c.name AS category_name,
        u.name AS author_name
      FROM news n
      LEFT JOIN categories c
        ON c.id = n.category_id
      LEFT JOIN users u
        ON u.id = n.author_id
    `;

    const params = [];

    if (
      status &&
      status !== "all"
    ) {
      query += `
        WHERE n.status = ?
      `;

      params.push(status);
    }

    query += `
      ORDER BY
        COALESCE(
          n.published_at,
          n.created_at
        ) DESC,
        n.id DESC
    `;

    const result =
      await env.DB
        .prepare(query)
        .bind(...params)
        .all();

    return Response.json({
      success: true,
      news: result.results || []
    });

  } catch (error) {

    console.error(
      "GET NEWS ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "समाचार लोड नहि भ' सकल"
    }, { status: 500 });
  }
}


// ======================================================
// CREATE NEWS
// ======================================================

export async function onRequestPost(context) {

  const { request, env } = context;

  try {

    const user =
      await requireAdmin(
        request,
        env
      );

    if (!user) {
      return Response.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }

    const body =
      await request.json();

    const title =
      String(body.title || "").trim();

    const summary =
      String(body.summary || "").trim();

    const content =
      String(body.content || "").trim();

    const image_url =
      String(body.image_url || "").trim();

    const category_id =
      body.category_id
        ? Number(body.category_id)
        : null;

    const status =
      body.status === "published"
        ? "published"
        : "draft";

    const featured =
      body.featured ? 1 : 0;

    const seo_title =
      String(
        body.seo_title || ""
      ).trim();

    const seo_description =
      String(
        body.seo_description || ""
      ).trim();

    if (!title || !content) {
      return Response.json({
        success: false,
        error:
          "शीर्षक आ समाचार जरूरी अछि"
      }, { status: 400 });
    }

    const slug =
      await createUniqueSlug(
        title,
        env
      );

    const published_at =
      status === "published"
        ? new Date().toISOString()
        : null;

    const result =
      await env.DB.prepare(`
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
        summary || null,
        content,
        image_url || null,
        category_id,
        user.id,
        status,
        featured,
        seo_title || null,
        seo_description || null,
        published_at
      )
      .run();

    return Response.json({
      success: true,
      message:
        "समाचार सफलतापूर्वक जोड़ल गेल",
      id:
        result.meta.last_row_id
    });

  } catch (error) {

    console.error(
      "CREATE NEWS ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "समाचार जोड़ल नहि जा सकल"
    }, { status: 500 });
  }
}


// ======================================================
// UPDATE NEWS
// ======================================================

export async function onRequestPut(context) {

  const { request, env } = context;

  try {

    const user =
      await requireAdmin(
        request,
        env
      );

    if (!user) {
      return Response.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }

    const url =
      new URL(request.url);

    const id =
      url.searchParams.get("id");

    if (!id) {
      return Response.json({
        success: false,
        error: "News ID जरूरी अछि"
      }, { status: 400 });
    }

    const body =
      await request.json();

    const title =
      String(body.title || "").trim();

    const summary =
      String(body.summary || "").trim();

    const content =
      String(body.content || "").trim();

    const image_url =
      String(body.image_url || "").trim();

    const category_id =
      body.category_id
        ? Number(body.category_id)
        : null;

    const status =
      body.status === "published"
        ? "published"
        : "draft";

    const featured =
      body.featured ? 1 : 0;

    const seo_title =
      String(
        body.seo_title || ""
      ).trim();

    const seo_description =
      String(
        body.seo_description || ""
      ).trim();

    if (!title || !content) {
      return Response.json({
        success: false,
        error:
          "शीर्षक आ समाचार जरूरी अछि"
      }, { status: 400 });
    }

    const oldNews =
      await env.DB.prepare(`
        SELECT
          id,
          slug,
          published_at
        FROM news
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!oldNews) {
      return Response.json({
        success: false,
        error: "समाचार नहि भेटल"
      }, { status: 404 });
    }

    let published_at =
      oldNews.published_at;

    if (
      status === "published" &&
      !published_at
    ) {
      published_at =
        new Date().toISOString();
    }

    if (status === "draft") {
      published_at = null;
    }

    await env.DB.prepare(`
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
      summary || null,
      content,
      image_url || null,
      category_id,
      status,
      featured,
      seo_title || null,
      seo_description || null,
      published_at,
      id
    )
    .run();

    return Response.json({
      success: true,
      message:
        "समाचार अपडेट भ' गेल"
    });

  } catch (error) {

    console.error(
      "UPDATE NEWS ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "समाचार अपडेट नहि भ' सकल"
    }, { status: 500 });
  }
}


// ======================================================
// DELETE NEWS
// ======================================================

export async function onRequestDelete(context) {

  const { request, env } = context;

  try {

    const user =
      await requireAdmin(
        request,
        env
      );

    if (!user) {
      return Response.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }

    const url =
      new URL(request.url);

    const id =
      url.searchParams.get("id");

    if (!id) {
      return Response.json({
        success: false,
        error: "News ID जरूरी अछि"
      }, { status: 400 });
    }

    const result =
      await env.DB.prepare(`
        DELETE FROM news
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (
      !result.meta ||
      !result.meta.changes
    ) {
      return Response.json({
        success: false,
        error: "समाचार नहि भेटल"
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message:
        "समाचार delete भ' गेल"
    });

  } catch (error) {

    console.error(
      "DELETE NEWS ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "समाचार delete नहि भ' सकल"
    }, { status: 500 });
  }
}


// ======================================================
// ADMIN AUTH
// ======================================================

async function requireAdmin(
  request,
  env
) {

  try {

    const user =
      await getAuthenticatedUser(
        request,
        env
      );

    if (
      !user ||
      user.status !== "active" ||
      user.role !== "admin"
    ) {
      return null;
    }

    return user;

  } catch (error) {

    console.error(
      "AUTH ERROR:",
      error
    );

    return null;
  }
}


// ======================================================
// CHECK ADMIN FOR PUBLIC DETAIL
// ======================================================

async function isAdmin(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  return !!(
    user &&
    user.status === "active" &&
    user.role === "admin"
  );
}


// ======================================================
// AUTHENTICATED USER
// ======================================================

async function getAuthenticatedUser(
  request,
  env
) {

  if (!env.AUTH_SECRET) {
    return null;
  }

  const cookieHeader =
    request.headers.get("Cookie") || "";

  const cookies =
    parseCookies(
      cookieHeader
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

  if (
    !session ||
    !session.id
  ) {
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

  return user || null;
}


// ======================================================
// CREATE SLUG
// ======================================================

async function createUniqueSlug(
  title,
  env,
  currentId = null
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

    let query = `
      SELECT id
      FROM news
      WHERE slug = ?
    `;

    const params = [slug];

    if (currentId) {
      query += `
        AND id != ?
      `;

      params.push(currentId);
    }

    query += `
      LIMIT 1
    `;

    const existing =
      await env.DB
        .prepare(query)
        .bind(...params)
        .first();

    if (!existing) {
      return slug;
    }

    slug =
      base + "-" + number;

    number++;
  }
}


// ======================================================
// SLUGIFY
// ======================================================

function slugify(value) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "");
}


// ======================================================
// COOKIES
// ======================================================

function parseCookies(
  cookieString
) {

  const cookies = {};

  cookieString
    .split(";")
    .forEach(part => {

      const index =
        part.indexOf("=");

      if (index === -1) {
        return;
      }

      const key =
        part
          .slice(0, index)
          .trim();

      const value =
        part
          .slice(index + 1)
          .trim();

      cookies[key] =
        value;
    });

  return cookies;
}


// ======================================================
// VERIFY SESSION TOKEN
// ======================================================

async function verifySessionToken(
  token,
  secret
) {

  try {

    const parts =
      String(token).split(".");

    if (
      parts.length !== 2
    ) {
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
      !timingSafeEqual(
        signature,
        expected
      )
    ) {
      return null;
    }

    const data =
      JSON.parse(
        fromBase64url(
          payload
        )
      );

    if (
      !data.exp ||
      data.exp <
        Math.floor(
          Date.now() / 1000
        )
    ) {
      return null;
    }

    return data;

  } catch {

    return null;
  }
}


// ======================================================
// SIGN
// ======================================================

async function sign(
  value,
  secret
) {

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        secret
      ),
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
      new TextEncoder().encode(
        value
      )
    );

  return base64url(
    new Uint8Array(
      signature
    )
  );
}


// ======================================================
// BASE64 URL
// ======================================================

function base64url(
  bytes
) {

  let binary = "";

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}


// ======================================================
// BASE64 URL DECODE
// ======================================================

function fromBase64url(
  value
) {

  let base64 =
    String(value)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (
    base64.length % 4
  ) {
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


// ======================================================
// TIMING SAFE
// ======================================================

function timingSafe(
  a,
  b
) {

  if (
    a.length !==
    b.length
  ) {
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
