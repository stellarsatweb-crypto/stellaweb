/* ================= USER SESSION ================= */

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "index.html";
}

/* ================= GLOBAL ================= */

const mainContent = document.getElementById("mainContent");

let tickets = [
  { id: "TIC-001", site: "SITE-01", issue: "No Signal", priority: "High", status: "In Progress", date: "2026-02-20" },
  { id: "TIC-002", site: "SITE-07", issue: "Power Failure", priority: "Medium", status: "Pending", date: "2026-02-21" },
  { id: "TIC-003", site: "SITE-12", issue: "Battery Low", priority: "Low", status: "Completed", date: "2026-02-22" },
  { id: "TIC-004", site: "SITE-14", issue: "Router Offline", priority: "High", status: "Pending", date: "2026-02-23" },
  { id: "TIC-005", site: "SITE-22", issue: "Fiber Cut", priority: "High", status: "In Progress", date: "2026-02-24" }
];

let currentPage = 1;
const rowsPerPage = 7;

/* ================= SIDEBAR ================= */

document.querySelectorAll(".menu li").forEach(item => {
  item.addEventListener("click", function () {
    if (this.id === "logout") return;
    document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
    this.classList.add("active");
    const text = this.innerText.trim();
    if (text === "Dashboard") loadDashboard();
    if (text === "Problematic Sites") loadProblematicSites();
    if (text === "Ticket") loadTickets();
    if (text === "Terminals") loadTerminals();
  });
});

/* ================= LOGOUT ================= */

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

/* ================= SIDEBAR TOGGLE ================= */

