/* =========================================================
   category-manager.js
   Category + Sub-category Management
========================================================= */

(function () {

  let editingId = null;

  /* =======================================================
     INIT
  ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createCategoryModal();

    }
  );


  /* =======================================================
     MODAL UI
  ======================================================= */

  function createCategoryModal() {

    if (
      document.getElementById(
        "categoryModal"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `

      #categoryModal {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:6000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      #categoryModal.show {
        display:flex;
      }

      .category-box {
        width:min(620px,100%);
        max-height:94vh;
        overflow:auto;
        background:#fff;
        border-radius:14px;
        box-shadow:0 20px 60px rgba(0,0,0,.25);
      }

      .category-header {
        padding:18px 20px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        justify-content:space-between;
        align-items:center;
      }

      .category-title {
        font-size:18px;
        font-weight:800;
      }

      .category-subtitle {
        color:#888;
        font-size:11px;
        margin-top:4px;
      }

      .category-close {
        width:36px;
        height:36px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:7px;
        cursor:pointer;
        font-size:18px;
      }

      .category-body {
        padding:20px;
      }

      .category-field {
        margin-bottom:15px;
      }

      .category-label {
        display:block;
        font-size:11px;
        font-weight:700;
        margin-bottom:6px;
      }

      .category-label span {
        color:#b00000;
      }

      .category-input,
      .category-textarea,
      .category-select {
        width:100%;
        border:1px solid #d8dbe0;
        border-radius:7px;
        padding:10px 11px;
        font-size:13px;
        outline:none;
        font-family:inherit;
        background:#fff;
      }

      .category-input:focus,
      .category-textarea:focus,
      .category-select:focus {
        border-color:#8b0000;
        box-shadow:0 0 0 2px rgba(139,0,0,.08);
      }

      .category-textarea {
        min-height:90px;
        resize:vertical;
      }

      .category-slug-row {
        display:flex;
        gap:7px;
      }

      .category-slug-row input {
        flex:1;
      }

      .category-preview {
        margin-top:6px;
        padding:8px;
        background:#f6f6f6;
        border-radius:6px;
        font-size:10px;
        color:#777;
        word-break:break-all;
      }

      .category-preview strong {
        color:#8b0000;
      }

      .category-parent-help {
        margin-top:6px;
        color:#777;
        font-size:10px;
        line-height:1.5;
      }

      .category-options {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
      }

      .category-check {
        border:1px solid #e1e3e6;
        border-radius:8px;
        padding:11px;
        display:flex;
        align-items:center;
        gap:8px;
        font-size:12px;
        cursor:pointer;
      }

      .category-message {
        display:none;
        padding:9px 11px;
        border-radius:7px;
        margin-bottom:13px;
        font-size:11px;
      }

      .category-message.show {
        display:block;
      }

      .category-message.error {
        background:#ffeded;
        color:#a00000;
      }

      .category-message.success {
        background:#eaf7ef;
        color:#176b38;
      }

      .category-footer {
        padding:13px 20px;
        border-top:1px solid #e5e7eb;
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }

      .category-btn {
        height:38px;
        padding:0 15px;
        border-radius:7px;
        border:1px solid #ddd;
        background:#fff;
        cursor:pointer;
        font-size:12px;
        font-weight:700;
      }

      .category-btn.primary {
        background:#8b0000;
        color:#fff;
        border-color:#8b0000;
      }

      .category-btn:disabled {
        opacity:.6;
        cursor:not-allowed;
      }

      @media(max-width:600px) {

        #categoryModal {
          padding:0;
        }

        .category-box {
          width:100%;
          height:100%;
          max-height:none;
          border-radius:0;
        }

        .category-options {
          grid-template-columns:1fr;
        }

        .category-slug-row {
          flex-direction:column;
        }

      }

    `;


    document.head.appendChild(
      style
    );


    const modal =
      document.createElement(
        "div"
      );


    modal.id =
      "categoryModal";


    modal.innerHTML = `

      <div class="category-box">

        <div class="category-header">

          <div>

            <div
              class="category-title"
              id="categoryModalTitle"
            >
              नई श्रेणी
            </div>

            <div class="category-subtitle">
              Category आ ओकर English URL manage करू
            </div>

          </div>

          <button
            class="category-close"
            type="button"
            onclick="window.closeCategoryEditor()"
          >
            ×
          </button>

        </div>


        <div class="category-body">

          <div
            class="category-message"
            id="categoryMessage"
          ></div>


          <!-- NAME -->

          <div class="category-field">

            <label class="category-label">
              श्रेणी नाम <span>*</span>
            </label>

            <input
              class="category-input"
              id="categoryName"
              placeholder="जैसे — मिथिला"
              autocomplete="off"
            >

          </div>


          <!-- SLUG -->

          <div class="category-field">

            <label class="category-label">
              English URL / Slug <span>*</span>
            </label>

            <div class="category-slug-row">

              <input
                class="category-input"
                id="categorySlug"
                placeholder="mithila"
                autocomplete="off"
              >

              <button
                class="category-btn"
                type="button"
                onclick="window.generateCategorySlug()"
              >
                Generate
              </button>

            </div>

            <div class="category-preview">
              URL:
              <strong id="categoryUrlPreview">
                /category/...
              </strong>
            </div>

          </div>


          <!-- DESCRIPTION -->

          <div class="category-field">

            <label class="category-label">
              विवरण
            </label>

            <textarea
              class="category-textarea"
              id="categoryDescription"
              placeholder="श्रेणीक विवरण..."
            ></textarea>

          </div>


          <!-- PARENT CATEGORY -->

          <div class="category-field">

            <label class="category-label">
              मुख्य श्रेणी
            </label>

            <select
              class="category-select"
              id="categoryParent"
            >

              <option value="">
                — कोनो मुख्य श्रेणी नहि —
              </option>

            </select>

            <div class="category-parent-help">
              कोनो मुख्य श्रेणी नहि चुनलासँ ई Main Category रहत।
              मुख्य श्रेणी चुनलासँ ई ओकर Sub-category बनत।
            </div>

          </div>


          <!-- OPTIONS -->

          <div class="category-options">

            <label class="category-check">

              <input
                type="checkbox"
                id="categoryMenuVisible"
                checked
              >

              <span>
                Menu में देखाउ
              </span>

            </label>


            <label class="category-check">

              <input
                type="checkbox"
                id="categoryActive"
                checked
              >

              <span>
                Active
              </span>

            </label>

          </div>


          <!-- MENU ORDER -->

          <div
            class="category-field"
            style="margin-top:15px"
          >

            <label class="category-label">
              Menu Order
            </label>

            <input
              type="number"
              class="category-input"
              id="categoryMenuOrder"
              value="0"
              min="0"
            >

          </div>


        </div>


        <div class="category-footer">

          <button
            class="category-btn"
            type="button"
            onclick="window.closeCategoryEditor()"
          >
            Cancel
          </button>

          <button
            class="category-btn primary"
            id="categorySaveBtn"
            type="button"
            onclick="window.saveCategory()"
          >
            Save Category
          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    /* ===================================================
       NAME → AUTO SLUG
    =================================================== */

    const nameInput =
      document.getElementById(
        "categoryName"
      );


    if (nameInput) {

      nameInput.addEventListener(
        "input",
        function () {

          const slug =
            document.getElementById(
              "categorySlug"
            );


          if (
            slug &&
            !slug.dataset.manual
          ) {

            slug.value =
              makeSlug(
                this.value
              );

            updateSlugPreview();

          }

        }
      );

    }


    /* ===================================================
       SLUG
    =================================================== */

    const slugInput =
      document.getElementById(
        "categorySlug"
      );


    if (slugInput) {

      slugInput.addEventListener(
        "input",
        function () {

          this.dataset.manual =
            "1";

          this.value =
            normalizeSlug(
              this.value
            );

          updateSlugPreview();

        }
      );

    }

  }


  /* =======================================================
     CREATE
  ======================================================= */

  window.openCategoryEditor =
    async function () {

      editingId = null;

      resetForm();

      document
        .getElementById(
          "categoryModalTitle"
        )
        .textContent =
        "नई श्रेणी";


      document
        .getElementById(
          "categoryModal"
        )
        .classList.add(
          "show"
        );


      await loadParentCategories(
        null
      );


      document
        .getElementById(
          "categoryName"
        )
        .focus();

    };


  /* =======================================================
     EDIT
  ======================================================= */

  window.openCategoryEdit =
    async function (id) {

      editingId = id;

      resetForm();


      document
        .getElementById(
          "categoryModalTitle"
        )
        .textContent =
        "श्रेणी Edit करू";


      document
        .getElementById(
          "categoryModal"
        )
        .classList.add(
          "show"
        );


      try {

        /*
         * First load main categories.
         * Current category itself is excluded.
         */

        await loadParentCategories(
          id
        );


        const response =
          await fetch(
            "/api/categories?id=" +
            encodeURIComponent(
              id
            ),
            {
              method:"GET",

              credentials:
                "same-origin",

              cache:
                "no-store"
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
            "श्रेणी नहि भेटल"
          );

        }


        const category =
          data.category ||
          (
            data.categories ||
            []
          ).find(
            item =>
              Number(item.id) ===
              Number(id)
          );


        if (!category) {

          throw new Error(
            "श्रेणी नहि भेटल"
          );

        }


        fillForm(
          category
        );


      } catch (error) {

        console.error(
          "CATEGORY EDIT:",
          error
        );


        showMessage(
          error.message ||
          "श्रेणी load नहि भेल",
          "error"
        );

      }

    };


  /* =======================================================
     LOAD MAIN CATEGORIES
  ======================================================= */

  async function loadParentCategories(
    excludeId
  ) {

    const select =
      document.getElementById(
        "categoryParent"
      );


    if (!select) {
      return;
    }


    select.innerHTML = `
      <option value="">
        — कोनो मुख्य श्रेणी नहि —
      </option>
    `;


    try {

      const response =
        await fetch(
          "/api/categories?status=active",
          {
            method:"GET",

            credentials:
              "same-origin",

            cache:
              "no-store"
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
          "मुख्य श्रेणी load नहि भेल"
        );

      }


      const categories =
        Array.isArray(
          data.categories
        )
          ? data.categories
          : [];


      /*
       * IMPORTANT:
       *
       * Only parent/root categories
       *
       * parent_id = NULL
       *
       * Existing sub-categories
       * will NOT appear here.
       */

      const parents =
        categories
          .filter(
            category => {

              const parentId =
                category.parent_id;


              return (
                parentId === null ||
                parentId === undefined ||
                parentId === "" ||
                Number(parentId) === 0
              );

            }
          )
          .filter(
            category =>
              Number(
                category.id
              ) !==
              Number(
                excludeId
              )
          )
          .sort(
            function (a, b) {

              const orderA =
                Number(
                  a.menu_order ??
                  a.menuOrder ??
                  0
                );


              const orderB =
                Number(
                  b.menu_order ??
                  b.menuOrder ??
                  0
                );


              if (
                orderA !== orderB
              ) {

                return (
                  orderA -
                  orderB
                );

              }


              return String(
                a.name || ""
              ).localeCompare(
                String(
                  b.name || ""
                )
              );

            }
          );


      parents.forEach(
        function (category) {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            String(
              category.id
            );


          option.textContent =
            category.name;


          select.appendChild(
            option
          );

        }
      );


    } catch (error) {

      console.error(
        "LOAD PARENT CATEGORIES:",
        error
      );


      /*
       * Don't block editor.
       * Keep Main Category option.
       */

    }

  }


  /* =======================================================
     RESET
  ======================================================= */

  function resetForm() {

    setValue(
      "categoryName",
      ""
    );


    setValue(
      "categorySlug",
      ""
    );


    setValue(
      "categoryDescription",
      ""
    );


    setValue(
      "categoryMenuOrder",
      "0"
    );


    setValue(
      "categoryParent",
      ""
    );


    const menuVisible =
      document.getElementById(
        "categoryMenuVisible"
      );


    if (menuVisible) {

      menuVisible.checked =
        true;

    }


    const active =
      document.getElementById(
        "categoryActive"
      );


    if (active) {

      active.checked =
        true;

    }


    const slug =
      document.getElementById(
        "categorySlug"
      );


    if (slug) {

      slug.dataset.manual =
        "";

    }


    updateSlugPreview();

    hideMessage();

  }


  /* =======================================================
     FILL EDIT FORM
  ======================================================= */

  function fillForm(
    category
  ) {

    setValue(
      "categoryName",
      category.name
    );


    setValue(
      "categorySlug",
      category.slug
    );


    setValue(
      "categoryDescription",
      category.description
    );


    setValue(
      "categoryMenuOrder",
      category.menu_order ??
      category.menuOrder ??
      category.order ??
      0
    );


    /*
     * Parent Category
     */

    const parentSelect =
      document.getElementById(
        "categoryParent"
      );


    if (parentSelect) {

      const parentId =
        category.parent_id ??
        category.parentId ??
        "";


      parentSelect.value =
        parentId === null ||
        parentId === undefined ||
        parentId === ""
          ? ""
          : String(
              parentId
            );

    }


    const slug =
      document.getElementById(
        "categorySlug"
      );


    if (slug) {

      slug.dataset.manual =
        "1";

    }


    const menuVisible =
      document.getElementById(
        "categoryMenuVisible"
      );


    if (menuVisible) {

      menuVisible.checked =
        Number(
          category.menu_visible ??
          category.show_in_menu ??
          category.menuVisible ??
          1
        ) === 1;

    }


    const active =
      document.getElementById(
        "categoryActive"
      );


    if (active) {

      active.checked =
        String(
          category.status ??
          "active"
        ).toLowerCase() ===
        "active";

    }


    updateSlugPreview();

  }


  /* =======================================================
     GENERATE SLUG
  ======================================================= */

  window.generateCategorySlug =
    function () {

      const name =
        document
          .getElementById(
            "categoryName"
          )
          .value;


      const slug =
        document
          .getElementById(
            "categorySlug"
          );


      if (!slug) {
        return;
      }


      slug.value =
        makeSlug(
          name
        );


      slug.dataset.manual =
        "";


      updateSlugPreview();

    };


  /* =======================================================
     MAKE SLUG
  ======================================================= */

  function makeSlug(
    text
  ) {

    return String(
      text || ""
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


  /* =======================================================
     NORMALIZE SLUG
  ======================================================= */

  function normalizeSlug(
    slug
  ) {

    return String(
      slug || ""
    )

      .toLowerCase()

      .replace(
        /[^a-z0-9-]/g,
        "-"
      )

      .replace(
        /-+/g,
        "-"
      )

      .replace(
        /^-+|-+$/g,
        "");

  }


  /* =======================================================
     SLUG PREVIEW
  ======================================================= */

  function updateSlugPreview() {

    const slug =
      document
        .getElementById(
          "categorySlug"
        )
        .value;


    const preview =
      document.getElementById(
        "categoryUrlPreview"
      );


    if (!preview) {
      return;
    }


    preview.textContent =
      slug
        ? "/category/" +
          slug
        : "/category/...";

  }


  /* =======================================================
     SAVE
  ======================================================= */

  window.saveCategory =
    async function () {

      const name =
        document
          .getElementById(
            "categoryName"
          )
          .value
          .trim();


      let slug =
        document
          .getElementById(
            "categorySlug"
          )
          .value
          .trim();


      if (!name) {

        showMessage(
          "श्रेणी नाम जरूरी अछि।",
          "error"
        );

        return;

      }


      if (!slug) {

        slug =
          makeSlug(
            name
          );


        document
          .getElementById(
            "categorySlug"
          )
          .value =
          slug;

      }


      slug =
        normalizeSlug(
          slug
        );


      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/
          .test(
            slug
          )
      ) {

        showMessage(
          "English URL सही नहि अछि। उदाहरण: mithila",
          "error"
        );

        return;

      }


      /*
       * Parent Category
       */

      const parentValue =
        document
          .getElementById(
            "categoryParent"
          )
          .value;


      const parentId =
        parentValue === ""
          ? null
          : Number(
              parentValue
            );


      if (
        parentId !== null &&
        (
          !Number.isInteger(
            parentId
          ) ||
          parentId <= 0
        )
      ) {

        showMessage(
          "मुख्य श्रेणी सही नहि अछि।",
          "error"
        );

        return;

      }


      /*
       * IMPORTANT:
       *
       * parent_id is sent to D1 API.
       */

      const payload = {

        name,

        slug,

        description:
          document
            .getElementById(
              "categoryDescription"
            )
            .value
            .trim(),

        parent_id:
          parentId,

        menu_visible:
          document
            .getElementById(
              "categoryMenuVisible"
            )
            .checked
            ? 1
            : 0,

        menu_order:
          Number(
            document
              .getElementById(
                "categoryMenuOrder"
              )
              .value ||
            0
          ),

        status:
          document
            .getElementById(
              "categoryActive"
            )
            .checked
            ? "active"
            : "inactive"

      };


      const button =
        document.getElementById(
          "categorySaveBtn"
        );


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Saving...";

      }


      try {

        let url =
          "/api/categories";


        let method =
          "POST";


        if (
          editingId !== null
        ) {

          method =
            "PUT";


          url +=
            "?id=" +
            encodeURIComponent(
              editingId
            );

        }


        const response =
          await fetch(
            url,
            {

              method,

              headers: {

                "Content-Type":
                  "application/json"

              },

              credentials:
                "same-origin",

              cache:
                "no-store",

              body:
                JSON.stringify(
                  payload
                )

            }
          );


        const text =
          await response.text();


        let data;


        try {

          data =
            JSON.parse(
              text
            );

        } catch {

          throw new Error(
            "Server सँ valid JSON response नहि भेटल। HTTP " +
            response.status
          );

        }


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            data.message ||
            "श्रेणी save नहि भेल"
          );

        }


        showMessage(
          data.message ||
          "श्रेणी सफलतापूर्वक save भ' गेल।",
          "success"
        );


        /*
         * Refresh category list
         */

        if (
          typeof window.loadCategories ===
          "function"
        ) {

          try {

            await window.loadCategories();

          } catch (
            refreshError
          ) {

            console.error(
              "CATEGORY LIST REFRESH:",
              refreshError
            );

          }

        }


        /*
         * Also refresh other known
         * category loaders if present.
         */

        if (
          typeof window.loadCategoryList ===
          "function"
        ) {

          try {

            await window.loadCategoryList();

          } catch (
            refreshError
          ) {

            console.error(
              "CATEGORY LIST REFRESH 2:",
              refreshError
            );

          }

        }


        /*
         * Close after successful save
         */

        setTimeout(
          function () {

            closeCategoryEditor();

          },
          500
        );


      } catch (error) {

        console.error(
          "CATEGORY SAVE:",
          error
        );


        showMessage(
          error.message ||
          "श्रेणी save नहि भेल",
          "error"
        );


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Save Category";

        }

      }

    };


  /* =======================================================
     CLOSE
  ======================================================= */

  window.closeCategoryEditor =
    function () {

      const modal =
        document.getElementById(
          "categoryModal"
        );


      if (!modal) {
        return;
      }


      modal.classList.remove(
        "show"
      );


      editingId = null;

    };


  /* =======================================================
     MESSAGE
  ======================================================= */

  function showMessage(
    message,
    type
  ) {

    const box =
      document.getElementById(
        "categoryMessage"
      );


    if (!box) {
      return;
    }


    box.textContent =
      message;


    box.className =
      "category-message " +
      (
        type === "success"
          ? "success"
          : "error"
      ) +
      " show";

  }


  function hideMessage() {

    const box =
      document.getElementById(
        "categoryMessage"
      );


    if (!box) {
      return;
    }


    box.textContent =
      "";


    box.className =
      "category-message";

  }


  /* =======================================================
     SET VALUE
  ======================================================= */

  function setValue(
    id,
    value
  ) {

    const element =
      document.getElementById(
        id
      );


    if (element) {

      element.value =
        value ??
        "";

    }

  }


  /* =======================================================
     ESCAPE HTML
  ======================================================= */

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


})();
