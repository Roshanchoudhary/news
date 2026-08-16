// functions/api/categories.js

// ============================================================
// CATEGORIES API
// GET    /api/categories
// POST   /api/categories
// PUT    /api/categories?id=1
// DELETE /api/categories?id=1
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
          created_at
        FROM categories
        ORDER BY id ASC
      `)
      .all();


    return Response.json({

      success: true,

      categories:
        result.results || []

    });


  } catch (error) {

    console.error(
      "GET CATEGORIES ERROR:",
      error
    );


    return Response.json(
      {
        success: false,
        error:
          "श्रेणी लोड नहि भ' सकल"
      },
      {
        status: 500
      }
    );

  }

}


// ============================================================
// CREATE CATEGORY
// POST /api/categories
// ============================================================

export async function onRequestPost(context) {

  const { request, env } = context;

  try {

    // --------------------------------------------------------
    // ADMIN CHECK
    // --------------------------------------------------------

    const user =
      await requireAdmin(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );

    }


    // --------------------------------------------------------
    // READ JSON
    // --------------------------------------------------------

    const body =
      await request.json();


    const name =
      String(
        body.name || ""
      ).trim();


    const description =
      String(
        body.description || ""
      ).trim();


    // --------------------------------------------------------
    // VALIDATE CATEGORY NAME
    // --------------------------------------------------------

    if (!name) {

      return Response.json(
        {
          success: false,
          error:
            "श्रेणी नाम जरूरी अछि"
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------------
    // CHECK DUPLICATE NAME
    // --------------------------------------------------------

    const existingName =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            slug
          FROM categories
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
        `)
        .bind(name)
        .first();


    if (existingName) {

      return Response.json(
        {
          success: false,
          error:
            "ई श्रेणी पहिले सँ मौजूद अछि"
        },
        {
          status: 409
        }
      );

    }


    // --------------------------------------------------------
    // CREATE UNIQUE SLUG
    // --------------------------------------------------------

    const slug =
      await createUniqueSlug(
        name,
        env
      );


    // --------------------------------------------------------
    // INSERT CATEGORY
    // --------------------------------------------------------

    const result =
      await env.DB
        .prepare(`
          INSERT INTO categories
          (
            name,
            slug,
            description
          )
          VALUES (?, ?, ?)
        `)
        .bind(
          name,
          slug,
          description || null
        )
        .run();


    // --------------------------------------------------------
    // RETURN RESULT
    // --------------------------------------------------------

    return Response.json({

      success: true,

      message:
        "श्रेणी सफलतापूर्वक जोड़ल गेल",

      id:
        result.meta.last_row_id,

      slug:
        slug

    });


  } catch (error) {

    console.error(
      "CREATE CATEGORY ERROR:",
      error
    );


    return Response.json(
      {
        success: false,
        error:
          error.message ||
          "श्रेणी जोड़ल नहि जा सकल"
      },
      {
        status: 500
      }
    );

  }

}


// ============================================================
// UPDATE CATEGORY
// PUT /api/categories?id=1
// ============================================================

