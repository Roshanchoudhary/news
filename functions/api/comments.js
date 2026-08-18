// functions/api/comments.js

/*
 * ============================================================
 * COMMENTS API
 *
 * GET  /api/comments?admin=1
 * GET  /api/comments?news_id=123
 * GET  /api/comments?slug=news-slug
 *
 * POST   /api/comments
 * PUT    /api/comments?id=123
 * DELETE /api/comments?id=123
 * ============================================================
 */


// ============================================================
// GET COMMENTS
// ============================================================

export async function onRequestGet(context) {

  const { request, env } = context;

  try {

    const url = new URL(request.url);

    const adminMode =
      url.searchParams.get("admin") === "1";

    const status =
      String(
        url.searchParams.get("status") || ""
      ).trim().toLowerCase();

    const newsIdParam =
      String(
        url.searchParams.get("news_id") || ""
      ).trim();

    const slugParam =
      String(
        url.searchParams.get("slug") ||
        url.searchParams.get("news_slug") ||
        ""
      ).trim();


    // ========================================================
    // ADMIN GET
    // ========================================================

    if (adminMode || (!newsIdParam && !slugParam)) {

      const admin =
        await requireModerator(
          request,
          env
        );

      if (!admin) {

        return json(
          {
            success:false,
            error:"Unauthorized"
          },
          401
        );

      }


      const allowedStatuses = [
        "",
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
            success:false,
            error:"Invalid comment status"
          },
          400
        );

      }


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

          n.id AS actual_news_id,
          n.title AS news_title,
          n.slug AS news_slug,
          n.status AS news_status

        FROM comments c

        LEFT JOIN news n
          ON n.id = c.news_id
      `;


      const params = [];
      const conditions = [];


      /*
       * Optional admin filter by status.
       */

      if (status) {

        conditions.push(
          "c.status = ?"
        );

        params.push(
          status
        );

      }


      /*
       * Optional admin filter by news ID.
       */

      if (newsIdParam) {

        const id =
          Number(
            newsIdParam
          );


        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {

          return json(
            {
              success:false,
              error:"News ID सही नहि अछि"
            },
            400
          );

        }


        conditions.push(
          "c.news_id = ?"
        );

        params.push(id);

      }


      /*
       * Optional admin filter by slug.
       */

      if (slugParam) {

        conditions.push(
          "n.slug = ?"
        );

        params.push(
          slugParam
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


      return json(
        {
          success:true,

          comments:
            result.results || [],

          total:
            (result.results || []).length

        }
      );

    }


    // ========================================================
    // PUBLIC GET
    // ========================================================

    let numericNewsId = null;


    if (newsIdParam) {

      numericNewsId =
        Number(
          newsIdParam
        );


      if (
        !Number.isInteger(
          numericNewsId
        ) ||
        numericNewsId <= 0
      ) {

        return json(
          {
            success:false,
            error:"News ID सही नहि अछि"
          },
          400
        );

      }

    } else {

      if (!slugParam) {

        return json(
          {
            success:false,
            error:"News URL जरूरी अछि"
          },
          400
        );

      }


      const article =
        await env.DB
          .prepare(`
            SELECT
              id
            FROM news
            WHERE slug = ?
            LIMIT 1
          `)
          .bind(
            slugParam
          )
          .first();


      if (!article) {

        return json(
          {
            success:false,
            error:"समाचार नहि भेटल"
          },
          404
        );

      }


      numericNewsId =
        Number(
          article.id
        );

    }


    const result =
      await env.DB
        .prepare(`
          SELECT
            c.id,
            c.news_id,
            c.name,
            c.comment,
            c.created_at

          FROM comments c

          WHERE
            c.news_id = ?
            AND c.status = 'approved'

          ORDER BY
            c.created_at ASC,
            c.id ASC
        `)
        .bind(
          numericNewsId
        )
        .all();


    return json(
      {
        success:true,

        news_id:
          numericNewsId,

        comments:
          result.results || []
      }
    );


  } catch (error) {

    console.error(
      "GET COMMENTS ERROR:",
      error
    );


    return json(
      {
        success:false,
        error:
          error.message ||
          "Comments load नहि भ' सकल"
      },
      500
    );

  }

}


// ============================================================
// CREATE COMMENT
// ============================================================

export async function onRequestPost(context) {

  const {
    request,
    env
  } = context;


  try {

    const body =
      await request.json();


    let newsId =
      Number(
        body.news_id
      );


    const newsSlug =
      String(
        body.news_slug ||
        body.slug ||
        ""
      ).trim();


    const name =
      String(
        body.name ||
        ""
      ).trim();


    const email =
      String(
        body.email ||
        ""
      )
      .trim()
      .toLowerCase();


    const mobile =
      String(
        body.mobile ||
        ""
      ).trim();


    const comment =
      String(
        body.comment ||
        ""
      ).trim();


    // --------------------------------------------------------
    // Resolve slug -> ID
    // --------------------------------------------------------

    if (
      (
        !Number.isInteger(
          newsId
        ) ||
        newsId <= 0
      ) &&
      newsSlug
    ) {

      const article =
        await env.DB
          .prepare(`
            SELECT
              id,
              status
            FROM news
            WHERE slug = ?
            LIMIT 1
          `)
          .bind(
            newsSlug
          )
          .first();


      if (!article) {

        return json(
          {
            success:false,
            error:"समाचार नहि भेटल"
          },
          404
        );

      }


      newsId =
        Number(
          article.id
        );

    }


    if (
      !Number.isInteger(
        newsId
      ) ||
      newsId <= 0
    ) {

      return json(
        {
          success:false,
          error:"News ID अथवा News URL जरूरी अछि"
        },
        400
      );

    }


    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!name) {

      return json(
        {
          success:false,
          error:"नाम जरूरी अछि"
        },
        400
      );

    }


    if (!email) {

      return json(
        {
          success:false,
          error:"ईमेल जरूरी अछि"
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
          success:false,
          error:"ईमेल सही format में लिखू"
        },
        400
      );

    }


    if (!mobile) {

      return json(
        {
          success:false,
          error:"मोबाइल नंबर जरूरी अछि"
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
        .test(
          cleanMobile
        )
    ) {

      return json(
        {
          success:false,
          error:"मोबाइल नंबर सही format में लिखू"
        },
        400
      );

    }


    if (!comment) {

      return json(
        {
          success:false,
          error:"Comment लिखब जरूरी अछि"
        },
        400
      );

    }


    if (
      name.length > 100 ||
      email.length > 150 ||
      cleanMobile.length > 15 ||
      comment.length > 5000
    ) {

      return json(
        {
          success:false,
          error:"Comment अथवा विवरणक लंबाई बहुत पैघ अछि"
        },
        400
      );

    }


    // --------------------------------------------------------
    // News check
    // --------------------------------------------------------

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
          success:false,
          error:"समाचार नहि भेटल"
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
          success:false,
          error:"एहि समाचार पर comment नहि कएल जा सकैत अछि"
        },
        400
      );

    }


    // --------------------------------------------------------
    // Insert pending comment
    // --------------------------------------------------------

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


    return json(
      {
        success:true,

        message:
          "अहाँक comment प्राप्त भ' गेल। Admin approval के बाद ई प्रकाशित होयत।",

        id:
          result.meta.last_row_id
      }
    );


  } catch (error) {

    console.error(
      "CREATE COMMENT ERROR:",
      error
    );


    return json(
      {
        success:false,
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
// ============================================================

export async function onRequestPut(context) {

  const {
    request,
    env
  } = context;


  try {

    const moderator =
      await requireModerator(
        request,
        env
      );


    if (!moderator) {

      return json(
        {
          success:false,
          error:"Unauthorized"
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
          success:false,
          error:"Comment ID जरूरी अछि"
        },
        400
      );

    }


    const body =
      await request.json();


    const status =
      String(
        body.status ||
        ""
      )
      .trim()
      .toLowerCase();


    if (
      ![
        "pending",
        "approved",
        "rejected"
      ].includes(
        status
      )
    ) {

      return json(
        {
          success:false,
          error:"Invalid comment status"
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
          success:false,
          error:"Comment नहि भेटल"
        },
        404
      );

    }


    await env.DB
      .prepare(`
        UPDATE comments
        SET status = ?
        WHERE id = ?
      `)
      .bind(
        status,
        id
      )
      .run();


    return json(
      {
        success:true,
        message:
          "Comment status update भ' गेल"
      }
    );


  } catch (error) {

    console.error(
      "UPDATE COMMENT ERROR:",
      error
    );


    return json(
      {
        success:false,
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
// ============================================================

export async function onRequestDelete(context) {

  const {
    request,
    env
  } = context;


  try {

    const moderator =
      await requireModerator(
        request,
        env
      );


    if (!moderator) {

      return json(
        {
          success:false,
          error:"Unauthorized"
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
          success:false,
          error:"Comment ID जरूरी अछि"
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
          success:false,
          error:"Comment नहि भेटल"
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


    return json(
      {
        success:true,
        message:
          "Comment delete भ' गेल"
      }
    );


  } catch (error) {

    console.error(
      "DELETE COMMENT ERROR:",
      error
    );


    return json(
      {
        success:false,
        error:
          error.message ||
          "Comment delete नहि भ' सकल"
      },
      500
    );

  }

}


// ============================================================
// ADMIN / MODERATOR AUTH
// ============================================================

async function requireModerator(
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
      user.status !== "active"
    ) {
      return null;
    }


    /*
     * Admin + Editor can manage comments.
     * Author cannot approve/reject/delete.
     */

    const role =
      String(
        user.role || ""
      ).toLowerCase();


    if (
      ![
        "admin",
        "editor"
      ].includes(
        role
      )
    ) {
      return null;
    }


    return user;


  } catch (error) {

    console.error(
      "COMMENT AUTH ERROR:",
      error
    );

    return null;

  }

}


// ============================================================
// SESSION VERIFY
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
      Math.floor(
        Date.now() / 1000
      ) >= Number(
        data.exp
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
        name:"HMAC",
        hash:"SHA-256"
      },
      false,
      ["sign"]
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


function fromBase64url(
  value
) {

  let base64 =
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
    .decode(bytes);

}


// ============================================================
// TIMING SAFE COMPARE
// ============================================================

function timingSafeEqual(
  a,
  b
) {

  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
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


// ============================================================
// JSON
// ============================================================

function json(
  data,
  status = 200
) {

  return Response.json(
    data,
    {
      status,
      headers:{
        "Cache-Control":
          "no-store"
      }
    }
  );

}