document.getElementById("toggleSidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

/* ================= TERMINALS ================= */

let terminalData = [];
let terminalFiltered = [];
let terminalPage = 1;
const terminalRowsPerPage = 10;
let terminalSortCol = null;
let terminalSortDir = 1;
let terminalSelectedRows = new Set();
let terminalSelectMode = false;

async function loadTerminals() {
  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-computer-line"></i> Terminals</h2>
      <div class="terminals-actions">
        <div class="search-box">
          <i class="ri-search-line"></i>
          <input type="text" id="terminalSearch" placeholder="Search here…">
        </div>
        <div class="dropdown-wrapper">
          <button class="dropdown-btn"><i class="ri-map-pin-2-line"></i> <span id="regionLabel">Benguet</span> <i class="ri-arrow-down-s-line"></i></button>
          <select id="regionSelect" class="hidden-select">
            <option value="benguet">Benguet</option>
            <option value="ifugao">Ifugao</option>
            <option value="ilocos">Ilocos</option>
            <option value="kalinga">Kalinga</option>
            <option value="pangasinan">Pangasinan</option>
            <option value="quezon">Quezon</option>
          </select>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <span id="regionTitle">Benguet Records</span>
        <div class="table-tools">
          <button class="tool-btn" id="btnAdd"><i class="ri-add-line"></i> Add</button>
          <button class="tool-btn" id="btnSortFilter"><i class="ri-sliders-h-line"></i> Sort & Filter</button>
          <button class="tool-btn" id="btnSelect"><i class="ri-checkbox-multiple-line"></i> Select</button>
        </div>
      </div>

      <div id="sortFilterBar" class="filter-bar hidden">
        <div class="filter-group">
          <label>Province</label>
          <input type="text" id="filterProvince" placeholder="e.g. BENGUET">
        </div>
        <div class="filter-group">
          <label>Municipality</label>
          <input type="text" id="filterMuni" placeholder="e.g. ATOK">
        </div>
        <div class="filter-group">
          <label>Region</label>
          <input type="text" id="filterRegion" placeholder="e.g. CAR">
        </div>
        <div class="filter-sort-divider"></div>
        <div class="filter-group">
          <label>Sort by</label>
          <select id="sortColSelect" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;outline:none;background:white;"></select>
        </div>
        <button class="tool-btn" id="toggleSortDir"><i class="ri-arrow-up-line"></i> ASC</button>
        <button class="tool-btn apply-btn" id="applyFilterSort"><i class="ri-check-line"></i> Apply</button>
        <button class="tool-btn" id="clearFilterSort"><i class="ri-close-line"></i> Clear</button>
      </div>

      <div id="bulkActions" class="bulk-actions hidden">
        <span id="selectedCount">0 rows selected</span>
        <button class="tool-btn danger-btn" id="deleteSelected"><i class="ri-delete-bin-line"></i> Delete Selected</button>
        <button class="tool-btn" id="exportSelected"><i class="ri-download-line"></i> Export CSV</button>
      </div>

      <div class="table-wrapper terminals-table-wrapper">
        <table class="data-grid terminals-grid" id="terminalTable">
          <thead id="terminalThead"></thead>
          <tbody id="terminalTbody"></tbody>
        </table>
      </div>

      <div class="pagination-bar" id="terminalPagination"></div>
    </div>

    <!-- Confirm Delete Modal -->
    <div id="confirmDeleteModal" class="modal-overlay hidden">
      <div class="modal-box confirm-modal-box">
        <div class="confirm-modal-icon danger-icon">
          <i class="ri-delete-bin-2-line"></i>
        </div>
        <h3 class="confirm-modal-title">Delete Records</h3>
        <p class="confirm-modal-msg" id="confirmDeleteMsg">Are you sure you want to delete the selected records?</p>
        <div class="confirm-modal-actions">
          <button class="tool-btn" id="cancelDeleteBtn">Cancel</button>
          <button class="tool-btn danger-btn" id="confirmDeleteBtn"><i class="ri-delete-bin-line"></i> Yes, Delete</button>
        </div>
      </div>
    </div>

    <!-- Edit Row Modal -->
    <div id="editRowModal" class="modal-overlay hidden">
      <div class="modal-box add-modal-box">
        <div class="add-modal-header">
          <div class="add-modal-icon" style="background:rgba(255,255,255,0.15)"><i class="ri-edit-line"></i></div>
          <div class="add-modal-title">
            <h3>Edit Terminal</h3>
            <p>Update the details for this terminal entry.</p>
          </div>
          <button class="modal-close-btn" id="cancelEditRow"><i class="ri-close-line"></i></button>
        </div>
        <div class="add-modal-body">
          <div id="editRowFields" class="add-fields-grid"></div>
        </div>
        <div class="add-modal-footer">
          <span class="add-modal-hint"><i class="ri-information-line"></i> Changes will be saved to the database</span>
          <div class="modal-actions">
            <button class="tool-btn" id="cancelEditRowFooter">Cancel</button>
            <button class="tool-btn apply-btn" id="confirmEditRow"><i class="ri-save-line"></i> Save Changes</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Row Modal -->
    <div id="addRowModal" class="modal-overlay hidden">
      <div class="modal-box add-modal-box">
        <div class="add-modal-header">
          <div class="add-modal-icon"><i class="ri-router-line"></i></div>
          <div class="add-modal-title">
            <h3>Add New Terminal</h3>
            <p>Fill in the details to register a new terminal entry.</p>
          </div>
          <button class="modal-close-btn" id="cancelAddRow"><i class="ri-close-line"></i></button>
        </div>
        <div class="add-modal-body">
          <div id="addRowFields" class="add-fields-grid"></div>
        </div>
        <div class="add-modal-footer">
          <span class="add-modal-hint"><i class="ri-information-line"></i> All fields are optional unless marked</span>
          <div class="modal-actions">
            <button class="tool-btn" id="cancelAddRowFooter">Cancel</button>
            <button class="tool-btn apply-btn" id="confirmAddRow"><i class="ri-save-line"></i> Save Terminal</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("regionSelect").addEventListener("change", function () {
    const val = this.value;
    document.getElementById("regionLabel").innerText = capitalize(val);
    document.getElementById("regionTitle").innerText = capitalize(val) + " Records";
    fetchTerminals(val);
  });

  document.getElementById("terminalSearch").addEventListener("input", () => {
    applyTerminalSearch();
    terminalPage = 1;
    renderTerminalTable();
    renderTerminalPagination();
  });

  document.getElementById("btnSortFilter").addEventListener("click", () => {
    document.getElementById("sortFilterBar").classList.toggle("hidden");
    document.getElementById("btnSortFilter").classList.toggle("active-tool",
      !document.getElementById("sortFilterBar").classList.contains("hidden"));
  });

  document.getElementById("btnSelect").addEventListener("click", () => {
    terminalSelectMode = !terminalSelectMode;
    terminalSelectedRows.clear();
    document.getElementById("btnSelect").classList.toggle("active-tool", terminalSelectMode);
    document.getElementById("bulkActions").classList.toggle("hidden", !terminalSelectMode);
    renderTerminalTable();
  });

  document.getElementById("deleteSelected").addEventListener("click", async () => {
    if (terminalSelectedRows.size === 0) { showToast("No rows selected.", "error"); return; }
    const toDeleteRows = Array.from(terminalSelectedRows).map(idx => terminalFiltered[idx]);
    showConfirmDeleteModal(toDeleteRows.length, async () => {
      const deleteBtn = document.getElementById("deleteSelected");
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Deleting…';
      const region = document.getElementById("regionSelect").value;
      const firstCol = Object.keys(toDeleteRows[0])[0];
      const ids = toDeleteRows.map(row => row[firstCol]);
      try {
        const res = await fetch(`/api/terminals/${region}`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column: firstCol, ids })
        });
        const result = await res.json();
        if (!res.ok) { showToast("Delete failed: " + (result.error || "Unknown error"), "error"); return; }
        const toDeleteSet = new Set(toDeleteRows);
        terminalFiltered = terminalFiltered.filter(r => !toDeleteSet.has(r));
        terminalData = terminalData.filter(r => !toDeleteSet.has(r));
        terminalSelectedRows.clear();
        updateSelectedCount();
        const maxPage = Math.max(1, Math.ceil(terminalFiltered.length / terminalRowsPerPage));
        if (terminalPage > maxPage) terminalPage = maxPage;
        renderTerminalTable(); renderTerminalPagination();
        showToast(`${result.deleted} record(s) deleted successfully.`, "success");
      } catch (err) { showToast("Network error — could not delete records.", "error"); }
      finally { deleteBtn.disabled = false; deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i> Delete Selected'; }
    });
  });

  document.getElementById("exportSelected").addEventListener("click", () => {
    if (terminalSelectedRows.size === 0) { alert("No rows selected."); return; }
    const selectedRows = Array.from(terminalSelectedRows).sort((a, b) => a - b).map(idx => terminalFiltered[idx]);
    const columns = Object.keys(selectedRows[0]);
    const escape = val => { const str = String(val ?? ""); return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str; };
    const csvContent = [columns.map(escape).join(","), ...selectedRows.map(row => columns.map(col => escape(row[col])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
    a.download = `terminals_export_${Date.now()}.csv`; a.click();
  });

  document.getElementById("btnAdd").addEventListener("click", () => openAddModal());

  document.getElementById("toggleSortDir").addEventListener("click", function () {
    terminalSortDir *= -1;
    this.innerHTML = terminalSortDir === 1 ? '<i class="ri-arrow-up-line"></i> ASC' : '<i class="ri-arrow-down-line"></i> DESC';
  });

  document.getElementById("applyFilterSort").addEventListener("click", () => {
    const prov = document.getElementById("filterProvince").value.trim().toUpperCase();
    const muni = document.getElementById("filterMuni").value.trim().toUpperCase();
    const reg = document.getElementById("filterRegion").value.trim().toUpperCase();
    const col = document.getElementById("sortColSelect").value;
    terminalFiltered = terminalData.filter(row =>
      (!prov || String(row["PROVINCE"] ?? "").toUpperCase().includes(prov)) &&
      (!muni || String(row["MUNICIPALITY"] ?? "").toUpperCase().includes(muni)) &&
      (!reg || String(row["REGION"] ?? "").toUpperCase().includes(reg))
    );
    if (col) {
      terminalSortCol = col;
      terminalFiltered.sort((a, b) =>
        String(a[col] ?? "").localeCompare(String(b[col] ?? ""), undefined, { numeric: true }) * terminalSortDir
      );
    }
    terminalPage = 1; renderTerminalTable(); renderTerminalPagination();
    document.getElementById("sortFilterBar").classList.add("hidden");
    document.getElementById("btnSortFilter").classList.remove("active-tool");
  });

  document.getElementById("clearFilterSort").addEventListener("click", () => {
    terminalFiltered = [...terminalData];
    terminalSortCol = null; terminalSortDir = 1;
    ["filterProvince","filterMuni","filterRegion"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("toggleSortDir").innerHTML = '<i class="ri-arrow-up-line"></i> ASC';
    terminalPage = 1; renderTerminalTable(); renderTerminalPagination();
  });

  fetchTerminals("benguet");
}

function toggleBar(id) { document.getElementById(id).classList.toggle("hidden"); }
function hideBar(id) { document.getElementById(id).classList.add("hidden"); }
function capitalize(word) { return word.charAt(0).toUpperCase() + word.slice(1); }

async function fetchTerminals(region) {
  const tbody = document.getElementById("terminalTbody");
  const thead = document.getElementById("terminalThead");
  tbody.innerHTML = `<tr><td colspan="20" class="loading-cell"><i class="ri-loader-4-line spin"></i> Loading data…</td></tr>`;
  thead.innerHTML = "";
  try {
    const res = await fetch(`/api/terminals/${region}`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="20" class="empty-cell"><i class="ri-inbox-line"></i> No records found</td></tr>`;
      return;
    }
    const allCols = Object.keys(data[0]);
    const cleaned = data.filter(row => {
      const valueCols = allCols.slice(1);
      return valueCols.some(col => { const v = row[col]; return v !== null && v !== undefined && String(v).trim() !== ""; });
    });
    terminalData = cleaned;
    terminalFiltered = [...cleaned];
    terminalPage = 1;
    const cols = Object.keys(data[0]);
    const sortSel = document.getElementById("sortColSelect");
    sortSel.innerHTML = cols.map(c => `<option value="${c}">${c}</option>`).join("");
    renderTerminalTable();
    renderTerminalPagination();
  } catch (err) {
    console.error("Fetch error:", err);
    document.getElementById("terminalTbody").innerHTML = `<tr><td colspan="20" class="error-cell"><i class="ri-error-warning-line"></i> Error loading data</td></tr>`;
  }
}

function renderTerminalTable() {
  const thead = document.getElementById("terminalThead");
  const tbody = document.getElementById("terminalTbody");
  if (!terminalFiltered.length) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td class="empty-cell"><i class="ri-search-line"></i> No results match your search</td></tr>`;
    return;
  }
  const columns = Object.keys(terminalFiltered[0]);
  const start = (terminalPage - 1) * terminalRowsPerPage;
  const pageData = terminalFiltered.slice(start, start + terminalRowsPerPage);
  thead.innerHTML = `
    <tr>
      ${terminalSelectMode ? '<th class="select-col"><input type="checkbox" id="selectAll"></th>' : ''}
      ${columns.map(col => `<th>${col}</th>`).join("")}
      <th class="actions-col">Actions</th>
    </tr>
  `;
  if (terminalSelectMode) {
    document.getElementById("selectAll").addEventListener("change", function () {
      pageData.forEach((_, i) => { const idx = start + i; if (this.checked) terminalSelectedRows.add(idx); else terminalSelectedRows.delete(idx); });
      updateSelectedCount(); renderTerminalTable();
    });
  }
  tbody.innerHTML = pageData.map((row, i) => {
    const globalIdx = start + i;
    const isChecked = terminalSelectedRows.has(globalIdx);
    return `
      <tr class="${isChecked ? 'selected-row' : ''}" data-idx="${globalIdx}">
        ${terminalSelectMode ? `<td class="select-col"><input type="checkbox" class="row-check" ${isChecked ? 'checked' : ''}></td>` : ''}
        ${columns.map(col => `<td>${row[col] ?? ''}</td>`).join("")}
        <td class="actions-col">
          <button class="row-action-btn edit-btn" data-idx="${globalIdx}" title="Edit"><i class="ri-edit-line"></i></button>
          <button class="row-action-btn delete-single-btn" data-idx="${globalIdx}" title="Delete"><i class="ri-delete-bin-line"></i></button>
        </td>
      </tr>
    `;
  }).join("");
  if (terminalSelectMode) {
    document.querySelectorAll(".row-check").forEach((cb, i) => {
      cb.addEventListener("change", function () {
        const idx = start + i;
        if (this.checked) terminalSelectedRows.add(idx); else terminalSelectedRows.delete(idx);
        updateSelectedCount(); this.closest("tr").classList.toggle("selected-row", this.checked);
      });
    });
  }
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditModal(parseInt(btn.getAttribute("data-idx"))));
  });
  document.querySelectorAll(".delete-single-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      const row = terminalFiltered[idx];
      showConfirmDeleteModal(1, async () => {
        const region = document.getElementById("regionSelect").value;
        const firstCol = Object.keys(row)[0];
        try {
          const res = await fetch(`/api/terminals/${region}`, {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column: firstCol, ids: [row[firstCol]] })
          });
          const result = await res.json();
          if (!res.ok) { showToast("Delete failed: " + (result.error || "Unknown error"), "error"); return; }
          terminalFiltered = terminalFiltered.filter(r => r !== row);
          terminalData = terminalData.filter(r => r !== row);
          const maxPage = Math.max(1, Math.ceil(terminalFiltered.length / terminalRowsPerPage));
          if (terminalPage > maxPage) terminalPage = maxPage;
          renderTerminalTable(); renderTerminalPagination();
          showToast("Record deleted successfully.", "success");
        } catch (err) { showToast("Network error — could not delete record.", "error"); }
      });
    });
  });
}