export async function onRequestPut(context) {

  const { request, env } = context;

  try {

    // --------------------------------------------------------
    // ADMIN CHECK
    // --------------------------------------------------------

    const user =
      await requireAdmin(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );

    }


    // --------------------------------------------------------
    // GET ID
    // --------------------------------------------------------

    const url =
      new URL(
        request.url
      );


    const id =
      url.searchParams.get(
        "id"
      );


    if (!id) {

      return Response.json(
        {
          success: false,
          error:
            "Category ID जरूरी अछि"
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------------
    // READ BODY
    // --------------------------------------------------------

    const body =
      await request.json();


    const name =
      String(
        body.name || ""
      ).trim();


    const description =
      String(
        body.description || ""
      ).trim();


    if (!name) {

      return Response.json(
        {
          success: false,
          error:
            "श्रेणी नाम जरूरी अछि"
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------------
    // CHECK CATEGORY EXISTS
    // --------------------------------------------------------

    const existing =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            slug
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();


    if (!existing) {

      return Response.json(
        {
          success: false,
          error:
            "श्रेणी नहि भेटल"
        },
        {
          status: 404
        }
      );

    }


    // --------------------------------------------------------
    // CHECK DUPLICATE NAME
    // --------------------------------------------------------

    const duplicate =
      await env.DB
        .prepare(`
          SELECT
            id
          FROM categories
          WHERE LOWER(name) = LOWER(?)
          AND id != ?
          LIMIT 1
        `)
        .bind(
          name,
          id
        )
        .first();


    if (duplicate) {

      return Response.json(
        {
          success: false,
          error:
            "ई नामक श्रेणी पहिले सँ मौजूद अछि"
        },
        {
          status: 409
        }
      );

    }


    // --------------------------------------------------------
    // KEEP EXISTING SLUG
    // --------------------------------------------------------

    const slug =
      existing.slug ||
      await createUniqueSlug(
        name,
        env
      );


    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    await env.DB
      .prepare(`
        UPDATE categories
        SET
          name = ?,
          slug = ?,
          description = ?
        WHERE id = ?
      `)
      .bind(
        name,
        slug,
        description || null,
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


    return Response.json(
      {
        success: false,
        error:
          error.message ||
          "श्रेणी अपडेट नहि भ' सकल"
      },
      {
        status: 500
      }
    );

  }

}


// ============================================================
// DELETE CATEGORY
// DELETE /api/categories?id=1
// ============================================================

export async function onRequestDelete(context) {

  const { request, env } = context;

  try {

    // --------------------------------------------------------
    // ADMIN CHECK
    // --------------------------------------------------------

    const user =
      await requireAdmin(
        request,
        env
      );


    if (!user) {

      return Response.json(
        {
          success: false,
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );

    }


    // --------------------------------------------------------
    // GET ID
    // --------------------------------------------------------

    const url =
      new URL(
        request.url
      );


    const id =
      url.searchParams.get(
        "id"
      );


    if (!id) {

      return Response.json(
        {
          success: false,
          error:
            "Category ID जरूरी अछि"
        },
        {
          status: 400
        }
      );

    }


    // --------------------------------------------------------
    // CHECK CATEGORY
    // --------------------------------------------------------

    const existing =
      await env.DB
        .prepare(`
          SELECT
            id,
            name
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();


    if (!existing) {

      return Response.json(
        {
          success: false,
          error:
            "श्रेणी नहि भेटल"
        },
        {
          status: 404
        }
      );

    }


    // --------------------------------------------------------
    // CHECK NEWS USING CATEGORY
    // --------------------------------------------------------

    const used =
      await env.DB
        .prepare(`
          SELECT
            COUNT(*) AS total
          FROM news
          WHERE category_id = ?
        `)
        .bind(id)
        .first();


    const total =
      Number(
        used?.total || 0
      );


    if (total > 0) {

      return Response.json(
        {
          success: false,
          error:
            "ई श्रेणी " +
            total +
            " टा समाचार में उपयोग भ' रहल अछि। पहिले समाचारक श्रेणी बदलू।"
        },
        {
          status: 409
        }
      );

    }


    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

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

      return Response.json(
        {
          success: false,
          error:
            "श्रेणी delete नहि भ' सकल"
        },
        {
          status: 404
        }
      );

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


    return Response.json(
      {
        success: false,
        error:
          error.message ||
          "श्रेणी delete नहि भ' सकल"
      },
      {
        status: 500
      }
    );

  }

}


// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

async function requireAdmin(
  request,
  env
) {

  try {

    // --------------------------------------------------------
    // AUTH SECRET
    // --------------------------------------------------------

    if (!env.AUTH_SECRET) {

      console.error(
        "AUTH_SECRET is missing"
      );

      return null;

    }


    // --------------------------------------------------------
    // COOKIE
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // VERIFY SESSION
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

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
      "ADMIN AUTH ERROR:",
      error
    );

    return null;

  }

}


// ============================================================
// CREATE UNIQUE SLUG
// ============================================================

async function createUniqueSlug(
  name,
  env
) {

  let base =
    slugify(name);


  // ----------------------------------------------------------
  // EMPTY SLUG
  // ----------------------------------------------------------

  if (!base) {

    base =
      "category-" +
      Date.now();

  }


  let slug =
    base;


  let number =
    2;


  // ----------------------------------------------------------
  // CHECK EXISTING SLUG
  // ----------------------------------------------------------

  while (true) {

    const existing =
      await env.DB
        .prepare(`
          SELECT
            id
          FROM categories
          WHERE slug = ?
          LIMIT 1
        `)
        .bind(
          slug
        )
        .first();


    if (!existing) {

      return slug;

    }


    slug =
      `${base}-${number}`;


    number++;

  }

}


// ============================================================
// SLUGIFY
// ============================================================

function slugify(
  value
) {

  return String(
    value || ""
  )
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


// ============================================================
// PARSE COOKIES
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


        cookies[key] =
          value;

      }
    );


  return cookies;

}


// ============================================================
// VERIFY SESSION TOKEN
// ============================================================

async function verifySessionToken(
  token,
  secret
) {

  try {

    const parts =
      String(
        token
      ).split(".");


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
      !timingSafeEqualString(
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
// HMAC SHA-256
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


  return base64urlBytes(
    new Uint8Array(
      signature
    )
  );

}


// ============================================================
// BASE64 URL ENCODE
// ============================================================

function base64urlBytes(
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
      ""
    );

}


// ============================================================
// BASE64 URL DECODE
// ============================================================

function fromBase64url(
  value
) {

  let base64 =
    String(
      value
    )
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
    atob(
      base64
    );


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
      binary.charCodeAt(
        i
      );

  }


  return new TextDecoder()
    .decode(
      bytes
    );

}


// ============================================================
// TIMING SAFE STRING COMPARE
// ============================================================

function timingSafeEqualString(
  a,
  b
) {

  if (
    a.length !==
    b.length
  ) {

    return false;

  }


  let result =
    0;


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
