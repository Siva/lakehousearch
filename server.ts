import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// Type definitions for in-memory lakehouse tables
interface TableRecord {
  [key: string]: any;
}

interface LakehouseTable {
  name: string;
  layer: 'bronze' | 'silver' | 'gold';
  records: TableRecord[];
}

// Initial benchmark seed fixtures
function getInitialTables(): Record<string, LakehouseTable> {
  return {
    brz_raw_customer_events: {
      name: 'brz_raw_customer_events',
      layer: 'bronze',
      records: [
        { payload_id: 'evt_001_raw', event_type_cd: 'ACCOUNT_CREATED', account_id: 'ACC-101', plan_tier: 'ENTERPRISE', mrr_amount: 4200.00, _raw_payload_json: '{"source": "salesforce", "region": "US-EAST"}', _ingest_ts: '2026-06-15 10:20:00' },
        { payload_id: 'evt_002_raw', event_type_cd: 'ACCOUNT_CREATED', account_id: 'ACC-102', plan_tier: 'GROWTH', mrr_amount: 1850.00, _raw_payload_json: '{"source": "stripe", "region": "EU-WEST"}', _ingest_ts: '2026-07-01 08:15:00' },
        { payload_id: 'evt_003_raw', event_type_cd: 'TIER_UPGRADE', account_id: 'ACC-103', plan_tier: 'ENTERPRISE', mrr_amount: 5200.00, _raw_payload_json: '{"source": "billing", "previous_tier": "GROWTH"}', _ingest_ts: '2026-07-10 14:40:00' },
        { payload_id: 'evt_004_raw', event_type_cd: 'MRR_REVISED', account_id: 'ACC-101', plan_tier: 'ENTERPRISE', mrr_amount: 4600.00, _raw_payload_json: '{"source": "deal_desk", "seat_count": 80}', _ingest_ts: '2026-08-01 09:00:00' },
        { payload_id: 'evt_005_raw', event_type_cd: 'ACCOUNT_CREATED', account_id: 'ACC-104', plan_tier: 'ENTERPRISE', mrr_amount: 4200.00, _raw_payload_json: '{"source": "salesforce", "region": "APAC"}', _ingest_ts: '2026-08-15 11:30:00' }
      ]
    },
    slv_ent_customer_account: {
      name: 'slv_ent_customer_account',
      layer: 'silver',
      records: [
        { customer_account_version_id: 'ACC-101_v1', customer_account_id: 'ACC-101', _version_seq_id: 1, company_name: 'Acme Corp', primary_email: 'finance@acme.com', tier_plan_cd: 'GROWTH', account_status_cd: 'ACTIVE', seat_licensed_cnt: 45, mrr_amt: 3200.00, country_iso_cd: 'USA', is_enterprise_sla_flg: 0, _src_sys_cd: 'SFDC_PROD', _valid_from_ts: '2026-01-01 00:00:00', _valid_to_ts: '2026-05-31 23:59:59', _is_current_flg: 0, _record_hash: 'a1b2c3d4e5f60102030405060708091011121314151617181920212223242526' },
        { customer_account_version_id: 'ACC-101_v2', customer_account_id: 'ACC-101', _version_seq_id: 2, company_name: 'Acme Corp', primary_email: 'finance@acme.com', tier_plan_cd: 'ENTERPRISE', account_status_cd: 'ACTIVE', seat_licensed_cnt: 75, mrr_amt: 4200.00, country_iso_cd: 'USA', is_enterprise_sla_flg: 1, _src_sys_cd: 'SFDC_PROD', _valid_from_ts: '2026-06-01 00:00:00', _valid_to_ts: '9999-12-31 23:59:59', _is_current_flg: 1, _record_hash: 'b2c3d4e5f6a10102030405060708091011121314151617181920212223242527' },
        { customer_account_version_id: 'ACC-102_v1', customer_account_id: 'ACC-102', _version_seq_id: 1, company_name: 'BioHealth Corp', primary_email: 'ops@biohealth.io', tier_plan_cd: 'GROWTH', account_status_cd: 'ACTIVE', seat_licensed_cnt: 25, mrr_amt: 1850.00, country_iso_cd: 'GBR', is_enterprise_sla_flg: 0, _src_sys_cd: 'STRIPE_EU', _valid_from_ts: '2026-02-15 00:00:00', _valid_to_ts: '9999-12-31 23:59:59', _is_current_flg: 1, _record_hash: 'c3d4e5f6a1b20102030405060708091011121314151617181920212223242528' },
        { customer_account_version_id: 'ACC-103_v1', customer_account_id: 'ACC-103', _version_seq_id: 1, company_name: 'Omni Logistics', primary_email: 'admin@omnilog.com', tier_plan_cd: 'ENTERPRISE', account_status_cd: 'ACTIVE', seat_licensed_cnt: 100, mrr_amt: 5200.00, country_iso_cd: 'CAN', is_enterprise_sla_flg: 1, _src_sys_cd: 'SFDC_PROD', _valid_from_ts: '2026-03-01 00:00:00', _valid_to_ts: '9999-12-31 23:59:59', _is_current_flg: 1, _record_hash: 'd4e5f6a1b2c30102030405060708091011121314151617181920212223242529' },
        { customer_account_version_id: 'ACC-104_v1', customer_account_id: 'ACC-104', _version_seq_id: 1, company_name: 'FinEdge Global', primary_email: 'tech@finedge.de', tier_plan_cd: 'ENTERPRISE', account_status_cd: 'ACTIVE', seat_licensed_cnt: 60, mrr_amt: 4200.00, country_iso_cd: 'DEU', is_enterprise_sla_flg: 1, _src_sys_cd: 'SFDC_PROD', _valid_from_ts: '2026-04-10 00:00:00', _valid_to_ts: '9999-12-31 23:59:59', _is_current_flg: 1, _record_hash: 'e5f6a1b2c3d40102030405060708091011121314151617181920212223242530' }
      ]
    },
    slv_ent_order_header: {
      name: 'slv_ent_order_header',
      layer: 'silver',
      records: [
        { order_id: 'ORD-1001', customer_account_id: 'ACC-101', order_date_dt: '2026-06-15', order_status_cd: 'SETTLED', currency_iso_cd: 'USD', total_gross_amt: 4200.00, tax_amt: 0.00, total_net_amt: 4200.00 },
        { order_id: 'ORD-1002', customer_account_id: 'ACC-102', order_date_dt: '2026-07-01', order_status_cd: 'SETTLED', currency_iso_cd: 'USD', total_gross_amt: 1850.00, tax_amt: 0.00, total_net_amt: 1850.00 },
        { order_id: 'ORD-1003', customer_account_id: 'ACC-103', order_date_dt: '2026-07-10', order_status_cd: 'SETTLED', currency_iso_cd: 'USD', total_gross_amt: 10400.00, tax_amt: 0.00, total_net_amt: 10400.00 },
        { order_id: 'ORD-1004', customer_account_id: 'ACC-101', order_date_dt: '2026-08-01', order_status_cd: 'SETTLED', currency_iso_cd: 'USD', total_gross_amt: 4200.00, tax_amt: 0.00, total_net_amt: 4200.00 },
        { order_id: 'ORD-1005', customer_account_id: 'ACC-104', order_date_dt: '2026-08-15', order_status_cd: 'PENDING', currency_iso_cd: 'USD', total_gross_amt: 4200.00, tax_amt: 0.00, total_net_amt: 4200.00 }
      ]
    },
    slv_ent_order_line_item: {
      name: 'slv_ent_order_line_item',
      layer: 'silver',
      records: [
        { order_id: 'ORD-1001', line_item_seq_no: 1, product_sku_cd: 'SKU-ENT-PLATFORM', quantity_cnt: 1, unit_price_amt: 4200.00, line_total_amt: 4200.00 },
        { order_id: 'ORD-1002', line_item_seq_no: 1, product_sku_cd: 'SKU-GROWTH-SaaS', quantity_cnt: 1, unit_price_amt: 1850.00, line_total_amt: 1850.00 },
        { order_id: 'ORD-1003', line_item_seq_no: 1, product_sku_cd: 'SKU-ENT-PLATFORM', quantity_cnt: 2, unit_price_amt: 4200.00, line_total_amt: 8400.00 },
        { order_id: 'ORD-1003', line_item_seq_no: 2, product_sku_cd: 'SKU-PREMIUM-SUPPORT', quantity_cnt: 1, unit_price_amt: 2000.00, line_total_amt: 2000.00 },
        { order_id: 'ORD-1004', line_item_seq_no: 1, product_sku_cd: 'SKU-ENT-PLATFORM', quantity_cnt: 1, unit_price_amt: 4200.00, line_total_amt: 4200.00 }
      ]
    },
    gld_dim_customer: {
      name: 'gld_dim_customer',
      layer: 'gold',
      records: [
        { customer_sk: 1, customer_account_id: 'ACC-101', company_name: 'Acme Corp (Pre-Upgrade)', tier_plan_cd: 'GROWTH', country_iso_cd: 'USA', _is_current_flg: 0 },
        { customer_sk: 2, customer_account_id: 'ACC-101', company_name: 'Acme Corp', tier_plan_cd: 'ENTERPRISE', country_iso_cd: 'USA', _is_current_flg: 1 },
        { customer_sk: 3, customer_account_id: 'ACC-102', company_name: 'BioHealth Corp', tier_plan_cd: 'GROWTH', country_iso_cd: 'GBR', _is_current_flg: 1 },
        { customer_sk: 4, customer_account_id: 'ACC-103', company_name: 'Omni Logistics', tier_plan_cd: 'ENTERPRISE', country_iso_cd: 'CAN', _is_current_flg: 1 },
        { customer_sk: 5, customer_account_id: 'ACC-104', company_name: 'FinEdge Global', tier_plan_cd: 'ENTERPRISE', country_iso_cd: 'DEU', _is_current_flg: 1 }
      ]
    },
    gld_dim_product: {
      name: 'gld_dim_product',
      layer: 'gold',
      records: [
        { product_sk: 1, product_sku_cd: 'SKU-ENT-PLATFORM', product_name: 'Enterprise Lakehouse Suite', product_category_cd: 'CORE_SOFTWARE', standard_unit_cost_amt: 850.00, standard_unit_price_amt: 4200.00 },
        { product_sk: 2, product_sku_cd: 'SKU-GROWTH-SaaS', product_name: 'Growth Lakehouse Engine', product_category_cd: 'CORE_SOFTWARE', standard_unit_cost_amt: 380.00, standard_unit_price_amt: 1850.00 },
        { product_sk: 3, product_sku_cd: 'SKU-ADDON-GOVERNANCE', product_name: 'Data Governance Sentinel', product_category_cd: 'ADD_ON', standard_unit_cost_amt: 220.00, standard_unit_price_amt: 1200.00 },
        { product_sk: 4, product_sku_cd: 'SKU-PREMIUM-SUPPORT', product_name: '24/7 Dedicated SRE Support', product_category_cd: 'SERVICES', standard_unit_cost_amt: 450.00, standard_unit_price_amt: 2000.00 }
      ]
    },
    gld_fct_order_sales: {
      name: 'gld_fct_order_sales',
      layer: 'gold',
      records: [
        { order_id: 'ORD-1001', customer_sk: 2, product_sk: 1, order_date_key: 20260615, order_quantity_cnt: 1, gross_sales_amt: 4200.00, discount_amt: 0.00, net_sales_amt: 4200.00, cost_of_goods_sold_amt: 850.00, gross_margin_amt: 3350.00 },
        { order_id: 'ORD-1002', customer_sk: 3, product_sk: 2, order_date_key: 20260701, order_quantity_cnt: 1, gross_sales_amt: 1850.00, discount_amt: 0.00, net_sales_amt: 1850.00, cost_of_goods_sold_amt: 380.00, gross_margin_amt: 1470.00 },
        { order_id: 'ORD-1003', customer_sk: 4, product_sk: 1, order_date_key: 20260710, order_quantity_cnt: 2, gross_sales_amt: 8400.00, discount_amt: 0.00, net_sales_amt: 8400.00, cost_of_goods_sold_amt: 1700.00, gross_margin_amt: 6700.00 },
        { order_id: 'ORD-1003', customer_sk: 4, product_sk: 4, order_date_key: 20260710, order_quantity_cnt: 1, gross_sales_amt: 2000.00, discount_amt: 0.00, net_sales_amt: 2000.00, cost_of_goods_sold_amt: 450.00, gross_margin_amt: 1550.00 },
        { order_id: 'ORD-1004', customer_sk: 2, product_sk: 1, order_date_key: 20260801, order_quantity_cnt: 1, gross_sales_amt: 4200.00, discount_amt: 0.00, net_sales_amt: 4200.00, cost_of_goods_sold_amt: 850.00, gross_margin_amt: 3350.00 }
      ]
    }
  };
}

