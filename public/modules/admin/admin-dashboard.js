/* ================= ADMIN MODULE ================= */

const adminUser = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
})();
let adminStaffIds = [];
let adminStaffSearch = "";
let adminStaffStatus = "all";
let adminAccounts = [];
let adminAccountSearch = "";
let adminExpandedAccountId = null;
let adminRequests = [];
let adminRequestSearch = "";
let adminRequestRole = "all";
let adminRequestStatus = "all";
const ADMIN_STAFF_ID_ROLES = ["noc", "finance", "admin", "bidder", "executive"];
const EXECUTIVE_ADMIN_PAGES = new Set(["staffIds", "accountsMonitoring", "userRequests"]);
let adminCurrentPageKey = null;

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "X-User-Id": adminUser?.id || "",
    "X-User-Role": adminUser?.role || ""
  };
}

function adminIsExecutive() {
  return String(adminUser?.role || "").trim().toLowerCase() === "executive";
}

function adminIsOwnRequestRow(row) {
  const currentName = String(adminUser?.full_name || adminUser?.name || "").trim().toLowerCase();
  const currentRole = String(adminUser?.role || "").trim().toLowerCase();
  if (!currentName || !currentRole) return false;
  const rowName = String(row?.full_name || "").trim().toLowerCase();
  const rowRole = String(row?.role || "").trim().toLowerCase();
  return !!rowName && !!rowRole && rowName === currentName && rowRole === currentRole;
}

function adminModuleUrl(pathname, returnTo = "admin") {
  const url = new URL(pathname, window.location.origin);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  return url.pathname + url.search + url.hash;
}

function syncExecutiveAdminAccess(pageKey) {
  if (pageKey) adminCurrentPageKey = pageKey;
  document.body.classList.toggle("executive-admin-access", adminIsExecutive() && EXECUTIVE_ADMIN_PAGES.has(adminCurrentPageKey));
}

function adminNumber(value) {
  return Number(value || 0).toLocaleString();
}

function adminMoney(value) {
  return "\u20b1" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function adminEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function adminCleanCurrentPage(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "signed in") return "—";

  const pageLabels = {
    dashboard: "Dashboard",
    map: "Map",
    terminals: "Terminals",
    "problematic-sites": "Problematic Sites",
    acceptance: "Acceptance",
    ticket: "Ticket",
    reports: "Reports",
    files: "Files",
    inventory: "Inventory",
    settings: "Settings",
    "accounts-monitoring": "Accounts Monitoring",
    "user-requests": "User Requests",
    "staff-ids": "Staff IDs",
    collections: "Collections",
    employee: "Employee",
    "financial-report": "Financial Report",
    "company-income": "Company Income",
    "company-expenses": "Company Expenses",
    "project-expenses": "Project Expenses",
    "salary-increase": "Salary Increase"
  };

  const slugToLabel = slug => {
    const clean = String(slug || "")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/^(admin|noc|finance)-/, "");
    return pageLabels[clean] || clean.split("-").filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const route = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  try {
    const url = new URL(route, window.location.origin);
    const pageParam = url.searchParams.get("page");
    if (pageParam) return slugToLabel(pageParam);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const withoutExt = last.replace(/\.(html?|php)$/i, "");
    if (/dashboard$/i.test(withoutExt) && parts.length > 1) return "Dashboard";
    return withoutExt ? slugToLabel(withoutExt) : "—";
  } catch {
    const clean = route.split("?")[0].split("/").filter(Boolean).pop() || route;
    return clean ? slugToLabel(clean) : "—";
  }
}

function ensureAdminStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function ensureAdminScript(id, src) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing?.dataset.loaded === "1") return resolve();
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
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

async function ensureAdminNocModule() {
  if (window.__adminNocLoaders) return window.__adminNocLoaders;
  ensureAdminStylesheet("admin-noc-dashboard-css", "/modules/noc/noc-dashboard.css");
  await ensureAdminScript("admin-noc-dashboard-js", "/modules/noc/noc-dashboard.js");
  if (!window.__adminRequestNotificationHooked && typeof window.sendRequestNotification === "function") {
    const originalSendRequestNotification = window.sendRequestNotification.bind(window);
    window.sendRequestNotification = async (...args) => {
      const result = await originalSendRequestNotification(...args);
      if (document.getElementById("stgRequestsMount")) adminLoadMyRequests();
      return result;
    };
    window.__adminRequestNotificationHooked = true;
  }
  window.__adminNocLoaders = {
    dashboard: window.loadDashboard,
    map: window.loadMap,
    terminals: window.loadTerminals,
    problematicSites: window.loadProblematicSites,
    acceptance: window.loadAcceptance,
    ticket: window.loadTickets,
    reports: window.loadReports,
    files: window.loadLetters,
    inventory: window.loadInventory
  };
  return window.__adminNocLoaders;
}

async function ensureAdminFinanceModule() {
  if (window.__adminFinanceLoaders) return window.__adminFinanceLoaders;
  ensureAdminStylesheet("admin-finance-dashboard-css", "/modules/finance/finance-dashboard.css");
  await ensureAdminScript("admin-finance-files-js", "/modules/finance/finance-files.js");
  await ensureAdminScript("admin-finance-dashboard-js", "/modules/finance/finance-dashboard.js");
  window.__adminFinanceLoaders = {
    dashboard: window.loadFinanceDashboard,
    companyIncome: window.loadFinanceCompanyIncome,
    companyExpenses: window.loadFinanceCompanyExpenses,
    projectExpenses: () => window.loadFinanceLedger("project_expenses"),
    collections: () => window.loadFinanceLedger("collections"),
    inventory: window.loadFinanceInventory,
    files: window.loadFinanceFiles,
    employee: window.loadFinanceEmployeeCenter,
    financialReport: window.loadFinanceReportV2
  };
  return window.__adminFinanceLoaders;
}

function renderAdminViewLoading(label) {
  mainContent.innerHTML = `
    <div class="admin-page">
      <div class="admin-empty"><i class="ri-loader-4-line spin"></i> Loading ${adminEsc(label)}...</div>
    </div>
  `;
}

async function loadAdminNocView(viewName, label) {
  renderAdminViewLoading(`NOC ${label}`);
  try {
    const loaders = await ensureAdminNocModule();
    const loader = loaders[viewName];
    if (typeof loader !== "function") throw new Error("NOC view is unavailable.");
    await loader();
  } catch (err) {
    mainContent.innerHTML = `<div class="admin-page"><div class="admin-empty"><i class="ri-error-warning-line"></i> ${adminEsc(err.message || "Unable to load NOC view.")}</div></div>`;
  }
}

async function loadAdminFinanceView(viewName, label) {
  renderAdminViewLoading(`Finance ${label}`);
  try {
    const loaders = await ensureAdminFinanceModule();
    const loader = loaders[viewName];
    if (typeof loader !== "function") throw new Error("Finance view is unavailable.");
    await loader();
  } catch (err) {
    mainContent.innerHTML = `<div class="admin-page"><div class="admin-empty"><i class="ri-error-warning-line"></i> ${adminEsc(err.message || "Unable to load Finance view.")}</div></div>`;
  }
}

async function adminOpenRequestForm(type) {
  const openers = {
    leave: () => window.openLeaveModal?.(adminUser),
    id: () => window.openIdRequestModal?.(adminUser),
    salary: () => window.openSalaryIncreaseModal?.(adminUser),
    files: () => window.openFilesRequestModal?.(adminUser),
    reimbursement: () => window.openReimbursementRequestModal?.(adminUser),
    budget: () => window.openBudgetRequestModal?.(adminUser),
    salary_advance: () => window.openSalaryAdvanceRequestModal?.(adminUser)
  };
  const opener = openers[type];
  if (!opener) {
    showToast?.("Request form unavailable.", "error");
    return;
  }
  try {
    await ensureAdminNocModule();
    opener();
    setTimeout(() => {
      [
        "leaveRequestModal",
        "idRequestModal",
        "salaryIncreaseModal",
        "filesRequestModal",
        "reimbursementRequestModal",
        "budgetRequestModal",
        "salaryAdvanceRequestModal"
      ].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.zIndex = "20000";
      });
    }, 0);
  } catch {
    showToast?.("Unable to load the request form.", "error");
  }
}

async function adminLoadMyRequests() {
  const mount = document.getElementById("stgRequestsMount");
  if (!mount) return;
  mount.innerHTML = `<div class="stg-req-empty"><i class="ri-loader-4-line spin"></i><span>Loading your requests...</span></div>`;
  try {
    await ensureAdminNocModule();
    if (typeof window.loadMyRequests === "function") {
      await window.loadMyRequests();
      return;
    }
    throw new Error("Request history loader is unavailable.");
  } catch (err) {
    mount.innerHTML = `<div class="stg-req-empty"><i class="ri-error-warning-line"></i><span>${adminEsc(err.message || "Failed to load requests.")}</span></div>`;
  }
}

async function adminLoadInbox() {
  const mount = document.getElementById("utInboxMount");
  if (!mount) return;
  mount.innerHTML = `<div class="stg-req-empty"><i class="ri-loader-4-line spin"></i><span>Loading inbox...</span></div>`;
  try {
    await ensureAdminNocModule();
    if (typeof window.loadUnifiedInbox === "function") {
      await window.loadUnifiedInbox();
      return;
    }
    throw new Error("Inbox loader is unavailable.");
  } catch (err) {
    mount.innerHTML = `<div class="stg-req-empty"><i class="ri-error-warning-line"></i><span>${adminEsc(err.message || "Failed to load inbox.")}</span></div>`;
  }
}

