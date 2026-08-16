// functions/api/users.js

const PBKDF2_ITERATIONS = 100000;


/* =========================================================
   GET USERS
   GET /api/users
========================================================= */

export async function onRequestGet(context) {

  const {
    request,
    env
  } = context;


  try {

    const admin =
      await requireAdmin(
        request,
        env
      );


    if (!admin) {

      return json(
        {
          success: false,
          error: "Unauthorized"
        },
        401
      );

    }


    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            email,
            role,
            status,
            created_at
          FROM users
          ORDER BY
            id DESC
        `)
        .all();


    return json({

      success: true,

      users:
        result.results || []

    });


  } catch (error) {

    console.error(
      "GET USERS ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "Users load नहि भ' सकल"
      },
      500
    );

  }

}


/* =========================================================
   CREATE USER
   POST /api/users
========================================================= */

export async function onRequestPost(context) {

  const {
    request,
    env
  } = context;


  try {

    const admin =
      await requireAdmin(
        request,
        env
      );


    if (!admin) {

      return json(
        {
          success: false,
          error: "Unauthorized"
        },
        401
      );

    }


    const body =
      await request.json();


    const name =
      String(
        body.name || ""
      ).trim();


    const email =
      String(
        body.email || ""
      )
      .trim()
      .toLowerCase();


    const password =
      String(
        body.password || ""
      );


    const role =
      normalizeRole(
        body.role
      );


    const status =
      normalizeStatus(
        body.status
      );


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */


    if (!name) {

      return json(
        {
          success: false,
          error:
            "नाम जरूरी अछि"
        },
        400
      );

    }


    if (!email) {

      return json(
        {
          success: false,
          error:
            "Email जरूरी अछि"
        },
        400
      );

    }


    if (
      !isValidEmail(
        email
      )
    ) {

      return json(
        {
          success: false,
          error:
            "Email सही नहि अछि"
        },
        400
      );

    }


    if (!password) {

      return json(
        {
          success: false,
          error:
            "Password जरूरी अछि"
        },
        400
      );

    }


    if (
      password.length < 8
    ) {

      return json(
        {
          success: false,
          error:
            "Password कम-से-कम 8 characters केर हो"
        },
        400
      );

    }


    if (!role) {

      return json(
        {
          success: false,
          error:
            "Invalid role"
        },
        400
      );

    }


    if (!status) {

      return json(
        {
          success: false,
          error:
            "Invalid status"
        },
        400
      );

    }


    /* -----------------------------------------------------
       EMAIL DUPLICATE CHECK
    ----------------------------------------------------- */

    const existing =
      await env.DB
        .prepare(`
          SELECT
            id
          FROM users
          WHERE email = ?
          LIMIT 1
        `)
        .bind(
          email
        )
        .first();


    if (existing) {

      return json(
        {
          success: false,
          error:
            "ई Email सँ user पहिने सँ मौजूद अछि"
        },
        409
      );

    }


    /* -----------------------------------------------------
       PASSWORD HASH
    ----------------------------------------------------- */

    const passwordHash =
      await hashPassword(
        password
      );


    /* -----------------------------------------------------
       INSERT
    ----------------------------------------------------- */

    const result =
      await env.DB
        .prepare(`
          INSERT INTO users (
            name,
            email,
            password_hash,
            role,
            status
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `)
        .bind(
          name,
          email,
          passwordHash,
          role,
          status
        )
        .run();


    return json({

      success: true,

      message:
        "User सफलतापूर्वक बनि गेल",

      user: {

        id:
          result.meta.last_row_id,

        name,

        email,

        role,

        status

      }

    });


  } catch (error) {

    console.error(
      "CREATE USER ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "User create नहि भ' सकल"
      },
      500
    );

  }

}


/* =========================================================
   UPDATE USER
   PUT /api/users?id=123
========================================================= */

export async function onRequestPut(context) {

  const {
    request,
    env
  } = context;


  try {

    const admin =
      await requireAdmin(
        request,
        env
      );


    if (!admin) {

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
      Number(
        url.searchParams.get(
          "id"
        )
      );


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      return json(
        {
          success: false,
          error:
            "User ID सही नहि अछि"
        },
        400
      );

    }


    const body =
      await request.json();


    /* -----------------------------------------------------
       EXISTING USER
    ----------------------------------------------------- */

    const existing =
      await env.DB
        .prepare(`
          SELECT
            id,
            name,
            email,
            password_hash,
            role,
            status
          FROM users
          WHERE id = ?
          LIMIT 1
        `)
        .bind(
          id
        )
        .first();


    if (!existing) {

      return json(
        {
          success: false,
          error:
            "User नहि भेटल"
        },
        404
      );

    }


    const name =
      String(
        body.name ??
        existing.name ??
        ""
      ).trim();


    const email =
      String(
        body.email ??
        existing.email ??
        ""
      )
      .trim()
      .toLowerCase();


    const role =
      normalizeRole(
        body.role ??
        existing.role
      );


    const status =
      normalizeStatus(
        body.status ??
        existing.status
      );


    const password =
      String(
        body.password || ""
      );


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (!name) {

      return json(
        {
          success: false,
          error:
            "नाम जरूरी अछि"
        },
        400
      );

    }


    if (
      !isValidEmail(
        email
      )
    ) {

      return json(
        {
          success: false,
          error:
            "Email सही नहि अछि"
        },
        400
      );

    }


    if (!role) {

      return json(
        {
          success: false,
          error:
            "Invalid role"
        },
        400
      );

    }


    if (!status) {

      return json(
        {
          success: false,
          error:
            "Invalid status"
        },
        400
      );

    }


    if (
      password &&
      password.length < 8
    ) {

      return json(
        {
          success: false,
          error:
            "Password कम-से-कम 8 characters केर हो"
        },
        400
      );

    }


    /* -----------------------------------------------------
       DUPLICATE EMAIL
    ----------------------------------------------------- */

    const duplicate =
      await env.DB
        .prepare(`
          SELECT
            id
          FROM users
          WHERE
            email = ?
            AND id != ?
          LIMIT 1
        `)
        .bind(
          email,
          id
        )
        .first();


    if (duplicate) {

      return json(
        {
          success: false,
          error:
            "ई Email दोसर user उपयोग करैत अछि"
        },
        409
      );

    }


    /* -----------------------------------------------------
       LAST ADMIN PROTECTION
    ----------------------------------------------------- */

    if (
      existing.role === "admin" &&
      (
        role !== "admin" ||
        status !== "active"
      )
    ) {

      const adminCount =
        await env.DB
          .prepare(`
            SELECT
              COUNT(*) AS total
            FROM users
            WHERE
              role = 'admin'
              AND status = 'active'
          `)
          .first();


      if (
        Number(
          adminCount?.total || 0
        ) <= 1
      ) {

        return json(
          {
            success: false,
            error:
              "अंतिम active Admin के role/status नहि बदलि सकैत छी"
          },
          400
        );

      }

    }


    /* -----------------------------------------------------
       PASSWORD UPDATE
    ----------------------------------------------------- */

    let passwordHash =
      existing.password_hash;


    if (password) {

      passwordHash =
        await hashPassword(
          password
        );

    }


    /* -----------------------------------------------------
       UPDATE
    ----------------------------------------------------- */

    await env.DB
      .prepare(`
        UPDATE users
        SET
          name = ?,
          email = ?,
          password_hash = ?,
          role = ?,
          status = ?
        WHERE id = ?
      `)
      .bind(
        name,
        email,
        passwordHash,
        role,
        status,
        id
      )
      .run();


    return json({

      success: true,

      message:
        "User update भ' गेल",

      user: {

        id,

        name,

        email,

        role,

        status

      }

    });


  } catch (error) {

    console.error(
      "UPDATE USER ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "User update नहि भ' सकल"
      },
      500
    );

  }

}


/* =========================================================
   DELETE USER
   DELETE /api/users?id=123
========================================================= */

export async function onRequestDelete(context) {

  const {
    request,
    env
  } = context;


  try {

    const admin =
      await requireAdmin(
        request,
        env
      );


    if (!admin) {

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
      Number(
        url.searchParams.get(
          "id"
        )
      );


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      return json(
        {
          success: false,
          error:
            "User ID सही नहि अछि"
        },
        400
      );

    }


    /* -----------------------------------------------------
       SELF DELETE रोकू
    ----------------------------------------------------- */

    if (
      Number(admin.id) === id
    ) {

      return json(
        {
          success: false,
          error:
            "अपनहि account delete नहि क' सकैत छी"
        },
        400
      );

    }


    const existing =
      await env.DB
        .prepare(`
          SELECT
            id,
            role,
            status
          FROM users
          WHERE id = ?
          LIMIT 1
        `)
        .bind(
          id
        )
        .first();


    if (!existing) {

      return json(
        {
          success: false,
          error:
            "User नहि भेटल"
        },
        404
      );

    }


    /* -----------------------------------------------------
       LAST ADMIN PROTECTION
    ----------------------------------------------------- */

    if (
      existing.role === "admin" &&
      existing.status === "active"
    ) {

      const adminCount =
        await env.DB
          .prepare(`
            SELECT
              COUNT(*) AS total
            FROM users
            WHERE
              role = 'admin'
              AND status = 'active'
          `)
          .first();


      if (
        Number(
          adminCount?.total || 0
        ) <= 1
      ) {

        return json(
          {
            success: false,
            error:
              "अंतिम active Admin के delete नहि क' सकैत छी"
          },
          400
        );

      }

    }


    await env.DB
      .prepare(`
        DELETE FROM users
        WHERE id = ?
      `)
      .bind(
        id
      )
      .run();


    return json({

      success: true,

      message:
        "User delete भ' गेल"

    });


  } catch (error) {

    console.error(
      "DELETE USER ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "User delete नहि भ' सकल"
      },
      500
    );

  }

}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

async function requireAdmin(
  request,
  env
) {

  try {

    if (
      !env.AUTH_SECRET
    ) {

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
      "USERS AUTH ERROR:",
      error
    );

    return null;

  }

}


/* =========================================================
   PASSWORD HASH
========================================================= */

async function hashPassword(
  password
) {

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );


  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder()
        .encode(password),
      "PBKDF2",
      false,
      [
        "deriveBits"
      ]
    );


  const bits =
    await crypto.subtle.deriveBits(
      {
        name:
          "PBKDF2",

        salt,

        iterations:
          PBKDF2_ITERATIONS,

        hash:
          "SHA-256"
      },
      key,
      256
    );


  return [
    "pbkdf2",
    PBKDF2_ITERATIONS,
    toHex(salt),
    toHex(
      new Uint8Array(
        bits
      )
    )
  ].join("$");

}


/* =========================================================
   SESSION VERIFY
========================================================= */

async function verifySessionToken(
  token,
  secret
) {

  try {

    const parts =
      String(
        token || ""
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
      !timingSafeStringEqual(
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
      data.exp &&
      Math.floor(
        Date.now() / 1000
      ) >= Number(data.exp)
    ) {

      return null;

    }


    return data;


  } catch {

    return null;

  }

}


/* =========================================================
   HMAC SIGN
========================================================= */

async function sign(
  payload,
  secret
) {

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder()
        .encode(secret),
      {
        name:
          "HMAC",

        hash:
          "SHA-256"
      },
      false,
      [
        "sign"
      ]
    );


  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder()
        .encode(payload)
    );


  return base64url(
    new Uint8Array(
      signature
    )
  );

}


/* =========================================================
   COOKIE
========================================================= */

function parseCookies(
  cookieString
) {

  const cookies = {};


  String(
    cookieString || ""
  )
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


/* =========================================================
   ROLE
========================================================= */

function normalizeRole(
  value
) {

  const role =
    String(
      value || ""
    )
    .trim()
    .toLowerCase();


  const allowed = [
    "admin",
    "editor",
    "author"
  ];


  return allowed.includes(
    role
  )
    ? role
    : null;

}


/* =========================================================
   STATUS
========================================================= */

function normalizeStatus(
  value
) {

  const status =
    String(
      value || ""
    )
    .trim()
    .toLowerCase();


  const allowed = [
    "active",
    "inactive"
  ];


  return allowed.includes(
    status
  )
    ? status
    : null;

}


/* =========================================================
   EMAIL
========================================================= */

function isValidEmail(
  email
) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


/* =========================================================
   HEX
========================================================= */

function toHex(
  bytes
) {

  return Array.from(
    bytes
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


/* =========================================================
   BASE64URL
========================================================= */

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
      /=+$/,
      ""
    );

}


/* =========================================================
   BASE64URL DECODE
========================================================= */

function fromBase64url(
  value
) {

  const base64 =
    String(
      value || ""
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );


  const padded =
    base64 +
    "=".repeat(
      (4 -
        base64.length % 4) %
        4
    );


  const binary =
    atob(
      padded
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


/* =========================================================
   TIMING SAFE STRING
========================================================= */

function timingSafeStringEqual(
  a,
  b
) {

  const first =
    String(a || "");


  const second =
    String(b || "");


  if (
    first.length !==
    second.length
  ) {

    return false;

  }


  let result = 0;


  for (
    let i = 0;
    i < first.length;
    i++
  ) {

    result |=
      first.charCodeAt(i) ^
      second.charCodeAt(i);

  }


  return result === 0;

}


/* =========================================================
   JSON RESPONSE
========================================================= */

function json(
  data,
  status = 200
) {

  return Response.json(
    data,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store"
      }
    }
  );

}
