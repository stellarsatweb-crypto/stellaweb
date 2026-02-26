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

    document.querySelectorAll(".menu li")
      .forEach(li => li.classList.remove("active"));

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

document.getElementById("toggleSidebar")
  .addEventListener("click", () => {
    document.getElementById("sidebar")
      .classList.toggle("collapsed");
});

/* ================= TERMINALS ================= */

async function loadTerminals() {

  mainContent.innerHTML = `
  
    <div class="topbar">
      <div class="left">
        <h2>Terminals</h2>
      </div>

      <div class="right">
        <input type="text" id="terminalSearch" placeholder="Search here">
      </div>
    </div>

    <div style="margin-top:20px; margin-bottom:20px;">
      <select id="regionSelect" style="padding:10px; border-radius:8px;">
        <option value="benguet">Benguet</option>
<option value="ifugao">Ifugao</option>
<option value="ilocos">Ilocos</option>
<option value="kalinga">Kalinga</option>
<option value="pangasinan">Pangasinan</option>
<option value="quezon">Quezon</option>
      </select>

      <button id="addBtn" style="
        margin-left:15px;
        padding:10px 15px;
        border:none;
        background:#3b82f6;
        color:white;
        border-radius:8px;
        cursor:pointer;">
        + Add
      </button>
    </div>

    <div class="table-container">
      <div class="table-title">
        Terminal Records
      </div>

      <div style="overflow-x: auto; width: 100%;">
    <table border="1" width="100%" cellpadding="8">
      <thead></thead>
      <tbody id="terminalTable"></tbody>
    </table>
  </div>
    </div>
  `;

  fetchTerminals("benguet_inventory");

  document.getElementById("regionSelect")
    .addEventListener("change", (e) => {
      fetchTerminals(e.target.value);
    });

  document.getElementById("terminalSearch")
    .addEventListener("input", filterTable);
}

async function fetchTerminals(region) {
  const tbody = document.getElementById("terminalTable");
  const thead = document.querySelector("table thead");

  tbody.innerHTML = `<tr><td>Loading...</td></tr>`;

  try {
    const res = await fetch(`/api/terminals/${region}`);
    if (!res.ok) throw new Error("Server error");

    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td>No records found</td></tr>`;
      return;
    }

    // 🔥 Get all column names dynamically
    const columns = Object.keys(data[0]);

    // Build table header dynamically
    thead.innerHTML = `
      <tr>
        ${columns.map(col => `<th>${col}</th>`).join("")}
      </tr>
    `;

    // Build table rows dynamically
    tbody.innerHTML = data.map(row => `
      <tr>
        ${columns.map(col => `<td>${row[col] ?? ""}</td>`).join("")}
      </tr>
    `).join("");

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td>Error loading data</td></tr>`;
  }
}

function filterTable() {
  const input = document.getElementById("terminalSearch").value.toLowerCase();
  const rows = document.querySelectorAll("#terminalTable tr");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
}

/* ================= DASHBOARD VIEW ================= */

