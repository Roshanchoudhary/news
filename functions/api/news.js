// functions/api/news.js

export async function onRequest(context) {
  const { request, env } = context;

  try {
    // --------------------------------------------------
    // Ensure tag relation tables exist
    // --------------------------------------------------

    await ensureTagTables(env);

    const method = request.method.toUpperCase();

    if (method === "GET") {
      return await getNews(request, env);
    }

    if (method === "POST") {
      return await createNews(request, env);
    }

    if (method === "PUT") {
      return await updateNews(request, env);
    }

    if (method === "DELETE") {
      return await deleteNews(request, env);
    }

    return json({
      success: false,
      error: "Method not allowed"
    }, 405);

  } catch (error) {

    console.error("NEWS API ERROR:", error);

    return json({
      success: false,
      error:
        error.message ||
        "समाचार API में त्रुटि भेल"
    }, 500);
  }
}


// ======================================================
// GET NEWS
// ======================================================

async function getNews(request, env) {

  const url =
    new URL(request.url);

  const id =
    url.searchParams.get("id");

  const slug =
    url.searchParams.get("slug");

  const status =
    url.searchParams.get("status");

  const categoryId =
    url.searchParams.get("category_id");

  const tagSlug =
    url.searchParams.get("tag");

  const search =
    url.searchParams.get("search");

  const page =
    Math.max(
      1,
      Number(
        url.searchParams.get("page") || 1
      )
    );

  const limit =
    Math.min(
      50,
      Math.max(
        1,
        Number(
          url.searchParams.get("limit") || 20
        )
      )
    );

  const offset =
    (page - 1) * limit;


  // --------------------------------------------------
  // Single news by ID or SLUG
  // --------------------------------------------------

  if (id || slug) {

    let news;

    if (slug) {

      news =
        await env.DB
          .prepare(`
            SELECT
              n.*,
              c.name AS category_name,
              c.slug AS category_slug,
              u.name AS author_name
            FROM news n
            LEFT JOIN categories c
              ON c.id = n.category_id
            LEFT JOIN users u
              ON u.id = n.author_id
            WHERE n.slug = ?
            LIMIT 1
          `)
          .bind(slug)
          .first();

    } else {

      news =
        await env.DB
          .prepare(`
            SELECT
              n.*,
              c.name AS category_name,
              c.slug AS category_slug,
              u.name AS author_name
            FROM news n
            LEFT JOIN categories c
              ON c.id = n.category_id
            LEFT JOIN users u
              ON u.id = n.author_id
            WHERE n.id = ?
            LIMIT 1
          `)
          .bind(id)
          .first();

    }


    if (!news) {

      return json({
        success: false,
        error: "समाचार नहि भेटल"
      }, 404);

    }


    const tags =
      await getNewsTags(
        env,
        news.id
      );

    news.tags = tags;


    // Views only when requested from public page.
    // Admin calls can use ?no_view=1.
    if (
      url.searchParams.get("no_view") !== "1" &&
      news.status === "published"
    ) {

      await env.DB
        .prepare(`
          UPDATE news
          SET views =
            COALESCE(views, 0) + 1
          WHERE id = ?
        `)
        .bind(news.id)
        .run();

      news.views =
        Number(news.views || 0) + 1;
    }


    return json({
      success: true,
      news: news
    });

  }


  // --------------------------------------------------
  // List news
  // --------------------------------------------------

  let where = [];
  let bindings = [];


  if (status) {

    where.push(
      "n.status = ?"
    );

    bindings.push(
      status
    );

  }


  if (categoryId) {

    where.push(
      "n.category_id = ?"
    );

    bindings.push(
      categoryId
    );

  }


  if (search) {

    where.push(`
      (
        n.title LIKE ?
        OR n.summary LIKE ?
        OR n.content LIKE ?
      )
    `);

    const q =
      `%${search}%`;

    bindings.push(
      q,
      q,
      q
    );

  }


  // Tag filter
  if (tagSlug) {

    where.push(`
      EXISTS (
        SELECT 1
        FROM news_tags nt
        INNER JOIN tags t
          ON t.id = nt.tag_id
        WHERE
          nt.news_id = n.id
          AND t.slug = ?
          AND t.status = 'active'
      )
    `);

    bindings.push(
      tagSlug
    );

  }


  const whereSQL =
    where.length
      ? "WHERE " + where.join(" AND ")
      : "";


  const countQuery = `
    SELECT COUNT(*) AS total
    FROM news n
    ${whereSQL}
  `;


  const countResult =
    await env.DB
      .prepare(countQuery)
      .bind(...bindings)
      .first();


  const total =
    Number(
      countResult?.total || 0
    );


  const query = `
    SELECT
      n.*,
      c.name AS category_name,
      c.slug AS category_slug,
      u.name AS author_name
    FROM news n

    LEFT JOIN categories c
      ON c.id = n.category_id

    LEFT JOIN users u
      ON u.id = n.author_id

    ${whereSQL}

    ORDER BY
      CASE
        WHEN n.featured = 1
        THEN 0
        ELSE 1
      END,

      COALESCE(
        n.published_at,
        n.created_at
      ) DESC,

      n.id DESC

    LIMIT ?
    OFFSET ?
  `;


  const result =
    await env.DB
      .prepare(query)
      .bind(
        ...bindings,
        limit,
        offset
      )
      .all();


  const news =
    result.results || [];


  // Add tags to every news item
  for (
    const item of news
  ) {

    item.tags =
      await getNewsTags(
        env,
        item.id
      );

  }


  return json({
    success: true,

    news: news,

    pagination: {
      page: page,
      limit: limit,
      total: total,
      pages:
        Math.ceil(
          total / limit
        )
    }
  });

}


