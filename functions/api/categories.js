// functions/api/categories.js

export async function onRequest(context) {

  const { request, env } = context;

  try {

    const method =
      request.method.toUpperCase();


    if (method === "GET") {
      return await getCategories(
        request,
        env
      );
    }


    if (method === "POST") {
      return await createCategory(
        request,
        env
      );
    }


    if (
      method === "PUT" ||
      method === "PATCH"
    ) {
      return await updateCategory(
        request,
        env
      );
    }


    if (method === "DELETE") {
      return await deleteCategory(
        request,
        env
      );
    }


    return json({
      success: false,
      error: "Method not allowed"
    }, 405);


  } catch (error) {

    console.error(
      "CATEGORY API ERROR:",
      error
    );


    return json({
      success: false,
      error:
        error.message ||
        "श्रेणी API में त्रुटि भेल"
    }, 500);

  }

}


// ======================================================
// GET CATEGORIES
// ======================================================

async function getCategories(
  request,
  env
) {

  const url =
    new URL(request.url);


  const id =
    url.searchParams.get("id");


  const slug =
    url.searchParams.get("slug");


  const menu =
    url.searchParams.get("menu");


  const status =
    url.searchParams.get("status");


  // --------------------------------------------------
  // Single category
  // --------------------------------------------------

  if (id || slug) {

    let category;


    if (slug) {

      category =
        await env.DB
          .prepare(`
            SELECT
              *
            FROM categories
            WHERE slug = ?
            LIMIT 1
          `)
          .bind(slug)
          .first();

    } else {

      category =
        await env.DB
          .prepare(`
            SELECT
              *
            FROM categories
            WHERE id = ?
            LIMIT 1
          `)
          .bind(id)
          .first();

    }


    if (!category) {

      return json({
        success: false,
        error:
          "श्रेणी नहि भेटल"
      }, 404);

    }


    return json({
      success: true,
      category: normalizeCategory(
        category
      )
    });

  }


  // --------------------------------------------------
  // Category list
  // --------------------------------------------------

  let where = [];
  let bindings = [];


  if (
    status &&
    status !== "all"
  ) {

    where.push(
      "status = ?"
    );

    bindings.push(
      status
    );

  }


  if (parentId !== null && parentId !== "") {

    where.push("COALESCE(parent_id, 0) = ?");
    bindings.push(Number(parentId));

  }

  if (
    menu === "1" ||
    menu === "true"
  ) {

    where.push(`
      COALESCE(menu_visible, 1) = 1
    `);

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
          *
        FROM categories

        ${whereSQL}

        ORDER BY
          COALESCE(menu_order, 0) ASC,
          name COLLATE NOCASE ASC,
          id ASC
      `)
      .bind(...bindings)
      .all();


  const categories =
    (
      result.results || []
    ).map(
      normalizeCategory
    );


  return json({
    success: true,
    categories
  });

}


// ======================================================
// CREATE CATEGORY
// ======================================================

async function createCategory(
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


  const menuVisible =
    normalizeBoolean(
      body.menu_visible ??
      body.show_in_menu ??
      body.menu
    );


  const menuOrder =
    normalizeNumber(
      body.menu_order
    );

  const parentId =
    body.parent_id
      ? Number(body.parent_id)
      : null;


  if (!name) {

    return json({
      success: false,
      error:
        "श्रेणी नाम जरूरी अछि"
    }, 400);

  }


  // Automatically create English slug
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

  const existingName =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM categories
        WHERE LOWER(name) = LOWER(?)
        LIMIT 1
      `)
      .bind(name)
      .first();


  if (existingName) {

    return json({
      success: false,
      error:
        "ई श्रेणी पहिले सँ मौजूद अछि"
    }, 409);

  }


  // --------------------------------------------------
  // Duplicate slug
  // --------------------------------------------------

  const existingSlug =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM categories
        WHERE slug = ?
        LIMIT 1
      `)
      .bind(slug)
      .first();


  if (existingSlug) {

    return json({
      success: false,
      error:
        "ई English URL slug पहिले सँ मौजूद अछि"
    }, 409);

  }


  // --------------------------------------------------
  // Insert
  // --------------------------------------------------

  const result =
    await env.DB
      .prepare(`
        INSERT INTO categories (
          name,
          slug,
          description,
          status,
          menu_visible,
          menu_order,
          parent_id
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?
        )
      `)
      .bind(
        name,
        slug,
        description || null,
        status,
        menuVisible,
        menuOrder,
        parentId
      )
      .run();


  return json({
    success: true,

    message:
      "श्रेणी सफलतापूर्वक जोड़ल गेल",

    category: {
      id:
        result.meta.last_row_id,

      name,
      slug,
      description:
        description || null,

      status,

      menu_visible:
        menuVisible,

      menu_order:
        menuOrder,

      url:
        `/category/${slug}`
    }

  });

}


// ======================================================
// UPDATE CATEGORY
// ======================================================

async function updateCategory(
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


  const categoryId =
    id ||
    body.id;


  if (!categoryId) {

    return json({
      success: false,
      error:
        "Category ID जरूरी अछि"
    }, 400);

  }


  const oldCategory =
    await env.DB
      .prepare(`
        SELECT *
        FROM categories
        WHERE id = ?
        LIMIT 1
      `)
      .bind(categoryId)
      .first();


  if (!oldCategory) {

    return json({
      success: false,
      error:
        "श्रेणी नहि भेटल"
    }, 404);

  }


  const name =
    body.name !== undefined
      ? cleanString(body.name)
      : oldCategory.name;


  let slug =
    body.slug !== undefined
      ? cleanString(body.slug)
          .toLowerCase()
      : oldCategory.slug;


  const description =
    body.description !== undefined
      ? cleanString(
          body.description
        )
      : oldCategory.description;


  const status =
    body.status !== undefined
      ? normalizeStatus(
          body.status
        )
      : normalizeStatus(
          oldCategory.status
        );


  const menuVisible =
    body.menu_visible !== undefined
      ? normalizeBoolean(
          body.menu_visible
        )
      : body.show_in_menu !== undefined
        ? normalizeBoolean(
            body.show_in_menu
          )
        : Number(
            oldCategory.menu_visible ??
            1
          );


  const menuOrder =
    body.menu_order !== undefined
      ? normalizeNumber(
          body.menu_order
        )
      : Number(
          oldCategory.menu_order ||
          0
        );


  const parentId =
    body.parent_id !== undefined
      ? (body.parent_id ? Number(body.parent_id) : null)
      : (oldCategory.parent_id ? Number(oldCategory.parent_id) : null);


  if (!name) {

    return json({
      success: false,
      error:
        "श्रेणी नाम जरूरी अछि"
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
  // Duplicate slug
  // --------------------------------------------------

  const duplicateSlug =
    await env.DB
      .prepare(`
        SELECT
          id
        FROM categories
        WHERE slug = ?
          AND id != ?
        LIMIT 1
      `)
      .bind(
        slug,
        categoryId
      )
      .first();


  if (duplicateSlug) {

    return json({
      success: false,
      error:
        "ई English URL slug दोसर श्रेणी में उपयोग भ' रहल अछि"
    }, 409);

  }


  // --------------------------------------------------
  // Duplicate name
  // --------------------------------------------------

  const duplicateName =
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
        categoryId
      )
      .first();


  if (duplicateName) {

    return json({
      success: false,
      error:
        "ई श्रेणी नाम दोसर श्रेणी में मौजूद अछि"
    }, 409);

  }


  // --------------------------------------------------
  // Update
  // --------------------------------------------------

  await env.DB
    .prepare(`
      UPDATE categories

      SET
        name = ?,
        slug = ?,
        description = ?,
        status = ?,
        menu_visible = ?,
        menu_order = ?,
        parent_id = ?,
        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = ?
    `)
    .bind(
      name,
      slug,
      description || null,
      status,
      menuVisible,
      menuOrder,
      parentId,
      categoryId
    )
    .run();


  return json({
    success: true,

    message:
      "श्रेणी सफलतापूर्वक update भ' गेल",

    category: {
      id:
        Number(categoryId),

      name,
      slug,

      description:
        description || null,

      status,

      menu_visible:
        menuVisible,

      menu_order:
        menuOrder,

      url:
        `/category/${slug}`
    }

  });

}


// ======================================================
// DELETE CATEGORY
// ======================================================

async function deleteCategory(
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
        "Category ID जरूरी अछि"
    }, 400);

  }


  const category =
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


  if (!category) {

    return json({
      success: false,
      error:
        "श्रेणी नहि भेटल"
    }, 404);

  }


  // --------------------------------------------------
  // Do not delete category if news exists.
  // Instead return a clear error.
  // --------------------------------------------------

  const news =
    await env.DB
      .prepare(`
        SELECT
          COUNT(*) AS total
        FROM news
        WHERE category_id = ?
      `)
      .bind(id)
      .first();


  const newsCount =
    Number(
      news?.total || 0
    );


  if (newsCount > 0) {

    return json({
      success: false,

      error:
        `एहि श्रेणी में ${newsCount} समाचार अछि। पहिले समाचारक श्रेणी बदलू, तकर बाद श्रेणी delete करू।`
    }, 409);

  }


  await env.DB
    .prepare(`
      DELETE FROM categories
      WHERE id = ?
    `)
    .bind(id)
    .run();


  return json({
    success: true,

    message:
      "श्रेणी delete भ' गेल"
  });

}


// ======================================================
// NORMALIZE CATEGORY
// ======================================================

function normalizeCategory(
  category
) {

  return {
    ...category,

    id:
      Number(category.id),

    menu_visible:
      Number(
        category.menu_visible ??
        category.show_in_menu ??
        1
      ),

    menu_order:
      Number(
        category.menu_order ||
        0
      ),

    parent_id:
      category.parent_id
        ? Number(category.parent_id)
        : null,

    status:
      category.status ||
      "active",

    url:
      `/category/${category.slug}`
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
// VERIFY SESSION
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
// COOKIES
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
// BOOLEAN
// ======================================================

function normalizeBoolean(
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return 1;

  }


  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "on" ||
    value === "yes"
  ) {

    return 1;

  }


  return 0;

}


// ======================================================
// NUMBER
// ======================================================

function normalizeNumber(
  value
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number) ||
    number < 0
  ) {

    return 0;

  }


  return Math.floor(
    number
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
// JSON
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