function loadDashboard() {

  mainContent.innerHTML = `

    <!-- TOPBAR (Dashboard Only) -->
    <div class="topbar">
      <div class="left">
        <h2>Welcome back, ${user.email}</h2>
      </div>

      <div class="right">
        <input type="text" placeholder="Search here">
        <button id="darkToggle">
          <i class="ri-moon-line"></i>
        </button>
      </div>
    </div>

    <h3 class="section-title">Overview</h3>

    <div class="cards">

      <div class="card">
        <div class="card-top">
          <div class="icon-box blue">
            <i class="ri-map-pin-2-line"></i>
          </div>
          <div class="stat">
            <h1 class="counter" data-target="438">0</h1>
            <span class="trend up">↑ +3%</span>
          </div>
        </div>
        <p>Total Sites</p>
      </div>

      <div class="card">
        <div class="card-top">
          <div class="icon-box green">
            <i class="ri-shield-check-line"></i>
          </div>
          <div class="stat">
            <h1 class="counter" data-target="420">0</h1>
            <span class="trend up">↑ +5%</span>
          </div>
        </div>
        <p>Active Sites</p>
      </div>

      <div class="card alert-card">
        <div class="card-top">
          <div class="icon-box orange pulse">
            <i class="ri-error-warning-line"></i>
          </div>
          <div class="stat">
            <h1 class="counter" data-target="18">0</h1>
            <span class="trend down">↓ -2%</span>
          </div>
        </div>
        <p>Problematic Sites</p>
      </div>

      <div class="card">
        <div class="card-top">
          <div class="icon-box red">
            <i class="ri-alarm-warning-line"></i>
          </div>
          <div class="stat">
            <h1 class="counter" data-target="6">0</h1>
            <span class="trend down">↓ -1%</span>
          </div>
        </div>
        <p>Open Incidents</p>
      </div>

    </div>

    <!-- RECENT INCIDENT TABLE -->
    <div class="table-container">
      <div class="table-title">
        <i class="ri-file-list-3-line"></i>
        Recent Incident Reports
      </div>

      <table>
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Province</th>
            <th>Issue</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>INC-1023</td>
            <td>Province 1</td>
            <td>No Signal</td>
            <td><span class="badge high">High</span></td>
            <td><span class="badge completed">Completed</span></td>
          </tr>
          <tr>
            <td>INC-1024</td>
            <td>Province 2</td>
            <td>Power Failure</td>
            <td><span class="badge medium">Medium</span></td>
            <td><span class="badge progress">In Progress</span></td>
          </tr>
          <tr>
            <td>INC-1025</td>
            <td>Province 3</td>
            <td>Battery Low</td>
            <td><span class="badge low">Low</span></td>
            <td><span class="badge pending">Pending</span></td>
          </tr>
        </tbody>
      </table>
    </div>

  `;

  /* Dark Mode Button */
  document.getElementById("darkToggle")
    .addEventListener("click", () => {
      document.body.classList.toggle("dark");
    });

  runCounters();
}

/* ================= PROBLEMATIC SITES ================= */

