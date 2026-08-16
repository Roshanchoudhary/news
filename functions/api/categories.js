// functions/api/categories.js

// ============================================================
// CATEGORY API
// ============================================================


// ============================================================
// GET CATEGORIES
// ============================================================

export async function onRequestGet(context) {

  const { env } = context;

  try {

    const result = await env.DB
      .prepare(`
        SELECT
          id,
          name,
          slug,
          description,
          menu_visible,
          menu_order,
          status,
          created_at
        FROM categories
        ORDER BY menu_order ASC, id ASC
      `)
      .all();

    return Response.json({
      success: true,
      categories: result.results || []
    });

  } catch (error) {

    console.error(
      "GET CATEGORIES ERROR:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// ============================================================
// ADD CATEGORY
// ============================================================

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


    const name =
      String(
        body.name || ""
      ).trim();


    const slug =
      String(
        body.slug || ""
      ).trim()
      .toLowerCase();


    const description =
      String(
        body.description || ""
      ).trim();


    const menuVisible =
      body.menu_visible === false
        ? 0
        : 1;


    const menuOrder =
      Number(
        body.menu_order || 0
      );


    const status =
      body.status === "inactive"
        ? "inactive"
        : "active";


    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!name) {

      return Response.json({
        success: false,
        error:
          "श्रेणी नाम जरूरी अछि"
      }, { status: 400 });

    }


    if (!slug) {

      return Response.json({
        success: false,
        error:
          "English URL slug जरूरी अछि"
      }, { status: 400 });

    }


    // -------------------------------
    // SLUG FORMAT
    // -------------------------------

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {

      return Response.json({
        success: false,
        error:
          "Slug केवल English अक्षर, number आ hyphen में होयबाक चाही। उदाहरण: mithila-news"
      }, { status: 400 });

    }


    // -------------------------------
    // DUPLICATE SLUG
    // -------------------------------

    const existing =
      await env.DB
        .prepare(`
          SELECT id
          FROM categories
          WHERE slug = ?
          LIMIT 1
        `)
        .bind(slug)
        .first();


    if (existing) {

      return Response.json({
        success: false,
        error:
          "ई URL slug पहिले सँ मौजूद अछि"
      }, { status: 409 });

    }


    // -------------------------------
    // INSERT
    // -------------------------------

    const result =
      await env.DB
        .prepare(`
          INSERT INTO categories (
            name,
            slug,
            description,
            menu_visible,
            menu_order,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          name,
          slug,
          description || null,
          menuVisible,
          menuOrder,
          status
        )
        .run();


    return Response.json({
      success: true,
      message:
        "श्रेणी सफलतापूर्वक जोड़ल गेल",
      id:
        result.meta.last_row_id
    });

  } catch (error) {

    console.error(
      "ADD CATEGORY ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "श्रेणी जोड़ल नहि जा सकल"
    }, { status: 500 });
  }
}


// ============================================================
// UPDATE CATEGORY
// ============================================================

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
        error:
          "Category ID जरूरी अछि"
      }, { status: 400 });

    }


    const body =
      await request.json();


    const name =
      String(
        body.name || ""
      ).trim();


    const slug =
      String(
        body.slug || ""
      ).trim()
      .toLowerCase();


    const description =
      String(
        body.description || ""
      ).trim();


    const menuVisible =
      body.menu_visible === false
        ? 0
        : 1;


    const menuOrder =
      Number(
        body.menu_order || 0
      );


    const status =
      body.status === "inactive"
        ? "inactive"
        : "active";


    if (!name || !slug) {

      return Response.json({
        success: false,
        error:
          "श्रेणी नाम आ English URL slug जरूरी अछि"
      }, { status: 400 });

    }


    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {

      return Response.json({
        success: false,
        error:
          "Slug सही English format में लिखू"
      }, { status: 400 });

    }


    const existing =
      await env.DB
        .prepare(`
          SELECT id
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();


    if (!existing) {

      return Response.json({
        success: false,
        error:
          "श्रेणी नहि भेटल"
      }, { status: 404 });

    }


    const duplicate =
      await env.DB
        .prepare(`
          SELECT id
          FROM categories
          WHERE slug = ?
          AND id != ?
          LIMIT 1
        `)
        .bind(
          slug,
          id
        )
        .first();


    if (duplicate) {

      return Response.json({
        success: false,
        error:
          "ई URL slug पहिले सँ मौजूद अछि"
      }, { status: 409 });

    }


    await env.DB
      .prepare(`
        UPDATE categories
        SET
          name = ?,
          slug = ?,
          description = ?,
          menu_visible = ?,
          menu_order = ?,
          status = ?
        WHERE id = ?
      `)
      .bind(
        name,
        slug,
        description || null,
        menuVisible,
        menuOrder,
        status,
        id
      )
      .run();


    return Response.json({
      success: true,
      message:
        "श्रेणी अपडेट भ' गेल"
    });

  } catch (error) {

    console.error(
      "UPDATE CATEGORY ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "श्रेणी अपडेट नहि भ' सकल"
    }, { status: 500 });
  }
}


// ============================================================
// DELETE CATEGORY
// ============================================================

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
        error:
          "Category ID जरूरी अछि"
      }, { status: 400 });

    }


    // Check whether news uses this category

    const used =
      await env.DB
        .prepare(`
          SELECT COUNT(*) AS total
          FROM news
          WHERE category_id = ?
        `)
        .bind(id)
        .first();


    if (
      Number(used?.total || 0) > 0
    ) {

      return Response.json({
        success: false,
        error:
          "ई श्रेणी समाचार में उपयोग भ' रहल अछि। पहिले समाचारक श्रेणी बदलू।"
      }, { status: 409 });

    }


    const result =
      await env.DB
        .prepare(`
          DELETE FROM categories
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
        error:
          "श्रेणी नहि भेटल"
      }, { status: 404 });

    }


    return Response.json({
      success: true,
      message:
        "श्रेणी delete भ' गेल"
    });

  } catch (error) {

    console.error(
      "DELETE CATEGORY ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "श्रेणी delete नहि भ' सकल"
    }, { status: 500 });
  }
}


// ============================================================
// ADMIN AUTH
// ============================================================

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
        request.headers.get(
          "Cookie"
        ) || ""
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
        .bind(
          session.id
        )
        .first();


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


// ============================================================
// COOKIE PARSER
// ============================================================

function parseCookies(
  cookieString
) {

  const cookies = {};

  cookieString
    .split(";")
    .forEach(
      part => {

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
      }
    );

  return cookies;
}


// ============================================================
// VERIFY SESSION
// ============================================================

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


// ============================================================
// SIGN
// ============================================================

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


// ============================================================
// BASE64 URL ENCODE
// ============================================================

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


// ============================================================
// BASE64 URL DECODE
// ============================================================

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


// ============================================================
// TIMING SAFE
// ============================================================

function timingSafeEqual(
  a,
  b
) {

  if (
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