function showConfirmDeleteModal(count, onConfirm) {
  const modal = document.getElementById("confirmDeleteModal");
  document.getElementById("confirmDeleteMsg").innerHTML =
    `You are about to permanently delete <strong>${count} record${count > 1 ? 's' : ''}</strong>.<br>This action <strong>cannot be undone</strong>.`;
  modal.classList.remove("hidden");
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const newConfirm = confirmBtn.cloneNode(true); confirmBtn.replaceWith(newConfirm);
  const newCancel = cancelBtn.cloneNode(true); cancelBtn.replaceWith(newCancel);
  const close = () => modal.classList.add("hidden");
  document.getElementById("cancelDeleteBtn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  document.getElementById("confirmDeleteBtn").onclick = async () => { close(); await onConfirm(); };
}

function openEditModal(idx) {
  const row = terminalFiltered[idx];
  if (!row) return;
  const cols = Object.keys(row);
  const getIcon = (col) => {
    const c = col.toLowerCase();
    if (c.includes("name") || c.includes("site")) return "ri-map-pin-line";
    if (c.includes("province") || c.includes("region")) return "ri-earth-line";
    if (c.includes("munic") || c.includes("city")) return "ri-building-line";
    if (c.includes("mac") || c.includes("airmac") || c.includes("modem")) return "ri-router-line";
    if (c.includes("phase")) return "ri-git-branch-line";
    if (c.includes("date") || c.includes("time")) return "ri-calendar-line";
    if (c.includes("status")) return "ri-checkbox-circle-line";
    return "ri-input-field";
  };
  document.getElementById("editRowFields").innerHTML = cols.map(col => `
    <div class="add-field-item">
      <label class="add-field-label"><i class="${getIcon(col)}"></i> ${col}</label>
      <input type="text" data-col="${col}" class="add-field-input edit-field-input"
        value="${String(row[col] ?? '').replace(/"/g, '&quot;')}" autocomplete="off">
    </div>
  `).join("");
  const modal = document.getElementById("editRowModal");
  modal.classList.remove("hidden");
  const close = () => modal.classList.add("hidden");
  document.getElementById("cancelEditRow").onclick = close;
  document.getElementById("cancelEditRowFooter").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  document.getElementById("confirmEditRow").onclick = async () => {
    const updatedRow = {};
    cols.forEach(col => { const input = modal.querySelector(`[data-col="${col}"]`); updatedRow[col] = input ? input.value.trim() : row[col]; });
    const saveBtn = document.getElementById("confirmEditRow");
    saveBtn.disabled = true; saveBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Saving…';
    const region = document.getElementById("regionSelect").value;
    const firstCol = cols[0];
    try {
      const res = await fetch(`/api/terminals/${region}/${encodeURIComponent(row[firstCol])}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: firstCol, data: updatedRow })
      });
      const result = await res.json();
      if (!res.ok) { showToast("Update failed: " + (result.error || "Unknown error"), "error"); return; }
      const saved = result.row || updatedRow;
      const fIdx = terminalFiltered.indexOf(row); const dIdx = terminalData.indexOf(row);
      if (fIdx !== -1) terminalFiltered[fIdx] = saved;
      if (dIdx !== -1) terminalData[dIdx] = saved;
      renderTerminalTable(); close(); showToast("Record updated successfully.", "success");
    } catch (err) { showToast("Network error — could not update record.", "error"); }
    finally { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="ri-save-line"></i> Save Changes'; }
  };
}

function openAddModal() {
  if (!terminalData.length) return;
  const cols = Object.keys(terminalData[0]);
  const getIcon = (col) => {
    const c = col.toLowerCase();
    if (c.includes("name") || c.includes("site")) return "ri-map-pin-line";
    if (c.includes("province") || c.includes("region")) return "ri-earth-line";
    if (c.includes("munic") || c.includes("city")) return "ri-building-line";
    if (c.includes("mac") || c.includes("airmac") || c.includes("modem")) return "ri-router-line";
    if (c.includes("phase")) return "ri-git-branch-line";
    if (c.includes("date") || c.includes("time")) return "ri-calendar-line";
    if (c.includes("status")) return "ri-checkbox-circle-line";
    return "ri-input-field";
  };
  document.getElementById("addRowFields").innerHTML = cols.map(col => `
    <div class="add-field-item">
      <label class="add-field-label"><i class="${getIcon(col)}"></i> ${col}</label>
      <input type="text" data-col="${col}" class="add-field-input" placeholder="Enter ${col.toLowerCase()}…" autocomplete="off">
    </div>
  `).join("");
  const modal = document.getElementById("addRowModal");
  modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");
  document.getElementById("cancelAddRow").onclick = closeModal;
  document.getElementById("cancelAddRowFooter").onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  document.getElementById("confirmAddRow").onclick = async () => {
    const newRow = {};
    cols.forEach(col => { const input = document.querySelector(`[data-col="${col}"]`); newRow[col] = input ? input.value.trim() : ""; });
    const saveBtn = document.getElementById("confirmAddRow");
    saveBtn.disabled = true; saveBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Saving…';
    try {
      const region = document.getElementById("regionSelect").value;
      const res = await fetch(`/api/terminals/${region}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newRow)
      });
      const result = await res.json();
      if (!res.ok) { alert("Failed to save: " + (result.error || "Unknown error")); return; }
      const saved = result.row || newRow;
      terminalData.unshift(saved); terminalFiltered = [...terminalData];
      terminalPage = 1; renderTerminalTable(); renderTerminalPagination(); closeModal();
    } catch (err) { console.error("Save error:", err); alert("Network error — could not save the terminal."); }
    finally { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="ri-save-line"></i> Save Terminal'; }
  };
}