function loadAdminDashboard() {
  adminSetSettingsMode(false);
  adminApplyDisplaySettings();
  mainContent.innerHTML = `
    <div class="admin-page">
      <div class="admin-header">
        <div class="admin-header-title">
          <div class="admin-header-icon"><i class="ri-shield-user-line"></i></div>
          <div class="admin-header-copy">
            <div class="admin-header-kicker">Command Center</div>
            <h2>Admin Dashboard</h2>
            <p>System-wide overview for ${adminUser?.full_name || adminUser?.email || "Admin"}</p>
            <div class="admin-header-meta">
              <span><i class="ri-shield-star-line"></i> Cross-module control</span>
              <span><i class="ri-pulse-line"></i> Live operational snapshot</span>
            </div>
          </div>
        </div>
      </div>

      <div id="adminOverview">
        <div class="admin-empty"><i class="ri-loader-4-line spin"></i> Loading admin overview...</div>
      </div>
    </div>
  `;

  fetchAdminOverview();
}

function loadAdminSettings() {
  adminRenderSettingsPage();
}

function adminGetSettingsState() {
  const defaults = {
    theme: "light",
    brightness: 100,
    nightLight: false,
    fontSize: 16,
    restrictStaffData: false,
    hideFinancialAmounts: false,
    auditLogging: true
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("adminSettings") || "{}") };
  } catch {
    return defaults;
  }
}

function adminSaveSettingsState(nextState) {
  localStorage.setItem("adminSettings", JSON.stringify(nextState));
}

function adminApplyDisplaySettings(prefs = adminGetSettingsState()) {
  const theme = prefs.theme === "dark" ? "dark" : "light";
  const brightness = Number.isFinite(Number(prefs.brightness)) ? Math.min(100, Math.max(20, Number(prefs.brightness))) : 100;
  const fontSize = Number.isFinite(Number(prefs.fontSize)) ? Math.min(20, Math.max(12, Number(prefs.fontSize))) : 16;
  const filterParts = [`brightness(${(brightness / 100).toFixed(2)})`];
  if (prefs.nightLight) filterParts.push("sepia(0.18)");
  document.body.classList.toggle("dark", theme === "dark");
  document.body.style.filter = filterParts.join(" ");
  document.documentElement.style.fontSize = `${fontSize}px`;
}

function adminSetSettingsMode(isSettings) {
  document.body.classList.toggle("executive-settings-page", !!isSettings);
}

function adminInitials(user) {
  const name = String(user.full_name || user.email || "Admin User").trim();
  return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase() || "AD";
}

