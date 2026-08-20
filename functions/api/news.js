// functions/api/news.js

// ============================================================
// NEWS API
//
// GET    /api/news
// GET    /api/news?id=123
// GET    /api/news?slug=english-news-slug
// GET    /api/news?status=published
// GET    /api/news?category_slug=west-bengal
// GET    /api/news?tag_slug=maithili
//
// POST   /api/news
// PUT    /api/news?id=123
// DELETE /api/news?id=123
//
// Features:
// - English SEO slug
// - Category filtering
// - Tag filtering
// - Search
// - Pagination
// - News <-> Tags relation
// - Admin authentication
// - View counter
// ============================================================


// ============================================================
// MULTI-CATEGORY RELATION
// ============================================================

async function ensureNewsCategoriesTable(env) {

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS news_categories (
      news_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (news_id, category_id)
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_news_categories_news_id
    ON news_categories(news_id)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_news_categories_category_id
    ON news_categories(category_id)
  `).run();
}


async function getNewsCategoryIds(env, newsId) {

  try {
    await ensureNewsCategoriesTable(env);

    const result = await env.DB.prepare(`
      SELECT category_id
      FROM news_categories
      WHERE news_id = ?
      ORDER BY category_id
    `).bind(newsId).all();

    return (result.results || [])
      .map(row => Number(row.category_id))
      .filter(Boolean);

  } catch (error) {
    console.error("GET NEWS CATEGORY IDS ERROR:", error);
    return [];
  }
}


async function syncNewsCategories(env, newsId, categoryIds, fallbackCategoryId = null) {

  await ensureNewsCategoriesTable(env);

  let ids = Array.isArray(categoryIds)
    ? categoryIds.map(Number).filter(Boolean)
    : [];

  if(!ids.length && fallbackCategoryId){
    ids = [Number(fallbackCategoryId)].filter(Boolean);
  }

  ids = [...new Set(ids)];

  if(ids.length){
    const placeholders = ids.map(() => "?").join(",");
    const valid = await env.DB.prepare(`
      SELECT id
      FROM categories
      WHERE id IN (${placeholders})
    `).bind(...ids).all();

    const validIds = new Set(
      (valid.results || []).map(row => Number(row.id))
    );

    ids = ids.filter(id => validIds.has(id));
  }

  await env.DB.prepare(`
    DELETE FROM news_categories
    WHERE news_id = ?
  `).bind(newsId).run();

  for(const categoryId of ids){
    await env.DB.prepare(`
      INSERT OR IGNORE INTO news_categories
        (news_id, category_id)
      VALUES (?, ?)
    `).bind(newsId, categoryId).run();
  }

  return ids;
}


// ============================================================
// GET NEWS
// ============================================================

export async function onRequestGet(context) {

  const { request, env } = context;

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

  const categorySlug =
    url.searchParams.get("category_slug");

  const tagSlug =
    url.searchParams.get("tag_slug") ||
    url.searchParams.get("tag");

  const search =
    url.searchParams.get("search") ||
    url.searchParams.get("q");

  const page =
    Math.max(
      1,
      Number(
        url.searchParams.get("page") || 1
      )
    );

  const limit =
    clampInt(
      url.searchParams.get("limit"),
      1,
      100,
      20
    );

  const offset =
    (page - 1) * limit;


  try {

    // ========================================================
    // SINGLE NEWS
    // ========================================================

    if (id || slug) {

      let news;


      // ------------------------------------------------------
      // BY SLUG
      // ------------------------------------------------------

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

      }


      // ------------------------------------------------------
      // BY ID
      // ------------------------------------------------------

      else {

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


      // ------------------------------------------------------
      // NOT FOUND
      // ------------------------------------------------------

      if (!news) {

        return json(
          {
            success: false,
            error: "समाचार नहि भेटल"
          },
          404
        );

      }


      // ------------------------------------------------------
      // PUBLIC ACCESS
      // Draft आदि केवल admin देख सकत
      // ------------------------------------------------------

      if (
        news.status !== "published"
      ) {

        const viewer = await getAuthenticatedUser(request, env);
        const allowed = viewer && viewer.status === "active" &&
          (viewer.role === "admin" || viewer.role === "editor" ||
           (viewer.role === "author" && Number(viewer.id) === Number(news.author_id)));

        if (!allowed) {
          return json({ success:false, error:"समाचार उपलब्ध नहि अछि" }, 404);
        }

      }


      // ------------------------------------------------------
      // VIEW COUNT
      // ------------------------------------------------------

      if (
        news.status === "published"
      ) {

        await env.DB
          .prepare(`
            UPDATE news

            SET
              views =
                COALESCE(views, 0) + 1

            WHERE id = ?
          `)
          .bind(news.id)
          .run();


        news.views =
          Number(
            news.views || 0
          ) + 1;

      }


      // ------------------------------------------------------
      // TAGS
      // ------------------------------------------------------

      news.tags =
        await getNewsTags(
          env,
          news.id
        );

      news.category_ids =
        await getNewsCategoryIds(
          env,
          news.id
        );

      if(!news.category_ids.length && news.category_id){
        news.category_ids = [Number(news.category_id)];
      }

      news.ads_enabled = await getNewsAdsEnabled(env, news.id);


      return json({
        success: true,
        news
      });

    }


    // ========================================================
    // NEWS LIST
    // ========================================================

    const viewer = await getAuthenticatedUser(request, env);
    const isStaff = !!(viewer && viewer.status === "active" && ["admin","editor","author"].includes(viewer.role));
    await ensureNewsCategoriesTable(env);
    const conditions = [];
    const params = [];

    // Public list = published only. Staff can see drafts. Author sees own news.
    if(!isStaff && (!status || status === "all")) {
      conditions.push("n.status = ?");
      params.push("published");
    }

    if(status && status !== "published" && !isStaff){
      return json({success:false,error:"Unauthorized"},401);
    }

    if(isStaff && viewer.role === "author") {
      conditions.push("n.author_id = ?");
      params.push(Number(viewer.id));
    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (
      status &&
      status !== "all"
    ) {

      conditions.push(
        "n.status = ?"
      );

      params.push(
        status
      );

    }


    // --------------------------------------------------------
    // CATEGORY ID
    // --------------------------------------------------------

    if (categoryId) {

      conditions.push(`
        EXISTS (
          SELECT 1 FROM news_categories nc_filter
          WHERE nc_filter.news_id = n.id
            AND nc_filter.category_id = ?
        )
      `);

      params.push(
        Number(categoryId)
      );

    }


    // --------------------------------------------------------
    // CATEGORY SLUG
    // --------------------------------------------------------

    if (categorySlug) {

      conditions.push(
        `
        EXISTS (
          SELECT 1
          FROM news_categories nc_filter
          INNER JOIN categories c_filter
            ON c_filter.id = nc_filter.category_id
          WHERE nc_filter.news_id = n.id
            AND c_filter.slug = ?
        )
        `
      );

      params.push(
        categorySlug
      );

    }


    // --------------------------------------------------------
    // TAG SLUG
    // --------------------------------------------------------

    if (tagSlug) {

      conditions.push(
        `
        EXISTS (

          SELECT 1

          FROM news_tags nt_filter

          INNER JOIN tags t_filter
            ON t_filter.id =
               nt_filter.tag_id

          WHERE
            nt_filter.news_id =
              n.id

            AND
            t_filter.slug = ?

            AND
            t_filter.status =
              'active'

        )
        `
      );

      params.push(
        tagSlug
      );

    }


    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search) {

      const keyword =
        `%${String(
          search
        ).trim()}%`;


      conditions.push(
        `
        (
          n.title LIKE ?

          OR n.summary LIKE ?

          OR n.content LIKE ?

          OR n.slug LIKE ?
        )
        `
      );


      params.push(
        keyword,
        keyword,
        keyword,
        keyword
      );

    }


    // --------------------------------------------------------
    // BASE QUERY
    // --------------------------------------------------------

    let query = `

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

    `;


    // --------------------------------------------------------
    // WHERE
    // --------------------------------------------------------

    if (
      conditions.length
    ) {

      query +=
        " WHERE " +
        conditions.join(
          " AND "
        );

    }


    // --------------------------------------------------------
    // ORDER
    // --------------------------------------------------------

    query += `

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


    params.push(
      limit,
      offset
    );


    // --------------------------------------------------------
    // EXECUTE
    // --------------------------------------------------------

    const result =
      await env.DB
        .prepare(query)
        .bind(...params)
        .all();


    const news =
      result.results || [];


    // --------------------------------------------------------
    // TAGS
    // --------------------------------------------------------

    await attachTags(
      env,
      news
    );

    for(const item of news){
      item.category_ids = await getNewsCategoryIds(env, item.id);
      if(!item.category_ids.length && item.category_id){
        item.category_ids = [Number(item.category_id)];
      }
    }


    // --------------------------------------------------------
    // TOTAL COUNT
    // --------------------------------------------------------

    let countQuery = `

      SELECT
        COUNT(*) AS total

      FROM news n

      LEFT JOIN categories c
        ON c.id = n.category_id

    `;


    const countParams = [];


    if (
      conditions.length
    ) {

      countQuery +=
        " WHERE " +
        conditions.join(
          " AND "
        );


      /*
       * conditions में जो ? हैं,
       * वही values count query में चाहिए।
       *
       * LIMIT/OFFSET इसमें शामिल नहि अछि।
       */

      const conditionCount =
        params.length - 2;


      for (
        let i = 0;
        i < conditionCount;
        i++
      ) {

        countParams.push(
          params[i]
        );

      }

    }


    const countResult =
      await env.DB
        .prepare(countQuery)
        .bind(...countParams)
        .first();


    const total =
      Number(
        countResult?.total || 0
      );


    const pages =
      Math.max(
        1,
        Math.ceil(
          total / limit
        )
      );


    return json({

      success: true,

      news,

      pagination: {

        page,

        limit,

        offset,

        total,

        pages,

        count:
          news.length

      }

    });


  } catch (
    error
  ) {

    console.error(
      "GET NEWS ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "समाचार लोड नहि भ' सकल"
      },
      500
    );

  }

}



