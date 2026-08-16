// ============================================================
// COMMENTS API
//
// GET    /api/comments
// GET    /api/comments?news_id=123
// GET    /api/comments?status=pending
// POST   /api/comments
// PUT    /api/comments?id=123
// DELETE /api/comments?id=123
//
// PUBLIC:
//   GET  ?news_id=123 -> approved comments only
//   POST -> new comment pending
//
// ADMIN:
//   GET  /api/comments -> all comments
//   GET  /api/comments?status=pending
//   PUT  /api/comments?id=123
//   DELETE /api/comments?id=123
//
// Email + Mobile public response में कभी नहीं भेजे जाएंगे.
// ============================================================


// ============================================================
// GET COMMENTS
// ============================================================

export async function onRequestGet(context) {

  const {
    request,
    env
  } = context;


  try {

    const url =
      new URL(request.url);


    const newsId =
      url.searchParams.get(
        "news_id"
      );


    const status =
      url.searchParams.get(
        "status"
      );


    const adminParam =
      url.searchParams.get(
        "admin"
      );


    // ========================================================
    // ADMIN CHECK
    //
    // अब /api/comments बिना news_id के आने पर
    // पहले Admin session check होयत।
    // ========================================================

    let adminUser = null;


    if (
      !newsId ||
      status ||
      adminParam === "1"
    ) {

      adminUser =
        await requireAdmin(
          request,
          env
        );

    }


    // ========================================================
    // ADMIN GET
    //
    // /api/comments
    // /api/comments?status=pending
    // ========================================================

    if (adminUser) {

      let query = `
        SELECT
          c.id,
          c.news_id,
          c.name,
          c.email,
          c.mobile,
          c.comment,
          c.status,
          c.created_at,
          n.title AS news_title
        FROM comments c
        LEFT JOIN news n
          ON n.id = c.news_id
      `;


      const params = [];

      const conditions = [];


      if (newsId) {

        const numericNewsId =
          Number(newsId);


        if (
          !Number.isInteger(
            numericNewsId
          ) ||
          numericNewsId <= 0
        ) {

          return json(
            {
              success: false,
              error:
                "News ID सही नहि अछि"
            },
            400
          );

        }


        conditions.push(
          "c.news_id = ?"
        );


        params.push(
          numericNewsId
        );

      }


      if (status) {

        const allowedStatuses = [
          "pending",
          "approved",
          "rejected"
        ];


        if (
          !allowedStatuses.includes(
            status
          )
        ) {

          return json(
            {
              success: false,
              error:
                "Invalid comment status"
            },
            400
          );

        }


        conditions.push(
          "c.status = ?"
        );


        params.push(
          status
        );

      }


      if (
        conditions.length
      ) {

        query +=
          " WHERE " +
          conditions.join(
            " AND "
          );

      }


      query += `
        ORDER BY
          c.created_at DESC,
          c.id DESC
      `;


      const result =
        await env.DB
          .prepare(query)
          .bind(...params)
          .all();


      return json({

        success: true,

        comments:
          result.results || []

      });

    }


    // ========================================================
    // PUBLIC GET
    // ========================================================

    /*
     * Public website पर news_id जरूरी अछि।
     *
     * Example:
     *
     * /api/comments?news_id=12
     *
     * केवल approved comments वापस होयत।
     *
     * Email और mobile SELECT में नहीं अछि।
     */


    if (!newsId) {

      return json(
        {
          success: false,
          error:
            "News ID जरूरी अछि"
        },
        400
      );

    }


    const numericNewsId =
      Number(newsId);


    if (
      !Number.isInteger(
        numericNewsId
      ) ||
      numericNewsId <= 0
    ) {

      return json(
        {
          success: false,
          error:
            "News ID सही नहि अछि"
        },
        400
      );

    }


    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            news_id,
            name,
            comment,
            created_at
          FROM comments
          WHERE
            news_id = ?
            AND status = 'approved'
          ORDER BY
            created_at ASC,
            id ASC
        `)
        .bind(
          numericNewsId
        )
        .all();


    return json({

      success: true,

      comments:
        result.results || []

    });


  } catch (error) {

    console.error(
      "GET COMMENTS ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "Comments लोड नहि भ' सकल"
      },
      500
    );

  }

}


// ============================================================
// CREATE COMMENT
// POST /api/comments
// ============================================================

export async function onRequestPost(
  context
) {

  const {
    request,
    env
  } = context;


  try {

    const body =
      await request.json();


    const newsId =
      Number(
        body.news_id
      );


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


    const mobile =
      String(
        body.mobile || ""
      ).trim();


    const comment =
      String(
        body.comment || ""
      ).trim();


    // ========================================================
    // VALIDATION
    // ========================================================

    if (
      !Number.isInteger(
        newsId
      ) ||
      newsId <= 0
    ) {

      return json(
        {
          success: false,
          error:
            "News ID सही नहि अछि"
        },
        400
      );

    }


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
            "ईमेल जरूरी अछि"
        },
        400
      );

    }


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email)
    ) {

      return json(
        {
          success: false,
          error:
            "ईमेल सही format में लिखू"
        },
        400
      );

    }


    if (!mobile) {

      return json(
        {
          success: false,
          error:
            "मोबाइल नंबर जरूरी अछि"
        },
        400
      );

    }


    const cleanMobile =
      mobile.replace(
        /[\s-]/g,
        ""
      );


    if (
      !/^(\+91)?[6-9]\d{9}$/
        .test(cleanMobile)
    ) {

      return json(
        {
          success: false,
          error:
            "मोबाइल नंबर सही format में लिखू"
        },
        400
      );

    }


    if (!comment) {

      return json(
        {
          success: false,
          error:
            "Comment लिखब जरूरी अछि"
        },
        400
      );

    }


    if (
      name.length > 100
    ) {

      return json(
        {
          success: false,
          error:
            "नाम बहुत पैघ अछि"
        },
        400
      );

    }


    if (
      email.length > 150
    ) {

      return json(
        {
          success: false,
          error:
            "ईमेल बहुत पैघ अछि"
        },
        400
      );

    }


    if (
      cleanMobile.length > 15
    ) {

      return json(
        {
          success: false,
          error:
            "मोबाइल नंबर गलत अछि"
        },
        400
      );

    }


    if (
      comment.length > 5000
    ) {

      return json(
        {
          success: false,
          error:
            "Comment 5000 अक्षर सँ कम होबाक चाही"
        },
        400
      );

    }


    // ========================================================
    // NEWS CHECK
    // ========================================================

    const news =
      await env.DB
        .prepare(`
          SELECT
            id,
            status
          FROM news
          WHERE id = ?
          LIMIT 1
        `)
        .bind(
          newsId
        )
        .first();


    if (!news) {

      return json(
        {
          success: false,
          error:
            "समाचार नहि भेटल"
        },
        404
      );

    }


    if (
      news.status !==
      "published"
    ) {

      return json(
        {
          success: false,
          error:
            "एहि समाचार पर comment नहि कएल जा सकैत अछि"
        },
        400
      );

    }


    // ========================================================
    // INSERT
    // ========================================================

    const result =
      await env.DB
        .prepare(`
          INSERT INTO comments (
            news_id,
            name,
            email,
            mobile,
            comment,
            status
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            'pending'
          )
        `)
        .bind(
          newsId,
          name,
          email,
          cleanMobile,
          comment
        )
        .run();


    return json({

      success: true,

      message:
        "अहाँक comment प्राप्त भ' गेल। Admin approval के बाद ई प्रकाशित होयत।",

      id:
        result.meta.last_row_id

    });


  } catch (error) {

    console.error(
      "CREATE COMMENT ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "Comment save नहि भ' सकल"
      },
      500
    );

  }

}


// ============================================================
// UPDATE COMMENT
// PUT /api/comments?id=123
// ============================================================

export async function onRequestPut(
  context
) {

  const {
    request,
    env
  } = context;


  try {

    // ========================================================
    // ADMIN AUTH
    // ========================================================

    const user =
      await requireAdmin(
        request,
        env
      );


    if (!user) {

      return json(
        {
          success: false,
          error:
            "Unauthorized"
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
            "Comment ID जरूरी अछि"
        },
        400
      );

    }


    const body =
      await request.json();


    const status =
      String(
        body.status || ""
      )
        .trim()
        .toLowerCase();


    const allowedStatuses = [
      "pending",
      "approved",
      "rejected"
    ];


    if (
      !allowedStatuses.includes(
        status
      )
    ) {

      return json(
        {
          success: false,
          error:
            "Status केवल pending, approved या rejected होयत"
        },
        400
      );

    }


    const existing =
      await env.DB
        .prepare(`
          SELECT
            id
          FROM comments
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
            "Comment नहि भेटल"
        },
        404
      );

    }


    /*
     * ध्यान:
     *
     * updated_at नहि लिखैत छी।
     *
     * अहाँक current comments table में
     * updated_at column नहि अछि।
     */

    await env.DB
      .prepare(`
        UPDATE comments
        SET
          status = ?
        WHERE id = ?
      `)
      .bind(
        status,
        id
      )
      .run();


    return json({

      success: true,

      message:
        "Comment status update भ' गेल"

    });


  } catch (error) {

    console.error(
      "UPDATE COMMENT ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "Comment update नहि भ' सकल"
      },
      500
    );

  }

}


