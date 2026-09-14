import {
  AuditColumnSpec,
  NamingConventionRule,
  RegulatoryFramework,
  Scd2SimulationStep,
  TableDefinition,
  TransformationRule,
} from '../types';

export const AUDIT_COLUMNS: AuditColumnSpec[] = [
  {
    name: '_src_sys_cd',
    dataType: 'VARCHAR(32)',
    category: 'Source Lineage',
    description: 'Identifier for the originating source operational system or application.',
    rule: 'Must reference a canonical system acronym (e.g., SALESFORCE, SAP_ERP, STRIPE_PAY, SHOPIFY_CORE, POSTGRES_CDC).',
    exampleValue: "'SALESFORCE_CRM'",
  },
  {
    name: '_src_file_name',
    dataType: 'VARCHAR(255)',
    category: 'Source Lineage',
    description: 'Source landing file URI, S3/ADLS bucket path, or Kafka topic partition offset.',
    rule: 'Captures physical origin for reproducibility. Nullable if direct streaming CDC.',
    exampleValue: "'s3://enterprise-raw-landing/orders/2026/09/cdc-batch-108.parquet'",
  },
  {
    name: '_src_record_id',
    dataType: 'VARCHAR(128)',
    category: 'Source Lineage',
    description: 'Primary unique key from the originating operational source database.',
    rule: 'Preserves the raw transactional identifier for end-to-end reconciliation with the source database.',
    exampleValue: "'ord_sf_9041284'",
  },
  {
    name: '_ingest_ts',
    dataType: 'TIMESTAMP',
    category: 'Pipeline Execution',
    description: 'UTC timestamp when the record landed into Bronze lakehouse storage.',
    rule: 'Assigned on initial append-only Bronze write; immutable across subsequent layers.',
    exampleValue: "'2026-09-07 04:15:22.184'",
  },
  {
    name: '_etl_job_id',
    dataType: 'VARCHAR(64)',
    category: 'Pipeline Execution',
    description: 'Orchestration pipeline execution run UUID (e.g. Airflow run_id, dbt invocation_id, Dagster runId).',
    rule: 'Used to correlate all data mutations back to a specific batch or streaming orchestration log.',
    exampleValue: "'dbt_inv_882a-431f-9c42'",
  },
  {
    name: '_created_ts',
    dataType: 'TIMESTAMP',
    category: 'Pipeline Execution',
    description: 'UTC timestamp when this record was first written into the current layer (Silver/Gold).',
    rule: 'Set on initial INSERT. Immutable thereafter.',
    exampleValue: "'2026-09-07 04:18:10.000'",
  },
  {
    name: '_updated_ts',
    dataType: 'TIMESTAMP',
    category: 'Pipeline Execution',
    description: 'UTC timestamp when this record was last modified or updated in the current layer.',
    rule: 'Updated on every UPDATE or MERGE operation.',
    exampleValue: "'2026-09-07 04:18:10.000'",
  },
  {
    name: '_valid_from_ts',
    dataType: 'TIMESTAMP',
    category: 'Bi-Temporal SCD2',
    description: 'SCD Type 2 business validity inception timestamp (UTC).',
    rule: 'Indicates the date/time when this specific state of the entity became active.',
    exampleValue: "'2026-01-01 00:00:00.000'",
  },
  {
    name: '_valid_to_ts',
    dataType: 'TIMESTAMP',
    category: 'Bi-Temporal SCD2',
    description: 'SCD Type 2 business validity expiration timestamp (UTC).',
    rule: 'Set to 9999-12-31 23:59:59.999 for current records; set to superseding valid_from_ts upon mutation.',
    exampleValue: "'9999-12-31 23:59:59.999'",
  },
  {
    name: '_is_current_flg',
    dataType: 'BOOLEAN',
    category: 'Bi-Temporal SCD2',
    description: 'Binary flag indicating whether this is the active snapshot of the entity.',
    rule: 'TRUE if valid_to_ts is 9999-12-31; FALSE if historical/superseded.',
    exampleValue: 'TRUE',
  },
  {
    name: '_record_hash',
    dataType: 'CHAR(64)',
    category: 'Data Integrity',
    description: 'Deterministic SHA-256 hash of all non-audit business attributes.',
    rule: 'Calculated via SHA2(CONCAT_WS("||", COALESCE(col1, ""), ...), 256). Enables high-performance CDC change detection.',
    exampleValue: "'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'",
  },
  {
    name: '_dq_score',
    dataType: 'DECIMAL(5, 2)',
    category: 'Governance',
    description: 'Composite automated Data Quality score (0.00 to 100.00) based on rule evaluation.',
    rule: 'Calculated by Great Expectations, Soda SQL, or Delta Live Tables expectations during Silver ingestion.',
    exampleValue: '99.50',
  },
  {
    name: '_dq_error_flags',
    dataType: 'ARRAY<STRING>',
    category: 'Governance',
    description: 'Array of warnings or non-fatal DQ rule violations caught during transformation.',
    rule: 'Contains standardized tokens such as ["WARN_UNEXPECTED_POSTAL_FORMAT", "WARN_HIGH_DISCOUNT_RATIO"].',
    exampleValue: "['WARN_GEOCODE_APPROXIMATE']",
  },
  {
    name: '_lakehouse_layer',
    dataType: 'VARCHAR(16)',
    category: 'Governance',
    description: 'Literal medallion layer tag.',
    rule: 'Fixed value: "BRONZE", "SILVER", or "GOLD".',
    exampleValue: "'SILVER'",
  },
];

export const NAMING_RULES: NamingConventionRule[] = [
  {
    suffix: '_sk',
    category: 'Surrogate Key',
    allowedTypes: 'BIGINT / INTEGER',
    ruleDescription: 'Synthetic integer sequence or MD5/SHA256 numeric key for dimensional Kimball star joins.',
    validExample: 'customer_sk, product_sk, date_sk, order_sk',
    invalidExample: 'customer_seq, id_surrogate, pk_customer',
    notes: 'Used in Gold layer dimensions and fact foreign keys for optimal OLAP performance.',
  },
  {
    suffix: '_id',
    category: 'Natural / Business Key',
    allowedTypes: 'VARCHAR(64) / STRING',
    ruleDescription: 'Originating enterprise business key from operational source systems.',
    validExample: 'customer_account_id, order_number_id, invoice_id, sku_id',
    invalidExample: 'cust_num, order_no, id, orderId',
    notes: 'Preserves the external alphanumeric identifier that business users and APIs interact with.',
  },
  {
    suffix: '_hash_key',
    category: 'Deterministic Hash Key',
    allowedTypes: 'CHAR(64) / STRING',
    ruleDescription: 'Cryptographic SHA-256 hash of conformed natural keys for distributed joins and Data Vault hubs/links.',
    validExample: 'customer_hash_key, order_item_hash_key',
    invalidExample: 'cust_hash, md5_order, hkey',
    notes: 'Guarantees uniform hash distribution across distributed partitions with zero join skew.',
  },
  {
    suffix: '_dt',
    category: 'Calendar Date',
    allowedTypes: 'DATE',
    ruleDescription: 'Standard calendar date without timestamp (format YYYY-MM-DD).',
    validExample: 'order_dt, delivery_dt, invoice_due_dt, subscription_start_dt',
    invalidExample: 'order_date, deliveryDate, dt_ordered',
    notes: 'Never store time components in _dt columns. Use _ts if precise time matters.',
  },
  {
    suffix: '_ts',
    category: 'Timestamp (UTC)',
    allowedTypes: 'TIMESTAMP / TIMESTAMP_NTZ',
    ruleDescription: 'Precise point in time stored strictly in Universal Coordinated Time (UTC).',
    validExample: 'order_placed_ts, payment_authorized_ts, ingest_ts',
    invalidExample: 'open_time, timestamp_order, created_datetime',
    notes: 'All enterprise lakehouse engines must standardize on UTC to eliminate time-zone ambiguities.',
  },
  {
    suffix: '_amt',
    category: 'Monetary Currency',
    allowedTypes: 'DECIMAL(18, 2) or (24, 4)',
    ruleDescription: 'Financial monetary amount. Strict prohibition against floating point numbers.',
    validExample: 'unit_price_amt, gross_revenue_amt, discount_amt, tax_amt',
    invalidExample: 'price, total_amount, paid_val, amount_paid',
    notes: 'Always accompanied by currency code (_curr_cd) if multi-currency transactions exist.',
  },
  {
    suffix: '_pct',
    category: 'Percentage / Ratio',
    allowedTypes: 'DECIMAL(7, 4)',
    ruleDescription: 'Mathematical ratio represented as a decimal fraction (e.g. 0.1550 for 15.50%).',
    validExample: 'discount_pct, tax_rate_pct, gross_margin_pct, churn_rate_pct',
    invalidExample: 'discount_rate, pct_margin, margin_percentage',
    notes: 'Stored as decimal fraction (0 to 1) or percentage (0 to 100) per enterprise convention.',
  },
  {
    suffix: '_rate',
    category: 'Multiplier / Rate',
    allowedTypes: 'DECIMAL(9, 6)',
    ruleDescription: 'Financial multiplier, exchange rate, or unit conversion factor.',
    validExample: 'currency_exchange_rate, conversion_rate, interest_rate',
    invalidExample: 'rate_factor, mod_val, fx_rate',
    notes: 'Used in financial FX translation and rating models.',
  },
  {
    suffix: '_cnt',
    category: 'Count / Non-Negative Integer',
    allowedTypes: 'INTEGER / BIGINT',
    ruleDescription: 'Discrete whole integer quantity representing counted entities or occurrences.',
    validExample: 'order_line_item_cnt, login_attempt_cnt, seat_licensed_cnt',
    invalidExample: 'num_orders, line_item_count, n_seats',
    notes: 'Must always be non-negative integers.',
  },
  {
    suffix: '_qty',
    category: 'Volumetric / Physical Quantity',
    allowedTypes: 'DECIMAL(12, 4)',
    ruleDescription: 'Continuous units, physical measurements, or inventory quantities.',
    validExample: 'ordered_qty, shipped_qty, inventory_on_hand_qty, weight_kg_qty',
    invalidExample: 'quantity, units, total_qty',
    notes: 'Core driver for inventory replenishment and supply chain analytics.',
  },
  {
    suffix: '_flg',
    category: 'Boolean Flag',
    allowedTypes: 'BOOLEAN',
    ruleDescription: 'Binary true/false indicator. Never store as Y/N or 1/0 strings.',
    validExample: 'is_current_flg, is_active_flg, is_deleted_flg, is_taxable_flg',
    invalidExample: 'current_flag, active_yn, flag_deleted',
    notes: 'Column names must read naturally as a question (is_..., has_..., can_...).',
  },
  {
    suffix: '_cd',
    category: 'Lookup / Standard Code',
    allowedTypes: 'VARCHAR(32)',
    ruleDescription: 'Standard normalized business code, status token, or lookup enum.',
    validExample: 'order_status_cd, country_iso_cd, payment_method_cd, currency_cd',
    invalidExample: 'status, country, method_code, cd_order_status',
    notes: 'Joined to Silver/Gold reference dimension tables for descriptions.',
  },
  {
    suffix: '_desc',
    category: 'Human Description',
    allowedTypes: 'VARCHAR(255) / STRING',
    ruleDescription: 'Short human-readable label or description corresponding to a code.',
    validExample: 'order_status_desc, category_desc, payment_method_desc',
    invalidExample: 'status_name, category_text, description',
    notes: 'Denormalized into Gold dimensions for business reporting convenience.',
  },
  {
    suffix: '_txt',
    category: 'Freeform Text / Notes',
    allowedTypes: 'STRING / TEXT',
    ruleDescription: 'Long narrative text, customer feedback, notes, or execution logs.',
    validExample: 'customer_remarks_txt, fulfillment_instructions_txt, error_log_txt',
    invalidExample: 'notes, summary_text, comments',
    notes: 'Usually excluded from high-speed star schema aggregations or isolated to outriggers.',
  },
];