// ======================================================
// CREATE NEWS
// ======================================================

async function createNews(
  request,
  env
) {

  const body =
    await request.json();


  // Authentication
  const user =
    await requireAdmin(
      request,
      env
    );


  if (!user) {

    return json({
      success: false,
      error: "Unauthorized"
    }, 401);

  }


  const title =
    cleanString(
      body.title
    );

  const summary =
    cleanString(
      body.summary
    );

  const content =
    String(
      body.content || ""
    ).trim();

  const imageUrl =
    cleanString(
      body.image_url
    );

  const categoryId =
    nullableNumber(
      body.category_id
    );

  const authorId =
    user.id;

  let slug =
    cleanString(
      body.slug
    )
    .toLowerCase();


  const status =
    normalizeStatus(
      body.status
    );


  const featured =
    body.featured ? 1 : 0;


  const seoTitle =
    cleanString(
      body.seo_title
    );

  const seoDescription =
    cleanString(
      body.seo_description
    );


  const publishedAt =
    body.published_at
      ? body.published_at
      : (
          status === "published"
            ? new Date().toISOString()
            : null
        );


  if (!title) {

    return json({
      success: false,
      error:
        "शीर्षक जरूरी अछि"
    }, 400);

  }


  if (!content) {

    return json({
      success: false,
      error:
        "समाचार जरूरी अछि"
    }, 400);

  }


  // Generate slug automatically
  if (!slug) {

    slug =
      makeSlug(
        title
      );

  }


  if (!slug) {

    return json({
      success: false,
      error:
        "English URL slug जरूरी अछि"
    }, 400);

  }


  if (!validSlug(slug)) {

    return json({
      success: false,
      error:
        "URL slug केवल English अक्षर, number आ hyphen में होयबाक चाही"
    }, 400);

  }


  // Check duplicate slug
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


  if (existing) {

    return json({
      success: false,
      error:
        "ई News URL पहिले सँ मौजूद अछि"
    }, 409);

  }


  // Check category
  if (categoryId) {

    const category =
      await env.DB
        .prepare(`
          SELECT id
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(categoryId)
        .first();


    if (!category) {

      return json({
        success: false,
        error:
          "चयनित श्रेणी नहि भेटल"
      }, 400);

    }

  }


  const result =
    await env.DB
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
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, 0, ?, ?, ?
        )
      `)
      .bind(
        title,
        slug,
        summary || null,
        content,
        imageUrl || null,
        categoryId,
        authorId,
        status,
        featured,
        seoTitle || null,
        seoDescription || null,
        publishedAt
      )
      .run();


  const newsId =
    result.meta.last_row_id;


  // Save tags
  await saveNewsTags(
    env,
    newsId,
    body.tags
  );


  return json({
    success: true,

    message:
      "समाचार सफलतापूर्वक जोड़ल गेल",

    news: {
      id: newsId,
      slug: slug,
      url:
        `/news/${slug}`
    }
  });

}


// ======================================================
// UPDATE NEWS
// ======================================================

async function updateNews(
  request,
  env
) {

  const user =
    await requireAdmin(
      request,
      env
    );


  if (!user) {

    return json({
      success: false,
      error: "Unauthorized"
    }, 401);

  }


  const url =
    new URL(
      request.url
    );


  const id =
    url.searchParams.get("id") ||
    url.searchParams.get("news_id");


  const body =
    await request.json();


  const newsId =
    id ||
    body.id;


  if (!newsId) {

    return json({
      success: false,
      error:
        "News ID जरूरी अछि"
    }, 400);

  }


  const oldNews =
    await env.DB
      .prepare(`
        SELECT *
        FROM news
        WHERE id = ?
        LIMIT 1
      `)
      .bind(newsId)
      .first();


  if (!oldNews) {

    return json({
      success: false,
      error:
        "समाचार नहि भेटल"
    }, 404);

  }


  const title =
    cleanString(
      body.title
    );


  const summary =
    cleanString(
      body.summary
    );


  const content =
    String(
      body.content ??
      oldNews.content ??
      ""
    ).trim();


  let slug =
    cleanString(
      body.slug
    )
    .toLowerCase();


  if (!slug) {

    slug =
      oldNews.slug ||
      makeSlug(title);

  }


  if (!validSlug(slug)) {

    return json({
      success: false,
      error:
        "English URL slug सही नहि अछि"
    }, 400);

  }


  // Duplicate slug except current news
  const duplicate =
    await env.DB
      .prepare(`
        SELECT id
        FROM news
        WHERE slug = ?
          AND id != ?
        LIMIT 1
      `)
      .bind(
        slug,
        newsId
      )
      .first();


  if (duplicate) {

    return json({
      success: false,
      error:
        "ई News URL दोसर समाचार में उपयोग भ' रहल अछि"
    }, 409);

  }


  const categoryId =
    body.category_id !== undefined
      ? nullableNumber(
          body.category_id
        )
      : oldNews.category_id;


  const status =
    body.status !== undefined
      ? normalizeStatus(
          body.status
        )
      : oldNews.status;


  const featured =
    body.featured !== undefined
      ? (
          body.featured ? 1 : 0
        )
      : Number(
          oldNews.featured || 0
        );


  const imageUrl =
    body.image_url !== undefined
      ? cleanString(
          body.image_url
        )
      : oldNews.image_url;


  const seoTitle =
    body.seo_title !== undefined
      ? cleanString(
          body.seo_title
        )
      : oldNews.seo_title;


  const seoDescription =
    body.seo_description !== undefined
      ? cleanString(
          body.seo_description
        )
      : oldNews.seo_description;


  let publishedAt =
    body.published_at !== undefined
      ? body.published_at
      : oldNews.published_at;


  if (
    status === "published" &&
    !publishedAt
  ) {

    publishedAt =
      new Date().toISOString();

  }


  await env.DB
    .prepare(`
      UPDATE news
      SET
        title = ?,
        slug = ?,
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
      title || oldNews.title,
      slug,
      summary,
      content,
      imageUrl || null,
      categoryId,
      status,
      featured,
      seoTitle || null,
      seoDescription || null,
      publishedAt || null,
      newsId
    )
    .run();


  // Update tags only when tags field supplied
  if (
    body.tags !== undefined
  ) {

    await saveNewsTags(
      env,
      newsId,
      body.tags
    );

  }


  return json({
    success: true,

    message:
      "समाचार सफलतापूर्वक update भ' गेल",

    news: {
      id: Number(newsId),
      slug: slug,
      url:
        `/news/${slug}`
    }
  });

}


// ======================================================
// DELETE NEWS
// ======================================================

async function deleteNews(
  request,
  env
) {

  const user =
    await requireAdmin(
      request,
      env
    );


  if (!user) {

    return json({
      success: false,
      error: "Unauthorized"
    }, 401);

  }


  const url =
    new URL(
      request.url
    );


  const id =
    url.searchParams.get("id");


  if (!id) {

    return json({
      success: false,
      error:
        "News ID जरूरी अछि"
    }, 400);

  }


  const news =
    await env.DB
      .prepare(`
        SELECT id
        FROM news
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();


  if (!news) {

    return json({
      success: false,
      error:
        "समाचार नहि भेटल"
    }, 404);

  }


  // Remove tag relations first
  await env.DB
    .prepare(`
      DELETE FROM news_tags
      WHERE news_id = ?
    `)
    .bind(id)
    .run();


  await env.DB
    .prepare(`
      DELETE FROM comments
      WHERE news_id = ?
    `)
    .bind(id)
    .run();


  await env.DB
    .prepare(`
      DELETE FROM news
      WHERE id = ?
    `)
    .bind(id)
    .run();


  return json({
    success: true,
    message:
      "समाचार delete भ' गेल"
  });

}


// ======================================================
// TAG TABLES
// ======================================================

async function ensureTagTables(
  env
) {

  await env.DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .run();


  await env.DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS news_tags (
        news_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (
          news_id,
          tag_id
        ),
        FOREIGN KEY (
          news_id
        )
        REFERENCES news(id)
        ON DELETE CASCADE,
        FOREIGN KEY (
          tag_id
        )
        REFERENCES tags(id)
        ON DELETE CASCADE
      )
    `)
    .run();


  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS
      idx_news_tags_news
      ON news_tags(news_id)
    `)
    .run();


  await env.DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS
      idx_news_tags_tag
      ON news_tags(tag_id)
    `)
    .run();

}


// ======================================================
// GET NEWS TAGS
// ======================================================

async function getNewsTags(
  env,
  newsId
) {

  const result =
    await env.DB
      .prepare(`
        SELECT
          t.id,
          t.name,
          t.slug,
          t.description
        FROM tags t
        INNER JOIN news_tags nt
          ON nt.tag_id = t.id
        WHERE nt.news_id = ?
          AND t.status = 'active'
        ORDER BY t.name COLLATE NOCASE ASC
      `)
      .bind(newsId)
      .all();


  return result.results || [];

}


// ======================================================
// SAVE NEWS TAGS
// ======================================================

async function saveNewsTags(
  env,
  newsId,
  input
) {

  if (
    input === undefined ||
    input === null
  ) {

    return;

  }


  let values = [];


  if (Array.isArray(input)) {

    values =
      input;

  } else {

    values =
      String(input)
        .split(",")
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);

  }


  // Remove duplicates
  values =
    [
      ...new Set(
        values
          .map(
            item =>
              String(item)
                .trim()
          )
          .filter(Boolean)
      )
    ];


  await env.DB
    .prepare(`
      DELETE FROM news_tags
      WHERE news_id = ?
    `)
    .bind(newsId)
    .run();


  for (
    const value of values
  ) {

    let tag;


    // Numeric ID
    if (
      /^\d+$/.test(
        String(value)
      )
    ) {

      tag =
        await env.DB
          .prepare(`
            SELECT id
            FROM tags
            WHERE id = ?
            LIMIT 1
          `)
          .bind(
            Number(value)
          )
          .first();

    } else {

      // Prefer slug
      tag =
        await env.DB
          .prepare(`
            SELECT id
            FROM tags
            WHERE slug = ?
            LIMIT 1
          `)
          .bind(
            String(value)
              .toLowerCase()
          )
          .first();


      // Also allow tag name
      if (!tag) {

        tag =
          await env.DB
            .prepare(`
              SELECT id
              FROM tags
              WHERE name = ?
              LIMIT 1
            `)
            .bind(
              String(value)
                .trim()
            )
            .first();

      }

    }


    // Unknown tag is ignored
    if (!tag) {
      continue;
    }


    await env.DB
      .prepare(`
        INSERT OR IGNORE INTO news_tags (
          news_id,
          tag_id
        )
        VALUES (?, ?)
      `)
      .bind(
        newsId,
        tag.id
      )
      .run();

  }

}


// ======================================================
// ADMIN AUTH
// ======================================================

async function requireAdmin(
  request,
  env
) {

  /*
   * Your current login system should keep
   * the session cookie as "session".
   *
   * AUTH_SECRET must be configured in
   * Cloudflare Pages Variables.
   */

  const secret =
    env.AUTH_SECRET;


  if (!secret) {

    console.error(
      "AUTH_SECRET missing"
    );

    return null;

  }


  const cookieHeader =
    request.headers.get(
      "Cookie"
    ) || "";


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
    await verifySession(
      token,
      secret
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
      .bind(
        session.id
      )
      .first();


  if (
    !user ||
    user.status !== "active"
  ) {

    return null;

  }


  if (
    user.role !== "admin"
  ) {

    return null;

  }


  return user;

}


// ======================================================
// SESSION VERIFY
// ======================================================

async function verifySession(
  token,
  secret
) {

  try {

    const parts =
      String(token)
        .split(".");


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
      await hmacSign(
        payload,
        secret
      );


    if (
      !safeEqual(
        signature,
        expected
      )
    ) {

      return null;

    }


    const jsonText =
      decodeBase64Url(
        payload
      );


    const data =
      JSON.parse(
        jsonText
      );


    if (
      data.exp &&
      Number(data.exp) <
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
// HMAC
// ======================================================

async function hmacSign(
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


  return base64Url(
    new Uint8Array(
      signature
    )
  );

}


// ======================================================
// COOKIE
// ======================================================

function parseCookies(
  header
) {

  const result = {};


  header
    .split(";")
    .forEach(
      part => {

        const index =
          part.indexOf("=");


        if (
          index === -1
        ) {

          return;

        }


        const key =
          part
            .slice(
              0,
              index
            )
            .trim();


        const value =
          part
            .slice(
              index + 1
            )
            .trim();


        result[key] =
          value;

      }
    );


  return result;

}


// ======================================================
// SLUG
// ======================================================

function makeSlug(
  value
) {

  return String(
    value || ""
  )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "");

}


// ======================================================
// VALID SLUG
// ======================================================

function validSlug(
  slug
) {

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    slug
  );

}


// ======================================================
// STRING
// ======================================================

function cleanString(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(
    value
  ).trim();

}


// ======================================================
// NUMBER
// ======================================================

function nullableNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "null"
  ) {

    return null;

  }


  const number =
    Number(value);


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


// ======================================================
// STATUS
// ======================================================

function normalizeStatus(
  value
) {

  const allowed = [
    "draft",
    "published",
    "archived"
  ];


  const status =
    String(
      value || "draft"
    )
      .toLowerCase();


  return allowed.includes(
    status
  )
    ? status
    : "draft";

}


// ======================================================
// JSON RESPONSE
// ======================================================

function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(
      data
    ),
    {
      status: status,

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",

        "Cache-Control":
          "no-store"
      }
    }
  );

}


// ======================================================
// BASE64 URL
// ======================================================

function base64Url(
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


  return btoa(
    binary
  )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=/g,
      "");

}


// ======================================================
// BASE64 URL DECODE
// ======================================================

function decodeBase64Url(
  value
) {

  let base64 =
    String(value)
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );


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
    .decode(
      bytes
    );

}


// ======================================================
// SAFE EQUAL
// ======================================================

function safeEqual(
  a,
  b
) {

  if (
    !a ||
    !b ||
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