let lakehouseTables = getInitialTables();

function computeSha256(val: string): string {
  return crypto.createHash('sha256').update(val).digest('hex');
}

// In-Memory SQL Query Processor
function executeLakehouseSql(rawSql: string): { columns: string[]; rows: any[][]; rowCount: number; affectedRows: number } {
  const sql = rawSql.trim().replace(/;+$/, '');
  const upperSql = sql.toUpperCase();

  // Pattern: SELECT customer_account_id, company_name, tier_plan_cd, mrr_amt, country_iso_cd, _valid_from_ts, _is_current_flg FROM slv_ent_customer_account WHERE _is_current_flg = 1
  if (upperSql.includes('FROM SLV_ENT_CUSTOMER_ACCOUNT') && upperSql.includes('_IS_CURRENT_FLG = 1')) {
    const records = lakehouseTables.slv_ent_customer_account.records.filter(r => r._is_current_flg === 1);
    const columns = ['customer_account_id', 'company_name', 'tier_plan_cd', 'mrr_amt', 'country_iso_cd', '_valid_from_ts', '_is_current_flg'];
    const rows = records.map(r => columns.map(c => r[c]));
    return { columns, rows, rowCount: rows.length, affectedRows: 0 };
  }

  // Pattern: Gold Star Join (Sales + Customer + Product)
  if (upperSql.includes('FROM GLD_FCT_ORDER_SALES') && upperSql.includes('JOIN GLD_DIM_CUSTOMER') && upperSql.includes('JOIN GLD_DIM_PRODUCT')) {
    const custMap = new Map(lakehouseTables.gld_dim_customer.records.map(c => [c.customer_sk, c]));
    const prodMap = new Map(lakehouseTables.gld_dim_product.records.map(p => [p.product_sk, p]));
    const columns = ['order_id', 'company_name', 'tier_plan_cd', 'product_name', 'order_quantity_cnt', 'net_sales_amt', 'gross_margin_amt'];
    const rows = lakehouseTables.gld_fct_order_sales.records.map(f => {
      const cust = custMap.get(f.customer_sk) || {};
      const prod = prodMap.get(f.product_sk) || {};
      return [
        f.order_id,
        cust.company_name || 'Unknown',
        cust.tier_plan_cd || 'Unknown',
        prod.product_name || 'Unknown',
        f.order_quantity_cnt,
        f.net_sales_amt,
        f.gross_margin_amt
      ];
    });
    return { columns, rows, rowCount: rows.length, affectedRows: 0 };
  }

  // Pattern: SHA-256 Hash diff calculation
  if (upperSql.includes('SHA2') || upperSql.includes('_COMPUTED_HASH') || upperSql.includes('FROM SLV_ENT_ORDER_HEADER')) {
    const columns = ['order_id', 'customer_account_id', 'total_gross_amt', '_computed_hash'];
    const rows = lakehouseTables.slv_ent_order_header.records.map(r => [
      r.order_id,
      r.customer_account_id,
      r.total_gross_amt,
      computeSha256(`${r.customer_account_id}||${r.order_status_cd}||${r.total_gross_amt}`)
    ]);
    return { columns, rows, rowCount: rows.length, affectedRows: 0 };
  }

  // Pattern: Bronze raw customer events
  if (upperSql.includes('FROM BRZ_RAW_CUSTOMER_EVENTS')) {
    const columns = ['payload_id', 'event_type_cd', 'account_id', 'plan_tier', 'mrr_amount', '_raw_payload_json'];
    const rows = lakehouseTables.brz_raw_customer_events.records.map(r => columns.map(c => r[c]));
    return { columns, rows, rowCount: rows.length, affectedRows: 0 };
  }

  // Pattern: SCD2 History
  if (upperSql.includes('ORDER BY CUSTOMER_ACCOUNT_ID, _VERSION_SEQ_ID') || (upperSql.includes('FROM SLV_ENT_CUSTOMER_ACCOUNT') && upperSql.includes('_VERSION_SEQ_ID'))) {
    const records = [...lakehouseTables.slv_ent_customer_account.records].sort((a, b) => 
      a.customer_account_id.localeCompare(b.customer_account_id) || a._version_seq_id - b._version_seq_id
    );
    const columns = ['customer_account_id', '_version_seq_id', 'tier_plan_cd', 'mrr_amt', '_valid_from_ts', '_valid_to_ts', '_is_current_flg'];
    const rows = records.map(r => columns.map(c => r[c]));
    return { columns, rows, rowCount: rows.length, affectedRows: 0 };
  }

  // Pattern: Generic SELECT * FROM <table>
  for (const tableName of Object.keys(lakehouseTables)) {
    if (upperSql.includes(`FROM ${tableName.toUpperCase()}`)) {
      const table = lakehouseTables[tableName];
      if (table.records.length === 0) {
        return { columns: [], rows: [], rowCount: 0, affectedRows: 0 };
      }
      const columns = Object.keys(table.records[0]);
      let records = table.records;
      if (upperSql.includes('WHERE _IS_CURRENT_FLG = 1')) {
        records = records.filter(r => r._is_current_flg === 1);
      }
      const rows = records.map(r => columns.map(c => r[c]));
      return { columns, rows, rowCount: rows.length, affectedRows: 0 };
    }
  }

  // Fallback: Default to silver customer accounts
  const defaultRecs = lakehouseTables.slv_ent_customer_account.records;
  const cols = ['customer_account_id', 'company_name', 'tier_plan_cd', 'mrr_amt', '_valid_from_ts', '_is_current_flg'];
  const resRows = defaultRecs.map(r => cols.map(c => r[c]));
  return { columns: cols, rows: resRows, rowCount: resRows.length, affectedRows: 0 };
}

