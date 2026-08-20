// ======================================================
// functions/api/categories.js
// Category + Sub-category API
// ======================================================


async function ensureHomeOrderColumn(env) {
  try { await env.DB.prepare(`ALTER TABLE categories ADD COLUMN home_order INTEGER DEFAULT 0`).run(); } catch(e) {}
}

export async function onRequest(context) {

  const { request, env } = context;

  try {

    const method =
      request.method.toUpperCase();


    // ==================================================
    // GET
    // ==================================================

    if (method === "GET") {

      return await getCategories(
        request,
        env
      );

    }


    // ==================================================
    // POST
    // ==================================================

    if (method === "POST") {

      return await createCategory(
        request,
        env
      );

    }


    // ==================================================
    // PUT / PATCH
    // ==================================================

    if (
      method === "PUT" ||
      method === "PATCH"
    ) {

      return await updateCategory(
        request,
        env
      );

    }


    // ==================================================
    // DELETE
    // ==================================================

    if (method === "DELETE") {

      return await deleteCategory(
        request,
        env
      );

    }


    return json(
      {
        success: false,
        error: "Method not allowed"
      },
      405
    );


  } catch (error) {

    console.error(
      "CATEGORY API ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error?.message ||
          "श्रेणी API में त्रुटि भेल"
      },
      500
    );

  }

}


// ======================================================
// GET CATEGORIES
// ======================================================