// ============================================================
// BULK NEWS IMPORT
// ============================================================

async function bulkSaveNews(context, user) {

  const { request, env } = context;

  try {

    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!rows.length) {
      return json({
        success: false,
        error: "CSV में कोनो news row नहि भेटल"
      }, 400);
    }

    if (rows.length > 500) {
      return json({
        success: false,
        error: "एक बेर में अधिकतम 500 news upload करू"
      }, 400);
    }

    // --------------------------------------------------------
    // CATEGORY MAP
    // CSV में category name, slug अथवा numeric id देल जा सकैत अछि।
    // --------------------------------------------------------

    const categoryResult = await env.DB.prepare(`
      SELECT id, name, slug
      FROM categories
    `).all();

    const categoryMap = new Map();

    for (const category of (categoryResult.results || [])) {

      categoryMap.set(
        String(category.id).trim().toLowerCase(),
        Number(category.id)
      );

      categoryMap.set(
        String(category.name || '').trim().toLowerCase(),
        Number(category.id)
      );

      categoryMap.set(
        String(category.slug || '').trim().toLowerCase(),
        Number(category.id)
      );

    }


    const errors = [];
    const prepared = [];
    const uploadSlugs = new Set();


    // --------------------------------------------------------
    // VALIDATE EACH ROW
    // --------------------------------------------------------

    for (let index = 0; index < rows.length; index++) {

      const row = rows[index] || {};
      const rowNumber = Number(row._row) || (index + 2);

      const title = String(row.title || '').trim();
      const content = String(row.content || '').trim();

      if (!title || !content) {
        errors.push({
          row: rowNumber,
          error: "title आ content जरूरी अछि"
        });
        continue;
      }


      // ------------------------------------------------------
      // SLUG
      // ------------------------------------------------------

      let slug = String(row.slug || '').trim().toLowerCase();

      if (!slug) {
        slug = slugify(title);
      }

      if (!slug || !isValidSlug(slug)) {
        errors.push({
          row: rowNumber,
          error: "slug केवल English अक्षर, number आ hyphen में होयबाक चाही"
        });
        continue;
      }


      // Same upload में duplicate slug होय त suffix जोड़ू।
      const originalSlug = slug;
      let suffix = 2;

      while (uploadSlugs.has(slug)) {
        slug = `${originalSlug}-${suffix++}`;
      }

      uploadSlugs.add(slug);


      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      let status = String(row.status || 'draft').trim().toLowerCase();

      if (status !== 'published' && status !== 'draft') {
        errors.push({
          row: rowNumber,
          error: "status केवल published अथवा draft होयबाक चाही"
        });
        continue;
      }

      // Existing system में author publish नहि कऽ सकैत छथि।
      if (user.role === 'author' && status === 'published') {
        status = 'draft';
      }


      // ------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------

      const categoryValue = String(
        row.category || row.category_slug || row.category_id || ''
      ).trim().toLowerCase();

      let categoryId = null;

      if (categoryValue) {

        categoryId = categoryMap.get(categoryValue) || null;

        if (!categoryId) {
          errors.push({
            row: rowNumber,
            error: `Category नहि भेटल: ${row.category}`
          });
          continue;
        }

      }


      // ------------------------------------------------------
      // FEATURED
      // ------------------------------------------------------

      const featuredValue = String(row.featured || '')
        .trim()
        .toLowerCase();

      const featured = [
        '1', 'true', 'yes', 'y', 'on', 'हाँ', 'हां'
      ].includes(featuredValue) ? 1 : 0;


      prepared.push({
        row: rowNumber,
        title,
        slug,
        summary: String(row.summary || '').trim(),
        content,
        imageUrl: String(row.image_url || row.image || '').trim(),
        categoryId,
        status,
        featured,
        seoTitle: String(row.seo_title || '').trim(),
        seoDescription: String(row.seo_description || '').trim()
      });

    }


    // --------------------------------------------------------
    // CHECK EXISTING SLUGS
    // --------------------------------------------------------

    for (let index = prepared.length - 1; index >= 0; index--) {

      const item = prepared[index];

      const existing = await env.DB.prepare(`
        SELECT id
        FROM news
        WHERE slug = ?
        LIMIT 1
      `).bind(item.slug).first();

      if (existing) {
        errors.push({
          row: item.row,
          error: `ई News URL पहिले सँ मौजूद अछि: ${item.slug}`
        });
        prepared.splice(index, 1);
      }

    }


    // --------------------------------------------------------
    // INSERT ONE BY ONE
    // एक row fail भेल त बाकी news upload होयत।
    // --------------------------------------------------------

    let imported = 0;

    for (const item of prepared) {

      try {

        const publishedAt = item.status === 'published'
          ? new Date().toISOString()
          : null;

        const result = await env.DB.prepare(`
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `).bind(
          item.title,
          item.slug,
          item.summary || null,
          item.content,
          item.imageUrl || null,
          item.categoryId,
          user.id,
          item.status,
          item.featured,
          item.seoTitle || null,
          item.seoDescription || null,
          publishedAt
        ).run();


        const newsId = result.meta.last_row_id;

        await syncNewsCategories(
          env,
          newsId,
          item.categoryId ? [item.categoryId] : [],
          item.categoryId
        );

        // Bulk upload में ads default रूप सँ disabled रहत।
        await setNewsAdsEnabled(env, newsId, false);

        imported++;

      } catch (error) {

        errors.push({
          row: item.row,
          error: error.message || 'Database error'
        });

      }

    }


    return json({
      success: true,
      total: rows.length,
      imported,
      failed: errors.length,
      errors
    });

  } catch (error) {

    console.error('BULK NEWS IMPORT ERROR:', error);

    return json({
      success: false,
      error: error.message || 'Bulk news upload failed'
    }, 500);

  }

}