function adminRenderSettingsPage() {
  adminSetSettingsMode(true);
  adminApplyDisplaySettings();
  const user = adminUser || {};
  const prefs = adminGetSettingsState();
  const main = mainContent;
  const initials = adminInitials(user);
  const savedTheme = prefs.theme === "dark" ? "dark" : "light";

  main.innerHTML = `
    <div class="stg-page">
      <div class="stg-layout">
        <nav class="stg-sidenav">
          <div class="stg-sidenav-top">
            ${[
              ["account", "Account", "Profile & security", "ri-user-3-line"],
              ["display", "Display", "Theme & appearance", "ri-palette-line"],
              ["privacy", "Privacy & Data", "Security & export", "ri-shield-check-line"],
              ["inbox", "Inbox", "Messages & Requests", "ri-mail-line"],
              ["requests", "My Requests", "Track your submissions", "ri-file-list-3-line"]
            ].map(([tab, label, sub, icon], index) => `
              <button class="stg-navitem ${index === 0 ? "active" : ""}" data-tab="${tab}">
                <div class="stg-navitem-icon"><i class="${icon}"></i></div>
                <div class="stg-navitem-text">
                  <span class="stg-navitem-label">${label}</span>
                  <span class="stg-navitem-sub">${sub}</span>
                </div>
                <i class="ri-arrow-right-s-line stg-navitem-arrow"></i>
              </button>
            `).join("")}
          </div>
          <div class="stg-nav-usercard">
            <div class="stg-nav-avatar"><span>${initials}</span></div>
            <div class="stg-nav-userinfo">
              <div class="stg-nav-username">${adminEsc(user.full_name || "Admin User")}</div>
              <div class="stg-nav-userrole">${adminEsc(user.role || "Admin")}</div>
            </div>
          </div>
        </nav>

        <div class="stg-panels">
          <div class="stg-panel active" id="stg-tab-account">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-user-3-line"></i> Profile Information</div>
                <button class="stg-outline-btn" id="admEditBtn"><i class="ri-edit-line"></i> Edit Profile</button>
              </div>
              <div class="stg-profile-hero">
                <div class="stg-avatar-wrap"><div class="stg-avatar" id="admAvatar">${initials}</div></div>
                <div class="stg-profile-hero-info">
                  <div class="stg-profile-name">${adminEsc(user.full_name || "Admin User")}</div>
                  <span class="stg-role-badge">${adminEsc(user.role || "Admin")}</span>
                  <div class="stg-photo-hint"><i class="ri-information-line"></i> Admin account profile and permissions are kept inside this shell.</div>
                </div>
              </div>
              <div class="stg-info-grid">
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-user-line"></i> Full Name</div><div class="stg-info-value">${adminEsc(user.full_name || "—")}</div></div>
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-id-card-line"></i> ID Number</div><div class="stg-info-value">${adminEsc(user.id_no || user.id_number || "—")}</div></div>
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-mail-line"></i> Email Address</div><div class="stg-info-value">${adminEsc(user.email || "—")}</div></div>
                <div class="stg-info-cell"><div class="stg-info-label"><i class="ri-shield-user-line"></i> Role</div><div class="stg-info-value" style="text-transform:capitalize;">${adminEsc(user.role || "Admin")}</div></div>
              </div>
            </div>

            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-flashlight-line"></i> Quick Actions</div>
              </div>
              <div class="stg-action-tiles">
                <button class="stg-action-tile" id="admChangePwBtn">
                  <div class="stg-tile-icon stg-tile-blue"><i class="ri-lock-password-line"></i></div>
                  <div class="stg-tile-body">
                    <div class="stg-tile-label">Change Password</div>
                    <div class="stg-tile-desc">Update your account password</div>
                  </div>
                  <i class="ri-arrow-right-s-line stg-tile-arrow"></i>
                </button>
                <button class="stg-action-tile" id="admRequestBtn">
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
                    <span class="stg-val-badge" id="admBrightnessVal">${prefs.brightness}%</span>
                    <input type="range" class="stg-slider" id="admBrightness" min="20" max="100" value="${prefs.brightness}">
                  </div>
                </div>
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#ede9fe;color:#7c3aed;"><i class="ri-moon-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Night Light</div>
                    <div class="stg-row-desc">Warmer colors to reduce eye strain</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" id="admNightLight" ${prefs.nightLight ? "checked" : ""}>
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
                  <div class="stg-theme-pills" id="admThemePills">
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
                    <input type="range" class="stg-slider" id="admFontSize" min="12" max="20" value="${prefs.fontSize}">
                    <span class="stg-font-lg">A</span>
                    <span class="stg-val-badge" id="admFontVal">${prefs.fontSize}px</span>
                  </div>
                </div>
              </div>
              <div class="stg-card2-footer">
                <button class="stg-outline-btn" id="admFontApply"><i class="ri-refresh-line"></i> Apply Font</button>
                <button class="stg-save-btn" id="admDisplaySave"><i class="ri-save-line"></i> Save Changes</button>
              </div>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-privacy">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-lock-line"></i> Security &amp; Access</div>
              </div>
              <div class="stg-row-list">
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#eff6ff;color:#2563eb;"><i class="ri-shield-user-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Restrict Staff Data</div>
                    <div class="stg-row-desc">Limit staff information to authorized admin views</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" id="admRestrictStaff" ${prefs.restrictStaffData ? "checked" : ""}>
                    <span class="stg-toggle-track"><span class="stg-toggle-thumb"></span></span>
                  </label>
                </div>
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#f0fdf4;color:#16a34a;"><i class="ri-money-dollar-box-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Hide Financial Amounts</div>
                    <div class="stg-row-desc">Mask finance amounts in overview cards and summaries</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" id="admHideFinance" ${prefs.hideFinancialAmounts ? "checked" : ""}>
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
                  <div class="stg-row-icon" style="background:#f0fdf4;color:#16a34a;"><i class="ri-file-chart-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Audit Logging</div>
                    <div class="stg-row-desc">Keep admin activity logs enabled</div>
                  </div>
                  <label class="stg-toggle">
                    <input type="checkbox" id="admAuditLogging" ${prefs.auditLogging ? "checked" : ""}>
                    <span class="stg-toggle-track"><span class="stg-toggle-thumb"></span></span>
                  </label>
                </div>
                <div class="stg-row">
                  <div class="stg-row-icon" style="background:#eff6ff;color:#2563eb;"><i class="ri-download-2-line"></i></div>
                  <div class="stg-row-body">
                    <div class="stg-row-label">Export Reports</div>
                    <div class="stg-row-desc">Download admin reports and summaries</div>
                  </div>
                  <button class="stg-outline-btn" id="admExportBtn"><i class="ri-download-2-line"></i> Export</button>
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
                  <div class="stg-danger-desc">This action requires higher-level approval and cannot be undone.</div>
                </div>
                <button class="stg-delete-btn" id="admDeleteAccBtn">
                  <i class="ri-delete-bin-line"></i> Delete
                </button>
              </div>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-inbox">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-inbox-2-line"></i> Inbox</div>
              </div>
              <div id="utInboxMount" class="stg-inbox-mount">
                <div class="stg-req-empty">
                  <i class="ri-inbox-2-line"></i>
                  <span>Loading shared inbox...</span>
                  <small>Messages across roles will appear here.</small>
                </div>
              </div>
            </div>
          </div>

          <div class="stg-panel" id="stg-tab-requests">
            <div class="stg-card2">
              <div class="stg-card2-header">
                <div class="stg-card2-title"><i class="ri-file-list-3-line"></i> My Requests</div>
                <button class="stg-outline-btn" id="admNewRequestBtn"><i class="ri-add-line"></i> New Request</button>
              </div>
              <div id="stgRequestsMount">
                <div class="stg-req-empty">
                  <i class="ri-file-list-3-line"></i>
                  <span>Your requests are tied to this account.</span>
                  <small>Open a request or refresh this tab to see submitted items here.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="admPwModal">
      <div class="acc-modal-shell">
        <div class="acc-modal-header">
          <div class="acc-modal-title-row">
            <div class="acc-modal-icon"><i class="ri-lock-password-line"></i></div>
            <div>
              <div class="acc-modal-title">Change Password</div>
              <div class="acc-modal-sub">Enter your current and new password</div>
            </div>
          </div>
          <button class="acc-modal-close-btn" id="admPwClose"><i class="ri-close-line"></i></button>
        </div>
        <div class="acc-modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <div><label class="acc-modal-label">Current Password</label><input type="password" id="admPwCurrent" class="acc-modal-input" placeholder="Enter current password"></div>
          <div><label class="acc-modal-label">New Password</label><input type="password" id="admPwNew" class="acc-modal-input" placeholder="Enter new password"></div>
          <div><label class="acc-modal-label">Confirm New Password</label><input type="password" id="admPwConfirm" class="acc-modal-input" placeholder="Repeat new password"></div>
        </div>
        <div class="acc-modal-footer">
          <button class="acc-modal-cancel" id="admPwCancel">Cancel</button>
          <button class="acc-modal-submit" id="admPwSave"><i class="ri-save-line"></i> Update Password</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="admEditModal">
      <div class="acc-modal-shell">
        <div class="acc-modal-header">
          <div class="acc-modal-title-row">
            <div class="acc-modal-icon"><i class="ri-user-settings-line"></i></div>
            <div>
              <div class="acc-modal-title">Edit Profile</div>
              <div class="acc-modal-sub">Update your display name and email</div>
            </div>
          </div>
          <button class="acc-modal-close-btn" id="admEditClose"><i class="ri-close-line"></i></button>
        </div>
        <div class="acc-modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <div><label class="acc-modal-label">Full Name</label><input type="text" id="admEditName" class="acc-modal-input" value="${adminEsc(user.full_name || "")}"></div>
          <div><label class="acc-modal-label">Email Address</label><input type="email" id="admEditEmail" class="acc-modal-input" value="${adminEsc(user.email || "")}"></div>
        </div>
        <div class="acc-modal-footer">
          <button class="acc-modal-cancel" id="admEditCancel">Cancel</button>
          <button class="acc-modal-submit" id="admEditSave"><i class="ri-save-line"></i> Save Changes</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay hidden" id="admRequestModal">
      <div class="lv-shell rq-shell">
        <div class="lv-header">
          <div class="lv-header-left">
            <div class="lv-header-icon"><i class="ri-file-list-3-line"></i></div>
            <div>
              <div class="lv-header-title">Request</div>
              <div class="lv-header-sub">Choose a request type to open the form</div>
            </div>
          </div>
          <button class="lv-close-btn" id="admRequestClose"><i class="ri-close-line"></i></button>
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
              ["salary_advance", "ri-hand-coin-line", "Salary Advance Request", "Request a salary advance with deduction terms"]
            ].map(([type, icon, title, desc]) => `
              <button type="button" class="rq-type-card" data-adm-request="${type}">
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

  const saveTheme = (theme) => {
    const next = { ...adminGetSettingsState(), theme };
    adminSaveSettingsState(next);
    adminApplyDisplaySettings(next);
    document.querySelectorAll(".stg-theme-pill").forEach(btn => btn.classList.toggle("active", btn.dataset.theme === theme));
  };

  const saveBrightness = (brightness) => {
    const next = { ...adminGetSettingsState(), brightness };
    adminSaveSettingsState(next);
    const val = document.getElementById("admBrightnessVal");
    if (val) val.textContent = `${brightness}%`;
    adminApplyDisplaySettings(next);
  };

  const saveFont = (fontSize) => {
    const next = { ...adminGetSettingsState(), fontSize };
    adminSaveSettingsState(next);
    const val = document.getElementById("admFontVal");
    if (val) val.textContent = `${fontSize}px`;
    adminApplyDisplaySettings(next);
  };

  document.querySelectorAll(".stg-navitem").forEach(btn => {
    btn.addEventListener("click", () => {
    document.querySelectorAll(".stg-navitem").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".stg-panel").forEach(panel => panel.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`stg-tab-${btn.dataset.tab}`)?.classList.add("active");
      if (btn.dataset.tab === "inbox") adminLoadInbox();
      if (btn.dataset.tab === "requests") adminLoadMyRequests();
    });
  });

  document.getElementById("admEditBtn")?.addEventListener("click", () => document.getElementById("admEditModal")?.classList.remove("hidden"));
  document.getElementById("admChangePwBtn")?.addEventListener("click", () => document.getElementById("admPwModal")?.classList.remove("hidden"));
  document.getElementById("admRequestBtn")?.addEventListener("click", () => document.getElementById("admRequestModal")?.classList.remove("hidden"));
  document.getElementById("admBrightness")?.addEventListener("input", (event) => saveBrightness(Number(event.target.value)));
  document.getElementById("admNightLight")?.addEventListener("change", (event) => {
    const next = { ...adminGetSettingsState(), nightLight: event.target.checked };
    adminSaveSettingsState(next);
    adminApplyDisplaySettings(next);
  });
  document.querySelectorAll(".stg-theme-pill").forEach(btn => btn.addEventListener("click", () => saveTheme(btn.dataset.theme || "light")));
  document.getElementById("admFontSize")?.addEventListener("input", (event) => saveFont(Number(event.target.value)));
  document.getElementById("admFontApply")?.addEventListener("click", () => { adminApplyDisplaySettings(adminGetSettingsState()); showToast?.("Font preference applied.", "success"); });
  document.getElementById("admDisplaySave")?.addEventListener("click", () => { adminApplyDisplaySettings(adminGetSettingsState()); showToast?.("Admin display settings saved.", "success"); });
  document.getElementById("admRestrictStaff")?.addEventListener("change", (event) => adminSaveSettingsState({ ...adminGetSettingsState(), restrictStaffData: event.target.checked }));
  document.getElementById("admHideFinance")?.addEventListener("change", (event) => adminSaveSettingsState({ ...adminGetSettingsState(), hideFinancialAmounts: event.target.checked }));
  document.getElementById("admAuditLogging")?.addEventListener("change", (event) => adminSaveSettingsState({ ...adminGetSettingsState(), auditLogging: event.target.checked }));
  document.getElementById("admExportBtn")?.addEventListener("click", () => showToast?.("Export queued for Admin reports.", "success"));
  document.getElementById("admDeleteAccBtn")?.addEventListener("click", () => showToast?.("Delete account requires higher-level approval.", "warning"));
  document.getElementById("admNewRequestBtn")?.addEventListener("click", () => document.getElementById("admRequestModal")?.classList.remove("hidden"));
  if (document.getElementById("stg-tab-inbox")?.classList.contains("active")) adminLoadInbox();
  if (document.getElementById("stg-tab-requests")?.classList.contains("active")) adminLoadMyRequests();

  const closeModal = (id) => document.getElementById(id)?.classList.add("hidden");
  ["admPwModal", "admEditModal", "admRequestModal"].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener("click", event => { if (event.target === modal) closeModal(id); });
  });
  document.getElementById("admPwClose")?.addEventListener("click", () => closeModal("admPwModal"));
  document.getElementById("admPwCancel")?.addEventListener("click", () => closeModal("admPwModal"));
  document.getElementById("admEditClose")?.addEventListener("click", () => closeModal("admEditModal"));
  document.getElementById("admEditCancel")?.addEventListener("click", () => closeModal("admEditModal"));
  document.getElementById("admRequestClose")?.addEventListener("click", () => closeModal("admRequestModal"));

  document.getElementById("admEditSave")?.addEventListener("click", async () => {
    const full_name = document.getElementById("admEditName").value.trim();
    const email = document.getElementById("admEditEmail").value.trim();
    if (!full_name || !email) return showToast?.("Name and email are required.", "error");
    const btn = document.getElementById("admEditSave");
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Saving...';
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return showToast?.(result.error || "Update failed.", "error");
      localStorage.setItem("user", JSON.stringify({ ...user, full_name, email }));
      closeModal("admEditModal");
      showToast?.("Admin profile updated.", "success");
      adminRenderSettingsPage();
    } catch {
      showToast?.("Network error.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ri-save-line"></i> Save Changes';
    }
  });

  document.getElementById("admPwSave")?.addEventListener("click", async () => {
    const current = document.getElementById("admPwCurrent").value;
    const newPw = document.getElementById("admPwNew").value;
    const confirm = document.getElementById("admPwConfirm").value;
    if (!current || !newPw || !confirm) return showToast?.("All fields are required.", "error");
    if (newPw !== confirm) return showToast?.("New passwords do not match.", "error");
    if (newPw.length < 6) return showToast?.("Password must be at least 6 characters.", "error");
    const btn = document.getElementById("admPwSave");
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Updating...';
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: newPw })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return showToast?.(result.error || "Failed.", "error");
      ["admPwCurrent", "admPwNew", "admPwConfirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
      closeModal("admPwModal");
      showToast?.("Password updated successfully.", "success");
    } catch {
      showToast?.("Network error.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ri-save-line"></i> Update Password';
    }
  });

  document.querySelectorAll("[data-adm-request]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const type = btn.dataset.admRequest;
      closeModal("admRequestModal");
      await adminOpenRequestForm(type);
    });
  });
}

