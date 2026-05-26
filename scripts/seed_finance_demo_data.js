const { Client } = require('pg');

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'demo',
  password: '12345',
  port: 5432,
};

const users = {
  executive: 1,
  finance: 2,
  noc: 3,
  admin: 10,
  bidder: 11,
  executive2: 12,
  finance2: 13,
};

function toDate(value) {
  return value;
}

async function insertRows(client, table, columns, rows) {
  if (!rows.length) return [];
  const values = [];
  const sql = rows.map((row, rowIndex) => {
    const base = rowIndex * columns.length;
    values.push(...row);
    return `(${columns.map((_, colIndex) => `$${base + colIndex + 1}`).join(', ')})`;
  }).join(', ');
  const result = await client.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${sql} RETURNING *`,
    values
  );
  return result.rows;
}

async function main() {
  const client = new Client(dbConfig);
  await client.connect();
  await client.query('BEGIN');

  try {
    await client.query(`
      TRUNCATE TABLE
        finance_collection_payments,
        finance_collections,
        finance_company_expenses,
        finance_company_income,
        finance_contributions,
        finance_budget_requests,
        finance_project_expenses,
        finance_reimbursements,
        finance_salary_advance_payments,
        finance_salary_advances,
        finance_employee_salaries,
        finance_inventory,
        finance_employees,
        finance_departments,
        finance_positions,
        employee_reimburse,
        employee_reimburse_requests,
        employee_budget_requests,
        employee_budget,
        employee_salary,
        employee_salary_advances,
        employee_salary_advance_payments
      RESTART IDENTITY CASCADE
    `);

    const departments = await insertRows(client, 'finance_departments', ['name'], [
      ['Finance & Treasury'],
      ['Billing & Collections'],
      ['Operations Support'],
      ['Payroll & Admin']
    ]);
    const deptByName = Object.fromEntries(departments.map(r => [r.name, r.id]));

    const positions = await insertRows(client, 'finance_positions', ['title'], [
      ['Finance Manager'],
      ['Treasury Analyst'],
      ['Accounts Officer'],
      ['Billing Coordinator'],
      ['Collections Officer'],
      ['Payroll Specialist'],
      ['Budget Analyst'],
      ['Compliance Analyst']
    ]);
    const posByTitle = Object.fromEntries(positions.map(r => [r.title, r.id]));

    const employees = await insertRows(client, 'finance_employees', ['full_name', 'email', 'position_id', 'department_id', 'hired_date'], [
      ['Mara Dizon', 'mara.dizon@stellarsat.com.ph', posByTitle['Finance Manager'], deptByName['Finance & Treasury'], toDate('2025-02-10')],
      ['Noel Garcia', 'noel.garcia@stellarsat.com.ph', posByTitle['Treasury Analyst'], deptByName['Finance & Treasury'], toDate('2025-04-01')],
      ['Paolo Reyes', 'paolo.reyes@stellarsat.com.ph', posByTitle['Accounts Officer'], deptByName['Finance & Treasury'], toDate('2025-03-18')],
      ['Janine Cruz', 'janine.cruz@stellarsat.com.ph', posByTitle['Billing Coordinator'], deptByName['Billing & Collections'], toDate('2025-05-06')],
      ['Rafael Lim', 'rafael.lim@stellarsat.com.ph', posByTitle['Collections Officer'], deptByName['Billing & Collections'], toDate('2025-06-03')],
      ['Ivy Santos', 'ivy.santos@stellarsat.com.ph', posByTitle['Payroll Specialist'], deptByName['Payroll & Admin'], toDate('2025-07-08')],
      ['Benedict Tan', 'benedict.tan@stellarsat.com.ph', posByTitle['Budget Analyst'], deptByName['Operations Support'], toDate('2025-08-12')],
      ['Sonia Mercado', 'sonia.mercado@stellarsat.com.ph', posByTitle['Compliance Analyst'], deptByName['Operations Support'], toDate('2025-09-09')]
    ]);
    const empByName = Object.fromEntries(employees.map(r => [r.full_name, r.id]));

    const financeInventory = await insertRows(client, 'finance_inventory', ['item_name', 'category', 'quantity', 'unit_price', 'status', 'notes', 'created_by'], [
      ['Laser Printer Toner Set', 'Office Supplies', 8, 1850, 'in_stock', 'Allocated to finance document printing and sign-off packets', users.finance],
      ['Portable Document Scanner', 'IT Equipment', 2, 12600, 'in_stock', 'Used for invoice archiving and receipt capture', users.admin],
      ['USB-C Docking Station', 'IT Equipment', 6, 6200, 'in_stock', 'Assigned to finance workstations and loaner desks', users.finance2],
      ['Receipt Paper Rolls', 'Office Supplies', 24, 280, 'in_stock', 'For cash receipts and petty cash logs', users.finance],
      ['Network Test Router', 'Network Equipment', 1, 9800, 'low_stock', 'Spare unit for troubleshooting the finance VLAN uplink', users.noc],
      ['UPS Battery Pack', 'Power Equipment', 2, 16500, 'low_stock', 'For the finance records cabinet and workstation backup', users.admin]
    ]);

    await insertRows(client, 'finance_company_income', ['date', 'description', 'category', 'amount', 'status', 'notes', 'created_by', 'lot', 'source', 'project_name', 'or_number'], [
      [toDate('2026-04-02'), 'Client settlement for Project Aurora', 'Collection', 280000, 'completed', 'Official receipt matched to deposit confirmation', users.finance, 'Lot A', 'Client Remittance', 'Project Aurora', 'OR-2026-0001'],
      [toDate('2026-04-09'), 'Service fee for network maintenance', 'Service Revenue', 145000, 'completed', 'Monthly support retainer received in full', users.finance, 'Lot B', 'Service Contract', 'Network Support', 'OR-2026-0002'],
      [toDate('2026-04-16'), 'Collection from Project North Ridge', 'Collection', 190000, 'completed', 'Applied to the April collections ledger', users.admin, 'Lot C', 'Client Remittance', 'Project North Ridge', 'OR-2026-0003'],
      [toDate('2026-04-23'), 'Equipment rental reimbursement', 'Other Income', 65000, 'pending', 'Pending final posting after bank clearing', users.finance2, 'Lot D', 'Partner Remittance', 'Shared Equipment', 'OR-2026-0004'],
      [toDate('2026-05-05'), 'Consulting and deployment support', 'Service Revenue', 225000, 'completed', 'Included in the April-May service cycle', users.finance, 'Lot E', 'Service Contract', 'Deployment Services', 'OR-2026-0005'],
      [toDate('2026-05-15'), 'Collection for Project East Spur', 'Collection', 210000, 'completed', 'Recorded after confirmation from field operations', users.executive, 'Lot F', 'Client Remittance', 'Project East Spur', 'OR-2026-0006']
    ]);

    await insertRows(client, 'finance_company_expenses', ['date', 'description', 'category', 'amount', 'status', 'notes', 'created_by', 'expense_group', 'vendor'], [
      [toDate('2026-04-03'), 'Office rent and utilities', 'Overhead', 84000, 'completed', 'April overhead allocation', users.finance, 'operations', 'Northbay Property Services'],
      [toDate('2026-04-07'), 'Internet backbone and leased line', 'Telecom', 56000, 'completed', 'Primary internet circuit and backup link', users.noc, 'operations', 'FiberLink Communications'],
      [toDate('2026-04-14'), 'Finance printer paper and consumables', 'Supplies', 12800, 'completed', 'Printing materials for receipts and reports', users.finance2, 'expenses', 'PaperWorks Trading'],
      [toDate('2026-04-26'), 'Accounting software subscription', 'Software', 23000, 'pending', 'Renewal processed for next billing cycle', users.finance, 'operations', 'LedgerPro Systems'],
      [toDate('2026-05-08'), 'Vehicle fuel for site visits', 'Logistics', 18750, 'completed', 'Used for branch and site coordination', users.admin, 'expenses', 'Caltex'],
      [toDate('2026-05-20'), 'Equipment repair allowance', 'Maintenance', 29500, 'completed', 'Spare device diagnostics and bench repair parts', users.noc, 'operations', 'TechFix Services']
    ]);

    await insertRows(client, 'finance_project_expenses', ['date', 'project_name', 'type', 'description', 'category', 'vendor', 'amount', 'status', 'notes', 'created_by'], [
      [toDate('2026-04-05'), 'Project Aurora', 'expenses', 'Tower hardware and cabling', 'Materials', 'Apex Telecom Supply', 76000, 'completed', 'Delivered to the project warehouse', users.noc],
      [toDate('2026-04-12'), 'Project North Ridge', 'expenses', 'Field installation transport', 'Logistics', 'RideLink Transport', 18500, 'completed', 'Crew transport and equipment hauling', users.finance],
      [toDate('2026-04-21'), 'Project East Spur', 'expenses', 'Permits and coordination fees', 'Permits', 'Municipal Desk', 14000, 'pending', 'Awaiting final acknowledgment of receipt', users.admin],
      [toDate('2026-04-29'), 'Project South Link', 'expenses', 'Materials and splicing kit', 'Materials', 'SignalWorks Depot', 52000, 'completed', 'Consumed during site cutover', users.finance2],
      [toDate('2026-05-10'), 'Project Coastal Segment', 'expenses', 'Power backup and UPS replacement', 'Equipment', 'PowerGrid Supply', 33000, 'completed', 'Installed at the pop site', users.noc],
      [toDate('2026-05-18'), 'Project West Spur', 'expenses', 'Testing and field validation', 'Labor', 'FieldOps Services', 22000, 'pending', 'Pending final acceptance sign-off', users.executive],
      [toDate('2026-05-21'), 'DICT438', 'expenses', 'Finance closeout documents and release processing', 'Administration', 'Finance Records Unit', 14500, 'pending', 'Sample project 438 entry for finance role demo', users.finance]
    ]);

    const collections = await insertRows(client, 'finance_collections', ['date', 'client_name', 'project_name', 'or_number', 'due_date', 'amount_due', 'amount_collected', 'status', 'notes', 'created_by'], [
      [toDate('2026-04-01'), 'Aurora Communications', 'Project Aurora', 'OR-2026-0101', toDate('2026-04-15'), 280000, 280000, 'completed', 'Collected in full and reconciled', users.finance],
      [toDate('2026-04-08'), 'North Ridge Holdings', 'Project North Ridge', 'OR-2026-0102', toDate('2026-04-22'), 190000, 120000, 'pending', 'Partial payment received, balance outstanding', users.admin],
      [toDate('2026-04-15'), 'East Spur Trading', 'Project East Spur', 'OR-2026-0103', toDate('2026-04-29'), 210000, 210000, 'completed', 'Fully settled before month-end', users.finance2],
      [toDate('2026-04-20'), 'South Link Services', 'Project South Link', 'OR-2026-0104', toDate('2026-05-05'), 165000, 50000, 'pending', 'Waiting on the second tranche payment', users.finance],
      [toDate('2026-05-02'), 'Coastal Segment Corp.', 'Project Coastal Segment', 'OR-2026-0105', toDate('2026-05-16'), 240000, 240000, 'completed', 'Reconciled with bank deposit', users.executive],
      [toDate('2026-05-12'), 'West Spur Enterprises', 'Project West Spur', 'OR-2026-0106', toDate('2026-05-26'), 155000, 0, 'pending', 'Invoice dispatched, awaiting collection', users.finance]
    ]);

    const collectionPayments = [
      [collections[0].id, 280000, toDate('2026-04-15'), 'Paid'],
      [collections[1].id, 70000, toDate('2026-04-18'), 'Paid'],
      [collections[1].id, 50000, toDate('2026-04-25'), 'Pending'],
      [collections[2].id, 210000, toDate('2026-04-29'), 'Paid'],
      [collections[3].id, 50000, toDate('2026-05-06'), 'Pending'],
      [collections[4].id, 240000, toDate('2026-05-16'), 'Paid']
    ];
    await insertRows(client, 'finance_collection_payments', ['collection_id', 'amount_paid', 'date', 'status'], collectionPayments);

    await insertRows(client, 'finance_contributions', ['name', 'type', 'employee_share', 'employer_share', 'due_date', 'status', 'recorded_by'], [
      ['SSS Contribution', 'Statutory', 4500, 9000, toDate('2026-04-30'), 'Paid', users.finance],
      ['PhilHealth Contribution', 'Statutory', 1800, 1800, toDate('2026-04-30'), 'Paid', users.finance],
      ['Pag-IBIG Contribution', 'Statutory', 600, 600, toDate('2026-04-30'), 'Unpaid', users.admin],
      ['Withholding Tax', 'Regulatory', 0, 12500, toDate('2026-04-30'), 'Unpaid', users.finance2]
    ]);

    const budgetRequests = await insertRows(client, 'finance_budget_requests', ['employee_id', 'date', 'description', 'amount', 'status', 'comments'], [
      [empByName['Benedict Tan'], toDate('2026-04-10'), 'Budget for project field calibration and travel', 42000, 'Pending', 'Queued for finance review'],
      [empByName['Janine Cruz'], toDate('2026-04-18'), 'Budget for client billing printouts and courier fees', 12000, 'Approved', 'Approved for April operations'],
      [empByName['Ivy Santos'], toDate('2026-05-03'), 'Payroll support and overtime processing budget', 31000, 'Pending', 'Awaiting department head sign-off'],
      [empByName['Sonia Mercado'], toDate('2026-05-09'), 'Compliance audit materials and records', 17500, 'Rejected', 'Request revised for missing vendor quotes']
    ]);

    await insertRows(client, 'finance_reimbursements', ['employee_id', 'date', 'description', 'amount', 'status', 'comments'], [
      [empByName['Paolo Reyes'], toDate('2026-04-06'), 'Courier reimbursement for document delivery', 1600, 'Approved', 'Paid through payroll'],
      [empByName['Rafael Lim'], toDate('2026-04-14'), 'Fuel reimbursement for collection route', 2850, 'Pending', 'Awaiting receipt verification'],
      [empByName['Mara Dizon'], toDate('2026-05-07'), 'Client meeting snacks and refreshments', 1350, 'Approved', 'Approved by finance director'],
      [empByName['Noel Garcia'], toDate('2026-05-15'), 'Bank transfer charges and cash handling', 890, 'Rejected', 'Duplicate claim']
    ]);

    const salaryAdvances = await insertRows(client, 'finance_salary_advances', ['employee_id', 'amount_borrowed', 'remaining_balance', 'date_borrowed', 'status', 'remarks'], [
      [empByName['Ivy Santos'], 5000, 2000, toDate('2026-04-05'), 'Approved', 'First payroll advance'],
      [empByName['Janine Cruz'], 8000, 8000, toDate('2026-04-20'), 'Pending', 'Awaiting payroll approval'],
      [empByName['Benedict Tan'], 10000, 4000, toDate('2026-05-02'), 'Approved', 'Used for field travel'],
      [empByName['Sonia Mercado'], 3500, 0, toDate('2026-05-13'), 'Released', 'Fully settled in May']
    ]);

    await insertRows(client, 'finance_salary_advance_payments', ['advance_id', 'amount_paid', 'date', 'status'], [
      [salaryAdvances[0].id, 3000, toDate('2026-04-20'), 'Paid'],
      [salaryAdvances[2].id, 6000, toDate('2026-05-15'), 'Paid'],
      [salaryAdvances[3].id, 3500, toDate('2026-05-20'), 'Paid']
    ]);

    await insertRows(client, 'finance_employee_salaries', ['employee_id', 'employee_name', 'position', 'department', 'current_salary', 'salary_date', 'date', 'period_start', 'period_end', 'status'], [
      [empByName['Mara Dizon'], 'Mara Dizon', 'Finance Manager', 'Finance & Treasury', 68000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Noel Garcia'], 'Noel Garcia', 'Treasury Analyst', 'Finance & Treasury', 52000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Paolo Reyes'], 'Paolo Reyes', 'Accounts Officer', 'Finance & Treasury', 48000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Janine Cruz'], 'Janine Cruz', 'Billing Coordinator', 'Billing & Collections', 43000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Rafael Lim'], 'Rafael Lim', 'Collections Officer', 'Billing & Collections', 41000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Ivy Santos'], 'Ivy Santos', 'Payroll Specialist', 'Payroll & Admin', 47000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Benedict Tan'], 'Benedict Tan', 'Budget Analyst', 'Operations Support', 50000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active'],
      [empByName['Sonia Mercado'], 'Sonia Mercado', 'Compliance Analyst', 'Operations Support', 46000, toDate('2026-05-25'), toDate('2026-05-25'), toDate('2026-05-01'), toDate('2026-05-31'), 'Active']
    ]);

    await insertRows(client, 'employee_reimburse_requests', ['employee_name', 'role', 'request_date', 'description', 'amount', 'status', 'comment'], [
      ['Mara Dizon', 'Finance Manager', toDate('2026-04-08'), 'Client meeting refreshments and coordination materials', 2200, 'Approved', 'Approved for reimbursement'],
      ['Janine Cruz', 'Billing Coordinator', toDate('2026-04-16'), 'Courier and billing envelope costs', 950, 'Pending', 'Awaiting review'],
      ['Ivy Santos', 'Payroll Specialist', toDate('2026-05-04'), 'Payroll note pads and stationery', 780, 'Approved', 'Processed through payroll'],
      ['Sonia Mercado', 'Compliance Analyst', toDate('2026-05-10'), 'Audit printing and binder set', 1450, 'Rejected', 'Duplicate request']
    ]);

    await insertRows(client, 'employee_reimburse', ['employee_name', 'roles', 'date', 'description', 'amount', 'status', 'comment'], [
      ['Noel Garcia', 'Treasury Analyst', toDate('2026-04-11'), 'Bank fee reimbursement for cash deposit run', 560, 'Pending', 'Queued for approval'],
      ['Paolo Reyes', 'Accounts Officer', toDate('2026-04-19'), 'Parking and travel reimbursement for vendor meeting', 1200, 'Approved', 'Processed with payroll'],
      ['Benedict Tan', 'Budget Analyst', toDate('2026-05-07'), 'Field note books and calibration markers', 640, 'Approved', 'Approved for payment'],
      ['Rafael Lim', 'Collections Officer', toDate('2026-05-14'), 'Route tolls for collection visit', 900, 'Pending', 'Receipt verified']
    ]);

    await insertRows(client, 'employee_budget_requests', ['employee_name', 'role', 'request_date', 'description', 'amount', 'status', 'comment'], [
      ['Mara Dizon', 'Finance Manager', toDate('2026-04-03'), 'Budget for finance workflow automation', 45000, 'Approved', 'Approved by executive'],
      ['Noel Garcia', 'Treasury Analyst', toDate('2026-04-22'), 'Budget for bank reconciliation tools', 18000, 'Pending', 'Waiting on procurement check'],
      ['Ivy Santos', 'Payroll Specialist', toDate('2026-05-06'), 'Budget for payroll slips and secure envelopes', 13500, 'Approved', 'Released from admin budget'],
      ['Sonia Mercado', 'Compliance Analyst', toDate('2026-05-19'), 'Budget for compliance archive boxes', 9600, 'Rejected', 'Needs revised quotation']
    ]);

    await insertRows(client, 'employee_budget', ['employee_name', 'roles', 'date', 'description', 'amount', 'status', 'comment'], [
      ['Mara Dizon', 'Finance Manager', toDate('2026-04-12'), 'Finance dashboard review materials', 12000, 'Approved', 'Used for planning'],
      ['Janine Cruz', 'Billing Coordinator', toDate('2026-04-24'), 'Courier fee allocation', 4200, 'Pending', 'Awaiting finance approval'],
      ['Benedict Tan', 'Budget Analyst', toDate('2026-05-08'), 'Project tracker printing and binders', 7600, 'Approved', 'Approved and recorded'],
      ['Rafael Lim', 'Collections Officer', toDate('2026-05-18'), 'Collection route supplies', 3900, 'Pending', 'Pending follow-up']
    ]);

    await insertRows(client, 'employee_salary', ['employee_name', 'roles', 'date', 'description', 'amount', 'status', 'comment'], [
      ['Mara Dizon', 'Finance Manager', toDate('2026-04-30'), 'April payroll entry', 68000, 'Paid', 'Processed successfully'],
      ['Noel Garcia', 'Treasury Analyst', toDate('2026-04-30'), 'April payroll entry', 52000, 'Paid', 'Processed successfully'],
      ['Janine Cruz', 'Billing Coordinator', toDate('2026-04-30'), 'April payroll entry', 43000, 'Paid', 'Processed successfully'],
      ['Ivy Santos', 'Payroll Specialist', toDate('2026-04-30'), 'April payroll entry', 47000, 'Paid', 'Processed successfully']
    ]);

    const employeeAdvances = await insertRows(client, 'employee_salary_advances', ['employee_name', 'advance_amount', 'balance', 'advance_date', 'status'], [
      ['Ivy Santos', 6000, 2500, toDate('2026-04-10'), 'Pending'],
      ['Janine Cruz', 7500, 7500, toDate('2026-04-18'), 'Pending'],
      ['Benedict Tan', 10000, 3500, toDate('2026-05-05'), 'Approved'],
      ['Sonia Mercado', 4200, 0, toDate('2026-05-15'), 'Released']
    ]);

    await insertRows(client, 'employee_salary_advance_payments', ['advance_id', 'amount_paid', 'date', 'status'], [
      [employeeAdvances[0].id, 3500, toDate('2026-04-25'), 'Pending'],
      [employeeAdvances[2].id, 6500, toDate('2026-05-20'), 'Pending'],
      [employeeAdvances[3].id, 4200, toDate('2026-05-22'), 'Pending']
    ]);

    const summary = {
      finance_departments: departments.length,
      finance_positions: positions.length,
      finance_employees: employees.length,
      finance_inventory: financeInventory.length,
      finance_company_income: 6,
      finance_company_expenses: 6,
      finance_project_expenses: 7,
      finance_collections: collections.length,
      finance_collection_payments: collectionPayments.length,
      finance_contributions: 4,
      finance_budget_requests: 4,
      finance_reimbursements: 4,
      finance_salary_advances: salaryAdvances.length,
      finance_salary_advance_payments: 3,
      finance_employee_salaries: 8,
      employee_reimburse_requests: 4,
      employee_reimburse: 4,
      employee_budget_requests: 4,
      employee_budget: 4,
      employee_salary: 4,
      employee_salary_advances: employeeAdvances.length,
      employee_salary_advance_payments: 3
    };

    await client.query('COMMIT');
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
