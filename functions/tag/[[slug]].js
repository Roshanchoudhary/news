// functions/tag/[[slug]].js

export async function onRequest(context) {

  const { params, env } = context;

  const slug = params.slug;

  if (!slug) {
    return new Response("Tag URL not found", {
      status: 404
    });
  }

  try {

    // ==================================================
    // TAG
    // ==================================================

    const tag = await env.DB
      .prepare(`
        SELECT
          id,
          name,
          slug,
          description,
          status
        FROM tags
        WHERE slug = ?
          AND status = 'active'
        LIMIT 1
      `)
      .bind(slug)
      .first();


    if (!tag) {

      return new Response(
        "Tag नहि भेटल",
        {
          status: 404,
          headers: {
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    }


    // ==================================================
    // NEWS WITH THIS TAG
    // ==================================================

    const result = await env.DB
      .prepare(`
        SELECT
          n.id,
          n.title,
          n.slug,
          n.summary,
          n.content,
          n.image_url,
          n.views,
          n.featured,
          n.published_at,
          n.created_at,
          c.name AS category_name
        FROM news n

        INNER JOIN news_tags nt
          ON nt.news_id = n.id

        INNER JOIN tags t
          ON t.id = nt.tag_id

        LEFT JOIN categories c
          ON c.id = n.category_id

        WHERE
          nt.tag_id = ?
          AND n.status = 'published'

        ORDER BY
          COALESCE(
            n.published_at,
            n.created_at
          ) DESC,
          n.id DESC
      `)
      .bind(tag.id)
      .all();


    const news =
      result.results || [];


    // ==================================================
    // PAGE CONTENT
    // ==================================================

    const title =
      escapeHtml(tag.name);


    const description =
      escapeHtml(
        tag.description ||
        `${tag.name} सँ संबंधित नवीनतम समाचार`
      );


    const newsCards =
      news.length
        ? news
            .map(
              item =>
                createNewsCard(item)
            )
            .join("")
        : `
          <div class="empty">
            एहि Tag सँ संबंधित
            एखन कोनो प्रकाशित समाचार नहि अछि।
          </div>
        `;


    // ==================================================
    // HTML
    // ==================================================

    const html = `
<!DOCTYPE html>

<html lang="mai">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
#${title} - मैथिली समाचार
</title>

<meta
  name="description"
  content="${description}"
>

<link
  rel="canonical"
  href="/tag/${escapeHtml(tag.slug)}"
>


<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f5f5f5;
  color: #222;
  font-family:
    Arial,
    "Noto Sans Devanagari",
    sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  width: min(1200px, 94%);
  margin: auto;
}


/* ================================================
   HEADER
================================================ */

header {
  background: #8b0000;
  color: white;
}

.header {
  padding: 18px 0;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.logo {
  font-size: 28px;
  font-weight: 800;
}

.tagline {
  font-size: 13px;
  margin-top: 4px;
  opacity: .9;
}

.home {
  background: white;
  color: #8b0000;
  padding: 9px 14px;
  border-radius: 6px;
  font-weight: bold;
}


/* ================================================
   MAIN
================================================ */

main {
  padding: 30px 0 60px;
}

.page-heading {
  background: white;
  padding: 25px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.page-heading h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

.page-heading p {
  margin: 0;
  color: #666;
  line-height: 1.7;
}


/* ================================================
   NEWS GRID
================================================ */

.news-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.news-card {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 2px 10px rgba(0,0,0,.07);

  transition:
    transform .2s,
    box-shadow .2s;
}

.news-card:hover {
  transform: translateY(-3px);

  box-shadow:
    0 5px 18px rgba(0,0,0,.12);
}

.news-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  background: #eee;
}

.no-image {
  height: 200px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #e5e5e5;
  color: #888;
}

.news-body {
  padding: 16px;
}

.news-category {
  color: #8b0000;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
}

.news-title {
  margin: 0 0 9px;

  font-size: 19px;
  line-height: 1.45;
}

.news-summary {
  color: #666;

  font-size: 14px;
  line-height: 1.65;

  margin: 0 0 12px;
}

.news-meta {
  border-top: 1px solid #eee;

  padding-top: 10px;

  color: #888;
  font-size: 12px;

  display: flex;
  justify-content: space-between;
}

.empty {
  background: white;

  padding: 40px;

  text-align: center;

  color: #777;

  border-radius: 10px;

  grid-column: 1 / -1;
}


/* ================================================
   MOBILE
================================================ */

@media(max-width:900px) {

  .news-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

}

@media(max-width:600px) {

  .header-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .logo {
    font-size: 25px;
  }

  .page-heading h1 {
    font-size: 25px;
  }

  .news-grid {
    grid-template-columns: 1fr;
  }

  .news-image,
  .no-image {
    height: 210px;
  }

}

</style>

</head>


<body>


<header>

<div class="container header">

<div class="header-inner">

<div>

<div class="logo">
मैथिली समाचार
</div>

<div class="tagline">
मैथिली भाषामे नवीनतम समाचार
</div>

</div>


<a
  href="/"
  class="home"
>
← मुख्य पृष्ठ
</a>

</div>

</div>

</header>


<main>

<div class="container">


<div class="page-heading">

<h1>
🏷️ #${title}
</h1>

<p>
${description}
</p>

</div>


<div class="news-grid">

${newsCards}

</div>


</div>

</main>


</body>

</html>
`;


    return new Response(
      html,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8",

          "Cache-Control":
            "public, max-age=60"
        }
      }
    );


  } catch (error) {

    console.error(
      "TAG PAGE ERROR:",
      error
    );

    return new Response(
      "Server Error",
      {
        status: 500,

        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  }

}


// ======================================================
// NEWS CARD
// ======================================================

function createNewsCard(news) {

  const image =
    news.image_url
      ? `
        <img
          class="news-image"
          src="${escapeHtml(
            news.image_url
          )}"
          alt="${escapeHtml(
            news.title || ""
          )}"
          loading="lazy"
        >
      `
      : `
        <div class="no-image">
          मैथिली समाचार
        </div>
      `;


  const summary =
    news.summary ||
    makeExcerpt(
      news.content || "",
      150
    );


  return `
    <article class="news-card">

      <a
        href="/news/${encodeURIComponent(
          news.slug
        )}"
      >

        ${image}

        <div class="news-body">

          <div class="news-category">
            ${escapeHtml(
              news.category_name ||
              "समाचार"
            )}
          </div>

          <h2 class="news-title">
            ${escapeHtml(
              news.title || ""
            )}
          </h2>

          <p class="news-summary">
            ${escapeHtml(
              summary
            )}
          </p>

          <div class="news-meta">

            <span>
              ${formatDate(
                news.published_at ||
                news.created_at
              )}
            </span>

            <span>
              👁 ${Number(
                news.views || 0
              )}
            </span>

          </div>

        </div>

      </a>

    </article>
  `;

}


// ======================================================
// EXCERPT
// ======================================================

function makeExcerpt(
  text,
  length
) {

  const clean =
    String(text || "")
      .replace(
        /<[^>]*>/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    clean.length <= length
  ) {

    return clean;

  }


  return (
    clean.substring(
      0,
      length
    ) + "..."
  );

}


// ======================================================
// DATE
// ======================================================

function formatDate(value) {

  if (!value) {
    return "";
  }

  try {

    return new Date(value)
      .toLocaleDateString(
        "hi-IN",
        {
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );

  } catch {

    return "";

  }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}