async function fetchAdminOverview() {
  const root = document.getElementById("adminOverview");
  if (!root) return;

  try {
    const res = await fetch("/api/admin/overview", { headers: adminHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to load admin overview");
    renderAdminOverview(data);
  } catch (err) {
    root.innerHTML = `<div class="admin-empty"><i class="ri-error-warning-line"></i> ${err.message || "Admin overview failed to load."}</div>`;
  }
}

function renderAdminOverview(data) {
  const cards = [
    { label: "NOC Tickets", value: adminNumber(data.noc?.tickets || 0), icon: "ri-ticket-line", meta: "NOC", tone: "blue" },
    { label: "Finance Income", value: adminMoney(data.finance?.total_income || 0), icon: "ri-line-chart-line", meta: "Finance", tone: "emerald" },
    { label: "Inventory Items", value: adminNumber(data.inventory?.total_items || 0), icon: "ri-archive-2-line", meta: "Assets", tone: "violet" },
    { label: "Files", value: adminNumber(data.files?.total_files || 0), icon: "ri-file-line", meta: "Documents", tone: "amber" },
    { label: "Employees", value: adminNumber(data.employees?.total || 0), icon: "ri-team-line", meta: "People", tone: "slate" },
    { label: "Requests", value: adminNumber(data.requests?.pending || 0), icon: "ri-inbox-line", meta: "Action queue", tone: "rose" }
  ];

  document.getElementById("adminOverview").innerHTML = `
    <div class="admin-overview-strip">
      <div>
        <div class="admin-section-kicker">At a glance</div>
        <h3>Operational snapshot</h3>
        <p>Key counts from NOC, Finance, and shared system records.</p>
      </div>
      <div class="admin-overview-meta">
        <span><i class="ri-dashboard-3-line"></i> 6 live metrics</span>
        <span><i class="ri-layout-grid-line"></i> 3 summary panels</span>
      </div>
    </div>
    <div class="admin-summary-grid">
      ${cards.map(card => `
        <div class="admin-card" data-tone="${card.tone}">
          <div class="admin-card-top">
            <div class="admin-card-icon"><i class="${card.icon}"></i></div>
            <span class="admin-card-chip">${card.meta}</span>
          </div>
          <strong>${card.value}</strong>
          <span>${card.label}</span>
        </div>
      `).join("")}
    </div>

    <div class="admin-detail-grid">
      <div class="admin-panel">
        <h3>NOC Summary</h3>
        <p class="admin-panel-subtitle">Network operations activity and site readiness</p>
        <div class="admin-list">
          <div class="admin-list-row"><span>Regions</span><b>${adminNumber(data.noc?.regions)}</b></div>
          <div class="admin-list-row"><span>Problematic Sites</span><b>${adminNumber(data.noc?.problematic_sites)}</b></div>
          <div class="admin-list-row"><span>Acceptance Sites</span><b>${adminNumber(data.noc?.acceptance_sites)}</b></div>
        </div>
      </div>

      <div class="admin-panel">
        <h3>Finance Summary</h3>
        <p class="admin-panel-subtitle">Income, expenses, and collections in one view</p>
        <div class="admin-list">
          <div class="admin-list-row"><span>Total Income</span><b>${adminMoney(data.finance?.total_income)}</b></div>
          <div class="admin-list-row"><span>Total Expenses</span><b>${adminMoney(data.finance?.total_expenses)}</b></div>
          <div class="admin-list-row"><span>Collections</span><b>${adminMoney(data.finance?.total_collections)}</b></div>
        </div>
      </div>

      <div class="admin-panel">
        <h3>Inventory and Files</h3>
        <p class="admin-panel-subtitle">Stock levels and shared document volume</p>
        <div class="admin-list">
          <div class="admin-list-row"><span>NOC Inventory</span><b>${adminNumber(data.inventory?.noc_items)}</b></div>
          <div class="admin-list-row"><span>Finance Inventory</span><b>${adminNumber(data.inventory?.finance_items)}</b></div>
          <div class="admin-list-row"><span>Uploaded Files</span><b>${adminNumber(data.files?.total_files)}</b></div>
        </div>
      </div>
    </div>
  `;
}

function adminRoleLabel(role) {
  const key = String(role || "").toLowerCase();
  if (key === "noc") return "NOC";
  if (key === "finance") return "Finance";
  if (key === "admin") return "Admin";
  if (key === "bidder") return "Bidder";
  if (key === "executive") return "Executive";
  return role || "-";
}

function adminStatusClass(status) {
  return String(status || "unused").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function adminFormatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function adminRequestStatusClass(status) {
  const key = String(status || "pending").toLowerCase();
  if (key === "approved" || key === "released" || key === "returned") return "approved";
  if (key === "rejected" || key === "cancelled") return "rejected";
  return "pending";
}

function adminRequestGroupLabel(role) {
  const key = String(role || "other").toLowerCase();
  if (key === "noc") return "NOC Requests";
  if (key === "finance") return "Finance Requests";
  if (key === "admin") return "Admin Requests";
  if (key === "bidder") return "Bidder Requests";
  return "Other Requests";
}

function adminHumanizeKey(key) {
  return String(key || "")
    .replace(/_id$/i, " ID")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function adminFormatDetailValue(key, value) {
  if (value === null || value === undefined || value === "") return "&mdash;";
  const keyLower = String(key || "").toLowerCase();
  if (keyLower.includes("date") || keyLower.endsWith("_at")) return adminEsc(adminFormatDateTime(value));
  if (keyLower.includes("amount") || keyLower.includes("salary")) return adminEsc(adminMoney(value));
  if (keyLower.includes("attachment") || keyLower.includes("proof") || keyLower.includes("receipt") || keyLower.includes("supporting_file")) {
    const href = String(value);
    return `<a href="${adminEsc(href)}" target="_blank" rel="noopener">${adminEsc(href.split("/").pop() || "View file")}</a>`;
  }
  return adminEsc(value);
}

function adminRequestDateRequested(request) {
  return request.request_date || request.submitted_at || request.created_at || request.requested_at || null;
}

function adminRequestFieldIcon(key) {
  const k = String(key || "").toLowerCase();
  if (k.includes("amount") || k.includes("salary")) return "ri-money-dollar-circle-line";
  if (k.includes("date")) return "ri-calendar-line";
  if (k.includes("department") || k.includes("position")) return "ri-building-4-line";
  if (k.includes("reason") || k.includes("purpose") || k.includes("justification") || k.includes("summary")) return "ri-file-text-line";
  if (k.includes("remarks") || k.includes("terms")) return "ri-chat-3-line";
  if (k.includes("category") || k.includes("type")) return "ri-price-tag-3-line";
  return "ri-file-list-3-line";
}

function adminRequestFieldConfig(type) {
  return {
    leave: [
      ["Department", "department"], ["Position", "position"], ["Leave Type", "leave_type"],
      ["Start Date", "start_date"], ["End Date", "end_date"], ["Number of Days", "number_of_days"],
      ["Purpose / Reason", "reason"], ["Remarks", "remarks"]
    ],
    id: [
      ["Department", "department"], ["ID Type", "id_type"], ["Purpose / Reason", "purpose"], ["Remarks", "remarks"]
    ],
    salary: [
      ["Department", "department"], ["Current Salary", "current_salary"], ["Requested Salary", "requested_salary"],
      ["Effective Date", "effective_date"], ["Purpose / Reason", "justification"], ["Remarks", "remarks"]
    ],
    files: [
      ["Department", "department"], ["Document Name", "document_name"], ["Purpose / Reason", "purpose"],
      ["Request Action", "request_action"], ["Copy Type", "copy_type"]
    ],
    reimbursement: [
      ["Department", "department"], ["Reimbursement Category", "category"], ["Amount", "amount"],
      ["Expense Date", "expense_date"], ["Purpose / Reason", "purpose"], ["Remarks", "remarks"]
    ],
    budget: [
      ["Budget Title / Purpose", "title"], ["Department / Project", "department_project"],
      ["Requested Amount", "requested_amount"], ["Date Needed", "date_needed"],
      ["Reason / Justification", "justification"], ["Remarks", "remarks"]
    ],
    salary_advance: [
      ["Requested Amount", "requested_amount"], ["Reason", "reason"],
      ["Deduction Start Date", "deduction_start_date"], ["Deduction Terms / Number of Cutoffs", "deduction_terms"],
      ["Remarks", "remarks"]
    ]
  }[String(type || "").toLowerCase()] || [];
}

function adminRequestFileItems(request) {
  const pairs = [
    ["Attachment", request.attachment, request.attachment_name],
    ["Receipt / Proof", request.receipt_path, request.receipt_name],
    ["Supporting File", request.supporting_file, request.supporting_file_name],
    ["Proof of Return", request.proof_of_return, request.proof_of_return_name]
  ];
  return pairs.filter(([, href]) => href).map(([label, href, name]) => ({
    label,
    href: String(href),
    name: String(name || href).split("/").pop()
  }));
}

function adminRenderRequestField(label, key, value) {
  return `
    <div class="admin-request-detail-field">
      <i class="${adminRequestFieldIcon(key)}"></i>
      <div>
        <span>${adminEsc(label)}</span>
        <strong>${adminFormatDetailValue(key, value)}</strong>
      </div>
    </div>
  `;
}

function adminRenderRequestFile(file) {
  const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.href);
  const ext = (file.name.split(".").pop() || "file").toUpperCase();
  return `
    <div class="admin-request-file-card">
      <div class="admin-request-file-preview">
        ${isImage
          ? `<img src="${adminEsc(file.href)}" alt="${adminEsc(file.name)}">`
          : `<i class="ri-file-text-line"></i>`}
      </div>
      <div>
        <span>${adminEsc(file.label)}</span>
        <strong>${adminEsc(file.name || "Open file")}</strong>
        <small>${adminEsc(ext)} &bull; Size unavailable</small>
      </div>
      <a href="${adminEsc(file.href)}" target="_blank" rel="noopener">
        <i class="ri-download-2-line"></i> Open
      </a>
    </div>
  `;
}

function adminRequestTimeline(request) {
  const submittedAt = adminRequestDateRequested(request);
  const decidedAt = request.handled_at || request.updated_at;
  const decidedBy = request.handled_by || request.handled_by_name || "—";
  const status = String(request.status || "Pending");
  const finalLabel = status.toLowerCase() === "rejected" ? "Rejected"
    : status.toLowerCase() === "approved" ? "Approved"
    : status;
  return [
    { cls: "submitted", label: "Submitted", user: request.full_name || "Requester", date: submittedAt },
    { cls: "review", label: "Under Review", user: decidedBy !== "—" ? decidedBy : "Admin team", date: submittedAt },
    { cls: adminRequestStatusClass(status), label: finalLabel, user: decidedBy, date: decidedAt }
  ];
}

function adminRenderTimelineItem(item) {
  return `
    <div class="admin-request-timeline-item ${item.cls}">
      <span></span>
      <div>
        <strong>${adminEsc(item.label)}</strong>
        <p>${adminEsc(item.user || "—")}</p>
        <small>${adminEsc(adminFormatDateTime(item.date))}</small>
      </div>
    </div>
  `;
}

function loadAdminStaffIds() {
  mainContent.innerHTML = `
    <div class="admin-page admin-staff-page">
      <div class="admin-header">
        <div class="admin-header-title">
          <div class="admin-header-icon"><i class="ri-id-card-line"></i></div>
          <div>
            <h2>Staff ID Management</h2>
            <p>Create Staff IDs before staff can register accounts.</p>
          </div>
        </div>
      </div>

      <div class="admin-staff-grid">
        <form class="admin-staff-form admin-panel" id="adminStaffForm">
          <h3>Add Staff ID</h3>
          <label><span>Staff ID</span><input name="staff_id" type="text" required placeholder="e.g. ST-1001"></label>
          <label><span>Department / Module</span><input name="department" type="text" placeholder="NOC Department"></label>
          <label>
            <span>Assigned System Role</span>
            <select name="assigned_role" required>
              ${ADMIN_STAFF_ID_ROLES.map(role => `<option value="${role}">${adminEsc(adminRoleLabel(role))}</option>`).join("")}
            </select>
          </label>
          <button class="admin-staff-submit" type="submit"><i class="ri-add-line"></i> Create Staff ID</button>
          <div class="admin-staff-message" id="adminStaffMessage"></div>
        </form>

        <div class="admin-panel admin-staff-list-panel">
          <div class="admin-staff-toolbar">
            <h3>Staff IDs</h3>
            <div class="admin-staff-filters">
              <input id="adminStaffSearch" type="search" placeholder="Search Staff IDs..." value="${adminEsc(adminStaffSearch)}">
              <select id="adminStaffStatus">
                <option value="all" ${adminStaffStatus === "all" ? "selected" : ""}>All</option>
                <option value="unused" ${adminStaffStatus === "unused" ? "selected" : ""}>Unused</option>
                <option value="used" ${adminStaffStatus === "used" ? "selected" : ""}>Used</option>
                <option value="disabled" ${adminStaffStatus === "disabled" ? "selected" : ""}>Disabled</option>
              </select>
            </div>
          </div>
          <div id="adminStaffTableHost" class="admin-staff-table-host">
            <div class="admin-empty"><i class="ri-loader-4-line spin"></i> Loading Staff IDs...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("adminStaffForm")?.addEventListener("submit", createAdminStaffId);
  document.getElementById("adminStaffSearch")?.addEventListener("input", event => {
    adminStaffSearch = event.target.value.trim();
    clearTimeout(window.__adminStaffSearchTimer);
    window.__adminStaffSearchTimer = setTimeout(fetchAdminStaffIds, 220);
  });
  document.getElementById("adminStaffStatus")?.addEventListener("change", event => {
    adminStaffStatus = event.target.value;
    fetchAdminStaffIds();
  });

  fetchAdminStaffIds();
}

async function fetchAdminStaffIds() {
  const host = document.getElementById("adminStaffTableHost");
  if (!host) return;
  const params = new URLSearchParams();
  if (adminStaffSearch) params.set("search", adminStaffSearch);
  if (adminStaffStatus && adminStaffStatus !== "all") params.set("status", adminStaffStatus);
  try {
    const res = await fetch(`/api/admin/staff-ids?${params.toString()}`, { headers: adminHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(adminStaffIdApiError(res, data, "Unable to load Staff IDs"));
    adminStaffIds = Array.isArray(data) ? data : [];
    renderAdminStaffIds();
  } catch (err) {
    host.innerHTML = `<div class="admin-empty"><i class="ri-error-warning-line"></i> ${adminEsc(err.message || "Failed to load Staff IDs.")}</div>`;
  }
}

function adminStaffIdApiError(res, data, fallback) {
  if (res.status === 404) {
    return "Staff ID API route is not available. Restart the server to load the latest backend changes.";
  }
  return data.error || fallback;
}

function renderAdminStaffIds() {
  const host = document.getElementById("adminStaffTableHost");
  if (!host) return;
  if (!adminStaffIds.length) {
    host.innerHTML = `<div class="admin-empty"><i class="ri-id-card-line"></i> No Staff IDs found.</div>`;
    return;
  }
  host.innerHTML = `
    <div class="admin-staff-table-wrap">
      <table class="admin-staff-table">
        <thead>
          <tr>
            <th>Staff ID</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            <th>Linked Account</th>
            <th>Date Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${adminStaffIds.map(row => `
            <tr>
              <td><strong>${adminEsc(row.staff_id)}</strong></td>
              <td>${adminEsc(row.department || "-")}</td>
              <td>${adminEsc(adminRoleLabel(row.assigned_role))}</td>
              <td><span class="admin-staff-status ${adminStatusClass(row.status)}">${adminEsc(row.status || "unused")}</span></td>
              <td>${row.linked_user_email ? `${adminEsc(row.linked_user_name || "")}<small>${adminEsc(row.linked_user_email)}</small>` : "-"}</td>
              <td>${row.created_at ? adminEsc(new Date(row.created_at).toLocaleDateString()) : "-"}</td>
              <td>
                ${String(row.status).toLowerCase() === "unused"
                  ? `<button class="admin-staff-disable" data-id="${row.id}"><i class="ri-forbid-line"></i> Disable</button>`
                  : `<span class="admin-muted">-</span>`}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  host.querySelectorAll(".admin-staff-disable").forEach(btn => {
    btn.addEventListener("click", () => disableAdminStaffId(btn.dataset.id));
  });
}

async function createAdminStaffId(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("adminStaffMessage");
  const btn = form.querySelector("button[type='submit']");
  const body = Object.fromEntries(new FormData(form).entries());
  if (message) message.textContent = "";
  body.assigned_role = String(body.assigned_role || "").trim().toLowerCase();
  if (!ADMIN_STAFF_ID_ROLES.includes(body.assigned_role)) {
    if (message) {
      message.className = "admin-staff-message error";
      message.textContent = "Assigned role must be NOC, Finance, Admin, Bidder, or Executive.";
    }
    return;
  }
  btn.disabled = true;
  try {
    const res = await fetch("/api/admin/staff-ids", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(adminStaffIdApiError(res, data, "Unable to create Staff ID"));
    form.reset();
    if (message) {
      message.className = "admin-staff-message success";
      message.textContent = "Staff ID created.";
    }
    fetchAdminStaffIds();
  } catch (err) {
    if (message) {
      message.className = "admin-staff-message error";
      message.textContent = err.message || "Failed to create Staff ID.";
    }
  } finally {
    btn.disabled = false;
  }
}

async function disableAdminStaffId(id) {
  if (!confirm("Disable this Staff ID? Disabled IDs cannot be used for registration.")) return;
  try {
    const res = await fetch(`/api/admin/staff-ids/${id}/disable`, {
      method: "PATCH",
      headers: adminHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(adminStaffIdApiError(res, data, "Unable to disable Staff ID"));
    fetchAdminStaffIds();
  } catch (err) {
    alert(err.message || "Failed to disable Staff ID.");
  }
}

function loadAdminAccountsMonitoring() {
  mainContent.innerHTML = `
    <div class="admin-page admin-monitor-page">
      <div class="admin-header">
        <div class="admin-header-title">
          <div class="admin-header-icon"><i class="ri-pulse-line"></i></div>
          <div>
            <h2>Accounts Monitoring</h2>
            <p>Track all user accounts, activity status, and current module.</p>
          </div>
        </div>
      </div>
      <div class="admin-panel admin-monitor-panel">
        <div class="admin-staff-toolbar">
          <h3>User Accounts</h3>
          <div class="admin-staff-filters">
            <input id="adminAccountSearch" type="search" placeholder="Search accounts..." value="${adminEsc(adminAccountSearch)}">
          </div>
        </div>
        <div id="adminAccountsHost" class="admin-table-host"><div class="admin-empty"><i class="ri-loader-4-line spin"></i> Loading accounts...</div></div>
      </div>
    </div>
  `;
  document.getElementById("adminAccountSearch")?.addEventListener("input", event => {
    adminAccountSearch = event.target.value.trim();
    clearTimeout(window.__adminAccountSearchTimer);
    window.__adminAccountSearchTimer = setTimeout(fetchAdminAccounts, 220);
  });
  fetchAdminAccounts();
}

async function fetchAdminAccounts() {
  const host = document.getElementById("adminAccountsHost");
  if (!host) return;
  const params = new URLSearchParams();
  if (adminAccountSearch) params.set("search", adminAccountSearch);
  try {
    const res = await fetch(`/api/admin/accounts-monitoring?${params.toString()}`, { headers: adminHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to load accounts.");
    adminAccounts = Array.isArray(data) ? data : [];
    renderAdminAccounts();
  } catch (err) {
    host.innerHTML = `<div class="admin-empty"><i class="ri-error-warning-line"></i> ${adminEsc(err.message || "Failed to load accounts.")}</div>`;
  }
}

function renderAdminAccounts() {
  const host = document.getElementById("adminAccountsHost");
  if (!host) return;
  if (!adminAccounts.length) {
    host.innerHTML = `<div class="admin-empty"><i class="ri-user-search-line"></i> No accounts found.</div>`;
    return;
  }
  if (adminExpandedAccountId && !adminAccounts.some(row => String(row.id) === String(adminExpandedAccountId))) {
    adminExpandedAccountId = null;
  }
  host.innerHTML = `
    <div class="admin-staff-table-wrap admin-monitor-table-wrap">
      <table class="admin-staff-table admin-monitor-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${adminAccounts.map(row => {
            const isOpen = String(adminExpandedAccountId) === String(row.id);
            const currentPage = adminCleanCurrentPage(row.current_page);
            return `
            <tr class="admin-account-row ${isOpen ? "is-open" : ""}" data-account-row="${adminEsc(row.id)}" tabindex="0">
              <td>
                <div class="admin-account-id-cell">
                  <button class="admin-account-chevron" type="button" aria-label="${isOpen ? "Collapse" : "Expand"} account details" aria-expanded="${isOpen}">
                    <i class="ri-arrow-down-s-line"></i>
                  </button>
                  <strong>${adminEsc(row.full_name || "-")}</strong>
                </div>
              </td>
              <td>${adminEsc(adminRoleLabel(row.role))}</td>
              <td><span class="admin-activity-status ${adminStatusClass(row.activity_status)}">${adminEsc(row.activity_status || "Offline")}</span></td>
            </tr>
            <tr class="admin-account-detail-row ${isOpen ? "show" : ""}">
              <td colspan="3">
                <div class="admin-account-detail-card">
                  <table class="admin-account-detail-table">
                    <tbody>
                      <tr>
                        <th>User ID</th>
                        <td>${adminEsc(row.id_no || row.id)}</td>
                        <th>Email</th>
                        <td>${adminEsc(row.email || "—")}</td>
                      </tr>
                      <tr>
                        <th>Last Active</th>
                        <td>${adminEsc(adminFormatDateTime(row.last_active))}</td>
                        <th>Current Page</th>
                        <td>${adminEsc(currentPage)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  host.querySelectorAll("[data-account-row]").forEach(rowEl => {
    const toggle = () => {
      const id = rowEl.dataset.accountRow;
      adminExpandedAccountId = String(adminExpandedAccountId) === String(id) ? null : id;
      renderAdminAccounts();
    };
    rowEl.addEventListener("click", toggle);
    rowEl.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });
}

function loadAdminUserRequests() {
  mainContent.innerHTML = `
    <div class="admin-page admin-requests-page">
      <div class="admin-header">
        <div class="admin-header-title">
          <div class="admin-header-icon"><i class="ri-inbox-archive-line"></i></div>
          <div>
            <h2>User Requests</h2>
            <p>Review user-submitted requests grouped by role.</p>
          </div>
        </div>
      </div>
      <div class="admin-panel admin-monitor-panel">
        <div class="admin-staff-toolbar">
          <h3>Requests</h3>
          <div class="admin-staff-filters">
            <input id="adminRequestSearch" type="search" placeholder="Search requests..." value="${adminEsc(adminRequestSearch)}">
            <select id="adminRequestRole">
              <option value="all" ${adminRequestRole === "all" ? "selected" : ""}>All Roles</option>
              <option value="noc" ${adminRequestRole === "noc" ? "selected" : ""}>NOC</option>
              <option value="finance" ${adminRequestRole === "finance" ? "selected" : ""}>Finance</option>
              <option value="admin" ${adminRequestRole === "admin" ? "selected" : ""}>Admin</option>
              <option value="bidder" ${adminRequestRole === "bidder" ? "selected" : ""}>Bidder</option>
            </select>
            <select id="adminRequestStatus">
              <option value="all" ${adminRequestStatus === "all" ? "selected" : ""}>All Status</option>
              <option value="pending" ${adminRequestStatus === "pending" ? "selected" : ""}>Pending</option>
              <option value="approved" ${adminRequestStatus === "approved" ? "selected" : ""}>Approved</option>
              <option value="rejected" ${adminRequestStatus === "rejected" ? "selected" : ""}>Rejected</option>
              <option value="cancelled" ${adminRequestStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </div>
        </div>
        <div id="adminRequestsHost" class="admin-table-host"><div class="admin-empty"><i class="ri-loader-4-line spin"></i> Loading requests...</div></div>
      </div>
    </div>
  `;
  document.getElementById("adminRequestSearch")?.addEventListener("input", event => {
    adminRequestSearch = event.target.value.trim();
    clearTimeout(window.__adminRequestSearchTimer);
    window.__adminRequestSearchTimer = setTimeout(fetchAdminRequests, 220);
  });
  document.getElementById("adminRequestRole")?.addEventListener("change", event => {
    adminRequestRole = event.target.value;
    fetchAdminRequests();
  });
  document.getElementById("adminRequestStatus")?.addEventListener("change", event => {
    adminRequestStatus = event.target.value;
    fetchAdminRequests();
  });
  fetchAdminRequests();
}

async function fetchAdminRequests() {
  const host = document.getElementById("adminRequestsHost");
  if (!host) return;
  const params = new URLSearchParams();
  if (adminRequestSearch) params.set("search", adminRequestSearch);
  if (adminRequestRole !== "all") params.set("role", adminRequestRole);
  if (adminRequestStatus !== "all") params.set("status", adminRequestStatus);
  try {
    const res = await fetch(`/api/admin/user-requests?${params.toString()}`, { headers: adminHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to load requests.");
    adminRequests = Array.isArray(data) ? data.filter(row => !adminIsOwnRequestRow(row)) : [];
    renderAdminRequests();
  } catch (err) {
    host.innerHTML = `<div class="admin-empty"><i class="ri-error-warning-line"></i> ${adminEsc(err.message || "Failed to load requests.")}</div>`;
  }
}

function renderAdminRequests() {
  const host = document.getElementById("adminRequestsHost");
  if (!host) return;
  const visibleRequests = adminRequests.filter(row => !adminIsOwnRequestRow(row));
  if (!visibleRequests.length) {
    host.innerHTML = `<div class="admin-empty"><i class="ri-inbox-line"></i> No user requests found.</div>`;
    return;
  }
  const groups = visibleRequests.reduce((acc, row) => {
    const label = adminRequestGroupLabel(row.role);
    (acc[label] ||= []).push(row);
    return acc;
  }, {});
  host.innerHTML = Object.entries(groups).map(([label, rows]) => `
    <div class="admin-request-group">
      <div class="admin-request-group-title">${adminEsc(label)} <span>${rows.length}</span></div>
      <div class="admin-staff-table-wrap admin-monitor-table-wrap">
        <table class="admin-staff-table admin-monitor-table">
          <thead>
            <tr>
              <th>Employee/User Name</th>
              <th>Role</th>
              <th>Request Type</th>
              <th>Status</th>
              <th>Approved/Reviewed By</th>
              <th>Status Update</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>
                  <button class="admin-request-name-btn" type="button" data-request-row="${adminEsc(row.request_key)}:${row.id}">
                    <span>${adminEsc(row.full_name || "-")}</span>
                    <small>${adminEsc(row.email || "")}</small>
                  </button>
                </td>
                <td>${adminEsc(adminRoleLabel(row.role))}</td>
                <td>${adminEsc(row.request_type || "-")}</td>
                <td><span class="admin-request-status ${adminRequestStatusClass(row.status)}">${adminEsc(row.status || "Pending")}</span></td>
                <td>${adminEsc(row.handled_by || "—")}</td>
                <td>
                  <div class="admin-row-actions">
                    <select class="admin-status-select" data-request-status="${adminEsc(row.request_key)}:${row.id}">
                      ${["Pending", "Approved", "Rejected", "Cancelled"].map(status => `<option value="${status}" ${String(row.status).toLowerCase() === status.toLowerCase() ? "selected" : ""}>${status}</option>`).join("")}
                    </select>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `).join("");
  host.querySelectorAll("[data-request-row]").forEach(btn => {
    const openDetails = () => {
      const [type, id] = btn.dataset.requestRow.split(":");
      showAdminRequestDetails(type, id);
    };
    btn.addEventListener("click", openDetails);
  });
  host.querySelectorAll("[data-request-status]").forEach(select => {
    select.addEventListener("click", event => event.stopPropagation());
    select.addEventListener("change", event => {
      event.stopPropagation();
      updateAdminRequestStatus(select.dataset.requestStatus, select.value);
    });
  });
}

async function updateAdminRequestStatus(key, status) {
  const [type, id] = key.split(":");
  try {
    const res = await fetch(`/api/admin/user-requests/${type}/${id}/status`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({
        status,
        handledById: adminUser?.id || null,
        handledByName: adminUser?.full_name || adminUser?.name || ""
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to update request status.");
    fetchAdminRequests();
  } catch (err) {
    alert(err.message || "Failed to update request status.");
    fetchAdminRequests();
  }
}

async function showAdminRequestDetails(type, id) {
  try {
    const res = await fetch(`/api/admin/user-requests/${type}/${id}`, { headers: adminHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Unable to load request details.");
    showAdminRequestDetailsModal(data);
  } catch (err) {
    const fallback = adminRequests.find(row => row.request_key === type && String(row.id) === String(id));
    if (fallback) {
      showAdminRequestDetailsModal(fallback);
      return;
    }
    alert(err.message || "Unable to load request details.");
    console.error("Unable to load request details.", err);
  }
}

function showAdminRequestDetailsModal(request) {
  document.getElementById("adminInfoModal")?.remove();
  const requestKey = String(request.request_key || "").toLowerCase();
  const dateRequested = adminRequestDateRequested(request);
  const reviewedBy = request.handled_by || request.handled_by_name || "�";
  const reviewedRole = request.handled_by_role || "Admin";
  const fields = adminRequestFieldConfig(requestKey);
  const files = adminRequestFileItems(request);
  const timeline = adminRequestTimeline(request);
  const statusKey = String(request.status || "Pending").toLowerCase();
  const noteSource = request.remarks || request.summary || request.justification || request.reason || request.purpose || "";
  const configuredKeys = new Set(fields.map(([, key]) => key));
  const hiddenKeys = new Set([
    "id", "requested_by", "employee_id", "handled_by_id", "handled_by_name", "handled_by",
    "full_name", "email", "role", "request_key", "request_type", "request_id", "status",
    "handled_at", "created_at", "updated_at", "submitted_at", "request_date", "requested_at",
    "attachment", "attachment_name", "receipt_path", "receipt_name", "supporting_file",
    "supporting_file_name", "proof_of_return", "proof_of_return_name"
  ]);
  const extraRows = Object.entries(request)
    .filter(([key, value]) => !hiddenKeys.has(key) && !configuredKeys.has(key) && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => adminRenderRequestField(adminHumanizeKey(key), key, value));
  const requesterName = request.full_name || "Requester";
  const requesterRole = adminRoleLabel(request.role);
  const requestTitle = adminEsc(request.request_type || "Request Details");
  const requestId = adminEsc(request.request_id || `${request.request_key}-${request.id}`);
  const requestStatusClass = adminRequestStatusClass(request.status);
  const statusLabel = adminEsc(request.status || "Pending");
  const reviewedInitials = String(reviewedBy || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase() || "JD";
  const contactReason = statusKey === "rejected"
    ? "The request needs more details or a stronger supporting attachment."
    : "You can contact the requester for more details or supporting documents.";

  const detailModal = document.createElement("div");
  detailModal.className = "admin-info-modal admin-request-view-modal";
  detailModal.id = "adminInfoModal";
  detailModal.innerHTML = `
    <div class="admin-request-view-shell">
      <div class="admin-request-view-head">
        <div class="admin-request-view-head-copy">
          <h3>${requestTitle}</h3>
          <p>Request by ${adminEsc(requesterName)} &bull; ${adminEsc(requesterRole)}</p>
        </div>
        <div class="admin-request-view-head-actions">
          <span class="admin-request-status ${requestStatusClass}">${statusLabel}</span>
          <button type="button" class="admin-request-close-btn" aria-label="Close"><i class="ri-close-line"></i></button>
        </div>
      </div>

      <div class="admin-request-summary-strip">
        <div class="admin-request-summary-card">
          <span>Request ID</span>
          <strong>${requestId}</strong>
        </div>
        <div class="admin-request-summary-card">
          <span>Status</span>
          <strong><span class="admin-request-status ${requestStatusClass}">${statusLabel}</span></strong>
        </div>
        <div class="admin-request-summary-card">
          <span>Date Requested</span>
          <strong>${adminEsc(adminFormatDateTime(dateRequested))}</strong>
        </div>
        <div class="admin-request-summary-card">
          <span>Reviewed/Decided By</span>
          <strong>
            <span class="admin-request-summary-person">
              <b>${adminEsc(reviewedBy)}</b>
              <small>${adminEsc(reviewedRole)}</small>
            </span>
          </strong>
        </div>
        <div class="admin-request-summary-card">
          <span>Decided Date</span>
          <strong>${adminEsc(adminFormatDateTime(request.handled_at))}</strong>
        </div>
      </div>

      <div class="admin-request-view-body">
        <div class="admin-request-view-main">
          <section class="admin-request-panel">
            <div class="admin-request-panel-head">
              <i class="ri-file-list-3-line"></i>
              <h4>Submitted Request Form</h4>
            </div>
            <div class="admin-request-form-grid">
              ${fields.map(([label, key]) => adminRenderRequestField(label, key, request[key])).join("")}
              ${extraRows.join("")}
              ${noteSource ? `
                <div class="admin-request-summary-box">
                  <span>Summary</span>
                  <strong>${adminEsc(noteSource)}</strong>
                </div>
              ` : ""}
            </div>
          </section>

          <section class="admin-request-panel">
            <div class="admin-request-panel-head">
              <i class="ri-attachment-2"></i>
              <h4>Attachments</h4>
            </div>
            <div class="admin-request-files-grid">
              ${files.length ? files.map(adminRenderRequestFile).join("") : `<div class="admin-request-no-file">No uploaded file attached.</div>`}
            </div>
          </section>
        </div>

        <aside class="admin-request-view-side">
          <section class="admin-request-panel admin-request-timeline-panel">
            <div class="admin-request-panel-head">
              <i class="ri-time-line"></i>
              <h4>Request Timeline</h4>
            </div>
            <div class="admin-request-timeline">
              ${timeline.map(adminRenderTimelineItem).join("")}
            </div>
            ${["approved", "rejected"].includes(statusKey) ? `
              <section class="admin-request-decision-note ${statusKey}">
                <strong>${statusKey === "approved" ? "Approval Note" : "Rejection Note"}</strong>
                <p>${adminEsc(noteSource || (statusKey === "approved" ? "Request has been approved." : "Request has been rejected."))}</p>
              </section>
            ` : ""}
          </section>

          <section class="admin-request-contact-card">
            <h4>Need more information?</h4>
            <p>${adminEsc(contactReason)}</p>
            <button type="button" class="admin-request-contact-btn">
              <i class="ri-user-3-line"></i> Contact Requester
            </button>
          </section>
        </aside>
      </div>
    </div>
  `;

  detailModal.querySelector(".admin-request-close-btn")?.addEventListener("click", () => detailModal.remove());
  detailModal.addEventListener("click", event => { if (event.target === detailModal) detailModal.remove(); });
  detailModal.querySelector(".admin-request-contact-btn")?.addEventListener("click", () => {
    showToast?.(`Opening contact options for ${requesterName}.`, "success");
  });
  document.body.appendChild(detailModal);
}

function showAdminInfoModal(title, rows) {
  document.getElementById("adminInfoModal")?.remove();
  const modal = document.createElement("div");
  modal.className = "admin-info-modal";
  modal.id = "adminInfoModal";
  modal.innerHTML = `
    <div class="admin-info-card">
      <div class="admin-info-head">
        <h3>${adminEsc(title)}</h3>
        <button type="button" aria-label="Close"><i class="ri-close-line"></i></button>
      </div>
      <div class="admin-info-body">
        ${rows.map(([label, value]) => `
          <div class="admin-info-row"><span>${adminEsc(label)}</span><strong>${adminEsc(value || "-")}</strong></div>
        `).join("")}
      </div>
    </div>
  `;
  modal.querySelector("button")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", event => { if (event.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

window.ADMIN_PAGE_DEFS = {
  adminDashboard: { label: "Admin Dashboard", icon: "ri-shield-user-line", loader: () => loadAdminDashboard() },
  staffIds: { label: "Staff ID Management", icon: "ri-id-card-line", loader: () => loadAdminStaffIds() },
  accountsMonitoring: { label: "Accounts Monitoring", icon: "ri-pulse-line", loader: () => loadAdminAccountsMonitoring() },
  userRequests: { label: "User Requests", icon: "ri-inbox-archive-line", loader: () => loadAdminUserRequests() },
  nocDashboard: { label: "NOC Dashboard", icon: "ri-dashboard-line", loader: () => { window.location.href = adminModuleUrl("/modules/noc/noc-dashboard.html", "admin"); } },
  financeDashboard: { label: "Finance Dashboard", icon: "ri-bank-card-line", loader: () => { window.location.href = adminModuleUrl("/modules/finance/finance-dashboard.html", "admin"); } },
  bidderDashboard: { label: "Bidder Dashboard", icon: "ri-auction-line", loader: () => { window.location.href = adminModuleUrl("/modules/bidder/bidder-dashboard.html", "admin"); } },
  settings: { label: "Settings", icon: "ri-settings-3-line", loader: () => loadAdminSettings() },
  logout: { label: "Log Out", icon: "ri-logout-circle-r-line", loader: () => showAdminLogoutModal() }
};

window.ADMIN_SIDEBAR_SECTIONS = [
  { label: "Main", pages: ["adminDashboard", "staffIds", "accountsMonitoring", "userRequests"] },
  { label: "Modules", pages: ["nocDashboard", "financeDashboard"] },
  { label: "System", pages: ["settings", "logout"] }
];

window.ADMIN_START_PAGE = "adminDashboard";

const ADMIN_VIEW_BY_PAGE = {
  adminDashboard: "admin-dashboard",
  staffIds: "staff-ids",
  accountsMonitoring: "accounts-monitoring",
  userRequests: "user-requests",
  nocDashboard: "noc-dashboard",
  nocMap: "noc-map",
  nocTerminals: "noc-terminals",
  nocProblematicSites: "noc-problematic-sites",
  nocAcceptance: "noc-acceptance",
  nocTicket: "noc-ticket",
  nocReports: "noc-reports",
  nocFiles: "noc-files",
  nocInventory: "noc-inventory",
  financeDashboard: "finance-dashboard",
  companyIncome: "finance-company-income",
  companyExpenses: "finance-company-expenses",
  projectExpenses: "finance-project-expenses",
  collections: "finance-collections",
  financeInventory: "finance-inventory",
  financeFiles: "finance-files",
  employee: "finance-employee",
  financialReport: "finance-financial-report",
  bidderDashboard: "bidder-dashboard",
  settings: "settings",
  logout: "logout"
};
const ADMIN_PAGE_BY_VIEW = Object.fromEntries(Object.entries(ADMIN_VIEW_BY_PAGE).map(([page, view]) => [view, page]));

function getAdminVisiblePages() {
  const pages = window.ADMIN_SIDEBAR_SECTIONS.flatMap(section => [
    ...(section.pages || []),
    ...(section.groups || []).flatMap(group => group.pages || [])
  ]);
  const hideSystem = new URLSearchParams(window.location.search).get("hideSystem") === "1";
  return pages.filter(pageKey => {
    if (adminIsExecutive() && pageKey === "adminDashboard") return false;
    if (adminIsExecutive() && (pageKey === "nocDashboard" || pageKey === "financeDashboard")) return false;
    if (hideSystem && (pageKey === "settings" || pageKey === "logout")) return false;
    return true;
  });
}

function getAdminHomePageKey() {
  const requestedPage = new URLSearchParams(window.location.search).get("page");
  const hideSystem = new URLSearchParams(window.location.search).get("hideSystem") === "1";
  if (requestedPage && window.ADMIN_PAGE_DEFS[requestedPage]) {
    if (hideSystem && (requestedPage === "settings" || requestedPage === "logout")) {
      return getAdminVisiblePages()[0];
    }
    if (adminIsExecutive() && (requestedPage === "adminDashboard" || requestedPage === "nocDashboard" || requestedPage === "financeDashboard")) {
      return getAdminVisiblePages()[0];
    }
    return requestedPage;
  }
  if (requestedPage && ADMIN_PAGE_BY_VIEW[requestedPage]) return ADMIN_PAGE_BY_VIEW[requestedPage];
  return window.ADMIN_START_PAGE || getAdminVisiblePages()[0];
}

function setAdminActivePage(pageKey) {
  const viewName = ADMIN_VIEW_BY_PAGE[pageKey] || pageKey;
  document.querySelectorAll(".admin-menu-item[data-admin-view]").forEach(item => {
    item.classList.toggle("active", item.dataset.adminView === viewName);
  });
  document.querySelectorAll(".admin-dropdown").forEach(dropdown => {
    const hasActivePage = !!dropdown.querySelector(`.admin-menu-item[data-admin-view="${viewName}"]`);
    dropdown.classList.toggle("contains-active", hasActivePage);
    if (hasActivePage) dropdown.classList.add("expanded");
    dropdown.querySelector(".admin-dropdown-toggle")?.setAttribute(
      "aria-expanded",
      dropdown.classList.contains("expanded") ? "true" : "false"
    );
  });
}

function openAdminPage(pageKey) {
  if (adminIsExecutive() && pageKey === "adminDashboard") {
    pageKey = getAdminVisiblePages()[0] || "staffIds";
  }
  const page = window.ADMIN_PAGE_DEFS[pageKey];
  if (!page) return;
  if (pageKey !== "settings") adminSetSettingsMode(false);
  if (pageKey !== "logout") setAdminActivePage(pageKey);
  syncExecutiveAdminAccess(pageKey);
  page.loader();
  if (pageKey !== "logout") {
    const url = new URL(window.location.href);
    url.searchParams.set("page", ADMIN_VIEW_BY_PAGE[pageKey] || pageKey);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function openAdminView(viewName) {
  openAdminPage(ADMIN_PAGE_BY_VIEW[viewName] || viewName);
}

function toggleAdminDropdown(key) {
  const dropdown = document.querySelector(`.admin-dropdown[data-dropdown="${key}"]`);
  if (!dropdown) return;
  dropdown.classList.toggle("expanded");
  dropdown.querySelector(".admin-dropdown-toggle")?.setAttribute(
    "aria-expanded",
    dropdown.classList.contains("expanded") ? "true" : "false"
  );
}

function renderAdminSidebar() {
  const nav = document.getElementById("adminSidebarNav");
  if (!nav) return;
  const pageDefs = window.ADMIN_PAGE_DEFS;
  const visible = new Set(getAdminVisiblePages());
  const firstPage = getAdminHomePageKey();

  let html = "";
  window.ADMIN_SIDEBAR_SECTIONS.forEach((section, sectionIndex) => {
    const pages = (section.pages || []).filter(pageKey => visible.has(pageKey) && pageDefs[pageKey]);
    const groups = (section.groups || [])
      .map(group => ({
        ...group,
        pages: (group.pages || []).filter(pageKey => visible.has(pageKey) && pageDefs[pageKey])
      }))
      .filter(group => group.pages.length);

    if (!pages.length && !groups.length) return;
    if (sectionIndex > 0) html += `<div class="admin-menu-section-divider" role="separator"></div>`;
    html += `<div class="admin-menu-section-label">${adminEsc(section.label)}</div>`;

    pages.forEach(pageKey => {
      const page = pageDefs[pageKey];
      const viewName = ADMIN_VIEW_BY_PAGE[pageKey] || pageKey;
      html += `
        <button type="button" class="admin-menu-item ${pageKey === firstPage ? "active" : ""}" data-admin-view="${viewName}">
          <i class="${page.icon}"></i><span>${adminEsc(page.label)}</span>
        </button>
      `;
    });

    groups.forEach(group => {
      const expanded = group.pages.includes(firstPage);
      html += `
        <div class="admin-dropdown ${expanded ? "expanded" : ""}" data-dropdown="${adminEsc(group.key)}">
          <button type="button" class="admin-dropdown-toggle" data-dropdown-toggle="${adminEsc(group.key)}" aria-expanded="${expanded ? "true" : "false"}">
            <i class="${group.icon || "ri-folder-line"}"></i><span>${adminEsc(group.label)}</span><i class="ri-arrow-down-s-line admin-dropdown-arrow"></i>
          </button>
          <div class="admin-dropdown-list">
            ${group.pages.map(pageKey => {
              const page = pageDefs[pageKey];
              const viewName = ADMIN_VIEW_BY_PAGE[pageKey] || pageKey;
              return `
                <button type="button" class="admin-menu-item ${pageKey === firstPage ? "active" : ""}" data-admin-view="${viewName}">
                  <i class="${page.icon}"></i><span>${adminEsc(page.label)}</span>
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `;
    });
  });

  nav.innerHTML = html;
  nav.querySelectorAll("[data-dropdown-toggle]").forEach(toggle => {
    toggle.addEventListener("click", () => toggleAdminDropdown(toggle.dataset.dropdownToggle));
  });
  nav.querySelectorAll(".admin-menu-item[data-admin-view]").forEach(item => {
    item.addEventListener("click", () => openAdminView(item.dataset.adminView));
  });
}

function renderAdminProfile() {
  const profile = document.getElementById("adminSidebarProfile");
  if (!profile) return;
  const displayName = adminUser.full_name || adminUser.email || "Admin";
  const displayRole = adminUser.role || "Admin";
  const initials = displayName.split(" ").filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "A";

  profile.innerHTML = `
    <div class="admin-profile-inner" title="${adminEsc(displayName)} - ${adminEsc(displayRole)}">
      <div class="admin-avatar">
        ${adminUser.photo ? `<img src="${adminEsc(adminUser.photo)}" alt="${adminEsc(displayName)}">` : adminEsc(initials)}
      </div>
      <div class="admin-profile-text">
        <div class="admin-profile-name">${adminEsc(displayName)}</div>
        <div class="admin-profile-role">${adminEsc(displayRole)}</div>
      </div>
      <i class="ri-more-2-fill admin-profile-icon"></i>
    </div>
  `;
  profile.querySelector(".admin-profile-inner")?.addEventListener("click", () => openAdminPage("settings"));
}

function showAdminLogoutModal() {
  if (document.getElementById("logoutModal")) return;
  const modal = document.createElement("div");
  modal.id = "logoutModal";
  modal.className = "logout-modal-overlay";
  modal.innerHTML = `
    <div class="logout-modal-box">
      <div class="logout-modal-icon-wrap">
        <div class="logout-modal-icon-ring">
          <i class="ri-logout-circle-r-line"></i>
        </div>
      </div>
      <div class="logout-modal-body">
        <h2 class="logout-modal-title">Leaving so soon?</h2>
        <p class="logout-modal-sub">You're about to sign out of your session.<br>Any unsaved changes will be lost.</p>
        <div class="logout-user-card">
          <div class="logout-user-avatar"><i class="ri-user-3-line"></i></div>
          <div class="logout-user-info">
            <span class="logout-user-name">${adminEsc(adminUser.full_name || "Admin User")}</span>
            <span class="logout-user-role">${adminEsc(adminUser.role || "Admin")}</span>
          </div>
          <span class="logout-user-badge"><i class="ri-checkbox-circle-fill"></i> Active</span>
        </div>
        <div class="logout-actions">
          <button class="logout-cancel-btn" id="logoutCancel">
            <i class="ri-arrow-left-line"></i> Stay Logged In
          </button>
          <button class="logout-confirm-btn" id="logoutConfirm">
            <i class="ri-logout-circle-r-line"></i> Yes, Log Out
          </button>
        </div>
        <p class="logout-hint"><i class="ri-shield-keyhole-line"></i> Your session data will be cleared for security.</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("open"));

  const close = () => {
    modal.classList.remove("open");
    modal.classList.add("closing");
    setTimeout(() => modal.remove(), 300);
  };

  document.getElementById("logoutCancel").onclick = close;
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.getElementById("logoutConfirm").onclick = () => {
    const btn = document.getElementById("logoutConfirm");
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Signing out...';
    setTimeout(() => {
      localStorage.removeItem("user");
      window.location.href = "/index.html";
    }, 900);
  };
}

function syncAdminSidebar() {
  const sidebar = document.getElementById("adminSidebar");
  const isCollapsed = sidebar?.classList.contains("collapsed");
  document.body.classList.toggle("admin-sidebar-collapsed", !!isCollapsed);
  localStorage.setItem("adminSidebarCollapsed", isCollapsed ? "1" : "0");
}

function bootAdminDashboard() {
  const sidebar = document.getElementById("adminSidebar");
  if (sidebar && localStorage.getItem("adminSidebarCollapsed") === "1") sidebar.classList.add("collapsed");
  syncAdminSidebar();
  syncExecutiveAdminAccess(getAdminHomePageKey());
  document.getElementById("adminToggleSidebar")?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
    syncAdminSidebar();
  });
  renderAdminSidebar();
  renderAdminProfile();
  openAdminPage(getAdminHomePageKey());
}

window.addEventListener("DOMContentLoaded", bootAdminDashboard);
