/* =========================================================
   dashboard-overview.js
   Professional Admin Dashboard Overview
========================================================= */

(function () {

  let dashboardData = {
    news: [],
    categories: [],
    tags: [],
    users: []
  };


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createDashboardStyles();

      loadDashboardOverview();

    }
  );


  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  async function loadDashboardOverview() {

    const container =
      document.getElementById(
        "dashboardOverview"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      `
        <div class="dashboard-loading">
          Dashboard लोड भ' रहल अछि...
        </div>
      `;


    try {

      const results =
        await Promise.allSettled([

          fetch(
            "/api/news?limit=100"
          ).then(
            response =>
              response.json()
          ),

          fetch(
            "/api/categories?status=active"
          ).then(
            response =>
              response.json()
          ),

          fetch(
            "/api/tags?status=active"
          ).then(
            response =>
              response.json()
          ),

          fetch(
            "/api/users"
          ).then(
            response =>
              response.json()
          )

        ]);


      const newsResult =
        results[0];


      const categoryResult =
        results[1];


      const tagResult =
        results[2];


      const userResult =
        results[3];


      dashboardData.news =
        newsResult.status ===
        "fulfilled" &&
        newsResult.value?.success
          ? (
              newsResult.value.news ||
              []
            )
          : [];


      dashboardData.categories =
        categoryResult.status ===
        "fulfilled" &&
        categoryResult.value?.success
          ? (
              categoryResult.value.categories ||
              []
            )
          : [];


      dashboardData.tags =
        tagResult.status ===
        "fulfilled" &&
        tagResult.value?.success
          ? (
              tagResult.value.tags ||
              []
            )
          : [];


      dashboardData.users =
        userResult.status ===
        "fulfilled" &&
        userResult.value?.success
          ? (
              userResult.value.users ||
              []
            )
          : [];


      renderDashboardOverview();


    } catch (
      error
    ) {

      console.error(
        "DASHBOARD:",
        error
      );


      container.innerHTML =
        `
          <div class="dashboard-error">

            Dashboard load नहि भ' सकल।

            <br><br>

            <button
              class="dashboard-retry"
              onclick="
                window.loadDashboardOverview()
              "
            >
              ↻ फेर कोशिश करू
            </button>

          </div>
        `;

    }

  }


  window.loadDashboardOverview =
    loadDashboardOverview;


  /* =======================================================
     RENDER
  ======================================================= */

  function renderDashboardOverview() {

    const container =
      document.getElementById(
        "dashboardOverview"
      );


    if (!container) {
      return;
    }


    const news =
      dashboardData.news;


    const categories =
      dashboardData.categories;


    const tags =
      dashboardData.tags;


    const users =
      dashboardData.users;


    const totalNews =
      news.length;


    const published =
      news.filter(
        item =>
          String(
            item.status
          ).toLowerCase() ===
          "published"
      ).length;


    const drafts =
      news.filter(
        item =>
          String(
            item.status
          ).toLowerCase() ===
          "draft"
      ).length;


    const archived =
      news.filter(
        item =>
          String(
            item.status
          ).toLowerCase() ===
          "archived"
      ).length;


    const totalViews =
      news.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views ||
            0
          ),
        0
      );


    const featured =
      news.filter(
        item =>
          Number(
            item.featured ||
            0
          ) === 1
      ).length;


    const recentNews =
      news
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              b.created_at ||
              b.published_at ||
              0
            ) -
            new Date(
              a.created_at ||
              a.published_at ||
              0
            )
        )
        .slice(
          0,
          6
        );


    container.innerHTML =
      `

        <!-- =========================================
             STATISTICS
        ========================================== -->

        <div class="dashboard-stats">


          ${createStatCard(
            "📰",
            "कुल समाचार",
            totalNews,
            "all"
          )}


          ${createStatCard(
            "✓",
            "Published",
            published,
            "published"
          )}


          ${createStatCard(
            "📝",
            "Draft",
            drafts,
            "draft"
          )}


          ${createStatCard(
            "👁",
            "कुल Views",
            formatNumber(
              totalViews
            ),
            "views"
          )}


          ${createStatCard(
            "📂",
            "Categories",
            categories.length,
            "categories"
          )}


          ${createStatCard(
            "🏷",
            "Tags",
            tags.length,
            "tags"
          )}

        </div>


        <!-- =========================================
             QUICK ACTIONS
        ========================================== -->

        <div class="dashboard-card">

          <div class="dashboard-card-header">

            <div>

              <div
                class="dashboard-card-title"
              >
                Quick Actions
              </div>

              <div
                class="dashboard-card-subtitle"
              >
                बार-बार उपयोग होम वाला काम
              </div>

            </div>

          </div>


          <div class="quick-actions">


            <button
              class="quick-action"
              onclick="
                window.openNewsEditor()
              "
            >

              <span
                class="quick-icon"
              >
                📰
              </span>

              <span>

                <strong>
                  नया समाचार
                </strong>

                <small>
                  News publish करू
                </small>

              </span>

            </button>


            <button
              class="quick-action"
              onclick="
                window.openCategoryEditor()
              "
            >

              <span
                class="quick-icon"
              >
                📂
              </span>

              <span>

                <strong>
                  Category
                </strong>

                <small>
                  नई श्रेणी जोड़ू
                </small>

              </span>

            </button>


            <button
              class="quick-action"
              onclick="
                window.openTagManager()
              "
            >

              <span
                class="quick-icon"
              >
                🏷️
              </span>

              <span>

                <strong>
                  Tag
                </strong>

                <small>
                  नया Tag जोड़ू
                </small>

              </span>

            </button>


            <button
              class="quick-action"
              onclick="
                window.openMenuManager()
              "
            >

              <span
                class="quick-icon"
              >
                🧭
              </span>

              <span>

                <strong>
                  Menu
                </strong>

                <small>
                  Website menu manage करू
                </small>

              </span>

            </button>


            <button
              class="quick-action"
              onclick="
                window.openMediaModal()
              "
            >

              <span
                class="quick-icon"
              >
                🖼️
              </span>

              <span>

                <strong>
                  Media
                </strong>

                <small>
                  Image जोड़ू
                </small>

              </span>

            </button>


            <button
              class="quick-action"
              onclick="
                window.openUserManager()
              "
            >

              <span
                class="quick-icon"
              >
                👤
              </span>

              <span>

                <strong>
                  User
                </strong>

                <small>
                  User manage करू
                </small>

              </span>

            </button>


          </div>

        </div>


        <!-- =========================================
             RECENT + SIDE
        ========================================== -->

        <div class="dashboard-columns">


          <!-- RECENT NEWS -->

          <div class="dashboard-card">

            <div
              class="dashboard-card-header"
            >

              <div>

                <div
                  class="dashboard-card-title"
                >
                  हालक समाचार
                </div>

                <div
                  class="dashboard-card-subtitle"
                >
                  हाल में जोड़ल गेल समाचार
                </div>

              </div>


              <button
                class="dashboard-view-btn"
                onclick="
                  window.showAdminSection &&
                  window.showAdminSection(
                    'news'
                  )
                "
              >
                सभ देखू →
              </button>

            </div>


            <div
              class="recent-news-list"
            >

              ${
                recentNews.length
                  ? recentNews
                      .map(
                        createRecentNews
                      )
                      .join("")
                  : `
                      <div
                        class="dashboard-empty"
                      >
                        एखन कोनो समाचार नहि अछि।
                      </div>
                    `
              }

            </div>

          </div>


          <!-- RIGHT SIDE -->

          <div>


            <div class="dashboard-card">

              <div
                class="dashboard-card-header"
              >

                <div>

                  <div
                    class="dashboard-card-title"
                  >
                    Content Summary
                  </div>

                </div>

              </div>


              <div
                class="summary-list"
              >

                <div
                  class="summary-row"
                >

                  <span>
                    Published
                  </span>

                  <strong>
                    ${published}
                  </strong>

                </div>


                <div
                  class="summary-row"
                >

                  <span>
                    Draft
                  </span>

                  <strong>
                    ${drafts}
                  </strong>

                </div>


                <div
                  class="summary-row"
                >

                  <span>
                    Archived
                  </span>

                  <strong>
                    ${archived}
                  </strong>

                </div>


                <div
                  class="summary-row"
                >

                  <span>
                    Featured
                  </span>

                  <strong>
                    ${featured}
                  </strong>

                </div>


                <div
                  class="summary-row"
                >

                  <span>
                    Categories
                  </span>

                  <strong>
                    ${categories.length}
                  </strong>

                </div>


                <div
                  class="summary-row"
                >

                  <span>
                    Tags
                  </span>

                  <strong>
                    ${tags.length}
                  </strong>

                </div>


                <div
                  class="summary-row"
                >

                  <span>
                    Users
                  </span>

                  <strong>
                    ${users.length}
                  </strong>

                </div>

              </div>

            </div>


            <div
              class="dashboard-card system-card"
            >

              <div
                class="dashboard-card-title"
              >
                System Status
              </div>


              <div
                class="system-status-row"
              >

                <span>
                  Website
                </span>

                <span
                  class="status-online"
                >
                  ● Online
                </span>

              </div>


              <div
                class="system-status-row"
              >

                <span>
                  News API
                </span>

                <span
                  class="status-online"
                >
                  ● Connected
                </span>

              </div>


              <div
                class="system-status-row"
              >

                <span>
                  Dashboard
                </span>

                <span
                  class="status-online"
                >
                  ● Ready
                </span>

              </div>

            </div>


          </div>


        </div>

      `;

  }


  /* =======================================================
     STAT CARD
  ======================================================= */

  function createStatCard(
    icon,
    title,
    value,
    type
  ) {

    return `

      <div
        class="
          dashboard-stat
          ${type}
        "
      >

        <div
          class="stat-icon"
        >
          ${icon}
        </div>


        <div>

          <div
            class="stat-value"
          >
            ${value}
          </div>

          <div
            class="stat-title"
          >
            ${title}
          </div>

        </div>

      </div>

    `;

  }


  /* =======================================================
     RECENT NEWS
  ======================================================= */

  function createRecentNews(
    news
  ) {

    const status =
      String(
        news.status ||
        ""
      ).toLowerCase();


    return `

      <div
        class="recent-news-item"
      >


        <div
          class="recent-news-image"
        >

          ${
            news.image_url

              ? `
                <img
                  src="${escapeHtml(
                    news.image_url
                  )}"
                  alt=""
                  loading="lazy"
                >
              `

              : `
                <span>
                  📰
                </span>
              `
          }

        </div>


        <div
          class="recent-news-info"
        >

          <div
            class="recent-news-title"
            title="${escapeHtml(
              news.title
            )}"
          >

            ${escapeHtml(
              news.title ||
              "बिना शीर्षक"
            )}

          </div>


          <div
            class="recent-news-meta"
          >

            ${
              news.category_name
                ? escapeHtml(
                    news.category_name
                  )
                : "Uncategorized"
            }

            ·

            ${
              formatDate(
                news.created_at ||
                news.published_at
              )
            }

          </div>

        </div>


        <span
          class="
            recent-status
            ${escapeHtml(
              status
            )}
          "
        >
          ${escapeHtml(
            status ||
            "unknown"
          )}
        </span>


        <button
          class="recent-edit"
          onclick="
            window.openNewsEditorEdit(
              ${Number(
                news.id
              )}
            )
          "
          title="Edit"
        >
          ✏️
        </button>


      </div>

    `;

  }


  /* =======================================================
     STYLES
  ======================================================= */

  function createDashboardStyles() {

    if (
      document.getElementById(
        "dashboardOverviewStyles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "dashboardOverviewStyles";


    style.textContent = `

      .dashboard-loading,
      .dashboard-error,
      .dashboard-empty {
        padding:40px;
        text-align:center;
        color:#999;
        font-size:12px;
      }

      .dashboard-error {
        color:#a00000;
      }

      .dashboard-retry {
        height:35px;
        padding:0 14px;
        border:1px solid #ddd;
        border-radius:7px;
        background:#fff;
        cursor:pointer;
      }

      .dashboard-stats {
        display:grid;
        grid-template-columns:
          repeat(6,minmax(0,1fr));
        gap:12px;
        margin-bottom:15px;
      }

      .dashboard-stat {
        min-width:0;
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:15px;
        display:flex;
        align-items:center;
        gap:11px;
      }

      .stat-icon {
        width:38px;
        height:38px;
        border-radius:9px;
        background:#f6f6f6;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:17px;
        flex:none;
      }

      .stat-value {
        font-size:21px;
        font-weight:900;
        line-height:1;
      }

      .stat-title {
        margin-top:5px;
        color:#888;
        font-size:9px;
        white-space:nowrap;
      }

      .dashboard-card {
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        margin-bottom:15px;
        overflow:hidden;
      }

      .dashboard-card-header {
        padding:15px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        border-bottom:1px solid #eee;
      }

      .dashboard-card-title {
        font-size:13px;
        font-weight:800;
      }

      .dashboard-card-subtitle {
        margin-top:3px;
        color:#999;
        font-size:9px;
      }

      .dashboard-view-btn {
        border:0;
        background:none;
        color:#8b0000;
        font-size:10px;
        font-weight:700;
        cursor:pointer;
      }

      .quick-actions {
        display:grid;
        grid-template-columns:
          repeat(3,minmax(0,1fr));
        gap:10px;
        padding:15px;
      }

      .quick-action {
        border:1px solid #e5e7eb;
        background:#fff;
        border-radius:8px;
        padding:11px;
        display:flex;
        align-items:center;
        gap:9px;
        text-align:left;
        cursor:pointer;
      }

      .quick-action:hover {
        border-color:#bbb;
        background:#fafafa;
      }

      .quick-icon {
        width:32px;
        height:32px;
        border-radius:7px;
        background:#f6f6f6;
        display:flex;
        align-items:center;
        justify-content:center;
        flex:none;
      }

      .quick-action strong {
        display:block;
        font-size:10px;
      }

      .quick-action small {
        display:block;
        margin-top:3px;
        color:#999;
        font-size:8px;
      }

      .dashboard-columns {
        display:grid;
        grid-template-columns:
          minmax(0,2fr)
          minmax(280px,1fr);
        gap:15px;
      }

      .recent-news-list {
        padding:5px 15px 10px;
      }

      .recent-news-item {
        display:flex;
        align-items:center;
        gap:9px;
        padding:9px 0;
        border-bottom:1px solid #eee;
      }

      .recent-news-item:last-child {
        border-bottom:0;
      }

      .recent-news-image {
        width:43px;
        height:38px;
        flex:none;
        border-radius:6px;
        background:#f3f3f3;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      }

      .recent-news-image img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .recent-news-info {
        min-width:0;
        flex:1;
      }

      .recent-news-title {
        font-size:10px;
        font-weight:700;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .recent-news-meta {
        color:#999;
        font-size:8px;
        margin-top:3px;
      }

      .recent-status {
        font-size:8px;
        font-weight:700;
        padding:4px 6px;
        border-radius:10px;
        background:#eee;
      }

      .recent-status.published {
        background:#eaf7ef;
        color:#19713b;
      }

      .recent-status.draft {
        background:#fff5df;
        color:#936500;
      }

      .recent-status.archived {
        background:#f1f1f1;
        color:#777;
      }

      .recent-edit {
        border:0;
        background:none;
        cursor:pointer;
        font-size:11px;
      }

      .summary-list {
        padding:5px 15px 10px;
      }

      .summary-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:9px 0;
        border-bottom:1px solid #eee;
        font-size:10px;
      }

      .summary-row:last-child {
        border-bottom:0;
      }

      .summary-row span {
        color:#777;
      }

      .summary-row strong {
        font-size:11px;
      }

      .system-card {
        padding:15px;
      }

      .system-status-row {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:8px 0;
        border-bottom:1px solid #eee;
        font-size:10px;
      }

      .system-status-row:last-child {
        border-bottom:0;
      }

      .status-online {
        color:#16803c;
        font-weight:700;
      }

      @media(max-width:1100px) {

        .dashboard-stats {
          grid-template-columns:
            repeat(3,minmax(0,1fr));
        }

      }

      @media(max-width:800px) {

        .dashboard-columns {
          grid-template-columns:1fr;
        }

        .quick-actions {
          grid-template-columns:
            repeat(2,minmax(0,1fr));
        }

      }

      @media(max-width:500px) {

        .dashboard-stats {
          grid-template-columns:
            repeat(2,minmax(0,1fr));
        }

        .quick-actions {
          grid-template-columns:1fr;
        }

        .dashboard-stat {
          padding:11px;
        }

        .stat-value {
          font-size:18px;
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

  function formatNumber(
    number
  ) {

    return Number(
      number || 0
    ).toLocaleString(
      "en-IN"
    );

  }


  function formatDate(
    value
  ) {

    if (!value) {
      return "—";
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

      return "—";

    }


    return date.toLocaleDateString(
      "en-IN",
      {
        day:"2-digit",
        month:"short",
        year:"numeric"
      }
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