function updateSelectedCount() { document.getElementById("selectedCount").innerText = `${terminalSelectedRows.size} rows selected`; }

function renderTerminalPagination() {
  const container = document.getElementById("terminalPagination");
  const total = Math.ceil(terminalFiltered.length / terminalRowsPerPage);
  if (total <= 1) { container.innerHTML = ""; return; }
  const start = (terminalPage - 1) * terminalRowsPerPage + 1;
  const end = Math.min(terminalPage * terminalRowsPerPage, terminalFiltered.length);
  let pages = [];
  pages.push({ label: '<i class="ri-arrow-left-s-line"></i>', page: terminalPage - 1, disabled: terminalPage === 1 });
  getPageRange(terminalPage, total).forEach(p => {
    if (p === '...') pages.push({ label: '…', page: null, dots: true });
    else pages.push({ label: p, page: p, active: p === terminalPage });
  });
  pages.push({ label: '<i class="ri-arrow-right-s-line"></i>', page: terminalPage + 1, disabled: terminalPage === total });
  container.innerHTML = `
    <span class="page-info">Showing ${start}–${end} of ${terminalFiltered.length}</span>
    <div class="page-buttons">
      ${pages.map(p => `<button class="page-btn ${p.active ? 'active' : ''} ${p.disabled ? 'disabled' : ''} ${p.dots ? 'dots' : ''}"
        ${p.page && !p.disabled && !p.dots ? `onclick="goTerminalPage(${p.page})"` : ''} ${p.disabled ? 'disabled' : ''}>${p.label}</button>`).join("")}
    </div>
  `;
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function goTerminalPage(page) {
  terminalPage = page; renderTerminalTable(); renderTerminalPagination();
  document.querySelector(".terminals-table-wrapper").scrollTop = 0;
}

function applyTerminalSearch() {
  const q = document.getElementById("terminalSearch").value.toLowerCase();
  terminalFiltered = terminalData.filter(row => Object.values(row).some(v => String(v ?? "").toLowerCase().includes(q)));
}

/* ================= TOAST ================= */

function showToast(message, type = "success") {
  const existing = document.getElementById("toastNotif");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toastNotif";
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("toast-show"), 10);
  setTimeout(() => { toast.classList.remove("toast-show"); setTimeout(() => toast.remove(), 400); }, 3500);
}

/* ================= DASHBOARD ================= */

function loadDashboard() {
  mainContent.innerHTML = `
    <div class="topbar">
      <div class="left"><h2>Welcome back, ${user.full_name || user.email}</h2></div>
      <div class="right">
        <div class="search-box">
          <i class="ri-search-line"></i>
          <input type="text" placeholder="Search here">
        </div>
        <button id="darkToggle" class="icon-btn" title="Toggle Dark Mode"><i class="ri-moon-line"></i></button>
      </div>
    </div>
    <h3 class="section-title">Overview</h3>
    <div class="cards">
      <div class="card">
        <div class="card-top">
          <div class="icon-box blue"><i class="ri-map-pin-2-line"></i></div>
          <div class="stat"><h1 class="counter" data-target="438">0</h1><span class="trend up">↑ +3%</span></div>
        </div>
        <p>Total Sites</p>
      </div>
      <div class="card">
        <div class="card-top">
          <div class="icon-box green"><i class="ri-shield-check-line"></i></div>
          <div class="stat"><h1 class="counter" data-target="420">0</h1><span class="trend up">↑ +5%</span></div>
        </div>
        <p>Active Sites</p>
      </div>
      <div class="card alert-card">
        <div class="card-top">
          <div class="icon-box orange pulse"><i class="ri-error-warning-line"></i></div>
          <div class="stat"><h1 class="counter" data-target="18">0</h1><span class="trend down">↓ -2%</span></div>
        </div>
        <p>Problematic Sites</p>
      </div>
      <div class="card">
        <div class="card-top">
          <div class="icon-box red"><i class="ri-alarm-warning-line"></i></div>
          <div class="stat"><h1 class="counter" data-target="6">0</h1><span class="trend down">↓ -1%</span></div>
        </div>
        <p>Open Incidents</p>
      </div>
    </div>
    <div class="table-container">
      <div class="table-title"><i class="ri-file-list-3-line"></i> Recent Incident Reports</div>
      <table>
        <thead><tr><th>Ticket ID</th><th>Province</th><th>Issue</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>INC-1023</td><td>Province 1</td><td>No Signal</td><td><span class="badge high">High</span></td><td><span class="badge completed">Completed</span></td></tr>
          <tr><td>INC-1024</td><td>Province 2</td><td>Power Failure</td><td><span class="badge medium">Medium</span></td><td><span class="badge progress">In Progress</span></td></tr>
          <tr><td>INC-1025</td><td>Province 3</td><td>Battery Low</td><td><span class="badge low">Low</span></td><td><span class="badge pending">Pending</span></td></tr>
        </tbody>
      </table>
    </div>
  `;
  document.getElementById("darkToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const icon = document.querySelector("#darkToggle i");
    icon.className = document.body.classList.contains("dark") ? "ri-sun-line" : "ri-moon-line";
  });
  runCounters();
}

/* ================= PROBLEMATIC SITES ================= */

let probData = [];
let probFiltered = [];
let probPage = 1;
const probRowsPerPage = 10;
let probSortDir = 1;
let probSelectedRows = new Set();
let probSelectMode = false;
let probCurrentRegion = "all";

