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
            "Content-Type":
              "text/plain; charset=UTF-8"
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
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    }


    // =====================================================
    // VIEWS +1
    // =====================================================

    await env.DB
      .prepare(`
        UPDATE news
        SET views =
          COALESCE(views, 0) + 1
        WHERE id = ?
      `)
      .bind(news.id)
      .run();


    news.views =
      Number(news.views || 0) + 1;


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


    const image =
      news.image_url
        ? `
          <meta
            property="og:image"
            content="${escapeHtml(
              news.image_url
            )}"
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
            ${escapeHtml(
              news.summary
            )}
          </div>
        `
        : "";


    const imageHtml =
      news.image_url
        ? `
          <img
            class="article-image"
            src="${escapeHtml(
              news.image_url
            )}"
            alt="${title}"
          >
        `
        : "";


    // =====================================================
    // HTML
    // =====================================================

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


/* =====================================================
   HEADER
===================================================== */

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


/* =====================================================
   ARTICLE
===================================================== */

main {
  padding: 30px 0 60px;
}


.article {
  background: white;
  padding: 30px;
  border-radius: 12px;

  box-shadow:
    0 2px 12px
    rgba(0,0,0,.07);
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

  border-left:
    4px solid #8b0000;

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

  border-top:
    1px solid #eee;
}


.back a {
  display: inline-block;

  background: #8b0000;
  color: white;

  padding: 10px 16px;

  border-radius: 7px;

  font-weight: bold;
}


/* =====================================================
   COMMENTS
===================================================== */

.comments {

  margin-top: 30px;

  background: white;

  padding: 25px;

  border-radius: 12px;

  box-shadow:
    0 2px 12px
    rgba(0,0,0,.07);
}


.comments h2 {

  margin: 0 0 20px;

  font-size: 24px;

}


.comment-item {

  padding: 15px 0;

  border-bottom:
    1px solid #eee;

}


.comment-name {

  font-weight: 700;

  font-size: 14px;

}


.comment-date {

  color: #888;

  font-size: 11px;

  margin-left: 8px;

}


.comment-text {

  margin-top: 7px;

  font-size: 14px;

  line-height: 1.7;

  white-space: pre-wrap;

}


.comment-empty,
.comment-loading {

  padding: 18px;

  background: #fafafa;

  border-radius: 8px;

  color: #888;

  font-size: 12px;

  text-align: center;

}


.comment-form {

  margin-top: 25px;

  padding-top: 25px;

  border-top:
    1px solid #eee;

}


.comment-form h3 {

  margin: 0 0 16px;

}


.comment-form label {

  display: block;

  font-size: 12px;

  font-weight: 700;

  margin-bottom: 6px;

}


.comment-form input,
.comment-form textarea {

  width: 100%;

  box-sizing: border-box;

  border: 1px solid #ddd;

  border-radius: 7px;

  padding: 10px 12px;

  font-size: 13px;

  font-family: inherit;

  margin-bottom: 14px;

}


.comment-form input {

  height: 42px;

}


.comment-form textarea {

  min-height: 120px;

  resize: vertical;

}


.comment-private {

  color: #888;

  font-size: 10px;

  margin-top: -9px;

  margin-bottom: 14px;

}


.comment-button {

  border: 0;

  background: #8b0000;

  color: white;

  padding: 11px 18px;

  border-radius: 7px;

  cursor: pointer;

  font-weight: 700;

}


.comment-button:disabled {

  opacity: .6;

  cursor: not-allowed;

}


.comment-message {

  display: none;

  margin-top: 12px;

  padding: 10px;

  border-radius: 7px;

  font-size: 11px;

}


/* =====================================================
   MOBILE
===================================================== */

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


  .comments {

    padding: 18px;

  }


  .comments h2 {

    font-size: 20px;

  }

}

</style>

</head>


<body>


<!-- =====================================================
     HEADER
===================================================== -->

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


<!-- =====================================================
     MAIN
===================================================== -->

<main>

<div class="container">


