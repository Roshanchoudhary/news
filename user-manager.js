/* =========================================================
   user-manager.js
   Professional Users & Roles Management
========================================================= */

(function () {

  let users = [];
  let editingUserId = null;


  document.addEventListener(
    "DOMContentLoaded",
    function () {

      createUserModal();

      loadUsers();

    }
  );


  /* =======================================================
     STYLE + MODAL
  ======================================================= */

  function createUserModal() {

    if (
      document.getElementById(
        "userManagerModal"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `

      .users-toolbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
        margin-bottom:15px;
      }

      .users-search {
        height:38px;
        width:260px;
        border:1px solid #ddd;
        border-radius:7px;
        padding:0 11px;
        font-size:12px;
        outline:none;
      }

      .users-search:focus {
        border-color:#8b0000;
      }

      .users-table-wrap {
        width:100%;
        overflow-x:auto;
      }

      .users-table {
        width:100%;
        border-collapse:collapse;
        min-width:650px;
      }

      .users-table th {
        text-align:left;
        font-size:10px;
        color:#777;
        background:#f7f7f7;
        padding:10px;
        border-bottom:1px solid #e5e7eb;
      }

      .users-table td {
        padding:10px;
        border-bottom:1px solid #eee;
        font-size:11px;
        vertical-align:middle;
      }

      .user-name {
        font-weight:800;
      }

      .user-email {
        color:#888;
        font-size:10px;
        margin-top:2px;
      }

      .role-badge {
        display:inline-block;
        padding:4px 8px;
        border-radius:15px;
        font-size:9px;
        font-weight:700;
        background:#f0f0f0;
      }

      .role-badge.admin {
        background:#f7e4e4;
        color:#8b0000;
      }

      .role-badge.editor {
        background:#e8f0fa;
        color:#245b91;
      }

      .role-badge.author {
        background:#eaf6ed;
        color:#28733c;
      }

      .role-badge.viewer {
        background:#f1f1f1;
        color:#666;
      }

      .user-status {
        display:inline-block;
        padding:4px 8px;
        border-radius:15px;
        font-size:9px;
        font-weight:700;
      }

      .user-status.active {
        background:#e9f7ee;
        color:#19713b;
      }

      .user-status.inactive {
        background:#fceaea;
        color:#a52828;
      }

      .user-action {
        height:29px;
        min-width:30px;
        padding:0 7px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:6px;
        cursor:pointer;
        font-size:10px;
      }

      .user-action:hover {
        background:#f6f6f6;
      }

      .user-action.delete {
        color:#c62828;
      }

      .user-empty {
        text-align:center;
        padding:45px 20px;
        color:#999;
        font-size:12px;
      }

      .user-modal {
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:9000;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
      }

      .user-modal.show {
        display:flex;
      }

      .user-modal-box {
        width:min(600px,100%);
        max-height:94vh;
        overflow:auto;
        background:#fff;
        border-radius:14px;
        box-shadow:
          0 20px 60px
          rgba(0,0,0,.25);
      }

      .user-modal-header {
        padding:18px 20px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        align-items:center;
        justify-content:space-between;
      }

      .user-modal-title {
        font-size:17px;
        font-weight:800;
      }

      .user-modal-close {
        width:35px;
        height:35px;
        border:1px solid #ddd;
        background:#fff;
        border-radius:7px;
        cursor:pointer;
        font-size:18px;
      }

      .user-modal-body {
        padding:20px;
      }

      .user-field {
        margin-bottom:14px;
      }

      .user-label {
        display:block;
        font-size:11px;
        font-weight:700;
        margin-bottom:6px;
      }

      .user-label span {
        color:#b00000;
      }

      .user-input,
      .user-select {
        width:100%;
        height:40px;
        border:1px solid #ddd;
        border-radius:7px;
        padding:0 11px;
        font-size:12px;
        outline:none;
        background:#fff;
      }

      .user-input:focus,
      .user-select:focus {
        border-color:#8b0000;
        box-shadow:
          0 0 0 2px
          rgba(139,0,0,.08);
      }

      .user-permissions {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:8px;
      }

      .permission-item {
        border:1px solid #e1e3e6;
        border-radius:7px;
        padding:9px;
        display:flex;
        align-items:center;
        gap:7px;
        font-size:10px;
        cursor:pointer;
      }

      .user-message {
        display:none;
        padding:9px 11px;
        border-radius:7px;
        margin-bottom:13px;
        font-size:11px;
      }

      .user-message.show {
        display:block;
      }

      .user-message.error {
        background:#ffeded;
        color:#a00000;
      }

      .user-message.success {
        background:#eaf7ef;
        color:#176b38;
      }

      .user-modal-footer {
        padding:13px 20px;
        border-top:1px solid #e5e7eb;
        display:flex;
        justify-content:flex-end;
        gap:8px;
      }

      .user-btn {
        height:38px;
        padding:0 15px;
        border:1px solid #ddd;
        border-radius:7px;
        background:#fff;
        cursor:pointer;
        font-size:11px;
        font-weight:700;
      }

      .user-btn.primary {
        background:#8b0000;
        border-color:#8b0000;
        color:#fff;
      }

      @media(max-width:600px) {

        .users-search {
          width:100%;
        }

        .user-modal {
          padding:0;
        }

        .user-modal-box {
          width:100%;
          height:100%;
          max-height:none;
          border-radius:0;
        }

        .user-permissions {
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
      "userManagerModal";


    modal.className =
      "user-modal";


    modal.innerHTML = `

      <div class="user-modal-box">

        <div class="user-modal-header">

          <div
            class="user-modal-title"
            id="userModalTitle"
          >
            नया User
          </div>

          <button
            class="user-modal-close"
            onclick="
              window.closeUserManager()
            "
          >
            ×
          </button>

        </div>


        <div class="user-modal-body">

          <div
            class="user-message"
            id="userManagerMessage"
          ></div>


          <div class="user-field">

            <label class="user-label">
              Name <span>*</span>
            </label>

            <input
              class="user-input"
              id="userName"
              placeholder="User name"
            >

          </div>


          <div class="user-field">

            <label class="user-label">
              Email <span>*</span>
            </label>

            <input
              type="email"
              class="user-input"
              id="userEmail"
              placeholder="user@example.com"
            >

          </div>


          <div class="user-field">

            <label class="user-label">
              Password
              <span id="passwordRequired">*</span>
            </label>

            <input
              type="password"
              class="user-input"
              id="userPassword"
              placeholder="Password"
            >

          </div>


          <div class="user-field">

            <label class="user-label">
              Role
            </label>

            <select
              class="user-select"
              id="userRole"
            >

              <option value="admin">
                Admin
              </option>

              <option value="editor">
                Editor
              </option>

              <option value="author">
                Author
              </option>

              <option value="viewer">
                Viewer
              </option>

            </select>

          </div>


          <div class="user-field">

            <label class="user-label">
              Permissions
            </label>


            <div
              class="user-permissions"
            >

              <label
                class="permission-item"
              >
                <input
                  type="checkbox"
                  value="news"
                  class="userPermission"
                >
                News
              </label>


              <label
                class="permission-item"
              >
                <input
                  type="checkbox"
                  value="categories"
                  class="userPermission"
                >
                Categories
              </label>


              <label
                class="permission-item"
              >
                <input
                  type="checkbox"
                  value="tags"
                  class="userPermission"
                >
                Tags
              </label>


              <label
                class="permission-item"
              >
                <input
                  type="checkbox"
                  value="media"
                  class="userPermission"
                >
                Media
              </label>


              <label
                class="permission-item"
              >
                <input
                  type="checkbox"
                  value="menu"
                  class="userPermission"
                >
                Menu
              </label>


              <label
                class="permission-item"
              >
                <input
                  type="checkbox"
                  value="users"
                  class="userPermission"
                >
                Users
              </label>

            </div>

          </div>


          <div class="user-field">

            <label
              class="permission-item"
            >

              <input
                type="checkbox"
                id="userActive"
                checked
              >

              Active User

            </label>

          </div>

        </div>


        <div class="user-modal-footer">

          <button
            class="user-btn"
            onclick="
              window.closeUserManager()
            "
          >
            Cancel
          </button>

          <button
            class="user-btn primary"
            id="userSaveBtn"
            onclick="
              window.saveUser()
            "
          >
            Save User
          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      modal
    );

  }


  /* =======================================================
     LOAD USERS
  ======================================================= */

  async function loadUsers() {

    const container =
      document.getElementById(
        "usersContainer"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      `
        <div class="loading">
          Users लोड भ' रहल अछि...
        </div>
      `;


    try {

      const response =
        await fetch(
          "/api/users"
        );


      if (
        !response.ok
      ) {

        throw new Error(
          "Users API error"
        );

      }


      const data =
        await response.json();


      if (
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Users load नहि भेल"
        );

      }


      users =
        data.users ||
        [];


      renderUsers();


    } catch (
      error
    ) {

      console.error(
        "USERS LOAD:",
        error
      );


      container.innerHTML =
        `

          <div class="user-empty">

            👤

            <br><br>

            Users data load नहि भ' सकल।

            <br><br>

            <small>
              ${escapeHtml(
                error.message
              )}
            </small>

          </div>

        `;

    }

  }


  /* =======================================================
     RENDER USERS
  ======================================================= */

  function renderUsers() {

    const container =
      document.getElementById(
        "usersContainer"
      );


    if (!container) {
      return;
    }


    const search =
      (
        document.getElementById(
          "usersSearch"
        )?.value ||
        ""
      )
        .trim()
        .toLowerCase();


    let filtered =
      users;


    if (search) {

      filtered =
        users.filter(
          user =>
            String(
              user.name ||
              ""
            )
              .toLowerCase()
              .includes(
                search
              ) ||
            String(
              user.email ||
              ""
            )
              .toLowerCase()
              .includes(
                search
              ) ||
            String(
              user.role ||
              ""
            )
              .toLowerCase()
              .includes(
                search
              )
        );

    }


    if (
      !filtered.length
    ) {

      container.innerHTML =
        `

          <div class="user-empty">

            👤

            <br><br>

            कोनो User नहि भेटल।

          </div>

        `;

      return;

    }


    container.innerHTML =
      `

        <div class="users-table-wrap">

          <table
            class="users-table"
          >

            <thead>

              <tr>

                <th>
                  USER
                </th>

                <th>
                  ROLE
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  CREATED
                </th>

                <th>
                  ACTION
                </th>

              </tr>

            </thead>


            <tbody>

              ${filtered
                .map(
                  user =>
                    createUserRow(
                      user
                    )
                )
                .join("")}

            </tbody>

          </table>

        </div>

      `;

  }


  function createUserRow(
    user
  ) {

    const role =
      String(
        user.role ||
        "viewer"
      ).toLowerCase();


    const active =
      String(
        user.status ??
        "active"
      ).toLowerCase() ===
      "active";


    return `

      <tr>

        <td>

          <div
            class="user-name"
          >
            ${escapeHtml(
              user.name ||
              "—"
            )}
          </div>

          <div
            class="user-email"
          >
            ${escapeHtml(
              user.email ||
              ""
            )}
          </div>

        </td>


        <td>

          <span
            class="
              role-badge
              ${escapeHtml(
                role
              )}
            "
          >
            ${escapeHtml(
              role
                .charAt(0)
                .toUpperCase() +
              role.slice(1)
            )}
          </span>

        </td>


        <td>

          <span
            class="
              user-status
              ${
                active
                  ? "active"
                  : "inactive"
              }
            "
          >

            ${
              active
                ? "Active"
                : "Inactive"
            }

          </span>

        </td>


        <td>

          ${
            formatDate(
              user.created_at
            )
          }

        </td>


        <td>

          <button
            class="user-action"
            onclick="
              window.openUserEdit(
                '${encodeURIComponent(
                  user.id
                )}'
              )
            "
            title="Edit"
          >
            ✏️
          </button>


          <button
            class="user-action delete"
            onclick="
              window.deleteUser(
                '${encodeURIComponent(
                  user.id
                )}'
              )
            "
            title="Delete"
          >
            🗑
          </button>

        </td>

      </tr>

    `;

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
        "usersSearch"
      ) {

        renderUsers();

      }

    }
  );


  /* =======================================================
     NEW USER
  ======================================================= */

  window.openUserManager =
    function () {

      editingUserId =
        null;


      resetUserForm();


      document
        .getElementById(
          "userModalTitle"
        )
        .textContent =
        "नया User";


      document
        .getElementById(
          "passwordRequired"
        )
        .style.display =
        "inline";


      document
        .getElementById(
          "userManagerModal"
        )
        .classList.add(
          "show"
        );


      document
        .getElementById(
          "userName"
        )
        .focus();

    };


  /* =======================================================
     EDIT USER
  ======================================================= */

  window.openUserEdit =
    function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const user =
        users.find(
          item =>
            String(
              item.id
            ) ===
            String(id)
        );


      if (!user) {

        alert(
          "User नहि भेटल।"
        );

        return;

      }


      editingUserId =
        id;


      resetUserForm();


      document
        .getElementById(
          "userModalTitle"
        )
        .textContent =
        "User Edit करू";


      document
        .getElementById(
          "passwordRequired"
        )
        .style.display =
        "none";


      document
        .getElementById(
          "userName"
        )
        .value =
        user.name ||
        "";


      document
        .getElementById(
          "userEmail"
        )
        .value =
        user.email ||
        "";


      document
        .getElementById(
          "userRole"
        )
        .value =
        user.role ||
        "viewer";


      document
        .getElementById(
          "userActive"
        )
        .checked =
        String(
          user.status ||
          "active"
        ).toLowerCase() ===
        "active";


      let permissions =
        user.permissions ||
        [];


      if (
        typeof permissions ===
        "string"
      ) {

        try {

          permissions =
            JSON.parse(
              permissions
            );

        } catch {

          permissions =
            permissions
              .split(",")
              .map(
                item =>
                  item.trim()
              )
              .filter(Boolean);

        }

      }


      document
        .querySelectorAll(
          ".userPermission"
        )
        .forEach(
          checkbox => {

            checkbox.checked =
              Array.isArray(
                permissions
              ) &&
              permissions.includes(
                checkbox.value
              );

          }
        );


      document
        .getElementById(
          "userManagerModal"
        )
        .classList.add(
          "show"
        );

    };


  /* =======================================================
     RESET FORM
  ======================================================= */

  function resetUserForm() {

    [
      "userName",
      "userEmail",
      "userPassword"
    ]
      .forEach(
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
        "userRole"
      )
      .value =
      "viewer";


    document
      .getElementById(
        "userActive"
      )
      .checked =
      true;


    document
      .querySelectorAll(
        ".userPermission"
      )
      .forEach(
        checkbox => {

          checkbox.checked =
            false;

        }
      );


    hideUserMessage();

  }


  /* =======================================================
     SAVE USER
  ======================================================= */

  window.saveUser =
    async function () {

      const name =
        document
          .getElementById(
            "userName"
          )
          .value
          .trim();


      const email =
        document
          .getElementById(
            "userEmail"
          )
          .value
          .trim();


      const password =
        document
          .getElementById(
            "userPassword"
          )
          .value;


      const role =
        document
          .getElementById(
            "userRole"
          )
          .value;


      if (!name) {

        showUserMessage(
          "Name जरूरी अछि।",
          "error"
        );

        return;

      }


      if (!email) {

        showUserMessage(
          "Email जरूरी अछि।",
          "error"
        );

        return;

      }


      if (
        editingUserId === null &&
        !password
      ) {

        showUserMessage(
          "नया User लेल password जरूरी अछि।",
          "error"
        );

        return;

      }


      const permissions =
        Array.from(
          document.querySelectorAll(
            ".userPermission:checked"
          )
        )
          .map(
            checkbox =>
              checkbox.value
          );


      const payload = {

        name,

        email,

        role,

        permissions,

        status:
          document
            .getElementById(
              "userActive"
            )
            .checked
            ? "active"
            : "inactive"

      };


      if (password) {

        payload.password =
          password;

      }


      const button =
        document.getElementById(
          "userSaveBtn"
        );


      button.disabled =
        true;


      button.textContent =
        "Saving...";


      try {

        let endpoint =
          "/api/users";


        let method =
          "POST";


        if (
          editingUserId !== null
        ) {

          method =
            "PUT";


          endpoint +=
            "?id=" +
            encodeURIComponent(
              editingUserId
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


        const data =
          await response.json();


        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.error ||
            "User save नहि भेल"
          );

        }


        showUserMessage(
          data.message ||
          "User सफलतापूर्वक save भ' गेल।",
          "success"
        );


        setTimeout(
          function () {

            closeUserManager();

            loadUsers();

          },
          700
        );


      } catch (
        error
      ) {

        console.error(
          "USER SAVE:",
          error
        );


        showUserMessage(
          error.message,
          "error"
        );


      } finally {

        button.disabled =
          false;

        button.textContent =
          "Save User";

      }

    };


  /* =======================================================
     DELETE
  ======================================================= */

  window.deleteUser =
    async function (
      encodedId
    ) {

      const id =
        decodeURIComponent(
          encodedId
        );


      const user =
        users.find(
          item =>
            String(
              item.id
            ) ===
            String(id)
        );


      if (!user) {
        return;
      }


      if (
        !confirm(
          `की "${user.name || user.email}" केँ delete करय चाहैत छी?`
        )
      ) {

        return;

      }


      try {

        const response =
          await fetch(
            "/api/users?id=" +
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
            "User delete नहि भेल"
          );

        }


        loadUsers();


      } catch (
        error
      ) {

        alert(
          error.message
        );

      }

    };


  /* =======================================================
     CLOSE
  ======================================================= */

  window.closeUserManager =
    function () {

      const modal =
        document.getElementById(
          "userManagerModal"
        );


      if (modal) {

        modal.classList.remove(
          "show"
        );

      }

    };


  /* =======================================================
     MESSAGES
  ======================================================= */

  function showUserMessage(
    message,
    type
  ) {

    const box =
      document.getElementById(
        "userManagerMessage"
      );


    box.textContent =
      message;


    box.className =
      "user-message " +
      type +
      " show";

  }


  function hideUserMessage() {

    const box =
      document.getElementById(
        "userManagerMessage"
      );


    box.textContent =
      "";


    box.className =
      "user-message";

  }


  /* =======================================================
     HELPERS
  ======================================================= */

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
