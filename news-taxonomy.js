/* =========================================================
   news-taxonomy.js
   Category + Tag Auto Loader
========================================================= */

(function () {

  let categories = [];
  let tags = [];


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      loadTaxonomy();

    }
  );


  /* =======================================================
     LOAD CATEGORY + TAG
  ======================================================= */

  async function loadTaxonomy() {

    await Promise.allSettled([
      loadCategories(),
      loadTags()
    ]);

  }


  /* =======================================================
     CATEGORIES
  ======================================================= */

  async function loadCategories() {

    try {

      const response =
        await fetch(
          "/api/categories?status=active",
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
          "Category load नहि भेल"
        );

      }


      categories =
        data.categories ||
        data.data ||
        [];


      /*
       * News List filter
       */

      populateCategoryFilter();


      /*
       * News Editor
       */

      populateCategorySelectors();


      /*
       * Global access
       */

      window.newsCategories =
        categories;


    } catch (
      error
    ) {

      console.error(
        "CATEGORY LOAD:",
        error
      );

    }

  }


  /* =======================================================
     TAGS
  ======================================================= */

  async function loadTags() {

    try {

      const response =
        await fetch(
          "/api/tags?status=active",
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
          "Tag load नहि भेल"
        );

      }


      tags =
        data.tags ||
        data.data ||
        [];


      populateTagSelectors();


      window.newsTags =
        tags;


    } catch (
      error
    ) {

      console.error(
        "TAG LOAD:",
        error
      );

    }

  }


  /* =======================================================
     NEWS LIST CATEGORY FILTER
  ======================================================= */

  function populateCategoryFilter() {

    const select =
      document.getElementById(
        "newsCategoryFilter"
      );


    if (!select) {
      return;
    }


    const currentValue =
      select.value;


    select.innerHTML =
      `
        <option value="all">
          सभ Category
        </option>
      `;


    categories.forEach(
      category => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          category.id;


        option.textContent =
          category.name ||
          category.title ||
          "";


        select.appendChild(
          option
        );

      }
    );


    if (
      currentValue &&
      categories.some(
        category =>
          String(
            category.id
          ) ===
          String(
            currentValue
          )
      )
    ) {

      select.value =
        currentValue;

    }

  }


  /* =======================================================
     NEWS EDITOR CATEGORY
     Supports common IDs
  ======================================================= */

  function populateCategorySelectors() {

    const selectors = [

      "newsCategory",

      "categoryId",

      "newsCategoryId",

      "editorCategory",

      "category_id"

    ];


    selectors.forEach(
      id => {

        const select =
          document.getElementById(
            id
          );


        if (
          select &&
          select.tagName ===
          "SELECT"
        ) {

          fillCategorySelect(
            select
          );

        }

      }
    );


    /*
     * Also support data attribute:
     *
     * <select data-news-category></select>
     */

    document
      .querySelectorAll(
        "[data-news-category]"
      )
      .forEach(
        select => {

          if (
            select.tagName ===
            "SELECT"
          ) {

            fillCategorySelect(
              select
            );

          }

        }
      );

  }


  function fillCategorySelect(
    select
  ) {

    const currentValue =
      select.value;


    const placeholder =
      select.dataset.placeholder ||
      "Category चुनू";


    select.innerHTML =
      "";


    const firstOption =
      document.createElement(
        "option"
      );


    firstOption.value =
      "";


    firstOption.textContent =
      placeholder;


    select.appendChild(
      firstOption
    );


    categories.forEach(
      category => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          category.id;


        option.textContent =
          category.name ||
          category.title ||
          "";


        option.dataset.slug =
          category.slug ||
          "";


        select.appendChild(
          option
        );

      }
    );


    if (
      currentValue &&
      categories.some(
        category =>
          String(
            category.id
          ) ===
          String(
            currentValue
          )
      )
    ) {

      select.value =
        currentValue;

    }

  }


  /* =======================================================
     TAG SELECTORS
  ======================================================= */

  function populateTagSelectors() {

    const selectors = [

      "newsTags",

      "tagIds",

      "newsTagIds",

      "editorTags"

    ];


    selectors.forEach(
      id => {

        const element =
          document.getElementById(
            id
          );


        if (!element) {
          return;
        }


        if (
          element.tagName ===
          "SELECT"
        ) {

          fillTagSelect(
            element
          );

        }

      }
    );


    document
      .querySelectorAll(
        "[data-news-tags]"
      )
      .forEach(
        element => {

          if (
            element.tagName ===
            "SELECT"
          ) {

            fillTagSelect(
              element
            );

          }

        }
      );


    /*
     * Custom checkbox tag container
     */

    const container =
      document.getElementById(
        "newsTagSelector"
      );


    if (
      container &&
      container.tagName !==
      "SELECT"
    ) {

      renderTagCheckboxes(
        container
      );

    }

  }


  function fillTagSelect(
    select
  ) {

    const current =
      Array.from(
        select.selectedOptions ||
        []
      )
        .map(
          option =>
            String(
              option.value
            )
        );


    const multiple =
      select.multiple;


    select.innerHTML =
      "";


    tags.forEach(
      tag => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          tag.id;


        option.textContent =
          tag.name ||
          "";


        option.dataset.slug =
          tag.slug ||
          "";


        option.selected =
          current.includes(
            String(
              tag.id
            )
          );


        select.appendChild(
          option
        );

      }
    );


    /*
     * Single select में placeholder
     */

    if (!multiple) {

      const first =
        document.createElement(
          "option"
        );


      first.value =
        "";


      first.textContent =
        "Tag चुनू";


      select.insertBefore(
        first,
        select.firstChild
      );

    }

  }


  /* =======================================================
     TAG CHECKBOX UI
  ======================================================= */

  function renderTagCheckboxes(
    container
  ) {

    container.innerHTML =
      "";


    if (
      !tags.length
    ) {

      container.innerHTML =
        `
          <div
            style="
              font-size:11px;
              color:#999;
              padding:8px;
            "
          >
            एखन कोनो active tag नहि अछि।
          </div>
        `;

      return;

    }


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "news-taxonomy-tags";


    tags.forEach(
      tag => {

        const label =
          document.createElement(
            "label"
          );


        label.className =
          "news-taxonomy-tag";


        label.innerHTML =
          `

            <input
              type="checkbox"
              name="news_tags[]"
              value="${escapeHtml(
                tag.id
              )}"
              data-tag-slug="${escapeHtml(
                tag.slug ||
                ""
              )}"
            >

            <span>
              ${escapeHtml(
                tag.name ||
                ""
              )}
            </span>

          `;


        wrapper.appendChild(
          label
        );

      }
    );


    container.appendChild(
      wrapper
    );

  }


  /* =======================================================
     GET SELECTED TAG IDS
  ======================================================= */

  window.getSelectedNewsTags =
    function () {

      const checked =
        document.querySelectorAll(
          'input[name="news_tags[]"]:checked'
        );


      return Array.from(
        checked
      )
        .map(
          input =>
            Number(
              input.value
            )
        )
        .filter(
          id =>
            Number.isFinite(
              id
            )
        );

    };


  /* =======================================================
     SET SELECTED TAGS
  ======================================================= */

  window.setSelectedNewsTags =
    function (
      tagIds
    ) {

      if (
        !Array.isArray(
          tagIds
        )
      ) {

        return;

      }


      const ids =
        tagIds.map(
          id =>
            String(id)
        );


      document
        .querySelectorAll(
          'input[name="news_tags[]"]'
        )
        .forEach(
          checkbox => {

            checkbox.checked =
              ids.includes(
                String(
                  checkbox.value
                )
              );

          }
        );


      document
        .querySelectorAll(
          "select[data-news-tags], #newsTags, #tagIds, #newsTagIds, #editorTags"
        )
        .forEach(
          select => {

            if (
              select.multiple
            ) {

              Array.from(
                select.options
              )
                .forEach(
                  option => {

                    option.selected =
                      ids.includes(
                        String(
                          option.value
                        )
                      );

                  }
                );

            }

          }
        );

    };


  /* =======================================================
     FIND CATEGORY
  ======================================================= */

  window.findNewsCategory =
    function (
      id
    ) {

      return categories.find(
        category =>
          String(
            category.id
          ) ===
          String(id)
      ) ||
      null;

    };


  /* =======================================================
     FIND TAG
  ======================================================= */

  window.findNewsTag =
    function (
      id
    ) {

      return tags.find(
        tag =>
          String(
            tag.id
          ) ===
          String(id)
      ) ||
      null;

    };


  /* =======================================================
     REFRESH
  ======================================================= */

  window.refreshNewsTaxonomy =
    function () {

      loadTaxonomy();

    };


  /* =======================================================
     STYLES
  ======================================================= */

  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    .news-taxonomy-tags {
      display:flex;
      flex-wrap:wrap;
      gap:7px;
    }

    .news-taxonomy-tag {
      display:inline-flex;
      align-items:center;
      gap:5px;
      border:1px solid #ddd;
      border-radius:15px;
      padding:6px 9px;
      background:#fff;
      cursor:pointer;
      font-size:10px;
      transition:.15s;
    }

    .news-taxonomy-tag:hover {
      border-color:#999;
      background:#fafafa;
    }

    .news-taxonomy-tag
    input {
      margin:0;
    }

    .news-taxonomy-tag
    input:checked
    + span {
      font-weight:700;
    }

  `;


  document.head.appendChild(
    style
  );


  /* =======================================================
     ESCAPE
  ======================================================= */

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
