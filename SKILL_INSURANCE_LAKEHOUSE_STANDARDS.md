---
name: insurance-lakehouse-medallion-standards
description: Comprehensive enterprise engineering standards, Medallion patterns (Silver & Gold), and insurance domain data modeling constructs (Policy, Claims, Billing) for analytical and regulatory reporting (NAIC, IFRS 17, Solvency II, BCBS 239) with audit columns, lineage, and naming conventions.
version: 1.0.0
domain: Insurance (P&C, Life, Health)
architecture: Medallion Lakehouse (Bronze -> Silver -> Gold)
---

# Enterprise Standards: Insurance Data Lakehouse Medallion Architecture

This specification defines the enterprise data engineering, data modeling, and governance standards for implementing **Silver** and **Gold** layers in a modern Data Lakehouse (Delta Lake, Apache Iceberg, Snowflake, or BigQuery) within the **Insurance domain**.

---

## 1. Architectural Overview & The Medallion Paradigm

The Medallion pattern organizes data processing into three progressive refinement tiers:

```
[ Raw Policy/Claims/Billing Sources ] 
   (Guidewire, Duck Creek, SAP, Mainframe, Telematics, Third-Party)
               │
               ▼ Streaming / Micro-batch / CDC (Debezium, Fivetran, Kafka)
┌────────────────────────────────────────────────────────────────────────┐
│ BRONZE LAYER (Raw / Ingestion / Immutable History)                    │
│ • Raw payloads stored in native format (JSON / Avro / Parquet)         │
│ • Append-only, immutable history with ingestion timestamps             │
│ • Minimal or zero transformation; preserves source fidelity            │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼ Data Quality Gates, Schema Enforcement, SCD2, Normalization
┌────────────────────────────────────────────────────────────────────────┐
│ SILVER LAYER (Conformed / Cleaned / 3NF or Data Vault)                │
│ • Single Source of Truth (SSOT) at atomic business transaction level   │
│ • Normalized relational models (Policy, Claim Case, Invoices, Ledgers) │
│ • Bi-temporal tracking (SCD Type 2: Effective Dates + Ingestion Dates) │
│ • Standardized audit columns, SHA-256 record hashes, deduplication     │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼ Dimensional Modeling (Kimball), Aggregation, Business Metrics
┌────────────────────────────────────────────────────────────────────────┐
│ GOLD LAYER (Curated / Star Schemas / Actuarial Marts)                  │
│ • Fact & Dimension tables optimized for analytical queries (OLAP)      │
│ • Actuarial loss development triangles (Schedule P, IBNR)              │
│ • Regulatory reporting schemas (NAIC, IFRS 17, Solvency II)            │
│ • Conformed business KPIs: Loss Ratio, Combined Ratio, Earned Premium  │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ DOWNSTREAM CONSUMERS                                                   │
│ • Actuarial Pricing & Reserving Engines (Milliman, Arius)              │
│ • Regulatory Submissions (NAIC e-Filing, IFRS 17 Engine)               │
│ • Executive Dashboards & Power BI / Tableau / ThoughtSpot              │
│ • Machine Learning (Fraud Detection, Telematics Risk Scoring, Claims)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Table & Object Naming Standards

To ensure cross-system traceability, uniform cataloging (Unity Catalog, Snowflake Horizon, Dataplex), and automated pipeline discovery, all database objects MUST follow strict snake_case naming conventions:

### 2.1 Table Prefix Taxonomy

| Layer | Type | Prefix | Example | Description |
|---|---|---|---|---|
| **Bronze** | Raw Stream / Table | `brz_<src>_<entity>` | `brz_gw_policy_change` | Unmodified landing data from Guidewire |
| **Silver** | Normalized Entity | `slv_<domain>_<entity>` | `slv_ins_policy_version` | Cleaned, normalized policy with SCD2 |
| **Silver** | Lookup / Reference | `slv_ref_<entity>` | `slv_ref_coverage_type` | Standardized ISO/NAIC reference codes |
| **Gold** | Dimension Table | `gld_dim_<entity>` | `gld_dim_policy` | Conformed Kimball dimension (SCD1 or SCD2) |
| **Gold** | Fact Table | `gld_fct_<entity>` | `gld_fct_claim_transaction` | Atomic or periodic transactional fact |
| **Gold** | Actuarial Triangle | `gld_tri_<entity>` | `gld_tri_loss_development` | Triangles for Paid, Incurred, and Reserves |
| **Gold** | Aggregated Metric | `gld_agg_<entity>_<grain>`| `gld_agg_policy_monthly` | Pre-computed summary mart for fast queries |
| **Gold** | Regulatory Report | `gld_rpt_<reg>_<schedule>`| `gld_rpt_naic_schedule_p` | Purpose-built regulatory filing schema |

---

## 3. Column Naming & Data Type Standards

### 3.1 Strict Suffix Taxonomy

Every column name MUST indicate its data category via a standardized suffix:

| Suffix | Category | Recommended Data Type | Example | Rule / Description |
|---|---|---|---|---|
| `_sk` | Surrogate Key | `BIGINT` | `policy_sk` | Synthetic identity key generated in Gold |
| `_id` | Business / Natural ID | `VARCHAR(64)` / `STRING` | `policy_number_id` | Originating business key from source system |
| `_hash_key`| Deterministic Hash | `CHAR(64)` / `STRING` | `policy_hk` | SHA-256 hash of conformed natural keys |
| `_dt` | Calendar Date | `DATE` | `loss_dt`, `effective_dt` | Format: `YYYY-MM-DD` (no time component) |
| `_ts` | Timestamp UTC | `TIMESTAMP` | `created_ts`, `claim_open_ts` | Always stored in UTC timezone |
| `_amt` | Monetary Amount | `DECIMAL(18, 2)` | `written_premium_amt` | Financial precision; NEVER use FLOAT or DOUBLE |
| `_pct` | Percentage / Ratio | `DECIMAL(7, 4)` | `commission_pct`, `loss_ratio_pct` | E.g., `0.1550` for 15.50% |
| `_rate` | Factor / Rate | `DECIMAL(9, 6)` | `base_rate`, `earned_factor_rate` | Actuarial rate calculation factor |
| `_cnt` | Count / Integer | `INTEGER` / `BIGINT` | `claim_count_cnt`, `num_vehicles_cnt`| Discreet non-negative whole count |
| `_qty` | Quantity / Units | `DECIMAL(12, 4)` | `exposure_unit_qty` | Continuous quantity or exposure measure |
| `_flg` | Boolean Flag | `BOOLEAN` | `is_current_flg`, `is_litigated_flg` | `TRUE` or `FALSE` (never strings 'Y'/'N') |
| `_cd` | Lookup / ISO Code | `VARCHAR(32)` | `lob_cd`, `state_cd`, `claim_status_cd`| Standard normalized code |
| `_desc` | Text Description | `VARCHAR(255)` / `STRING` | `claim_cause_desc` | Human-readable label or description |
| `_txt` | Long Free Text | `STRING` / `TEXT` | `adjuster_notes_txt` | Unstructured text notes or descriptions |

---

## 4. Universal Audit & Lineage Columns

Every table in Silver and Gold MUST implement standard audit columns. These columns guarantee end-to-end data lineage, auditability for financial examiners, and idempotent CDC processing.

```sql
-- Standard Lakehouse Audit Columns Definition
_src_sys_cd        VARCHAR(32)   NOT NULL, -- Originating system (e.g., 'GUIDEWIRE_PC', 'SAP_FS_CD')
_src_file_name     VARCHAR(255)  NULL,     -- Batch source file name or Kafka topic partition offset
_src_record_id     VARCHAR(128)  NOT NULL, -- Primary key in originating source system
_ingest_ts         TIMESTAMP     NOT NULL, -- UTC timestamp when record landed in Bronze
_etl_job_id        VARCHAR(64)   NOT NULL, -- Pipeline run / Orchestration UUID (Airflow, ADF, Dagster)
_created_ts        TIMESTAMP     NOT NULL, -- UTC timestamp when record was first inserted into this layer
_updated_ts        TIMESTAMP     NOT NULL, -- UTC timestamp when record was last updated in this layer
_valid_from_ts     TIMESTAMP     NOT NULL, -- SCD2 Effective start timestamp (UTC)
_valid_to_ts       TIMESTAMP     NOT NULL, -- SCD2 Effective end timestamp (UTC, 9999-12-31 for current)
_is_current_flg    BOOLEAN       NOT NULL, -- SCD2 Current record indicator (TRUE / FALSE)
_record_hash       CHAR(64)      NOT NULL, -- SHA-256 hash of all non-audit payload attributes for CDC
_dq_score          DECIMAL(5, 2) NULL,     -- Data Quality confidence score (0.00 to 100.00)
_dq_error_flags    ARRAY<STRING> NULL,     -- List of validation warnings (e.g., ['WARN_FUTURE_LOSS_DATE'])
_lakehouse_layer   VARCHAR(16)   NOT NULL  -- 'SILVER' or 'GOLD'
```

---

## 5. Silver Layer Standards: Cleansing & Normalization

### 5.1 Objectives of the Silver Layer
1. **Schema Enforcement & Deduplication**: Eliminate duplicated events using watermark windows and source event IDs.
2. **Type Casting & Domain Constraints**: Ensure `loss_dt <= report_dt`, positive premiums, valid ISO state and currency codes.
3. **Bi-Temporal SCD Type 2**: Preserve historical truth without mutating historical policy or claim states.
4. **Data Cleansing & Standardization**: Standardize addresses (USPS / Google Geocoding), phone formats (E.164), entity resolution.

### 5.2 Insurance Core Entities in Silver

#### 1. Policy Domain: `slv_ins_policy_version`
Captures policy terms, endorsements, renewals, and cancellations as bi-temporal records.
- Keys: `policy_version_id` (PK), `policy_number_id` (Natural Key), `term_number_cnt`.
- Attributes: `lob_cd` (Line of Business: Auto, Property, GL, Workers Comp), `policy_status_cd` (Bound, In-Force, Cancelled, Expired), `effective_dt`, `expiration_dt`, `written_premium_amt`, `taxes_surcharges_amt`.
- Sub-entities: `slv_ins_coverage` (Coverage limits, per-occurrence/aggregate deductibles), `slv_ins_insured_asset` (VIN, Real Estate location, Marine vessel).

#### 2. Claims Domain: `slv_ins_claim_case` & `slv_ins_claim_transaction`
Separates the claim header from atomic financial reserve adjustments and cash disbursements.
- Header (`slv_ins_claim_case`): `claim_number_id`, `policy_number_id`, `loss_dt`, `report_dt`, `closed_dt`, `reopened_dt`, `catastrophe_id` (CAT Code), `claim_status_cd` (Open, Closed, Subrogation, In Litigation).
- Financial Transactions (`slv_ins_claim_transaction`):
  - `transaction_type_cd`: `RESERVE_CHANGE`, `INDEMNITY_PAYMENT`, `EXPENSE_PAYMENT_ALAE`, `EXPENSE_PAYMENT_ULAE`, `SUBROGATION_RECOVERY`, `SALVAGE_RECOVERY`.
  - Amounts: `gross_transaction_amt`, `reinsurance_ceded_amt`, `net_transaction_amt`.

#### 3. Billing Domain: `slv_ins_billing_schedule` & `slv_ins_payment_transaction`
- Invoicing & Receivables (`slv_ins_billing_schedule`): `invoice_number_id`, `policy_number_id`, `installment_number_cnt`, `due_dt`, `billed_amt`, `paid_amt`, `outstanding_balance_amt`.
- Cash Applications (`slv_ins_payment_transaction`): `payment_reference_id`, `payment_dt`, `payment_method_cd` (ACH, Credit Card, Lockbox Check), `payment_status_cd` (Cleared, Bounced, Refunded).

---

## 6. Gold Layer Standards: Dimensional Modeling & Actuarial Marts

The Gold layer transforms conformed Silver entities into Kimball star schemas, fact tables, and optimized aggregates for business intelligence and regulatory compliance.

### 6.1 Star Schema Blueprint

```
                     ┌───────────────────────────┐
                     │     gld_dim_policy        │
                     │  • policy_sk (PK)         │
                     │  • policy_number_id       │
                     │  • line_of_business_cd    │
                     │  • underwriter_name       │
                     └─────────────┬─────────────┘
                                   │
                                   │ 1:N