// ============================================================
// CREATE NEWS
// ============================================================

export async function onRequestPost(
  context
) {

  const {
    request,
    env
  } = context;


  try {

    const user =
      await requireStaff(
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


    // Bulk CSV import
    if (new URL(request.url).searchParams.get("bulk") === "1") {
      return await bulkSaveNews(context, user);
    }


    const body =
      await request.json();


    const title =
      String(
        body.title || ""
      ).trim();


    const content =
      String(
        body.content || ""
      ).trim();


    const summary =
      String(
        body.summary || ""
      ).trim();


    const image_url =
      String(
        body.image_url || ""
      ).trim();


    const seo_title =
      String(
        body.seo_title || ""
      ).trim();


    const seo_description =
      String(
        body.seo_description || ""
      ).trim();


    const category_id =
      body.category_id
        ? Number(body.category_id)
        : null;

    const category_ids =
      Array.isArray(body.category_ids)
        ? [...new Set(body.category_ids.map(Number).filter(Boolean))]
        : (category_id ? [category_id] : []);


    const status =
      body.status ===
      "published"
        ? "published"
        : "draft";

    if(user.role === "author" && status === "published") {
      return json({success:false,error:"Author केवल Draft save कऽ सकैत छथि। Editor/Admin publish कऽ सकैत छथि।"},403);
    }

    if(user.role === "author" && status === "published") {
      return json({success:false,error:"Author केवल Draft save कऽ सकैत छथि। Editor/Admin publish कऽ सकैत छथि।"},403);
    }


    const featured =
      body.featured
        ? 1
        : 0;


    if (
      !title ||
      !content
    ) {

      return json(
        {
          success: false,
          error:
            "शीर्षक आ समाचार जरूरी अछि"
        },
        400
      );

    }


    // --------------------------------------------------------
    // SLUG
    // --------------------------------------------------------

    let slug =
      String(
        body.slug || ""
      )
        .trim()
        .toLowerCase();


    if (!slug) {

      slug =
        slugify(
          title
        );

    }


    if (!slug) {

      return json(
        {
          success: false,
          error:
            "News URL slug जरूरी अछि"
        },
        400
      );

    }


    if (
      !isValidSlug(
        slug
      )
    ) {

      return json(
        {
          success: false,
          error:
            "News URL केवल English अक्षर, number आ hyphen में होयबाक चाही"
        },
        400
      );

    }


    // --------------------------------------------------------
    // DUPLICATE SLUG
    // --------------------------------------------------------

    const duplicate =
      await env.DB
        .prepare(`
          SELECT id

          FROM news

          WHERE slug = ?

          LIMIT 1
        `)
        .bind(slug)
        .first();


    if (duplicate) {

      return json(
        {
          success: false,
          error:
            "ई News URL पहिले सँ मौजूद अछि"
        },
        409
      );

    }


    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    if (category_ids.length) {

      const placeholders = category_ids.map(() => "?").join(",");

      const categoryResult =
        await env.DB.prepare(`
          SELECT id
          FROM categories
          WHERE id IN (${placeholders})
        `).bind(...category_ids).all();

      const validIds = new Set(
        (categoryResult.results || []).map(row => Number(row.id))
      );

      if (category_ids.some(id => !validIds.has(id))) {
        return json(
          {
            success:false,
            error:"चयन कएल Category में सँ कोनो Category नहि भेटल"
          },
          400
        );
      }

    }


    // --------------------------------------------------------
    // PUBLISHED DATE
    // --------------------------------------------------------

    const published_at =
      status === "published"
        ? new Date().toISOString()
        : null;


    // --------------------------------------------------------
    // INSERT
    // --------------------------------------------------------

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
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            0,
            ?,
            ?,
            ?
          )
        `)
        .bind(

          title,

          slug,

          summary ||
            null,

          content,

          image_url ||
            null,

          category_id,

          user.id,

          status,

          featured,

          seo_title ||
            null,

          seo_description ||
            null,

          published_at

        )
        .run();


    const newsId =
      result.meta.last_row_id;

    await syncNewsCategories(
      env,
      newsId,
      category_ids,
      category_id
    );


    // --------------------------------------------------------
    // TAGS
    // --------------------------------------------------------

    await syncNewsTags(
      env,
      newsId,
      body.tags
    );

    await setNewsAdsEnabled(env, newsId, body.ads_enabled === true);


    return json({

      success: true,

      message:
        "समाचार सफलतापूर्वक जोड़ल गेल",

      id:
        newsId,

      slug,

      url:
        "/news/" +
        slug,

      tags:
        await getNewsTags(
          env,
          newsId
        )

    });


  } catch (
    error
  ) {

    console.error(
      "CREATE NEWS ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "समाचार जोड़ल नहि जा सकल"
      },
      500
    );

  }

}



// ============================================================
// UPDATE NEWS
// ============================================================

export async function onRequestPut(
  context
) {

  const {
    request,
    env
  } = context;


  try {

    const user =
      await requireStaff(
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
            "News ID जरूरी अछि"
        },
        400
      );

    }


    const body =
      await request.json();


    const oldNews =
      await env.DB
        .prepare(`
          SELECT
            id,
            slug,
            author_id,
            status,
            published_at

          FROM news

          WHERE id = ?

          LIMIT 1
        `)
        .bind(id)
        .first();


    if (!oldNews) {

      return json(
        {
          success: false,
          error:
            "समाचार नहि भेटल"
        },
        404
      );

    }

    if(user.role === "author" && Number(oldNews.author_id) !== Number(user.id)){
      return json({success:false,error:"Author केवल अपन समाचार edit कऽ सकैत छथि।"},403);
    }

    const title =
      String(
        body.title || ""
      ).trim();


    const content =
      String(
        body.content || ""
      ).trim();


    const summary =
      String(
        body.summary || ""
      ).trim();


    const image_url =
      String(
        body.image_url || ""
      ).trim();


    const seo_title =
      String(
        body.seo_title || ""
      ).trim();


    const seo_description =
      String(
        body.seo_description || ""
      ).trim();


    const category_id =
      body.category_id
        ? Number(body.category_id)
        : null;

    const category_ids =
      Array.isArray(body.category_ids)
        ? [...new Set(body.category_ids.map(Number).filter(Boolean))]
        : (category_id ? [category_id] : []);


    const status =
      body.status ===
      "published"
        ? "published"
        : "draft";


    const featured =
      body.featured
        ? 1
        : 0;


    if (
      !title ||
      !content
    ) {

      return json(
        {
          success: false,
          error:
            "शीर्षक आ समाचार जरूरी अछि"
        },
        400
      );

    }


    // --------------------------------------------------------
    // SLUG
    // --------------------------------------------------------

    let slug =
      String(
        body.slug || ""
      )
        .trim()
        .toLowerCase();


    if (!slug) {

      slug =
        oldNews.slug ||
        slugify(
          title
        );

    }


    if (
      !isValidSlug(
        slug
      )
    ) {

      return json(
        {
          success: false,
          error:
            "News URL slug सही English format में लिखू"
        },
        400
      );

    }


    // --------------------------------------------------------
    // DUPLICATE SLUG
    // --------------------------------------------------------

    const duplicate =
      await env.DB
        .prepare(`
          SELECT id

          FROM news

          WHERE
            slug = ?

            AND id != ?

          LIMIT 1
        `)
        .bind(
          slug,
          id
        )
        .first();


    if (duplicate) {

      return json(
        {
          success: false,
          error:
            "ई News URL दोसर समाचार में उपयोग भ' रहल अछि"
        },
        409
      );

    }


    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    if (category_id) {

      const category =
        await env.DB
          .prepare(`
            SELECT id

            FROM categories

            WHERE id = ?

            LIMIT 1
          `)
          .bind(category_id)
          .first();


      if (!category) {

        return json(
          {
            success: false,
            error:
              "चयन कएल Category नहि भेटल"
          },
          400
        );

      }

    }


    // --------------------------------------------------------
    // PUBLISHED DATE
    // --------------------------------------------------------

    let published_at =
      oldNews.published_at;


    if (
      status === "published" &&
      !published_at
    ) {

      published_at =
        new Date()
          .toISOString();

    }


    if (
      status === "draft"
    ) {

      published_at =
        null;

    }


    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

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

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
      `)
      .bind(

        title,

        slug,

        summary ||
          null,

        content,

        image_url ||
          null,

        category_id,

        status,

        featured,

        seo_title ||
          null,

        seo_description ||
          null,

        published_at,

        id

      )
      .run();


    // --------------------------------------------------------
    // TAGS
    // --------------------------------------------------------

    await syncNewsTags(
      env,
      id,
      body.tags
    );

    await syncNewsCategories(
      env,
      id,
      category_ids,
      category_id
    );

    await setNewsAdsEnabled(env, id, body.ads_enabled === true);


    return json({

      success: true,

      message:
        "समाचार update भ' गेल",

      id:
        Number(id),

      slug,

      url:
        "/news/" +
        slug,

      tags:
        await getNewsTags(
          env,
          id
        )

    });


  } catch (
    error
  ) {

    console.error(
      "UPDATE NEWS ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "समाचार update नहि भ' सकल"
      },
      500
    );

  }

}



