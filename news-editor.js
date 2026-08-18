/* =========================================================
   news-editor.js
   Professional News Editor
========================================================= */

(function () {

  let editorMode = "create";
  let editingId = null;
  let categories = [];
  let tags = [];


  /* =======================================================
     INITIALIZE
  ======================================================= */

  document.addEventListener("DOMContentLoaded", function () {

    createEditorUI();

    loadEditorMasters();

  });


  /* =======================================================
     CREATE EDITOR UI
  ======================================================= */

  function createEditorUI() {

    if (document.getElementById("newsEditorModal")) {
      return;
    }


    const style = document.createElement("style");

    style.textContent = `

      #newsEditorModal {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:5000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      #newsEditorModal.show {
        display:flex;
      }

      .news-editor-box {
        width:min(1100px,100%);
        max-height:94vh;
        background:#fff;
        border-radius:14px;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        box-shadow:0 20px 60px rgba(0,0,0,.25);
      }

      .news-editor-header {
        padding:16px 20px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:15px;
        background:#fff;
      }

      .news-editor-title {
        font-size:18px;
        font-weight:800;
      }

      .news-editor-subtitle {
        color:#777;
        font-size:11px;
        margin-top:3px;
      }

      .news-editor-close {
        width:36px;
        height:36px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:7px;
        cursor:pointer;
        font-size:18px;
      }

      .news-editor-body {
        overflow-y:auto;
        padding:20px;
        background:#f7f7f8;
      }

      .editor-grid {
        display:grid;
        grid-template-columns:minmax(0,2fr) minmax(280px,1fr);
        gap:18px;
      }

      .editor-card {
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:18px;
        margin-bottom:15px;
      }

      .editor-card-title {
        font-weight:800;
        font-size:14px;
        margin-bottom:15px;
      }

      .editor-field {
        margin-bottom:15px;
      }

      .editor-field:last-child {
        margin-bottom:0;
      }

      .editor-label {
        display:block;
        font-size:11px;
        font-weight:700;
        margin-bottom:6px;
        color:#333;
      }

      .editor-label span {
        color:#b00000;
      }

      .editor-input,
      .editor-select,
      .editor-textarea {
        width:100%;
        border:1px solid #d9dce1;
        border-radius:7px;
        background:#fff;
        padding:10px 11px;
        font-size:13px;
        outline:none;
        font-family:inherit;
      }

      .editor-input:focus,
      .editor-select:focus,
      .editor-textarea:focus {
        border-color:#8b0000;
        box-shadow:0 0 0 2px rgba(139,0,0,.08);
      }

      .editor-textarea {
        min-height:110px;
        resize:vertical;
      }

      #newsContentEditor {
        min-height:330px;
        line-height:1.7;
      }

      .slug-row {
        display:flex;
        gap:7px;
      }

      .slug-row .editor-input {
        flex:1;
      }

      .slug-status {
        font-size:10px;
        margin-top:5px;
      }

      .slug-status.ok {
        color:#16803c;
      }

      .slug-status.error {
        color:#c62828;
      }

      .editor-url-preview {
        background:#f5f5f5;
        border-radius:6px;
        padding:8px;
        margin-top:6px;
        color:#777;
        font-size:10px;
        word-break:break-all;
      }

      .editor-url-preview strong {
        color:#8b0000;
      }

      .tag-list {
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin-top:8px;
      }

      .tag-option {
        border:1px solid #ddd;
        background:#fff;
        border-radius:20px;
        padding:5px 9px;
        font-size:10px;
        cursor:pointer;
      }

      .tag-option.selected {
        background:#8b0000;
        border-color:#8b0000;
        color:#fff;
      }

      .selected-tags {
        display:flex;
        flex-wrap:wrap;
        gap:5px;
        margin-top:8px;
      }

      .selected-tag {
        display:inline-flex;
        align-items:center;
        gap:5px;
        padding:5px 8px;
        background:#f4eaea;
        color:#700000;
        border-radius:15px;
        font-size:10px;
      }

      .selected-tag button {
        border:0;
        background:none;
        cursor:pointer;
        color:inherit;
        padding:0;
      }

      .featured-box {
        display:flex;
        align-items:center;
        gap:8px;
        font-size:12px;
        cursor:pointer;
      }

      .image-preview {
        width:100%;
        height:150px;
        border:1px dashed #ccc;
        border-radius:8px;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#999;
        overflow:hidden;
        background:#fafafa;
        margin-top:8px;
      }

      .image-preview img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .editor-footer {
        padding:13px 20px;
        border-top:1px solid #e5e7eb;
        background:#fff;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }

      .editor-footer-left {
        color:#888;
        font-size:10px;
      }

      .editor-footer-right {
        display:flex;
        gap:8px;
      }

      .editor-btn {
        height:38px;
        padding:0 15px;
        border-radius:7px;
        border:1px solid #ddd;
        background:#fff;
        cursor:pointer;
        font-size:12px;
        font-weight:700;
      }

      .editor-btn.primary {
        background:#8b0000;
        border-color:#8b0000;
        color:#fff;
      }

      .editor-btn.dark {
        background:#222;
        border-color:#222;
        color:#fff;
      }

      .editor-btn:disabled {
        opacity:.5;
        cursor:not-allowed;
      }

      .editor-message {
        padding:9px 11px;
        border-radius:7px;
        font-size:11px;
        display:none;
        margin-bottom:12px;
      }

      .editor-message.show {
        display:block;
      }

      .editor-message.error {
        background:#ffeded;
        color:#a00000;
      }

      .editor-message.success {
        background:#eaf7ef;
        color:#176b38;
      }

      @media(max-width:800px) {

        #newsEditorModal {
          padding:0;
          align-items:stretch;
        }

        .news-editor-box {
          width:100%;
          height:100%;
          max-height:none;
          border-radius:0;
        }

        .editor-grid {
          grid-template-columns:1fr;
        }

        .news-editor-body {
          padding:12px;
        }

        .editor-card {
          padding:14px;
        }

        .editor-footer {
          flex-direction:column;
          align-items:stretch;
        }

        .editor-footer-right {
          width:100%;
        }

        .editor-footer-right .editor-btn {
          flex:1;
        }

      }

    `;

    document.head.appendChild(style);


    const modal = document.createElement("div");

    modal.id = "newsEditorModal";

    modal.innerHTML = `

      <div class="news-editor-box">

        <div class="news-editor-header">

          <div>

            <div
              class="news-editor-title"
              id="newsEditorTitle"
            >
              नया समाचार
            </div>

            <div class="news-editor-subtitle">
              समाचार, URL, श्रेणी, टैग आ SEO एके जगह manage करू
            </div>

          </div>

          <button
            class="news-editor-close"
            onclick="window.closeNewsEditor()"
          >
            ×
          </button>

        </div>


        <div class="news-editor-body">

          <div
            class="editor-message"
            id="newsEditorMessage"
          ></div>


          <div class="editor-grid">


            <!-- =========================================
                 LEFT
            ========================================== -->

            <div>


              <div class="editor-card">

                <div class="editor-card-title">
                  📰 समाचार विवरण
                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    शीर्षक <span>*</span>
                  </label>

                  <input
                    class="editor-input"
                    id="editorTitle"
                    placeholder="समाचारक शीर्षक लिखू..."
                  >

                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    संक्षिप्त विवरण
                  </label>

                  <textarea
                    class="editor-textarea"
                    id="editorSummary"
                    placeholder="समाचारक छोट विवरण..."
                  ></textarea>

                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    समाचार <span>*</span>
                  </label>

                  <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px;">
                    <button type="button" class="editor-btn" onclick="window.insertNewsImageUrl()">🖼️ URL सँ चित्र जोड़ू</button>
                  </div>

                  <textarea
                    class="editor-textarea"
                    id="newsContentEditor"
                    placeholder="पूरा समाचार लिखू..."
                  ></textarea>

                </div>

              </div>


              <div class="editor-card">

                <div class="editor-card-title">
                  🔗 News URL
                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    English Slug <span>*</span>
                  </label>


                  <div class="slug-row">

                    <input
                      class="editor-input"
                      id="editorSlug"
                      placeholder="mithila-news-example"
                    >

                    <button
                      class="editor-btn"
                      type="button"
                      onclick="window.generateNewsSlug()"
                    >
                      Generate
                    </button>

                  </div>


                  <div
                    class="slug-status"
                    id="slugStatus"
                  ></div>


                  <div
                    class="editor-url-preview"
                  >
                    URL:
                    <strong id="slugPreview">
                      /news/...
                    </strong>
                  </div>

                </div>

              </div>


              <div class="editor-card">

                <div class="editor-card-title">
                  🔍 SEO
                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    SEO Title
                  </label>

                  <input
                    class="editor-input"
                    id="editorSeoTitle"
                    placeholder="SEO title..."
                  >

                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    SEO Description
                  </label>

                  <textarea
                    class="editor-textarea"
                    id="editorSeoDescription"
                    placeholder="Google search description..."
                  ></textarea>

                </div>

              </div>


            </div>


            <!-- =========================================
                 RIGHT
            ========================================== -->

            <div>


              <div class="editor-card">

                <div class="editor-card-title">
                  ⚙️ प्रकाशन
                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    श्रेणी
                  </label>

                  <select
                    class="editor-select"
                    id="editorCategory"
                  >

                    <option value="">
                      श्रेणी चुनू
                    </option>

                  </select>

                </div>

                <div class="editor-field">
                  <label class="editor-label">Sub-category</label>
                  <select class="editor-select" id="editorSubcategory">
                    <option value="">पहिने श्रेणी चुनू</option>
                  </select>

                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    Status
                  </label>

                  <select
                    class="editor-select"
                    id="editorStatus"
                  >

                    <option value="draft">
                      Draft
                    </option>

                    <option value="published">
                      Published
                    </option>

                    <option value="archived">
                      Archived
                    </option>

                  </select>

                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    Publish Date
                  </label>

                  <input
                    type="datetime-local"
                    class="editor-input"
                    id="editorPublishedAt"
                  >

                </div>


                <label class="featured-box">

                  <input
                    type="checkbox"
                    id="editorFeatured"
                  >

                  <span>
                    ⭐ Featured News
                  </span>

                </label>

              </div>


              <div class="editor-card">

                <div class="editor-card-title">
                  🏷️ Tags
                </div>


                <input
                  class="editor-input"
                  id="tagSearchInput"
                  placeholder="Tag खोजू..."
                >


                <div
                  class="tag-list"
                  id="editorTagList"
                >
                  लोड भ' रहल अछि...
                </div>


                <div
                  class="selected-tags"
                  id="selectedTags"
                ></div>

              </div>


              <div class="editor-card">

                <div class="editor-card-title">
                  🖼️ Featured Image
                </div>


                <div class="editor-field">

                  <label class="editor-label">
                    Image URL
                  </label>

                  <input
                    class="editor-input"
                    id="editorImageUrl"
                    placeholder="https://..."
                  >

                  <div
                    class="image-preview"
                    id="editorImagePreview"
                  >
                    Image preview
                  </div>

                </div>

              </div>


            </div>

          </div>

        </div>


        <div class="editor-footer">

          <div
            class="editor-footer-left"
            id="editorSaveInfo"
          >
            * जरूरी field भरू
          </div>


          <div class="editor-footer-right">

            <button
              class="editor-btn"
              onclick="window.closeNewsEditor()"
            >
              Cancel
            </button>


            <button
              class="editor-btn dark"
              id="saveDraftBtn"
              onclick="window.saveNews('draft')"
            >
              Draft Save करू
            </button>


            <button
              class="editor-btn primary"
              id="publishNewsBtn"
              onclick="window.saveNews('published')"
            >
              Publish करू
            </button>

          </div>

        </div>

      </div>

    `;


    document.body.appendChild(modal);


    /* Auto slug */

    document
      .getElementById("editorTitle")
      .addEventListener(
        "input",
        function () {

          const slug =
            document.getElementById(
              "editorSlug"
            );


          if (
            editorMode === "create" &&
            !slug.dataset.manual
          ) {

            slug.value =
              makeEnglishSlug(
                this.value
              );

            updateSlugPreview();

          }

        }
      );


    /* Manual slug */

    document
      .getElementById("editorSlug")
      .addEventListener(
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


    /* Category -> Sub-category */

    document.getElementById("editorCategory").addEventListener("change", function(){
      fillSubcategories(this.value, null);
    });


    /* Image preview */

    document
      .getElementById("editorImageUrl")
      .addEventListener(
        "input",
        updateImagePreview
      );


    /* Tag search */

    document
      .getElementById("tagSearchInput")
      .addEventListener(
        "input",
        renderEditorTags
      );


    /* Close by backdrop */

    modal.addEventListener(
      "click",
      function (event) {

        if (
          event.target === modal
        ) {

          closeNewsEditor();

        }

      }
    );

  }


  /* =======================================================
     LOAD CATEGORIES + TAGS
  ======================================================= */

  async function loadEditorMasters() {

    try {

      const [
        categoryResponse,
        tagResponse
      ] = await Promise.all([

        fetch(
          "/api/categories?status=active"
        ),

        fetch(
          "/api/tags?status=active"
        )

      ]);


      const categoryData =
        await categoryResponse.json();

      const tagData =
        await tagResponse.json();


      categories =
        categoryData.categories ||
        [];


      tags =
        tagData.tags ||
        [];


      fillCategories();
      fillSubcategories();

      renderEditorTags();


    } catch (error) {

      console.error(
        "Editor master load error:",
        error
      );

    }

  }


  /* =======================================================
     CATEGORIES
  ======================================================= */

  function fillCategories() {

    const select =
      document.getElementById(
        "editorCategory"
      );


    if (!select) {
      return;
    }


    select.innerHTML =
      `<option value="">
        श्रेणी चुनू
      </option>`;


    categories.forEach(
      category => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          category.id;


        option.textContent =
          category.name;


        select.appendChild(
          option
        );

      }
    );

  }


  function fillSubcategories(parentId = null, selectedId = null) {
    const select = document.getElementById("editorSubcategory");
    if(!select) return;
    select.innerHTML = '<option value="">Sub-category चुनू</option>';
    if(!parentId) return;
    categories.filter(c => Number(c.parent_id || 0) === Number(parentId)).forEach(c => {
      const o=document.createElement("option"); o.value=c.id; o.textContent=c.name;
      if(selectedId && Number(selectedId)===Number(c.id)) o.selected=true;
      select.appendChild(o);
    });
  }

  /* =======================================================
     TAGS
  ======================================================= */

  function renderEditorTags() {

    const container =
      document.getElementById(
        "editorTagList"
      );


    if (!container) {
      return;
    }


    const search =
      (
        document.getElementById(
          "tagSearchInput"
        )?.value ||
        ""
      )
        .trim()
        .toLowerCase();


    const filtered =
      tags.filter(
        tag => {

          return (
            !search ||
            String(
              tag.name || ""
            )
              .toLowerCase()
              .includes(search)
          );

        }
      );


    if (!filtered.length) {

      container.innerHTML =
        `<span
          style="
            color:#999;
            font-size:10px;
          "
        >
          Tag नहि भेटल।
        </span>`;

      return;

    }


    container.innerHTML =
      filtered
        .map(
          tag => {

            const selected =
              isTagSelected(
                tag.id
              );


            return `
              <button
                type="button"
                class="tag-option ${
                  selected
                    ? "selected"
                    : ""
                }"
                onclick="
                  window.toggleEditorTag(
                    ${Number(tag.id)}
                  )
                "
              >
                #${escapeHtml(
                  tag.name
                )}
              </button>
            `;

          }
        )
        .join("");

  }


  function isTagSelected(
    id
  ) {

    return selectedTagIds.has(
      Number(id)
    );

  }


  const selectedTagIds =
    new Set();


  function toggleEditorTag(
    id
  ) {

    id =
      Number(id);


    if (
      selectedTagIds.has(id)
    ) {

      selectedTagIds.delete(id);

    } else {

      selectedTagIds.add(id);

    }


    renderEditorTags();

    renderSelectedTags();

  }


  function renderSelectedTags() {

    const container =
      document.getElementById(
        "selectedTags"
      );


    if (!container) {
      return;
    }


    const selected =
      tags.filter(
        tag =>
          selectedTagIds.has(
            Number(tag.id)
          )
      );


    if (!selected.length) {

      container.innerHTML =
        "";

      return;

    }


    container.innerHTML =
      selected
        .map(
          tag => {

            return `
              <span
                class="selected-tag"
              >

                #${escapeHtml(
                  tag.name
                )}

                <button
                  type="button"
                  onclick="
                    window.toggleEditorTag(
                      ${Number(tag.id)}
                    )
                  "
                >
                  ×
                </button>

              </span>
            `;

          }
        )
        .join("");

  }


  /* =======================================================
     OPEN CREATE
  ======================================================= */

  window.openNewsEditor =
    function () {

      editorMode =
        "create";

      editingId =
        null;


      resetEditor();


      document
        .getElementById(
          "newsEditorTitle"
        )
        .textContent =
        "नया समाचार";


      document
        .getElementById(
          "newsEditorModal"
        )
        .classList.add(
          "show"
        );


      document
        .getElementById(
          "editorTitle"
        )
        .focus();

    };


  /* =======================================================
     OPEN EDIT
  ======================================================= */

  window.openNewsEditorEdit =
    async function (id) {

      editorMode =
        "edit";

      editingId =
        id;


      resetEditor();


      document
        .getElementById(
          "newsEditorTitle"
        )
        .textContent =
        "समाचार Edit करू";


      document
        .getElementById(
          "newsEditorModal"
        )
        .classList.add(
          "show"
        );


      try {

        const response =
          await fetch(
            "/api/news?id=" +
            encodeURIComponent(
              id
            ) +
            "&no_view=1"
          );


        const data =
          await response.json();


        if (
          !data.success ||
          !data.news
        ) {

          throw new Error(
            data.error ||
            "समाचार नहि भेटल"
          );

        }


        fillEditor(
          data.news
        );


      } catch (error) {

        showEditorMessage(
          error.message,
          "error"
        );

      }

    };


  /* =======================================================
     RESET
  ======================================================= */

  function resetEditor() {

    const ids = [

      "editorTitle",
      "editorSummary",
      "newsContentEditor",
      "editorSlug",
      "editorSeoTitle",
      "editorSeoDescription",
      "editorImageUrl"

    ];


    ids.forEach(
      id => {

        const element =
          document.getElementById(
            id
          );


        if (element) {

          element.value =
            "";

        }

      }
    );


    document
      .getElementById(
        "editorCategory"
      )
      .value =
      "";

    const subcategory = document.getElementById("editorSubcategory");
    if(subcategory){ subcategory.innerHTML = '<option value="">पहिने श्रेणी चुनू</option>'; subcategory.value = ""; }


    document
      .getElementById(
        "editorStatus"
      )
      .value =
      "draft";


    document
      .getElementById(
        "editorPublishedAt"
      )
      .value =
      "";


    document
      .getElementById(
        "editorFeatured"
      )
      .checked =
      false;


    selectedTagIds.clear();


    document
      .getElementById(
        "slugStatus"
      )
      .textContent =
      "";


    document
      .getElementById(
        "slugPreview"
      )
      .textContent =
      "/news/...";


    document
      .getElementById(
        "editorImagePreview"
      )
      .innerHTML =
      "Image preview";


    hideEditorMessage();

  }


  /* =======================================================
     FILL EDITOR
  ======================================================= */

  function fillEditor(
    news
  ) {

    setValue(
      "editorTitle",
      news.title
    );


    setValue(
      "editorSummary",
      news.summary
    );


    setValue(
      "newsContentEditor",
      contentForEditor(
        news.content
      )
    );


    setValue(
      "editorSlug",
      news.slug
    );


    document
      .getElementById(
        "editorSlug"
      )
      .dataset.manual =
      "1";


    setValue(
      "editorSeoTitle",
      news.seo_title ||
      news.title
    );


    setValue(
      "editorSeoDescription",
      news.seo_description ||
      news.summary ||
      ""
    );


    setValue(
      "editorImageUrl",
      news.image_url
    );


    const selectedCategoryId = Number(news.category_id || 0);
    const selectedCategory = categories.find(c => Number(c.id) === selectedCategoryId);
    const parentId = selectedCategory?.parent_id ? Number(selectedCategory.parent_id) : selectedCategoryId;
    const parentCategory = categories.find(c => Number(c.id) === parentId);
    const categorySelect = document.getElementById("editorCategory");
    if(categorySelect){ categorySelect.value = parentCategory?.id || selectedCategoryId || ""; }
    fillSubcategories(parentCategory?.id || null, selectedCategory?.parent_id ? selectedCategoryId : null);


    document
      .getElementById(
        "editorStatus"
      )
      .value =
      news.status ||
      "draft";


    document
      .getElementById(
        "editorFeatured"
      )
      .checked =
      Number(
        news.featured || 0
      ) === 1;


    if (
      news.published_at
    ) {

      const date =
        new Date(
          news.published_at
        );


      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {

        const local =
          new Date(
            date.getTime() -
            date.getTimezoneOffset() *
              60000
          )
            .toISOString()
            .slice(
              0,
              16
            );


        setValue(
          "editorPublishedAt",
          local
        );

      }

    }


    selectedTagIds.clear();


    if (
      Array.isArray(
        news.tags
      )
    ) {

      news.tags.forEach(
        tag => {

          selectedTagIds.add(
            Number(
              tag.id
            )
          );

        }
      );

    }


    renderEditorTags();

    renderSelectedTags();

    updateSlugPreview();

    updateImagePreview();

  }


  /* =======================================================
     GENERATE SLUG
  ======================================================= */

  window.generateNewsSlug =
    function () {

      const title =
        document.getElementById(
          "editorTitle"
        ).value;


      const slug =
        document.getElementById(
          "editorSlug"
        );


      slug.value =
        makeEnglishSlug(
          title
        );


      slug.dataset.manual =
        "";


      updateSlugPreview();

    };


  function makeEnglishSlug(
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


  function updateSlugPreview() {

    const slug =
      document.getElementById(
        "editorSlug"
      ).value;


    document
      .getElementById(
        "slugPreview"
      )
      .textContent =
      slug
        ? "/news/" + slug
        : "/news/...";


    const status =
      document.getElementById(
        "slugStatus"
      );


    if (!slug) {

      status.textContent =
        "";

      return;

    }


    if (
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/
        .test(slug)
    ) {

      status.textContent =
        "✓ URL format सही अछि";

      status.className =
        "slug-status ok";

    } else {

      status.textContent =
        "URL में केवल English अक्षर, number आ hyphen उपयोग करू";

      status.className =
        "slug-status error";

    }

  }


  /* =======================================================
     IMAGE
  ======================================================= */

  function updateImagePreview() {

    const url =
      document.getElementById(
        "editorImageUrl"
      ).value.trim();


    const preview =
      document.getElementById(
        "editorImagePreview"
      );


    if (!url) {

      preview.innerHTML =
        "Image preview";

      return;

    }


    preview.innerHTML =
      `
        <img
          src="${escapeHtml(url)}"
          alt="Preview"
          onerror="
            this.parentElement.innerHTML =
            'Image load नहि भेल'
          "
        >
      `;

  }


  /* =======================================================
     NORMALIZE EDITOR CONTENT
     Converts pasted HTML (<div>, <br>, <p>, etc.) into
     clean text while preserving inline images as markers.
  ======================================================= */

  function normalizeEditorContent(value) {

    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    // Plain text: keep it as-is.
    if (!/[<][a-z!/][^>]*>/i.test(raw)) {
      return raw
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(
      "<div id=\"__news_root__\">" + raw + "</div>",
      "text/html"
    );

    const root = doc.getElementById("__news_root__");

    if (!root) {
      return raw;
    }

    function walk(node) {

      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName.toLowerCase();

      if (tag === "script" || tag === "style" || tag === "iframe") {
        return "";
      }

      if (tag === "img") {
        const url =
          node.getAttribute("src") || "";

        if (!/^https?:\/\//i.test(url)) {
          return "";
        }

        const alt =
          (node.getAttribute("alt") || "चित्र")
            .replace(/[{}|]/g, " ")
            .trim();

        return "\n\n{{image:" + url + "|" + alt + "}}\n\n";
      }

      if (tag === "br") {
        return "\n";
      }

      let result = "";

      node.childNodes.forEach(function (child) {
        result += walk(child);
      });

      if (
        ["div", "p", "section", "article", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "li"].includes(tag)
      ) {
        result += "\n\n";
      }

      return result;
    }

    return walk(root)
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }


  /* =======================================================
     EDITOR DISPLAY CLEANUP
  ======================================================= */

  function contentForEditor(value) {
    return normalizeEditorContent(value);
  }

  /* =======================================================
     SAVE
  ======================================================= */

  window.saveNews =
    async function (
      forcedStatus
    ) {

      const title =
        document.getElementById(
          "editorTitle"
        ).value.trim();


      const content =
        normalizeEditorContent(
          document.getElementById(
            "newsContentEditor"
          ).value
        );


      // Keep the editor clean after saving pasted HTML.
      document.getElementById(
        "newsContentEditor"
      ).value = content;


      let slug =
        document.getElementById(
          "editorSlug"
        ).value.trim();


      if (!title) {

        showEditorMessage(
          "शीर्षक जरूरी अछि।",
          "error"
        );

        return;

      }


      if (!content) {

        showEditorMessage(
          "समाचार जरूरी अछि।",
          "error"
        );

        return;

      }


      if (!slug) {

        slug =
          makeEnglishSlug(
            title
          );

        document
          .getElementById(
            "editorSlug"
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
          .test(slug)
      ) {

        showEditorMessage(
          "English News URL सही रूप में लिखू। उदाहरण: mithila-news-2026",
          "error"
        );

        return;

      }


      const status =
        forcedStatus ||
        document.getElementById(
          "editorStatus"
        ).value;


      const publishedAt =
        document.getElementById(
          "editorPublishedAt"
        ).value;


      const payload = {

        title,

        slug,

        summary:
          document.getElementById(
            "editorSummary"
          ).value.trim(),

        content,

        image_url:
          document.getElementById(
            "editorImageUrl"
          ).value.trim(),

        category_id:
          (document.getElementById("editorSubcategory")?.value || document.getElementById("editorCategory")?.value) || null,

        status,

        featured:
          document.getElementById(
            "editorFeatured"
          ).checked,

        seo_title:
          document.getElementById(
            "editorSeoTitle"
          ).value.trim(),

        seo_description:
          document.getElementById(
            "editorSeoDescription"
          ).value.trim(),

        published_at:
          publishedAt
            ? new Date(
                publishedAt
              ).toISOString()
            : null,

        tags:
          Array.from(
            selectedTagIds
          )

      };


      const buttons =
        document.querySelectorAll(
          "#saveDraftBtn,#publishNewsBtn"
        );


      buttons.forEach(
        button => {

          button.disabled =
            true;

        }
      );


      try {

        let url =
          "/api/news";


        let method =
          "POST";


        if (
          editorMode ===
          "edit"
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

              body:
                JSON.stringify(
                  payload
                )

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
            "समाचार save नहि भेल"
          );

        }


        showEditorMessage(
          data.message ||
          "समाचार सफलतापूर्वक save भ' गेल।",
          "success"
        );


        setTimeout(
          () => {

            closeNewsEditor();


            if (
              typeof window.loadNews ===
              "function"
            ) {

              window.loadNews();

            }


            if (
              typeof window.loadOverview ===
              "function"
            ) {

              window.loadOverview();

            }

          },
          700
        );


      } catch (error) {

        console.error(
          "SAVE NEWS ERROR:",
          error
        );


        showEditorMessage(
          error.message ||
          "समाचार save नहि भेल",
          "error"
        );

      } finally {

        buttons.forEach(
          button => {

            button.disabled =
              false;

          }
        );

      }

    };


  window.insertNewsImageUrl = function(){
    const url = prompt("चित्रक direct URL लिखू:");
    if(!url) return;
    try{ new URL(url); }catch(e){ showEditorMessage("सही image URL लिखू।", "error"); return; }
    const alt = prompt("चित्रक नाम/Alt text (optional):") || "चित्र";
    const textarea = document.getElementById("newsContentEditor");
    if(!textarea) return;
    const marker = `\n\n{{image:${url}|${alt.replace(/[{}|]/g, " ")}}}\n\n`;
    const start=textarea.selectionStart ?? textarea.value.length;
    const end=textarea.selectionEnd ?? start;
    textarea.value = textarea.value.slice(0,start)+marker+textarea.value.slice(end);
    textarea.focus();
    textarea.selectionStart=textarea.selectionEnd=start+marker.length;
  };


  /* =======================================================
     CLOSE
  ======================================================= */

  window.closeNewsEditor =
    function () {

      const modal =
        document.getElementById(
          "newsEditorModal"
        );


      if (modal) {

        modal.classList.remove(
          "show"
        );

      }

    };


  /* =======================================================
     MESSAGE
  ======================================================= */

  function showEditorMessage(
    message,
    type
  ) {

    const box =
      document.getElementById(
        "newsEditorMessage"
      );


    box.textContent =
      message;


    box.className =
      "editor-message " +
      type +
      " show";

  }


  function hideEditorMessage() {

    const box =
      document.getElementById(
        "newsEditorMessage"
      );


    if (box) {

      box.className =
        "editor-message";

      box.textContent =
        "";

    }

  }


  /* =======================================================
     HELPERS
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


  /* =======================================================
     EXPOSE
  ======================================================= */

  window.toggleEditorTag =
    toggleEditorTag;

})();