┌───────────────────────────┐      │      ┌───────────────────────────┐
│     gld_dim_date          │      │      │     gld_dim_claimant      │
│  • date_sk (PK)           │      │      │  • claimant_sk (PK)       │
│  • calendar_dt            │      │      │  • claimant_id            │
│  • accounting_quarter     │      │      │  • claimant_type_cd       │
└─────────────┬─────────────┘      │      └─────────────┬─────────────┘
              │                    │                    │
              │ 1:N                ▼ 1:N                │ 1:N
     ┌────────┴─────────────────────────────────────────┴────────┐
     │                gld_fct_claim_transaction                  │
     │  • claim_transaction_sk (PK)                              │
     │  • policy_sk (FK)                                         │
     │  • claim_sk (FK)                                          │
     │  • claimant_sk (FK)                                       │
     │  • transaction_date_sk (FK)                               │
     │  • paid_loss_indemnity_amt                                │
     │  • paid_loss_alae_amt (Allocated Loss Adjustment Expense) │
     │  • case_reserve_loss_amt                                  │
     │  • case_reserve_alae_amt                                  │
     │  • subrogation_salvage_amt                                │
     │  • net_incurred_loss_amt                                  │
     └───────────────────────────────────────────────────────────┘
```

### 6.2 Key Actuarial Metrics in Gold

1. **Incurred Loss**:
   $$\text{Incurred Loss} = \text{Paid Losses} + \text{Ending Case Reserves} - \text{Beginning Case Reserves} + \text{IBNR}$$
2. **Loss Ratio**:
   $$\text{Loss Ratio} = \frac{\text{Incurred Losses}}{\text{Earned Premium}} \times 100\%$$
3. **Combined Ratio**:
   $$\text{Combined Ratio} = \text{Loss Ratio} + \text{Expense Ratio} = \frac{\text{Incurred Losses} + \text{Underwriting Expenses}}{\text{Earned Premium}} \times 100\%$$
4. **Earned Premium Recognition**:
   Calculated via Daily Pro-Rata or 1/365 method:
   $$\text{Earned Premium Daily} = \text{Total Written Premium} \times \frac{1}{\text{Term Days}}$$

---

## 7. Regulatory & Actuarial Compliance Mapping

| Regulatory Framework | Target Schedule / Report | Required Gold / Silver Entities | Key Required Metrics & Lineage Standards |
|---|---|---|---|
| **NAIC Statutory** | **Schedule P (Parts 1 - 6)** | `gld_tri_loss_development`, `gld_fct_claim_transaction` | 10-year development triangles of Paid Loss, Case Incurred, DCC, A&O Expenses by Line of Business. Traceable to atomic claim checks. |
| **NAIC Statutory** | **Schedule T** | `gld_agg_premium_by_state` | Direct written, direct earned, and dividends paid allocated by US State/Jurisdiction for premium tax calculation. |
| **IFRS 17 / LDTI** | **Contractual Service Margin (CSM)** | `gld_rpt_ifrs17_contract_group` | Cash flows discounted at current interest rates, Best Estimate Liability (BEL), Risk Adjustment for Non-Financial Risk (RA). |
| **Solvency II** | **QRT (Quantitative Reporting)** | `gld_rpt_solvency_s25_scr` | Solvency Capital Requirement (SCR), Minimum Capital Requirement (MCR), Technical Provisions split by Life/Non-Life. |
| **BCBS 239** | **Risk Data Aggregation & Lineage** | Entire Data Lakehouse Lineage Catalog | Fully automated, machine-readable data lineage from source ledger/claim system to regulatory submission; verified audit hashes. |

---

## 8. Delta Lake / Spark SQL Production DDL Examples

```sql
-- SILVER LAYER: Conformed Policy Version with SCD Type 2
CREATE OR REPLACE TABLE lakehouse_silver.slv_ins_policy_version (
    policy_version_id      STRING        NOT NULL COMMENT 'Synthetic unique ID for version instance',
    policy_number_id       STRING        NOT NULL COMMENT 'Natural policy number from source',
    term_number_cnt        INT           NOT NULL COMMENT 'Term sequence number',
    endorsement_number_cnt INT           DEFAULT 0 COMMENT 'Endorsement revision sequence',
    lob_cd                 STRING        NOT NULL COMMENT 'Line of business ISO code',
    policy_status_cd       STRING        NOT NULL COMMENT 'Bound, In-Force, Cancelled',
    effective_dt           DATE          NOT NULL COMMENT 'Coverage effective inception date',
    expiration_dt          DATE          NOT NULL COMMENT 'Coverage expiration date',
    written_premium_amt    DECIMAL(18,2) NOT NULL COMMENT 'Gross written premium for term',
    annualized_premium_amt DECIMAL(18,2) NOT NULL COMMENT 'Calculated annual equivalent',
    
    -- Mandatory Audit & Lineage Columns
    _src_sys_cd            STRING        NOT NULL COMMENT 'Source application name',
    _src_record_id         STRING        NOT NULL COMMENT 'Source primary key',
    _ingest_ts             TIMESTAMP     NOT NULL COMMENT 'Bronze ingest UTC timestamp',
    _etl_job_id            STRING        NOT NULL COMMENT 'Orchestration pipeline execution run ID',
    _created_ts            TIMESTAMP     NOT NULL COMMENT 'Layer insert UTC timestamp',
    _updated_ts            TIMESTAMP     NOT NULL COMMENT 'Layer update UTC timestamp',
    _valid_from_ts         TIMESTAMP     NOT NULL COMMENT 'SCD2 active start UTC timestamp',
    _valid_to_ts           TIMESTAMP     NOT NULL COMMENT 'SCD2 active end UTC timestamp (9999-12-31 for active)',
    _is_current_flg        BOOLEAN       NOT NULL COMMENT 'True if current valid record',
    _record_hash           STRING        NOT NULL COMMENT 'SHA-256 hash of non-audit attributes',
    _dq_score              DECIMAL(5,2)  COMMENT 'Data quality metric 0-100',
    _lakehouse_layer       STRING        DEFAULT 'SILVER'
)
USING DELTA
PARTITIONED BY (lob_cd)
TBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);
```
