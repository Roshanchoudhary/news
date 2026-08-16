// functions/news/[[slug]].js

export async function onRequest(context) {
  const { params, env, request } = context;

  const slug = params.slug;

  if (!slug) {
    return new Response("News URL not found", {
      status: 404
    });
  }

  try {
    const news = await env.DB
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

    if (!news) {
      return new Response(
        "समाचार नहि भेटल",
        {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    // Draft public नहि देखाउ
    if (news.status !== "published") {
      return new Response(
        "समाचार उपलब्ध नहि अछि",
        {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    // Views +1
    await env.DB
      .prepare(`
        UPDATE news
        SET views = COALESCE(views, 0) + 1
        WHERE id = ?
      `)
      .bind(news.id)
      .run();

    news.views =
      Number(news.views || 0) + 1;

    const title =
      escapeHtml(news.title || "मैथिली समाचार");

    const description =
      escapeHtml(
        news.seo_description ||
        news.summary ||
        "मैथिली समाचार"
      );

    const image =
      news.image_url
        ? `
          <meta
            property="og:image"
            content="${escapeHtml(news.image_url)}"
          >
        `
        : "";

    const canonical =
      new URL(
        request.url
      ).href;

    const content =
      formatContent(
        news.content || ""
      );

    const summary =
      news.summary
        ? `
          <div class="summary">
            ${escapeHtml(news.summary)}
          </div>
        `
        : "";

    const imageHtml =
      news.image_url
        ? `
          <img
            class="article-image"
            src="${escapeHtml(news.image_url)}"
            alt="${title}"
          >
        `
        : "";

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
  ${title} - मैथिली समाचार
</title>

<meta
  name="description"
  content="${description}"
>

<link
  rel="canonical"
  href="${escapeHtml(canonical)}"
>

<meta
  property="og:title"
  content="${title}"
>

<meta
  property="og:description"
  content="${description}"
>

<meta
  property="og:type"
  content="article"
>

<meta
  property="og:url"
  content="${escapeHtml(canonical)}"
>

${image}

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
  width: min(1000px, 94%);
  margin: auto;
}

/* HEADER */

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

/* ARTICLE */

main {
  padding: 30px 0 60px;
}

.article {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow:
    0 2px 12px rgba(0,0,0,.07);
}

.category {
  color: #8b0000;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 12px;
}

h1 {
  font-size: 38px;
  line-height: 1.4;
  margin: 0 0 15px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  color: #777;
  font-size: 13px;
  padding-bottom: 18px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.article-image {
  width: 100%;
  max-height: 600px;
  object-fit: cover;
  border-radius: 10px;
  margin-bottom: 25px;
}

.summary {
  background: #fafafa;
  border-left: 4px solid #8b0000;
  padding: 15px 18px;
  margin-bottom: 25px;
  font-size: 18px;
  line-height: 1.8;
  font-weight: 600;
  color: #444;
}

.content {
  font-size: 18px;
  line-height: 2;
  word-break: break-word;
}

.content p {
  margin: 0 0 20px;
}

.back {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.back a {
  display: inline-block;
  background: #8b0000;
  color: white;
  padding: 10px 16px;
  border-radius: 7px;
  font-weight: bold;
}

/* MOBILE */

@media(max-width:650px) {

  .header-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .logo {
    font-size: 25px;
  }

  .article {
    padding: 20px;
  }

  h1 {
    font-size: 28px;
  }

  .content {
    font-size: 17px;
    line-height: 1.85;
  }

  .summary {
    font-size: 17px;
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

<article class="article">

<div class="category">

${escapeHtml(
  news.category_name ||
  "समाचार"
)}

</div>


<h1>
${title}
</h1>


<div class="meta">

<span>
📅 ${formatDate(
  news.published_at ||
  news.created_at
)}
</span>

${
news.author_name
?
`
<span>
✍ ${escapeHtml(news.author_name)}
</span>
`
:
""
}

<span>
👁 ${Number(news.views || 0)}
</span>

</div>


${imageHtml}

${summary}


<div class="content">
${content}
</div>


<div class="back">

<a href="/">
← सभ समाचार देखू
</a>

</div>

</article>

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
      "NEWS PAGE ERROR:",
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
// FORMAT CONTENT
// ======================================================

function formatContent(text) {

  const value =
    String(text || "")
      .trim();

  if (!value) {
    return "";
  }

  // यदि content में HTML अछि तँ basic HTML रखबाक
  // जगह plain text paragraph बनाउ।
  // बाद में proper rich editor जोड़ि सकैत छी।

  return value
    .split(/\n\s*\n/)
    .map(
      paragraph =>
        `<p>${escapeHtml(paragraph.trim())}</p>`
    )
    .join("");
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

  return String(value ?? "")
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
