/* =========================================================
   media-manager.js
   Professional Media Library
========================================================= */

(function () {

  let mediaItems = [];
  let editingMediaId = null;


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createMediaUI();
      loadMedia();

    }
  );


  /* =======================================================
     UI
  ======================================================= */

  function createMediaUI() {

    if (
      document.getElementById(
        "mediaManagerModal"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `

      .media-toolbar {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
        margin-bottom:15px;
      }

      .media-search {
        width:260px;
        height:38px;
        border:1px solid #ddd;
        border-radius:7px;
        padding:0 11px;
        outline:none;
        font-size:12px;
      }

      .media-search:focus {
        border-color:#8b0000;
      }

      .media-grid {
        display:grid;
        grid-template-columns:
          repeat(4,minmax(0,1fr));
        gap:15px;
      }

      .media-card {
        border:1px solid #e5e7eb;
        border-radius:10px;
        overflow:hidden;
        background:#fff;
      }

      .media-image {
        width:100%;
        aspect-ratio:16/10;
        background:#f4f4f4;
        overflow:hidden;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#999;
        font-size:11px;
      }

      .media-image img {
        width:100%;
        height:100%;
        object-fit:cover;
      }

      .media-info {
        padding:10px;
      }

      .media-name {
        font-size:11px;
        font-weight:700;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .media-url {
        color:#888;
        font-size:9px;
        margin-top:4px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .media-actions {
        display:flex;
        gap:5px;
        margin-top:9px;
      }

      .media-action {
        flex:1;
        height:30px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        cursor:pointer;
        font-size:10px;
      }

      .media-action:hover {
        background:#f6f6f6;
      }

      .media-action.delete {
        color:#c62828;
      }

      .media-empty {
        padding:50px 20px;
        text-align:center;
        color:#999;
      }

      .media-modal {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:8000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      .media-modal.show {
        display:flex;
      }

      .media-modal-box {
        width:min(600px,100%);
        background:#fff;
        border-radius:14px;
        overflow:hidden;
        box-shadow:
          0 20px 60px
          rgba(0,0,0,.25);
      }

      .media-modal-header {
        padding:17px 20px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        align-items:center;
        justify-content:space-between;
      }

      .media-modal-title {
        font-weight:800;
        font-size:17px;
      }

      .media-close {
        width:35px;
        height:35px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:7px;
        cursor:pointer;
        font-size:18px;
      }

      .media-modal-body {
        padding:20px;
      }

      .media-field {
        margin-bottom:14px;
      }

      .media-label {
        display:block;
        font-size:11px;
        font-weight:700;
        margin-bottom:6px;
      }

      .media-input {
        width:100%;
        height:40px;
        border:1px solid #ddd;
        border-radius:7px;
        padding:0 11px;
        outline:none;
        font-size:12px;
      }

      .media-input:focus {
        border-color:#8b0000;
      }

      .media-preview {
        width:100%;
        height:190px;
        border:1px dashed #ccc;
        border-radius:8px;
        margin-top:10px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        color:#999;
        background:#fafafa;
      }

      .media-preview img {
        width:100%;
        height:100%;
        object-fit:contain;
      }

      .media-modal-footer {
        padding:13px 20px;
        border-top:1px solid #e5e7eb;
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }

      .media-btn {
        height:38px;
        padding:0 15px;
        border:1px solid #ddd;
        border-radius:7px;
        background:#fff;
        cursor:pointer;
        font-size:11px;
        font-weight:700;
      }

      .media-btn.primary {
        background:#8b0000;
        color:#fff;
        border-color:#8b0000;
      }

      @media(max-width:1000px) {

        .media-grid {
          grid-template-columns:
            repeat(3,minmax(0,1fr));
        }

      }

      @media(max-width:700px) {

        .media-grid {
          grid-template-columns:
            repeat(2,minmax(0,1fr));
        }

        .media-search {
          width:100%;
        }

      }

      @media(max-width:450px) {

        .media-grid {
          grid-template-columns:1fr;
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
      "mediaManagerModal";


    modal.className =
      "media-modal";


    modal.innerHTML = `

      <div class="media-modal-box">

        <div class="media-modal-header">

          <div
            class="media-modal-title"
          >
            Image जोड़ू
          </div>

          <button
            class="media-close"
            onclick="
              window.closeMediaModal()
            "
          >
            ×
          </button>

        </div>


        <div class="media-modal-body">

          <div class="media-field">

            <label class="media-label">
              Image URL <span style="color:#b00000">*</span>
            </label>

            <input
              class="media-input"
              id="mediaUrlInput"
              placeholder="https://example.com/image.jpg"
            >

            <div
              class="media-preview"
              id="mediaPreview"
            >
              Image Preview
            </div>

          </div>


          <div class="media-field">

            <label class="media-label">
              Image Name
            </label>

            <input
              class="media-input"
              id="mediaNameInput"
              placeholder="mithila-news.jpg"
            >

          </div>

        </div>


        <div class="media-modal-footer">

          <button
            class="media-btn"
            onclick="
              window.closeMediaModal()
            "
          >
            Cancel
          </button>

          <button
            class="media-btn primary"
            id="mediaSaveButton"
            onclick="
              window.saveMediaItem()
            "
          >
            Save Image
          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    document
      .getElementById(
        "mediaUrlInput"
      )
      .addEventListener(
        "input",
        updatePreview
      );

  }


  /* =======================================================
     LOAD
  ======================================================= */

  async function loadMedia() {

    const container =
      document.getElementById(
        "mediaContainer"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      `
        <div class="loading">
          Media लोड भ' रहल अछि...
        </div>
      `;


    /*
     * Backend API उपलब्ध होयत तऽ
     * ओतय सँ media लेंगे।
     */

    try {

      const response =
        await fetch(
          "/api/media"
        );


      if (
        response.ok
      ) {

        const data =
          await response.json();


        if (
          data.success
        ) {

          mediaItems =
            data.media ||
            data.items ||
            [];


          renderMedia();

          return;

        }

      }

    } catch (
      error
    ) {

      console.warn(
        "Media API:",
        error
      );

    }


    /*
     * API अभी नहि अछि।
     */

    mediaItems =
      getLocalMedia();


    renderMedia();

  }


  /* =======================================================
     RENDER
  ======================================================= */

  function renderMedia() {

    const container =
      document.getElementById(
        "mediaContainer"
      );


    if (!container) {
      return;
    }


    const search =
      (
        document.getElementById(
          "mediaSearch"
        )?.value ||
        ""
      )
        .trim()
        .toLowerCase();


    let items =
      mediaItems;


    if (search) {

      items =
        items.filter(
          item =>
            String(
              item.name ||
              ""
            )
              .toLowerCase()
              .includes(
                search
              ) ||
            String(
              item.url ||
              ""
            )
              .toLowerCase()
              .includes(
                search
              )
        );

    }


    if (
      !items.length
    ) {

      container.innerHTML =
        `

          <div class="media-empty">

            🖼️

            <br><br>

            एखन कोनो image नहि अछि।

            <br><br>

            <button
              class="media-btn primary"
              onclick="
                window.openMediaModal()
              "
            >
              + Image URL जोड़ू
            </button>

          </div>

        `;

      return;

    }


    container.innerHTML =
      `

        <div class="media-grid">

          ${items
            .map(
              item =>
                createMediaCard(
                  item
                )
            )
            .join("")}

        </div>

      `;

  }


  function createMediaCard(
    item
  ) {

    const id =
      encodeURIComponent(
        item.id ??
        item.url
      );


    return `

      <div
        class="media-card"
      >

        <div
          class="media-image"
        >

          <img
            src="${escapeHtml(
              item.url
            )}"
            alt="${escapeHtml(
              item.name ||
              ""
            )}"
            loading="lazy"
            onerror="
              this.style.display='none';
              this.parentElement.textContent='Image load नहि भेल';
            "
          >

        </div>


        <div class="media-info">

          <div
            class="media-name"
            title="${escapeHtml(
              item.name ||
              ""
            )}"
          >
            ${escapeHtml(
              item.name ||
              "Image"
            )}
          </div>


          <div
            class="media-url"
            title="${escapeHtml(
              item.url ||
              ""
            )}"
          >
            ${escapeHtml(
              item.url ||
              ""
            )}
          </div>


          <div
            class="media-actions"
          >

            <button
              class="media-action"
              onclick="
                window.copyMediaUrl(
                  '${id}'
                )
              "
            >
              📋 Copy
            </button>


            <button
              class="media-action"
              onclick="
                window.editMediaItem(
                  '${id}'
                )
              "
            >
              ✏️ Edit
            </button>


            <button
              class="media-action delete"
              onclick="
                window.deleteMediaItem(
                  '${id}'
                )
              "
            >
              🗑
            </button>

          </div>

        </div>

      </div>

    `;

  }


  /* =======================================================
     OPEN
  ======================================================= */

  window.openMediaModal =
    function (
      id = null
    ) {

      editingMediaId =
        id;


      document
        .getElementById(
          "mediaManagerModal"
        )
        .classList.add(
          "show"
        );


      document
        .getElementById(
          "mediaUrlInput"
        )
        .value =
        "";


      document
        .getElementById(
          "mediaNameInput"
        )
        .value =
        "";


      document
        .getElementById(
          "mediaPreview"
        )
        .innerHTML =
        "Image Preview";


      if (
        id !== null
      ) {

        const item =
          mediaItems.find(
            media =>
              String(
                media.id ??
                media.url
              ) ===
              String(id)
          );


        if (item) {

          document
            .getElementById(
              "mediaUrlInput"
            )
            .value =
            item.url ||
            "";


          document
            .getElementById(
              "mediaNameInput"
            )
            .value =
            item.name ||
            "";


          updatePreview();

        }

      }

    };


  window.closeMediaModal =
    function () {

      document
        .getElementById(
          "mediaManagerModal"
        )
        .classList.remove(
          "show"
        );

    };


  /* =======================================================
     PREVIEW
  ======================================================= */

  function updatePreview() {

    const url =
      document
        .getElementById(
          "mediaUrlInput"
        )
        .value
        .trim();


    const preview =
      document.getElementById(
        "mediaPreview"
      );


    if (!url) {

      preview.innerHTML =
        "Image Preview";

      return;

    }


    preview.innerHTML =
      `
        <img
          src="${escapeHtml(
            url
          )}"
          alt="Preview"
          onerror="
            this.parentElement.textContent =
            'Image load नहि भेल';
          "
        >
      `;

  }


  /* =======================================================
     SAVE
  ======================================================= */

  window.saveMediaItem =
    async function () {

      const url =
        document
          .getElementById(
            "mediaUrlInput"
          )
          .value
          .trim();


      let name =
        document
          .getElementById(
            "mediaNameInput"
          )
          .value
          .trim();


      if (!url) {

        alert(
          "Image URL जरूरी अछि।"
        );

        return;

      }


      if (!name) {

        name =
          getFileName(
            url
          );

      }


      const payload = {

        name,

        url,

        type:
          "image"

      };


      const button =
        document.getElementById(
          "mediaSaveButton"
        );


      button.disabled =
        true;


      button.textContent =
        "Saving...";


      try {

        const method =
          editingMediaId === null
            ? "POST"
            : "PUT";


        let endpoint =
          "/api/media";


        if (
          editingMediaId !== null
        ) {

          endpoint +=
            "?id=" +
            encodeURIComponent(
              editingMediaId
            );

        }


        const response =
          await fetch(
            endpoint,
            {

              method,

              headers:{
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


        /*
         * यदि backend अभी नहीं है,
         * local fallback उपयोग करब।
         */

        if (
          response.ok
        ) {

          const data =
            await response.json();


          if (
            data.success
          ) {

            closeMediaModal();

            loadMedia();

            return;

          }

        }


        /*
         * Local fallback
         */

        saveLocalMedia(
          payload
        );


        closeMediaModal();

        loadMedia();


      } catch (
        error
      ) {

        console.warn(
          "Media backend unavailable:",
          error
        );


        saveLocalMedia(
          payload
        );


        closeMediaModal();

        loadMedia();

      } finally {

        button.disabled =
          false;

        button.textContent =
          "Save Image";

      }

    };


  /* =======================================================
     EDIT
  ======================================================= */

  window.editMediaItem =
    function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      openMediaModal(
        id
      );

    };


  /* =======================================================
     DELETE
  ======================================================= */

  window.deleteMediaItem =
    async function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const item =
        mediaItems.find(
          media =>
            String(
              media.id ??
              media.url
            ) ===
            String(id)
        );


      if (!item) {
        return;
      }


      if (
        !confirm(
          "की ई image हटाबय चाहैत छी?"
        )
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            "/api/media?id=" +
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


        if (
          response.ok
        ) {

          const data =
            await response.json();


          if (
            data.success
          ) {

            loadMedia();

            return;

          }

        }

      } catch (
        error
      ) {

        console.warn(
          error
        );

      }


      /*
       * Local fallback
       */

      mediaItems =
        mediaItems.filter(
          media =>
            String(
              media.id ??
              media.url
            ) !==
            String(id)
        );


      saveLocalMediaList(
        mediaItems
      );


      renderMedia();

    };


  /* =======================================================
     COPY URL
  ======================================================= */

  window.copyMediaUrl =
    async function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const item =
        mediaItems.find(
          media =>
            String(
              media.id ??
              media.url
            ) ===
            String(id)
        );


      if (
        !item ||
        !item.url
      ) {
        return;
      }


      try {

        await navigator.clipboard.writeText(
          item.url
        );


        if (
          typeof window.showToast ===
          "function"
        ) {

          window.showToast(
            "Image URL copy भ' गेल।"
          );

        } else {

          alert(
            "Image URL copy भ' गेल।"
          );

        }

      } catch {

        prompt(
          "Image URL:",
          item.url
        );

      }

    };


  /* =======================================================
     LOCAL STORAGE FALLBACK
  ======================================================= */

  function getLocalMedia() {

    try {

      return JSON.parse(
        localStorage.getItem(
          "news_media_library"
        ) ||
        "[]"
      );

    } catch {

      return [];

    }

  }


  function saveLocalMedia(
    item
  ) {

    const list =
      getLocalMedia();


    const existingIndex =
      editingMediaId === null
        ? -1
        : list.findIndex(
            media =>
              String(
                media.id
              ) ===
              String(
                editingMediaId
              )
          );


    if (
      existingIndex >= 0
    ) {

      list[
        existingIndex
      ] = {

        ...list[
          existingIndex
        ],

        ...item

      };

    } else {

      list.unshift({

        id:
          "local-" +
          Date.now(),

        ...item,

        created_at:
          new Date().toISOString()

      });

    }


    saveLocalMediaList(
      list
    );

  }


  function saveLocalMediaList(
    list
  ) {

    localStorage.setItem(
      "news_media_library",
      JSON.stringify(
        list
      )
    );

  }


  /* =======================================================
     SEARCH
  ======================================================= */

  document.addEventListener(
    "input",
    function (
      event
    ) {

      if (
        event.target.id ===
        "mediaSearch"
      ) {

        renderMedia();

      }

    }
  );


  /* =======================================================
     HELPERS
  ======================================================= */

  function getFileName(
    url
  ) {

    try {

      const pathname =
        new URL(
          url
        ).pathname;


      return (
        pathname
          .split("/")
          .pop() ||
        "image"
      );

    } catch {

      return "image";

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


})();
