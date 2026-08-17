// functions/news/[slug].js

export async function onRequest(context) {

  const {
    params,
    env,
    request
  } = context;


  const slug =
    params.slug;


  if (!slug) {

    return new Response(
      "News URL not found",
      {
        status:404,

        headers:{
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  }


  try {

    // =====================================================
    // GET NEWS
    // =====================================================

    const news =
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


    // =====================================================
    // NEWS NOT FOUND
    // =====================================================

    if (!news) {

      return new Response(
        "समाचार नहि भेटल",
        {
          status:404,

          headers:{
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    }


    // =====================================================
    // ONLY PUBLISHED NEWS PUBLICLY
    // =====================================================

    if (
      String(
        news.status || ""
      ).toLowerCase() !==
      "published"
    ) {

      return new Response(
        "समाचार उपलब्ध नहि अछि",
        {
          status:404,

          headers:{
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    }


    // =====================================================
    // VIEWS +1
    // =====================================================

    try {

      await env.DB
        .prepare(`
          UPDATE news

          SET views =
            COALESCE(
              views,
              0
            ) + 1

          WHERE id = ?
        `)
        .bind(news.id)
        .run();


      news.views =
        Number(
          news.views || 0
        ) + 1;


    } catch (viewError) {

      console.error(
        "VIEW UPDATE ERROR:",
        viewError
      );

    }


    // =====================================================
    // SEO
    // =====================================================

    const title =
      escapeHtml(
        news.title ||
        "मैथिली समाचार"
      );


    const description =
      escapeHtml(
        news.seo_description ||
        news.summary ||
        "मैथिली समाचार"
      );


    const canonical =
      new URL(
        request.url
      ).href;


    // =====================================================
    // OG IMAGE
    // =====================================================

    const image =
      news.image_url
        ? `
          <meta
            property="og:image"
            content="${escapeHtml(
              news.image_url
            )}"
          >

          <meta
            property="og:image:alt"
            content="${title}"
          >
        `
        : "";


    // =====================================================
    // CONTENT
    // =====================================================

    const content =
      formatContent(
        news.content || ""
      );


    // =====================================================
    // SUMMARY
    // =====================================================

    const summary =
      news.summary
        ? `
          <div class="summary">
            ${escapeHtml(
              news.summary
            )}
          </div>
        `
        : "";


    // =====================================================
    // FEATURED IMAGE
    // =====================================================

    const imageHtml =
      news.image_url
        ? `
          <img
            class="article-image"
            src="${escapeHtml(
              news.image_url
            )}"
            alt="${title}"
            loading="eager"
          >
        `
        : "";


    // =====================================================
    // CATEGORY
    // =====================================================

    const categoryName =
      escapeHtml(
        news.category_name ||
        "समाचार"
      );


    // =====================================================
    // AUTHOR
    // =====================================================

    const authorHtml =
      news.author_name
        ? `
          <span>
            ✍
            ${escapeHtml(
              news.author_name
            )}
          </span>
        `
        : "";


    // =====================================================
    // DATE
    // =====================================================

    const date =
      formatDate(
        news.published_at ||
        news.created_at
      );


    // =====================================================
    // HTML
    // =====================================================

    const html = `<!DOCTYPE html>

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
  href="${escapeHtml(
    canonical
  )}"
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
  content="${escapeHtml(
    canonical
  )}"
>


${image}


<style>

/* =====================================================
   RESET
===================================================== */

* {
  box-sizing:border-box;
}


/* =====================================================
   BODY
===================================================== */

body {

  margin:0;

  background:#f5f5f5;

  color:#222;

  font-family:
    Arial,
    "Noto Sans Devanagari",
    sans-serif;

}


/* =====================================================
   LINKS
===================================================== */

a {

  color:inherit;

  text-decoration:none;

}


/* =====================================================
   CONTAINER
===================================================== */

.container {

  width:
    min(
      1000px,
      94%
    );

  margin:auto;

}


/* =====================================================
   HEADER
===================================================== */

header {

  background:#8b0000;

  color:#fff;

}


.header {

  padding:18px 0;

}


.header-inner {

  display:flex;

  align-items:center;

  justify-content:
    space-between;

  gap:15px;

}


.logo {

  font-size:28px;

  font-weight:800;

}


.tagline {

  font-size:13px;

  margin-top:4px;

  opacity:.9;

}


.home {

  background:#fff;

  color:#8b0000;

  padding:9px 14px;

  border-radius:6px;

  font-weight:bold;

}


/* =====================================================
   MAIN
===================================================== */

main {

  padding:
    30px 0 60px;

}


/* =====================================================
   ARTICLE
===================================================== */

.article {

  background:#fff;

  padding:30px;

  border-radius:12px;

  box-shadow:
    0 2px 12px
    rgba(0,0,0,.07);

}


/* =====================================================
   CATEGORY
===================================================== */

.category {

  color:#8b0000;

  font-weight:bold;

  font-size:14px;

  margin-bottom:12px;

}


/* =====================================================
   TITLE
===================================================== */

h1 {

  font-size:38px;

  line-height:1.4;

  margin:
    0 0 15px;

}


/* =====================================================
   META
===================================================== */

.meta {

  display:flex;

  flex-wrap:wrap;

  gap:15px;

  color:#777;

  font-size:13px;

  padding-bottom:18px;

  margin-bottom:20px;

  border-bottom:
    1px solid #eee;

}


/* =====================================================
   FEATURED IMAGE
===================================================== */

.article-image {

  display:block;

  width:100%;

  max-height:600px;

  object-fit:cover;

  border-radius:10px;

  margin-bottom:25px;

}


/* =====================================================
   SUMMARY
===================================================== */

.summary {

  background:#fafafa;

  border-left:
    4px solid #8b0000;

  padding:
    15px 18px;

  margin-bottom:25px;

  font-size:18px;

  line-height:1.8;

  font-weight:600;

  color:#444;

}


/* =====================================================
   CONTENT
===================================================== */

.content {

  font-size:18px;

  line-height:2;

  word-break:
    break-word;

}


/* =====================================================
   PARAGRAPH
===================================================== */

.content p {

  margin:
    0 0 20px;

}


/* =====================================================
   INLINE IMAGE
===================================================== */

.content-image {

  display:block;

  width:auto;

  max-width:100%;

  height:auto;

  margin:
    25px auto;

  border-radius:10px;

  object-fit:contain;

}


/* =====================================================
   HEADINGS
===================================================== */

.content h2 {

  font-size:27px;

  line-height:1.5;

  margin:
    30px 0 15px;

}


.content h3 {

  font-size:22px;

  line-height:1.5;

  margin:
    25px 0 12px;

}


/* =====================================================
   LIST
===================================================== */

.content ul,
.content ol {

  margin:
    15px 0 20px 28px;

}


.content li {

  margin-bottom:8px;

}


/* =====================================================
   LINK
===================================================== */

.content a {

  color:#8b0000;

  text-decoration:
    underline;

}


/* =====================================================
   BLOCKQUOTE
===================================================== */

.content blockquote {

  margin:
    20px 0;

  padding:
    12px 18px;

  border-left:
    4px solid #8b0000;

  background:#f8f8f8;

  color:#444;

}


/* =====================================================
   BACK
===================================================== */

.back {

  margin-top:30px;

  padding-top:20px;

  border-top:
    1px solid #eee;

}


.back a {

  display:inline-block;

  background:#8b0000;

  color:#fff;

  padding:
    10px 16px;

  border-radius:7px;

  font-weight:bold;

}


/* =====================================================
   MOBILE
===================================================== */

@media(max-width:650px) {

  .header-inner {

    align-items:
      flex-start;

    flex-direction:
      column;

  }


  .logo {

    font-size:25px;

  }


  .article {

    padding:20px;

  }


  h1 {

    font-size:28px;

  }


  .content {

    font-size:17px;

    line-height:1.85;

  }


  .summary {

    font-size:17px;

  }


  .content-image {

    width:100%;

    max-width:100%;

    margin:
      20px auto;

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

        ${categoryName}

      </div>


      <h1>

        ${title}

      </h1>


      <div class="meta">

        <span>

          📅 ${date}

        </span>


        ${authorHtml}


        <span>

          👁
          ${Number(
            news.views || 0
          )}

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

</html>`;


    // =====================================================
    // RESPONSE
    // =====================================================

    return new Response(
      html,
      {
        status:200,

        headers:{
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
        status:500,

        headers:{
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  }

}


/* =========================================================
   FORMAT CONTENT
========================================================= */

function formatContent(
  text
) {

  let value =
    String(
      text || ""
    ).trim();


  if (!value) {
    return "";
  }


  /*
   * -------------------------------------------------------
   * Remove dangerous HTML
   * -------------------------------------------------------
   */

  value =
    value.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ""
    );


  value =
    value.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ""
    );


  value =
    value.replace(
      /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
      ""
    );


  value =
    value.replace(
      /<object\b[^>]*>[\s\S]*?<\/object>/gi,
      ""
    );


  /*
   * -------------------------------------------------------
   * OLD EDITOR DIV FORMAT
   *
   * <div>text</div>
   * <div><br></div>
   * -------------------------------------------------------
   */

  value =
    value.replace(
      /<div>\s*<br\s*\/?>\s*<\/div>/gi,
      ""
    );


  value =
    value.replace(
      /<div>\s*<\/div>/gi,
      ""
    );


  value =
    value.replace(
      /<div>([\s\S]*?)<\/div>/gi,
      "<p>$1</p>"
    );


  /*
   * -------------------------------------------------------
   * Normalize BR
   * -------------------------------------------------------
   */

  value =
    value.replace(
      /<br\s*\/?>/gi,
      "<br>"
    );


  /*
   * -------------------------------------------------------
   * Save allowed HTML temporarily
   * -------------------------------------------------------
   */

  const placeholders =
    [];


  value =
    value.replace(
      /<\/?(p|br|strong|b|em|i|u|ul|ol|li|blockquote|a|img|h2|h3)(\s[^>]*)?>/gi,
      function (
        tag
      ) {

        const index =
          placeholders.length;


        /*
         * -------------------------------------------------
         * IMAGE
         * -------------------------------------------------
         */

        if (
          /^<img\b/i.test(
            tag
          )
        ) {

          const srcMatch =
            tag.match(
              /\bsrc\s*=\s*["']([^"']+)["']/i
            );


          if (!srcMatch) {
            return "";
          }


          const src =
            srcMatch[1];


          /*
           * Only HTTP/HTTPS image
           */

          if (
            !/^https?:\/\//i.test(
              src
            )
          ) {

            return "";

          }


          const altMatch =
            tag.match(
              /\balt\s*=\s*["']([^"']*)["']/i
            );


          const alt =
            altMatch
              ? altMatch[1]
              : "";


          placeholders.push(
            `<img class="content-image" src="${escapeHtml(
              src
            )}" alt="${escapeHtml(
              alt
            )}" loading="lazy">`
          );


          return (
            "___HTML_PLACEHOLDER_" +
            index +
            "___"
          );

        }


        /*
         * -------------------------------------------------
         * LINK OPENING TAG
         * -------------------------------------------------
         */

        if (
          /^<a\b/i.test(
            tag
          )
        ) {

          const hrefMatch =
            tag.match(
              /\bhref\s*=\s*["']([^"']+)["']/i
            );


          if (!hrefMatch) {
            return "";
          }


          const href =
            hrefMatch[1];


          if (
            !/^https?:\/\//i.test(
              href
            ) &&
            !/^mailto:/i.test(
              href
            ) &&
            !href.startsWith("/")
          ) {

            return "";

          }


          /*
           * Closing </a>
           */

          if (
            /^<\/a/i.test(
              tag
            )
          ) {

            placeholders.push(
              "</a>"
            );

          } else {

            placeholders.push(
              `<a href="${escapeHtml(
                href
              )}" target="_blank" rel="noopener noreferrer">`
            );

          }


          return (
            "___HTML_PLACEHOLDER_" +
            index +
            "___"
          );

        }


        /*
         * Other allowed tags
         */

        placeholders.push(
          tag
        );


        return (
          "___HTML_PLACEHOLDER_" +
          index +
          "___"
        );

      }
    );


  /*
   * -------------------------------------------------------
   * Escape all remaining text
   * -------------------------------------------------------
   */

  value =
    escapeHtml(
      value
    );


  /*
   * -------------------------------------------------------
   * Restore allowed HTML
   * -------------------------------------------------------
   */

  placeholders.forEach(
    function (
      html,
      index
    ) {

      value =
        value.replace(
          "___HTML_PLACEHOLDER_" +
          index +
          "___",
          html
        );

    }
  );


  /*
   * -------------------------------------------------------
   * If plain text content
   * -------------------------------------------------------
   */

  if (
    !/<p\b/i.test(
      value
    ) &&
    !/<h2\b/i.test(
      value
    ) &&
    !/<h3\b/i.test(
      value
    ) &&
    !/<ul\b/i.test(
      value
    ) &&
    !/<ol\b/i.test(
      value
    )
  ) {

    value =
      value
        .split(
          /\n\s*\n/
        )
        .map(
          function (
            paragraph
          ) {

            const p =
              paragraph.trim();


            if (!p) {
              return "";
            }


            return (
              "<p>" +
              p +
              "</p>"
            );

          }
        )
        .join("");

  }


  return value;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value
) {

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


/* =========================================================
   DATE
========================================================= */

function formatDate(
  value
) {

  if (!value) {
    return "";
  }


  try {

    return new Date(
      value
    ).toLocaleDateString(
      "hi-IN",
      {
        day:"numeric",
        month:"long",
        year:"numeric"
      }
    );


  } catch {

    return "";

  }

}