// ============================================================
// DELETE NEWS
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
      await requireStaff(
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
            "News ID जरूरी अछि"
        },
        400
      );

    }


    const target = await env.DB.prepare(`SELECT id,author_id,status FROM news WHERE id=? LIMIT 1`).bind(id).first();
    if(!target){ return json({success:false,error:"समाचार नहि भेटल"},404); }
    if(user.role === "author" && (Number(target.author_id)!==Number(user.id) || target.status === "published")){
      return json({success:false,error:"Author केवल अपन Draft समाचार delete कऽ सकैत छथि।"},403);
    }

    await env.DB
      .prepare(`
        DELETE FROM news_tags

        WHERE news_id = ?
      `)
      .bind(id)
      .run();


    await env.DB.prepare(`DELETE FROM news_ads WHERE news_id=?`).bind(id).run().catch(()=>{});

    const result =
      await env.DB
        .prepare(`
          DELETE FROM news

          WHERE id = ?
        `)
        .bind(id)
        .run();


    if (
      !result.meta ||
      !result.meta.changes
    ) {

      return json(
        {
          success: false,
          error:
            "समाचार नहि भेटल"
        },
        404
      );

    }


    return json({

      success: true,

      message:
        "समाचार delete भ' गेल"

    });


  } catch (
    error
  ) {

    console.error(
      "DELETE NEWS ERROR:",
      error
    );


    return json(
      {
        success: false,
        error:
          error.message ||
          "समाचार delete नहि भ' सकल"
      },
      500
    );

  }

}



