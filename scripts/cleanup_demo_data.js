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
  noc2: 6,
  admin: 10,
  bidder: 11,
  executive2: 12,
  finance2: 13,
};

function d(dateText) {
  return dateText;
}

async function main() {
  const client = new Client(dbConfig);
  await client.connect();
  await client.query('BEGIN');

  try {
    await client.query(`
      TRUNCATE TABLE
        in_app_messages,
        ticket_information,
        leave_requests_history,
        leave_requests,
        reimbursement_requests,
        salary_increase_requests,
        report_projects,
        finance_inventory
      RESTART IDENTITY CASCADE
    `);

    const financeInventoryRows = [
      ['Office Printer Ink Set', 'Office Supplies', 6, 1850, 'in_stock', 'Reserved for finance printing and reimbursement packets', users.finance],
      ['USB-C Docking Station', 'IT Equipment', 4, 6200, 'in_stock', 'For staff laptop handover and desk setup', users.finance2],
      ['Network Test Router', 'Network Equipment', 2, 9800, 'low_stock', 'Spare unit for lab and troubleshooting use', users.noc],
    ];
    for (const row of financeInventoryRows) {
      await client.query(
        `INSERT INTO finance_inventory (item_name, category, quantity, unit_price, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        row
      );
    }

    const reportProjects = [
      {
        name: 'NOC Operations Dashboard',
        columns: [
          { key: 'mir', label: 'MIR', enabled: true },
          { key: 'ticket', label: 'Tickets', enabled: true },
          { key: 'sla', label: 'SLA', enabled: true },
          { key: 'risk', label: 'Risk', enabled: true },
        ],
      },
      {
        name: 'Executive Service Review',
        columns: [
          { key: 'mir', label: 'MIR', enabled: true },
          { key: 'ticket', label: 'Tickets', enabled: true },
          { key: 'sla', label: 'SLA', enabled: true },
          { key: 'action_owner', label: 'Action Owner', enabled: true },
        ],
      },
    ];
    for (const project of reportProjects) {
      await client.query(
        `INSERT INTO report_projects (name, columns) VALUES ($1, $2::jsonb)`,
        [project.name, JSON.stringify(project.columns)]
      );
    }

    const tickets = [
      ['L7-0001 intermittent link', 'The site is reporting intermittent packet loss after the afternoon power fluctuation. Please inspect modem stability, cable termination, and signal levels.', '00:06:39:91:34:d7', 'Open', 'NOC Department', null, null],
      ['Finance upload queue delay', 'A reimbursement receipt is not appearing in the queue after upload. Please verify the document ingest service and refresh the index.', 'FIN-OPS-2026-01', 'In Progress', 'Finance Department', null, null],
      ['Bidder document naming review', 'Bidder attachments need filename cleanup before submission. Please standardize the document naming convention across the folder.', 'BID-2026-04', 'On hold', 'Bidder', null, null],
      ['Executive summary deck update', 'The executive monthly summary requires refreshed SLA and uptime figures before the review meeting.', 'EXEC-REPORT-2026-05', 'Closed', 'Executive', null, null],
    ];
    for (const ticket of tickets) {
      await client.query(
        `INSERT INTO ticket_information (subject, description, airmac_esn, status, department, message, file_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        ticket
      );
    }

    const leaveRequests = [
      {
        employee_id: users.noc,
        department: 'NOC Department',
        position: 'NOC Engineer',
        leave_type: 'vacation',
        start_date: d('2026-06-02'),
        end_date: d('2026-06-05'),
        number_of_days: 4,
        reason: 'Family commitment and personal rest time.',
        attachment: null,
        status: 'Pending',
        remarks: null,
        handled_by_id: null,
        handled_by_name: null,
        handled_at: null,
        employee_name: 'Elina',
        employee_id_no: '678910',
      },
      {
        employee_id: users.noc2,
        department: 'NOC Department',
        position: 'NOC Team Lead',
        leave_type: 'sick',
        start_date: d('2026-06-09'),
        end_date: d('2026-06-10'),
        number_of_days: 2,
        reason: 'Medical appointment and recovery time.',
        attachment: null,
        status: 'Pending',
        remarks: null,
        handled_by_id: null,
        handled_by_name: null,
        handled_at: null,
        employee_name: 'YlynMarie',
        employee_id_no: '121314',
      },
      {
        employee_id: users.finance2,
        department: 'Finance Department',
        position: 'Finance Officer',
        leave_type: 'vacation',
        start_date: d('2026-06-12'),
        end_date: d('2026-06-14'),
        number_of_days: 3,
        reason: 'Out-of-town family matter.',
        attachment: null,
        status: 'Pending',
        remarks: null,
        handled_by_id: null,
        handled_by_name: null,
        handled_at: null,
        employee_name: 'Stella Sat',
        employee_id_no: 'FN-1001',
      },
      {
        employee_id: users.bidder,
        department: 'Bidder',
        position: 'Bidder Coordinator',
        leave_type: 'vacation',
        start_date: d('2026-06-18'),
        end_date: d('2026-06-19'),
        number_of_days: 2,
        reason: 'Site visit support and travel recovery.',
        attachment: null,
        status: 'Pending',
        remarks: null,
        handled_by_id: null,
        handled_by_name: null,
        handled_at: null,
        employee_name: 'Peng',
        employee_id_no: 'ST-1001',
      },
      {
        employee_id: users.finance,
        department: 'Finance Department',
        position: 'Finance Analyst',
        leave_type: 'others',
        start_date: d('2026-06-24'),
        end_date: d('2026-06-25'),
        number_of_days: 2,
        reason: 'Personal errands and scheduled appointment.',
        attachment: null,
        status: 'Pending',
        remarks: null,
        handled_by_id: null,
        handled_by_name: null,
        handled_at: null,
        employee_name: 'Jae',
        employee_id_no: '123',
      },
    ];

    const leaveRequestIds = [];
    for (const req of leaveRequests) {
      const result = await client.query(
        `INSERT INTO leave_requests (
          employee_id, department, position, leave_type, start_date, end_date, number_of_days,
          reason, attachment, status, remarks, handled_by_id, handled_by_name, handled_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [
          req.employee_id,
          req.department,
          req.position,
          req.leave_type,
          req.start_date,
          req.end_date,
          req.number_of_days,
          req.reason,
          req.attachment,
          req.status,
          req.remarks,
          req.handled_by_id,
          req.handled_by_name,
          req.handled_at,
        ]
      );
      leaveRequestIds.push({ id: result.rows[0].id, ...req });
    }

    for (const req of leaveRequestIds) {
      await client.query(
        `INSERT INTO leave_requests_history (
          request_id, employee_name, employee_id_no, department, position, leave_type,
          start_date, end_date, number_of_days, reason, attachment, status, remarks,
          submitted_at, updated_at, change_type, saved_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,
          NOW(), NOW(), 'INSERT', NOW()
        )`,
        [
          req.id,
          req.employee_name,
          req.employee_id_no,
          req.department,
          req.position,
          req.leave_type,
          req.start_date,
          req.end_date,
          req.number_of_days,
          req.reason,
          req.attachment,
          req.status,
          req.remarks,
        ]
      );
    }

    const reimbursements = [
      [users.admin, d('2026-05-24'), 'Admin', 'Travel', 1450, d('2026-05-26'), 'Client site travel reimbursement for inspection day.', '/uploads/reimbursements/demo-travel-receipt.pdf', 'demo-travel-receipt.pdf', 'Pending', null, null, null, null],
      [users.finance, d('2026-05-25'), 'Finance Department', 'Meal', 680, d('2026-05-25'), 'Team closeout lunch during month-end processing.', '/uploads/reimbursements/demo-meal-receipt.pdf', 'demo-meal-receipt.pdf', 'Pending', null, null, null, null],
      [users.noc, d('2026-05-25'), 'NOC Department', 'Supplies', 980, d('2026-05-27'), 'Field cable labels and replacement connectors.', '/uploads/reimbursements/demo-supplies-receipt.pdf', 'demo-supplies-receipt.pdf', 'Pending', null, null, null, null],
    ];
    for (const req of reimbursements) {
      await client.query(
        `INSERT INTO reimbursement_requests (
          requested_by, request_date, department, category, amount, expense_date,
          purpose, receipt_path, receipt_name, status, remarks, handled_by_id, handled_by_name, handled_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        req
      );
    }

    const salaryRequests = [
      [users.noc, d('2026-04-21'), 'NOC Department', 10000, 15000, d('2026-04-22'), 'Expanded responsibilities in inventory coordination and site support.', 'Pending', 'Pending review by management.', null, null, null],
      [users.finance2, d('2026-05-01'), 'Finance Department', 12000, 16500, d('2026-05-15'), 'Additional responsibilities covering reimbursements and monthly closeout.', 'Pending', 'Pending review by management.', null, null, null],
    ];
    for (const req of salaryRequests) {
      await client.query(
        `INSERT INTO salary_increase_requests (
          requested_by, request_date, department, current_salary, requested_salary,
          effective_date, justification, status, remarks, handled_by_id, handled_by_name, handled_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        req
      );
    }

    const siteUpdates = [
      [18, 'DICT Phase 4 - Executive Review', 'VSTI-18-LAGUNA-HUB', 'Done', 'NOC Field Team', d('2026-04-14'), d('2026-04-13')],
      [23, 'DICT Phase 4 - Coastal Segment', 'VSTI-23-COASTAL-EDGE', 'Done', 'Shantel Reyes', d('2026-04-13'), d('2026-04-13')],
      [24, 'DICT Phase 4 - South Link', 'VSTI-24-SOUTH-LINK', 'Done', 'Shantel Reyes', d('2026-04-13'), d('2026-04-13')],
      [26, 'DICT Phase 4 - North Ridge', 'VSTI-26-NORTH-RIDGE', 'Done', 'Jacov Santos', d('2026-04-14'), d('2026-04-14')],
      [27, 'DICT Phase 4 - West Spur', 'VSTI-27-WEST-SPUR', 'Done', 'Glenn Punzalan', d('2026-04-16'), d('2026-04-16')],
      [28, 'DICT Phase 4 - East Spur', 'VSTI-28-EAST-SPUR', 'Done', 'Chenel Cortez', d('2026-04-18'), d('2026-04-18')],
    ];
    for (const row of siteUpdates) {
      await client.query(
        `UPDATE project_sites
         SET project_name=$2, site_name=$3, status=$4, installer_name=$5, status_date=$6, acceptance_date=$7, updated_at=NOW()
         WHERE id=$1`,
        row
      );
    }

    await client.query(
      `UPDATE network_sites
       SET modem='MDM2010', transceiver='Single Coax', dish='1.2m Jonsa Satellite Dish'
       WHERE id=439`
    );

    await client.query(
      `UPDATE bidding_documents
       SET doc_type='Technical Proposal', description='Professional bid submission package for the 2026 network expansion program.'
       WHERE id=1`
    );
    await client.query(
      `UPDATE bidding_documents
       SET doc_type='Supporting Appendix', description='Supporting compliance appendix and procurement documentation.'
       WHERE id=3`
    );
    await client.query(
      `UPDATE bidding_documents
       SET doc_type='Supporting Compliance Record', description='Registration and compliance record submitted for review.', status='rejected'
       WHERE id=4`
    );
    await client.query(
      `UPDATE bidding_documents
       SET doc_type='Certificate of Registration', description='Corporate registration certificate and supporting business details.'
       WHERE id=5`
    );
    await client.query(
      `UPDATE bidding_documents
       SET doc_type='Business Plan', description='Business plan and operational summary for the bidder submission.'
       WHERE id=6`
    );
    await client.query(
      `UPDATE bidding_documents
       SET doc_type='Technical Module', description='Technical qualification module and supporting annexes.'
       WHERE id=7`
    );
    await client.query(
      `UPDATE eligibility_documents
       SET doc_name='Database Administration Certificate', category='Training', result='win', notes='Verified and accepted for the bid package.'
       WHERE id=2`
    );
    await client.query(
      `UPDATE eligibility_documents
       SET doc_name='Technical Qualifications', category='Technical', result='win', notes='Reviewed and cleared for submission.'
       WHERE id=3`
    );
    await client.query(
      `UPDATE eligibility_documents
       SET doc_name='Network Site Assessment', category='Site Survey', result='loss', notes='Requires revision before final submission.'
       WHERE id=4`
    );
    await client.query(
      `UPDATE eligibility_documents
       SET doc_name='Project Capstone Summary', category='Technical', result='win', notes='Approved as part of the standard bid package.'
       WHERE id=5`
    );
    await client.query(
      `UPDATE eligibility_documents
       SET doc_name='Training Completion Module', category='Training', result='loss', notes='Needs updated supporting evidence.'
       WHERE id=6`
    );
    await client.query(
      `UPDATE eligibility_documents
       SET doc_name='Authorization Letter', category='Legal', result='win', notes='Corporate authorization verified and complete.'
       WHERE id=7`
    );

    const messageIds = {};
    const insertMessage = async (sender_id, recipient_id, subject, body, parent_message_id = null, is_read = false) => {
      const result = await client.query(
        `INSERT INTO in_app_messages (
          sender_id, recipient_id, subject, body, is_read, parent_message_id
        ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [sender_id, recipient_id, subject, body, is_read, parent_message_id]
      );
      return result.rows[0].id;
    };

    messageIds.m1 = await insertMessage(
      users.executive,
      users.noc,
      'Welcome to NOC Messaging Platform',
      'Use this channel for operational updates, inventory coordination, and incident follow-up.'
    );
    messageIds.m2 = await insertMessage(
      users.noc,
      users.executive,
      'Re: Welcome to NOC Messaging Platform',
      'Acknowledged. We will use this thread for daily site and inventory coordination.',
      messageIds.m1,
      true
    );
    messageIds.m3 = await insertMessage(
      users.noc,
      users.finance,
      'Daily operations check-in',
      'Please confirm the latest inventory refresh and pending reimbursements before end of day.'
    );
    messageIds.m4 = await insertMessage(
      users.finance,
      users.noc,
      'Re: Daily operations check-in',
      'Confirmed. Finance will clear the reimbursement queue and share the updated file status this afternoon.',
      messageIds.m3,
      true
    );
    messageIds.m5 = await insertMessage(
      users.finance2,
      users.admin,
      'Leave coverage reminder',
      'I will be on approved leave next week. Please route urgent approvals to the admin desk while I am offline.'
    );
    messageIds.m6 = await insertMessage(
      users.admin,
      users.finance2,
      'Re: Leave coverage reminder',
      'Noted. We will cover approvals and keep the pending queue monitored during your leave.',
      messageIds.m5,
      true
    );
    messageIds.m7 = await insertMessage(
      users.bidder,
      users.noc,
      'Site validation request',
      'Please verify the latest site checklist and confirm if the modem and AP assets are tagged correctly.'
    );
    messageIds.m8 = await insertMessage(
      users.noc,
      users.bidder,
      'Re: Site validation request',
      'Checklist reviewed. The modem and AP tags are aligned with the latest inventory record.',
      messageIds.m7,
      true
    );
    messageIds.m9 = await insertMessage(
      users.admin,
      users.executive,
      'End-of-day summary',
      'The team closed the queue with no critical blockers. Remaining items are scheduled for tomorrow morning.'
    );
    messageIds.m10 = await insertMessage(
      users.executive,
      users.admin,
      'Re: End-of-day summary',
      'Thank you. Please keep the summary in the weekly review notes for leadership.'
    );

    const summary = {
      finance_inventory: financeInventoryRows.length,
      report_projects: reportProjects.length,
      ticket_information: tickets.length,
      leave_requests: leaveRequestIds.length,
      reimbursement_requests: reimbursements.length,
      salary_increase_requests: salaryRequests.length,
      in_app_messages: 10,
      project_sites: siteUpdates.length,
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
