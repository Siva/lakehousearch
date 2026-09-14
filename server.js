/**
 * Enterprise Medallion Architecture Standards & SQL Modeling Server
 * Pure Node.js & HTML server with in-memory SQLite Medallion Engine.
 * Cloud Run production ready (Zero npm install requirements, built with Node standard library).
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port hardcoded to 3000 per infrastructure requirement
const PORT = 3000;
const HOST = '0.0.0.0';

let db = null;

function registerSqlFunctions(database) {
  database.function('SHA256', (val) => {
    if (val === null || val === undefined) return null;
    return crypto.createHash('sha256').update(String(val)).digest('hex');
  });

  database.function('SHA2', (val, bits) => {
    if (val === null || val === undefined) return null;
    return crypto.createHash('sha256').update(String(val)).digest('hex');
  });

  database.function('CONCAT_WS', (separator, ...parts) => {
    return parts.filter(p => p !== null && p !== undefined).join(separator);
  });
}

function initMedallionDatabase() {
  db = new DatabaseSync(':memory:');
  registerSqlFunctions(db);

  db.exec(`
    DROP TABLE IF EXISTS brz_raw_customer_events;
    DROP TABLE IF EXISTS slv_ent_customer_account;
    DROP TABLE IF EXISTS slv_ent_order_header;
    DROP TABLE IF EXISTS slv_ent_order_line_item;
    DROP TABLE IF EXISTS gld_dim_customer;
    DROP TABLE IF EXISTS gld_dim_product;
    DROP TABLE IF EXISTS gld_fct_order_sales;

    -- BRONZE LAYER: Raw, immutable, append-only event landing
    CREATE TABLE brz_raw_customer_events (
        payload_id VARCHAR(64) PRIMARY KEY,
        event_type_cd VARCHAR(32) NOT NULL,
        account_id VARCHAR(64) NOT NULL,
        plan_tier VARCHAR(32) NOT NULL,
        mrr_amount DECIMAL(18, 2) NOT NULL,
        country_code VARCHAR(8) NOT NULL,
        _raw_payload_json TEXT NOT NULL,
        _src_sys_cd VARCHAR(32) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL,
        _kafka_partition INT NOT NULL,
        _kafka_offset INT NOT NULL
    );

    -- SILVER LAYER: Conformed, cleaned, bi-temporal SCD Type 2 dimension
    CREATE TABLE slv_ent_customer_account (
        customer_account_version_id VARCHAR(64) PRIMARY KEY,
        customer_account_id VARCHAR(64) NOT NULL,
        _version_seq_id INT NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        primary_email VARCHAR(255) NOT NULL,
        tier_plan_cd VARCHAR(32) NOT NULL,
        account_status_cd VARCHAR(32) NOT NULL,
        seat_licensed_cnt INT NOT NULL,
        mrr_amt DECIMAL(18, 2) NOT NULL,
        country_iso_cd VARCHAR(8) NOT NULL,
        is_enterprise_sla_flg INT NOT NULL,
        _src_sys_cd VARCHAR(32) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL,
        _valid_from_ts TIMESTAMP NOT NULL,
        _valid_to_ts TIMESTAMP NOT NULL,
        _is_current_flg INT NOT NULL,
        _record_hash CHAR(64) NOT NULL,
        _dq_score DECIMAL(5, 2) NOT NULL,
        _etl_job_id VARCHAR(64) NOT NULL
    );

    -- SILVER LAYER: Order Header (3NF Transaction Entity)
    CREATE TABLE slv_ent_order_header (
        order_id VARCHAR(64) PRIMARY KEY,
        customer_account_id VARCHAR(64) NOT NULL,
        order_date_dt DATE NOT NULL,
        order_status_cd VARCHAR(32) NOT NULL,
        currency_iso_cd VARCHAR(8) NOT NULL,
        total_gross_amt DECIMAL(18, 2) NOT NULL,
        tax_amt DECIMAL(18, 2) NOT NULL,
        total_net_amt DECIMAL(18, 2) NOT NULL,
        _src_sys_cd VARCHAR(32) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL,
        _record_hash CHAR(64) NOT NULL
    );

    -- SILVER LAYER: Order Line Items
    CREATE TABLE slv_ent_order_line_item (
        order_line_item_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        line_item_seq_no INT NOT NULL,
        product_sku_cd VARCHAR(64) NOT NULL,
        quantity_cnt INT NOT NULL,
        unit_price_amt DECIMAL(18, 2) NOT NULL,
        line_total_amt DECIMAL(18, 2) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL
    );

    -- GOLD LAYER: Kimball Dimensional Star - Conformed Customer Dimension
    CREATE TABLE gld_dim_customer (
        customer_sk INT PRIMARY KEY,
        customer_account_id VARCHAR(64) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        tier_plan_cd VARCHAR(32) NOT NULL,
        country_iso_cd VARCHAR(8) NOT NULL,
        is_enterprise_sla_flg INT NOT NULL,
        _is_current_flg INT NOT NULL,
        _effective_start_dt DATE NOT NULL,
        _effective_end_dt DATE NOT NULL
    );

    -- GOLD LAYER: Kimball Dimensional Star - Product Dimension
    CREATE TABLE gld_dim_product (
        product_sk INT PRIMARY KEY,
        product_sku_cd VARCHAR(64) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_category_cd VARCHAR(64) NOT NULL,
        standard_unit_cost_amt DECIMAL(18, 2) NOT NULL,
        standard_unit_price_amt DECIMAL(18, 2) NOT NULL
    );

    -- GOLD LAYER: Kimball Dimensional Star - Sales & Margin Fact Table
    CREATE TABLE gld_fct_order_sales (
        order_sales_fact_sk INT PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_sk INT NOT NULL,
        product_sk INT NOT NULL,
        order_date_key INT NOT NULL,
        order_quantity_cnt INT NOT NULL,
        gross_sales_amt DECIMAL(18, 2) NOT NULL,
        discount_amt DECIMAL(18, 2) NOT NULL,
        net_sales_amt DECIMAL(18, 2) NOT NULL,
        cost_of_goods_sold_amt DECIMAL(18, 2) NOT NULL,
        gross_margin_amt DECIMAL(18, 2) NOT NULL,
        _created_ts TIMESTAMP NOT NULL
    );
  `);

  // Seed Bronze
  const insertBrz = db.prepare(`
    INSERT INTO brz_raw_customer_events (
        payload_id, event_type_cd, account_id, plan_tier, mrr_amount, country_code,
        _raw_payload_json, _src_sys_cd, _ingest_ts, _kafka_partition, _kafka_offset
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const bronzeData = [
    ['evt_001_raw', 'ACCOUNT_CREATED', 'ACC-101', 'GROWTH', 3200.00, 'USA', '{"source": "salesforce", "region": "US-EAST", "rep": "Sarah J."}', 'SFDC_CDC', '2026-01-01 10:20:00', 0, 1024],
    ['evt_002_raw', 'ACCOUNT_CREATED', 'ACC-102', 'GROWTH', 1850.00, 'GBR', '{"source": "stripe", "region": "EU-WEST", "plan_currency": "GBP"}', 'STRIPE_WEBHOOK', '2026-02-15 08:15:00', 1, 4096],
    ['evt_003_raw', 'ACCOUNT_CREATED', 'ACC-103', 'ENTERPRISE', 5200.00, 'CAN', '{"source": "salesforce", "region": "CAN-CENTRAL"}', 'SFDC_CDC', '2026-03-01 14:40:00', 0, 1025],
    ['evt_004_raw', 'TIER_UPGRADE', 'ACC-101', 'ENTERPRISE', 4200.00, 'USA', '{"source": "deal_desk", "seat_count": 75, "sla": "platinum"}', 'SFDC_CDC', '2026-06-01 09:00:00', 0, 1026],
    ['evt_005_raw', 'ACCOUNT_CREATED', 'ACC-104', 'ENTERPRISE', 4200.00, 'DEU', '{"source": "salesforce", "region": "EU-CENTRAL"}', 'SFDC_CDC', '2026-04-10 11:30:00', 1, 4097]
  ];
  for (const row of bronzeData) {
    insertBrz.run(...row);
  }

  // Seed Silver customer accounts
  const insertSlvAcc = db.prepare(`
    INSERT INTO slv_ent_customer_account (
        customer_account_version_id, customer_account_id, _version_seq_id, company_name,
        primary_email, tier_plan_cd, account_status_cd, seat_licensed_cnt, mrr_amt,
        country_iso_cd, is_enterprise_sla_flg, _src_sys_cd, _ingest_ts,
        _valid_from_ts, _valid_to_ts, _is_current_flg, _record_hash, _dq_score, _etl_job_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const silverAccounts = [
    ['ACC-101_v1', 'ACC-101', 1, 'Acme Corp', 'billing@acme.com', 'GROWTH', 'ACTIVE', 45, 3200.00, 'USA', 0, 'SFDC_CDC', '2026-01-01 10:20:00', '2026-01-01 00:00:00', '2026-05-31 23:59:59', 0, 'c8b91a74d2e8b0123456789abcdef0123456789abcdef0123456789abcdef01', 99.8, 'job_dlt_silver_001'],
    ['ACC-101_v2', 'ACC-101', 2, 'Acme Corp', 'billing@acme.com', 'ENTERPRISE', 'ACTIVE', 75, 4200.00, 'USA', 1, 'SFDC_CDC', '2026-06-01 09:00:00', '2026-06-01 00:00:00', '9999-12-31 23:59:59', 1, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 100.0, 'job_dlt_silver_004'],
    ['ACC-102_v1', 'ACC-102', 1, 'BioHealth Corp', 'ops@biohealth.io', 'GROWTH', 'ACTIVE', 25, 1850.00, 'GBR', 0, 'STRIPE_WEBHOOK', '2026-02-15 08:15:00', '2026-02-15 00:00:00', '9999-12-31 23:59:59', 1, '4a6b2c8d1e9f0123456789abcdef0123456789abcdef0123456789abcdef02', 100.0, 'job_dlt_silver_002'],
    ['ACC-103_v1', 'ACC-103', 1, 'Omni Logistics', 'admin@omnilog.com', 'ENTERPRISE', 'ACTIVE', 100, 5200.00, 'CAN', 1, 'SFDC_CDC', '2026-03-01 14:40:00', '2026-03-01 00:00:00', '9999-12-31 23:59:59', 1, '5b7c3d9e2f0a123456789abcdef0123456789abcdef0123456789abcdef03', 100.0, 'job_dlt_silver_003'],
    ['ACC-104_v1', 'ACC-104', 1, 'FinEdge Global', 'tech@finedge.de', 'ENTERPRISE', 'ACTIVE', 60, 4200.00, 'DEU', 1, 'SFDC_CDC', '2026-04-10 11:30:00', '2026-04-10 00:00:00', '9999-12-31 23:59:59', 1, '6c8d4e0f3a1b23456789abcdef0123456789abcdef0123456789abcdef04', 99.5, 'job_dlt_silver_005']
  ];
  for (const row of silverAccounts) {
    insertSlvAcc.run(...row);
  }

  // Seed Silver order headers
  const insertOrder = db.prepare(`
    INSERT INTO slv_ent_order_header (
        order_id, customer_account_id, order_date_dt, order_status_cd,
        currency_iso_cd, total_gross_amt, tax_amt, total_net_amt,
        _src_sys_cd, _ingest_ts, _record_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const orderData = [
    ['ORD-1001', 'ACC-101', '2026-06-15', 'SETTLED', 'USD', 4200.00, 0.00, 4200.00, 'BILLING_SYSTEM', '2026-06-15 12:00:00', 'hash_ord_1001'],
    ['ORD-1002', 'ACC-102', '2026-07-01', 'SETTLED', 'USD', 1850.00, 0.00, 1850.00, 'BILLING_SYSTEM', '2026-07-01 12:00:00', 'hash_ord_1002'],
    ['ORD-1003', 'ACC-103', '2026-07-10', 'SETTLED', 'USD', 10400.00, 0.00, 10400.00, 'BILLING_SYSTEM', '2026-07-10 12:00:00', 'hash_ord_1003'],
    ['ORD-1004', 'ACC-101', '2026-08-01', 'SETTLED', 'USD', 4200.00, 0.00, 4200.00, 'BILLING_SYSTEM', '2026-08-01 12:00:00', 'hash_ord_1004'],
    ['ORD-1005', 'ACC-104', '2026-08-15', 'PENDING', 'USD', 4200.00, 0.00, 4200.00, 'BILLING_SYSTEM', '2026-08-15 12:00:00', 'hash_ord_1005']
  ];
  for (const row of orderData) {
    insertOrder.run(...row);
  }

  // Seed Silver order line items
  const insertLine = db.prepare(`
    INSERT INTO slv_ent_order_line_item (
        order_line_item_id, order_id, line_item_seq_no, product_sku_cd,
        quantity_cnt, unit_price_amt, line_total_amt, _ingest_ts
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const lineItems = [
    ['LI-1001-1', 'ORD-1001', 1, 'SKU-ENT-PLATFORM', 1, 4200.00, 4200.00, '2026-06-15 12:00:00'],
    ['LI-1002-1', 'ORD-1002', 1, 'SKU-GROWTH-SaaS', 1, 1850.00, 1850.00, '2026-07-01 12:00:00'],
    ['LI-1003-1', 'ORD-1003', 1, 'SKU-ENT-PLATFORM', 2, 4200.00, 8400.00, '2026-07-10 12:00:00'],
    ['LI-1003-2', 'ORD-1003', 2, 'SKU-PREMIUM-SUPPORT', 1, 2000.00, 2000.00, '2026-07-10 12:00:00'],
    ['LI-1004-1', 'ORD-1004', 1, 'SKU-ENT-PLATFORM', 1, 4200.00, 4200.00, '2026-08-01 12:00:00']
  ];
  for (const row of lineItems) {
    insertLine.run(...row);
  }

  // Seed Gold Customers
  const insertGldCust = db.prepare(`
    INSERT INTO gld_dim_customer (
        customer_sk, customer_account_id, company_name, tier_plan_cd,
        country_iso_cd, is_enterprise_sla_flg, _is_current_flg,
        _effective_start_dt, _effective_end_dt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const goldCustomers = [
    [1, 'ACC-101', 'Acme Corp (Growth Era)', 'GROWTH', 'USA', 0, 0, '2026-01-01', '2026-05-31'],
    [2, 'ACC-101', 'Acme Corp', 'ENTERPRISE', 'USA', 1, 1, '2026-06-01', '9999-12-31'],
    [3, 'ACC-102', 'BioHealth Corp', 'GROWTH', 'GBR', 0, 1, '2026-02-15', '9999-12-31'],
    [4, 'ACC-103', 'Omni Logistics', 'ENTERPRISE', 'CAN', 1, 1, '2026-03-01', '9999-12-31'],
    [5, 'ACC-104', 'FinEdge Global', 'ENTERPRISE', 'DEU', 1, 1, '2026-04-10', '9999-12-31']
  ];
  for (const row of goldCustomers) {
    insertGldCust.run(...row);
  }

  // Seed Gold Products
  const insertGldProd = db.prepare(`
    INSERT INTO gld_dim_product (
        product_sk, product_sku_cd, product_name, product_category_cd,
        standard_unit_cost_amt, standard_unit_price_amt
    ) VALUES (?, ?, ?, ?, ?, ?);
  `);

  const goldProducts = [
    [1, 'SKU-ENT-PLATFORM', 'Enterprise Lakehouse Suite', 'CORE_PLATFORM', 850.00, 4200.00],
    [2, 'SKU-GROWTH-SaaS', 'Growth Lakehouse Engine', 'CORE_PLATFORM', 380.00, 1850.00],
    [3, 'SKU-ADDON-GOVERNANCE', 'Data Governance Sentinel', 'ADD_ON', 220.00, 1200.00],
    [4, 'SKU-PREMIUM-SUPPORT', '24/7 Dedicated SRE Support', 'SERVICES', 450.00, 2000.00]
  ];
  for (const row of goldProducts) {
    insertGldProd.run(...row);
  }

  // Seed Gold Sales Facts
  const insertGldFact = db.prepare(`
    INSERT INTO gld_fct_order_sales (
        order_sales_fact_sk, order_id, customer_sk, product_sk, order_date_key,
        order_quantity_cnt, gross_sales_amt, discount_amt, net_sales_amt,
        cost_of_goods_sold_amt, gross_margin_amt, _created_ts
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
  `);

  const goldFacts = [
    [1, 'ORD-1001', 2, 1, 20260615, 1, 4200.00, 0.00, 4200.00, 850.00, 3350.00],
    [2, 'ORD-1002', 3, 2, 20260701, 1, 1850.00, 0.00, 1850.00, 380.00, 1470.00],
    [3, 'ORD-1003', 4, 1, 20260710, 2, 8400.00, 0.00, 8400.00, 1700.00, 6700.00],
    [4, 'ORD-1003', 4, 4, 20260710, 1, 2000.00, 0.00, 2000.00, 450.00, 1550.00],
    [5, 'ORD-1004', 2, 1, 20260801, 1, 4200.00, 0.00, 4200.00, 850.00, 3350.00]
  ];
  for (const row of goldFacts) {
    insertGldFact.run(...row);
  }

  console.log('✓ In-memory SQLite Medallion tables initialized successfully.');
}

initMedallionDatabase();

function generateSpecMarkdown() {
  return `# Enterprise Medallion Architecture Standards & SQL Modeling Specification
**Standard Document ID**: ARCH-SPEC-MEDALLION-2026-V1  
**Author**: Data Architecture Governance Board  
**Runtime Compatibility**: Databricks Delta Lake 3.0+, Snowflake, Google BigQuery, PostgreSQL/ANSI  

---

## 1. Executive Summary & Architectural Axioms
The Medallion Architecture organizes Lakehouse data into three distinct, governed physical zones:
1. **Bronze (Raw Audit Landing)**: Append-only, immutable ingestion preserving upstream fidelity.
2. **Silver (Conformed Enterprise 3NF & Bi-Temporal SCD2)**: Cleaned, deduplicated, standardized entities enforcing strict data contracts, business validity timestamps, and deterministic SHA-256 hash diffing.
3. **Gold (Curated Kimball Dimensional Marts)**: Conformed Star Schemas with integer surrogate keys (\`_sk\`), optimized for GAAP revenue reporting, financial audits, and analytical consumption.

---

## 2. Mandatory Suffix Taxonomy
| Suffix | Logical Concept | Mandatory SQL Type | Example |
|---|---|---|---|
| \`_sk\` | Integer Surrogate Key (Kimball Star) | \`BIGINT\` / \`INTEGER\` | \`customer_sk\`, \`product_sk\` |
| \`_id\` | Natural / System Identifier | \`VARCHAR(64)\` / \`STRING\` | \`customer_account_id\`, \`order_id\` |
| \`_amt\` | Exact Financial Amount | \`DECIMAL(18,2)\` (NEVER FLOAT) | \`mrr_amt\`, \`gross_sales_amt\` |
| \`_cnt\` | Exact Integer Count | \`INTEGER\` / \`INT64\` | \`seat_licensed_cnt\`, \`quantity_cnt\` |
| \`_cd\` | Normalized Code / Enum | \`VARCHAR(32)\` | \`tier_plan_cd\`, \`country_iso_cd\` |
| \`_flg\` | Boolean Flag | \`BOOLEAN\` / \`INT (0 or 1)\` | \`_is_current_flg\`, \`is_enterprise_sla_flg\` |
| \`_dt\` | Calendar Date | \`DATE\` | \`order_date_dt\`, \`_effective_start_dt\` |
| \`_ts\` | High-Precision Timestamp | \`TIMESTAMP\` / \`TIMESTAMP_NTZ\` | \`_valid_from_ts\`, \`_ingest_ts\` |
| \`_pct\` | Decimal Percentage (0.0 to 1.0) | \`DECIMAL(7,4)\` | \`discount_pct\`, \`churn_probability_pct\` |

---

## 3. The 14 Mandatory Audit Lineage Columns
1. \`_src_sys_cd\`: Originating system (\`SFDC_CDC\`, \`STRIPE_WEBHOOK\`, \`KAFKA_TELEMETRY\`).
2. \`_ingest_ts\`: High-precision UTC timestamp when the record landed in Bronze.
3. \`_etl_job_id\`: Continuous integration or orchestration run identifier.
4. \`_pipeline_run_id\`: Unique execution UUID for idempotency tracking.
5. \`_valid_from_ts\`: Bi-temporal interval start (when the record became factually true).
6. \`_valid_to_ts\`: Bi-temporal interval end (\`9999-12-31 23:59:59\` for active records).
7. \`_is_current_flg\`: Boolean flag indicating whether this row represents the active state.
8. \`_version_seq_id\`: Strictly monotonic sequence integer (1, 2, 3...) per business entity.
9. \`_record_hash\`: SHA-256 hash computed deterministically across all non-audit business fields.
10. \`_dq_score\`: Numeric quality score (0.00 to 100.00) assigned by expectation checks.
11. \`_dq_status_cd\`: Quality category (\`PASSED\`, \`WARNING_COERCED\`, \`QUARANTINED\`).
12. \`_gdpr_crypto_key_id\`: Cryptographic key pointer for GDPR Article 17 crypto-shredding.
13. \`_is_deleted_flg\`: Soft deletion tombstone flag.
14. \`_created_ts\`: Database transaction posting timestamp.
`;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = url.pathname;

  // GET: Health
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      app: 'enterprise-medallion-lakehouse',
      runtime: `Node.js ${process.version} (Cloud Run compatible)`,
      engine: 'In-Memory SQLite3 SQL Engine',
      layers: ['bronze', 'silver', 'gold'],
      activePort: PORT
    });
    return;
  }

  // GET: Tables
  if (req.method === 'GET' && pathname === '/api/tables') {
    try {
      const rows = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
      `).all();

      const tableStats = rows.map(r => {
        const tbl = r.name;
        const countRow = db.prepare(`SELECT count(*) as cnt FROM ${tbl}`).get();
        const layer = tbl.startsWith('brz_') ? 'bronze' : (tbl.startsWith('slv_') ? 'silver' : 'gold');
        return {
          name: tbl,
          layer,
          rowCount: countRow.cnt
        };
      });

      sendJson(res, 200, { tables: tableStats });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  // GET: Table Details
  if (req.method === 'GET' && pathname.startsWith('/api/table/')) {
    const tableName = pathname.replace('/api/table/', '').trim();
    try {
      const colInfo = db.prepare(`PRAGMA table_info(${tableName});`).all();
      if (!colInfo || colInfo.length === 0) {
        sendJson(res, 404, { error: `Table '${tableName}' does not exist` });
        return;
      }

      const columns = colInfo.map(c => ({
        name: c.name,
        type: c.type,
        notNull: Boolean(c.notnull),
        pk: Boolean(c.pk)
      }));

      const rawRows = db.prepare(`SELECT * FROM ${tableName} LIMIT 25;`).all();
      const rows = rawRows.map(r => Object.values(r));

      sendJson(res, 200, {
        table: tableName,
        columns,
        rows,
        rowCount: rows.length
      });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  // GET: Export Spec
  if (req.method === 'GET' && pathname === '/api/export-spec') {
    const md = generateSpecMarkdown();
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Enterprise_Medallion_Lakehouse_Standard.md"',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(md);
    return;
  }

  // POST: Execute SQL
  if (req.method === 'POST' && pathname === '/api/execute-sql') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON payload' });
        return;
      }

      const sql = (payload.sql || '').trim();
      if (!sql) {
        sendJson(res, 400, { error: 'SQL statement is required' });
        return;
      }

      const startMs = performance.now();
      try {
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        let columns = [];
        let rows = [];
        let affectedRows = 0;

        for (let i = 0; i < statements.length; i++) {
          const stmtStr = statements[i];
          const isSelectOrPragma = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)/i.test(stmtStr);

          if (isSelectOrPragma) {
            const stmt = db.prepare(stmtStr);
            const queryResults = stmt.all();
            if (queryResults.length > 0) {
              columns = Object.keys(queryResults[0]);
              rows = queryResults.map(r => Object.values(r));
            } else {
              // Extract columns from statement metadata if possible
              columns = [];
              rows = [];
            }
          } else {
            const stmt = db.prepare(stmtStr);
            const info = stmt.run();
            if (info && info.changes) {
              affectedRows += info.changes;
            }
          }
        }

        const elapsedMs = parseFloat((performance.now() - startMs).toFixed(2));
        sendJson(res, 200, {
          success: true,
          columns,
          rows,
          rowCount: rows.length,
          affectedRows,
          executionTimeMs: elapsedMs,
          query: sql
        });
      } catch (err) {
        const elapsedMs = parseFloat((performance.now() - startMs).toFixed(2));
        sendJson(res, 400, {
          success: false,
          error: err.message,
          executionTimeMs: elapsedMs,
          query: sql
        });
      }
    });
    return;
  }

  // POST: Reset DB
  if (req.method === 'POST' && pathname === '/api/reset-db') {
    try {
      initMedallionDatabase();
      sendJson(res, 200, { success: true, message: 'Lakehouse SQLite database re-seeded successfully.' });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  // POST: Simulate SCD2
  if (req.method === 'POST' && pathname === '/api/scd2-simulate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON payload' });
        return;
      }

      const accountId = payload.account_id || 'ACC-101';
      const newTier = payload.tier_plan_cd || 'ENTERPRISE_PREMIUM';
      const newMrr = parseFloat(payload.mrr_amt) || 6500.00;
      const newSeats = parseInt(payload.seat_licensed_cnt, 10) || 120;
      const companyName = payload.company_name || 'Acme Corp';

      try {
        const curr = db.prepare(`
          SELECT customer_account_version_id, _version_seq_id, _record_hash, tier_plan_cd, mrr_amt, seat_licensed_cnt, _valid_from_ts
          FROM slv_ent_customer_account
          WHERE customer_account_id = ? AND _is_current_flg = 1;
        `).get(accountId);

        if (!curr) {
          sendJson(res, 404, { error: `Active customer record for '${accountId}' not found` });
          return;
        }

        const hashInput = `${companyName.toUpperCase()}||${newTier.toUpperCase()}||${newMrr.toFixed(2)}||${newSeats}||USA`;
        const newHash = crypto.createHash('sha256').update(hashInput).digest('hex');

        if (newHash === curr._record_hash) {
          sendJson(res, 200, {
            changeDetected: false,
            message: 'SHA-256 hash is identical. No SCD2 evolution required (Idempotent bypass).',
            currentVersion: curr.customer_account_version_id,
            hash: newHash
          });
          return;
        }

        const nowTs = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // 1. Close current record
        db.prepare(`
          UPDATE slv_ent_customer_account
          SET _valid_to_ts = ?, _is_current_flg = 0
          WHERE customer_account_version_id = ?;
        `).run(nowTs, curr.customer_account_version_id);

        // 2. Insert new record
        const newSeq = curr._version_seq_id + 1;
        const newVerId = `${accountId}_v${newSeq}`;

        db.prepare(`
          INSERT INTO slv_ent_customer_account (
              customer_account_version_id, customer_account_id, _version_seq_id,
              company_name, primary_email, tier_plan_cd, account_status_cd,
              seat_licensed_cnt, mrr_amt, country_iso_cd, is_enterprise_sla_flg,
              _src_sys_cd, _ingest_ts, _valid_from_ts, _valid_to_ts,
              _is_current_flg, _record_hash, _dq_score, _etl_job_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `).run(
          newVerId, accountId, newSeq, companyName, 'billing@acme.com',
          newTier, 'ACTIVE', newSeats, newMrr, 'USA', 1, 'SFDC_CDC',
          nowTs, nowTs, '9999-12-31 23:59:59', 1, newHash, 100.0,
          `job_scd2_sim_${Date.now()}`
        );

        // 3. Bronze raw event
        db.prepare(`
          INSERT INTO brz_raw_customer_events (
              payload_id, event_type_cd, account_id, plan_tier, mrr_amount, country_code,
              _raw_payload_json, _src_sys_cd, _ingest_ts, _kafka_partition, _kafka_offset
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `).run(
          `evt_sim_${Date.now()}`, 'TIER_UPGRADE_SIM', accountId, newTier, newMrr, 'USA',
          JSON.stringify({ seat_count: newSeats, mrr: newMrr, tier: newTier, event: 'SCD2_SIMULATION' }),
          'SIM_ENGINE', nowTs, 0, 9999
        );

        sendJson(res, 200, {
          changeDetected: true,
          message: `Successfully simulated SCD2 evolution for ${accountId}.`,
          closedVersion: {
            versionId: curr.customer_account_version_id,
            seq: curr._version_seq_id,
            tier: curr.tier_plan_cd,
            mrr: curr.mrr_amt,
            seats: curr.seat_licensed_cnt,
            validFrom: curr._valid_from_ts,
            validTo: nowTs,
            recordHash: curr._record_hash
          },
          newVersion: {
            versionId: newVerId,
            seq: newSeq,
            tier: newTier,
            mrr: newMrr,
            seats: newSeats,
            validFrom: nowTs,
            validTo: '9999-12-31 23:59:59',
            recordHash: newHash
          }
        });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
    });
    return;
  }

  // Serve static files or index.html
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('============================================================');
  console.log(`💎 Enterprise Medallion Lakehouse Server`);
  console.log(`• Node Runtime: ${process.version}`);
  console.log(`• Serving Port: http://${HOST}:${PORT}`);
  console.log(`• In-Memory SQL Engine: SQLite 3`);
  console.log('============================================================');
});