function loadProblematicSites() {

  mainContent.innerHTML = `
    <h3 class="section-title">Problematic Sites</h3>

    <div class="table-container">
      <div class="table-title">
        <i class="ri-error-warning-line"></i>
        Active Problematic Sites
      </div>

      <table>
        <thead>
          <tr>
            <th>Site ID</th>
            <th>Province</th>
            <th>Issue</th>
            <th>Last Reported</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SITE-001</td>
            <td>Province 1</td>
            <td>No Signal</td>
            <td>2026-02-24</td>
            <td><span class="badge high">Critical</span></td>
          </tr>
          <tr>
            <td>SITE-002</td>
            <td>Province 2</td>
            <td>Power Failure</td>
            <td>2026-02-23</td>
            <td><span class="badge medium">Warning</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/* ================= TICKETS ================= */

function loadTickets() {

  mainContent.innerHTML = `
    <h3 class="section-title">Ticket Management</h3>

    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
      <button id="openModal"
        style="padding:10px 18px; border:none; border-radius:25px;
               background:#3b82f6; color:white; cursor:pointer;">
        + Create Ticket
      </button>
    </div>

    <div class="table-container">
      <div class="table-title">
        <i class="ri-ticket-2-line"></i>
        Tickets
      </div>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Site</th>
            <th>Issue</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="ticketTable"></tbody>
      </table>
    </div>

    <div id="pagination"
      style="margin-top:20px; display:flex; justify-content:center; gap:10px;">
    </div>

    <!-- MODAL -->
    <div id="ticketModal"
      style="position:fixed; inset:0; background:rgba(0,0,0,0.4);
             display:none; align-items:center; justify-content:center;">

      <div style="background:white; padding:25px; width:400px;
                  border-radius:15px;">

        <h3>Create Ticket</h3>

        <input id="siteInput" placeholder="Site ID"
          style="width:100%; padding:10px; margin:10px 0;" />

        <input id="issueInput" placeholder="Issue"
          style="width:100%; padding:10px; margin-bottom:10px;" />

        <select id="priorityInput"
          style="width:100%; padding:10px; margin-bottom:15px;">
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <div style="text-align:right;">
          <button id="closeModal">Cancel</button>
          <button id="saveTicket">Save</button>
        </div>

      </div>
    </div>
  `;

  renderTable();
  renderPagination();
  setupModal();
}

/* ================= TABLE RENDER ================= */

function renderTable() {
  const table = document.getElementById("ticketTable");
  table.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const paginated = tickets.slice(start, start + rowsPerPage);

  paginated.forEach(ticket => {
    table.innerHTML += `
      <tr>
        <td>${ticket.id}</td>
        <td>${ticket.site}</td>
        <td>${ticket.issue}</td>

        <!-- PRIORITY WITH COLOR -->
        <td>
          <span class="badge ${getPriorityClass(ticket.priority)}">
            ${ticket.priority}
          </span>
        </td>

        <!-- STATUS DROPDOWN -->
        <td>
          <select 
            onchange="updateStatus('${ticket.id}', this.value)"
            class="status-select">
            ${renderStatusOptions(ticket.status)}
          </select>
        </td>

        <td>${ticket.date}</td>
      </tr>
    `;
  });
}

function renderStatusOptions(current) {
  const statuses = ["Pending", "In Progress", "Completed"];
  return statuses.map(status =>
    `<option value="${status}" 
      ${status === current ? "selected" : ""}>
      ${status}
    </option>`
  ).join("");
}

function updateStatus(id, newStatus, element) {

  tickets = tickets.map(ticket =>
    ticket.id === id
      ? { ...ticket, status: newStatus }
      : ticket
  );

  element.className = "status-select " + getStatusClass(newStatus);
}

function getStatusClass(status) {
  if (status === "Completed") return "status-completed";
  if (status === "In Progress") return "status-progress";
  return "status-pending";
}

function getPriorityClass(priority) {
  if (priority === "High") return "high";
  if (priority === "Medium") return "medium";
  return "low";
}

function renderPagination() {
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  const pages = Math.ceil(tickets.length / rowsPerPage);

  for (let i = 1; i <= pages; i++) {
    container.innerHTML += `
      <button onclick="changePage(${i})"
        style="padding:6px 12px; border:none; border-radius:8px;
               background:${i === currentPage ? '#3b82f6' : '#ddd'};
               cursor:pointer;">
        ${i}
      </button>
    `;
  }
}

function changePage(page) {
  currentPage = page;
  renderTable();
  renderPagination();
}

/* ================= MODAL ================= */

function setupModal() {
  const modal = document.getElementById("ticketModal");

  document.getElementById("openModal").onclick = () => {
    modal.style.display = "flex";
  };

  document.getElementById("closeModal").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("saveTicket").onclick = () => {

    const site = document.getElementById("siteInput").value;
    const issue = document.getElementById("issueInput").value;
    const priority = document.getElementById("priorityInput").value;

    if (!site || !issue) return;

    const today = new Date().toISOString().split("T")[0];

    tickets.unshift({
      id: "TIC-" + Math.floor(Math.random() * 1000),
      site,
      issue,
      priority,
      status: "Pending",
      date: today
    });

    modal.style.display = "none";
    currentPage = 1;
    renderTable();
    renderPagination();
  };
}

/* ================= COUNTERS ================= */

function runCounters() {
  const counters = document.querySelectorAll(".counter");

  counters.forEach(counter => {
    const target = +counter.getAttribute("data-target");
    let count = 0;

    const update = () => {
      if (count < target) {
        count += Math.ceil(target / 100);
        counter.innerText = count;
        setTimeout(update, 15);
      } else {
        counter.innerText = target;
      }
    };

    update();
  });
}

/* ================= INITIAL LOAD ================= */

loadDashboard();