const PROB_COLUMNS = [
  { key: "Sitename",                         icon: "ri-map-pin-line",         type: "text" },
  { key: "Province",                          icon: "ri-earth-line",           type: "text" },
  { key: "Municipality",                      icon: "ri-building-line",        type: "text" },
  { key: "Region",                            icon: "ri-map-2-line",           type: "select",
    options: ["Benguet", "Ifugao", "Ilocos", "Kalinga", "Pangasinan", "Quezon"] },
  { key: "Status",                            icon: "ri-checkbox-circle-line", type: "select",
    options: ["Offline", "Online", "In Progress", "For Monitoring", "Unknown"] },
  { key: "Cause (Assume)",                    icon: "ri-question-line",        type: "text" },
  { key: "Remarks",                           icon: "ri-chat-3-line",          type: "textarea" },
  { key: "KAD Name",                          icon: "ri-user-line",            type: "text" },
  { key: "KAD Visit Date",                    icon: "ri-calendar-line",        type: "date" },
  { key: "Site Online Date",                  icon: "ri-calendar-check-line",  type: "date" },
  { key: "Found Problem / Cause in the Site", icon: "ri-bug-line",             type: "textarea" },
  { key: "Solution",                          icon: "ri-tools-line",           type: "textarea" },
];

function applyProbRegionFilter() {
  if (probCurrentRegion === "all") {
    probFiltered = [...probData];
  } else {
    probFiltered = probData.filter(row =>
      String(row["Region"] ?? "").toLowerCase() === probCurrentRegion.toLowerCase() ||
      String(row["Province"] ?? "").toLowerCase().includes(probCurrentRegion.toLowerCase()) ||
      String(row["Municipality"] ?? "").toLowerCase().includes(probCurrentRegion.toLowerCase())
    );
  }
}

