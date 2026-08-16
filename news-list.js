/* =========================================================
   news-list.js
   Professional News Management
========================================================= */

(function () {

  let newsItems = [];
  let currentPage = 1;
  let totalPages = 1;
  let selectedIds = new Set();

  const PAGE_SIZE = 15;


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createNewsListStyles();

      initNewsList();

    }
  );


  /* =======================================================
     INIT
  ======================================================= */

  function initNewsList() {

    const container =
      document.getElementById(
        "newsListContainer"
      );


    if (!container) {
      return;
    }


    const search =
      document.getElementById(
        "newsListSearch"
      );


    if (search) {

      search.addEventListener(
        "input",
        debounce(
          function () {

            currentPage = 1;

            loadNewsList();

          },
          350
        )
      );

    }


    [
      "newsStatusFilter",
      "newsCategoryFilter",
      "newsDateFilter"
    ]
      .forEach(
        id => {

          const element =
            document.getElementById(
              id
            );


          if (element) {

            element.addEventListener(
              "change",
              function () {

                currentPage = 1;

                loadNewsList();

              }
            );

          }

        }
      );


    const selectAll =
      document.getElementById(
        "newsSelectAll"
      );


    if (selectAll) {

      selectAll.addEventListener(
        "change",
        function () {

          toggleSelectAll(
            this.checked
          );

        }
      );

    }


    loadNewsList();

  }


  /* =======================================================
     LOAD NEWS
  ======================================================= */

  async function loadNewsList() {

    const container =
      document.getElementById(
        "newsListContainer"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      `
        <div class="news-list-loading">
          समाचार लोड भ' रहल अछि...
        </div>
      `;


    try {

      const params =
        new URLSearchParams();


      params.set(
        "page",
        currentPage
      );


      params.set(
        "limit",
        PAGE_SIZE
      );


      const search =
        document.getElementById(
          "newsListSearch"
        )?.value
        ?.trim();


      const status =
        document.getElementById(
          "newsStatusFilter"
        )?.value;


      const category =
        document.getElementById(
          "newsCategoryFilter"
        )?.value;


      const date =
        document.getElementById(
          "newsDateFilter"
        )?.value;


      if (search) {

        params.set(
          "search",
          search
        );

      }


      if (
        status &&
        status !== "all"
      ) {

        params.set(
          "status",
          status
        );

      }


      if (
        category &&
        category !== "all"
      ) {

        params.set(
          "category_id",
          category
        );

      }


      if (
        date &&
        date !== "all"
      ) {

        params.set(
          "date",
          date
        );

      }


      const response =
        await fetch(
          "/api/news?" +
          params.toString(),
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
          "समाचार load नहि भेल"
        );

      }


      newsItems =
        data.news ||
        [];


      totalPages =
        Number(
          data.pagination?.pages ||
          1
        );


      renderNewsList();

      updateBulkBar();


    } catch (
      error
    ) {

      console.error(
        "NEWS LIST:",
        error
      );


      container.innerHTML =
        `

          <div class="news-list-error">

            समाचार load नहि भ' सकल।

            <br><br>

            <small>
              ${escapeHtml(
                error.message
              )}
            </small>

            <br><br>

            <button
              class="news-list-retry"
              onclick="
                window.loadNewsList()
              "
            >
              ↻ फेर कोशिश करू
            </button>

          </div>

        `;

    }

  }


  window.loadNewsList =
    loadNewsList;


  /* =======================================================
     RENDER
  ======================================================= */

  function renderNewsList() {

    const container =
      document.getElementById(
        "newsListContainer"
      );


    if (!container) {
      return;
    }


    if (
      !newsItems.length
    ) {

      container.innerHTML =
        `

          <div class="news-list-empty">

            📰

            <br><br>

            एहि filter में कोनो समाचार नहि भेटल।

          </div>

        `;


      renderPagination();

      return;

    }


    container.innerHTML =
      `

        <div class="news-table-wrap">

          <table
            class="news-table"
          >

            <thead>

              <tr>

                <th
                  class="news-check-column"
                >

                  <input
                    type="checkbox"
                    id="newsSelectAll"
                  >

                </th>

                <th>
                  समाचार
                </th>

                <th>
                  Category
                </th>

                <th>
                  Status
                </th>

                <th>
                  Views
                </th>

                <th>
                  Date
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>


            <tbody>

              ${newsItems
                .map(
                  createNewsRow
                )
                .join("")}

            </tbody>

          </table>

        </div>


        <div
          id="newsPagination"
        ></div>

      `;


    const selectAll =
      document.getElementById(
        "newsSelectAll"
      );


    if (selectAll) {

      selectAll.checked =
        newsItems.length > 0 &&
        newsItems.every(
          item =>
            selectedIds.has(
              String(
                item.id
              )
            )
        );

    }


    renderPagination();

  }


  /* =======================================================
     NEWS ROW
  ======================================================= */

  function createNewsRow(
    news
  ) {

    const id =
      String(
        news.id
      );


    const selected =
      selectedIds.has(
        id
      );


    const status =
      String(
        news.status ||
        "draft"
      ).toLowerCase();


    return `

      <tr>

        <td
          class="news-check-column"
        >

          <input
            type="checkbox"
            class="news-row-check"
            value="${escapeHtml(
              id
            )}"
            ${
              selected
                ? "checked"
                : ""
            }
            onchange="
              window.toggleNewsSelection(
                '${encodeURIComponent(
                  id
                )}',
                this.checked
              )
            "
          >

        </td>


        <td>

          <div
            class="news-title-cell"
          >

            <div
              class="news-thumbnail"
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
              class="news-title-info"
            >

              <div
                class="news-title"
                title="${escapeHtml(
                  news.title ||
                  ""
                )}"
              >

                ${escapeHtml(
                  news.title ||
                  "बिना शीर्षक"
                )}

              </div>


              <div
                class="news-slug"
              >

                /news/
                ${escapeHtml(
                  news.slug ||
                  ""
                )}

              </div>

            </div>

          </div>

        </td>


        <td>

          <span
            class="news-category"
          >
            ${escapeHtml(
              news.category_name ||
              "—"
            )}
          </span>

        </td>


        <td>

          <span
            class="
              news-status
              ${escapeHtml(
                status
              )}
            "
          >

            ${statusLabel(
              status
            )}

          </span>

        </td>


        <td>

          <span
            class="news-views"
          >
            👁
            ${formatNumber(
              news.views
            )}
          </span>

        </td>


        <td>

          <div
            class="news-date"
          >

            ${formatDate(
              news.published_at ||
              news.created_at
            )}

          </div>

        </td>


        <td>

          <div
            class="news-actions"
          >

            <button
              class="news-action-btn"
              title="Edit"
              onclick="
                window.editNewsItem(
                  '${encodeURIComponent(
                    id
                  )}'
                )
              "
            >
              ✏️
            </button>


            <button
              class="news-action-btn"
              title="View"
              onclick="
                window.viewNewsItem(
                  '${encodeURIComponent(
                    news.slug ||
                    ""
                  )}'
                )
              "
            >
              👁
            </button>


            <button
              class="
                news-action-btn
                danger
              "
              title="Delete"
              onclick="
                window.deleteNewsItem(
                  '${encodeURIComponent(
                    id
                  )}'
                )
              "
            >
              🗑
            </button>

          </div>

        </td>

      </tr>

    `;

  }


  /* =======================================================
     SELECTION
  ======================================================= */

  window.toggleNewsSelection =
    function (
      encodedId,
      checked
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      if (checked) {

        selectedIds.add(
          id
        );

      } else {

        selectedIds.delete(
          id
        );

      }


      updateBulkBar();

    };


  function toggleSelectAll(
    checked
  ) {

    newsItems.forEach(
      item => {

        const id =
          String(
            item.id
          );


        if (checked) {

          selectedIds.add(
            id
          );

        } else {

          selectedIds.delete(
            id
          );

        }

      }
    );


    renderNewsList();

    updateBulkBar();

  }


  /* =======================================================
     BULK BAR
  ======================================================= */

  function updateBulkBar() {

    const bar =
      document.getElementById(
        "newsBulkBar"
      );


    const count =
      selectedIds.size;


    if (!bar) {
      return;
    }


    if (!count) {

      bar.classList.remove(
        "show"
      );


      return;

    }


    bar.classList.add(
      "show"
    );


    const countElement =
      document.getElementById(
        "newsSelectedCount"
      );


    if (countElement) {

      countElement.textContent =
        count;

    }

  }


  /* =======================================================
     EDIT
  ======================================================= */

  window.editNewsItem =
    function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      /*
       * Existing news editor के
       * function के साथ compatibility.
       */

      if (
        typeof window.openNewsEditorEdit ===
        "function"
      ) {

        window.openNewsEditorEdit(
          Number(id)
        );


        return;

      }


      if (
        typeof window.openNewsEditor ===
        "function"
      ) {

        window.openNewsEditor(
          Number(id)
        );


        return;

      }


      alert(
        "News Editor उपलब्ध नहि अछि।"
      );

    };


  /* =======================================================
     VIEW
  ======================================================= */

  window.viewNewsItem =
    function (
      encodedSlug
    ) {

      const slug =
        decodeURIComponent(
          encodedSlug
        );


      if (!slug) {
        return;
      }


      /*
       * अहाँक current public URL structure:
       * /news/slug
       */

      window.open(
        "/news/" +
        encodeURIComponent(
          slug
        ),
        "_blank"
      );

    };


  /* =======================================================
     DELETE
  ======================================================= */

  window.deleteNewsItem =
    async function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const news =
        newsItems.find(
          item =>
            String(
              item.id
            ) ===
            String(id)
        );


      if (!news) {
        return;
      }


      if (
        !confirm(
          `की "${news.title}" केँ delete करय चाहैत छी?`
        )
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            "/api/news?id=" +
            encodeURIComponent(
              id
            ),
            {

              method:
                "DELETE",

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
            "News delete नहि भेल"
          );

        }


        selectedIds.delete(
          String(id)
        );


        showNewsToast(
          "समाचार delete भ' गेल।"
        );


        loadNewsList();


      } catch (
        error
      ) {

        console.error(
          "NEWS DELETE:",
          error
        );


        showNewsToast(
          error.message,
          "error"
        );

      }

    };


  /* =======================================================
     BULK STATUS
  ======================================================= */

  window.bulkUpdateNewsStatus =
    async function (
      status
    ) {

      const ids =
        Array.from(
          selectedIds
        );


      if (!ids.length) {

        return;

      }


      const label =
        status ===
        "published"
          ? "publish"
          : status ===
            "draft"
              ? "draft"
              : status;


      if (
        !confirm(
          `${ids.length} समाचार केँ ${label} करय चाहैत छी?`
        )
      ) {

        return;

      }


      try {

        for (
          const id of ids
        ) {

          const response =
            await fetch(
              "/api/news?id=" +
              encodeURIComponent(
                id
              ),
              {

                method:
                  "PUT",

                headers:{
                  "Content-Type":
                    "application/json"
                },

                credentials:
                  "same-origin",

                body:
                  JSON.stringify({
                    status
                  })

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
              "Status update नहि भेल"
            );

          }

        }


        selectedIds.clear();


        showNewsToast(
          "Status सफलतापूर्वक update भ' गेल।"
        );


        loadNewsList();


      } catch (
        error
      ) {

        console.error(
          "BULK STATUS:",
          error
        );


        showNewsToast(
          error.message,
          "error"
        );

      }

    };


  /* =======================================================
     BULK DELETE
  ======================================================= */

  window.bulkDeleteNews =
    async function () {

      const ids =
        Array.from(
          selectedIds
        );


      if (!ids.length) {
        return;
      }


      if (
        !confirm(
          `${ids.length} समाचार केँ permanently delete करय चाहैत छी?`
        )
      ) {

        return;

      }


      try {

        for (
          const id of ids
        ) {

          const response =
            await fetch(
              "/api/news?id=" +
              encodeURIComponent(
                id
              ),
              {

                method:
                  "DELETE",

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
              "Delete नहि भेल"
            );

          }

        }


        selectedIds.clear();


        showNewsToast(
          "समाचार delete भ' गेल।"
        );


        loadNewsList();


      } catch (
        error
      ) {

        showNewsToast(
          error.message,
          "error"
        );

      }

    };


  /* =======================================================
     PAGINATION
  ======================================================= */

  function renderPagination() {

    const container =
      document.getElementById(
        "newsPagination"
      );


    if (!container) {
      return;
    }


    if (
      totalPages <= 1
    ) {

      container.innerHTML =
        "";

      return;

    }


    const pages =
      [];


    const start =
      Math.max(
        1,
        currentPage - 2
      );


    const end =
      Math.min(
        totalPages,
        currentPage + 2
      );


    for (
      let page = start;
      page <= end;
      page++
    ) {

      pages.push(
        `
          <button
            class="
              news-page-btn
              ${
                page ===
                currentPage
                  ? "active"
                  : ""
              }
            "
            onclick="
              window.goNewsPage(
                ${page}
              )
            "
          >
            ${page}
          </button>
        `
      );

    }


    container.innerHTML =
      `

        <div
          class="news-pagination"
        >

          <button
            class="news-page-btn"
            ${
              currentPage <= 1
                ? "disabled"
                : ""
            }
            onclick="
              window.goNewsPage(
                ${currentPage - 1}
              )
            "
          >
            ‹
          </button>


          ${pages.join("")}


          <button
            class="news-page-btn"
            ${
              currentPage >=
              totalPages
                ? "disabled"
                : ""
            }
            onclick="
              window.goNewsPage(
                ${currentPage + 1}
              )
            "
          >
            ›
          </button>

        </div>

      `;

  }


  window.goNewsPage =
    function (
      page
    ) {

      if (
        page < 1 ||
        page > totalPages
      ) {

        return;

      }


      currentPage =
        page;


      loadNewsList();


      const container =
        document.getElementById(
          "newsListContainer"
        );


      if (container) {

        container.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });

      }

    };


  /* =======================================================
     STYLES
  ======================================================= */

  function createNewsListStyles() {

    if (
      document.getElementById(
        "newsListStyles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "newsListStyles";


    style.textContent = `

      .news-list-toolbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
        margin-bottom:12px;
      }

      .news-list-filters {
        display:flex;
        align-items:center;
        gap:7px;
        flex-wrap:wrap;
        flex:1;
      }

      .news-list-search,
      .news-list-select {
        height:36px;
        border:1px solid #ddd;
        border-radius:7px;
        background:#fff;
        padding:0 10px;
        font-size:11px;
        outline:none;
      }

      .news-list-search {
        width:240px;
      }

      .news-list-select {
        min-width:120px;
      }

      .news-list-search:focus,
      .news-list-select:focus {
        border-color:#8b0000;
      }

      .news-list-add-btn {
        height:36px;
        padding:0 13px;
        border:0;
        border-radius:7px;
        background:#8b0000;
        color:#fff;
        font-size:11px;
        font-weight:700;
        cursor:pointer;
      }

      .news-bulk-bar {
        display:none;
        align-items:center;
        gap:8px;
        flex-wrap:wrap;
        padding:9px 11px;
        background:#faf4f4;
        border:1px solid #ead8d8;
        border-radius:8px;
        margin-bottom:10px;
      }

      .news-bulk-bar.show {
        display:flex;
      }

      .news-selected-count {
        font-size:10px;
        font-weight:800;
        margin-right:auto;
      }

      .news-bulk-btn {
        height:30px;
        padding:0 9px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        font-size:9px;
        cursor:pointer;
      }

      .news-bulk-btn:hover {
        background:#f5f5f5;
      }

      .news-bulk-btn.danger {
        color:#b00000;
      }

      .news-table-wrap {
        width:100%;
        overflow-x:auto;
        border:1px solid #e5e7eb;
        border-radius:9px;
      }

      .news-table {
        width:100%;
        border-collapse:collapse;
        min-width:850px;
        background:#fff;
      }

      .news-table th {
        background:#f8f8f8;
        color:#777;
        font-size:9px;
        font-weight:800;
        text-align:left;
        padding:10px;
        border-bottom:1px solid #e5e7eb;
        white-space:nowrap;
      }

      .news-table td {
        padding:9px 10px;
        border-bottom:1px solid #eee;
        font-size:10px;
        vertical-align:middle;
      }

      .news-table tbody tr:hover {
        background:#fcfcfc;
      }

      .news-check-column {
        width:35px;
        text-align:center !important;
      }

      .news-title-cell {
        display:flex;
        align-items:center;
        gap:9px;
        min-width:280px;
      }

      .news-thumbnail {
        width:45px;
        height:38px;
        flex:none;
        border-radius:6px;
        background:#f2f2f2;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      }

      .news-thumbnail img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .news-title-info {
        min-width:0;
      }

      .news-title {
        max-width:330px;
        font-size:10px;
        font-weight:800;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      }

      .news-slug {
        color:#999;
        font-size:8px;
        margin-top:3px;
        max-width:330px;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      }

      .news-category {
        color:#555;
        font-size:9px;
      }

      .news-status {
        display:inline-block;
        padding:4px 7px;
        border-radius:12px;
        font-size:8px;
        font-weight:800;
        background:#eee;
      }

      .news-status.published {
        background:#e9f7ee;
        color:#18733b;
      }

      .news-status.draft {
        background:#fff4dc;
        color:#956400;
      }

      .news-status.archived {
        background:#eee;
        color:#777;
      }

      .news-status.pending {
        background:#eaf0ff;
        color:#315d9b;
      }

      .news-views {
        color:#777;
        font-size:9px;
        white-space:nowrap;
      }

      .news-date {
        color:#777;
        font-size:9px;
        white-space:nowrap;
      }

      .news-actions {
        display:flex;
        align-items:center;
        gap:4px;
      }

      .news-action-btn {
        width:29px;
        height:29px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        cursor:pointer;
        font-size:10px;
      }

      .news-action-btn:hover {
        background:#f5f5f5;
      }

      .news-action-btn.danger {
        color:#c62828;
      }

      .news-list-loading,
      .news-list-empty,
      .news-list-error {
        padding:50px 20px;
        text-align:center;
        color:#999;
        font-size:11px;
      }

      .news-list-error {
        color:#a00000;
      }

      .news-list-retry {
        height:34px;
        padding:0 12px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        cursor:pointer;
      }

      .news-pagination {
        display:flex;
        justify-content:center;
        align-items:center;
        gap:4px;
        margin-top:13px;
      }

      .news-page-btn {
        min-width:30px;
        height:30px;
        padding:0 7px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        cursor:pointer;
        font-size:10px;
      }

      .news-page-btn:hover {
        background:#f5f5f5;
      }

      .news-page-btn.active {
        background:#8b0000;
        color:#fff;
        border-color:#8b0000;
      }

      .news-page-btn:disabled {
        opacity:.4;
        cursor:not-allowed;
      }

      @media(max-width:700px) {

        .news-list-search {
          width:100%;
        }

        .news-list-filters {
          width:100%;
        }

        .news-list-select {
          flex:1;
          min-width:100px;
        }

        .news-list-add-btn {
          width:100%;
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

  function statusLabel(
    status
  ) {

    const labels = {

      published:
        "Published",

      draft:
        "Draft",

      archived:
        "Archived",

      pending:
        "Pending"

    };


    return (
      labels[
        status
      ] ||
      status
    );

  }


  function formatNumber(
    value
  ) {

    return Number(
      value || 0
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


  function debounce(
    callback,
    delay
  ) {

    let timer;


    return function () {

      clearTimeout(
        timer
      );


      timer =
        setTimeout(
          () => {

            callback.apply(
              this,
              arguments
            );

          },
          delay
        );

    };

  }


  function showNewsToast(
    message,
    type="success"
  ) {

    if (
      typeof window.showToast ===
      "function"
    ) {

      window.showToast(
        message,
        type
      );

    } else {

      alert(
        message
      );

    }

  }

})();
