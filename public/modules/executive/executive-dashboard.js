/* ================= EXECUTIVE MODULE ================= */

const executiveUser = (() => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); }
  catch { return {}; }
})();

const execMainContent = () => document.getElementById("mainContent");
const execState = {
  overview: null,
  loading: null,
  exportMenuOpen: false,
};

window.EXECUTIVE_START_PAGE = /executive-reports\.html$/i.test(window.location.pathname) || /\/executive\/reports\/?$/i.test(window.location.pathname)
  ? "reports"
  : "dashboard";

function execHeader(title, subtitle, actions = "") {
  return `
    <div class="exec-hero">
      <div class="exec-hero-top">
        <div style="min-width:0;flex:1 1 auto;">
          <div class="exec-pill"><i class="ri-shield-star-line"></i> Executive View</div>
          <h1 class="exec-hero-title">${execEscape(title)}</h1>
          <p class="exec-hero-sub">${execEscape(subtitle)}</p>
          <div class="exec-hero-meta">
            <span class="exec-pill"><i class="ri-time-line"></i> ${execFormatTime(new Date())}</span>
            <span class="exec-pill"><i class="ri-user-3-line"></i> ${execEscape(executiveUser.full_name || executiveUser.email || "Executive")}</span>
            <span class="exec-pill"><i class="ri-eye-line"></i> View only</span>
          </div>
        </div>
        <div class="exec-actions">${actions}</div>
      </div>
    </div>
  `;
}

function execSummaryCard({ label, value, meta, icon, tone = "info", trend = "" }) {
  const toneMap = {
    info: "linear-gradient(135deg,#1f4d87 0%,#3b82f6 100%)",
    success: "linear-gradient(135deg,#0f766e 0%,#14b8a6 100%)",
    warning: "linear-gradient(135deg,#a16207 0%,#f59e0b 100%)",
    danger: "linear-gradient(135deg,#b91c1c 0%,#ef4444 100%)",
    neutral: "linear-gradient(135deg,#334155 0%,#64748b 100%)",
  };
  const trendClass = /^(up|positive|success)/i.test(String(trend)) ? "up" : /^(down|negative|danger)/i.test(String(trend)) ? "down" : "";
  const pageKey = execCardPageKey(label);
  const inner = `
      <div class="exec-kpi-top">
        <div class="exec-kpi-icon" style="background:${toneMap[tone] || toneMap.info};">
          <i class="${icon}"></i>
        </div>
        ${meta ? `<span class="exec-badge ${tone === "danger" ? "critical" : tone === "warning" ? "warning" : tone === "success" ? "success" : "info"}">${execEscape(meta)}</span>` : ""}
      </div>
      <div class="exec-kpi-label">${execEscape(label)}</div>
      <div class="exec-kpi-value">${value}</div>
      <div class="exec-kpi-meta">
        <span>${execEscape(meta || "Live reading")}</span>
        ${trend ? `<span class="exec-trend ${trendClass}"><i class="ri-${trendClass === "down" ? "arrow-down" : "arrow-up"}-s-line"></i> ${execEscape(trend)}</span>` : ""}
      </div>
  `;
  if (pageKey) {
    return `
      <button type="button" class="exec-kpi-card exec-kpi-card-link" title="${execEscape(label)}" aria-label="Open ${execEscape(label)}" onclick="openPage('${pageKey}')">
        ${inner}
      </button>
    `;
  }
  return `
    <article class="exec-kpi-card" title="${execEscape(label)}">
      ${inner}
    </article>
  `;
}

function execPanel(title, subtitle, body, action = "") {
  return `
    <section class="exec-panel">
      <div class="exec-panel-head">
        <div>
          <div class="exec-panel-title"><i class="ri-pulse-line"></i><span>${execEscape(title)}</span></div>
          ${subtitle ? `<div class="exec-panel-sub">${execEscape(subtitle)}</div>` : ""}
        </div>
        ${action ? `<div class="exec-toolbar">${action}</div>` : ""}
      </div>
      <div class="exec-panel-body">${body}</div>
    </section>
  `;
}

function execDetails(title, subtitle, body, open = false) {
  return `
    <details class="exec-detail-block"${open ? " open" : ""}>
      <summary class="exec-detail-summary">
        <span>
          <strong>${execEscape(title)}</strong>
          ${subtitle ? `<small>${execEscape(subtitle)}</small>` : ""}
        </span>
        <span class="exec-detail-toggle"><i class="ri-arrow-down-s-line"></i></span>
      </summary>
      <div class="exec-detail-body">${body}</div>
    </details>
  `;
}

function execLoading(message = "Loading executive overview...") {
  execMainContent().innerHTML = `
    <div class="exec-page">
      <div class="exec-empty">
        <div class="exec-empty-box">
          <i class="ri-loader-4-line spin"></i>
          <h3>${execEscape(message)}</h3>
          <p>The page is getting the latest summary for you.</p>
        </div>
      </div>
    </div>
  `;
}

