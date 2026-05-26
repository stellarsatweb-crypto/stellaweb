const executiveSettingsUser = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
})();

const executiveSettingsPermissions = {
  profile: true,
  display: true,
  privacy: false,
  password: true,
  inbox: true,
  requests: false,
  deleteAccount: false,
};

const executiveSettingsState = {
  toastTimer: null,
};

function ensureExecutiveInboxStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function ensureExecutiveInboxScript(id, src) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing?.dataset.loaded === "1") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureExecutiveInboxRuntime() {
  ensureExecutiveInboxStylesheet("executive-inbox-runtime-css", "/modules/noc/noc-dashboard.css");
  await ensureExecutiveInboxScript("executive-inbox-runtime-js", `/modules/noc/noc-dashboard.js?v=${Date.now()}`);
}

function escHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function showToast(message, type = "info") {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="ri-${type === "success" ? "checkbox-circle-line" : type === "error" ? "error-warning-line" : type === "warning" ? "alert-line" : "information-line"}"></i><span>${escHtml(message)}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  clearTimeout(executiveSettingsState.toastTimer);
  executiveSettingsState.toastTimer = setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 220);
  }, 2400);
}

function applyTypographySettings(size) {
  const fontSize = Math.max(12, Math.min(20, Number(size) || 14));
  document.documentElement.style.setProperty("--app-font-size", `${fontSize}px`);
}

function applyDisplayVisualSettings() {
  const brightness = Number(localStorage.getItem("brightness") || "100");
  const nightLight = localStorage.getItem("nightLight") === "true";
  document.body.style.filter = `brightness(${Math.max(20, Math.min(100, brightness))}%)${nightLight ? " sepia(0.18) saturate(0.92)" : ""}`;
}

function setTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function buildTabButton(tab, icon, label, sub) {
  return `
    <button class="stg-navitem" data-tab="${tab}">
      <div class="stg-navitem-icon"><i class="${icon}"></i></div>
      <div class="stg-navitem-text">
        <span class="stg-navitem-label">${label}</span>
        <span class="stg-navitem-sub">${sub}</span>
      </div>
      <i class="ri-arrow-right-s-line stg-navitem-arrow"></i>
    </button>
  `;
}

function renderRequestCard(title, desc, badge, icon) {
  return `
    <div class="stg-list-item">
      <div class="stg-list-top">
        <div class="stg-list-title"><i class="${icon}"></i> ${escHtml(title)}</div>
        <span class="stg-badge info">${escHtml(badge)}</span>
      </div>
      <div class="stg-list-sub">${escHtml(desc)}</div>
    </div>
  `;
}

