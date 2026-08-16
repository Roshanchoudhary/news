/* =========================================================
   tag-manager.js
   Professional Tag Management
========================================================= */

(function () {

  let editingId = null;


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createTagModal();

    }
  );


  /* =======================================================
     MODAL
  ======================================================= */

  function createTagModal() {

    if (
      document.getElementById(
        "tagManagerModal"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `

      #tagManagerModal {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:6000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      #tagManagerModal.show {
        display:flex;
      }

      .tag-manager-box {
        width:min(600px,100%);
        max-height:94vh;
        overflow:auto;
        background:#fff;
        border-radius:14px;
        box-shadow:
          0 20px 60px
          rgba(0,0,0,.25);
      }

      .tag-manager-header {
        padding:18px 20px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        justify-content:space-between;
        align-items:center;
      }

      .tag-manager-title {
        font-size:18px;
        font-weight:800;
      }

      .tag-manager-subtitle {
        color:#888;
        font-size:11px;
        margin-top:4px;
      }

      .tag-manager-close {
        width:36px;
        height:36px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:7px;
        cursor:pointer;
        font-size:18px;
      }

      .tag-manager-body {
        padding:20px;
      }

      .tag-manager-field {
        margin-bottom:15px;
      }

      .tag-manager-label {
        display:block;
        font-size:11px;
        font-weight:700;
        margin-bottom:6px;
      }

      .tag-manager-label span {
        color:#b00000;
      }

      .tag-manager-input,
      .tag-manager-textarea,
      .tag-manager-select {
        width:100%;
        border:1px solid #d8dbe0;
        border-radius:7px;
        padding:10px 11px;
        font-size:13px;
        outline:none;
        font-family:inherit;
        background:#fff;
      }

      .tag-manager-input:focus,
      .tag-manager-textarea:focus,
      .tag-manager-select:focus {
        border-color:#8b0000;
        box-shadow:
          0 0 0 2px
          rgba(139,0,0,.08);
      }

      .tag-manager-textarea {
        min-height:95px;
        resize:vertical;
      }

      .tag-manager-slug-row {
        display:flex;
        gap:7px;
      }

      .tag-manager-slug-row
      input {
        flex:1;
      }

      .tag-manager-preview {
        margin-top:6px;
        padding:8px;
        background:#f6f6f6;
        border-radius:6px;
        font-size:10px;
        color:#777;
        word-break:break-all;
      }

      .tag-manager-preview strong {
        color:#8b0000;
      }

      .tag-manager-options {
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      }

      .tag-manager-check {
        border:1px solid #e1e3e6;
        border-radius:8px;
        padding:11px;
        display:flex;
        align-items:center;
        gap:8px;
        font-size:12px;
        cursor:pointer;
      }

      .tag-manager-message {
        display:none;
        padding:9px 11px;
        border-radius:7px;
        margin-bottom:13px;
        font-size:11px;
      }

      .tag-manager-message.show {
        display:block;
      }

      .tag-manager-message.error {
        background:#ffeded;
        color:#a00000;
      }

      .tag-manager-message.success {
        background:#eaf7ef;
        color:#176b38;
      }

      .tag-manager-footer {
        padding:13px 20px;
        border-top:1px solid #e5e7eb;
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }

      .tag-manager-btn {
        height:38px;
        padding:0 15px;
        border-radius:7px;
        border:1px solid #ddd;
        background:#fff;
        cursor:pointer;
        font-size:12px;
        font-weight:700;
      }

      .tag-manager-btn.primary {
        background:#8b0000;
        color:#fff;
        border-color:#8b0000;
      }

      @media(max-width:600px) {

        #tagManagerModal {
          padding:0;
        }

        .tag-manager-box {
          width:100%;
          height:100%;
          max-height:none;
          border-radius:0;
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
      "tagManagerModal";


    modal.innerHTML = `

      <div class="tag-manager-box">

        <div class="tag-manager-header">

          <div>

            <div
              class="tag-manager-title"
              id="tagManagerTitle"
            >
              नया टैग
            </div>

            <div
              class="tag-manager-subtitle"
            >
              Tag आ ओकर English URL manage करू
            </div>

          </div>

          <button
            class="tag-manager-close"
            onclick="
              window.closeTagManager()
            "
          >
            ×
          </button>

        </div>


        <div class="tag-manager-body">

          <div
            class="tag-manager-message"
            id="tagManagerMessage"
          ></div>


          <div class="tag-manager-field">

            <label
              class="tag-manager-label"
            >
              टैग नाम <span>*</span>
            </label>

            <input
              class="tag-manager-input"
              id="tagName"
              placeholder="जैसे — बिहार"
            >

          </div>


          <div class="tag-manager-field">

            <label
              class="tag-manager-label"
            >
              English URL / Slug <span>*</span>
            </label>


            <div
              class="tag-manager-slug-row"
            >

              <input
                class="tag-manager-input"
                id="tagSlug"
                placeholder="bihar"
              >

              <button
                type="button"
                class="tag-manager-btn"
                onclick="
                  window.generateTagSlug()
                "
              >
                Generate
              </button>

            </div>


            <div
              class="tag-manager-preview"
            >
              URL:
              <strong
                id="tagUrlPreview"
              >
                /tag/...
              </strong>
            </div>

          </div>


          <div class="tag-manager-field">

            <label
              class="tag-manager-label"
            >
              विवरण
            </label>

            <textarea
              class="tag-manager-textarea"
              id="tagDescription"
              placeholder="Tag केर विवरण..."
            ></textarea>

          </div>


          <div class="tag-manager-options">

            <label
              class="tag-manager-check"
            >

              <input
                type="checkbox"
                id="tagActive"
                checked
              >

              <span>
                Active
              </span>

            </label>

          </div>

        </div>


        <div class="tag-manager-footer">

          <button
            class="tag-manager-btn"
            onclick="
              window.closeTagManager()
            "
          >
            Cancel
          </button>


          <button
            class="tag-manager-btn primary"
            id="tagSaveBtn"
            onclick="
              window.saveTag()
            "
          >
            Save Tag
          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    /* Auto slug */

    document
      .getElementById(
        "tagName"
      )
      .addEventListener(
        "input",
        function () {

          const slug =
            document.getElementById(
              "tagSlug"
            );


          if (
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


    /* Manual slug */

    document
      .getElementById(
        "tagSlug"
      )
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

  }


  /* =======================================================
     OPEN NEW TAG
  ======================================================= */

  window.openTagManager =
    function () {

      editingId =
        null;


      resetForm();


      document
        .getElementById(
          "tagManagerTitle"
        )
        .textContent =
        "नया टैग";


      document
        .getElementById(
          "tagManagerModal"
        )
        .classList.add(
          "show"
        );


      document
        .getElementById(
          "tagName"
        )
        .focus();

    };


  /* =======================================================
     OPEN EDIT TAG
  ======================================================= */

  window.openTagEdit =
    async function (
      id
    ) {

      editingId =
        id;


      resetForm();


      document
        .getElementById(
          "tagManagerTitle"
        )
        .textContent =
        "टैग Edit करू";


      document
        .getElementById(
          "tagManagerModal"
        )
        .classList.add(
          "show"
        );


      try {

        const response =
          await fetch(
            "/api/tags?id=" +
            encodeURIComponent(
              id
            )
          );


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            "Tag नहि भेटल"
          );

        }


        const tag =
          data.tag ||
          data.tags?.find(
            item =>
              Number(item.id) ===
              Number(id)
          );


        if (!tag) {

          throw new Error(
            "Tag नहि भेटल"
          );

        }


        fillForm(
          tag
        );


      } catch (
        error
      ) {

        showMessage(
          error.message,
          "error"
        );

      }

    };


  /* =======================================================
     RESET
  ======================================================= */

  function resetForm() {

    setValue(
      "tagName",
      ""
    );


    setValue(
      "tagSlug",
      ""
    );


    setValue(
      "tagDescription",
      ""
    );


    document
      .getElementById(
        "tagActive"
      )
      .checked =
      true;


    document
      .getElementById(
        "tagSlug"
      )
      .dataset.manual =
      "";


    updateSlugPreview();

    hideMessage();

  }


  /* =======================================================
     FILL
  ======================================================= */

  function fillForm(
    tag
  ) {

    setValue(
      "tagName",
      tag.name
    );


    setValue(
      "tagSlug",
      tag.slug
    );


    setValue(
      "tagDescription",
      tag.description
    );


    document
      .getElementById(
        "tagSlug"
      )
      .dataset.manual =
      "1";


    document
      .getElementById(
        "tagActive"
      )
      .checked =
      String(
        tag.status ||
        "active"
      ).toLowerCase() ===
      "active";


    updateSlugPreview();

  }


  /* =======================================================
     SLUG
  ======================================================= */

  window.generateTagSlug =
    function () {

      const name =
        document
          .getElementById(
            "tagName"
          )
          .value;


      const slug =
        document
          .getElementById(
            "tagSlug"
          );


      slug.value =
        makeSlug(
          name
        );


      slug.dataset.manual =
        "";


      updateSlugPreview();

    };


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
      document
        .getElementById(
          "tagSlug"
        )
        .value;


    document
      .getElementById(
        "tagUrlPreview"
      )
      .textContent =
      slug
        ? "/tag/" + slug
        : "/tag/...";

  }


  /* =======================================================
     SAVE TAG
  ======================================================= */

  window.saveTag =
    async function () {

      const name =
        document
          .getElementById(
            "tagName"
          )
          .value
          .trim();


      let slug =
        document
          .getElementById(
            "tagSlug"
          )
          .value
          .trim();


      if (!name) {

        showMessage(
          "टैग नाम जरूरी अछि।",
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
            "tagSlug"
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

        showMessage(
          "English URL सही नहि अछि। उदाहरण: bihar-news",
          "error"
        );

        return;

      }


      const payload = {

        name,

        slug,

        description:
          document
            .getElementById(
              "tagDescription"
            )
            .value
            .trim(),

        status:
          document
            .getElementById(
              "tagActive"
            )
            .checked
            ? "active"
            : "inactive"

      };


      const button =
        document.getElementById(
          "tagSaveBtn"
        );


      button.disabled =
        true;


      button.textContent =
        "Saving...";


      try {

        let url =
          "/api/tags";


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
            "Tag save नहि भेल"
          );

        }


        showMessage(
          data.message ||
          "Tag सफलतापूर्वक save भ' गेल।",
          "success"
        );


        setTimeout(
          () => {

            closeTagManager();


            if (
              typeof window.loadTags ===
              "function"
            ) {

              window.loadTags();

            }

          },
          700
        );


      } catch (
        error
      ) {

        console.error(
          "TAG SAVE:",
          error
        );


        showMessage(
          error.message,
          "error"
        );


      } finally {

        button.disabled =
          false;


        button.textContent =
          "Save Tag";

      }

    };


  /* =======================================================
     CLOSE
  ======================================================= */

  window.closeTagManager =
    function () {

      document
        .getElementById(
          "tagManagerModal"
        )
        .classList.remove(
          "show"
        );

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
        "tagManagerMessage"
      );


    box.textContent =
      message;


    box.className =
      "tag-manager-message " +
      type +
      " show";

  }


  function hideMessage() {

    const box =
      document.getElementById(
        "tagManagerMessage"
      );


    box.textContent =
      "";


    box.className =
      "tag-manager-message";

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

})();