async function loadProblematicSites() {
  // Reset state each time the page loads
  probData = []; probFiltered = []; probPage = 1;
  probSelectedRows = new Set(); probSelectMode = false;
  probCurrentRegion = "all";

  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-error-warning-line"></i> Problematic Sites</h2>
      <div class="terminals-actions">
        <div class="dropdown-wrapper">
          <button class="dropdown-btn"><i class="ri-map-pin-2-line"></i> <span id="probRegionLabel">All Regions</span> <i class="ri-arrow-down-s-line"></i></button>
          <select id="probRegionSelect" class="hidden-select">
            <option value="all">All Regions</option>
            <option value="benguet">Benguet</option>
            <option value="ifugao">Ifugao</option>
            <option value="ilocos">Ilocos</option>
            <option value="kalinga">Kalinga</option>
            <option value="pangasinan">Pangasinan</option>
            <option value="quezon">Quezon</option>
          </select>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <span>Problematic Sites Records</span>
        <div class="table-tools">
          <button class="tool-btn" id="probBtnAdd"><i class="ri-add-line"></i> Add</button>
          <button class="tool-btn" id="probBtnSortFilter"><i class="ri-sliders-h-line"></i> Sort & Filter</button>
          <button class="tool-btn" id="probBtnSelect"><i class="ri-checkbox-multiple-line"></i> Select</button>
        </div>
      </div>

      <div id="probSortFilterBar" class="filter-bar hidden">
        <div class="filter-group">
          <label>Province</label>
          <input type="text" id="probFilterProvince" placeholder="e.g. BENGUET">
        </div>
        <div class="filter-group">
          <label>Municipality</label>
          <input type="text" id="probFilterMuni" placeholder="e.g. ATOK">
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select id="probFilterStatus" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;outline:none;background:white;">
            <option value="">All Statuses</option>
            <option>Offline</option>
            <option>Online</option>
            <option>In Progress</option>
            <option>For Monitoring</option>
            <option>Unknown</option>
          </select>
        </div>
        <div class="filter-sort-divider"></div>
        <div class="filter-group">
          <label>Sort by</label>
          <select id="probSortColSelect" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:13px;outline:none;background:white;">
            ${PROB_COLUMNS.map(c => `<option value="${c.key}">${c.key}</option>`).join("")}
          </select>
        </div>
        <button class="tool-btn" id="probToggleSortDir"><i class="ri-arrow-up-line"></i> ASC</button>
        <button class="tool-btn apply-btn" id="probApplyFilterSort"><i class="ri-check-line"></i> Apply</button>
        <button class="tool-btn" id="probClearFilterSort"><i class="ri-close-line"></i> Clear</button>
      </div>

      <div id="probBulkActions" class="bulk-actions hidden">
        <span id="probSelectedCount">0 rows selected</span>
        <button class="tool-btn danger-btn" id="probDeleteSelected"><i class="ri-delete-bin-line"></i> Delete Selected</button>
        <button class="tool-btn" id="probExportSelected"><i class="ri-download-line"></i> Export CSV</button>
      </div>

      <div class="table-wrapper terminals-table-wrapper">
        <table class="data-grid terminals-grid">
          <thead id="probThead"></thead>
          <tbody id="probTbody">
            <tr><td colspan="15" class="loading-cell"><i class="ri-loader-4-line spin"></i> Loading data…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar" id="probPagination"></div>
    </div>

    <!-- Confirm Delete Modal -->
    <div id="probConfirmDeleteModal" class="modal-overlay hidden">
      <div class="modal-box confirm-modal-box">
        <div class="confirm-modal-icon danger-icon"><i class="ri-delete-bin-2-line"></i></div>
        <h3 class="confirm-modal-title">Delete Records</h3>
        <p class="confirm-modal-msg" id="probConfirmDeleteMsg">Are you sure?</p>
        <div class="confirm-modal-actions">
          <button class="tool-btn" id="probCancelDeleteBtn">Cancel</button>
          <button class="tool-btn danger-btn" id="probConfirmDeleteBtn"><i class="ri-delete-bin-line"></i> Yes, Delete</button>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div id="probAddModal" class="modal-overlay hidden">
      <div class="modal-box add-modal-box">
        <div class="add-modal-header">
          <div class="add-modal-icon"><i class="ri-error-warning-line"></i></div>
          <div class="add-modal-title">
            <h3>Add Problematic Site</h3>
            <p>Fill in the details to log a new problematic site.</p>
          </div>
          <button class="modal-close-btn" id="probCancelAdd"><i class="ri-close-line"></i></button>
        </div>
        <div class="add-modal-body">
          <div id="probAddFields" class="add-fields-grid"></div>
        </div>
        <div class="add-modal-footer">
          <span class="add-modal-hint"><i class="ri-information-line"></i> Sitename is required</span>
          <div class="modal-actions">
            <button class="tool-btn" id="probCancelAddFooter">Cancel</button>
            <button class="tool-btn apply-btn" id="probConfirmAdd"><i class="ri-save-line"></i> Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div id="probEditModal" class="modal-overlay hidden">
      <div class="modal-box add-modal-box">
        <div class="add-modal-header">
          <div class="add-modal-icon"><i class="ri-edit-line"></i></div>
          <div class="add-modal-title">
            <h3>Edit Problematic Site</h3>
            <p>Update the details for this site entry.</p>
          </div>
          <button class="modal-close-btn" id="probCancelEdit"><i class="ri-close-line"></i></button>
        </div>
        <div class="add-modal-body">
          <div id="probEditFields" class="add-fields-grid"></div>
        </div>
        <div class="add-modal-footer">
          <span class="add-modal-hint"><i class="ri-information-line"></i> Changes are saved to the database</span>
          <div class="modal-actions">
            <button class="tool-btn" id="probCancelEditFooter">Cancel</button>
            <button class="tool-btn apply-btn" id="probConfirmEdit"><i class="ri-save-line"></i> Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Region filter
  document.getElementById("probRegionSelect").addEventListener("change", function () {
    const val = this.value;
    document.getElementById("probRegionLabel").innerText = val === "all" ? "All Regions" : val.charAt(0).toUpperCase() + val.slice(1);
    probCurrentRegion = val;
    applyProbRegionFilter();
    probPage = 1; renderProbTable(); renderProbPagination();
  });

  // Combined Sort & Filter panel
  document.getElementById("probBtnSortFilter").addEventListener("click", () => {
    document.getElementById("probSortFilterBar").classList.toggle("hidden");
    document.getElementById("probBtnSortFilter").classList.toggle("active-tool",
      !document.getElementById("probSortFilterBar").classList.contains("hidden"));
  });
  document.getElementById("probToggleSortDir").addEventListener("click", function () {
    probSortDir *= -1;
    this.innerHTML = probSortDir === 1 ? '<i class="ri-arrow-up-line"></i> ASC' : '<i class="ri-arrow-down-line"></i> DESC';
  });

  document.getElementById("probApplyFilterSort").addEventListener("click", () => {
    const prov = document.getElementById("probFilterProvince").value.trim().toUpperCase();
    const muni = document.getElementById("probFilterMuni").value.trim().toUpperCase();
    const stat = document.getElementById("probFilterStatus").value;
    const col  = document.getElementById("probSortColSelect").value;
    applyProbRegionFilter();
    if (prov) probFiltered = probFiltered.filter(r => String(r["Province"] ?? "").toUpperCase().includes(prov));
    if (muni) probFiltered = probFiltered.filter(r => String(r["Municipality"] ?? "").toUpperCase().includes(muni));
    if (stat) probFiltered = probFiltered.filter(r => String(r["Status"] ?? "") === stat);
    if (col)  probFiltered.sort((a, b) => String(a[col] ?? "").localeCompare(String(b[col] ?? ""), undefined, { numeric: true }) * probSortDir);
    probPage = 1; renderProbTable(); renderProbPagination();
    document.getElementById("probSortFilterBar").classList.add("hidden");
    document.getElementById("probBtnSortFilter").classList.remove("active-tool");
  });

  document.getElementById("probClearFilterSort").addEventListener("click", () => {
    ["probFilterProvince","probFilterMuni"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("probFilterStatus").value = "";
    document.getElementById("probToggleSortDir").innerHTML = '<i class="ri-arrow-up-line"></i> ASC';
    probSortDir = 1;
    applyProbRegionFilter();
    probPage = 1; renderProbTable(); renderProbPagination();
  });

  // Select
  document.getElementById("probBtnSelect").addEventListener("click", () => {
    probSelectMode = !probSelectMode;
    probSelectedRows.clear();
    document.getElementById("probBtnSelect").classList.toggle("active-tool", probSelectMode);
    document.getElementById("probBulkActions").classList.toggle("hidden", !probSelectMode);
    renderProbTable();
  });

  // Bulk Delete
  document.getElementById("probDeleteSelected").addEventListener("click", async () => {
    if (probSelectedRows.size === 0) { showToast("No rows selected.", "error"); return; }
    const toDeleteRows = Array.from(probSelectedRows).map(idx => probFiltered[idx]);
    showProbConfirmDeleteModal(toDeleteRows.length, async () => {
      const ids = toDeleteRows.map(r => r["id"]);
      const btn = document.getElementById("probDeleteSelected");
      btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Deleting…';
      try {
        const res = await fetch("/api/problematic-sites", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids })
        });
        const result = await res.json();
        if (!res.ok) { showToast("Delete failed: " + (result.error || "Unknown error"), "error"); return; }
        const toDeleteSet = new Set(toDeleteRows);
        probFiltered = probFiltered.filter(r => !toDeleteSet.has(r));
        probData = probData.filter(r => !toDeleteSet.has(r));
        probSelectedRows.clear();
        document.getElementById("probSelectedCount").innerText = "0 rows selected";
        const maxPage = Math.max(1, Math.ceil(probFiltered.length / probRowsPerPage));
        if (probPage > maxPage) probPage = maxPage;
        renderProbTable(); renderProbPagination();
        showToast(`${result.deleted} record(s) deleted.`, "success");
      } catch (err) { showToast("Network error — could not delete.", "error"); }
      finally { btn.disabled = false; btn.innerHTML = '<i class="ri-delete-bin-line"></i> Delete Selected'; }
    });
  });

  // Export CSV
  document.getElementById("probExportSelected").addEventListener("click", () => {
    if (probSelectedRows.size === 0) { showToast("No rows selected.", "error"); return; }
    const rows = Array.from(probSelectedRows).sort((a, b) => a - b).map(idx => probFiltered[idx]);
    const cols = Object.keys(rows[0]);
    const escape = v => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.map(escape).join(","), ...rows.map(r => cols.map(c => escape(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `problematic_sites_${Date.now()}.csv`; a.click();
  });

  // Add button
  document.getElementById("probBtnAdd").addEventListener("click", () => openProbAddModal());

  // Fetch data
  await fetchProbData();
}

async function fetchProbData() {
  try {
    const res = await fetch("/api/problematic-sites");
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    if (!data.length) {
      probData = []; probFiltered = [];
      document.getElementById("probTbody").innerHTML =
        `<tr><td colspan="15" class="empty-cell"><i class="ri-inbox-line"></i> No records yet — click <strong>Add</strong> to create the first one.</td></tr>`;
      document.getElementById("probThead").innerHTML = "";
      return;
    }
    probData = data;
    applyProbRegionFilter();
    probPage = 1;
    renderProbTable(); renderProbPagination();
  } catch (err) {
    document.getElementById("probTbody").innerHTML =
      `<tr><td colspan="15" class="error-cell"><i class="ri-error-warning-line"></i> Error loading data</td></tr>`;
  }
}

function renderProbTable() {
  const thead = document.getElementById("probThead");
  const tbody = document.getElementById("probTbody");
  if (!probFiltered.length) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td colspan="15" class="empty-cell"><i class="ri-search-line"></i> No results match your search</td></tr>`;
    return;
  }
  const columns = Object.keys(probFiltered[0]);
  const start = (probPage - 1) * probRowsPerPage;
  const pageData = probFiltered.slice(start, start + probRowsPerPage);

  thead.innerHTML = `
    <tr>
      ${probSelectMode ? '<th class="select-col"><input type="checkbox" id="probSelectAll"></th>' : ''}
      ${columns.map(col => `<th>${col}</th>`).join("")}
      <th class="actions-col">Actions</th>
    </tr>
  `;

  if (probSelectMode) {
    document.getElementById("probSelectAll").addEventListener("change", function () {
      pageData.forEach((_, i) => { const idx = start + i; if (this.checked) probSelectedRows.add(idx); else probSelectedRows.delete(idx); });
      document.getElementById("probSelectedCount").innerText = `${probSelectedRows.size} rows selected`;
      renderProbTable();
    });
  }

  tbody.innerHTML = pageData.map((row, i) => {
    const globalIdx = start + i;
    const isChecked = probSelectedRows.has(globalIdx);
    const statusVal = String(row["Status"] ?? "").toLowerCase();
    const statusClass = statusVal.includes("online") && !statusVal.includes("offline") ? "completed"
      : statusVal.includes("offline") ? "high"
      : statusVal.includes("progress") ? "progress"
      : statusVal.includes("monitoring") ? "medium" : "pending";

    return `
      <tr class="${isChecked ? 'selected-row' : ''}">
        ${probSelectMode ? `<td class="select-col"><input type="checkbox" class="prob-row-check" ${isChecked ? 'checked' : ''}></td>` : ''}
        ${columns.map(col => {
          if (col === "Status" && row[col]) return `<td><span class="badge ${statusClass}">${row[col]}</span></td>`;
          return `<td>${row[col] ?? ''}</td>`;
        }).join("")}
        <td class="actions-col">
          <button class="row-action-btn edit-btn prob-edit-btn" data-idx="${globalIdx}" title="Edit"><i class="ri-edit-line"></i></button>
          <button class="row-action-btn delete-single-btn prob-delete-btn" data-idx="${globalIdx}" title="Delete"><i class="ri-delete-bin-line"></i></button>
        </td>
      </tr>
    `;
  }).join("");

  if (probSelectMode) {
    document.querySelectorAll(".prob-row-check").forEach((cb, i) => {
      cb.addEventListener("change", function () {
        const idx = start + i;
        if (this.checked) probSelectedRows.add(idx); else probSelectedRows.delete(idx);
        document.getElementById("probSelectedCount").innerText = `${probSelectedRows.size} rows selected`;
        this.closest("tr").classList.toggle("selected-row", this.checked);
      });
    });
  }

  document.querySelectorAll(".prob-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => openProbEditModal(parseInt(btn.getAttribute("data-idx"))));
  });

  document.querySelectorAll(".prob-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      const row = probFiltered[idx];
      showProbConfirmDeleteModal(1, async () => {
        try {
          const res = await fetch("/api/problematic-sites", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [row["id"]] })
          });
          const result = await res.json();
          if (!res.ok) { showToast("Delete failed: " + (result.error || "Unknown error"), "error"); return; }
          probFiltered = probFiltered.filter(r => r !== row);
          probData = probData.filter(r => r !== row);
          const maxPage = Math.max(1, Math.ceil(probFiltered.length / probRowsPerPage));
          if (probPage > maxPage) probPage = maxPage;
          renderProbTable(); renderProbPagination();
          showToast("Record deleted successfully.", "success");
        } catch (err) { showToast("Network error — could not delete.", "error"); }
      });
    });
  });
}

function renderProbPagination() {
  const container = document.getElementById("probPagination");
  const total = Math.ceil(probFiltered.length / probRowsPerPage);
  if (total <= 1) { container.innerHTML = ""; return; }
  const start = (probPage - 1) * probRowsPerPage + 1;
  const end = Math.min(probPage * probRowsPerPage, probFiltered.length);
  const range = getPageRange(probPage, total);
  container.innerHTML = `
    <span class="page-info">Showing ${start}–${end} of ${probFiltered.length}</span>
    <div class="page-buttons">
      <button class="page-btn ${probPage===1?'disabled':''}" onclick="goProbPage(${probPage-1})" ${probPage===1?'disabled':''}><i class="ri-arrow-left-s-line"></i></button>
      ${range.map(p => p==='...' ? `<button class="page-btn dots" disabled>…</button>` : `<button class="page-btn ${p===probPage?'active':''}" onclick="goProbPage(${p})">${p}</button>`).join("")}
      <button class="page-btn ${probPage===total?'disabled':''}" onclick="goProbPage(${probPage+1})" ${probPage===total?'disabled':''}><i class="ri-arrow-right-s-line"></i></button>
    </div>
  `;
}

function goProbPage(page) {
  const total = Math.ceil(probFiltered.length / probRowsPerPage);
  if (page < 1 || page > total) return;
  probPage = page; renderProbTable(); renderProbPagination();
  document.querySelector(".terminals-table-wrapper")?.scrollTo(0, 0);
}

function showProbConfirmDeleteModal(count, onConfirm) {
  const modal = document.getElementById("probConfirmDeleteModal");
  document.getElementById("probConfirmDeleteMsg").innerHTML =
    `You are about to permanently delete <strong>${count} record${count > 1 ? 's' : ''}</strong>.<br>This action <strong>cannot be undone</strong>.`;
  modal.classList.remove("hidden");
  const confirmBtn = document.getElementById("probConfirmDeleteBtn");
  const cancelBtn = document.getElementById("probCancelDeleteBtn");
  const newConfirm = confirmBtn.cloneNode(true); confirmBtn.replaceWith(newConfirm);
  const newCancel = cancelBtn.cloneNode(true); cancelBtn.replaceWith(newCancel);
  const close = () => modal.classList.add("hidden");
  document.getElementById("probCancelDeleteBtn").onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  document.getElementById("probConfirmDeleteBtn").onclick = async () => { close(); await onConfirm(); };
}

function buildProbFields(containerId, rowData = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = PROB_COLUMNS.map(col => {
    const raw = rowData[col.key];
    const val = String(raw ?? "").replace(/"/g, "&quot;");
    let input = "";
    if (col.type === "textarea") {
      input = `<textarea data-col="${col.key}" class="add-field-input prob-textarea" rows="2">${raw ?? ""}</textarea>`;
    } else if (col.type === "select") {
      input = `<select data-col="${col.key}" class="add-field-input">
        <option value="">— Select Status —</option>
        ${col.options.map(o => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}
      </select>`;
    } else {
      input = `<input type="${col.type}" data-col="${col.key}" class="add-field-input" value="${val}" autocomplete="off">`;
    }
    return `
      <div class="add-field-item ${col.type === 'textarea' ? 'field-full' : ''}">
        <label class="add-field-label"><i class="${col.icon}"></i> ${col.key}</label>
        ${input}
      </div>
    `;
  }).join("");
}

function getProbFormData(containerId) {
  const container = document.getElementById(containerId);
  const data = {};
  PROB_COLUMNS.forEach(col => {
    const el = container.querySelector(`[data-col="${col.key}"]`);
    data[col.key] = el ? el.value.trim() : "";
  });
  return data;
}

function openProbAddModal() {
  buildProbFields("probAddFields");
  const modal = document.getElementById("probAddModal");
  modal.classList.remove("hidden");
  const close = () => modal.classList.add("hidden");
  document.getElementById("probCancelAdd").onclick = close;
  document.getElementById("probCancelAddFooter").onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  document.getElementById("probConfirmAdd").onclick = async () => {
    const newRow = getProbFormData("probAddFields");
    if (!newRow["Sitename"]) { showToast("Sitename is required.", "error"); return; }
    const btn = document.getElementById("probConfirmAdd");
    btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Saving…';
    try {
      const res = await fetch("/api/problematic-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow)
      });
      let result;
      try { result = await res.json(); } catch(e) { result = {}; }
      if (!res.ok) { showToast("Save failed: " + (result.error || res.statusText || "Unknown error"), "error"); return; }
      const saved = result.row || newRow;
      probData.unshift(saved);
      applyProbRegionFilter();
      probPage = 1; renderProbTable(); renderProbPagination();
      close(); showToast("Record added successfully.", "success");
    } catch (err) {
      console.error("Save error:", err);
      showToast("Network error: " + err.message, "error");
    }
    finally { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Save'; }
  };
}

function openProbEditModal(idx) {
  const row = probFiltered[idx];
  if (!row) return;
  buildProbFields("probEditFields", row);
  const modal = document.getElementById("probEditModal");
  modal.classList.remove("hidden");
  const close = () => modal.classList.add("hidden");
  document.getElementById("probCancelEdit").onclick = close;
  document.getElementById("probCancelEditFooter").onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };
  document.getElementById("probConfirmEdit").onclick = async () => {
    const updated = getProbFormData("probEditFields");
    const btn = document.getElementById("probConfirmEdit");
    btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Saving…';
    try {
      const res = await fetch(`/api/problematic-sites/${row["id"]}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated)
      });
      const result = await res.json();
      if (!res.ok) { showToast("Update failed: " + (result.error || "Unknown error"), "error"); return; }
      const saved = result.row || updated;
      const fIdx = probFiltered.indexOf(row); const dIdx = probData.indexOf(row);
      if (fIdx !== -1) probFiltered[fIdx] = saved;
      if (dIdx !== -1) probData[dIdx] = saved;
      renderProbTable(); close(); showToast("Record updated successfully.", "success");
    } catch (err) { showToast("Network error — could not update.", "error"); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Save Changes'; }
  };
}