<!-- =====================================================
     ARTICLE
===================================================== -->

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
    ✍ ${escapeHtml(
      news.author_name
    )}
  </span>
  `
  :
  ""
}


<span>
👁 ${Number(
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


<!-- =====================================================
     COMMENTS
===================================================== -->

<section class="comments">


<h2>
💬 टिप्पणी
</h2>


<div id="commentsList">

<div class="comment-loading">
टिप्पणी लोड भ' रहल अछि...
</div>

</div>


<!-- ===================================================
     COMMENT FORM
=================================================== -->

<div class="comment-form">


<h3>
अपन टिप्पणी लिखू
</h3>


<form id="commentForm">


<!-- NAME -->

<label>

नाम
<span style="color:#b00000;">
*
</span>

</label>


<input
  id="commentName"
  type="text"
  required
  maxlength="100"
  autocomplete="name"
  placeholder="अपन नाम लिखू"
>


<!-- EMAIL -->

<label>

ईमेल
<span style="color:#b00000;">
*
</span>

</label>


<input
  id="commentEmail"
  type="email"
  required
  maxlength="150"
  autocomplete="email"
  placeholder="example@email.com"
>


<div class="comment-private">
ईमेल केवल Admin देख सकत छथि।
</div>


<!-- MOBILE -->

<label>

मोबाइल नंबर
<span style="color:#b00000;">
*
</span>

</label>


<input
  id="commentMobile"
  type="tel"
  required
  maxlength="15"
  inputmode="numeric"
  autocomplete="tel"
  placeholder="9876543210"
>


<div class="comment-private">
मोबाइल नंबर केवल Admin देख सकत छथि।
</div>


<!-- COMMENT -->

<label>

टिप्पणी
<span style="color:#b00000;">
*
</span>

</label>


<textarea
  id="commentText"
  required
  maxlength="5000"
  placeholder="अपन टिप्पणी लिखू..."
></textarea>


<div
  style="
    color:#777;
    font-size:10px;
    line-height:1.5;
    margin-bottom:14px;
  "
>

ईमेल आ मोबाइल नंबर सार्वजनिक नहि कएल जाएत।
टिप्पणी Admin approval के बाद प्रकाशित होयत।

</div>


<button
  type="submit"
  id="commentButton"
  class="comment-button"
>
टिप्पणी भेजू
</button>


<div
  id="commentMessage"
  class="comment-message"
></div>


</form>

</div>

</section>


</div>

</main>


<!-- =====================================================
     COMMENT JAVASCRIPT
===================================================== -->

<script>


const NEWS_ID =
  ${Number(news.id)};


/* =====================================================
   LOAD APPROVED COMMENTS
===================================================== */

async function loadComments() {


  const list =
    document.getElementById(
      "commentsList"
    );


  if (!list) {

    return;

  }


  try {


    const response =
      await fetch(
        "/api/comments?news_id=" +
        encodeURIComponent(
          NEWS_ID
        ),
        {
          method:
            "GET",

          cache:
            "no-store",

          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      data.success !== true
    ) {

      throw new Error(
        data.error ||
        "Comments load नहि भ' सकल"
      );

    }


    const comments =
      Array.isArray(
        data.comments
      )
        ? data.comments
        : [];


    if (
      comments.length === 0
    ) {


      list.innerHTML = `

        <div
          class="comment-empty"
        >
          एखन धरि कोनो स्वीकृत
          टिप्पणी नहि अछि।
        </div>

      `;


      return;

    }


    list.innerHTML =
      comments
        .map(
          comment => `

            <div
              class="comment-item"
            >

              <div>

                <span
                  class="comment-name"
                >
                  ${escapeHtml(
                    comment.name ||
                    "Anonymous"
                  )}
                </span>


                <span
                  class="comment-date"
                >
                  ${formatCommentDate(
                    comment.created_at
                  )}
                </span>

              </div>


              <div
                class="comment-text"
              >
                ${escapeHtml(
                  comment.comment ||
                  ""
                )}
              </div>

            </div>

          `
        )
        .join("");


  } catch (error) {


    console.error(
      "COMMENTS ERROR:",
      error
    );


    list.innerHTML = `

      <div
        style="
          color:#b00000;
          font-size:12px;
        "
      >
        टिप्पणी लोड नहि भ' सकल।
      </div>

    `;

  }

}


/* =====================================================
   SUBMIT COMMENT
===================================================== */

const commentForm =
  document.getElementById(
    "commentForm"
  );


if (commentForm) {


  commentForm.addEventListener(
    "submit",
    async function(event) {


      event.preventDefault();


      const button =
        document.getElementById(
          "commentButton"
        );


      const message =
        document.getElementById(
          "commentMessage"
        );


      const name =
        document.getElementById(
          "commentName"
        )
        .value
        .trim();


      const email =
        document.getElementById(
          "commentEmail"
        )
        .value
        .trim();


      const mobile =
        document.getElementById(
          "commentMobile"
        )
        .value
        .trim();


      const comment =
        document.getElementById(
          "commentText"
        )
        .value
        .trim();


      if (
        !name ||
        !email ||
        !mobile ||
        !comment
      ) {


        message.textContent =
          "सभ field भरब जरूरी अछि।";


        message.style.display =
          "block";


        message.style.background =
          "#fff0f0";


        message.style.color =
          "#b00020";


        return;

      }


      button.disabled =
        true;


      button.textContent =
        "भेजल जा रहल अछि...";


      message.style.display =
        "none";


      try {


        const response =
          await fetch(
            "/api/comments",
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json",

                "Accept":
                  "application/json"

              },

              body:
                JSON.stringify({

                  news_id:
                    NEWS_ID,

                  name:
                    name,

                  email:
                    email,

                  mobile:
                    mobile,

                  comment:
                    comment

                })

            }
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          data.success !== true
        ) {


          throw new Error(
            data.error ||
            "Comment भेजल नहि जा सकल"
          );

        }


        commentForm.reset();


        message.textContent =
          data.message ||
          "अहाँक टिप्पणी प्राप्त भ' गेल। Admin approval के बाद प्रकाशित होयत।";


        message.style.display =
          "block";


        message.style.background =
          "#edf8ef";


        message.style.color =
          "#176b2c";


      } catch (error) {


        console.error(
          "SUBMIT COMMENT ERROR:",
          error
        );


        message.textContent =
          error.message ||
          "Comment भेजल नहि जा सकल।";


        message.style.display =
          "block";


        message.style.background =
          "#fff0f0";


        message.style.color =
          "#b00020";


      } finally {


        button.disabled =
          false;


        button.textContent =
          "टिप्पणी भेजू";

      }

    }
  );

}


/* =====================================================
   DATE
===================================================== */

function formatCommentDate(
  value
) {


  if (!value) {

    return "";

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  return date.toLocaleDateString(
    "hi-IN",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric"
    }
  );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

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


/* =====================================================
   LOAD COMMENTS
===================================================== */

loadComments();


</script>


</body>

</html>

`;


/* =====================================================
   RESPONSE
===================================================== */

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


/* ======================================================
   FORMAT CONTENT
====================================================== */

function formatContent(
  text
) {


  const value =
    String(
      text || ""
    )
    .trim();


  if (!value) {

    return "";

  }


  return value

    .split(
      /\n\s*\n/
    )

    .map(
      paragraph =>
        `<p>${escapeHtml(
          paragraph.trim()
        )}</p>`
    )

    .join("");

}


/* ======================================================
   ESCAPE HTML
====================================================== */

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


/* ======================================================
   DATE
====================================================== */

function formatDate(
  value
) {


  if (!value) {

    return "";

  }


  try {


    return new Date(
      value
    )
      .toLocaleDateString(
        "hi-IN",
        {

          day:
            "numeric",

          month:
            "long",

          year:
            "numeric"

        }
      );


  } catch {


    return "";

  }

}