// ============================================================
// DELETE COMMENT
// DELETE /api/comments?id=123
// ============================================================

export async function onRequestDelete(
  context
) {

  const {
    request,
    env
  } = context;


  try {

    const user =
      await requireAdmin(
        request,
        env
      );


    if (!user) {

      return json(
        {
          success: false,
          error:
            "Unauthorized"
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
            "Comment ID जरूरी अछि"
        },
        400
      );

    }


    const existing =
      await env.DB
        .prepare(`
          SELECT
            id
          FROM comments
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
            "Comment नहि भेटल"
        },
        404
      );

    }


    await env.DB
      .prepare(`
        DELETE FROM comments
        WHERE id = ?
      `)
      .bind(
        id
      )
      .run();


    return json({

      success: true,

      message:
        "Comment delete भ' गेल"

    });


  } catch (error) {

    console.error(
      "DELETE COMMENT ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "Comment delete नहि भ' सकल"
      },
      500
    );

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

    if (
      !env.AUTH_SECRET
    ) {

      console.error(
        "AUTH_SECRET missing"
      );

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
      user.status !==
        "active" ||
      user.role !==
        "admin"
    ) {

      return null;

    }


    return user;


  } catch (error) {

    console.error(
      "COMMENT ADMIN AUTH ERROR:",
      error
    );

    return null;

  }

}


// ============================================================
// JSON RESPONSE
// ============================================================

function json(
  data,
  status = 200
) {

  return Response.json(
    data,
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


// ============================================================
// COOKIE PARSER
// ============================================================

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
      data.exp &&
      Date.now() >
        Number(
          data.exp
        )
    ) {

      return null;

    }


    return data;


  } catch (error) {

    console.error(
      "VERIFY SESSION ERROR:",
      error
    );

    return null;

  }

}


// ============================================================
// HMAC SIGN
// ============================================================

async function sign(
  payload,
  secret
) {

  const key =
    await crypto.subtle.importKey(
      "raw",

      new TextEncoder().encode(
        secret
      ),

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

      new TextEncoder().encode(
        payload
      )
    );


  return base64url(
    new Uint8Array(
      signature
    )
  );

}


// ============================================================
// BASE64URL
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


// ============================================================
// FROM BASE64URL
// ============================================================

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
      (
        4 -
        base64.length % 4
      ) % 4
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


// ============================================================
// TIMING SAFE COMPARE
// ============================================================

function timingSafeEqual(
  a,
  b
) {

  const first =
    String(
      a || ""
    );


  const second =
    String(
      b || ""
    );


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