function renderSettingsPage() {
  const user = executiveSettingsUser;
  const initials = getInitials(user.full_name);
  const savedTheme = localStorage.getItem("theme") || "light";
  const savedBrightness = localStorage.getItem("brightness") || "100";
  const savedFont = localStorage.getItem("fontSize") || "14";
  const nightLight = localStorage.getItem("nightLight") === "true";

  document.body.classList.toggle("dark", savedTheme === "dark");
  applyTypographySettings(savedFont);
  applyDisplayVisualSettings();

  const tabs = [
    ["account", "ri-user-3-line", "Account", "Profile &amp; security"],
    ["display", "ri-palette-line", "Display", "Theme &amp; appearance"],
    ["privacy", "ri-shield-check-line", "Privacy &amp; Data", "Security &amp; export"],
    ["inbox", "ri-inbox-2-line", "Inbox", "Messages &amp; Requests"],
    ["myrequests", "ri-file-list-3-line", "My Requests", "Track your submissions"],
  ];

  document.getElementById("mainContent").innerHTML = `
    <div class="stg-page">
      <div class="stg-layout">
        <nav class="stg-sidenav">
          ${tabs.map(([tab, icon, label, sub], index) => `
            <button class="stg-navitem ${index === 0 ? "active" : ""}" data-tab="${tab}">
              <div class="stg-navitem-icon"><i class="${icon}"></i></div>
              <div class="stg-navitem-text">
                <span class="stg-navitem-label">${label}</span>
                <span class="stg-navitem-sub">${sub}</span>
              </div>
              <i class="ri-arrow-right-s-line stg-navitem-arrow"></i>
            </button>
          `).join("")}

          <div class="stg-nav-usercard">
            <div class="stg-nav-avatar">
              ${user.photo ? `<img src="${escHtml(user.photo)}" class="stg-nav-avatar-img" alt="avatar">` : `<span>${initials}</span>`}
            </div>
            <div class="stg-nav-userinfo">
              <div class="stg-nav-username">${escHtml(user.full_name || "—")}</div>
              <div class="stg-nav-userrole">${escHtml(user.role || "—")}</div>
            </div>
          </div>
        </nav>

        <div class="stg-panels">
          <div class="stg-panel active" id="stg-tab-account">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-user-3-line"></i> Profile Information</div>
                <button class="stg-outline-btn" id="stgEditBtn"><i class="ri-edit-line"></i> Edit Profile</button>
              </div>
              <div class="stg-profile-hero">
                <div class="stg-avatar-wrap">
                  ${user.photo ? `<img src="${escHtml(user.photo)}" class="stg-avatar-img" id="stgAvatarImg" alt="Profile">` : `<div class="stg-avatar" id="stgAvatar">${initials}</div>`}
                  <label class="stg-avatar-upload-btn" for="stgPhotoInput" title="Change photo">
                    <i class="ri-camera-line"></i>
                  </label>
                  <input type="file" id="stgPhotoInput" accept="image/*" style="display:none;">
                </div>
                <div class="stg-profile-hero-info">
                  <div class="stg-profile-name">${escHtml(user.full_name || "—")}</div>
                  <span class="stg-role-badge">${escHtml(user.role || "—")}</span>
                  <div class="stg-photo-hint"><i class="ri-information-line"></i> Click the camera icon to update your photo</div>
                </div>
              </div>
              <div class="stg-info-grid">
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-user-line"></i> Full Name</div><div class="stg-info-value">${escHtml(user.full_name || "—")}</div></div>
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-id-card-line"></i> ID Number</div><div class="stg-info-value">${escHtml(user.id_no || "—")}</div></div>
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-mail-line"></i> Email Address</div><div class="stg-info-value">${escHtml(user.email || "—")}</div></div>
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-shield-user-line"></i> Role</div><div class="stg-info-value" style="text-transform:capitalize;">${escHtml(user.role || "—")}</div></div>
              </div>
            </div>

            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-flashlight-line"></i> Quick Actions</div>
              </div>
              <div class="stg-action-tiles">
                <button class="stg-action-tile" id="stgChangePwBtn">
                  <div class="stg-tile-icon stg-tile-blue"><i class="ri-lock-password-line"></i></div>
                  <div class="stg-tile-body">
                    <div class="stg-tile-label">Change Password</div>
                    <div class="stg-tile-desc">Update your account password</div>
                  </div>
                  <i class="ri-arrow-right-s-line stg-tile-arrow"></i>
                </button>
                <button class="stg-action-tile" id="stgRequestBtn">
                  <div class="stg-tile-icon stg-tile-green"><i class="ri-file-list-3-line"></i></div>
                  <div class="stg-tile-body">
                    <div class="stg-tile-label">Request</div>
                    <div class="stg-tile-desc">Choose and submit a request type</div>
                  </div>
                  <i class="ri-arrow-right-s-line stg-tile-arrow"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-display">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-sun-line"></i> Brightness &amp; Color</div>
              </div>
              <div class="stg-row-list">
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#fef9c3;color:#b45309;"><i class="ri-sun-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Brightness</div>
                    <div class="stg-row-desc">Adjust the display brightness level</div>
                  </div>
                  <div class="stg-row-ctrl">
                    <span class="stg-val-badge" id="stgBrightnessVal">${savedBrightness}%</span>
                    <input type="range" class="stg-slider" id="stgBrightness" min="20" max="100" value="${savedBrightness}">
                  </div>
                </div>
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#ede9fe;color:#7c3aed;"><i class="ri-moon-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Night Light</div>
                    <div class="stg-row-desc">Warmer colors to reduce eye strain</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" id="stgNightLight" ${nightLight ? "checked" : ""}>
                    <span class="stg-toggle-track"><span class="stg-toggle-thumb"></span></span>
                  </label>
                </div>
              </div>
            </div>
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-contrast-2-line"></i> Theme</div>
              </div>
              <div class="stg-row-list">
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#f0f9ff;color:#0284c7;"><i class="ri-contrast-2-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Color Mode</div>
                    <div class="stg-row-desc">Switch between light and dark interface</div>
                  </div>
                  <div class="stg-theme-pills" id="stgThemePills">
                    <button class="stg-theme-pill ${savedTheme === "light" ? "active" : ""}" data-theme="light"><i class="ri-sun-fill"></i> Light</button>
                    <button class="stg-theme-pill ${savedTheme === "dark" ? "active" : ""}" data-theme="dark"><i class="ri-moon-fill"></i> Dark</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-text-spacing"></i> Typography</div>
              </div>
              <div class="stg-row-list">
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#f0fdf4;color:#16a34a;font-size:15px;font-weight:800;letter-spacing:-1px;">Aa</div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Text Size</div>
                    <div class="stg-row-desc">Adjust font size throughout the app</div>
                  </div>
                  <div class="stg-row-ctrl">
                    <span class="stg-font-sm">A</span>
                    <input type="range" class="stg-slider" id="stgFontSize" min="12" max="20" value="${savedFont}">
                    <span class="stg-font-lg">A</span>
                    <span class="stg-val-badge" id="stgFontVal">${savedFont}px</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="stg-card2-footer">
              <button class="stg-outline-btn" id="stgFontApply"><i class="ri-refresh-line"></i> Apply Font</button>
              <button class="stg-save-btn" id="stgDisplaySave"><i class="ri-save-line"></i> Save Changes</button>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-privacy">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-lock-line"></i> File Upload Privacy</div>
              </div>
              <div class="stg-row-list">
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#eff6ff;color:#2563eb;"><i class="ri-file-shield-2-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Restrict Evidence Files</div>
                    <div class="stg-row-desc">Limit file access to authorized users only</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" checked disabled>
                    <span class="stg-toggle-track"><span class="stg-toggle-thumb"></span></span>
                  </label>
                </div>
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#f0fdf4;color:#16a34a;"><i class="ri-global-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Public File Access</div>
                    <div class="stg-row-desc">Allow anyone to view uploaded evidence files</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" disabled>
                    <span class="stg-toggle-track"><span class="stg-toggle-thumb"></span></span>
                  </label>
                </div>
              </div>
            </div>
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-database-2-line"></i> Data Management</div>
              </div>
              <div class="stg-row-list">
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#f0fdf4;color:#16a34a;"><i class="ri-cloud-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Automatic Backup</div>
                    <div class="stg-row-desc">Enable scheduled system backups</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" checked disabled>
                    <span class="stg-toggle-track"><span class="stg-toggle-thumb"></span></span>
                  </label>
                </div>
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#eff6ff;color:#2563eb;"><i class="ri-file-chart-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Export Reports</div>
                    <div class="stg-row-desc">Download all reports as a CSV file</div>
                  </div>
                  <button class="stg-outline-btn" id="stgExportBtn"><i class="ri-download-2-line"></i> Export</button>
                </div>
              </div>
            </div>
            <div class="stg-card2 stg-danger-zone">
              <div class="stg-card2-header stg-danger-header">
                <div class="stg-card2-title" style="color:#dc2626;"><i class="ri-error-warning-line"></i> Danger Zone</div>
              </div>
              <div class="stg-danger-row">
                <div>
                  <div class="stg-danger-label">Delete Account</div>
                  <div class="stg-danger-desc">A deletion request will be sent to the admin. This cannot be undone.</div>
                </div>
                <button class="stg-delete-btn" id="stgDeleteAccBtn" disabled aria-disabled="true">
                  <i class="ri-delete-bin-line"></i> Request Deletion
                </button>
              </div>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-inbox">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-inbox-2-line"></i> Inbox</div>
              </div>
              <div id="utInboxMount">
                <div class="stg-req-empty"><i class="ri-inbox-2-line"></i><span>Loading shared inbox...</span><small>Messages across roles will appear here.</small></div>
              </div>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-myrequests">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-file-list-3-line"></i> My Requests</div>
                <button class="stg-outline-btn" id="stgNewRequestBtn"><i class="ri-add-line"></i> New Request</button>
              </div>
              <div id="stgRequestsMount">
                <div class="stg-req-empty"><i class="ri-file-list-3-line"></i><span>Executive requests are read-only.</span><small>Request history will be shown here when enabled.</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="stgPwModal">
      <div class="acc-modal-shell">
        <div class="acc-modal-header">
          <div class="acc-modal-title-row">
            <div class="acc-modal-icon"><i class="ri-lock-password-line"></i></div>
            <div>
              <div class="acc-modal-title">Change Password</div>
              <div class="acc-modal-sub">Enter your current and new password</div>
            </div>
          </div>
          <button class="acc-modal-close-btn" id="stgPwClose"><i class="ri-close-line"></i></button>
        </div>
        <div class="acc-modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label class="acc-modal-label">Current Password</label>
            <input type="password" id="stgPwCurrent" class="acc-modal-input" placeholder="Enter current password">
          </div>
          <div>
            <label class="acc-modal-label">New Password</label>
            <input type="password" id="stgPwNew" class="acc-modal-input" placeholder="Enter new password">
          </div>
          <div>
            <label class="acc-modal-label">Confirm New Password</label>
            <input type="password" id="stgPwConfirm" class="acc-modal-input" placeholder="Repeat new password">
          </div>
        </div>
        <div class="acc-modal-footer">
          <button class="acc-modal-cancel" id="stgPwCancel">Cancel</button>
          <button class="acc-modal-submit" id="stgPwSave"><i class="ri-save-line"></i> Update Password</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="stgEditModal">
      <div class="acc-modal-shell">
        <div class="acc-modal-header">
          <div class="acc-modal-title-row">
            <div class="acc-modal-icon"><i class="ri-user-settings-line"></i></div>
            <div>
              <div class="acc-modal-title">Edit Profile</div>
              <div class="acc-modal-sub">Update your display name and email</div>
            </div>
          </div>
          <button class="acc-modal-close-btn" id="stgEditClose"><i class="ri-close-line"></i></button>
        </div>
        <div class="acc-modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label class="acc-modal-label">Full Name</label>
            <input type="text" id="stgEditName" class="acc-modal-input" value="${escHtml(user.full_name || "")}">
          </div>
          <div>
            <label class="acc-modal-label">Email Address</label>
            <input type="email" id="stgEditEmail" class="acc-modal-input" value="${escHtml(user.email || "")}">
          </div>
        </div>
        <div class="acc-modal-footer">
          <button class="acc-modal-cancel" id="stgEditCancel">Cancel</button>
          <button class="acc-modal-submit" id="stgEditSave"><i class="ri-save-line"></i> Save Changes</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="requestTypeModal">
      <div class="lv-shell rq-shell">
        <div class="lv-header">
          <div class="lv-header-left">
            <div class="lv-header-icon"><i class="ri-file-list-3-line"></i></div>
            <div>
              <div class="lv-header-title">Request</div>
              <div class="lv-header-sub">Executive request actions are read-only</div>
            </div>
          </div>
          <button class="lv-close-btn" id="requestTypeClose"><i class="ri-close-line"></i></button>
        </div>
        <div class="lv-body">
          <div class="rq-type-grid">
            ${[
              ["leave", "ri-calendar-todo-line", "Leave Request", "Use the existing leave request form"],
              ["id", "ri-id-card-line", "ID Request", "Request company ID or access-related identification"],
              ["salary", "ri-money-dollar-circle-line", "Salary Increase", "Submit a salary increase request for review"],
              ["files", "ri-folder-transfer-line", "Files Request", "Request file pickup, return, or document copy"],
              ["reimbursement", "ri-refund-2-line", "Reimbursement Request", "Submit expense reimbursement with receipt or proof"],
              ["budget", "ri-wallet-3-line", "Budget Request", "Request budget for a department, project, or purpose"],
              ["salary_advance", "ri-hand-coin-line", "Salary Advance Request", "Request a salary advance with deduction terms"],
            ].map(([type, icon, title, desc]) => `
              <button type="button" class="rq-type-card" data-type="${type}">
                <div class="rq-type-icon"><i class="${icon}"></i></div>
                <div class="rq-type-title">${title}</div>
                <div class="rq-type-desc">${desc}</div>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll(".stg-navitem").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".stg-navitem").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".stg-panel").forEach(panel => panel.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`stg-tab-${btn.dataset.tab}`)?.classList.add("active");
      const url = new URL(window.location.href);
      url.searchParams.set("tab", btn.dataset.tab);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      if (btn.dataset.tab === "inbox") {
        ensureExecutiveInboxRuntime()
          .then(() => window.loadUnifiedInbox?.())
          .catch(() => {
            const mount = document.getElementById("utInboxMount");
            if (mount) {
              mount.innerHTML = `<div class="stg-req-empty"><i class="ri-error-warning-line"></i><span>Unable to load inbox.</span><small>Please refresh and try again.</small></div>`;
            }
          });
      }
    });
  });

  const startTab = new URLSearchParams(window.location.search).get("tab");
  if (startTab) {
    document.querySelector(`.stg-navitem[data-tab="${startTab}"]`)?.click();
  } else if (document.querySelector('.stg-navitem[data-tab="inbox"]')?.classList.contains("active")) {
    ensureExecutiveInboxRuntime().then(() => window.loadUnifiedInbox?.()).catch(() => {});
  }

  document.getElementById("stgPhotoInput")?.addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Please select an image file.", "error");
    if (file.size > 5 * 1024 * 1024) return showToast("Image must be under 5MB.", "error");

    const preview = new FileReader();
    preview.onload = event => {
      const src = event.target.result;
      const avatarImg = document.getElementById("stgAvatarImg");
      const avatar = document.getElementById("stgAvatar");
      if (avatarImg) avatarImg.src = src;
      else if (avatar) {
        avatar.insertAdjacentHTML("afterend", `<img src="${src}" class="stg-avatar-img" id="stgAvatarImg" alt="Profile">`);
        avatar.remove();
      }
    };
    preview.readAsDataURL(file);

    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch(`/api/users/${executiveSettingsUser.id}/photo`, { method: "POST", body: formData });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(result.error || "Upload failed.", "error");
      const updated = { ...executiveSettingsUser, photo: result.photo };
      localStorage.setItem("user", JSON.stringify(updated));
      showToast("Profile photo updated.", "success");
    } catch {
      showToast("Upload failed - network error.", "error");
    }
  });

  document.getElementById("stgEditBtn").onclick = () => document.getElementById("stgEditModal").classList.remove("hidden");
  document.getElementById("stgEditClose").onclick = document.getElementById("stgEditCancel").onclick = () => document.getElementById("stgEditModal").classList.add("hidden");
  document.getElementById("stgEditModal").onclick = event => { if (event.target === event.currentTarget) event.currentTarget.classList.add("hidden"); };

  document.getElementById("stgEditSave").onclick = async () => {
    const full_name = document.getElementById("stgEditName").value.trim();
    const email = document.getElementById("stgEditEmail").value.trim();
    if (!full_name || !email) return showToast("Name and email are required.", "error");
    const btn = document.getElementById("stgEditSave");
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Saving...';
    try {
      const res = await fetch(`/api/users/${executiveSettingsUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(result.error || "Update failed.", "error");
      localStorage.setItem("user", JSON.stringify({ ...executiveSettingsUser, full_name, email }));
      showToast("Profile updated.", "success");
      renderSettingsPage();
    } catch {
      showToast("Network error.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ri-save-line"></i> Save Changes';
    }
  };

  document.getElementById("stgChangePwBtn").onclick = () => document.getElementById("stgPwModal").classList.remove("hidden");
  document.getElementById("stgPwClose").onclick = document.getElementById("stgPwCancel").onclick = () => document.getElementById("stgPwModal").classList.add("hidden");
  document.getElementById("stgPwModal").onclick = event => { if (event.target === event.currentTarget) event.currentTarget.classList.add("hidden"); };

  document.getElementById("stgPwSave").onclick = async () => {
    const current = document.getElementById("stgPwCurrent").value;
    const newPw = document.getElementById("stgPwNew").value;
    const confirm = document.getElementById("stgPwConfirm").value;
    if (!current || !newPw || !confirm) return showToast("All fields are required.", "error");
    if (newPw !== confirm) return showToast("New passwords do not match.", "error");
    if (newPw.length < 6) return showToast("Password must be at least 6 characters.", "error");
    const btn = document.getElementById("stgPwSave");
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Updating...';
    try {
      const res = await fetch(`/api/users/${executiveSettingsUser.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: newPw }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(result.error || "Failed.", "error");
      ["stgPwCurrent", "stgPwNew", "stgPwConfirm"].forEach(id => (document.getElementById(id).value = ""));
      document.getElementById("stgPwModal").classList.add("hidden");
      showToast("Password updated successfully.", "success");
    } catch {
      showToast("Network error.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ri-save-line"></i> Update Password';
    }
  };

  document.querySelectorAll(".stg-theme-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".stg-theme-pill").forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
      setTheme(btn.dataset.theme);
    });
  });

  document.getElementById("stgNightLight").addEventListener("change", function () {
    localStorage.setItem("nightLight", String(this.checked));
    applyDisplayVisualSettings();
  });

  document.getElementById("stgBrightness").addEventListener("input", function () {
    localStorage.setItem("brightness", this.value);
    document.getElementById("stgBrightnessVal").textContent = `${this.value}%`;
    applyDisplayVisualSettings();
  });

  document.getElementById("stgFontSize").addEventListener("input", function () {
    localStorage.setItem("fontSize", this.value);
    document.getElementById("stgFontVal").textContent = `${this.value}px`;
    applyTypographySettings(this.value);
  });

  document.getElementById("stgFontApply").onclick = () => {
    const size = document.getElementById("stgFontSize").value;
    localStorage.setItem("fontSize", size);
    applyTypographySettings(size);
    showToast("Font size applied.", "success");
  };

  document.getElementById("stgDisplaySave").onclick = () => {
    localStorage.setItem("brightness", document.getElementById("stgBrightness").value);
    localStorage.setItem("fontSize", document.getElementById("stgFontSize").value);
    showToast("Display settings saved.", "success");
  };

  document.getElementById("stgExportBtn").onclick = async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json().catch(() => []);
      const rows = Array.isArray(data) ? data : [];
      const esc = value => {
        const text = String(value ?? "");
        return text.includes(",") ? `"${text}"` : text;
      };
      const csv = [
        "Region,Start Date,End Date,Deadline,MIR (%),Ticket (%),SLA (%),Progress (%),Created By,Last Updated",
        ...rows.map(row => [
          row.region, row.date_start || "", row.date_end || "", row.deadline || "",
          row.mir || "", row.ticket || "", row.sla || "", row.progress || "",
          row.created_by || "", row.date ? new Date(row.date).toLocaleDateString() : ""
        ].map(esc).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: "reports_export.csv" });
      link.click();
      URL.revokeObjectURL(url);
      showToast("Reports exported.", "success");
    } catch {
      showToast("Export failed.", "error");
    }
  };

  document.getElementById("stgDeleteAccBtn").onclick = () => showToast("Executive deletion requests are handled centrally.", "warning");
  document.getElementById("stgRequestBtn").onclick = () => {
    document.getElementById("requestTypeModal").classList.remove("hidden");
  };
  document.getElementById("requestTypeClose").onclick = () => {
    document.getElementById("requestTypeModal").classList.add("hidden");
  };
  document.getElementById("requestTypeModal").onclick = event => {
    if (event.target === event.currentTarget) event.currentTarget.classList.add("hidden");
  };
  document.querySelectorAll(".rq-type-card").forEach(card => {
    card.addEventListener("click", () => {
      showToast("Executive requests are read-only in this view.", "info");
    });
  });
}

window.renderExecutiveSettingsPage = renderSettingsPage;
document.addEventListener("DOMContentLoaded", renderSettingsPage);