async function getCategories(
  request,
  env
) {
  await ensureHomeOrderColumn(env);

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


  const parentIdParam =
    url.searchParams.get(
      "parent_id"
    );


  // ==================================================
  // SINGLE CATEGORY
  // ==================================================

  if (id || slug) {

    let category = null;


    if (slug) {

      category =
        await env.DB
          .prepare(`
            SELECT *
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
            SELECT *
            FROM categories
            WHERE id = ?
            LIMIT 1
          `)
          .bind(id)
          .first();

    }


    if (!category) {

      return json(
        {
          success: false,
          error:
            "श्रेणी नहि भेटल"
        },
        404
      );

    }


    // ------------------------------------------------
    // Get children
    // ------------------------------------------------

    const children =
      await env.DB
        .prepare(`
          SELECT *
          FROM categories
          WHERE parent_id = ?
          ORDER BY
            COALESCE(menu_order, 0) ASC,
            name COLLATE NOCASE ASC,
            id ASC
        `)
        .bind(category.id)
        .all();


    return json({
      success: true,

      category:
        normalizeCategory(
          category
        ),

      children:
        (
          children.results ||
          []
        ).map(
          normalizeCategory
        )

    });

  }


  // ==================================================
  // CATEGORY LIST
  // ==================================================

  const where = [];

  const bindings = [];


  // ==================================================
  // STATUS
  // ==================================================

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


  // ==================================================
  // MENU
  // ==================================================

  if (
    menu === "1" ||
    menu === "true"
  ) {

    where.push(
      "COALESCE(menu_visible, 1) = 1"
    );

  }


  // ==================================================
  // PARENT FILTER
  //
  // parent_id=root
  //     => केवल Main Categories
  //
  // parent_id=5
  //     => ID 5 की Sub Categories
  //
  // कोई parent_id नहीं
  //     => सभी categories
  // ==================================================

  if (
    parentIdParam !== null &&
    parentIdParam !== ""
  ) {

    if (
      parentIdParam === "root" ||
      parentIdParam === "null" ||
      parentIdParam === "none"
    ) {

      where.push(
        "parent_id IS NULL"
      );

    } else {

      const parentId =
        Number(
          parentIdParam
        );


      if (
        !Number.isInteger(
          parentId
        ) ||
        parentId <= 0
      ) {

        return json(
          {
            success: false,
            error:
              "Invalid parent_id"
          },
          400
        );

      }


      where.push(
        "parent_id = ?"
      );

      bindings.push(
        parentId
      );

    }

  }


  const whereSQL =
    where.length > 0
      ? "WHERE " +
        where.join(" AND ")
      : "";


  const result =
    await env.DB
      .prepare(`
        SELECT *
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
      result.results ||
      []
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
  await ensureHomeOrderColumn(env);

  const user =
    await requireAdmin(
      request,
      env
    );


  if (!user) {

    return json(
      {
        success: false,
        error: "Unauthorized"
      },
      401
    );

  }


  let body;

  try {

    body =
      await request.json();

  } catch {

    return json(
      {
        success: false,
        error:
          "Invalid JSON"
      },
      400
    );

  }


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

  const homeOrder =
    normalizeNumber(
      body.home_order ?? body.homeOrder
    );


  // ==================================================
  // PARENT ID
  // ==================================================

  const parentId =
    parseParentId(
      body.parent_id ??
      body.parentId
    );


  if (
    parentId === "invalid"
  ) {

    return json(
      {
        success: false,
        error:
          "Invalid parent category"
      },
      400
    );

  }


  // ==================================================
  // NAME
  // ==================================================

  if (!name) {

    return json(
      {
        success: false,
        error:
          "श्रेणी नाम जरूरी अछि"
      },
      400
    );

  }


  // ==================================================
  // SLUG
  // ==================================================

  if (!slug) {

    slug =
      makeSlug(
        name
      );

  }


  if (!slug) {

    return json(
      {
        success: false,
        error:
          "English URL slug जरूरी अछि"
      },
      400
    );

  }


  if (
    !validSlug(slug)
  ) {

    return json(
      {
        success: false,
        error:
          "URL slug केवल English अक्षर, number आ hyphen में होयबाक चाही"
      },
      400
    );

  }


  // ==================================================
  // PARENT VALIDATION
  // ==================================================

  if (
    parentId !== null
  ) {

    const parent =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            status
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(parentId)
        .first();


    if (!parent) {

      return json(
        {
          success: false,
          error:
            "मुख्य श्रेणी नहि भेटल"
        },
        400
      );

    }


    if (
      parent.status ===
      "inactive"
    ) {

      return json(
        {
          success: false,
          error:
            "Inactive श्रेणी केँ parent नहि बना सकैत छी"
        },
        400
      );

    }

  }


  // ==================================================
  // DUPLICATE NAME
  // ==================================================

  const existingName =
    await env.DB
      .prepare(`
        SELECT id
        FROM categories
        WHERE LOWER(name) =
              LOWER(?)
        LIMIT 1
      `)
      .bind(name)
      .first();


  if (existingName) {

    return json(
      {
        success: false,
        error:
          "ई श्रेणी पहिले सँ मौजूद अछि"
      },
      409
    );

  }


  // ==================================================
  // DUPLICATE SLUG
  // ==================================================

  const existingSlug =
    await env.DB
      .prepare(`
        SELECT id
        FROM categories
        WHERE slug = ?
        LIMIT 1
      `)
      .bind(slug)
      .first();


  if (existingSlug) {

    return json(
      {
        success: false,
        error:
          "ई English URL slug पहिले सँ मौजूद अछि"
      },
      409
    );

  }


  // ==================================================
  // INSERT
  // ==================================================

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
          home_order,
          parent_id,
          updated_at
        )

        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP
        )
      `)
      .bind(
        name,
        slug,
        description || null,
        status,
        menuVisible,
        menuOrder,
        homeOrder,
        parentId
      )
      .run();


  const newId =
    Number(
      result.meta.last_row_id
    );


  return json({

    success: true,

    message:
      "श्रेणी सफलतापूर्वक जोड़ल गेल",

    category: {

      id: newId,

      name,

      slug,

      description:
        description || null,

      status,

      menu_visible:
        menuVisible,

      menu_order:
        menuOrder,

      home_order:
        homeOrder,

      parent_id:
        parentId,

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
  await ensureHomeOrderColumn(env);

  const user =
    await requireAdmin(
      request,
      env
    );


  if (!user) {

    return json(
      {
        success: false,
        error: "Unauthorized"
      },
      401
    );

  }


  const url =
    new URL(
      request.url
    );


  const queryId =
    url.searchParams.get(
      "id"
    );


  let body;

  try {

    body =
      await request.json();

  } catch {

    return json(
      {
        success: false,
        error:
          "Invalid JSON"
      },
      400
    );

  }


  const categoryId =
    queryId ||
    body.id;


  if (!categoryId) {

    return json(
      {
        success: false,
        error:
          "Category ID जरूरी अछि"
      },
      400
    );

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

    return json(
      {
        success: false,
        error:
          "श्रेणी नहि भेटल"
      },
      404
    );

  }


  // ==================================================
  // BASIC VALUES
  // ==================================================

  const name =
    body.name !== undefined
      ? cleanString(
          body.name
        )
      : oldCategory.name;


  let slug =
    body.slug !== undefined
      ? cleanString(
          body.slug
        ).toLowerCase()
      : oldCategory.slug;


  const description =
    body.description !== undefined
      ? cleanString(
          body.description
        )
      : (
          oldCategory.description ||
          ""
        );


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


  const homeOrder =
    body.home_order !== undefined
      ? normalizeNumber(body.home_order)
      : body.homeOrder !== undefined
        ? normalizeNumber(body.homeOrder)
        : Number(oldCategory.home_order || 0);

  const menuOrder =
    body.menu_order !== undefined
      ? normalizeNumber(
          body.menu_order
        )
      : Number(
          oldCategory.menu_order ||
          0
        );


  // ==================================================
  // PARENT
  // ==================================================

  let parentId;

  if (
    body.parent_id !== undefined
  ) {

    parentId =
      parseParentId(
        body.parent_id
      );

  } else if (
    body.parentId !== undefined
  ) {

    parentId =
      parseParentId(
        body.parentId
      );

  } else {

    parentId =
      oldCategory.parent_id === null ||
      oldCategory.parent_id === undefined
        ? null
        : Number(
            oldCategory.parent_id
          );

  }


  if (
    parentId === "invalid"
  ) {

    return json(
      {
        success: false,
        error:
          "Invalid parent category"
      },
      400
    );

  }


  // ==================================================
  // NAME
  // ==================================================

  if (!name) {

    return json(
      {
        success: false,
        error:
          "श्रेणी नाम जरूरी अछि"
      },
      400
    );

  }


  // ==================================================
  // SLUG
  // ==================================================

  if (!slug) {

    slug =
      makeSlug(
        name
      );

  }


  if (
    !validSlug(slug)
  ) {

    return json(
      {
        success: false,
        error:
          "English URL slug सही नहि अछि"
      },
      400
    );

  }


  // ==================================================
  // SELF PARENT
  // ==================================================

  if (
    parentId !== null &&
    Number(parentId) ===
      Number(categoryId)
  ) {

    return json(
      {
        success: false,
        error:
          "श्रेणी अपने आपक parent नहि भ' सकैत अछि"
      },
      400
    );

  }


  // ==================================================
  // PARENT VALIDATION
  // ==================================================

  if (
    parentId !== null
  ) {

    const parent =
      await env.DB
        .prepare(`
          SELECT
            id,
            status
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(parentId)
        .first();


    if (!parent) {

      return json(
        {
          success: false,
          error:
            "मुख्य श्रेणी नहि भेटल"
        },
        400
      );

    }


    if (
      parent.status ===
      "inactive"
    ) {

      return json(
        {
          success: false,
          error:
            "Inactive श्रेणी केँ parent नहि बना सकैत छी"
        },
        400
      );

    }


    // ----------------------------------------------
    // Circular hierarchy check
    // ----------------------------------------------

    const isCircular =
      await hasDescendant(
        env.DB,
        Number(categoryId),
        Number(parentId)
      );


    if (isCircular) {

      return json(
        {
          success: false,
          error:
            "Circular category hierarchy अनुमत नहि अछि"
        },
        400
      );

    }

  }


  // ==================================================
  // DUPLICATE SLUG
  // ==================================================

  const duplicateSlug =
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
        categoryId
      )
      .first();


  if (duplicateSlug) {

    return json(
      {
        success: false,
        error:
          "ई English URL slug दोसर श्रेणी में उपयोग भ' रहल अछि"
      },
      409
    );

  }


  // ==================================================
  // DUPLICATE NAME
  // ==================================================

  const duplicateName =
    await env.DB
      .prepare(`
        SELECT id
        FROM categories
        WHERE LOWER(name) =
              LOWER(?)
          AND id != ?
        LIMIT 1
      `)
      .bind(
        name,
        categoryId
      )
      .first();


  if (duplicateName) {

    return json(
      {
        success: false,
        error:
          "ई श्रेणी नाम दोसर श्रेणी में मौजूद अछि"
      },
      409
    );

  }


  // ==================================================
  // UPDATE
  // ==================================================

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

      home_order:
        homeOrder,

      parent_id:
        parentId,

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

    return json(
      {
        success: false,
        error: "Unauthorized"
      },
      401
    );

  }


  const url =
    new URL(
      request.url
    );


  const id =
    url.searchParams.get(
      "id"
    );


  if (!id) {

    return json(
      {
        success: false,
        error:
          "Category ID जरूरी अछि"
      },
      400
    );

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

    return json(
      {
        success: false,
        error:
          "श्रेणी नहि भेटल"
      },
      404
    );

  }


  // ==================================================
  // CHECK SUB-CATEGORIES
  // ==================================================

  const children =
    await env.DB
      .prepare(`
        SELECT
          COUNT(*) AS total
        FROM categories
        WHERE parent_id = ?
      `)
      .bind(id)
      .first();


  const childCount =
    Number(
      children?.total || 0
    );


  if (
    childCount > 0
  ) {

    return json(
      {
        success: false,

        error:
          `एहि श्रेणी केर ${childCount} उप-श्रेणी अछि। पहिले उप-श्रेणी हटाउ अथवा दोसर मुख्य श्रेणी में राखू।`
      },
      409
    );

  }


  // ==================================================
  // CHECK NEWS
  // ==================================================

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


  if (
    newsCount > 0
  ) {

    return json(
      {
        success: false,

        error:
          `एहि श्रेणी में ${newsCount} समाचार अछि। पहिले समाचारक श्रेणी बदलू, तकर बाद श्रेणी delete करू।`
      },
      409
    );

  }


  // ==================================================
  // DELETE
  // ==================================================

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
// CHECK DESCENDANT
// ======================================================

async function hasDescendant(
  db,
  categoryId,
  possibleParentId
) {

  let currentId =
    possibleParentId;


  const visited =
    new Set();


  while (
    currentId !== null &&
    currentId !== undefined
  ) {

    if (
      visited.has(
        currentId
      )
    ) {

      return true;

    }


    visited.add(
      currentId
    );


    if (
      currentId ===
      categoryId
    ) {

      return true;

    }


    const row =
      await db
        .prepare(`
          SELECT
            parent_id
          FROM categories
          WHERE id = ?
          LIMIT 1
        `)
        .bind(
          currentId
        )
        .first();


    if (
      !row ||
      row.parent_id === null ||
      row.parent_id === undefined
    ) {

      return false;

    }


    currentId =
      Number(
        row.parent_id
      );

  }


  return false;

}


// ======================================================
// NORMALIZE CATEGORY
// ======================================================

function normalizeCategory(
  category
) {

  const parentId =
    category.parent_id === null ||
    category.parent_id === undefined ||
    category.parent_id === ""
      ? null
      : Number(
          category.parent_id
        );


  return {

    ...category,

    id:
      Number(
        category.id
      ),

    name:
      category.name ||
      "",

    slug:
      category.slug ||
      "",

    description:
      category.description ||
      null,

    status:
      category.status ||
      "active",

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
      parentId,

    parentId:
      parentId,

    is_subcategory:
      parentId !== null,

    url:
      `/category/${category.slug}`

  };

}


// ======================================================
// PARSE PARENT ID
// ======================================================

function parseParentId(
  value
) {

  // Main category

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === "none" ||
    value === "root" ||
    value === 0 ||
    value === "0"
  ) {

    return null;

  }


  const id =
    Number(value);


  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {

    return "invalid";

  }


  return id;

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

      new TextEncoder()
        .encode(
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

      new TextEncoder()
        .encode(
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
// MAKE ENGLISH SLUG
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

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    .test(
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
      value ||
      "active"
    )
      .toLowerCase();


  if (
    status === "inactive"
  ) {

    return "inactive";

  }


  return "active";

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
    !Number.isFinite(
      number
    ) ||
    number < 0
  ) {

    return 0;

  }


  return Math.floor(
    number
  );

}


// ======================================================
// CLEAN STRING
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
