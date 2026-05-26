/* ================= SHARED SESSION ================= */

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    localStorage.removeItem("user");
    return {};
  }
}

const user = readStoredUser();

if (!user.id && !user.role) {
  window.location.replace("/index.html");
}

const dashboardShell = String(window.__dashboardShell || "").trim().toLowerCase();
const roleKey = String(user?.role || "").trim().toLowerCase();

function getDashboardPathForRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const path = normalizedRole === "admin"
    ? "/modules/admin/admin-dashboard.html"
    : normalizedRole === "executive"
      ? "/modules/executive/executive-dashboard.html"
    : normalizedRole === "finance"
      ? "/modules/finance/finance-dashboard.html"
      : normalizedRole === "bidder"
        ? "/modules/bidder/bidder-dashboard.html"
      : "/modules/noc/noc-dashboard.html";
  return window.location.pathname === "/settings" ? `${path}?page=settings` : path;
}

if (user && dashboardShell) {
  const allowedShellsByRole = {
    admin: ["admin", "executive", "noc", "finance", "bidder"],
    executive: ["executive", "admin", "noc", "finance", "bidder"],
    finance: ["finance"],
    noc: ["noc"],
    bidder: ["bidder"],
  };
  const allowedShells = allowedShellsByRole[roleKey] || ["noc"];
  if (!allowedShells.includes(dashboardShell)) {
    window.location.replace(getDashboardPathForRole(user.role));
  }
}

const mainContent = document.getElementById("mainContent");
const sidebarMenu = document.getElementById("sidebarMenu");
const activeShellKey = dashboardShell || (roleKey === "admin" ? "admin" : roleKey === "finance" ? "finance" : roleKey === "bidder" ? "bidder" : "noc");
let currentPage = 1;
const rowsPerPage = 7;
let leafletMap = null;

function dashboardDataChanged() {
  if (document.getElementById("dashCards") && typeof fetchDashboardStats === "function") {
    fetchDashboardStats(false);
  }
}

document.body.classList.toggle("admin-module", activeShellKey === "admin");
document.body.classList.toggle("executive-module", activeShellKey === "executive");
document.body.classList.toggle("executive-role", activeShellKey === "executive");
document.body.classList.toggle("finance-role", activeShellKey === "finance");
document.body.classList.toggle("noc-module", activeShellKey === "noc");
document.body.classList.toggle("finance-module", activeShellKey === "finance");
document.body.classList.toggle("bidder-module", activeShellKey === "bidder");

function renderExecutiveReturnButton() {
  if (roleKey !== "executive" || activeShellKey === "executive") return;
  if (document.getElementById("execReturnButton")) return;

  const link = document.createElement("a");
  link.id = "execReturnButton";
  link.href = "/modules/executive/executive-dashboard.html";
  link.innerHTML = '<i class="ri-arrow-left-line"></i><span>Back to Executive</span>';
  link.style.cssText = [
    "position:fixed",
    "top:18px",
    "right:18px",
    "z-index:1200",
    "display:inline-flex",
    "align-items:center",
    "gap:8px",
    "padding:10px 14px",
    "border-radius:999px",
    "background:linear-gradient(135deg,#10325c 0%,#1f4d87 100%)",
    "color:#fff",
    "font-weight:800",
    "font-size:13px",
    "text-decoration:none",
    "box-shadow:0 14px 30px rgba(15,23,42,.18)"
  ].join(";");
  document.body.appendChild(link);
}

renderExecutiveReturnButton();

function sendUserActivity() {
  if (!user?.id) return;
  const currentPage = `${activeShellKey || "dashboard"}:${window.location.pathname}${window.location.search}`;
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Role": user.role || "" },
    body: JSON.stringify({ user_id: user.id, current_page: currentPage })
  }).catch(() => {});
}

sendUserActivity();
window.addEventListener("focus", sendUserActivity);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) sendUserActivity();
});
setInterval(sendUserActivity, 60000);
