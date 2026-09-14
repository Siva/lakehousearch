import { useState } from 'react';
import { FileText, Copy, Check, Download, BookOpen } from 'lucide-react';

interface DocumentViewerProps {
  onDownload: () => void;
}

export const ENTERPRISE_MARKDOWN_SPEC = `---
name: enterprise-medallion-lakehouse-standards
description: Comprehensive enterprise engineering standards, SQL transformation patterns, Medallion tiers (Bronze, Silver, and Gold), and conformed domain modeling constructs (Customer, Orders, Products, Finance) for analytical, executive BI, and regulatory compliance reporting (SOX 404, GDPR Art. 17, SOC 2, BCBS 239, GAAP ASC 606) with audit lineage columns, SCD2, and naming conventions.
version: 1.1.0
domain: Enterprise Data Lakehouse (Commerce, SaaS, Supply Chain, Finance)
architecture: SQL-Native Medallion Lakehouse (Bronze -> Silver -> Gold)
---

# Enterprise Standards: Medallion Architecture Data Lakehouse Standards (Pure SQL)

This specification defines the enterprise data engineering, data modeling, lineage tracking, and governance standards for implementing **Bronze**, **Silver**, and **Gold** layers in a modern Data Lakehouse using **Pure Standard SQL (Databricks Delta Lake SQL, Snowflake, Google BigQuery, ANSI SQL)**.

---

## 1. Architectural Overview & The Medallion Paradigm

The Medallion pattern organizes data processing into three progressive refinement tiers:

- **BRONZE LAYER (Raw / Ingestion / Immutable Audit Store)**:
  - Lands raw operational payloads directly from transactional databases (PostgreSQL, MySQL), ERP systems (SAP, NetSuite), CRMs (Salesforce, HubSpot), payment gateways (Stripe), and Kafka streaming topics using Streaming SQL (\`CREATE OR REFRESH STREAMING TABLE\`).
  - Append-only, immutable history with ingestion timestamps.
  - Minimal or zero transformation; preserves source schema drift and raw JSON/Avro/Parquet payloads with rescue column support.

- **SILVER LAYER (Cleaned / Conformed / 3NF & Bi-Temporal SCD2)**:
  - Single Source of Truth (SSOT) at atomic business transaction level.
  - Normalized relational models (Customer Accounts, Order Headers, Line Items, Products, Payment Transactions).
  - Bi-temporal tracking implemented via SQL \`MERGE INTO\` (SCD Type 2: Business Validity Dates + Ingestion Dates).
  - Standardized audit columns, deterministic SHA-256 record hashes in SQL (\`SHA2(CONCAT_WS('||', ...), 256)\`), deduplication, and automated SQL constraint checks.

- **GOLD LAYER (Curated / Kimball Star Schemas / Financial Marts)**:
  - Fact & Dimension tables optimized for analytical queries (OLAP) via pure SQL joins and window aggregations.
  - Conformed dimensions with integer surrogate keys (\`_sk\`).
  - Periodic monthly snapshots tracking MRR, expansion, contraction, churn, and ASC 606 revenue recognition.
  - Pre-aggregated rollup marts for sub-second executive BI query performance.

---

## 2. Table & Object Naming Standards

To ensure cross-system traceability, uniform cataloging, and automated pipeline discovery, all database objects MUST follow strict snake_case naming conventions:

- Bronze: \`brz_<src>_<entity>\` (e.g. \`brz_raw_orders\`)
- Silver Normalized: \`slv_ent_<entity>\` (e.g. \`slv_ent_customer_account\`)
- Silver Reference: \`slv_ref_<entity>\` (e.g. \`slv_ref_country_code\`)
- Gold Dimension: \`gld_dim_<entity>\` (e.g. \`gld_dim_customer\`)
- Gold Fact: \`gld_fct_<entity>\` (e.g. \`gld_fct_order_sales\`)
- Gold Aggregate: \`gld_agg_<entity>_<grain>\` (e.g. \`gld_agg_daily_revenue_mart\`)
- Gold Regulatory: \`gld_rpt_<reg>_<schedule>\` (e.g. \`gld_rpt_sox_reconciliation\`)

---

## 3. Strict Column Suffix Taxonomy

Every column name MUST indicate its semantic category via a standardized suffix:

- \`_sk\`: Surrogate Key (BIGINT) -> e.g. \`customer_sk\`, \`product_sk\`
- \`_id\`: Business / Natural ID (VARCHAR/STRING) -> e.g. \`customer_account_id\`, \`order_number_id\`
- \`_hash_key\`: Deterministic Hash (CHAR(64)) -> e.g. \`customer_hash_key\`
- \`_dt\`: Calendar Date (DATE, YYYY-MM-DD) -> e.g. \`order_dt\`, \`invoice_due_dt\`
- \`_ts\`: Timestamp UTC (TIMESTAMP) -> e.g. \`order_placed_ts\`, \`ingest_ts\`
- \`_amt\`: Monetary Amount (DECIMAL(18,2)) -> e.g. \`gross_sales_amt\`, \`net_order_amount_amt\`
- \`_pct\`: Percentage Ratio (DECIMAL(7,4)) -> e.g. \`discount_pct\`, \`gross_margin_pct\`
- \`_rate\`: Multiplier / Rate (DECIMAL(9,6)) -> e.g. \`currency_exchange_rate\`, \`interest_rate\`
- \`_cnt\`: Integer Count (INTEGER) -> e.g. \`seat_licensed_cnt\`, \`order_line_item_cnt\`
- \`_qty\`: Volumetric / Physical Quantity (DECIMAL(12,4)) -> e.g. \`ordered_qty\`, \`inventory_on_hand_qty\`
- \`_flg\`: Boolean Flag (BOOLEAN) -> e.g. \`is_current_flg\`, \`is_enterprise_sla_flg\`
- \`_cd\`: Lookup Code (VARCHAR(32)) -> e.g. \`tier_plan_cd\`, \`order_status_cd\`
- \`_desc\`: Description (VARCHAR(255)) -> e.g. \`order_status_desc\`, \`tier_plan_desc\`
- \`_txt\`: Freeform Text (STRING/TEXT) -> e.g. \`customer_remarks_txt\`, \`fulfillment_instructions_txt\`

---

## 4. Universal Audit & Lineage Columns

Every table in Silver and Gold MUST implement standard audit columns:

\`\`\`sql
_src_sys_cd        VARCHAR(32)   NOT NULL, -- Originating system (e.g. 'SALESFORCE_CRM')
_src_file_name     VARCHAR(255)  NULL,     -- Batch source file URI or Kafka offset
_src_record_id     VARCHAR(128)  NOT NULL, -- Primary key in originating system
_ingest_ts         TIMESTAMP     NOT NULL, -- Bronze landing timestamp (UTC)
_etl_job_id        VARCHAR(64)   NOT NULL, -- Pipeline run / Orchestration UUID
_created_ts        TIMESTAMP     NOT NULL, -- Layer write timestamp (UTC)
_updated_ts        TIMESTAMP     NOT NULL, -- Layer update timestamp (UTC)
_valid_from_ts     TIMESTAMP     NOT NULL, -- SCD2 start timestamp (UTC)
_valid_to_ts       TIMESTAMP     NOT NULL, -- SCD2 end timestamp (9999-12-31 for active)
_is_current_flg    BOOLEAN       NOT NULL, -- SCD2 active indicator
_record_hash       CHAR(64)      NOT NULL, -- SHA-256 payload hash for CDC change detection
_dq_score          DECIMAL(5, 2) NULL,     -- Automated data quality score (0.00-100.00)
_dq_error_flags    ARRAY<STRING> NULL,     -- Non-fatal data quality warning flags
_lakehouse_layer   VARCHAR(16)   NOT NULL  -- 'SILVER' or 'GOLD'
\`\`\`

---

## 5. Core Enterprise Domain Modeling Constructs

### Customer & Accounts Domain:
- Silver: \`slv_ent_customer_account\` (SCD2 tracking plan tiers, seat capacity, contracted MRR, status).
- Gold: \`gld_dim_customer\` (conformed Kimball dimension with RFM score and LTV).
- Gold: \`gld_fct_customer_monthly_snapshot\` (Periodic monthly revenue, expansion, and churn).

### Orders & Commerce Domain:
- Silver: \`slv_ent_order_header\` (Normalized order status, customer keys, shipping, taxes, GMV).
- Silver: \`slv_ent_order_line_item\` (Granular SKU items, ordered quantities, unit selling prices, line discounts).
- Gold: \`gld_fct_order_sales\` (Atomic fact joining customer, product, and calendar dimensions with margins).

### Products & Inventory Domain:
- Silver: \`slv_ent_product_catalog\` (SKU master data, brand, category hierarchy, standard COGS).
- Gold: \`gld_dim_product\` (Kimball dimension for slicing revenue and inventory velocity).

### Finance & Payments Domain:
- Silver: \`slv_ent_payment_transaction\` (Cash ledger tracking credit card, ACH, gateway fees, and settlements).
- Gold: \`gld_agg_daily_revenue_mart\` (Rollup mart by date, channel, country, and product category).

---

## 6. Key Enterprise Financial & Revenue Formulas

- **Net Sales Revenue**:
  Net Sales = Gross Line Amount - Discounts Applied
- **Gross Profit**:
  Gross Profit = Net Sales - Cost of Goods Sold (COGS)
- **Gross Margin Ratio**:
  Gross Margin % = (Gross Profit / Net Sales) * 100%
- **Monthly Recurring Revenue (MRR) Roll-forward**:
  Ending MRR = Starting MRR + Expansion MRR - Contraction MRR - Churned MRR
- **ASC 606 Revenue Recognition**:
  Recognized Revenue = Contract Transaction Price * (Elapsed Service Days / Total Contract Term Days)

---

## 7. Governance & Regulatory Alignment Matrix

- **SOX Section 404**: Financial reporting controls; zero variance between operational transactions and Gold ledger marts.
- **GDPR (Art. 17) & CCPA**: User right to erasure; automated crypto-shredding and tokenization.
- **SOC 2 Type II & ISO 27001**: End-to-end data pipeline lineage, RBAC/ABAC access controls, and encryption verification.
- **BCBS 239**: Immutable machine-readable data lineage from operational source to executive risk reporting.
- **GAAP ASC 606 / IFRS 15**: Contract performance obligations, transaction price allocation, and deferred revenue balances.`;

export default function DocumentViewer({ onDownload }: DocumentViewerProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ENTERPRISE_MARKDOWN_SPEC);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 shrink-0 shadow-inner">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Enterprise Medallion Lakehouse Standards Specification (.md)
                </h2>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  Ready for Production
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved as <code className="font-mono text-indigo-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">SKILL_ENTERPRISE_MEDALLION_STANDARDS.md</code>. Can be ingested into Claude/Gemini/ChatGPT or exported as enterprise markdown.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 px-3.5 py-2 text-xs font-semibold text-white border border-slate-700 shadow-inner transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
              <span>{copied ? 'Copied Markdown' : 'Copy All Markdown'}</span>
            </button>
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download .md</span>
            </button>
          </div>
        </div>
      </div>

      {/* Markdown Document Content Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 shadow-inner overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span>Document Preview: SKILL_ENTERPRISE_MEDALLION_STANDARDS.md</span>
          </div>
          <span className="font-mono text-slate-500 text-[11px]">Markdown Specification</span>
        </div>

        <div className="p-6 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[700px] overflow-y-auto bg-slate-950">
          {ENTERPRISE_MARKDOWN_SPEC}
        </div>
      </div>
    </div>
  );
}
