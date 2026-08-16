// functions/api/tags.js

// ======================================================
// GET TAGS
// ======================================================

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
          status,
          created_at
        FROM tags
        ORDER BY name COLLATE NOCASE ASC, id ASC
      `)
      .all();

    return Response.json({
      success: true,
      tags: result.results || []
    });

  } catch (error) {

    console.error(
      "GET TAGS ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "Tag load नहि भ' सकल"
    }, {
      status: 500
    });

  }

}


// ======================================================
// ADD TAG
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
      }, {
        status: 401
      });

    }


    const body =
      await request.json();


    const name =
      String(
        body.name || ""
      ).trim();


    let slug =
      String(
        body.slug || ""
      ).trim()
      .toLowerCase();


    const description =
      String(
        body.description || ""
      ).trim();


    const status =
      body.status === "inactive"
        ? "inactive"
        : "active";


    if (!name) {

      return Response.json({
        success: false,
        error:
          "Tag name जरूरी अछि"
      }, {
        status: 400
      });

    }


    // Slug खाली होय तँ name सँ बनाउ

    if (!slug) {

      slug =
        slugify(name);

    }


    if (!slug) {

      return Response.json({
        success: false,
        error:
          "English URL slug जरूरी अछि"
      }, {
        status: 400
      });

    }


    if (!isValidSlug(slug)) {

      return Response.json({
        success: false,
        error:
          "Tag URL केवल English अक्षर, number आ hyphen में होयबाक चाही। उदाहरण: darbhanga"
      }, {
        status: 400
      });

    }


    // Duplicate slug

    const existing =
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


    if (existing) {

      return Response.json({
        success: false,
        error:
          "ई Tag URL पहिले सँ मौजूद अछि"
      }, {
        status: 409
      });

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


    return Response.json({
      success: true,
      message:
        "Tag सफलतापूर्वक जोड़ल गेल",
      id:
        result.meta.last_row_id,
      slug:
        slug
    });


  } catch (error) {

    console.error(
      "ADD TAG ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "Tag जोड़ल नहि जा सकल"
    }, {
      status: 500
    });

  }

}


// ======================================================
// UPDATE TAG
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
      }, {
        status: 401
      });

    }


    const url =
      new URL(request.url);


    const id =
      url.searchParams.get("id");


    if (!id) {

      return Response.json({
        success: false,
        error:
          "Tag ID जरूरी अछि"
      }, {
        status: 400
      });

    }


    const body =
      await request.json();


    const name =
      String(
        body.name || ""
      ).trim();


    let slug =
      String(
        body.slug || ""
      ).trim()
      .toLowerCase();


    const description =
      String(
        body.description || ""
      ).trim();


    const status =
      body.status === "inactive"
        ? "inactive"
        : "active";


    if (!name) {

      return Response.json({
        success: false,
        error:
          "Tag name जरूरी अछि"
      }, {
        status: 400
      });

    }


    const oldTag =
      await env.DB
        .prepare(`
          SELECT
            id,
            slug
          FROM tags
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();


    if (!oldTag) {

      return Response.json({
        success: false,
        error:
          "Tag नहि भेटल"
      }, {
        status: 404
      });

    }


    if (!slug) {

      slug =
        oldTag.slug ||
        slugify(name);

    }


    if (!isValidSlug(slug)) {

      return Response.json({
        success: false,
        error:
          "Tag URL सही English format में लिखू"
      }, {
        status: 400
      });

    }


    const duplicate =
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
          id
        )
        .first();


    if (duplicate) {

      return Response.json({
        success: false,
        error:
          "ई Tag URL दोसर Tag में उपयोग भ' रहल अछि"
      }, {
        status: 409
      });

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
        id
      )
      .run();


    return Response.json({
      success: true,
      message:
        "Tag update भ' गेल",
      slug:
        slug
    });


  } catch (error) {

    console.error(
      "UPDATE TAG ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "Tag update नहि भ' सकल"
    }, {
      status: 500
    });

  }

}


// ======================================================
// DELETE TAG
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
      }, {
        status: 401
      });

    }


    const url =
      new URL(request.url);


    const id =
      url.searchParams.get("id");


    if (!id) {

      return Response.json({
        success: false,
        error:
          "Tag ID जरूरी अछि"
      }, {
        status: 400
      });

    }


    // news_tags में इस्तेमाल अछि कि नहि

    const used =
      await env.DB
        .prepare(`
          SELECT
            COUNT(*) AS total
          FROM news_tags
          WHERE tag_id = ?
        `)
        .bind(id)
        .first();


    if (
      Number(
        used?.total || 0
      ) > 0
    ) {

      return Response.json({
        success: false,
        error:
          "ई Tag समाचार में उपयोग भ' रहल अछि। पहिले समाचार सँ Tag हटाउ।"
      }, {
        status: 409
      });

    }


    const result =
      await env.DB
        .prepare(`
          DELETE FROM tags
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
          "Tag नहि भेटल"
      }, {
        status: 404
      });

    }


    return Response.json({
      success: true,
      message:
        "Tag delete भ' गेल"
    });


  } catch (error) {

    console.error(
      "DELETE TAG ERROR:",
      error
    );

    return Response.json({
      success: false,
      error:
        error.message ||
        "Tag delete नहि भ' सकल"
    }, {
      status: 500
    });

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

    if (!env.AUTH_SECRET) {
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
      "TAG AUTH ERROR:",
      error
    );

    return null;

  }

}


// ======================================================
// COOKIE PARSER
// ======================================================

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


// ======================================================
// VERIFY SESSION
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
// SLUGIFY
// ======================================================

function slugify(
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
// VALIDATE SLUG
// ======================================================

function isValidSlug(
  slug
) {

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    slug
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

function fromBase64url(
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
    .decode(bytes);

}


// ======================================================
// TIMING SAFE
// ======================================================

function timingSafeEqual(
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