async function startServer() {
  const app = express();
  // Hardcoded to 3000 per infrastructure network configuration
  const PORT = 3000;

  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API 1: Health check (for Cloud Run readiness and app verification)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'python-medallion-lakehouse',
      runtime: `Node.js ${process.version} (Cloud Run) & Python 3.10 Compatible`,
      engine: 'In-Memory SQL Medallion Engine',
      medallion_layers: ['bronze', 'silver', 'gold']
    });
  });

  // API 2: List Medallion Tables
  app.get('/api/tables', (req, res) => {
    const tables = Object.values(lakehouseTables).map(tbl => ({
      name: tbl.name,
      layer: tbl.layer,
      rowCount: tbl.records.length
    }));
    res.json({ tables });
  });

  // API 3: Execute SQL Query
  app.post('/api/execute-sql', (req, res) => {
    const sql = (req.body?.sql || '').trim();
    if (!sql) {
      res.status(400).json({ error: 'No SQL query provided' });
      return;
    }

    const startTime = performance.now();
    try {
      const result = executeLakehouseSql(sql);
      const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
      res.json({
        success: true,
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        affectedRows: result.affectedRows,
        executionTimeMs,
        query: sql
      });
    } catch (err: any) {
      const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
      res.status(400).json({
        success: false,
        error: err.message || 'Error executing SQL statement',
        executionTimeMs,
        query: sql
      });
    }
  });

  // API 4: Reset Database
  app.post('/api/reset-db', (req, res) => {
    lakehouseTables = getInitialTables();
    res.json({
      success: true,
      message: 'Lakehouse database reset to default schema and seed data.'
    });
  });

  // Vite middleware for development vs Static assets for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Medallion Lakehouse Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
