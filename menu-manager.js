/* =========================================================
   menu-manager.js
   Professional Website Menu Management
========================================================= */

(function () {

  let menuItems = [];
  let editingId = null;


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createMenuModal();

      loadMenuItems();

    }
  );


  /* =======================================================
     MODAL UI
  ======================================================= */

  function createMenuModal() {

    if (
      document.getElementById(
        "menuManagerModal"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `

      #menuManagerModal {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:7000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      #menuManagerModal.show {
        display:flex;
      }

      .menu-manager-box {
        width:min(650px,100%);
        max-height:94vh;
        overflow:auto;
        background:#fff;
        border-radius:14px;
        box-shadow:
          0 20px 60px
          rgba(0,0,0,.25);
      }

      .menu-manager-header {
        padding:18px 20px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        justify-content:space-between;
        align-items:center;
      }

      .menu-manager-title {
        font-size:18px;
        font-weight:800;
      }

      .menu-manager-subtitle {
        color:#888;
        font-size:11px;
        margin-top:4px;
      }

      .menu-manager-close {
        width:36px;
        height:36px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:7px;
        cursor:pointer;
        font-size:18px;
      }

      .menu-manager-body {
        padding:20px;
      }

      .menu-field {
        margin-bottom:15px;
      }

      .menu-label {
        display:block;
        font-size:11px;
        font-weight:700;
        margin-bottom:6px;
      }

      .menu-label span {
        color:#b00000;
      }

      .menu-input,
      .menu-select {
        width:100%;
        border:1px solid #d8dbe0;
        border-radius:7px;
        padding:10px 11px;
        font-size:13px;
        outline:none;
        font-family:inherit;
        background:#fff;
      }

      .menu-input:focus,
      .menu-select:focus {
        border-color:#8b0000;
        box-shadow:
          0 0 0 2px
          rgba(139,0,0,.08);
      }

      .menu-options {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
      }

      .menu-check {
        border:1px solid #e1e3e6;
        border-radius:8px;
        padding:11px;
        display:flex;
        align-items:center;
        gap:8px;
        font-size:12px;
        cursor:pointer;
      }

      .menu-message {
        display:none;
        padding:9px 11px;
        border-radius:7px;
        margin-bottom:13px;
        font-size:11px;
      }

      .menu-message.show {
        display:block;
      }

      .menu-message.error {
        background:#ffeded;
        color:#a00000;
      }

      .menu-message.success {
        background:#eaf7ef;
        color:#176b38;
      }

      .menu-url-preview {
        margin-top:6px;
        padding:8px;
        background:#f6f6f6;
        border-radius:6px;
        color:#777;
        font-size:10px;
        word-break:break-all;
      }

      .menu-url-preview strong {
        color:#8b0000;
      }

      .menu-footer {
        padding:13px 20px;
        border-top:1px solid #e5e7eb;
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }

      .menu-btn {
        height:38px;
        padding:0 15px;
        border-radius:7px;
        border:1px solid #ddd;
        background:#fff;
        cursor:pointer;
        font-size:12px;
        font-weight:700;
      }

      .menu-btn.primary {
        background:#8b0000;
        color:#fff;
        border-color:#8b0000;
      }

      .menu-list {
        display:flex;
        flex-direction:column;
        gap:8px;
      }

      .menu-item-row {
        display:flex;
        align-items:center;
        gap:10px;
        border:1px solid #e5e7eb;
        background:#fff;
        border-radius:9px;
        padding:10px;
        transition:.15s;
      }

      .menu-item-row:hover {
        border-color:#bbb;
      }

      .menu-drag {
        cursor:grab;
        color:#999;
        font-size:18px;
        width:25px;
        text-align:center;
      }

      .menu-item-info {
        flex:1;
        min-width:0;
      }

      .menu-item-name {
        font-size:12px;
        font-weight:800;
      }

      .menu-item-url {
        color:#999;
        font-size:10px;
        margin-top:3px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .menu-item-actions {
        display:flex;
        align-items:center;
        gap:5px;
      }

      .menu-small-btn {
        height:30px;
        min-width:30px;
        padding:0 7px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        cursor:pointer;
        font-size:11px;
      }

      .menu-small-btn:hover {
        background:#f5f5f5;
      }

      .menu-small-btn.delete {
        color:#c62828;
      }

      .menu-empty {
        padding:40px 20px;
        text-align:center;
        color:#999;
        font-size:12px;
      }

      .menu-tip {
        margin-top:12px;
        padding:10px;
        background:#f7f7f7;
        border-radius:7px;
        color:#777;
        font-size:10px;
        line-height:1.5;
      }

      @media(max-width:600px) {

        #menuManagerModal {
          padding:0;
        }

        .menu-manager-box {
          width:100%;
          height:100%;
          max-height:none;
          border-radius:0;
        }

        .menu-options {
          grid-template-columns:1fr;
        }

        .menu-item-row {
          align-items:flex-start;
        }

        .menu-item-actions {
          flex-wrap:wrap;
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
      "menuManagerModal";


    modal.innerHTML = `

      <div class="menu-manager-box">

        <div class="menu-manager-header">

          <div>

            <div
              class="menu-manager-title"
              id="menuManagerTitle"
            >
              नया Menu Item
            </div>

            <div
              class="menu-manager-subtitle"
            >
              Website navigation केँ सीधे manage करू
            </div>

          </div>

          <button
            class="menu-manager-close"
            onclick="
              window.closeMenuManager()
            "
          >
            ×
          </button>

        </div>


        <div class="menu-manager-body">

          <div
            class="menu-message"
            id="menuManagerMessage"
          ></div>


          <div class="menu-field">

            <label class="menu-label">
              Menu Name <span>*</span>
            </label>

            <input
              class="menu-input"
              id="menuName"
              placeholder="जैसे — मिथिला"
            >

          </div>


          <div class="menu-field">

            <label class="menu-label">
              Link Type
            </label>

            <select
              class="menu-select"
              id="menuLinkType"
            >

              <option value="custom">
                Custom URL
              </option>

              <option value="category">
                Category
              </option>

              <option value="tag">
                Tag
              </option>

              <option value="home">
                Home
              </option>

            </select>

          </div>


          <div class="menu-field">

            <label class="menu-label">
              URL <span>*</span>
            </label>

            <input
              class="menu-input"
              id="menuUrl"
              placeholder="/category/mithila"
            >

            <div class="menu-url-preview">

              Preview:
              <strong
                id="menuUrlPreview"
              >
                /

              </strong>

            </div>

          </div>


          <div class="menu-options">

            <label class="menu-check">

              <input
                type="checkbox"
                id="menuVisible"
                checked
              >

              <span>
                Menu में देखाउ
              </span>

            </label>


            <label class="menu-check">

              <input
                type="checkbox"
                id="menuNewTab"
              >

              <span>
                New Tab में खोलू
              </span>

            </label>

          </div>


          <div class="menu-field"
               style="margin-top:15px">

            <label class="menu-label">
              Menu Order
            </label>

            <input
              type="number"
              class="menu-input"
              id="menuOrder"
              value="0"
              min="0"
            >

          </div>


          <div class="menu-tip">

            💡 Menu Name मैथिली में रखि सकैत छी,
            मुदा URL English में रखब।
            उदाहरण:
            <b>मिथिला</b> →
            <b>/category/mithila</b>

          </div>

        </div>


        <div class="menu-footer">

          <button
            class="menu-btn"
            onclick="
              window.closeMenuManager()
            "
          >
            Cancel
          </button>

          <button
            class="menu-btn primary"
            id="menuSaveBtn"
            onclick="
              window.saveMenuItem()
            "
          >
            Save Menu
          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      modal
    );


    document
      .getElementById(
        "menuUrl"
      )
      .addEventListener(
        "input",
        updateUrlPreview
      );


    document
      .getElementById(
        "menuLinkType"
      )
      .addEventListener(
        "change",
        function () {

          const type =
            this.value;


          if (
            type === "home"
          ) {

            document
              .getElementById(
                "menuUrl"
              )
              .value =
              "/";

          }

          updateUrlPreview();

        }
      );

  }


  /* =======================================================
     LOAD MENU
  ======================================================= */

  async function loadMenuItems() {

    const container =
      document.getElementById(
        "menuContainer"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      `
        <div class="loading">
          Menu लोड भ' रहल अछि...
        </div>
      `;


    /*
     * पहिने /api/menu try करैत छी।
     */

    try {

      const response =
        await fetch(
          "/api/menu"
        );


      if (
        response.ok
      ) {

        const data =
          await response.json();


        if (
          data.success
        ) {

          menuItems =
            data.menu ||
            data.items ||
            [];


          renderMenuItems();

          return;

        }

      }

    } catch (
      error
    ) {

      console.warn(
        "Menu API not available:",
        error
      );

    }


    /*
     * API अभी नहि अछि तऽ खाली state.
     * अगिला backend step में D1 menu table जोड़ब।
     */

    menuItems = [];


    renderMenuItems();

  }


  /* =======================================================
     RENDER
  ======================================================= */

  function renderMenuItems() {

    const container =
      document.getElementById(
        "menuContainer"
      );


    if (!container) {
      return;
    }


    let visibleItems =
      menuItems
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            Number(
              a.menu_order ??
              a.sort_order ??
              a.order ??
              0
            ) -
            Number(
              b.menu_order ??
              b.sort_order ??
              b.order ??
              0
            )
        );


    if (
      !visibleItems.length
    ) {

      container.innerHTML =
        `

          <div class="menu-empty">

            🧭

            <br><br>

            एखन कोनो Menu Item नहि अछि।

            <br><br>

            <button
              class="menu-btn primary"
              onclick="
                window.openMenuManager()
              "
            >
              + पहिल Menu Item जोड़ू
            </button>

          </div>

        `;

      return;

    }


    container.innerHTML =
      `

        <div class="menu-list">

          ${visibleItems
            .map(
              (
                item,
                index
              ) => {

                const visible =
                  Number(
                    item.visible ??
                    item.menu_visible ??
                    1
                  ) === 1;


                return `

                  <div
                    class="menu-item-row"
                    draggable="true"
                    data-id="${
                      escapeHtml(
                        item.id
                      )
                    }"
                  >

                    <div class="menu-drag">
                      ☷
                    </div>


                    <div
                      class="menu-item-info"
                    >

                      <div
                        class="menu-item-name"
                      >

                        ${escapeHtml(
                          item.name ||
                          item.title ||
                          ""
                        )}

                        ${
                          visible

                          ? `
                            <span
                              class="badge success"
                              style="
                                margin-left:5px
                              "
                            >
                              Show
                            </span>
                          `

                          : `
                            <span
                              class="badge gray"
                              style="
                                margin-left:5px
                              "
                            >
                              Hidden
                            </span>
                          `
                        }

                      </div>


                      <div
                        class="menu-item-url"
                      >
                        ${escapeHtml(
                          item.url ||
                          item.href ||
                          "/"
                        )}
                      </div>

                    </div>


                    <div
                      class="menu-item-actions"
                    >

                      <button
                        class="menu-small-btn"
                        title="ऊपर"
                        onclick="
                          window.moveMenuItem(
                            ${index},
                            -1
                          )
                        "
                      >
                        ↑
                      </button>


                      <button
                        class="menu-small-btn"
                        title="नीचा"
                        onclick="
                          window.moveMenuItem(
                            ${index},
                            1
                          )
                        "
                      >
                        ↓
                      </button>


                      <button
                        class="menu-small-btn"
                        title="Edit"
                        onclick="
                          window.openMenuEdit(
                            '${encodeURIComponent(
                              item.id
                            )}'
                          )
                        "
                      >
                        ✏️
                      </button>


                      <button
                        class="menu-small-btn delete"
                        title="Delete"
                        onclick="
                          window.deleteMenuItem(
                            '${encodeURIComponent(
                              item.id
                            )}'
                          )
                        "
                      >
                        🗑
                      </button>

                    </div>

                  </div>

                `;

              }
            )
            .join("")}

        </div>


        <div class="menu-tip">

          Drag करके Menu Order बदलि सकैत छी।
          ऊपर ↑ आ नीचा ↓ सँ सेहो order बदलि सकैत छी।

        </div>

      `;


    setupDragDrop();

  }


  /* =======================================================
     CREATE
  ======================================================= */

  window.openMenuManager =
    function () {

      editingId =
        null;


      resetForm();


      document
        .getElementById(
          "menuManagerTitle"
        )
        .textContent =
        "नया Menu Item";


      document
        .getElementById(
          "menuManagerModal"
        )
        .classList.add(
          "show"
        );


      document
        .getElementById(
          "menuName"
        )
        .focus();

    };


  /* =======================================================
     EDIT
  ======================================================= */

  window.openMenuEdit =
    function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const item =
        menuItems.find(
          menu =>
            String(
              menu.id
            ) ===
            String(id)
        );


      if (!item) {

        showMessage(
          "Menu item नहि भेटल।",
          "error"
        );

        return;

      }


      editingId =
        id;


      resetForm();


      document
        .getElementById(
          "menuManagerTitle"
        )
        .textContent =
        "Menu Edit करू";


      document
        .getElementById(
          "menuName"
        )
        .value =
        item.name ||
        item.title ||
        "";


      document
        .getElementById(
          "menuUrl"
        )
        .value =
        item.url ||
        item.href ||
        "/";


      document
        .getElementById(
          "menuLinkType"
        )
        .value =
        item.link_type ||
        "custom";


      document
        .getElementById(
          "menuVisible"
        )
        .checked =
        Number(
          item.visible ??
          item.menu_visible ??
          1
        ) === 1;


      document
        .getElementById(
          "menuNewTab"
        )
        .checked =
        Number(
          item.new_tab ??
          0
        ) === 1;


      document
        .getElementById(
          "menuOrder"
        )
        .value =
        item.menu_order ??
        item.sort_order ??
        item.order ??
        0;


      updateUrlPreview();


      document
        .getElementById(
          "menuManagerModal"
        )
        .classList.add(
          "show"
        );

    };


  /* =======================================================
     RESET
  ======================================================= */

  function resetForm() {

    setValue(
      "menuName",
      ""
    );

    setValue(
      "menuUrl",
      "/"
    );

    setValue(
      "menuOrder",
      "0"
    );


    document
      .getElementById(
        "menuLinkType"
      )
      .value =
      "custom";


    document
      .getElementById(
        "menuVisible"
      )
      .checked =
      true;


    document
      .getElementById(
        "menuNewTab"
      )
      .checked =
      false;


    updateUrlPreview();

    hideMessage();

  }


  /* =======================================================
     SAVE
  ======================================================= */

  window.saveMenuItem =
    async function () {

      const name =
        document
          .getElementById(
            "menuName"
          )
          .value
          .trim();


      const url =
        document
          .getElementById(
            "menuUrl"
          )
          .value
          .trim();


      if (!name) {

        showMessage(
          "Menu Name जरूरी अछि।",
          "error"
        );

        return;

      }


      if (!url) {

        showMessage(
          "URL जरूरी अछि।",
          "error"
        );

        return;

      }


      const payload = {

        name,

        url,

        link_type:
          document
            .getElementById(
              "menuLinkType"
            )
            .value,

        visible:
          document
            .getElementById(
              "menuVisible"
            )
            .checked
            ? 1
            : 0,

        new_tab:
          document
            .getElementById(
              "menuNewTab"
            )
            .checked
            ? 1
            : 0,

        menu_order:
          Number(
            document
              .getElementById(
                "menuOrder"
              )
              .value ||
            0
          )

      };


      const button =
        document.getElementById(
          "menuSaveBtn"
        );


      button.disabled =
        true;

      button.textContent =
        "Saving...";


      try {

        const method =
          editingId === null
            ? "POST"
            : "PUT";


        let endpoint =
          "/api/menu";


        if (
          editingId !== null
        ) {

          endpoint +=
            "?id=" +
            encodeURIComponent(
              editingId
            );

        }


        const response =
          await fetch(
            endpoint,
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
            "Menu save नहि भेल"
          );

        }


        showMessage(
          data.message ||
          "Menu सफलतापूर्वक save भ' गेल।",
          "success"
        );


        setTimeout(
          () => {

            closeMenuManager();

            loadMenuItems();

          },
          600
        );


      } catch (
        error
      ) {

        console.error(
          "MENU SAVE:",
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
          "Save Menu";

      }

    };


  /* =======================================================
     DELETE
  ======================================================= */

  window.deleteMenuItem =
    async function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const item =
        menuItems.find(
          menu =>
            String(
              menu.id
            ) ===
            String(id)
        );


      if (!item) {
        return;
      }


      const name =
        item.name ||
        item.title ||
        "Menu";


      if (
        !confirm(
          `की "${name}" केँ menu सँ delete करय चाहैत छी?`
        )
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            "/api/menu?id=" +
            encodeURIComponent(
              id
            ),
            {
              method:"DELETE",
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
            "Menu delete नहि भेल"
          );

        }


        showMenuToast(
          "Menu delete भ' गेल।"
        );


        loadMenuItems();


      } catch (
        error
      ) {

        showMenuToast(
          error.message,
          "error"
        );

      }

    };


  /* =======================================================
     MOVE ORDER
  ======================================================= */

  window.moveMenuItem =
    async function (
      index,
      direction
    ) {

      const newIndex =
        index +
        direction;


      if (
        newIndex < 0 ||
        newIndex >=
          menuItems.length
      ) {

        return;

      }


      const sorted =
        menuItems
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              Number(
                a.menu_order ??
                a.sort_order ??
                a.order ??
                0
              ) -
              Number(
                b.menu_order ??
                b.sort_order ??
                b.order ??
                0
              )
          );


      const current =
        sorted[index];


      const target =
        sorted[newIndex];


      if (
        !current ||
        !target
      ) {

        return;

      }


      const currentOrder =
        Number(
          current.menu_order ??
          current.sort_order ??
          current.order ??
          index
        );


      const targetOrder =
        Number(
          target.menu_order ??
          target.sort_order ??
          target.order ??
          newIndex
        );


      try {

        await updateMenuOrder(
          current.id,
          targetOrder
        );


        await updateMenuOrder(
          target.id,
          currentOrder
        );


        loadMenuItems();


      } catch (
        error
      ) {

        showMenuToast(
          error.message,
          "error"
        );

      }

    };


  async function updateMenuOrder(
    id,
    order
  ) {

    const response =
      await fetch(
        "/api/menu?id=" +
        encodeURIComponent(
          id
        ),
        {

          method:"PUT",

          headers:{
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              menu_order:
                Number(order)
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
        "Menu order update नहि भेल"
      );

    }


    return data;

  }


  /* =======================================================
     DRAG & DROP
  ======================================================= */

  function setupDragDrop() {

    const rows =
      document.querySelectorAll(
        ".menu-item-row"
      );


    let dragged = null;


    rows.forEach(
      row => {

        row.addEventListener(
          "dragstart",
          function () {

            dragged =
              this;

            this.style.opacity =
              ".5";

          }
        );


        row.addEventListener(
          "dragend",
          function () {

            this.style.opacity =
              "";

          }
        );


        row.addEventListener(
          "dragover",
          function (
            event
          ) {

            event.preventDefault();

          }
        );


        row.addEventListener(
          "drop",
          async function (
            event
          ) {

            event.preventDefault();


            if (
              !dragged ||
              dragged === this
            ) {

              return;

            }


            const draggedId =
              dragged.dataset.id;


            const targetId =
              this.dataset.id;


            try {

              await swapMenuItems(
                draggedId,
                targetId
              );


              loadMenuItems();


            } catch (
              error
            ) {

              showMenuToast(
                error.message,
                "error"
              );

            }

          }
        );

      }
    );

  }


  async function swapMenuItems(
    firstId,
    secondId
  ) {

    const first =
      menuItems.find(
        item =>
          String(
            item.id
          ) ===
          String(firstId)
      );


    const second =
      menuItems.find(
        item =>
          String(
            item.id
          ) ===
          String(secondId)
      );


    if (
      !first ||
      !second
    ) {

      return;

    }


    const firstOrder =
      Number(
        first.menu_order ??
        first.sort_order ??
        first.order ??
        0
      );


    const secondOrder =
      Number(
        second.menu_order ??
        second.sort_order ??
        second.order ??
        0
      );


    await updateMenuOrder(
      first.id,
      secondOrder
    );


    await updateMenuOrder(
      second.id,
      firstOrder
    );

  }


  /* =======================================================
     CLOSE
  ======================================================= */

  window.closeMenuManager =
    function () {

      const modal =
        document.getElementById(
          "menuManagerModal"
        );


      if (modal) {

        modal.classList.remove(
          "show"
        );

      }

    };


  /* =======================================================
     URL PREVIEW
  ======================================================= */

  function updateUrlPreview() {

    const url =
      document
        .getElementById(
          "menuUrl"
        )
        .value
        .trim();


    document
      .getElementById(
        "menuUrlPreview"
      )
      .textContent =
      url ||
      "/";

  }


  /* =======================================================
     MESSAGE
  ======================================================= */

  function showMessage(
    message,
    type
  ) {

    const box =
      document.getElementById(
        "menuManagerMessage"
      );


    box.textContent =
      message;


    box.className =
      "menu-message " +
      type +
      " show";

  }


  function hideMessage() {

    const box =
      document.getElementById(
        "menuManagerMessage"
      );


    box.textContent =
      "";

    box.className =
      "menu-message";

  }


  /* =======================================================
     TOAST
  ======================================================= */

  function showMenuToast(
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

      return;

    }


    alert(
      message
    );

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

})();
