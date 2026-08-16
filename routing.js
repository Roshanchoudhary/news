/* =========================================================
   routing.js
   Professional SEO Friendly Routing
========================================================= */

(function () {

  "use strict";


  /* =======================================================
     ROUTE INFORMATION
  ======================================================= */

  function getRoute() {

    const path =
      window.location.pathname
        .replace(
          /\/+/g,
          "/"
        )
        .replace(
          /\/$/,
          ""
        );


    const parts =
      path
        .split("/")
        .filter(Boolean);


    if (!parts.length) {

      return {
        type: "home",
        slug: null
      };

    }


    if (
      parts[0] ===
      "news"
    ) {

      return {

        type: "news",

        slug:
          parts
            .slice(1)
            .join("/")

      };

    }


    if (
      parts[0] ===
      "category"
    ) {

      return {

        type: "category",

        slug:
          parts
            .slice(1)
            .join("/")

      };

    }


    if (
      parts[0] ===
      "tag"
    ) {

      return {

        type: "tag",

        slug:
          parts
            .slice(1)
            .join("/")

      };

    }


    return {

      type: "unknown",

      slug:
        parts.join("/")

    };

  }


  window.getSiteRoute =
    getRoute;


  /* =======================================================
     INITIAL ROUTER
  ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      const route =
        getRoute();


      /*
       * Admin pages केँ router
       * सँ अलग राखब।
       */

      if (
        window.location.pathname
          .startsWith(
            "/admin"
          )
      ) {

        return;

      }


      if (
        route.type ===
        "news"
      ) {

        loadNewsPage(
          route.slug
        );

        return;

      }


      if (
        route.type ===
        "category"
      ) {

        loadCategoryPage(
          route.slug
        );

        return;

      }


      if (
        route.type ===
        "tag"
      ) {

        loadTagPage(
          route.slug
        );

        return;

      }

    }
  );


  /* =======================================================
     NEWS PAGE
  ======================================================= */

  async function loadNewsPage(
    slug
  ) {

    if (!slug) {

      showNotFound();

      return;

    }


    const app =
      getContentContainer();


    if (!app) {

      return;

    }


    showLoading(
      app
    );


    try {

      /*
       * IMPORTANT:
       *
       * slug केँ API में भेजैत छी।
       * ID नहि।
       */

      const response =
        await fetch(
          "/api/news?slug=" +
          encodeURIComponent(
            slug
          ),
          {
            credentials:
              "same-origin"
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "News not found"
        );

      }


      let news =
        data.news;


      /*
       * API एक object अथवा array
       * दुनू return कऽ सकैत अछि।
       */

      if (
        Array.isArray(
          news
        )
      ) {

        news =
          news[0];

      }


      if (!news) {

        showNotFound();

        return;

      }


      renderNewsPage(
        news
      );


      updateSEO(
        news
      );


      incrementViews(
        news.id
      );


    } catch (
      error
    ) {

      console.error(
        "NEWS ROUTE:",
        error
      );


      showNotFound();

    }

  }


  /* =======================================================
     RENDER NEWS
  ======================================================= */

  function renderNewsPage(
    news
  ) {

    const app =
      getContentContainer();


    if (!app) {
      return;
    }


    const title =
      news.title ||
      "";


    const summary =
      news.summary ||
      "";


    const content =
      news.content ||
      "";


    const category =
      news.category_name ||
      "";


    const categorySlug =
      news.category_slug ||
      "";


    const author =
      news.author_name ||
      "Admin";


    const date =
      formatDate(
        news.published_at ||
        news.created_at
      );


    const tags =
      Array.isArray(
        news.tags
      )
        ? news.tags
        : [];


    app.innerHTML =
      `

        <article
          class="public-news-page"
        >


          <div
            class="public-news-breadcrumb"
          >

            <a href="/">
              Home
            </a>

            <span>
              /
            </span>

            ${
              categorySlug

                ? `
                  <a
                    href="/category/${escapeHtml(
                      categorySlug
                    )}"
                  >
                    ${escapeHtml(
                      category
                    )}
                  </a>

                  <span>
                    /
                  </span>
                `

                : ""
            }

            <span>
              समाचार
            </span>

          </div>


          <header
            class="public-news-header"
          >

            ${
              category

                ? `
                  <a
                    class="public-news-category"
                    href="/category/${escapeHtml(
                      categorySlug
                    )}"
                  >
                    ${escapeHtml(
                      category
                    )}
                  </a>
                `

                : ""
            }


            <h1>
              ${escapeHtml(
                title
              )}
            </h1>


            ${
              summary

                ? `
                  <div
                    class="public-news-summary"
                  >
                    ${escapeHtml(
                      summary
                    )}
                  </div>
                `

                : ""
            }


            <div
              class="public-news-meta"
            >

              <span>
                ✍ ${escapeHtml(
                  author
                )}
              </span>

              <span>
                •
              </span>

              <time>
                ${date}
              </time>

            </div>

          </header>


          ${
            news.image_url

              ? `
                <figure
                  class="public-news-image"
                >

                  <img
                    src="${escapeHtml(
                      news.image_url
                    )}"
                    alt="${escapeHtml(
                      title
                    )}"
                  >

                </figure>
              `

              : ""
          }


          <div
            class="public-news-content"
          >

            ${formatNewsContent(
              content
            )}

          </div>


          ${
            tags.length

              ? `

                <div
                  class="public-news-tags"
                >

                  <strong>
                    Tags:
                  </strong>


                  ${tags
                    .map(
                      tag => `

                        <a
                          href="/tag/${escapeHtml(
                            tag.slug
                          )}"
                        >
                          #${escapeHtml(
                            tag.name
                          )}
                        </a>

                      `
                    )
                    .join("")}

                </div>

              `

              : ""
          }


        </article>

      `;


    applyPublicNewsStyles();

  }


  /* =======================================================
     CATEGORY PAGE
  ======================================================= */

  async function loadCategoryPage(
    slug
  ) {

    if (!slug) {

      showNotFound();

      return;

    }


    const app =
      getContentContainer();


    if (!app) {
      return;
    }


    showLoading(
      app
    );


    try {

      const response =
        await fetch(
          "/api/news?category_slug=" +
          encodeURIComponent(
            slug
          ) +
          "&status=published",
          {
            credentials:
              "same-origin"
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Category not found"
        );

      }


      const news =
        data.news ||
        [];


      const category =
        news.length
          ? news[0].category_name
          : prettifySlug(
              slug
            );


      renderArchivePage(
        category,
        news,
        "category",
        slug
      );


    } catch (
      error
    ) {

      console.error(
        "CATEGORY ROUTE:",
        error
      );


      showNotFound();

    }

  }


  /* =======================================================
     TAG PAGE
  ======================================================= */

  async function loadTagPage(
    slug
  ) {

    if (!slug) {

      showNotFound();

      return;

    }


    const app =
      getContentContainer();


    if (!app) {
      return;
    }


    showLoading(
      app
    );


    try {

      const response =
        await fetch(
          "/api/news?tag_slug=" +
          encodeURIComponent(
            slug
          ) +
          "&status=published",
          {
            credentials:
              "same-origin"
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Tag not found"
        );

      }


      const news =
        data.news ||
        [];


      renderArchivePage(
        "#" +
        prettifySlug(
          slug
        ),
        news,
        "tag",
        slug
      );


    } catch (
      error
    ) {

      console.error(
        "TAG ROUTE:",
        error
      );


      showNotFound();

    }

  }


  /* =======================================================
     ARCHIVE PAGE
  ======================================================= */

  function renderArchivePage(
    title,
    news,
    type,
    slug
  ) {

    const app =
      getContentContainer();


    if (!app) {
      return;
    }


    app.innerHTML =
      `

        <section
          class="public-archive"
        >

          <div
            class="public-news-breadcrumb"
          >

            <a href="/">
              Home
            </a>

            <span>
              /
            </span>

            <span>
              ${escapeHtml(
                title
              )}
            </span>

          </div>


          <header
            class="archive-header"
          >

            <h1>
              ${escapeHtml(
                title
              )}
            </h1>

            <div
              class="archive-count"
            >
              ${news.length}
              समाचार
            </div>

          </header>


          ${
            news.length

              ? `

                <div
                  class="archive-grid"
                >

                  ${news
                    .map(
                      createNewsCard
                    )
                    .join("")}

                </div>

              `

              : `

                <div
                  class="archive-empty"
                >

                  एहि ठाम एखन कोनो
                  प्रकाशित समाचार नहि अछि।

                </div>

              `
          }


        </section>

      `;


    applyPublicNewsStyles();

  }


  /* =======================================================
     NEWS CARD
  ======================================================= */

  function createNewsCard(
    news
  ) {

    return `

      <article
        class="archive-card"
      >

        ${
          news.image_url

            ? `
              <a
                href="/news/${escapeHtml(
                  news.slug
                )}"
                class="archive-card-image"
              >

                <img
                  src="${escapeHtml(
                    news.image_url
                  )}"
                  alt="${escapeHtml(
                    news.title
                  )}"
                  loading="lazy"
                >

              </a>
            `

            : `
              <a
                href="/news/${escapeHtml(
                  news.slug
                )}"
                class="archive-card-image no-image"
              >
                📰
              </a>
            `
        }


        <div
          class="archive-card-body"
        >

          <div
            class="archive-card-meta"
          >

            ${formatDate(
              news.published_at ||
              news.created_at
            )}

          </div>


          <h2>

            <a
              href="/news/${escapeHtml(
                news.slug
              )}"
            >

              ${escapeHtml(
                news.title ||
                ""
              )}

            </a>

          </h2>


          ${
            news.summary

              ? `
                <p>
                  ${escapeHtml(
                    news.summary
                  )}
                </p>
              `

              : ""
          }

        </div>

      </article>

    `;

  }


  /* =======================================================
     VIEW COUNT
  ======================================================= */

  async function incrementViews(
    id
  ) {

    if (!id) {
      return;
    }


    try {

      await fetch(
        "/api/news/view",
        {

          method:
            "POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              id
            })

        }
      );

    } catch {

      /*
       * View count fail होय तँ
       * article रोकब नहि।
       */

    }

  }


  /* =======================================================
     SEO
  ======================================================= */

  function updateSEO(
    news
  ) {

    const title =
      news.seo_title ||
      news.title ||
      "समाचार";


    const description =
      news.seo_description ||
      news.summary ||
      "";


    document.title =
      title;


    setMeta(
      "description",
      description
    );


    setMeta(
      "og:title",
      title,
      "property"
    );


    setMeta(
      "og:description",
      description,
      "property"
    );


    if (
      news.image_url
    ) {

      setMeta(
        "og:image",
        news.image_url,
        "property"
      );

    }


    setCanonical(
      window.location.href
    );

  }


  function setMeta(
    name,
    content,
    attribute = "name"
  ) {

    if (!content) {
      return;
    }


    let meta =
      document.querySelector(
        `meta[${attribute}="${name}"]`
      );


    if (!meta) {

      meta =
        document.createElement(
          "meta"
        );


      meta.setAttribute(
        attribute,
        name
      );


      document.head.appendChild(
        meta
      );

    }


    meta.setAttribute(
      "content",
      content
    );

  }


  function setCanonical(
    url
  ) {

    let link =
      document.querySelector(
        'link[rel="canonical"]'
      );


    if (!link) {

      link =
        document.createElement(
          "link"
        );


      link.rel =
        "canonical";


      document.head.appendChild(
        link
      );

    }


    link.href =
      url;

  }


  /* =======================================================
     CONTENT
  ======================================================= */

  function formatNewsContent(
    content
  ) {

    if (!content) {
      return "";
    }


    /*
     * यदि content में HTML अछि,
     * तऽ trusted CMS content के रूप में
     * render करैत छी।
     */

    if (
      /<[a-z][\s\S]*>/i.test(
        content
      )
    ) {

      return content;

    }


    return String(
      content
    )
      .split(
        /\n{2,}/
      )
      .map(
        paragraph =>
          `<p>${escapeHtml(
            paragraph
          ).replace(
            /\n/g,
            "<br>"
          )}</p>`
      )
      .join("");

  }


  /* =======================================================
     CONTAINER
  ======================================================= */

  function getContentContainer() {

    return (
      document.getElementById(
        "app"
      ) ||
      document.getElementById(
        "main-content"
      ) ||
      document.getElementById(
        "content"
      ) ||
      document.querySelector(
        "main"
      )
    );

  }


  /* =======================================================
     LOADING
  ======================================================= */

  function showLoading(
    container
  ) {

    container.innerHTML =
      `

        <div
          class="route-loading"
        >

          <div
            class="route-spinner"
          ></div>

          <div>
            समाचार लोड भ' रहल अछि...
          </div>

        </div>

      `;


    applyPublicNewsStyles();

  }


  /* =======================================================
     404
  ======================================================= */

  function showNotFound() {

    const app =
      getContentContainer();


    if (!app) {
      return;
    }


    app.innerHTML =
      `

        <section
          class="route-404"
        >

          <div
            class="route-404-code"
          >
            404
          </div>


          <h1>
            Page नहि भेटल
          </h1>


          <p>
            जे समाचार अथवा page अहाँ खोजि रहल छी,
            से उपलब्ध नहि अछि।
          </p>


          <a
            href="/"
            class="route-home-btn"
          >
            ← Home पर जाउ
          </a>

        </section>

      `;


    document.title =
      "Page Not Found";


    applyPublicNewsStyles();

  }


  /* =======================================================
     STYLES
  ======================================================= */

  function applyPublicNewsStyles() {

    if (
      document.getElementById(
        "publicRoutingStyles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "publicRoutingStyles";


    style.textContent = `

      .route-loading {
        min-height:45vh;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:12px;
        color:#888;
        font-size:13px;
      }

      .route-spinner {
        width:28px;
        height:28px;
        border:3px solid #eee;
        border-top-color:#8b0000;
        border-radius:50%;
        animation:
          routeSpin .8s linear infinite;
      }

      @keyframes routeSpin {
        to {
          transform:rotate(360deg);
        }
      }

      .public-news-page {
        max-width:900px;
        margin:0 auto;
        padding:25px 18px 60px;
      }

      .public-news-breadcrumb {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        color:#999;
        font-size:11px;
        margin-bottom:22px;
      }

      .public-news-breadcrumb a {
        color:#8b0000;
        text-decoration:none;
      }

      .public-news-category {
        display:inline-block;
        color:#8b0000;
        text-decoration:none;
        font-size:11px;
        font-weight:800;
        margin-bottom:10px;
      }

      .public-news-header h1 {
        font-size:clamp(
          26px,
          4vw,
          44px
        );
        line-height:1.2;
        margin:0;
        font-weight:900;
      }

      .public-news-summary {
        margin-top:16px;
        font-size:16px;
        line-height:1.7;
        color:#666;
      }

      .public-news-meta {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:17px;
        color:#888;
        font-size:11px;
      }

      .public-news-image {
        margin:28px 0;
        border-radius:10px;
        overflow:hidden;
        background:#f5f5f5;
      }

      .public-news-image img {
        width:100%;
        max-height:600px;
        object-fit:cover;
        display:block;
      }

      .public-news-content {
        font-size:17px;
        line-height:1.9;
        color:#222;
      }

      .public-news-content p {
        margin:0 0 20px;
      }

      .public-news-content img {
        max-width:100%;
        height:auto;
        border-radius:8px;
      }

      .public-news-content h2,
      .public-news-content h3 {
        margin-top:30px;
        line-height:1.35;
      }

      .public-news-tags {
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        align-items:center;
        margin-top:35px;
        padding-top:20px;
        border-top:1px solid #eee;
        font-size:11px;
      }

      .public-news-tags a {
        text-decoration:none;
        color:#8b0000;
        background:#f8eeee;
        padding:6px 9px;
        border-radius:15px;
      }

      .public-archive {
        max-width:1100px;
        margin:0 auto;
        padding:25px 18px 60px;
      }

      .archive-header {
        margin-bottom:25px;
      }

      .archive-header h1 {
        font-size:30px;
        margin:0;
      }

      .archive-count {
        color:#999;
        font-size:11px;
        margin-top:5px;
      }

      .archive-grid {
        display:grid;
        grid-template-columns:
          repeat(3,minmax(0,1fr));
        gap:18px;
      }

      .archive-card {
        border:1px solid #e5e5e5;
        border-radius:10px;
        overflow:hidden;
        background:#fff;
      }

      .archive-card-image {
        display:flex;
        width:100%;
        aspect-ratio:16/9;
        background:#f4f4f4;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        text-decoration:none;
        font-size:25px;
      }

      .archive-card-image img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .archive-card-body {
        padding:13px;
      }

      .archive-card-meta {
        color:#999;
        font-size:9px;
      }

      .archive-card h2 {
        margin:7px 0;
        font-size:16px;
        line-height:1.4;
      }

      .archive-card h2 a {
        color:#222;
        text-decoration:none;
      }

      .archive-card p {
        margin:7px 0 0;
        color:#777;
        font-size:11px;
        line-height:1.6;
      }

      .archive-empty {
        padding:60px 20px;
        text-align:center;
        color:#999;
      }

      .route-404 {
        min-height:60vh;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:30px;
      }

      .route-404-code {
        font-size:80px;
        line-height:1;
        font-weight:900;
        color:#ddd;
      }

      .route-404 h1 {
        margin:12px 0 7px;
        font-size:25px;
      }

      .route-404 p {
        color:#888;
        font-size:13px;
      }

      .route-home-btn {
        margin-top:15px;
        background:#8b0000;
        color:#fff;
        text-decoration:none;
        padding:10px 15px;
        border-radius:7px;
        font-size:12px;
        font-weight:700;
      }

      @media(max-width:800px) {

        .archive-grid {
          grid-template-columns:
            repeat(2,minmax(0,1fr));
        }

      }

      @media(max-width:550px) {

        .public-news-page {
          padding:
            18px 14px 45px;
        }

        .public-news-content {
          font-size:16px;
        }

        .archive-grid {
          grid-template-columns:1fr;
        }

        .route-404-code {
          font-size:60px;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  /* =======================================================
     HELPERS
  ======================================================= */

  function formatDate(
    value
  ) {

    if (!value) {
      return "";
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    return date.toLocaleDateString(
      "en-IN",
      {
        day:"2-digit",
        month:"long",
        year:"numeric"
      }
    );

  }


  function prettifySlug(
    slug
  ) {

    return String(
      slug ||
      ""
    )
      .replace(
        /-/g,
        " "
      )
      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );

  }


  function escapeHtml(
    value
  ) {

    return String(
      value ??
      ""
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


})();