export const LAKEHOUSE_TABLES: TableDefinition[] = [
  // ----------------------------------------------------
  // SILVER - CUSTOMER DOMAIN
  // ----------------------------------------------------
  {
    id: 'slv_ent_customer_account',
    name: 'slv_ent_customer_account',
    layer: 'silver',
    domain: 'customer',
    grain: 'One row per customer account revision (SCD Type 2 bi-temporal)',
    description: 'Cleaned, normalized enterprise customer master records with bi-temporal versioning tracking plan tiers, contact info, and status.',
    businessPurpose: 'Master data foundation for 360-degree customer analytics, subscription lifecycle tracking, and cohort retention modeling.',
    sourceEntity: 'CRM / Auth Database (Salesforce, Auth0, PostgreSQL user_accounts)',
    primaryKey: ['customer_account_version_id'],
    partitionKeys: ['tier_plan_cd', 'signup_year'],
    scdPattern: 'SCD2',
    upstreamTables: ['brz_raw_customer_events', 'brz_crm_account'],
    downstreamConsumers: ['gld_dim_customer', 'gld_fct_order_sales', 'gld_fct_customer_monthly_snapshot'],
    columns: [
      { name: 'customer_account_version_id', dataType: 'VARCHAR(64)', suffix: '_id', isPrimaryKey: true, isNullable: false, description: 'Surrogate version ID combining account ID and revision sequence.' },
      { name: 'customer_account_id', dataType: 'VARCHAR(64)', suffix: '_id', isNullable: false, description: 'Natural enterprise customer account identifier.' },
      { name: 'company_name', dataType: 'VARCHAR(255)', suffix: '_name', isNullable: true, description: 'Registered business name or primary account label.' },
      { name: 'primary_email', dataType: 'VARCHAR(255)', suffix: '_desc', isNullable: false, description: 'Normalized, validated primary contact email.' },
      { name: 'tier_plan_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isPartitionKey: true, isNullable: false, description: 'Account subscription tier: FREE, STARTER, PRO, ENTERPRISE.' },
      { name: 'account_status_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'Normalized status: TRIAL, ACTIVE, SUSPENDED, CHURNED.' },
      { name: 'seat_licensed_cnt', dataType: 'INTEGER', suffix: '_cnt', isNullable: false, description: 'Number of active user seats contracted on this account.' },
      { name: 'mrr_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Monthly recurring revenue contracted for this account version.' },
      { name: 'country_iso_cd', dataType: 'VARCHAR(8)', suffix: '_cd', isNullable: false, description: 'Billing country ISO 3166-1 alpha-2 code.' },
      { name: 'is_enterprise_sla_flg', dataType: 'BOOLEAN', suffix: '_flg', isNullable: false, description: 'True if customer has dedicated 99.99% uptime enterprise SLA.' },
      { name: '_src_sys_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isAudit: true, isNullable: false, description: 'Originating source system code.' },
      { name: '_src_record_id', dataType: 'VARCHAR(128)', suffix: '_id', isAudit: true, isNullable: false, description: 'Source system primary key.' },
      { name: '_ingest_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Bronze ingestion timestamp UTC.' },
      { name: '_etl_job_id', dataType: 'VARCHAR(64)', suffix: '_id', isAudit: true, isNullable: false, description: 'Data pipeline run identifier.' },
      { name: '_created_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Silver layer creation timestamp UTC.' },
      { name: '_updated_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Silver layer update timestamp UTC.' },
      { name: '_valid_from_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 valid from timestamp.' },
      { name: '_valid_to_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 valid to timestamp (9999-12-31 for active).' },
      { name: '_is_current_flg', dataType: 'BOOLEAN', suffix: '_flg', isAudit: true, isNullable: false, description: 'True if active current version.' },
      { name: '_record_hash', dataType: 'CHAR(64)', suffix: '_hash_key', isAudit: true, isNullable: false, description: 'SHA-256 payload hash for CDC detection.' },
    ],
  },

  // ----------------------------------------------------
  // SILVER - ORDERS & COMMERCE DOMAIN
  // ----------------------------------------------------
  {
    id: 'slv_ent_order_header',
    name: 'slv_ent_order_header',
    layer: 'silver',
    domain: 'orders',
    grain: 'One row per order transaction header',
    description: 'Cleaned and normalized transactional order header tracking customer keys, channel, order status, and financial totals.',
    businessPurpose: 'Core operational anchor for order fulfillment tracking, sales conversion, and gross merchandise volume (GMV).',
    sourceEntity: 'E-Commerce / ERP (Shopify, SAP SD, Stripe Orders)',
    primaryKey: ['order_number_id'],
    partitionKeys: ['order_year', 'order_status_cd'],
    scdPattern: 'SCD1',
    upstreamTables: ['brz_raw_orders'],
    downstreamConsumers: ['gld_fct_order_sales', 'gld_agg_daily_revenue_mart'],
    columns: [
      { name: 'order_number_id', dataType: 'VARCHAR(64)', suffix: '_id', isPrimaryKey: true, isNullable: false, description: 'Canonical business order identifier.' },
      { name: 'customer_account_id', dataType: 'VARCHAR(64)', suffix: '_id', isForeignKey: true, isNullable: false, description: 'FK to slv_ent_customer_account.' },
      { name: 'order_status_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED.' },
      { name: 'order_placed_ts', dataType: 'TIMESTAMP', suffix: '_ts', isNullable: false, description: 'Exact point in time customer submitted the order (UTC).' },
      { name: 'order_dt', dataType: 'DATE', suffix: '_dt', isNullable: false, description: 'Calendar date of order submission.' },
      { name: 'sales_channel_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'Channel: WEB_STORE, MOBILE_APP, B2B_PORTAL, DIRECT_SALES.' },
      { name: 'currency_cd', dataType: 'VARCHAR(8)', suffix: '_cd', isNullable: false, description: 'Transaction currency ISO 4217 (e.g. USD, EUR, GBP).' },
      { name: 'gross_amount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Subtotal amount before discounts and taxes.' },
      { name: 'discount_amount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Promotional and coupon discounts deducted.' },
      { name: 'tax_amount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Sales and value-added tax applied.' },
      { name: 'shipping_fee_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Shipping & freight charges billed to customer.' },
      { name: 'net_order_amount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Final order total charged (Gross - Discount + Tax + Shipping).' },
      { name: 'shipping_postal_cd', dataType: 'VARCHAR(16)', suffix: '_cd', isNullable: false, description: 'Postal/ZIP code of delivery destination.' },
      { name: '_src_sys_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isAudit: true, isNullable: false, description: 'Source operational system code.' },
      { name: '_ingest_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Bronze ingestion timestamp UTC.' },
      { name: '_created_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Silver creation timestamp UTC.' },
      { name: '_record_hash', dataType: 'CHAR(64)', suffix: '_hash_key', isAudit: true, isNullable: false, description: 'Payload hash for deduplication.' },
    ],
  },
  {
    id: 'slv_ent_order_line_item',
    name: 'slv_ent_order_line_item',
    layer: 'silver',
    domain: 'orders',
    grain: 'One row per ordered product line item within an order',
    description: 'Normalized line-item details tracking SKU keys, ordered quantity, unit selling prices, and allocated discounts.',
    businessPurpose: 'Powers basket analysis, product margin performance, and inventory consumption forecasting.',
    sourceEntity: 'E-Commerce / ERP Order Line Items',
    primaryKey: ['order_line_item_id'],
    partitionKeys: ['order_year'],
    scdPattern: 'Append-Only',
    upstreamTables: ['brz_raw_orders'],
    downstreamConsumers: ['gld_fct_order_sales', 'gld_dim_product'],
    columns: [
      { name: 'order_line_item_id', dataType: 'VARCHAR(64)', suffix: '_id', isPrimaryKey: true, isNullable: false, description: 'Unique line item identifier.' },
      { name: 'order_number_id', dataType: 'VARCHAR(64)', suffix: '_id', isForeignKey: true, isNullable: false, description: 'FK to slv_ent_order_header.' },
      { name: 'line_number_cnt', dataType: 'INTEGER', suffix: '_cnt', isNullable: false, description: 'Sequential line index within order (1, 2, 3...).' },
      { name: 'product_sku_id', dataType: 'VARCHAR(64)', suffix: '_id', isForeignKey: true, isNullable: false, description: 'FK to slv_ent_product_catalog.' },
      { name: 'ordered_qty', dataType: 'DECIMAL(12, 4)', suffix: '_qty', isNullable: false, description: 'Number of units ordered.' },
      { name: 'unit_price_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Unit selling price at time of purchase.' },
      { name: 'unit_cost_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Standard unit cost of goods sold (COGS).' },
      { name: 'line_gross_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Ordered quantity multiplied by unit price.' },
      { name: 'line_discount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Item-level discount applied.' },
      { name: 'line_net_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Line gross amount minus line discount.' },
      { name: '_src_sys_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isAudit: true, isNullable: false, description: 'Source system code.' },
      { name: '_created_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Silver write timestamp.' },
    ],
  },

  // ----------------------------------------------------
  // SILVER - PRODUCTS & INVENTORY DOMAIN
  // ----------------------------------------------------
  {
    id: 'slv_ent_product_catalog',
    name: 'slv_ent_product_catalog',
    layer: 'silver',
    domain: 'products',
    grain: 'One row per product SKU revision (SCD Type 2)',
    description: 'Cleaned product catalog with standardized hierarchies, brand metadata, MSRP, and base manufacturing costs.',
    businessPurpose: 'Master product dimension supporting merchandising analytics, pricing elasticity, and catalog management.',
    sourceEntity: 'PIM / ERP Catalog (SAP MM, Akeneo, Shopify Products)',
    primaryKey: ['product_version_id'],
    partitionKeys: ['category_cd'],
    scdPattern: 'SCD2',
    upstreamTables: ['brz_raw_product_catalog'],
    downstreamConsumers: ['gld_dim_product', 'gld_fct_order_sales'],
    columns: [
      { name: 'product_version_id', dataType: 'VARCHAR(64)', suffix: '_id', isPrimaryKey: true, isNullable: false, description: 'Surrogate product version ID.' },
      { name: 'product_sku_id', dataType: 'VARCHAR(64)', suffix: '_id', isNullable: false, description: 'Canonical business SKU identifier.' },
      { name: 'product_name', dataType: 'VARCHAR(255)', suffix: '_name', isNullable: false, description: 'Full marketing product title.' },
      { name: 'category_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'Top-level category taxonomy code.' },
      { name: 'sub_category_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'Secondary sub-category taxonomy code.' },
      { name: 'brand_name', dataType: 'VARCHAR(128)', suffix: '_name', isNullable: false, description: 'Brand or manufacturer label.' },
      { name: 'msrp_price_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Manufacturer suggested retail price.' },
      { name: 'standard_cost_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Baseline manufacturing / acquisition cost.' },
      { name: 'is_discontinued_flg', dataType: 'BOOLEAN', suffix: '_flg', isNullable: false, description: 'True if SKU is no longer actively manufactured or stocked.' },
      { name: '_valid_from_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 start timestamp.' },
      { name: '_valid_to_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 end timestamp.' },
      { name: '_is_current_flg', dataType: 'BOOLEAN', suffix: '_flg', isAudit: true, isNullable: false, description: 'Current active flag.' },
      { name: '_record_hash', dataType: 'CHAR(64)', suffix: '_hash_key', isAudit: true, isNullable: false, description: 'Payload hash for CDC.' },
    ],
  },

  // ----------------------------------------------------
  // SILVER - FINANCE & PAYMENTS DOMAIN
  // ----------------------------------------------------
  {
    id: 'slv_ent_payment_transaction',
    name: 'slv_ent_payment_transaction',
    layer: 'silver',
    domain: 'finance',
    grain: 'One row per cash receipt, authorization, or refund event',
    description: 'Immutable financial ledger of all payment gateway authorizations, captured funds, fee deductions, and chargebacks.',
    businessPurpose: 'Cash reconciliations, merchant fee optimization, revenue recognition, and financial general ledger feeds.',
    sourceEntity: 'Payment Gateways & Banking Feeds (Stripe, Adyen, Bank Wire)',
    primaryKey: ['payment_transaction_id'],
    partitionKeys: ['payment_year', 'payment_status_cd'],
    scdPattern: 'Append-Only',
    upstreamTables: ['brz_raw_payments'],
    downstreamConsumers: ['gld_fct_order_sales', 'gld_agg_daily_revenue_mart'],
    columns: [
      { name: 'payment_transaction_id', dataType: 'VARCHAR(64)', suffix: '_id', isPrimaryKey: true, isNullable: false, description: 'Unique payment ledger transaction ID.' },
      { name: 'order_number_id', dataType: 'VARCHAR(64)', suffix: '_id', isForeignKey: true, isNullable: false, description: 'Associated order contract.' },
      { name: 'customer_account_id', dataType: 'VARCHAR(64)', suffix: '_id', isForeignKey: true, isNullable: false, description: 'Target customer account.' },
      { name: 'payment_status_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'AUTHORIZED, CAPTURED, REFUNDED, DISPUTED_CHARGEBACK.' },
      { name: 'payment_method_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'CREDIT_CARD, ACH_DEBIT, WIRE_TRANSFER, APPLE_PAY, PAYPAL.' },
      { name: 'payment_dt', dataType: 'DATE', suffix: '_dt', isNullable: false, description: 'Financial settlement date.' },
      { name: 'gross_amount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Total gross cash transacted.' },
      { name: 'gateway_fee_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Processing fee retained by merchant gateway.' },
      { name: 'net_settled_amount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Net funds deposited into corporate bank account.' },
      { name: '_src_sys_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isAudit: true, isNullable: false, description: 'Source system code.' },
      { name: '_ingest_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Ingest timestamp UTC.' },
      { name: '_created_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Silver write timestamp.' },
    ],
  },

  // ----------------------------------------------------
  // GOLD - STAR SCHEMAS & FACT MARTS
  // ----------------------------------------------------
  {
    id: 'gld_dim_customer',
    name: 'gld_dim_customer',
    layer: 'gold',
    domain: 'customer',
    grain: 'One row per conformed customer version (SCD Type 2)',
    description: 'Conformed dimensional model for customers with denormalized plan tiers, geography, and behavioral RFM scores.',
    businessPurpose: 'Dimension for slicing and dicing revenue, churn rates, average order values, and cohort retention in BI tools.',
    sourceEntity: 'slv_ent_customer_account joined with reference lookups and customer scorecards',
    primaryKey: ['customer_sk'],
    partitionKeys: ['tier_plan_cd'],
    scdPattern: 'SCD2',
    upstreamTables: ['slv_ent_customer_account', 'slv_ref_country'],
    downstreamConsumers: ['Executive Dashboards', 'Power BI / Tableau', 'Marketing Attribution Models'],
    columns: [
      { name: 'customer_sk', dataType: 'BIGINT', suffix: '_sk', isPrimaryKey: true, isSurrogateKey: true, isNullable: false, description: 'Surrogate integer key for lightning-fast OLAP joins.' },
      { name: 'customer_account_id', dataType: 'VARCHAR(64)', suffix: '_id', isNullable: false, description: 'Business customer account number.' },
      { name: 'company_name', dataType: 'VARCHAR(255)', suffix: '_name', isNullable: false, description: 'Account name or individual display name.' },
      { name: 'tier_plan_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'Subscription tier code.' },
      { name: 'tier_plan_desc', dataType: 'VARCHAR(255)', suffix: '_desc', isNullable: false, description: 'Friendly tier name (e.g. Enterprise Tier Plus).' },
      { name: 'account_status_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isNullable: false, description: 'Current lifecycle status code.' },
      { name: 'country_name', dataType: 'VARCHAR(128)', suffix: '_name', isNullable: false, description: 'Full country name from conformed ISO lookup.' },
      { name: 'customer_lifetime_value_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Cumulative historic revenue recognized from this customer.' },
      { name: '_valid_from_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 start.' },
      { name: '_valid_to_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 end.' },
      { name: '_is_current_flg', dataType: 'BOOLEAN', suffix: '_flg', isAudit: true, isNullable: false, description: 'Current active flag.' },
    ],
  },
  {
    id: 'gld_dim_product',
    name: 'gld_dim_product',
    layer: 'gold',
    domain: 'products',
    grain: 'One row per product SKU version (SCD Type 2)',
    description: 'Conformed dimensional model for products with hierarchical category rollups, brand attributes, and MSRP pricing.',
    businessPurpose: 'Dimension for slicing order sales, margin analysis, and inventory velocity across product catalogs.',
    sourceEntity: 'slv_ent_product_catalog enriched with category hierarchies',
    primaryKey: ['product_sk'],
    partitionKeys: ['category_cd'],
    scdPattern: 'SCD2',
    upstreamTables: ['slv_ent_product_catalog'],
    downstreamConsumers: ['Merchandising BI', 'Pricing Elasticity Models'],
    columns: [
      { name: 'product_sk', dataType: 'BIGINT', suffix: '_sk', isPrimaryKey: true, isSurrogateKey: true, isNullable: false, description: 'Surrogate integer key.' },
      { name: 'product_sku_id', dataType: 'VARCHAR(64)', suffix: '_id', isNullable: false, description: 'Business SKU identifier.' },
      { name: 'product_name', dataType: 'VARCHAR(255)', suffix: '_name', isNullable: false, description: 'Product title.' },
      { name: 'category_desc', dataType: 'VARCHAR(255)', suffix: '_desc', isNullable: false, description: 'Human-readable category title.' },
      { name: 'brand_name', dataType: 'VARCHAR(128)', suffix: '_name', isNullable: false, description: 'Brand title.' },
      { name: 'msrp_price_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Suggested retail price.' },
      { name: 'standard_cost_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Product unit cost.' },
      { name: '_valid_from_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 start.' },
      { name: '_valid_to_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'SCD2 end.' },
      { name: '_is_current_flg', dataType: 'BOOLEAN', suffix: '_flg', isAudit: true, isNullable: false, description: 'Current active flag.' },
    ],
  },
  {
    id: 'gld_fct_order_sales',
    name: 'gld_fct_order_sales',
    layer: 'gold',
    domain: 'orders',
    grain: 'One row per ordered product line item at atomic transaction grain',
    description: 'Central transactional Kimball fact table joining orders, line items, customers, products, and calendar dates with revenue and margin metrics.',
    businessPurpose: 'Foundational fact table for revenue recognition, product profit margins, and sales channel performance.',
    sourceEntity: 'slv_ent_order_header joined with slv_ent_order_line_item',
    primaryKey: ['order_sales_sk'],
    partitionKeys: ['order_year'],
    scdPattern: 'Append-Only',
    upstreamTables: ['slv_ent_order_header', 'slv_ent_order_line_item', 'gld_dim_customer', 'gld_dim_product', 'gld_dim_date'],
    downstreamConsumers: ['Revenue Analytics', 'Executive Dashboards', 'Financial Auditing'],
    columns: [
      { name: 'order_sales_sk', dataType: 'BIGINT', suffix: '_sk', isPrimaryKey: true, isSurrogateKey: true, isNullable: false, description: 'Surrogate PK for transaction.' },
      { name: 'customer_sk', dataType: 'BIGINT', suffix: '_sk', isForeignKey: true, isNullable: false, description: 'FK to gld_dim_customer.' },
      { name: 'product_sk', dataType: 'BIGINT', suffix: '_sk', isForeignKey: true, isNullable: false, description: 'FK to gld_dim_product.' },
      { name: 'date_sk', dataType: 'INTEGER', suffix: '_sk', isForeignKey: true, isNullable: false, description: 'FK to gld_dim_date (YYYYMMDD).' },
      { name: 'ordered_qty', dataType: 'DECIMAL(12, 4)', suffix: '_qty', isNullable: false, description: 'Quantity ordered.' },
      { name: 'gross_sales_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Gross sales before discounts.' },
      { name: 'discount_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Discount applied to this line.' },
      { name: 'net_sales_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Net revenue recognized (Gross - Discount).' },
      { name: 'cogs_cost_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Cost of goods sold (Ordered Qty * Standard Unit Cost).' },
      { name: 'gross_profit_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Gross profit (Net Sales - COGS).' },
      { name: '_created_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Creation timestamp UTC.' },
    ],
  },
  {
    id: 'gld_fct_customer_monthly_snapshot',
    name: 'gld_fct_customer_monthly_snapshot',
    layer: 'gold',
    domain: 'finance',
    grain: 'One row per active or churned customer account per calendar month',
    description: 'Periodic monthly snapshot tracking monthly recurring revenue (MRR), net expansion, churn status, and contracted seat capacity.',
    businessPurpose: 'Subscription economics, cohort retention curves, ASC 606 revenue recognition, and SaaS metrics (NDR, Churn).',
    sourceEntity: 'slv_ent_customer_account evaluated against calendar month-end dates',
    primaryKey: ['customer_sk', 'accounting_month_sk'],
    partitionKeys: ['accounting_year'],
    scdPattern: 'Periodic Snapshot',
    upstreamTables: ['gld_dim_customer', 'gld_dim_date_month'],
    downstreamConsumers: ['Finance Planning & Analysis (FP&A)', 'SaaS Metric Engines'],
    columns: [
      { name: 'customer_sk', dataType: 'BIGINT', suffix: '_sk', isPrimaryKey: true, isForeignKey: true, isNullable: false, description: 'FK to gld_dim_customer.' },
      { name: 'accounting_month_sk', dataType: 'INTEGER', suffix: '_sk', isPrimaryKey: true, isNullable: false, description: 'Year-Month key (YYYYMM).' },
      { name: 'starting_mrr_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Contracted MRR at start of month.' },
      { name: 'expansion_mrr_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Upgrades or added seats during the month.' },
      { name: 'contraction_mrr_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Downgrades or reduced seats during the month.' },
      { name: 'churned_mrr_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Lost MRR from accounts that cancelled.' },
      { name: 'ending_mrr_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Ending active MRR on last day of month.' },
      { name: 'seat_licensed_cnt', dataType: 'INTEGER', suffix: '_cnt', isNullable: false, description: 'Contracted seats at month-end.' },
      { name: '_created_ts', dataType: 'TIMESTAMP', suffix: '_ts', isAudit: true, isNullable: false, description: 'Snapshot creation timestamp.' },
    ],
  },
  {
    id: 'gld_agg_daily_revenue_mart',
    name: 'gld_agg_daily_revenue_mart',
    layer: 'gold',
    domain: 'finance',
    grain: 'One row per Date x Sales Channel x Country x Product Category',
    description: 'Pre-aggregated rollup mart computing daily gross sales, net revenue, discounts, orders count, and gross profit margin.',
    businessPurpose: 'Sub-second response times for executive dashboards, real-time sales monitors, and regional performance reviews.',
    sourceEntity: 'gld_fct_order_sales aggregated by dimensional slices',
    primaryKey: ['date_sk', 'sales_channel_cd', 'country_iso_cd', 'category_cd'],
    partitionKeys: ['date_year'],
    scdPattern: 'Periodic Snapshot',
    upstreamTables: ['gld_fct_order_sales', 'gld_dim_customer', 'gld_dim_product'],
    downstreamConsumers: ['Executive Cockpit', 'Tableau / Power BI Embedded Dashboards'],
    columns: [
      { name: 'date_sk', dataType: 'INTEGER', suffix: '_sk', isPrimaryKey: true, isNullable: false, description: 'Date dimension key (YYYYMMDD).' },
      { name: 'sales_channel_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isPrimaryKey: true, isNullable: false, description: 'Channel code.' },
      { name: 'country_iso_cd', dataType: 'VARCHAR(8)', suffix: '_cd', isPrimaryKey: true, isNullable: false, description: 'Country code.' },
      { name: 'category_cd', dataType: 'VARCHAR(32)', suffix: '_cd', isPrimaryKey: true, isNullable: false, description: 'Product category code.' },
      { name: 'total_orders_cnt', dataType: 'INTEGER', suffix: '_cnt', isNullable: false, description: 'Count of unique orders placed.' },
      { name: 'total_gross_sales_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Sum of gross line amounts.' },
      { name: 'total_net_sales_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Sum of net recognized revenue.' },
      { name: 'total_cogs_amt', dataType: 'DECIMAL(18, 2)', suffix: '_amt', isNullable: false, description: 'Total cost of goods sold.' },
      { name: 'gross_margin_pct', dataType: 'DECIMAL(7, 4)', suffix: '_pct', isNullable: false, description: 'Calculated profit margin ratio ((Net - COGS) / Net).' },
    ],
  },
];

export const SCD2_SIMULATION_STEPS: Scd2SimulationStep[] = [
  {
    stepNumber: 1,
    eventTitle: 'Initial Customer Account Signup (Starter Plan)',
    eventDescription: 'A customer signs up for the Starter Plan with 5 user seats at $49.00/month. The record is validated and inserted into the Silver layer as Version 0.',
    timestamp: '2026-01-01 00:00:00 UTC',
    incomingPayload: {
      action: 'NEW_SUBSCRIPTION',
      customer_account_id: 'ACCT-ENTERPRISE-8910',
      tier_plan_cd: 'STARTER',
      seats_cnt: 5,
      mrr_amt: 49.00,
      effective_dt: '2026-01-01',
    },
    resultingRows: [
      {
        id: 'ROW_001',
        version_id: 'ACCT-8910_v0',
        business_key: 'ACCT-ENTERPRISE-8910',
        tier_plan_cd: 'STARTER',
        mrr_amt: 49.00,
        seats_cnt: 5,
        valid_from: '2026-01-01 00:00:00',
        valid_to: '9999-12-31 23:59:59',
        is_current: true,
        record_hash: 'a1f8c3...90de',
        action_highlight: 'inserted',
      },
    ],
  },
  {
    stepNumber: 2,
    eventTitle: 'Mid-Cycle Plan Upgrade: Pro Tier Transition',
    eventDescription: 'On March 15th, the account upgrades to the Pro Tier with 20 user seats ($199.00/month). SCD2 expires Version 0 and inserts Version 1 with active status.',
    timestamp: '2026-03-15 10:30:00 UTC',
    incomingPayload: {
      action: 'PLAN_UPGRADE',
      customer_account_id: 'ACCT-ENTERPRISE-8910',
      tier_plan_cd: 'PRO',
      seats_cnt: 20,
      mrr_amt: 199.00,
      effective_dt: '2026-03-15',
    },
    resultingRows: [
      {
        id: 'ROW_001',
        version_id: 'ACCT-8910_v0',
        business_key: 'ACCT-ENTERPRISE-8910',
        tier_plan_cd: 'STARTER',
        mrr_amt: 49.00,
        seats_cnt: 5,
        valid_from: '2026-01-01 00:00:00',
        valid_to: '2026-03-15 10:30:00',
        is_current: false,
        record_hash: 'a1f8c3...90de',
        action_highlight: 'expired',
      },
      {
        id: 'ROW_002',
        version_id: 'ACCT-8910_v1',
        business_key: 'ACCT-ENTERPRISE-8910',
        tier_plan_cd: 'PRO',
        mrr_amt: 199.00,
        seats_cnt: 20,
        valid_from: '2026-03-15 10:30:00',
        valid_to: '9999-12-31 23:59:59',
        is_current: true,
        record_hash: 'f942bc...3371',
        action_highlight: 'inserted',
      },
    ],
  },
  {
    stepNumber: 3,
    eventTitle: 'Enterprise Seat Expansion & SLA Add-On',
    eventDescription: 'On June 1st, customer contracts 20 additional seats (total 40 seats) and enterprise SLA, adjusting contracted MRR to $349.00/month.',
    timestamp: '2026-06-01 14:00:00 UTC',
    incomingPayload: {
      action: 'SEAT_EXPANSION',
      customer_account_id: 'ACCT-ENTERPRISE-8910',
      tier_plan_cd: 'ENTERPRISE',
      seats_cnt: 40,
      mrr_amt: 349.00,
      effective_dt: '2026-06-01',
    },
    resultingRows: [
      {
        id: 'ROW_001',
        version_id: 'ACCT-8910_v0',
        business_key: 'ACCT-ENTERPRISE-8910',
        tier_plan_cd: 'STARTER',
        mrr_amt: 49.00,
        seats_cnt: 5,
        valid_from: '2026-01-01 00:00:00',
        valid_to: '2026-03-15 10:30:00',
        is_current: false,
        record_hash: 'a1f8c3...90de',
        action_highlight: 'unchanged',
      },
      {
        id: 'ROW_002',
        version_id: 'ACCT-8910_v1',
        business_key: 'ACCT-ENTERPRISE-8910',
        tier_plan_cd: 'PRO',
        mrr_amt: 199.00,
        seats_cnt: 20,
        valid_from: '2026-03-15 10:30:00',
        valid_to: '2026-06-01 14:00:00',
        is_current: false,
        record_hash: 'f942bc...3371',
        action_highlight: 'expired',
      },
      {
        id: 'ROW_003',
        version_id: 'ACCT-8910_v2',
        business_key: 'ACCT-ENTERPRISE-8910',
        tier_plan_cd: 'ENTERPRISE',
        mrr_amt: 349.00,
        seats_cnt: 40,
        valid_from: '2026-06-01 14:00:00',
        valid_to: '9999-12-31 23:59:59',
        is_current: true,
        record_hash: '7c891e...e109',
        action_highlight: 'inserted',
      },
    ],
  },
];

export const REGULATORY_FRAMEWORKS: RegulatoryFramework[] = [
  {
    id: 'sox_404',
    title: 'SOX Section 404: Internal Controls over Financial Reporting',
    authority: 'U.S. Securities and Exchange Commission (SEC) & PCAOB',
    frequency: 'Continuous pipeline controls with annual external auditor attestation',
    targetMarts: ['gld_fct_order_sales', 'gld_fct_customer_monthly_snapshot', 'gld_agg_daily_revenue_mart'],
    keyMetrics: [
      'End-to-end reconciliation from raw transaction logs to GL journal entries',
      'Immutable cryptographic hash audit trails (_record_hash verification)',
      'Segregation of duties (SoD) between data pipeline authoring and production commits',
      'Automated variance detection between operational CRM/ERP and Gold revenue marts',
    ],
    lineageRequirements: 'Every financial metric reported in executive P&L dashboards must reconcile with 100% mathematical precision back to atomic Silver transactions and Bronze raw payloads.',
    summary: 'Ensures public enterprise financial integrity. Mandates automated, verifiable internal controls preventing ledger tampering, missing revenue, or unauthorized journal adjustments.',
    formulaOrFormat: 'Financial Completeness: SUM(Bronze Raw Revenue) - SUM(Silver Conformed Revenue) = $0.00 (Zero Drift)',
  },
  {
    id: 'gdpr_ccpa',
    title: 'GDPR (Art. 17) & CCPA: Data Privacy & Right to Erasure in Lakehouses',
    authority: 'European Data Protection Board (EDPB) & California Privacy Protection Agency (CPPA)',
    frequency: 'Continuous compliance (requests must be executed within 30 days)',
    targetMarts: ['slv_ent_customer_account', 'gld_dim_customer', 'All Bronze raw payload archives'],
    keyMetrics: [
      'Deterministic PII Tokenization / Pseudonymization at Silver ingestion',
      'Crypto-Shredding (erasing encryption key to render historical snapshots unreadable)',
      'Delta Lake / Iceberg row-level MERGE deletion execution logs',
      'Traceable Subject Access Request (SAR) audit certificates',
    ],
    lineageRequirements: 'Lakehouse engines must maintain metadata lineage mapping hashed customer identifiers back to operational requests to prove complete erasure without corrupting aggregated facts.',
    summary: 'Enforces user privacy and Right to be Forgotten. In append-only lakehouses, requires either partition compaction rewrites or crypto-shredding key deletion to comply with statutory privacy mandates.',
    formulaOrFormat: 'Crypto-Shredding: PII = Decrypt(AES_256(Raw_Email), Key_ID); Upon Erasure -> DELETE FROM key_vault WHERE key_id = :id',
  },
  {
    id: 'soc2_type2',
    title: 'SOC 2 Type II & ISO 27001: Security, Availability & Integrity Controls',
    authority: 'American Institute of CPAs (AICPA) & International Organization for Standardization',
    frequency: 'Continuous automated monitoring with annual independent audit period',
    targetMarts: ['Whole Lakehouse Lineage Catalog & Unity Catalog / Snowflake Horizon Metadata'],
    keyMetrics: [
      'Role-Based & Attribute-Based Access Control (RBAC/ABAC) audit logs',
      'Data-at-Rest and Data-in-Transit encryption verification (AES-256 / TLS 1.3)',
      'Automated disaster recovery RPO (<1 hour) and RTO (<4 hours) compliance',
      'Change Data Capture (CDC) pipeline tamper detection and exception logging',
    ],
    lineageRequirements: 'Mandates end-to-end provenance demonstrating that no unauthorized or un-reviewed schema modifications or direct database writes bypassed CI/CD automation.',
    summary: 'The universal enterprise benchmark for cloud data platforms. Assures customers that data pipelines operate under audited access controls and certified availability SLAs.',
    formulaOrFormat: 'Pipeline Integrity: Passed_DQ_Tests / Total_Pipeline_Runs >= 99.95%',
  },
  {
    id: 'bcbs_239',
    title: 'BCBS 239: Principles for Effective Risk Data Aggregation',
    authority: 'Basel Committee on Banking Supervision & Global Enterprise Risk Bodies',
    frequency: 'Continuous Governance & Supervisory Spot Audits',
    targetMarts: ['Enterprise Enterprise Data Catalog & Metadata Repository'],
    keyMetrics: [
      'Data Lineage Completeness (100% automated Source-to-Target mapping)',
      'Data Quality Index (% of passed reconciliation checks across ingestion)',
      'Aggregation Timeliness (minutes/hours from operational event to risk reporting)',
      'Cryptographic record verification and automated data dictionary coverage',
    ],
    lineageRequirements: 'Mandates fully automated, non-manual, machine-readable data lineage graphs documenting all data transformations, joins, and validation gates.',
    summary: 'Prevents manual desktop spreadsheet manipulation in corporate risk and reporting; mandates immutable audit trails and verified transformation logic across the lakehouse.',
    formulaOrFormat: 'Automated Lineage Verification: Hash(Raw) -> Hash(Silver) -> Hash(Gold) audit completeness = 100%',
  },
  {
    id: 'asc_606_ifrs_15',
    title: 'ASC 606 & IFRS 15: Revenue from Contracts with Customers',
    authority: 'Financial Accounting Standards Board (FASB) & IASB',
    frequency: 'Monthly & Quarterly financial close',
    targetMarts: ['gld_fct_customer_monthly_snapshot', 'gld_fct_order_sales'],
    keyMetrics: [
      'Identification of Performance Obligations in customer contracts',
      'Transaction price allocation across distinct deliverables and service periods',
      'Amortization of Deferred / Unearned Revenue over subscription terms',
      'Contract Asset / Liability balance sheet tracking and adjustments',
    ],
    lineageRequirements: 'Direct audit link between operational order terms, billing schedules, and monthly recognized revenue entries in Gold snapshot marts.',
    summary: 'The universal accounting standard governing how companies recognize revenue over time as performance obligations are satisfied, separating billings from recognized income.',
    formulaOrFormat: 'Recognized Revenue = Contract Value * (Elapsed Service Days / Total Contract Term Days)',
  },
];

export const TRANSFORMATION_RULES: TransformationRule[] = [
  {
    id: 'TR_00_STREAMING_BRONZE_INGEST',
    title: 'Streaming Raw Ingestion (Kafka/Blob → Bronze)',
    domain: 'customer',
    sourceLayer: 'bronze',
    targetLayer: 'bronze',
    summary: 'PySpark Structured Streaming pipeline using Databricks Auto Loader (cloudFiles) with schema inference, rescue data column, and append-only audit tracking.',
    businessRules: [
      'Schema Evolution: Automatically infers new schema attributes while storing corrupted payloads in _rescued_data.',
      'Audit Injection: Injects _ingest_ts (UTC), _src_file_name (input_file_name()), and unique batch UUID.',
      'Append-Only Invariant: Zero updates or deletes permitted in the Bronze layer; purely immutable transactional landing.',
    ],
    pythonSnippet: `# Databricks / Apache Spark: PySpark Structured Streaming Ingestion
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def ingest_raw_stream(spark: SparkSession, raw_storage_path: str, checkpoint_path: str):
    """
    Ingests raw JSON/Avro events into Bronze Delta Lake using Auto Loader.
    Enforces append-only immutable landing with lineage audit columns.
    """
    df_raw = (
        spark.readStream
        .format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("cloudFiles.schemaLocation", f"{checkpoint_path}/schema")
        .option("cloudFiles.inferColumnTypes", "true")
        .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
        .load(raw_storage_path)
    )

    df_bronze = (
        df_raw
        .withColumn("_ingest_ts", F.current_timestamp())
        .withColumn("_src_file_name", F.input_file_name())
        .withColumn("_lakehouse_layer", F.lit("BRONZE"))
    )

    query = (
        df_bronze.writeStream
        .format("delta")
        .outputMode("append")
        .option("checkpointLocation", f"{checkpoint_path}/checkpoints")
        .trigger(availableNow=True)
        .toTable("lakehouse_bronze.brz_raw_customer_events")
    )
    return query`,
    dltSnippet: `# Delta Live Tables (DLT) Bronze Streaming Table
import dlt
from pyspark.sql import functions as F

@dlt.table(
    name="brz_raw_customer_events",
    comment="Immutable raw Bronze stream ingested via Auto Loader with rescue data tracking",
    table_properties={"quality": "bronze", "delta.autoOptimize.optimizeWrite": "true"}
)
def brz_raw_customer_events():
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "json")
        .load("/mnt/lakehouse-landing/customers/")
        .withColumn("_ingest_ts", F.current_timestamp())
        .withColumn("_src_file_name", F.input_file_name())
        .withColumn("_lakehouse_layer", F.lit("BRONZE"))
    )`,
    sqlSnippet: `-- Spark SQL Bronze Streaming Definition
CREATE OR REFRESH STREAMING TABLE lakehouse_bronze.brz_raw_customer_events
AS SELECT 
    *,
    current_timestamp() AS _ingest_ts,
    _metadata.file_name AS _src_file_name,
    'BRONZE' AS _lakehouse_layer
FROM STREAM read_files('/mnt/landing/customers/', format => 'json');`,
    runnablePythonScript: `import hashlib, json, datetime

# Mock raw streaming batch from Kafka / S3
raw_payloads = [
    {"account_id": "ACC-901", "company_name": "Acme Global", "plan_tier": "starter", "mrr": 499.0, "status": "active"},
    {"account_id": "ACC-902", "company_name": "BioHealth Corp", "plan_tier": "growth", "mrr": 1850.0, "status": "active"},
    {"account_id": "ACC-903", "company_name": "Omni Logistics", "plan_tier": "enterprise", "mrr": 5200.0, "status": "trial"}
]

print("=== BRONZE INGESTION PIPELINE (Python Simulation) ===")
now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
for r in raw_payloads:
    r["_ingest_ts"] = now_iso
    r["_lakehouse_layer"] = "BRONZE"
    r["_src_sys_cd"] = "KAFKA_STREAM"
    print(f"Landed -> {r['account_id']} | {r['company_name']} | MRR: \${r['mrr']} | Status: {r['status']}")

print(f"\\nSuccessfully ingested {len(raw_payloads)} records into Bronze Delta table brz_raw_customer_events.")`,
  },
  {
    id: 'TR_01_BRZ_TO_SLV_CUSTOMER',
    title: 'Customer Ingestion & SCD Type 2 Normalization (Bronze → Silver)',
    domain: 'customer',
    sourceLayer: 'bronze',
    targetLayer: 'silver',
    summary: 'Deduplicates raw CDC payloads from CRM/Auth streams, computes deterministic SHA-256 payload hashes, and executes bi-temporal SCD2 versioning using delta.tables.DeltaTable.',
    businessRules: [
      'Email Validation: Must conform to standard email regex syntax and be normalized to lowercase.',
      'Deduplication: Window rank partitioned by customer_account_id ordered by _ingest_ts DESC.',
      'Hash generation: SHA2-256 computed across all normalized business attributes to detect true state changes.',
      'SCD2 Expiration: Mutates previous row _valid_to_ts to incoming _valid_from_ts and sets _is_current_flg = False.',
    ],
    pythonSnippet: `# PySpark & Delta Lake Python API: Bi-temporal SCD Type 2 Merge
from delta.tables import DeltaTable
from pyspark.sql import SparkSession, Window
from pyspark.sql import functions as F

def merge_customer_scd2(spark: SparkSession, bronze_table: str, silver_table: str):
    """
    Executes an atomic SCD Type 2 merge in Python using DeltaTable API.
    Deduplicates incoming Bronze rows and updates historical version intervals.
    """
    # 1. Deduplicate incoming batch and compute deterministic SHA-256 hash
    w = Window.partitionBy("account_id").orderBy(F.col("_ingest_ts").desc())
    
    df_updates = (
        spark.table(bronze_table)
        .withColumn("row_num", F.row_number().over(w))
        .filter(F.col("row_num") == 1)
        .select(
            F.col("account_id").alias("customer_account_id"),
            F.trim(F.col("company_name")).alias("company_name"),
            F.lower(F.trim(F.col("email"))).alias("primary_email"),
            F.upper(F.trim(F.col("plan_tier"))).alias("tier_plan_cd"),
            F.upper(F.trim(F.col("status"))).alias("account_status_cd"),
            F.col("licensed_seats").cast("int").alias("seat_licensed_cnt"),
            F.col("mrr_amount").cast("decimal(18,2)").alias("mrr_amt"),
            F.col("event_ts").cast("timestamp").alias("_valid_from_ts"),
            F.to_timestamp(F.lit("9999-12-31 23:59:59")).alias("_valid_to_ts"),
            F.lit(True).alias("_is_current_flg"),
            # Deterministic SHA-256 hash across all business attributes
            F.sha2(
                F.concat_ws("||", 
                    F.coalesce(F.col("plan_tier"), F.lit("")),
                    F.coalesce(F.col("status"), F.lit("")),
                    F.coalesce(F.col("licensed_seats"), F.lit("0")),
                    F.coalesce(F.col("mrr_amount"), F.lit("0.00"))
                ), 256
            ).alias("_record_hash"),
            F.current_timestamp().alias("_created_ts"),
            F.current_timestamp().alias("_updated_ts")
        )
    )

    # 2. Bind Delta Table
    dt_silver = DeltaTable.forName(spark, silver_table)

    # 3. SCD2 Match and Expire Changed Records
    (
        dt_silver.alias("target")
        .merge(
            df_updates.alias("source"),
            "target.customer_account_id = source.customer_account_id AND target._is_current_flg = True"
        )
        .whenMatchedUpdate(
            condition="target._record_hash != source._record_hash",
            set={
                "_valid_to_ts": "source._valid_from_ts",
                "_is_current_flg": "False",
                "_updated_ts": "current_timestamp()"
            }
        )
        .execute()
    )

    # 4. Append New Active Versions
    df_inserts = (
        df_updates.alias("s")
        .join(
            dt_silver.toDF().alias("t"),
            (F.col("s.customer_account_id") == F.col("t.customer_account_id")) & 
            (F.col("t._is_current_flg") == True) &
            (F.col("s._record_hash") == F.col("t._record_hash")),
            "left_anti"
        )
    )
    df_inserts.write.format("delta").mode("append").saveAsTable(silver_table)`,
    dltSnippet: `# Delta Live Tables (DLT) in Python with Expectations
import dlt
from pyspark.sql import functions as F

@dlt.table(
    name="slv_ent_customer_account",
    comment="Cleaned, conformed SCD2 customer accounts with data quality contracts"
)
@dlt.expect_or_drop("valid_email", "primary_email IS NOT NULL AND primary_email LIKE '%@%.%'")
@dlt.expect_or_fail("positive_seats", "seat_licensed_cnt >= 0")
def slv_ent_customer_account():
    return (
        dlt.read_stream("brz_raw_customer_events")
        .select(
            F.col("account_id").alias("customer_account_id"),
            F.trim(F.col("company_name")).alias("company_name"),
            F.lower(F.trim(F.col("email"))).alias("primary_email"),
            F.upper(F.trim(F.col("plan_tier"))).alias("tier_plan_cd"),
            F.col("mrr_amount").cast("decimal(18,2)").alias("mrr_amt"),
            F.current_timestamp().alias("_created_ts")
        )
    )`,
    sqlSnippet: `-- Databricks Delta Lake / Spark SQL MERGE for SCD Type 2
MERGE INTO lakehouse_silver.slv_ent_customer_account AS target
USING (
    SELECT 
        raw.account_id AS customer_account_id,
        TRIM(raw.company_name) AS company_name,
        LOWER(TRIM(raw.email)) AS primary_email,
        UPPER(TRIM(raw.plan_tier)) AS tier_plan_cd,
        UPPER(TRIM(raw.status)) AS account_status_cd,
        CAST(raw.licensed_seats AS INTEGER) AS seat_licensed_cnt,
        CAST(raw.mrr_amount AS DECIMAL(18,2)) AS mrr_amt,
        raw.account_id AS _src_record_id,
        current_timestamp() AS _created_ts,
        TO_TIMESTAMP(raw.event_ts) AS _valid_from_ts,
        TO_TIMESTAMP('9999-12-31 23:59:59') AS _valid_to_ts,
        TRUE AS _is_current_flg,
        sha2(concat_ws('||', raw.plan_tier, raw.status, raw.licensed_seats, raw.mrr_amount), 256) AS _record_hash
    FROM lakehouse_bronze.brz_raw_customer_events raw
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY raw.account_id 
        ORDER BY raw._ingest_ts DESC
    ) = 1
) AS source
ON target.customer_account_id = source.customer_account_id 
   AND target._is_current_flg = TRUE
WHEN MATCHED AND target._record_hash != source._record_hash THEN
    UPDATE SET 
        target._valid_to_ts = source._valid_from_ts,
        target._is_current_flg = FALSE,
        target._updated_ts = current_timestamp();`,
    runnablePythonScript: `import hashlib, json

def compute_hash(*fields):
    raw = "||".join(str(f) for f in fields)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

# Existing Silver state
silver_table = [
    {"cust_id": "ACC-101", "plan": "STARTER", "seats": 10, "mrr": 499.0, "valid_from": "2026-01-01", "valid_to": "9999-12-31", "is_current": True}
]
silver_table[0]["hash"] = compute_hash(silver_table[0]["plan"], silver_table[0]["seats"], silver_table[0]["mrr"])

# Incoming Bronze update
incoming_event = {"cust_id": "ACC-101", "plan": "ENTERPRISE", "seats": 100, "mrr": 4200.0, "event_ts": "2026-09-14"}
incoming_hash = compute_hash(incoming_event["plan"], incoming_event["seats"], incoming_event["mrr"])

print("=== PYSPARK SCD TYPE 2 DELTA MERGE SIMULATOR ===")
print(f"Target Current Hash:   {silver_table[0]['hash'][:16]}...")
print(f"Incoming Event Hash:   {incoming_hash[:16]}...")

if silver_table[0]["hash"] != incoming_hash:
    print(">> Hash mismatch detected! State change occurred.")
    # 1. Expire current row
    silver_table[0]["valid_to"] = incoming_event["event_ts"]
    silver_table[0]["is_current"] = False
    print(f"-> Expired row 1: valid_to set to {incoming_event['event_ts']}, is_current=False")

    # 2. Insert new current row
    new_version = {
        "cust_id": incoming_event["cust_id"],
        "plan": incoming_event["plan"],
        "seats": incoming_event["seats"],
        "mrr": incoming_event["mrr"],
        "valid_from": incoming_event["event_ts"],
        "valid_to": "9999-12-31",
        "is_current": True,
        "hash": incoming_hash
    }
    silver_table.append(new_version)
    print(f"-> Inserted row 2: plan={new_version['plan']}, MRR=\${new_version['mrr']}, is_current=True")

print("\\nFinal Silver Table Versions for ACC-101:")
for idx, row in enumerate(silver_table, 1):
    print(f"  v{idx}: [{row['valid_from']} to {row['valid_to']}] Plan={row['plan']} MRR=\${row['mrr']} Current={row['is_current']}")`,
  },
  {
    id: 'TR_02_SLV_TO_GLD_SALES_FACT',
    title: 'Kimball Star Schema Sales Fact Builder (Silver → Gold)',
    domain: 'orders',
    sourceLayer: 'silver',
    targetLayer: 'gold',
    summary: 'PySpark pipeline joining validated order headers and line items with conformed customer and product dimensions with bi-temporal point-in-time surrogate key resolution.',
    businessRules: [
      'Surrogate Key Lookup: Resolves customer_sk from gld_dim_customer where order_placed_ts BETWEEN _valid_from_ts AND _valid_to_ts.',
      'Date Dimension Key: Formats order_placed_ts into integer date surrogate key (YYYYMMDD).',
      'Net Sales: Calculated as line_gross_amt - line_discount_amt.',
      'Cost of Goods Sold (COGS): Computed as ordered_qty * dim_p.standard_cost_amt.',
      'Gross Profit: Net Sales Amount minus COGS Amount.',
    ],
    pythonSnippet: `# PySpark: Kimball Star Schema Fact Table Builder
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def build_order_sales_fact(spark: SparkSession):
    """
    Builds atomic sales fact table by joining Silver transactional entities
    with conformed Gold dimensions using point-in-time version resolution.
    """
    df_headers = (
        spark.table("lakehouse_silver.slv_ent_order_header")
        .filter(~F.col("order_status_cd").isin("CANCELLED", "SYSTEM_VOID"))
    )
    df_items = spark.table("lakehouse_silver.slv_ent_order_line_item")
    df_dim_cust = spark.table("lakehouse_gold.gld_dim_customer")
    df_dim_prod = spark.table("lakehouse_gold.gld_dim_product").filter(F.col("_is_current_flg") == True)

    # 1. Join Order Headers & Granular Line Items
    df_orders = df_headers.join(df_items, "order_number_id")

    # 2. Point-in-time join to conformed Customer Dimension
    df_with_cust = df_orders.join(
        df_dim_cust,
        (df_orders.customer_account_id == df_dim_cust.customer_account_id) &
        (df_orders.order_placed_ts.between(df_dim_cust._valid_from_ts, df_dim_cust._valid_to_ts)),
        "inner"
    )

    # 3. Join conformed Product Dimension & compute financial metrics
    df_fact = (
        df_with_cust.join(df_dim_prod, "product_sku_id", "inner")
        .select(
            F.monotonically_increasing_id().alias("order_sales_sk"),
            df_dim_cust.customer_sk,
            df_dim_prod.product_sk,
            F.date_format(df_orders.order_placed_ts, "yyyyMMdd").cast("int").alias("date_sk"),
            df_items.ordered_qty,
            df_items.line_gross_amt.alias("gross_sales_amt"),
            df_items.line_discount_amt.alias("discount_amt"),
            # Net Sales = Gross - Discount
            (df_items.line_gross_amt - df_items.line_discount_amt).alias("net_sales_amt"),
            # COGS = Quantity * Standard Cost
            F.round(df_items.ordered_qty * df_dim_prod.standard_cost_amt, 2).alias("cogs_cost_amt"),
            # Gross Profit = Net Sales - COGS
            F.round((df_items.line_gross_amt - df_items.line_discount_amt) - (df_items.ordered_qty * df_dim_prod.standard_cost_amt), 2).alias("gross_profit_amt"),
            F.current_timestamp().alias("_created_ts")
        )
    )

    df_fact.write.format("delta").mode("overwrite").saveAsTable("lakehouse_gold.gld_fct_order_sales")
    return df_fact`,
    dltSnippet: `# Delta Live Tables (DLT) Gold Fact Table
import dlt
from pyspark.sql import functions as F

@dlt.table(
    name="gld_fct_order_sales",
    comment="Atomic Kimball sales fact table joining conformed dimensions and calculating profit margins",
    table_properties={"quality": "gold", "delta.autoOptimize.optimizeWrite": "true"}
)
@dlt.expect_or_fail("positive_net_sales", "net_sales_amt >= 0")
def gld_fct_order_sales():
    h = dlt.read("slv_ent_order_header").filter("order_status_cd NOT IN ('CANCELLED', 'VOID')")
    li = dlt.read("slv_ent_order_line_item")
    dim_c = dlt.read("gld_dim_customer")
    dim_p = dlt.read("gld_dim_product").filter("_is_current_flg = True")

    return (
        h.join(li, "order_number_id")
        .join(dim_c, (h.customer_account_id == dim_c.customer_account_id) & (h.order_placed_ts.between(dim_c._valid_from_ts, dim_c._valid_to_ts)))
        .join(dim_p, li.product_sku_id == dim_p.product_sku_id)
        .select(
            dim_c.customer_sk,
            dim_p.product_sk,
            (li.line_gross_amt - li.line_discount_amt).alias("net_sales_amt"),
            F.round((li.line_gross_amt - li.line_discount_amt) - (li.ordered_qty * dim_p.standard_cost_amt), 2).alias("gross_profit_amt")
        )
    )`,
    sqlSnippet: `-- Atomic Sales Fact Ingestion Pipeline
INSERT OVERWRITE lakehouse_gold.gld_fct_order_sales
SELECT
    monotonically_increasing_id() AS order_sales_sk,
    dim_c.customer_sk,
    dim_p.product_sk,
    CAST(DATE_FORMAT(h.order_placed_ts, 'yyyyMMdd') AS INTEGER) AS date_sk,
    li.ordered_qty,
    li.line_gross_amt AS gross_sales_amt,
    li.line_discount_amt AS discount_amt,
    (li.line_gross_amt - li.line_discount_amt) AS net_sales_amt,
    ROUND(li.ordered_qty * dim_p.standard_cost_amt, 2) AS cogs_cost_amt,
    ROUND((li.line_gross_amt - li.line_discount_amt) - (li.ordered_qty * dim_p.standard_cost_amt), 2) AS gross_profit_amt,
    current_timestamp() AS _created_ts
FROM lakehouse_silver.slv_ent_order_header h
JOIN lakehouse_silver.slv_ent_order_line_item li ON h.order_number_id = li.order_number_id
JOIN lakehouse_gold.gld_dim_customer dim_c ON h.customer_account_id = dim_c.customer_account_id
 AND h.order_placed_ts BETWEEN dim_c._valid_from_ts AND dim_c._valid_to_ts
JOIN lakehouse_gold.gld_dim_product dim_p ON li.product_sku_id = dim_p.product_sku_id
 AND dim_p._is_current_flg = TRUE
WHERE h.order_status_cd NOT IN ('CANCELLED', 'SYSTEM_VOID');`,
    runnablePythonScript: `# Python Sales Fact & Margin Calculator
orders = [
    {"order_id": "ORD-501", "cust_id": "ACC-101", "sku": "SKU-PRO-01", "qty": 3, "gross": 3600.0, "discount": 200.0, "unit_cost": 450.0},
    {"order_id": "ORD-502", "cust_id": "ACC-102", "sku": "SKU-ENT-02", "qty": 1, "gross": 15000.0, "discount": 1500.0, "unit_cost": 2200.0},
    {"order_id": "ORD-503", "cust_id": "ACC-103", "sku": "SKU-PRO-01", "qty": 10, "gross": 12000.0, "discount": 1200.0, "unit_cost": 450.0}
]

print("=== PYTHON SALES FACT & MARGIN ENGINE ===")
print(f"{'Order ID':<10} {'Net Sales':<12} {'COGS':<10} {'Gross Profit':<14} {'Margin %':<10}")
print("-" * 58)

total_net = 0
total_profit = 0
for o in orders:
    net_sales = o["gross"] - o["discount"]
    cogs = o["qty"] * o["unit_cost"]
    gross_profit = net_sales - cogs
    margin_pct = (gross_profit / net_sales) * 100 if net_sales > 0 else 0
    total_net += net_sales
    total_profit += gross_profit
    print(f"{o['order_id']:<10} \${net_sales:>10,.2f} \${cogs:>8,.2f} \${gross_profit:>12,.2f} {margin_pct:>8.1f}%")

print("-" * 58)
overall_margin = (total_profit / total_net) * 100
print(f"{'TOTAL':<10} \${total_net:>10,.2f} {'':<10} \${total_profit:>12,.2f} {overall_margin:>8.1f}%")`,
  },
  {
    id: 'TR_03_SLV_TO_GLD_MRR_SNAPSHOT',
    title: 'Periodic Monthly MRR & Customer Snapshot Mart (Silver → Gold)',
    domain: 'finance',
    sourceLayer: 'silver',
    targetLayer: 'gold',
    summary: 'PySpark pipeline building end-of-month subscription balance marts tracking starting MRR, expansion, contraction, churn, and ASC 606 revenue recognition.',
    businessRules: [
      'Point-in-time Resolution: Evaluates customer plan status as of the exact final second of each calendar month.',
      'Starting MRR: Active contracted MRR on day 1 of accounting month.',
      'Expansion MRR: Incremental upgrades or added seats during month for existing accounts.',
      'Churned MRR: Previous active accounts that suspended or canceled during the month.',
      'Ending MRR = Starting MRR + Expansion - Contraction - Churn.',
    ],
    pythonSnippet: `# PySpark: Monthly Recurring Revenue (MRR) Roll-Forward Mart
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def build_monthly_mrr_snapshot(spark: SparkSession):
    """
    Computes SaaS subscription metrics roll-forward for GAAP ASC 606 reporting.
    Calculates Starting MRR, Expansion, Contraction, Churn, and Net Retention.
    """
    df_months = spark.table("lakehouse_gold.gld_dim_date_month")
    df_cust = spark.table("lakehouse_gold.gld_dim_customer")
    df_silver_acc = spark.table("lakehouse_silver.slv_ent_customer_account")
    df_prior_snapshot = spark.table("lakehouse_gold.gld_fct_customer_monthly_snapshot")

    # Cross join active customers with calendar accounting periods
    df_cohort = df_months.crossJoin(df_cust)

    # Join silver state active at the final second of each month
    df_curr = df_cohort.join(
        df_silver_acc,
        (df_cohort.customer_account_id == df_silver_acc.customer_account_id) &
        (df_cohort.month_end_ts.between(df_silver_acc._valid_from_ts, df_silver_acc._valid_to_ts)),
        "left"
    )

    # Join prior month closing balance
    df_with_prev = df_curr.join(
        df_prior_snapshot.select(
            F.col("customer_sk").alias("p_cust_sk"),
            F.col("accounting_month_sk").alias("p_month_sk"),
            F.col("ending_mrr_amt").alias("prior_ending_mrr")
        ),
        (df_curr.customer_sk == F.col("p_cust_sk")) &
        (df_curr.previous_month_sk == F.col("p_month_sk")),
        "left"
    )

    df_snapshot = df_with_prev.select(
        df_curr.customer_sk,
        df_curr.month_sk.alias("accounting_month_sk"),
        F.coalesce(F.col("prior_ending_mrr"), F.lit(0.00)).alias("starting_mrr_amt"),
        # Expansion MRR
        F.when(
            F.col("mrr_amt") > F.coalesce(F.col("prior_ending_mrr"), F.lit(0.00)),
            F.col("mrr_amt") - F.coalesce(F.col("prior_ending_mrr"), F.lit(0.00))
        ).otherwise(F.lit(0.00)).alias("expansion_mrr_amt"),
        # Contraction MRR
        F.when(
            (F.col("mrr_amt") < F.coalesce(F.col("prior_ending_mrr"), F.lit(0.00))) & 
            (F.col("account_status_cd") == "ACTIVE"),
            F.coalesce(F.col("prior_ending_mrr"), F.lit(0.00)) - F.col("mrr_amt")
        ).otherwise(F.lit(0.00)).alias("contraction_mrr_amt"),
        # Churn MRR
        F.when(
            F.col("account_status_cd") == "CHURNED",
            F.coalesce(F.col("prior_ending_mrr"), F.lit(0.00))
        ).otherwise(F.lit(0.00)).alias("churned_mrr_amt"),
        # Ending MRR
        F.when(F.col("account_status_cd") == "ACTIVE", F.col("mrr_amt")).otherwise(F.lit(0.00)).alias("ending_mrr_amt"),
        F.current_timestamp().alias("_created_ts")
    )

    df_snapshot.write.format("delta").mode("overwrite").saveAsTable("lakehouse_gold.gld_fct_customer_monthly_snapshot")
    return df_snapshot`,
    dltSnippet: `# Delta Live Tables (DLT) Monthly Revenue Recognition Mart
import dlt
from pyspark.sql import functions as F

@dlt.table(
    name="gld_fct_customer_monthly_snapshot",
    comment="End of month customer MRR and GAAP ASC 606 revenue recognition rollforward"
)
def gld_fct_customer_monthly_snapshot():
    dim_m = dlt.read("gld_dim_date_month")
    dim_c = dlt.read("gld_dim_customer")
    curr = dlt.read("slv_ent_customer_account")

    return (
        dim_m.crossJoin(dim_c)
        .join(curr, (dim_c.customer_account_id == curr.customer_account_id) & (dim_m.month_end_ts.between(curr._valid_from_ts, curr._valid_to_ts)), "left")
        .select(
            dim_c.customer_sk,
            dim_m.month_sk.alias("accounting_month_sk"),
            curr.mrr_amt.alias("ending_mrr_amt"),
            F.current_timestamp().alias("_created_ts")
        )
    )`,
    sqlSnippet: `-- Monthly Recurring Revenue (MRR) Snapshot Mart
INSERT OVERWRITE lakehouse_gold.gld_fct_customer_monthly_snapshot
SELECT
    dim_c.customer_sk,
    dim_m.month_sk AS accounting_month_sk,
    COALESCE(prev.ending_mrr_amt, 0.00) AS starting_mrr_amt,
    GREATEST(0.00, curr.mrr_amt - COALESCE(prev.ending_mrr_amt, 0.00)) AS expansion_mrr_amt,
    GREATEST(0.00, COALESCE(prev.ending_mrr_amt, 0.00) - curr.mrr_amt) AS contraction_mrr_amt,
    CASE WHEN curr.account_status_cd = 'CHURNED' THEN COALESCE(prev.ending_mrr_amt, 0.00) ELSE 0.00 END AS churned_mrr_amt,
    CASE WHEN curr.account_status_cd = 'ACTIVE' THEN curr.mrr_amt ELSE 0.00 END AS ending_mrr_amt,
    curr.seat_licensed_cnt,
    current_timestamp() AS _created_ts
FROM lakehouse_gold.gld_dim_date_month dim_m
CROSS JOIN lakehouse_gold.gld_dim_customer dim_c
LEFT JOIN lakehouse_silver.slv_ent_customer_account curr
  ON dim_c.customer_account_id = curr.customer_account_id
 AND dim_m.month_end_ts BETWEEN curr._valid_from_ts AND curr._valid_to_ts
LEFT JOIN lakehouse_gold.gld_fct_customer_monthly_snapshot prev
  ON dim_c.customer_sk = prev.customer_sk 
 AND prev.accounting_month_sk = dim_m.previous_month_sk;`,
    runnablePythonScript: `# SaaS MRR Rollforward & Net Retention Rate (NRR) in Python
accounts = [
    {"cust": "Acme Corp", "start_mrr": 5000.0, "expansion": 1200.0, "contraction": 0.0, "churn": 0.0},
    {"cust": "BioHealth", "start_mrr": 8400.0, "expansion": 0.0, "contraction": 600.0, "churn": 0.0},
    {"cust": "CloudTech", "start_mrr": 3200.0, "expansion": 0.0, "contraction": 0.0, "churn": 3200.0},
    {"cust": "DataCore", "start_mrr": 0.0, "expansion": 4500.0, "contraction": 0.0, "churn": 0.0}
]

print("=== MONTHLY REVENUE ROLLFORWARD (GAAP ASC 606) ===")
print(f"{'Account':<12} {'Starting':<10} {'Expansion':<10} {'Contraction':<12} {'Churn':<8} {'Ending MRR':<12}")
print("-" * 66)

tot_start = tot_exp = tot_con = tot_churn = tot_end = 0
for a in accounts:
    end_mrr = a["start_mrr"] + a["expansion"] - a["contraction"] - a["churn"]
    tot_start += a["start_mrr"]
    tot_exp += a["expansion"]
    tot_con += a["contraction"]
    tot_churn += a["churn"]
    tot_end += end_mrr
    print(f"{a['cust']:<12} \${a['start_mrr']:>8,.0f} \${a['expansion']:>8,.0f} \${a['contraction']:>10,.0f} \${a['churn']:>6,.0f} \${end_mrr:>10,.0f}")

print("-" * 66)
print(f"{'TOTAL':<12} \${tot_start:>8,.0f} \${tot_exp:>8,.0f} \${tot_con:>10,.0f} \${tot_churn:>6,.0f} \${tot_end:>10,.0f}")
nrr = ((tot_end) / tot_start * 100) if tot_start > 0 else 100
print(f"\\nNet Revenue Retention (NRR): {nrr:.1f}%")`,
  },
];