// ============================================================
// POST ADS
// ============================================================

async function ensureNewsAdsTable(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS news_ads (news_id INTEGER PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`).run();
}

async function setNewsAdsEnabled(env, newsId, enabled){
  await ensureNewsAdsTable(env);
  await env.DB.prepare(`INSERT INTO news_ads(news_id,enabled,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(news_id) DO UPDATE SET enabled=excluded.enabled, updated_at=CURRENT_TIMESTAMP`).bind(newsId,enabled?1:0).run();
}

async function getNewsAdsEnabled(env, newsId){
  try{
    await ensureNewsAdsTable(env);
    const row=await env.DB.prepare(`SELECT enabled FROM news_ads WHERE news_id=? LIMIT 1`).bind(newsId).first();
    return Number(row?.enabled||0)===1;
  }catch{return false;}
}

// ============================================================
// NEWS <-> TAGS
// ============================================================

async function syncNewsTags(
  env,
  newsId,
  rawTags
) {

  const tags =
    normalizeTags(
      rawTags
    );


  // ----------------------------------------------------------
  // Remove old relations
  // ----------------------------------------------------------

  await env.DB
    .prepare(`
      DELETE FROM news_tags

      WHERE news_id = ?
    `)
    .bind(newsId)
    .run();


  if (!tags.length) {
    return;
  }


  const tagIds = [];


  // ----------------------------------------------------------
  // Process every tag
  // ----------------------------------------------------------

  for (
    const value of tags
  ) {

    let tag = null;


    const numericId =
      Number(value);


    // --------------------------------------------------------
    // TAG ID
    // --------------------------------------------------------

    if (
      Number.isFinite(
        numericId
      ) &&
      numericId > 0
    ) {

      tag =
        await env.DB
          .prepare(`
            SELECT
              id,
              status

            FROM tags

            WHERE id = ?

            LIMIT 1
          `)
          .bind(numericId)
          .first();

    }


    // --------------------------------------------------------
    // TAG SLUG
    // --------------------------------------------------------

    if (!tag) {

      const tagSlug =
        String(
          value
        )
          .trim()
          .toLowerCase();


      if (
        isValidSlug(
          tagSlug
        )
      ) {

        tag =
          await env.DB
            .prepare(`
              SELECT
                id,
                status

              FROM tags

              WHERE slug = ?

              LIMIT 1
            `)
            .bind(tagSlug)
            .first();


        // ----------------------------------------------------
        // Create missing tag
        // ----------------------------------------------------

        if (!tag) {

          const created =
            await env.DB
              .prepare(`
                INSERT INTO tags (
                  name,
                  slug,
                  description,
                  status
                )

                VALUES (
                  ?,
                  ?,
                  NULL,
                  'active'
                )
              `)
              .bind(
                tagDisplayName(
                  tagSlug
                ),
                tagSlug
              )
              .run();


          tag = {

            id:
              created
                .meta
                .last_row_id,

            status:
              "active"

          };

        }

      }

    }


    if (!tag) {
      continue;
    }


    if (
      tag.status !==
      "active"
    ) {

      continue;

    }


    tagIds.push(
      Number(
        tag.id
      )
    );

  }


  // ----------------------------------------------------------
  // Unique tag IDs
  // ----------------------------------------------------------

  const uniqueIds =
    [
      ...new Set(
        tagIds
      )
    ];


  // ----------------------------------------------------------
  // Insert relations
  // ----------------------------------------------------------

  for (
    const tagId of uniqueIds
  ) {

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
        tagId
      )
      .run();

  }

}



// ============================================================
// NORMALIZE TAGS
// ============================================================

function normalizeTags(
  rawTags
) {

  if (
    Array.isArray(
      rawTags
    )
  ) {

    return rawTags
      .map(
        value =>
          String(
            value || ""
          ).trim()
      )
      .filter(
        Boolean
      );

  }


  if (
    typeof rawTags ===
    "string"
  ) {

    return rawTags
      .split(",")
      .map(
        value =>
          value.trim()
      )
      .filter(
        Boolean
      );

  }


  return [];

}



// ============================================================
// GET NEWS TAGS
// ============================================================

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

          t.description,

          t.status

        FROM news_tags nt

        INNER JOIN tags t
          ON t.id = nt.tag_id

        WHERE
          nt.news_id = ?

        ORDER BY
          t.name COLLATE NOCASE ASC,
          t.id ASC
      `)
      .bind(newsId)
      .all();


  return (
    result.results ||
    []
  );

}



// ============================================================
// ATTACH TAGS TO NEWS LIST
// ============================================================

async function attachTags(
  env,
  newsList
) {

  if (
    !newsList.length
  ) {

    return;

  }


  const ids =
    newsList
      .map(
        item =>
          Number(
            item.id
          )
      )
      .filter(
        Number.isFinite
      );


  if (!ids.length) {
    return;
  }


  const placeholders =
    ids
      .map(
        () => "?"
      )
      .join(",");


  const result =
    await env.DB
      .prepare(`
        SELECT

          nt.news_id,

          t.id,

          t.name,

          t.slug,

          t.description,

          t.status

        FROM news_tags nt

        INNER JOIN tags t
          ON t.id = nt.tag_id

        WHERE
          nt.news_id IN (
            ${placeholders}
          )

        ORDER BY
          t.name COLLATE NOCASE ASC,
          t.id ASC
      `)
      .bind(...ids)
      .all();


  const map =
    new Map();


  for (
    const item of newsList
  ) {

    map.set(
      Number(
        item.id
      ),
      []
    );

  }


  for (
    const tag of (
      result.results ||
      []
    )
  ) {

    const newsId =
      Number(
        tag.news_id
      );


    if (
      !map.has(
        newsId
      )
    ) {

      map.set(
        newsId,
        []
      );

    }


    map
      .get(
        newsId
      )
      .push({

        id:
          tag.id,

        name:
          tag.name,

        slug:
          tag.slug,

        description:
          tag.description,

        status:
          tag.status

      });

  }


  for (
    const item of newsList
  ) {

    item.tags =
      map.get(
        Number(
          item.id
        )
      ) ||
      [];

  }

}



// ============================================================
// TAG DISPLAY NAME
// ============================================================

function tagDisplayName(
  slug
) {

  return String(
    slug || ""
  )
    .split("-")
    .filter(Boolean)
    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1)
    )
    .join(" ");

}



