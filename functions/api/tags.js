// functions/api/tags.js

export async function onRequest(context) {

  const { request, env } = context;

  try {

    const method =
      request.method.toUpperCase();

    // Make sure required tables exist
    await ensureTables(env);

    if (method === "GET") {
      return await getTags(request, env);
    }

    if (method === "POST") {
      return await createTag(request, env);
    }

    if (
      method === "PUT" ||
      method === "PATCH"
    ) {
      return await updateTag(request, env);
    }

    if (method === "DELETE") {
      return await deleteTag(request, env);
    }

    return json({
      success: false,
      error: "Method not allowed"
    }, 405);

  } catch (error) {

    console.error(
      "TAGS API ERROR:",
      error
    );

    return json({
      success: false,
      error:
        error.message ||
        "Tag API में त्रुटि भेल"
    }, 500);

  }

}


// ======================================================
// CREATE REQUIRED TABLES
// ======================================================

async function ensureTables(env) {

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
// GET TAGS
// ======================================================

async function getTags(
  request,
  env
) {

  const url =
    new URL(request.url);


  const id =
    url.searchParams.get("id");


  const slug =
    url.searchParams.get("slug");


  const status =
    url.searchParams.get("status");


  const search =
    url.searchParams.get("search");


  // --------------------------------------------------
  // Single tag
  // --------------------------------------------------

  if (id || slug) {

    let tag;


    if (slug) {

      tag =
        await env.DB
          .prepare(`
            SELECT
              t.*,
              COUNT(nt.news_id) AS news_count
            FROM tags t
            LEFT JOIN news_tags nt
              ON nt.tag_id = t.id
            WHERE t.slug = ?
            GROUP BY t.id
            LIMIT 1
          `)
          .bind(slug)
          .first();

    } else {

      tag =
        await env.DB
          .prepare(`
            SELECT
              t.*,
              COUNT(nt.news_id) AS news_count
            FROM tags t
            LEFT JOIN news_tags nt
              ON nt.tag_id = t.id
            WHERE t.id = ?
            GROUP BY t.id
            LIMIT 1
          `)
          .bind(id)
          .first();

    }


    if (!tag) {

      return json({
        success: false,
        error:
          "Tag नहि भेटल"
      }, 404);

    }


    return json({
      success: true,

      tag:
        normalizeTag(tag)

    });

  }


  // --------------------------------------------------
  // Tag list
  // --------------------------------------------------

  let where = [];
  let bindings = [];


  if (
    status &&
    status !== "all"
  ) {

    where.push(
      "t.status = ?"
    );

    bindings.push(
      status
    );

  }


  if (search) {

    where.push(`
      (
        t.name LIKE ?
        OR t.slug LIKE ?
        OR t.description LIKE ?
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


  const whereSQL =
    where.length
      ? "WHERE " +
        where.join(" AND ")
      : "";


  const result =
    await env.DB
      .prepare(`
        SELECT
          t.*,
          COUNT(nt.news_id) AS news_count

        FROM tags t

        LEFT JOIN news_tags nt
          ON nt.tag_id = t.id

        ${whereSQL}

        GROUP BY t.id

        ORDER BY
          t.name COLLATE NOCASE ASC,
          t.id ASC
      `)
      .bind(...bindings)
      .all();


  const tags =
    (
      result.results || []
    ).map(
      normalizeTag
    );


  return json({
    success: true,
    tags
  });

}


// ======================================================
// CREATE TAG
// ======================================================

async function createTag(
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


  const body =
    await request.json();


  const name =
    cleanString(
      body.name
    );


  let slug =
    cleanString(
      body.slug
    )
      .toLowerCase();


  const description =
    cleanString(
      body.description
    );


  const status =
    normalizeStatus(
      body.status
    );


  if (!name) {

    return json({
      success: false,
      error:
        "Tag name जरूरी अछि"
    }, 400);

  }


  // Auto generate English slug
  if (!slug) {

    slug =
      makeSlug(name);

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


  // --------------------------------------------------
  // Duplicate name
  // --------------------------------------------------

  const duplicateName =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM tags
        WHERE LOWER(name) = LOWER(?)
        LIMIT 1
      `)
      .bind(name)
      .first();


  if (duplicateName) {

    return json({
      success: false,
      error:
        "ई Tag पहिले सँ मौजूद अछि"
    }, 409);

  }


  // --------------------------------------------------
  // Duplicate slug
  // --------------------------------------------------

  const duplicateSlug =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM tags
        WHERE slug = ?
        LIMIT 1
      `)
      .bind(slug)
      .first();


  if (duplicateSlug) {

    return json({
      success: false,
      error:
        "ई English URL slug पहिले सँ मौजूद अछि"
    }, 409);

  }


  const result =
    await env.DB
      .prepare(`
        INSERT INTO tags (
          name,
          slug,
          description,
          status
        )
        VALUES (?, ?, ?, ?)
      `)
      .bind(
        name,
        slug,
        description || null,
        status
      )
      .run();


  const tagId =
    result.meta.last_row_id;


  return json({
    success: true,

    message:
      "Tag सफलतापूर्वक जोड़ल गेल",

    tag: {
      id: tagId,
      name,
      slug,
      description:
        description || null,
      status,
      news_count: 0,
      url:
        `/tag/${slug}`
    }

  });

}


// ======================================================
// UPDATE TAG
// ======================================================

async function updateTag(
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
    new URL(request.url);


  const id =
    url.searchParams.get("id");


  const body =
    await request.json();


  const tagId =
    id ||
    body.id;


  if (!tagId) {

    return json({
      success: false,
      error:
        "Tag ID जरूरी अछि"
    }, 400);

  }


  const oldTag =
    await env.DB
      .prepare(`
        SELECT *
        FROM tags
        WHERE id = ?
        LIMIT 1
      `)
      .bind(tagId)
      .first();


  if (!oldTag) {

    return json({
      success: false,
      error:
        "Tag नहि भेटल"
    }, 404);

  }


  const name =
    body.name !== undefined
      ? cleanString(body.name)
      : oldTag.name;


  let slug =
    body.slug !== undefined
      ? cleanString(body.slug)
          .toLowerCase()
      : oldTag.slug;


  const description =
    body.description !== undefined
      ? cleanString(
          body.description
        )
      : oldTag.description;


  const status =
    body.status !== undefined
      ? normalizeStatus(
          body.status
        )
      : normalizeStatus(
          oldTag.status
        );


  if (!name) {

    return json({
      success: false,
      error:
        "Tag name जरूरी अछि"
    }, 400);

  }


  if (!slug) {

    slug =
      makeSlug(name);

  }


  if (!validSlug(slug)) {

    return json({
      success: false,
      error:
        "English URL slug सही नहि अछि"
    }, 400);

  }


  // --------------------------------------------------
  // Duplicate name
  // --------------------------------------------------

  const duplicateName =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM tags
        WHERE LOWER(name) = LOWER(?)
          AND id != ?
        LIMIT 1
      `)
      .bind(
        name,
        tagId
      )
      .first();


  if (duplicateName) {

    return json({
      success: false,
      error:
        "ई Tag नाम दोसर Tag में मौजूद अछि"
    }, 409);

  }


  // --------------------------------------------------
  // Duplicate slug
  // --------------------------------------------------

  const duplicateSlug =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM tags
        WHERE slug = ?
          AND id != ?
        LIMIT 1
      `)
      .bind(
        slug,
        tagId
      )
      .first();


  if (duplicateSlug) {

    return json({
      success: false,
      error:
        "ई English URL slug दोसर Tag में उपयोग भ' रहल अछि"
    }, 409);

  }


  await env.DB
    .prepare(`
      UPDATE tags

      SET
        name = ?,
        slug = ?,
        description = ?,
        status = ?

      WHERE id = ?
    `)
    .bind(
      name,
      slug,
      description || null,
      status,
      tagId
    )
    .run();


  const count =
    await getTagNewsCount(
      env,
      tagId
    );


  return json({
    success: true,

    message:
      "Tag सफलतापूर्वक update भ' गेल",

    tag: {
      id:
        Number(tagId),

      name,
      slug,

      description:
        description || null,

      status,

      news_count:
        count,

      url:
        `/tag/${slug}`
    }

  });

}


// ======================================================
// DELETE TAG
// ======================================================

async function deleteTag(
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
    new URL(request.url);


  const id =
    url.searchParams.get("id");


  if (!id) {

    return json({
      success: false,
      error:
        "Tag ID जरूरी अछि"
    }, 400);

  }


  const tag =
    await env.DB
      .prepare(`
        SELECT
          id,
          name,
          slug
        FROM tags
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();


  if (!tag) {

    return json({
      success: false,
      error:
        "Tag नहि भेटल"
    }, 404);

  }


  const count =
    await getTagNewsCount(
      env,
      id
    );


  // Don't silently remove a tag
  // that is being used by news.
  if (count > 0) {

    return json({
      success: false,

      error:
        `ई Tag ${count} समाचार में उपयोग भ' रहल अछि। पहिले समाचार सँ Tag हटाउ, तकर बाद delete करू।`

    }, 409);

  }


  await env.DB
    .prepare(`
      DELETE FROM tags
      WHERE id = ?
    `)
    .bind(id)
    .run();


  return json({
    success: true,

    message:
      "Tag delete भ' गेल"
  });

}


// ======================================================
// TAG NEWS COUNT
// ======================================================

async function getTagNewsCount(
  env,
  tagId
) {

  const result =
    await env.DB
      .prepare(`
        SELECT
          COUNT(*) AS total
        FROM news_tags
        WHERE tag_id = ?
      `)
      .bind(tagId)
      .first();


  return Number(
    result?.total || 0
  );

}


// ======================================================
// NORMALIZE TAG
// ======================================================

function normalizeTag(
  tag
) {

  return {
    ...tag,

    id:
      Number(tag.id),

    news_count:
      Number(
        tag.news_count || 0
      ),

    status:
      tag.status ||
      "active",

    url:
      `/tag/${tag.slug}`
  };

}


// ======================================================
// ADMIN AUTH
// ======================================================

async function requireAdmin(
  request,
  env
) {

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


    const data =
      JSON.parse(
        decodeBase64Url(
          payload
        )
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
// COOKIE PARSER
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
// STATUS
// ======================================================

function normalizeStatus(
  value
) {

  const status =
    String(
      value || "active"
    )
      .toLowerCase();


  return [
    "active",
    "inactive"
  ].includes(status)

    ? status

    : "active";

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
      status,

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
    a.length !== b.length
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
