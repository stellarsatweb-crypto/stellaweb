const fs = require('fs/promises');
const path = require('path');
const ExcelJS = require('exceljs');
const { Client } = require('pg');

const DEFAULT_WORKBOOK = 'C:/Users/Jae/Downloads/MODEM.xlsx';
const WORKBOOK_PATH = process.argv[2] || DEFAULT_WORKBOOK;

function mapStatus(rawStatus) {
  const status = String(rawStatus || '').trim().toUpperCase();
  if (status === 'WORKING') {
    return { status: 'In Stock', condition: 'Good' };
  }
  if (status === 'NO POWER') {
    return { status: 'For Repair', condition: 'Needs Repair' };
  }
  return { status: 'In Stock', condition: 'Good' };
}

function normalizeCell(value) {
  if (value == null) return '';
  return String(value).trim();
}

async function readWorkbookRows(filePath) {
  await fs.access(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const seen = new Map();
  for (const sheetName of ['WITH POWER', 'NO POWER']) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) continue;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const serialNo = normalizeCell(row.getCell(3).value);
      if (!serialNo || seen.has(serialNo)) return;

      const modem = normalizeCell(row.getCell(2).value);
      const airMac = normalizeCell(row.getCell(4).value);
      const { status, condition } = mapStatus(row.getCell(5).value);

      seen.set(serialNo, {
        serial_no: serialNo,
        category: 'Modem',
        item_code: airMac || null,
        brand: null,
        model: modem || null,
        description: `Imported from ${path.basename(filePath)} (${sheetName})`,
        date_received: null,
        received_by: null,
        site_id: null,
        site_name: null,
        deployed_at: null,
        deployed_by: null,
        purchase_date: null,
        price: null,
        supplier: null,
        purchase_order_no: null,
        condition,
        status,
        project_name: null,
        project_id: null,
        created_by: null,
        module: 'noc'
      });
    });
  }

  return [...seen.values()];
}

async function main() {
  const rows = await readWorkbookRows(WORKBOOK_PATH);
  if (!rows.length) {
    throw new Error(`No modem rows found in ${WORKBOOK_PATH}`);
  }

  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'demo',
    password: '12345',
    port: 5432,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    await client.query(`DELETE FROM inventory_activities WHERE module = 'noc'`);
    await client.query(`DELETE FROM inventory_items WHERE module = 'noc'`);

    const itemCols = [
      'serial_no',
      'category',
      'item_code',
      'brand',
      'model',
      'description',
      'date_received',
      'received_by',
      'site_id',
      'site_name',
      'deployed_at',
      'deployed_by',
      'purchase_date',
      'price',
      'supplier',
      'purchase_order_no',
      'condition',
      'status',
      'project_name',
      'project_id',
      'created_by',
      'module',
    ];

    const itemValues = [];
    const itemSql = rows.map((row, index) => {
      const base = index * itemCols.length;
      itemValues.push(
        row.serial_no,
        row.category,
        row.item_code,
        row.brand,
        row.model,
        row.description,
        row.date_received,
        row.received_by,
        row.site_id,
        row.site_name,
        row.deployed_at,
        row.deployed_by,
        row.purchase_date,
        row.price,
        row.supplier,
        row.purchase_order_no,
        row.condition,
        row.status,
        row.project_name,
        row.project_id,
        row.created_by,
        row.module
      );
      return `(${itemCols.map((_, colIndex) => `$${base + colIndex + 1}`).join(', ')})`;
    }).join(', ');

    const inserted = await client.query(
      `INSERT INTO inventory_items (${itemCols.join(', ')}) VALUES ${itemSql} RETURNING id, serial_no`
      , itemValues
    );

    const activityCols = ['item_id', 'item_label', 'action', 'site', 'actor', 'module'];
    const activityValues = [];
    const activitySql = inserted.rows.map((row, index) => {
      const base = index * activityCols.length;
      activityValues.push(row.id, row.serial_no, 'Imported', null, 'MODEM.xlsx import', 'noc');
      return `(${activityCols.map((_, colIndex) => `$${base + colIndex + 1}`).join(', ')})`;
    }).join(', ');

    await client.query(
      `INSERT INTO inventory_activities (${activityCols.join(', ')}) VALUES ${activitySql}`,
      activityValues
    );

    await client.query('COMMIT');

    const statusCounts = rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    console.log(JSON.stringify({
      workbook: WORKBOOK_PATH,
      inserted: inserted.rowCount,
      uniqueSerials: rows.length,
      statusCounts,
    }, null, 2));
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