// ============================================================
// ADMIN AUTH
// ============================================================

async function requireStaff(request, env) {
  const user = await getAuthenticatedUser(request, env);
  if(!user || user.status !== "active" || !["admin","editor","author"].includes(user.role)) return null;
  return user;
}

async function requireAdmin(request, env) {
  const user = await getAuthenticatedUser(request, env);
  if(!user || user.status !== "active" || user.role !== "admin") return null;
  return user;
}



// ============================================================
// GET AUTHENTICATED USER
// ============================================================

async function getAuthenticatedUser(
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


    return await env.DB
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


  } catch (
    error
  ) {

    console.error(
      "AUTH ERROR:",
      error
    );


    return null;

  }

}



// ============================================================
// IS ADMIN
// ============================================================

async function isAdmin(
  request,
  env
) {

  const user =
    await getAuthenticatedUser(
      request,
      env
    );


  return !!(
    user &&
    user.status ===
      "active" &&
    user.role ===
      "admin"
  );

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
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "");

}



// ============================================================
// VALID SLUG
// ============================================================

function isValidSlug(
  slug
) {

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    .test(
      slug
    );

}



// ============================================================
// INTEGER
// ============================================================

function clampInt(
  value,
  min,
  max,
  fallback
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return fallback;

  }


  return Math.min(
    max,
    Math.max(
      min,
      Math.floor(
        number
      )
    )
  );

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

        "Cache-Control":
          "no-store"

      }

    }
  );

}



// ============================================================
// COOKIES
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
          part.indexOf(
            "="
          );


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
      parts.length !==
      2
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
          Date.now() /
          1000
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

      new TextEncoder()
        .encode(
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

      new TextEncoder()
        .encode(
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
// BASE64 URL
// ============================================================

function base64url(
  bytes
) {

  let binary =
    "";


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
// FROM BASE64 URL
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

    base64 +=
      "=";

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
// TIMING SAFE EQUAL
// ============================================================

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