/* ================= TICKETS ================= */

function loadTickets() {
  mainContent.innerHTML = `
    <h3 class="section-title">Ticket Management</h3>
    <div class="tickets-toolbar">
      <button id="openModal" class="tool-btn apply-btn"><i class="ri-add-line"></i> Create Ticket</button>
      <div class="search-box">
        <i class="ri-search-line"></i>
        <input type="text" id="ticketSearch" placeholder="Search tickets…">
      </div>
    </div>
    <div class="table-container">
      <div class="table-title"><i class="ri-ticket-2-line"></i> Tickets</div>
      <table>
        <thead><tr><th>ID</th><th>Site</th><th>Issue</th><th>Priority</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
        <tbody id="ticketTable"></tbody>
      </table>
    </div>
    <div class="pagination-bar" id="pagination"></div>
    <div id="ticketModal" class="modal-overlay hidden">
      <div class="modal-box">
        <h3><i class="ri-ticket-2-line"></i> Create Ticket</h3>
        <div class="form-group"><label>Site ID</label><input id="siteInput" placeholder="e.g. SITE-10"></div>
        <div class="form-group"><label>Issue</label><input id="issueInput" placeholder="Describe the issue"></div>
        <div class="form-group"><label>Priority</label>
          <select id="priorityInput"><option>High</option><option>Medium</option><option>Low</option></select>
        </div>
        <div class="modal-actions">
          <button id="closeModal" class="tool-btn">Cancel</button>
          <button id="saveTicket" class="tool-btn apply-btn">Save Ticket</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("ticketSearch").addEventListener("input", () => { currentPage = 1; renderTable(); renderPagination(); });
  renderTable(); renderPagination(); setupModal();
}

function getFilteredTickets() {
  const q = (document.getElementById("ticketSearch")?.value || "").toLowerCase();
  if (!q) return tickets;
  return tickets.filter(t => Object.values(t).some(v => String(v).toLowerCase().includes(q)));
}

function renderTable() {
  const table = document.getElementById("ticketTable");
  if (!table) return;
  table.innerHTML = "";
  const filtered = getFilteredTickets();
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(start, start + rowsPerPage);
  if (!paginated.length) { table.innerHTML = `<tr><td colspan="7" class="empty-cell">No tickets found</td></tr>`; return; }
  paginated.forEach(ticket => {
    table.innerHTML += `
      <tr>
        <td><strong>${ticket.id}</strong></td><td>${ticket.site}</td><td>${ticket.issue}</td>
        <td><span class="badge ${getPriorityClass(ticket.priority)}">${ticket.priority}</span></td>
        <td><select onchange="updateStatus('${ticket.id}', this.value)" class="status-select">${renderStatusOptions(ticket.status)}</select></td>
        <td>${ticket.date}</td>
        <td><button class="tool-btn danger-btn small-btn" onclick="deleteTicket('${ticket.id}')"><i class="ri-delete-bin-line"></i></button></td>
      </tr>
    `;
  });
}

function deleteTicket(id) { tickets = tickets.filter(t => t.id !== id); renderTable(); renderPagination(); }
function renderStatusOptions(current) { return ["Pending", "In Progress", "Completed"].map(s => `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`).join(""); }
function updateStatus(id, newStatus) { tickets = tickets.map(t => t.id === id ? { ...t, status: newStatus } : t); }
function getPriorityClass(priority) { return priority === "High" ? "high" : priority === "Medium" ? "medium" : "low"; }

function renderPagination() {
  const container = document.getElementById("pagination");
  if (!container) return;
  const filtered = getFilteredTickets();
  const total = Math.ceil(filtered.length / rowsPerPage);
  if (total <= 1) { container.innerHTML = ""; return; }
  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, filtered.length);
  const range = getPageRange(currentPage, total);
  container.innerHTML = `
    <span class="page-info">Showing ${start}–${end} of ${filtered.length}</span>
    <div class="page-buttons">
      <button class="page-btn ${currentPage===1?'disabled':''}" onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="ri-arrow-left-s-line"></i></button>
      ${range.map(p => p==='...' ? `<button class="page-btn dots" disabled>…</button>` : `<button class="page-btn ${p===currentPage?'active':''}" onclick="changePage(${p})">${p}</button>`).join("")}
      <button class="page-btn ${currentPage===total?'disabled':''}" onclick="changePage(${currentPage+1})" ${currentPage===total?'disabled':''}><i class="ri-arrow-right-s-line"></i></button>
    </div>
  `;
}

function changePage(page) {
  const total = Math.ceil(getFilteredTickets().length / rowsPerPage);
  if (page < 1 || page > total) return;
  currentPage = page; renderTable(); renderPagination();
}

function setupModal() {
  const modal = document.getElementById("ticketModal");
  document.getElementById("openModal").onclick = () => modal.classList.remove("hidden");
  document.getElementById("closeModal").onclick = () => modal.classList.add("hidden");
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
  document.getElementById("saveTicket").onclick = () => {
    const site = document.getElementById("siteInput").value.trim();
    const issue = document.getElementById("issueInput").value.trim();
    const priority = document.getElementById("priorityInput").value;
    if (!site || !issue) { alert("Please fill in all fields."); return; }
    tickets.unshift({ id: "TIC-" + String(Math.floor(Math.random() * 900) + 100), site, issue, priority, status: "Pending", date: new Date().toISOString().split("T")[0] });
    modal.classList.add("hidden");
    document.getElementById("siteInput").value = ""; document.getElementById("issueInput").value = "";
    currentPage = 1; renderTable(); renderPagination();
  };
}

/* ================= COUNTERS ================= */

function runCounters() {
  document.querySelectorAll(".counter").forEach(counter => {
    const target = +counter.getAttribute("data-target");
    let count = 0;
    const update = () => {
      if (count < target) { count += Math.ceil(target / 80); counter.innerText = Math.min(count, target); setTimeout(update, 12); }
      else { counter.innerText = target; }
    };
    update();
  });
}

/* ================= INITIAL LOAD ================= */
loadDashboard();