function execError(message) {
  execMainContent().innerHTML = `
    <div class="exec-page">
      <div class="exec-empty">
        <div class="exec-empty-box">
          <i class="ri-error-warning-line" style="color:var(--exec-danger)"></i>
          <h3>Unable to load executive dashboard</h3>
          <p>${execEscape(message || "Please check the server connection and try again.")}</p>
          <div style="margin-top:16px;">
            <button class="exec-btn primary" type="button" onclick="loadExecutiveDashboard(true)">
              <i class="ri-refresh-line"></i> Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function execHeaders() {
  return {
    "Content-Type": "application/json",
    "X-User-Id": String(executiveUser.id || ""),
    "X-User-Role": String(executiveUser.role || ""),
  };
}

async function fetchExecutiveOverview(force = false) {
  if (execState.overview && !force) return execState.overview;
  if (execState.loading && !force) return execState.loading;

  execState.loading = fetch("/api/executive/overview", { headers: execHeaders() })
    .then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load executive overview");
      execState.overview = payload;
      execState.loading = null;
      return payload;
    })
    .catch(err => {
      execState.loading = null;
      throw err;
    });

  return execState.loading;
}

function execEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function execCardPageKey(label) {
  const map = {
    "All Projects": "reports",
    "Ongoing Projects": "nocDashboard",
    "Open Bids": "bidderDashboard",
    "Approved Partners": "bidderDashboard",
    "Waiting for Approval": "userRequests",
    "Total Revenue": "financialReport",
    "Completion Rate": "reports",
    "Recent Activity": "inbox",
    "Income": "financialReport",
    "Company Costs": "financialReport",
    "Project Costs": "financialReport",
    "Collected Cash": "financialReport",
    "Outstanding Balance": "financialReport",
    "Net Income": "financialReport",
  };
  return map[String(label || "").trim()] || "";
}

function execNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function execMoney(value) {
  return "\u20b1" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function execPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function execFormatTime(dateLike) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date(dateLike));
  } catch {
    return "Now";
  }
}

function execFormatDate(dateLike) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(dateLike));
  } catch {
    return "-";
  }
}

function execEnsureScript(id, src) {
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

function execEnsureStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

async function ensureExecutiveNocModule() {
  if (window.loadUnifiedInbox && window.renderUnifiedInbox) {
    window.__executiveNocLoaded = true;
    return true;
  }
  if (window.__executiveNocLoaded) return true;
  if (window.__executiveNocLoading) return window.__executiveNocLoading;

  window.__executiveNocLoading = (async () => {
    execEnsureStylesheet("executive-noc-dashboard-css", "/modules/noc/noc-dashboard.css");
    const existing = document.getElementById("executive-noc-dashboard-js");
    if (existing && !(window.loadUnifiedInbox && window.renderUnifiedInbox)) {
      existing.remove();
    }
    await execEnsureScript("executive-noc-dashboard-js", `/modules/noc/noc-dashboard.js?v=${Date.now()}`);
    window.__executiveNocLoaded = true;
    return true;
  })().finally(() => {
    window.__executiveNocLoading = null;
  });

  return window.__executiveNocLoading;
}

function execRelativeTime(dateLike) {
  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return "Recently";
  const diff = Date.now() - dt.getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function execProgressColor(progress) {
  if (progress >= 80) return "#10b981";
  if (progress >= 50) return "#3b82f6";
  if (progress >= 25) return "#f59e0b";
  return "#ef4444";
}

function execSparkline(values, stroke = "#14b8a6", fill = "rgba(20,184,166,0.12)") {
  const safeValues = Array.isArray(values) && values.length ? values.map(v => Number(v || 0)) : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = Math.max(max - min, 1);
  const width = 360;
  const height = 120;
  const step = width / Math.max(safeValues.length - 1, 1);
  const points = safeValues.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 18) - 8;
    return [x.toFixed(1), y.toFixed(1)];
  });
  const line = points.map(point => point.join(",")).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const baseline = height - ((0 - min) / range) * (height - 18) - 8;
  return `
    <svg class="exec-chart" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="execSparkFill-${stroke.replace(/[^a-z0-9]/gi, "")}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${stroke}" stop-opacity="0.30"></stop>
          <stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <line x1="0" x2="${width}" y1="${baseline}" y2="${baseline}" stroke="rgba(148,163,184,0.20)" stroke-dasharray="4 6"></line>
      <polygon points="${area}" fill="url(#execSparkFill-${stroke.replace(/[^a-z0-9]/gi, "")})"></polygon>
      <polyline points="${line}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${points.map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="3.8" fill="${stroke}" opacity="${index === points.length - 1 ? 1 : 0.72}"></circle>`).join("")}
    </svg>
  `;
}

function execBarChart(items) {
  const max = Math.max(...items.map(item => Number(item.value || 0)), 1);
  return `
    <div class="exec-list" style="gap:12px;">
      ${items.map(item => {
        const value = Number(item.value || 0);
        const width = Math.max(6, Math.round((value / max) * 100));
        return `
          <div class="exec-list-item" style="padding:12px 12px 13px;">
            <div class="exec-list-top">
              <div class="exec-list-title">${execEscape(item.label)}</div>
              <div class="exec-muted" style="font-size:12px;font-weight:700;">${execEscape(item.valueLabel || execPercent(item.percent || width))}</div>
            </div>
            <div class="exec-progress"><span style="width:${width}%;background:${item.color || 'linear-gradient(90deg,#14b8a6,#3b82f6)'}"></span></div>
            <div class="exec-list-sub">${execEscape(item.detail || "")}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function execDonut(segments, centerTitle, centerValue) {
  const total = Math.max(segments.reduce((sum, item) => sum + Number(item.value || 0), 0), 1);
  let cursor = 0;
  const stops = segments.map(segment => {
    const start = cursor;
    const end = cursor + (Number(segment.value || 0) / total) * 360;
    cursor = end;
    return `${segment.color} ${start}deg ${end}deg`;
  }).join(", ");
  return `
    <div class="exec-donut-layout">
      <div style="display:grid;place-items:center;">
        <div style="
          width:220px;
          aspect-ratio:1;
          border-radius:50%;
          background: conic-gradient(${stops});
          position:relative;
          box-shadow: inset 0 0 0 1px rgba(15,23,42,0.04);
        ">
          <div style="
            position:absolute;
            inset:28px;
            border-radius:50%;
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            display:grid;
            place-items:center;
            text-align:center;
            padding:12px;
            box-shadow: inset 0 0 0 1px rgba(15,23,42,0.06);
          ">
            <div>
              <div class="exec-muted" style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">${execEscape(centerTitle)}</div>
              <div style="margin-top:8px;font-size:clamp(18px, 2.0vw, 22px);font-weight:900;line-height:1.05;letter-spacing:-.04em;color:var(--exec-text);max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${execEscape(centerValue)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="exec-list">
        ${segments.map(segment => `
          <div class="exec-list-item" style="padding:12px 14px;">
            <div class="exec-list-top">
              <div class="exec-list-title">
                <span class="exec-legend-dot" style="background:${segment.color};margin-right:8px;vertical-align:middle;"></span>
                ${execEscape(segment.label)}
              </div>
              <div class="exec-muted" style="font-size:12px;font-weight:800;">${execEscape(segment.valueLabel || execNumber(segment.value))}</div>
            </div>
            <div class="exec-list-sub">${execEscape(segment.detail || "")}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function execRecentActivityItem(row) {
  const tone = String(row.status || "info").toLowerCase();
  const badgeTone = /reject|fail|delay|critical|danger/.test(tone) ? "critical" : /pending|warning/.test(tone) ? "warning" : /done|approved|awarded|success|completed/.test(tone) ? "success" : "info";
  return `
    <div class="exec-list-item">
      <div class="exec-list-top">
        <div class="exec-list-title">${execEscape(row.title || "Activity")}</div>
        <span class="exec-badge ${badgeTone}">${execEscape(row.category || "Update")}</span>
      </div>
      <div class="exec-list-sub">${execEscape(row.detail || "-")}</div>
      <div class="exec-list-meta">
        <span><i class="ri-time-line"></i> ${execRelativeTime(row.event_at)}</span>
        <span><i class="ri-calendar-event-line"></i> ${execFormatDate(row.event_at)}</span>
      </div>
    </div>
  `;
}

function execRenderApprovalSummary(items) {
  return `
    <div class="exec-table-wrap">
      <table class="exec-table">
        <thead>
          <tr>
            <th>Approval Type</th>
            <th>Pending</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>
                <span class="exec-list-title" style="display:inline-flex;align-items:center;gap:8px;">
                  <i class="${item.icon}" style="font-size:16px;color:var(--exec-primary-2);"></i>
                  ${execEscape(item.label)}
                </span>
              </td>
              <td><span class="exec-badge ${Number(item.pending || 0) > 0 ? "warning" : "success"}">${execNumber(item.pending)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function execRenderNotifications(items) {
  return `
    <div class="exec-list">
      ${items.map(item => `
        <div class="exec-list-item">
          <div class="exec-list-top">
            <div class="exec-list-title">${execEscape(item.label)}</div>
            <span class="exec-badge ${item.tone || "info"}">${execEscape(item.tone || "info")}</span>
          </div>
          <div class="exec-list-sub">${execEscape(item.detail || "-")}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function execRenderTimeline(items) {
  return `
    <div class="exec-timeline">
      ${items.map(item => {
        const progress = Math.max(0, Math.min(100, Number(item.progress || 0)));
        return `
          <div class="exec-timeline-item">
            <div class="exec-timeline-dot"></div>
            <div class="exec-timeline-card">
              <div class="exec-timeline-title">
                <span>${execEscape(item.project_name || "Project")}</span>
                <span class="exec-badge info">${execPercent(progress)}</span>
              </div>
              <div class="exec-timeline-desc">
                ${execNumber(item.completed_sites)} completed sites, ${execNumber(item.ongoing_sites)} ongoing sites, ${execNumber(item.total_sites)} tracked sites.
              </div>
              <div class="exec-progress"><span style="width:${progress}%;background:${execProgressColor(progress)}"></span></div>
              <div class="exec-list-meta">
                <span><i class="ri-calendar-2-line"></i> Start: ${item.start_date ? execFormatDate(item.start_date) : "-"}</span>
                <span><i class="ri-calendar-check-line"></i> End: ${item.end_date ? execFormatDate(item.end_date) : "Ongoing"}</span>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function execRenderCriticalAlerts(items) {
  if (!items.length) {
    return `
      <div class="exec-list-item exec-alert-clear">
        <div class="exec-alert-clear-icon"><i class="ri-shield-check-line"></i></div>
        <div class="exec-list-title">Everything looks good</div>
        <div class="exec-list-sub">No urgent items at this time. The system is running normally.</div>
      </div>
    `;
  }
  return `
    <div class="exec-list">
      ${items.map(item => `
        <div class="exec-list-item">
          <div class="exec-list-top">
            <div class="exec-list-title">${execEscape(item.label)}</div>
            <span class="exec-badge ${item.tone || "warning"}">${execEscape(item.tone || "warning")}</span>
          </div>
          <div class="exec-list-sub">${execEscape(item.detail || "-")}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function execBuildKpis(data) {
  const summary = data.summary || {};
  return [
    { label: "All Projects", value: execNumber(summary.total_projects), meta: "Everything recorded", icon: "ri-folder-3-line", tone: "info", trend: "+2.4%" },
    { label: "Ongoing Projects", value: execNumber(summary.active_projects), meta: "Currently moving", icon: "ri-play-circle-line", tone: "success", trend: "+1.2%" },
    { label: "Open Bids", value: execNumber(summary.active_biddings), meta: "Bids still in review", icon: "ri-auction-line", tone: "warning", trend: "+8.7%" },
    { label: "Approved Partners", value: execNumber(summary.approved_bidders), meta: "Confirmed and active", icon: "ri-user-star-line", tone: "success", trend: "+3.1%" },
    { label: "Waiting for Approval", value: execNumber(summary.pending_approvals), meta: "Still waiting on action", icon: "ri-mail-unread-line", tone: "warning", trend: "-6.0%" },
    { label: "Total Revenue", value: execMoney(summary.revenue), meta: "Income after movement", icon: "ri-money-dollar-circle-line", tone: summary.revenue >= 0 ? "success" : "danger", trend: summary.revenue >= 0 ? "+5.9%" : "-4.8%" },
    { label: "Completion Rate", value: execPercent(summary.completion_rate), meta: "How much is done", icon: "ri-flag-2-line", tone: "info", trend: "+4.2%" },
    { label: "Recent Activity", value: execNumber(summary.system_activities), meta: "Last 24 hours", icon: "ri-pulse-line", tone: "neutral", trend: "+11.0%" },
  ];
}

function execTrendSeries(data) {
  const series = (data.analytics?.monthly_project_trends || []).slice(-12);
  return {
    labels: series.map(row => row.month_label),
    active: series.map(row => Number(row.active_projects || 0)),
    completed: series.map(row => Number(row.completed_projects || 0)),
    total: series.map(row => Number(row.total_projects || 0)),
  };
}

function execProjectTrendChart(data) {
  const trend = execTrendSeries(data);
  if (!trend.labels.length) {
    return `<div class="exec-list-item"><div class="exec-list-sub">No project trend data available yet.</div></div>`;
  }
  const labels = trend.labels.map(label => `<span style="flex:1;text-align:center;">${execEscape(label)}</span>`).join("");
  return `
    <div class="exec-chart-shell">
      ${execSparkline(trend.total, "#60a5fa", "rgba(96,165,250,0.14)")}
      <div class="exec-chart-legend">
        <span class="exec-legend-item"><span class="exec-legend-dot" style="background:#60a5fa"></span>Total projects</span>
        <span class="exec-legend-item"><span class="exec-legend-dot" style="background:#14b8a6"></span>Active projects</span>
        <span class="exec-legend-item"><span class="exec-legend-dot" style="background:#f59e0b"></span>Completed projects</span>
      </div>
      <div class="exec-list-meta" style="justify-content:space-between;gap:8px;margin-top:10px;">${labels}</div>
    </div>
  `;
}

function execFinanceChart(data) {
  const f = data.analytics?.financial_overview || {};
  const segments = [
    { label: "Income", value: Number(f.total_income || 0), color: "#10b981", valueLabel: execMoney(f.total_income), detail: "Money coming in" },
    { label: "Company Costs", value: Number(f.company_expenses || 0), color: "#ef4444", valueLabel: execMoney(f.company_expenses), detail: "General business costs" },
    { label: "Project Costs", value: Number(f.project_expenses || 0), color: "#f59e0b", valueLabel: execMoney(f.project_expenses), detail: "Work-related spending" },
    { label: "Collected Cash", value: Number(f.total_collections || 0), color: "#3b82f6", valueLabel: execMoney(f.total_collections), detail: "Payments already collected" },
  ];
  return execDonut(segments, "Net income", execMoney(f.net_income));
}

function execBidChart(data) {
  const b = data.analytics?.bid_approval_statistics || {};
  return execDonut([
    { label: "Awarded", value: Number(b.awarded || 0), color: "#14b8a6", valueLabel: execNumber(b.awarded), detail: "Approved bid packets" },
    { label: "Rejected", value: Number(b.rejected || 0), color: "#ef4444", valueLabel: execNumber(b.rejected), detail: "Rejected bid packets" },
    { label: "Active", value: Number(b.active_biddings || 0), color: "#60a5fa", valueLabel: execNumber(b.active_biddings), detail: "Recent bid packets" },
  ], "Approval rate", execPercent(b.approval_rate));
}

function execDocSourceLabel(source) {
  return ({
    bidding: "Bidding",
    eligibility: "Eligibility",
    jointVenture: "Joint Venture",
    acceptance: "Acceptance",
    finished: "Finished Projects",
  })[source] || "Documents";
}

function execDocSourceTone(source) {
  return ({
    bidding: "info",
    eligibility: "warning",
    jointVenture: "success",
    acceptance: "neutral",
    finished: "neutral",
  })[source] || "info";
}

function execRenderSharedDocItem(doc) {
  const sourceLabel = execDocSourceLabel(doc.source);
  const tone = execDocSourceTone(doc.source);
  const title = doc.title || "Document";
  const detail = doc.detail || "Shared file";
  const date = doc.date ? execFormatDate(doc.date) : "Recently";
  return `
    <div class="exec-list-item">
      <div class="exec-list-top">
        <div class="exec-list-title">${execEscape(title)}</div>
        <span class="exec-badge ${tone}">${execEscape(sourceLabel)}</span>
      </div>
      <div class="exec-list-sub">${execEscape(detail)}</div>
      <div class="exec-list-meta" style="margin-top:8px;">
        <span><i class="ri-calendar-line"></i> ${execEscape(date)}</span>
        ${doc.meta ? `<span><i class="ri-file-text-line"></i> ${execEscape(doc.meta)}</span>` : ""}
      </div>
    </div>
  `;
}

async function execLoadSharedDocuments(force = false) {
  const host = document.getElementById("execSharedDocuments");
  if (!host) return;
  if (!force && host.dataset.loaded === "1") return;
  host.dataset.loaded = "1";
  host.innerHTML = `<div class="exec-list-item"><div class="exec-list-sub">Loading shared documents...</div></div>`;

  try {
    const headers = execHeaders();
    const safeJson = async (url) => {
      const response = await fetch(url, { headers });
      return response.ok ? response.json() : [];
    };

    const [awarded, rejected, eligibility, jvEligibility, jvNoa, jvContract, acceptance] = await Promise.all([
      safeJson("/api/bidder/bidding?status=awarded"),
      safeJson("/api/bidder/bidding?status=rejected"),
      safeJson("/api/bidder/eligibility"),
      safeJson("/api/bidder/joint-venture?section=eligibility"),
      safeJson("/api/bidder/joint-venture?section=noa"),
      safeJson("/api/bidder/joint-venture?section=contract"),
      safeJson("/api/bidder/acceptance/files/recent"),
    ]);

    const docs = [
      ...awarded.map(row => ({
        source: "bidding",
        title: row.file_name || row.doc_type || "Bidding Document",
        detail: row.doc_type || row.description || "Awarded bid packet",
        date: row.date || row.created_at,
        meta: execMoney(row.file_size || 0),
      })),
      ...rejected.map(row => ({
        source: "bidding",
        title: row.file_name || row.doc_type || "Bidding Document",
        detail: row.doc_type || row.description || "Rejected bid packet",
        date: row.date || row.created_at,
        meta: execMoney(row.file_size || 0),
      })),
      ...eligibility.map(row => ({
        source: "eligibility",
        title: row.doc_name || row.file_name || "Eligibility Document",
        detail: row.category || row.notes || "Eligibility record",
        date: row.expiry_date || row.created_at,
        meta: row.result ? String(row.result).toUpperCase() : execMoney(row.file_size || 0),
      })),
      ...jvEligibility.map(row => ({
        source: "jointVenture",
        title: row.doc_name || row.file_name || "Joint Venture Document",
        detail: row.category || row.status || "Eligibility section",
        date: row.document_date || row.created_at,
        meta: row.status || execMoney(row.file_size || 0),
      })),
      ...jvNoa.map(row => ({
        source: "jointVenture",
        title: row.doc_name || row.file_name || "Joint Venture Document",
        detail: row.category || row.status || "NOA section",
        date: row.document_date || row.created_at,
        meta: row.status || execMoney(row.file_size || 0),
      })),
      ...jvContract.map(row => ({
        source: "jointVenture",
        title: row.doc_name || row.file_name || "Joint Venture Document",
        detail: row.category || row.status || "Contract section",
        date: row.document_date || row.created_at,
        meta: row.status || execMoney(row.file_size || 0),
      })),
      ...acceptance.map(row => ({
        source: "acceptance",
        title: row.file_name || "Acceptance File",
        detail: row.folder_name || row.uploader_name || "Acceptance document",
        date: row.last_access || row.created_at,
        meta: execMoney(row.file_size || 0),
      })),
    ]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);

    host.innerHTML = docs.length
      ? docs.map(execRenderSharedDocItem).join("")
      : `<div class="exec-list-item"><div class="exec-list-sub">No shared documents available yet.</div></div>`;
  } catch (err) {
    host.innerHTML = `<div class="exec-list-item"><div class="exec-list-sub">Unable to load shared documents.</div></div>`;
  }
}

function execDepartmentPerformance(data) {
  const departments = (data.analytics?.department_performance || []).map(row => ({
    label: row.department,
    value: Number(row.score || 0),
    valueLabel: execPercent(row.score),
    detail: `${execNumber(row.closed_items)} closed of ${execNumber(row.total_items)} tracked records`,
    color: row.department === "Finance" ? "linear-gradient(90deg,#1f4d87,#3b82f6)" : row.department === "Projects" ? "linear-gradient(90deg,#10b981,#34d399)" : row.department === "Bidding" ? "linear-gradient(90deg,#f59e0b,#fb923c)" : "linear-gradient(90deg,#64748b,#94a3b8)",
  }));
  return execBarChart(departments);
}

function execOngoingVsCompleted(data) {
  const counts = data.analytics?.ongoing_vs_completed || {};
  const ongoing = Number(counts.ongoing || 0);
  const completed = Number(counts.completed || 0);
  const total = Math.max(ongoing + completed, 1);
  return execDonut([
    { label: "Ongoing", value: ongoing, color: "#3b82f6", valueLabel: execNumber(ongoing), detail: "Projects still in motion" },
    { label: "Completed", value: completed, color: "#14b8a6", valueLabel: execNumber(completed), detail: "Projects already delivered" },
  ], "Completion", execPercent((completed / total) * 100));
}

function execAnalyticsPanels(data) {
  const projectTrend = execPanel(
    "Project trend",
    "How the project count has changed over the last twelve months",
    execProjectTrendChart(data),
    `<button class="exec-btn secondary" type="button" onclick="openPage('reports')"><i class="ri-file-chart-line"></i> Open reports</button>`
  );
  const financeOverview = execPanel(
    "Money summary",
    "Income, costs, and collections in one view",
    execFinanceChart(data)
  );
  const bidStats = execPanel(
    "Bid decisions",
    "Approved and rejected bids at a glance",
    execBidChart(data)
  );
  const deptPerformance = execPanel(
    "Department score",
    "A simple score based on completed work",
    execDepartmentPerformance(data)
  );
  const projectStatus = execPanel(
    "Projects in progress",
    "Ongoing work compared with completed work",
    execOngoingVsCompleted(data)
  );
  return `
    <div class="exec-grid">
      <div style="display:grid;gap:16px;">${projectTrend}${financeOverview}</div>
      <div style="display:grid;gap:16px;">${bidStats}${projectStatus}</div>
    </div>
    <div class="exec-grid two-up" style="margin-top:16px;">
      ${deptPerformance}
      ${execPanel("Project timelines", "Portfolio roadmap and delivery pacing", execRenderTimeline(data.monitoring?.project_timelines || []))}
    </div>
  `;
}

function execMonitoringPanels(data) {
  const recentActivities = execPanel(
    "Recent updates",
    "What changed most recently across the system",
    `<div class="exec-list">${(data.monitoring?.recent_activities || []).map(execRecentActivityItem).join("") || '<div class="exec-list-item"><div class="exec-list-sub">No recent activity records.</div></div>'}</div>`
  );
  const notifications = execPanel(
    "Notices",
    "Things that may need a quick look",
    execRenderNotifications(data.monitoring?.notifications || [])
  );
  const approvals = execPanel(
    "Awaiting approval",
    "Items still waiting on a decision",
    execRenderApprovalSummary(data.monitoring?.approval_summaries || [])
  );
  const critical = execPanel(
    "Important alerts",
    "Items that need attention now",
    execRenderCriticalAlerts(data.monitoring?.critical_alerts || [])
  );
  return `
    <div class="exec-grid two-up">
      ${recentActivities}
      ${notifications}
    </div>
    <div class="exec-grid two-up" style="margin-top:16px;">
      ${approvals}
      ${critical}
    </div>
  `;
}

function execDashboardShell(data) {
  const kpis = execBuildKpis(data);
  const generatedAt = data.generated_at ? execFormatDate(data.generated_at) : "Now";
  const quickKpis = kpis.slice(0, 3);
  const extraKpis = kpis.slice(3);
  return `
    <div class="exec-page">
      <div class="exec-shell">
        ${execHeader(
          "Leadership Overview",
          "A simple, read-only summary of your projects, finances, approvals, and alerts — updated live.",
          `
            <button class="exec-btn secondary" type="button" onclick="loadExecutiveDashboard(true)"><i class="ri-refresh-line"></i> Refresh</button>
            <div class="exec-export">
              <button class="exec-btn primary" type="button" onclick="execToggleExportMenu(event)"><i class="ri-download-2-line"></i> Download Summary</button>
              <div id="execExportMenu" class="exec-export-menu" role="menu">
                <button type="button" onclick="execExportCsv()"><i class="ri-file-text-line"></i> Save as Spreadsheet</button>
                <button type="button" onclick="window.location.href='/executive/reports'"><i class="ri-file-chart-line"></i> Go to Full Reports</button>
              </div>
            </div>
          `
        )}

        <div class="exec-section-label"><i class="ri-bar-chart-box-line"></i> Quick Numbers</div>
        <div class="exec-grid two-up" style="margin-top:10px;align-items:start;">
          <div class="exec-kpi-grid exec-kpi-grid--three">
            ${quickKpis.map(card => execSummaryCard(card)).join("")}
          </div>
          <div class="exec-panel">
            <div class="exec-panel-head">
              <div>
                <div class="exec-panel-title"><i class="ri-layout-grid-line"></i><span>More Key Numbers</span></div>
                <div class="exec-panel-sub">Other important figures at a glance.</div>
              </div>
            </div>
            <div class="exec-panel-body">
              <div class="exec-stat-strip exec-stat-strip--two">
                ${extraKpis.map(card => `
                  <div class="exec-stat-chip">
                    <div class="exec-stat-chip-icon"><i class="${card.icon}"></i></div>
                    <h4>${execEscape(card.label)}</h4>
                    <strong>${execEscape(card.value)}</strong>
                    <div class="exec-list-sub">${execEscape(card.meta)}</div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="exec-section-label" style="margin-top:24px;"><i class="ri-line-chart-line"></i> Charts &amp; Trends</div>
        <div class="exec-grid two-up" style="margin-top:10px;">
          ${execPanel("Project Activity Over Time", `Data as of ${execEscape(generatedAt)} — shows how many projects have been running each month.`, execProjectTrendChart(data))}
          ${execPanel("Financial Snapshot", "A breakdown of money coming in, costs going out, and what has been collected.", execFinanceChart(data))}
        </div>

        ${execDetails(
          "More Details",
          "Tap to see bid results, department performance, and project timelines",
          `
            <div class="exec-grid two-up" style="margin-top:0;">
              ${execPanel("Bid Results", "Shows how many bids were approved, rejected, or are still active.", execBidChart(data))}
              ${execPanel("Projects: In Progress vs Done", "A simple view of how many projects are still running compared to those already completed.", execOngoingVsCompleted(data))}
            </div>
            <div style="margin-top:16px;">
              ${execPanel("Department Performance", "Each department gets a simple score based on how much work they have closed out.", execDepartmentPerformance(data))}
            </div>
            <div style="margin-top:16px;">
              ${execPanel("Project Timelines", "A list of each project with its start date, end date, and how far along it is.", execRenderTimeline(data.monitoring?.project_timelines || []))}
            </div>
          `
        )}

        ${execDetails(
          "Updates & Alerts",
          "Tap to see recent activity, pending approvals, and anything that needs attention",
          `
            <div class="exec-grid two-up" style="margin-top:0;">
              ${execPanel("Recent Activity", "The latest changes made across the system — projects, finance, and more.", `<div class="exec-list">${(data.monitoring?.recent_activities || []).slice(0, 6).map(execRecentActivityItem).join("") || '<div class="exec-list-item"><div class="exec-list-sub">No recent activity to show.</div></div>'}</div>`)}
              ${execPanel("System Notices", "Things the system flagged that may need a quick look.", execRenderNotifications(data.monitoring?.notifications || []))}
            </div>
            <div class="exec-grid two-up" style="margin-top:16px;">
              ${execPanel("Waiting for Approval", "Items that are still pending a decision. The count shown is how many are in queue.", execRenderApprovalSummary(data.monitoring?.approval_summaries || []))}
              ${execPanel("Important Alerts", "Anything flagged as urgent or needing leadership attention.", execRenderCriticalAlerts(data.monitoring?.critical_alerts || []))}
            </div>
          `
        )}

        <div class="exec-section-label" style="margin-top:24px;"><i class="ri-file-list-3-line"></i> Bidder Documents</div>
        ${execPanel(
          "Shared Documents",
          "Recent bidder files surfaced in the Executive view.",
          `<div id="execSharedDocuments" class="exec-list"><div class="exec-list-item"><div class="exec-list-sub">Loading shared documents...</div></div></div>`
        )}
      </div>
    </div>
  `;
}

function execReportsShell(data) {
  const summary = data.summary || {};
  const finance = data.analytics?.financial_overview || {};
  const exportRows = [
    ["All Projects", execNumber(summary.total_projects), "nocDashboard"],
    ["Ongoing Projects", execNumber(summary.active_projects), "nocDashboard"],
    ["Open Bids", execNumber(summary.active_biddings), "bidderDashboard"],
    ["Approved Partners", execNumber(summary.approved_bidders), "bidderDashboard"],
    ["Waiting for Approval", execNumber(summary.pending_approvals), "userRequests"],
    ["Total Revenue", execMoney(summary.revenue), "financialReport"],
    ["Completion Rate", execPercent(summary.completion_rate), "nocDashboard"],
    ["Recent Activity", execNumber(summary.system_activities), "inbox"],
    ["Income", execMoney(finance.total_income), "financialReport"],
    ["Company Costs", execMoney(finance.company_expenses), "financialReport"],
    ["Project Costs", execMoney(finance.project_expenses), "financialReport"],
    ["Collected Cash", execMoney(finance.total_collections), "financialReport"],
    ["Outstanding Balance", execMoney(finance.outstanding_collections), "financialReport"],
    ["Net Income", execMoney(finance.net_income), "financialReport"],
  ];

  return `
    <div class="exec-page">
      <div class="exec-shell">
        ${execHeader(
          "Leadership Reports",
          "A simple summary of all key numbers — ready to download and share anytime.",
          `
            <button class="exec-btn secondary" type="button" onclick="loadExecutiveReports(true)"><i class="ri-refresh-line"></i> Refresh</button>
            <button class="exec-btn primary" type="button" onclick="execExportCsv()"><i class="ri-download-2-line"></i> Download as Spreadsheet</button>
          `
        )}

        <div class="exec-section-label" style="margin-top:20px;"><i class="ri-bar-chart-box-line"></i> Projects &amp; Operations</div>
        <div class="exec-report-grid" style="margin-top:10px;">
          ${execPanel(
            "Project Summary",
            "How many projects are recorded, active, and how open bids are going.",
            `<div class="exec-stats-row">
              ${exportRows.slice(0, 3).map(([label, value, pageKey]) => `
                <button type="button" class="exec-mini-stat exec-mini-stat-link" onclick="openPage('${pageKey}')">
                  <h4>${execEscape(label)}</h4>
                  <strong>${execEscape(value)}</strong>
                </button>
              `).join("")}
            </div>`
          )}
          ${execPanel(
            "Approvals & Completion",
            "How many items are waiting on a decision, and the overall project completion rate.",
            `<div class="exec-stats-row">
              ${exportRows.slice(4, 8).map(([label, value, pageKey]) => `
                <button type="button" class="exec-mini-stat exec-mini-stat-link" onclick="openPage('${pageKey}')">
                  <h4>${execEscape(label)}</h4>
                  <strong>${execEscape(value)}</strong>
                </button>
              `).join("")}
            </div>`
          )}
          ${execPanel(
            "Financial Summary",
            "Total income, costs, collections, and the net income figure.",
            `<div class="exec-stats-row">
              ${[
                ["Net Income", execMoney(finance.net_income), "financialReport"],
                ["Total Income", execMoney(finance.total_income), "financialReport"],
                ["Total Costs", execMoney((Number(finance.company_expenses || 0) + Number(finance.project_expenses || 0))), "financialReport"],
                ["Collected", execMoney(finance.total_collections), "financialReport"],
              ].map(([label, value, pageKey]) => `
                <button type="button" class="exec-mini-stat exec-mini-stat-link" onclick="openPage('${pageKey}')">
                  <h4>${execEscape(label)}</h4>
                  <strong>${execEscape(value)}</strong>
                </button>
              `).join("")}
            </div>`
          )}
        </div>

        ${execDetails(
          "More Reports",
          "Tap to see detailed finance, bid results, timelines, and recent updates",
          `
            <div class="exec-grid two-up" style="margin-top:0;">
              ${execPanel("Financial Breakdown", "A full view of income, costs, collections, and outstanding balance.", `<div class="exec-stats-row">
                ${exportRows.slice(8, 14).map(([label, value, pageKey]) => `
                  <button type="button" class="exec-mini-stat exec-mini-stat-link" onclick="openPage('${pageKey}')">
                    <h4>${execEscape(label)}</h4>
                    <strong>${execEscape(value)}</strong>
                  </button>
                `).join("")}
              </div>`)}
              ${execPanel("Bid Results", "Shows how many bids were approved or rejected and the overall approval rate.", execBidChart(data))}
            </div>
            <div class="exec-grid two-up" style="margin-top:16px;">
              ${execPanel("Project Timelines", "Each project with its schedule and how far along it is — useful for board presentations.", execRenderTimeline(data.monitoring?.project_timelines || []))}
              ${execPanel("Recent Activity & Alerts", "What changed most recently, anything awaiting approval, and urgent items.", `
                <div class="exec-list">${(data.monitoring?.recent_activities || []).slice(0, 4).map(execRecentActivityItem).join("") || '<div class="exec-list-item"><div class="exec-list-sub">No recent activity to show.</div></div>'}</div>
                <div style="height:12px"></div>
                ${execRenderApprovalSummary(data.monitoring?.approval_summaries || [])}
                <div style="height:12px"></div>
                ${execRenderCriticalAlerts(data.monitoring?.critical_alerts || [])}
              `)}
            </div>
          `
        )}
      </div>
    </div>
  `;
}

async function loadExecutiveDashboard(force = false) {
  execLoading();
  try {
    const data = await fetchExecutiveOverview(force);
    execMainContent().innerHTML = execDashboardShell(data);
    execLoadSharedDocuments(force);
  } catch (err) {
    execError(err.message || "Unable to load executive dashboard.");
  }
}

async function loadExecutiveReports(force = false) {
  execLoading("Loading executive reports...");
  try {
    const data = await fetchExecutiveOverview(force);
    execMainContent().innerHTML = execReportsShell(data);
    execLoadSharedDocuments(force);
  } catch (err) {
    execError(err.message || "Unable to load executive reports.");
  }
}

function execInboxShell() {
  return `
    <div class="exec-page">
      <div class="exec-shell">
        ${execHeader(
          "Inbox",
          "Shared conversations and request messages across roles, rendered with the same messenger-style inbox used in the other dashboards.",
          `
            <button class="exec-btn secondary" type="button" onclick="loadExecutiveInbox(true)">
              <i class="ri-refresh-line"></i> Refresh
            </button>
          `
        )}

        <section class="exec-panel exec-inbox-panel">
          <div class="exec-panel-head">
            <div>
              <div class="exec-panel-title"><i class="ri-inbox-2-line"></i><span>Inbox</span></div>
              <div class="exec-panel-sub">Embedded shared inbox using the same working messenger view as admin</div>
            </div>
          </div>
          <div class="exec-panel-body">
            <div class="exec-inbox-host">
              <iframe
                id="execInboxFrame"
                class="exec-inbox-frame"
                title="Executive inbox"
                src="/modules/admin/admin-dashboard.html?page=settings"
              ></iframe>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

async function loadExecutiveInbox(force = false) {
  execMainContent().innerHTML = execInboxShell();
  try {
    const frame = document.getElementById("execInboxFrame");
    if (!frame) throw new Error("Inbox frame is unavailable.");
    frame.onload = () => {
      try {
        const win = frame.contentWindow;
        const doc = win?.document;
        if (!doc) return;

        const style = doc.createElement("style");
        style.textContent = `
          #adminSidebar { display: none !important; }
          .main { margin-left: 0 !important; width: 100% !important; }
          .admin-layout { padding-left: 0 !important; }
          body { overflow: hidden !important; }
        `;
        doc.head.appendChild(style);

        const inboxTab = doc.querySelector('.stg-navitem[data-tab="inbox"]');
        if (inboxTab) {
          inboxTab.click();
          return;
        }
        if (typeof win.adminLoadInbox === "function") {
          win.adminLoadInbox();
        }
      } catch {
        // If the iframe load is still settling, the admin page will remain visible on its default tab.
      }
    };
  } catch (err) {
    execError(err.message || "Unable to load executive inbox.");
  }
}

function execSettingsShell(data) {
  const summary = data?.summary || {};
  const accessRows = [
    { label: "Role", value: executiveUser.role || "Executive", detail: "Current account type" },
    { label: "Page", value: "Executive dashboard", detail: "The page you are using" },
    { label: "Access", value: "View only", detail: "No editing or deleting" },
    { label: "Reports", value: "Available", detail: "Simple summary pages" },
  ];

  return `
    <div class="exec-page">
      <div class="exec-shell">
        ${execHeader(
          "Executive Settings",
          "A lightweight account and session panel kept inside the Executive layout.",
          `
            <button class="exec-btn secondary" type="button" onclick="loadExecutiveSettings(true)"><i class="ri-refresh-line"></i> Refresh</button>
            <button class="exec-btn primary" type="button" onclick="showLogoutModal()"><i class="ri-logout-circle-r-line"></i> Log Out</button>
          `
        )}

        <div class="exec-grid two-up">
          ${execPanel(
            "Account summary",
            "Current session and identity details",
            `
              <div class="exec-list">
                ${accessRows.map(item => `
                  <div class="exec-list-item">
                    <div class="exec-list-top">
                      <div class="exec-list-title">${execEscape(item.label)}</div>
                      <span class="exec-badge info">${execEscape(item.value)}</span>
                    </div>
                    <div class="exec-list-sub">${execEscape(item.detail)}</div>
                  </div>
                `).join("")}
              </div>
            `
          )}
          ${execPanel(
            "Quick snapshot",
            "A compact view of the latest leadership numbers",
            `
              <div class="exec-stat-strip">
                <div class="exec-stat-chip"><h4>All Projects</h4><strong>${execNumber(summary.total_projects)}</strong><div class="exec-list-sub">Everything recorded</div></div>
                <div class="exec-stat-chip"><h4>Ongoing Projects</h4><strong>${execNumber(summary.active_projects)}</strong><div class="exec-list-sub">Currently moving</div></div>
                <div class="exec-stat-chip"><h4>Approved Partners</h4><strong>${execNumber(summary.approved_bidders)}</strong><div class="exec-list-sub">Confirmed and active</div></div>
                <div class="exec-stat-chip"><h4>Waiting for Approval</h4><strong>${execNumber(summary.pending_approvals)}</strong><div class="exec-list-sub">Still waiting on action</div></div>
              </div>
            `
          )}
        </div>

        <div class="exec-grid two-up" style="margin-top:16px;">
          ${execPanel(
            "Session controls",
            "Use these actions without leaving the Executive shell",
            `
              <div class="exec-list">
                <div class="exec-list-item">
                  <div class="exec-list-top">
                    <div class="exec-list-title">Sign out</div>
                    <span class="exec-badge warning">Session</span>
                  </div>
                  <div class="exec-list-sub">End the current Executive session and return to the sign-in screen.</div>
                  <div style="margin-top:12px;">
                    <button class="exec-btn primary" type="button" onclick="showLogoutModal()"><i class="ri-logout-circle-r-line"></i> Log Out</button>
                  </div>
                </div>
              </div>
            `
          )}
          ${execPanel(
            "Leadership access",
            "What this role can view from the current shell",
            `
              <div class="exec-list">
                <div class="exec-list-item"><div class="exec-list-title">Dashboard</div><div class="exec-list-sub">Quick summary of the business</div></div>
                <div class="exec-list-item"><div class="exec-list-title">Reports</div><div class="exec-list-sub">Downloadable summary pages</div></div>
                <div class="exec-list-item"><div class="exec-list-title">Modules</div><div class="exec-list-sub">NOC, Finance, Bidder, and admin views</div></div>
              </div>
            `
          )}
        </div>
      </div>
    </div>
  `;
}

async function loadExecutiveSettings(force = false) {
  execLoading("Loading executive settings...");
  try {
    if (!window.renderExecutiveSettingsPage) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-exec-settings-runtime="true"]');
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", () => reject(new Error("Unable to load executive settings runtime.")), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "/modules/executive/executive-settings/executive-settings.js";
        script.defer = true;
        script.dataset.execSettingsRuntime = "true";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Unable to load executive settings runtime."));
        document.head.appendChild(script);
      });
    }
    window.renderExecutiveSettingsPage?.();
  } catch (err) {
    execError(err.message || "Unable to load executive settings.");
  }
}

function showLogoutModal() {
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
            <span class="logout-user-name">${execEscape(executiveUser.full_name || executiveUser.email || "Executive User")}</span>
            <span class="logout-user-role">${execEscape(executiveUser.role || "Executive")}</span>
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

function execCloseExportMenu() {
  const menu = document.getElementById("execExportMenu");
  if (menu) menu.classList.remove("open");
  execState.exportMenuOpen = false;
}

function execToggleExportMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById("execExportMenu");
  if (!menu) return;
  execState.exportMenuOpen = !execState.exportMenuOpen;
  menu.classList.toggle("open", execState.exportMenuOpen);
}

function execCsv(rows) {
  return rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function execExportCsv() {
  const data = execState.overview;
  if (!data) {
    showToast?.("Executive data is still loading.", "warning");
    return;
  }
  const finance = data.analytics?.financial_overview || {};
  const rows = [
    ["Metric", "Value"],
    ["All Projects", data.summary?.total_projects || 0],
    ["Ongoing Projects", data.summary?.active_projects || 0],
    ["Open Bids", data.summary?.active_biddings || 0],
    ["Approved Partners", data.summary?.approved_bidders || 0],
    ["Waiting for Approval", data.summary?.pending_approvals || 0],
    ["Total Revenue", finance.net_income || 0],
    ["Completion Rate", data.summary?.completion_rate || 0],
    ["Recent Activity", data.summary?.system_activities || 0],
  ];
  const blob = new Blob([execCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `executive-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function execBindMenuClose() {
  if (window.__execExportMenuBound) return;
  window.__execExportMenuBound = true;
  document.addEventListener("click", event => {
    if (!event.target.closest?.(".exec-export")) execCloseExportMenu();
  });
}

window.addEventListener("DOMContentLoaded", execBindMenuClose);

const EXECUTIVE_VIEW_BY_PAGE = {
  dashboard: "dashboard",
  reports: "reports",
  inbox: "inbox",
  monitoringRequests: "monitoring-requests",
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
  logout: "logout",
};

const EXECUTIVE_PAGE_BY_VIEW = Object.fromEntries(Object.entries(EXECUTIVE_VIEW_BY_PAGE).map(([page, view]) => [view, page]));

function getExecutiveVisiblePages() {
  return window.EXECUTIVE_SIDEBAR_SECTIONS.flatMap(section => [
    ...(section.pages || []),
    ...(section.groups || []).flatMap(group => group.pages || [])
  ]);
}

function getExecutiveHomePageKey() {
  const requestedPage = new URLSearchParams(window.location.search).get("page");
  if (requestedPage && window.EXECUTIVE_PAGE_DEFS[requestedPage]) return requestedPage;
  if (requestedPage && EXECUTIVE_PAGE_BY_VIEW[requestedPage]) return EXECUTIVE_PAGE_BY_VIEW[requestedPage];
  return window.EXECUTIVE_START_PAGE || getExecutiveVisiblePages()[0];
}

function setExecutiveActivePage(pageKey) {
  const viewName = EXECUTIVE_VIEW_BY_PAGE[pageKey] || pageKey;
  document.querySelectorAll(".admin-menu-item[data-exec-view]").forEach(item => {
    item.classList.toggle("active", item.dataset.execView === viewName);
  });
  document.querySelectorAll(".admin-dropdown").forEach(dropdown => {
    const hasActivePage = !!dropdown.querySelector(`.admin-menu-item[data-exec-view="${viewName}"]`);
    dropdown.classList.toggle("contains-active", hasActivePage);
    if (hasActivePage) dropdown.classList.add("expanded");
    dropdown.querySelector(".admin-dropdown-toggle")?.setAttribute(
      "aria-expanded",
      dropdown.classList.contains("expanded") ? "true" : "false"
    );
  });
}

function openExecutivePage(pageKey) {
  const page = window.EXECUTIVE_PAGE_DEFS[pageKey];
  if (!page) return;
  if (pageKey !== "logout") setExecutiveActivePage(pageKey);
  page.loader();
  if (pageKey !== "logout") {
    const url = new URL(window.location.href);
    url.searchParams.set("page", EXECUTIVE_VIEW_BY_PAGE[pageKey] || pageKey);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

window.openPage = openExecutivePage;

function toggleExecutiveDropdown(key) {
  const dropdown = document.querySelector(`.admin-dropdown[data-dropdown="${key}"]`);
  if (!dropdown) return;
  dropdown.classList.toggle("expanded");
  dropdown.querySelector(".admin-dropdown-toggle")?.setAttribute(
    "aria-expanded",
    dropdown.classList.contains("expanded") ? "true" : "false"
  );
}

function renderExecutiveSidebar() {
  const nav = document.getElementById("adminSidebarNav");
  if (!nav) return;
  const pageDefs = window.EXECUTIVE_PAGE_DEFS;
  const visible = new Set(getExecutiveVisiblePages());
  const firstPage = getExecutiveHomePageKey();

  let html = "";
  window.EXECUTIVE_SIDEBAR_SECTIONS.forEach((section, sectionIndex) => {
    const pages = (section.pages || []).filter(pageKey => visible.has(pageKey) && pageDefs[pageKey]);
    const groups = (section.groups || [])
      .map(group => ({
        ...group,
        pages: (group.pages || []).filter(pageKey => visible.has(pageKey) && pageDefs[pageKey])
      }))
      .filter(group => group.pages.length);

    if (!pages.length && !groups.length) return;
    if (sectionIndex > 0) html += `<div class="admin-menu-section-divider" role="separator"></div>`;
    html += `<div class="admin-menu-section-label">${execEscape(section.label)}</div>`;

    pages.forEach(pageKey => {
      const page = pageDefs[pageKey];
      const viewName = EXECUTIVE_VIEW_BY_PAGE[pageKey] || pageKey;
      html += `
        <button type="button" class="admin-menu-item ${pageKey === firstPage ? "active" : ""}" data-exec-view="${viewName}">
          <i class="${page.icon}"></i><span>${execEscape(page.label)}</span>
        </button>
      `;
    });

    groups.forEach(group => {
      const expanded = group.pages.includes(firstPage);
      html += `
        <div class="admin-dropdown ${expanded ? "expanded" : ""}" data-dropdown="${execEscape(group.key)}">
          <button type="button" class="admin-dropdown-toggle" data-dropdown-toggle="${execEscape(group.key)}" aria-expanded="${expanded ? "true" : "false"}">
            <i class="${group.icon || "ri-folder-line"}"></i><span>${execEscape(group.label)}</span><i class="ri-arrow-down-s-line admin-dropdown-arrow"></i>
          </button>
          <div class="admin-dropdown-list">
            ${group.pages.map(pageKey => {
              const page = pageDefs[pageKey];
              const viewName = EXECUTIVE_VIEW_BY_PAGE[pageKey] || pageKey;
              return `
                <button type="button" class="admin-menu-item ${pageKey === firstPage ? "active" : ""}" data-exec-view="${viewName}">
                  <i class="${page.icon}"></i><span>${execEscape(page.label)}</span>
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
    toggle.addEventListener("click", () => toggleExecutiveDropdown(toggle.dataset.dropdownToggle));
  });
  nav.querySelectorAll(".admin-menu-item[data-exec-view]").forEach(item => {
    item.addEventListener("click", () => openExecutivePage(EXECUTIVE_PAGE_BY_VIEW[item.dataset.execView] || item.dataset.execView));
  });
}

function renderExecutiveProfile() {
  const profile = document.getElementById("adminSidebarProfile");
  if (!profile) return;
  const displayName = executiveUser.full_name || executiveUser.email || "Executive";
  const displayRole = executiveUser.role || "Executive";
  const initials = displayName.split(" ").filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "E";

  profile.innerHTML = `
    <div class="admin-profile-inner" title="${execEscape(displayName)} - ${execEscape(displayRole)}">
      <div class="admin-avatar">
        ${executiveUser.photo ? `<img src="${execEscape(executiveUser.photo)}" alt="${execEscape(displayName)}">` : execEscape(initials)}
      </div>
      <div class="admin-profile-text">
        <div class="admin-profile-name">${execEscape(displayName)}</div>
        <div class="admin-profile-role">${execEscape(displayRole)}</div>
      </div>
      <i class="ri-more-2-fill admin-profile-icon"></i>
    </div>
  `;
  profile.querySelector(".admin-profile-inner")?.addEventListener("click", () => openExecutivePage("settings"));
}

function syncExecutiveSidebar() {
  const sidebar = document.getElementById("adminSidebar");
  const isCollapsed = sidebar?.classList.contains("collapsed");
  document.body.classList.toggle("sidebar-collapsed", !!isCollapsed);
  localStorage.setItem("executiveSidebarCollapsed", isCollapsed ? "1" : "0");
}

function bootExecutiveDashboard() {
  const sidebar = document.getElementById("adminSidebar");
  if (sidebar && localStorage.getItem("executiveSidebarCollapsed") === "1") sidebar.classList.add("collapsed");
  syncExecutiveSidebar();
  document.getElementById("adminToggleSidebar")?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
    syncExecutiveSidebar();
  });
  renderExecutiveSidebar();
  renderExecutiveProfile();
  openExecutivePage(getExecutiveHomePageKey());
}

window.addEventListener("DOMContentLoaded", bootExecutiveDashboard);

window.EXECUTIVE_PAGE_DEFS = {
  dashboard: { label: "Dashboard", icon: "ri-dashboard-3-line", loader: () => loadExecutiveDashboard() },
  reports: { label: "Reports", icon: "ri-file-chart-line", loader: () => loadExecutiveReports() },
  inbox: { label: "Inbox", icon: "ri-inbox-2-line", loader: () => loadExecutiveInbox() },
  staffIds: { label: "Staff ID Management", icon: "ri-id-card-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=staff-ids"; } },
  accountsMonitoring: { label: "Accounts Monitoring", icon: "ri-pulse-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=accounts-monitoring"; } },
  userRequests: { label: "User Requests", icon: "ri-inbox-archive-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=user-requests"; } },
  nocDashboard: { label: "NOC Dashboard", icon: "ri-dashboard-line", loader: () => { window.location.href = "/modules/noc/noc-dashboard.html?returnTo=executive"; } },
  nocMap: { label: "Map", icon: "ri-map-2-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-map"; } },
  nocTerminals: { label: "Terminals", icon: "ri-terminal-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-terminals"; } },
  nocProblematicSites: { label: "Problematic Sites", icon: "ri-error-warning-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-problematic-sites"; } },
  nocAcceptance: { label: "Acceptance", icon: "ri-checkbox-circle-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-acceptance"; } },
  nocTicket: { label: "Ticket", icon: "ri-ticket-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-ticket"; } },
  nocReports: { label: "Reports", icon: "ri-bar-chart-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-reports"; } },
  nocFiles: { label: "Files", icon: "ri-file-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-files"; } },
  nocInventory: { label: "Inventory", icon: "ri-archive-2-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=noc-inventory"; } },
  financeDashboard: { label: "Finance Dashboard", icon: "ri-bank-card-line", loader: () => { window.location.href = "/modules/finance/finance-dashboard.html?returnTo=executive"; } },
  companyIncome: { label: "Company Income", icon: "ri-line-chart-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-company-income"; } },
  companyExpenses: { label: "Company Expenses", icon: "ri-shopping-cart-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-company-expenses"; } },
  projectExpenses: { label: "Project Expenses", icon: "ri-file-list-3-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-project-expenses"; } },
  collections: { label: "Collections", icon: "ri-hand-coin-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-collections"; } },
  financeInventory: { label: "Inventory", icon: "ri-archive-2-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-inventory"; } },
  financeFiles: { label: "Files", icon: "ri-file-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-files"; } },
  employee: { label: "Employee", icon: "ri-user-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-employee"; } },
  financialReport: { label: "Financial Report", icon: "ri-bar-chart-2-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=finance-financial-report"; } },
  bidderDashboard: { label: "Bidder Dashboard", icon: "ri-auction-line", loader: () => { window.location.href = "/modules/bidder/bidder-dashboard.html?returnTo=executive"; } },
  monitoringRequests: { label: "Monitoring and Requests", icon: "ri-folder-2-line", loader: () => { window.location.href = "/modules/admin/admin-dashboard.html?page=staff-ids&hideSystem=1"; } },
  settings: { label: "Settings", icon: "ri-settings-3-line", loader: () => loadExecutiveSettings() },
  logout: { label: "Log Out", icon: "ri-logout-circle-r-line", loader: () => showLogoutModal() },
};

window.EXECUTIVE_SIDEBAR_SECTIONS = [
  { label: "Overview", pages: ["dashboard", "reports"] },
  {
    label: "Monitoring and Requests",
    pages: ["monitoringRequests", "nocDashboard", "financeDashboard", "bidderDashboard"],
  },
  {
    label: "System",
    pages: ["settings", "logout"],
  }
];
