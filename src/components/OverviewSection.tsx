import { useState } from 'react';
import { Layers, ArrowRight, Shield, CheckCircle2, FileText, Activity, Award } from 'lucide-react';

interface OverviewSectionProps {
  onNavigateTab: (tab: string) => void;
}

export default function OverviewSection({ onNavigateTab }: OverviewSectionProps) {
  const [selectedLayer, setSelectedLayer] = useState<'bronze' | 'silver' | 'gold'>('silver');

  const layersInfo = {
    bronze: {
      name: 'Bronze Layer (Raw / Ingestion)',
      tagline: 'Source Fidelity & Immutable Audit Store',
      color: 'border-amber-500/60 bg-slate-900 shadow-inner',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500',
      description:
        'Lands raw operational payloads directly from transactional databases (PostgreSQL, MySQL), ERP systems (SAP, NetSuite), CRMs (Salesforce, HubSpot), payment gateways (Stripe), and Kafka streaming event topics without breaking data types.',
      characteristics: [
        'Immutable, append-only history preserving raw JSON, Parquet, or Avro event payloads',
        'Minimal or zero transformations; preserves schema drift and deleted state markers',
        'Includes source metadata (_src_sys_cd, _ingest_ts, _src_file_name, _src_record_id)',
        'Storage retention: Indefinite or statutory enterprise audit retention (7-10 years)',
      ],
      tables: ['brz_raw_orders', 'brz_raw_customer_events', 'brz_raw_payments', 'brz_raw_product_catalog'],
    },
    silver: {
      name: 'Silver Layer (Cleaned / Conformed)',
      tagline: 'Single Source of Truth (3NF & Bi-Temporal SCD2)',
      color: 'border-slate-500/60 bg-slate-900 shadow-inner',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      dot: 'bg-slate-400 animate-pulse',
      description:
        'Normalizes core enterprise business entities (Customers, Accounts, Orders, Line Items, Products, Payments) into validated 3NF relational structures with strict domain constraints and SCD Type 2 bi-temporal versioning.',
      characteristics: [
        'Deduplicated with watermarking; rejects corrupted payloads via automated DQ gates',
        'Bi-temporal versioning (_valid_from_ts, _valid_to_ts, _is_current_flg)',
        'Standardized snake_case naming with strict suffixes (_amt, _dt, _ts, _flg, _cd)',
        'Deterministic SHA-256 payload hash (_record_hash) for ultra-fast CDC merges',
      ],
      tables: [
        'slv_ent_customer_account',
        'slv_ent_order_header',
        'slv_ent_order_line_item',
        'slv_ent_product_catalog',
        'slv_ent_payment_transaction',
      ],
    },
    gold: {
      name: 'Gold Layer (Curated / Star Schemas)',
      tagline: 'Optimized Dimensional Marts & High-Speed Analytics',
      color: 'border-amber-500/60 bg-slate-900 shadow-inner',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500',
      description:
        'Curates business-ready Kimball star schemas, fact tables, periodic monthly snapshots, and pre-aggregated rollups optimized for analytical queries, executive BI dashboards, and financial audit reconciliations.',
      characteristics: [
        'Dimensional modeling with surrogate keys (_sk) for lightning-fast OLAP joins',
        'Pre-calculated business metrics: Gross Revenue, Net Margin, MRR, Churn, LTV',
        'Periodic snapshots tracking point-in-time account balances and subscription states',
        'Rigorous alignment with financial standards (SOX 404, GAAP ASC 606, IFRS 15)',
      ],
      tables: [
        'gld_dim_customer',
        'gld_dim_product',
        'gld_fct_order_sales',
        'gld_fct_customer_monthly_snapshot',
        'gld_agg_daily_revenue_mart',
      ],
    },
  };

  const domainCards = [
    {
      domain: 'Customer & Accounts Domain',
      summary: 'Tracks the complete lifecycle of customer accounts from initial registration through subscription tier transitions, upgrades, seat expansions, and churn.',
      silverEntity: 'slv_ent_customer_account',
      goldEntity: 'gld_dim_customer & gld_fct_customer_monthly_snapshot',
      borderAccent: 'border-t-2 border-t-blue-500',
      titleColor: 'text-blue-400',
      keyMetrics: ['Contracted MRR/ARR', 'Active Seat Count', 'Net Revenue Retention (NRR)', 'Customer Lifetime Value (LTV)'],
    },
    {
      domain: 'Orders & Commerce Domain',
      summary: 'Captures end-to-end commerce orders from submission through payment capture, line item fulfillment, regional tax calculation, and discounts.',
      silverEntity: 'slv_ent_order_header & slv_ent_order_line_item',
      goldEntity: 'gld_fct_order_sales & gld_dim_product',
      borderAccent: 'border-t-2 border-t-emerald-500',
      titleColor: 'text-emerald-400',
      keyMetrics: ['Gross Merchandise Volume (GMV)', 'Net Sales Revenue', 'Average Order Value (AOV)', 'Line Item Margins'],
    },
    {
      domain: 'Finance & Payments Domain',
      summary: 'Manages payment gateway settlements, cash receipts (ACH, Card, Wire), fee deductions, subscription amortizations, and ASC 606 revenue recognition.',
      silverEntity: 'slv_ent_payment_transaction',
      goldEntity: 'gld_agg_daily_revenue_mart & gld_fct_customer_monthly_snapshot',
      borderAccent: 'border-t-2 border-t-purple-500',
      titleColor: 'text-purple-400',
      keyMetrics: ['Gross / Net Cash Collected', 'Payment Gateway Fees', 'Deferred Revenue Balance', 'Gross Profit Margin %'],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero Bento Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-white shadow-inner">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-mono font-semibold text-indigo-400 border border-indigo-500/20">
            <Award className="h-3.5 w-3.5" />
            ENTERPRISE BENTO SPECIFICATION
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Enterprise Medallion Lakehouse Architecture Standards
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Standardized blueprints, naming conventions, and data modeling patterns for engineering 
            <strong className="text-white font-medium"> Bronze</strong>, <strong className="text-white font-medium">Silver</strong>, and <strong className="text-white font-medium">Gold </strong> 
            lakehouse tiers across <span className="text-blue-400">Customer</span>, <span className="text-emerald-400">Orders</span>, <span className="text-purple-400">Products</span>, and <span className="text-amber-400">Finance</span> domains.
            Engineered for strict audit traceability, bi-temporal SCD2, automated DQ gates, and enterprise compliance (SOX 404, GDPR, SOC 2, and ASC 606).
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('schemas')}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
            >
              Explore Table Schemas
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('audit-scd2')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
            >
              Audit & SCD2 Simulator
            </button>
            <button
              onClick={() => onNavigateTab('regulatory')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
            >
              Governance Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Medallion Flow Diagram */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Medallion Data Processing Flow</h2>
            <p className="text-xs text-slate-400">
              Click any tier below to inspect transformation objectives, governance boundaries, and sample tables.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">ACID Lakehouse Protocol (Delta / Iceberg / Snowflake)</span>
        </div>

        {/* 3 Tier Buttons / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {(['bronze', 'silver', 'gold'] as const).map((layer) => {
            const info = layersInfo[layer];
            const isSelected = selectedLayer === layer;
            return (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`text-left rounded-xl p-5 border transition-all relative overflow-hidden ${
                  isSelected
                    ? `${info.color} ring-1 ring-slate-600`
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${info.badge}`}>
                    {layer}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${info.dot}`} />
                </div>
                <h3 className="font-bold text-sm text-white">{info.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{info.tagline}</p>
              </button>
            );
          })}
        </div>

        {/* Detail Panel of Selected Layer */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">Selected Architecture Tier</span>
              <h3 className="text-base font-bold text-white mt-0.5">{layersInfo[selectedLayer].name}</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {layersInfo[selectedLayer].description}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('schemas')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              View Schemas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-800">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Core Engineering Characteristics</h4>
              <ul className="space-y-2">
                {layersInfo[selectedLayer].characteristics.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300 mb-2">Representative Standard Entities</h4>
              <div className="flex flex-wrap gap-2">
                {layersInfo[selectedLayer].tables.map((tbl) => (
                  <span
                    key={tbl}
                    className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                  >
                    <FileText className="h-3 w-3 text-slate-500" />
                    {tbl}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Domain Pillars */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Enterprise Domain Modeling Pillars</h2>
          <p className="text-xs text-slate-400">
            How operational data from core transactional systems is normalized into 3NF Silver entities and dimensional Gold marts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {domainCards.map((card) => (
            <div
              key={card.domain}
              className={`rounded-xl border border-slate-800 ${card.borderAccent} bg-slate-900 p-5 shadow-inner flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className={`h-4 w-4 ${card.titleColor}`} />
                  <h3 className={`font-bold text-sm uppercase tracking-wide ${card.titleColor}`}>{card.domain}</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {card.summary}
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">Silver Normalization</span>
                    <span className="font-mono text-slate-200 text-[11px] block mt-0.5">{card.silverEntity}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-amber-400 block text-[10px] uppercase tracking-wider">Gold Dimensional Mart</span>
                    <span className="font-mono text-amber-300 text-[11px] block mt-0.5">{card.goldEntity}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Key Downstream KPIs</span>
                <div className="flex flex-wrap gap-1.5">
                  {card.keyMetrics.map((kpi) => (
                    <span key={kpi} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                      {kpi}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Architectural Tenets */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-6 shadow-inner">
        <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
          <Shield className="h-5 w-5 text-indigo-400" />
          The 6 Non-Negotiable Standards of Enterprise Medallion Engineering
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">1. Bi-Temporal SCD Type 2</span>
            <p className="text-slate-300 leading-relaxed">
              Customer subscriptions, account tiers, and pricing terms evolve continuously. 
              Silver dimension entities MUST preserve both transaction posting time and real-world validity intervals.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">2. Absolute Currency Precision</span>
            <p className="text-slate-300 leading-relaxed">
              Floating-point representations (FLOAT / DOUBLE) are strictly prohibited for monetary amounts. 
              All prices, revenues, discounts, taxes, and fees must use <code className="text-pink-400 font-mono">DECIMAL(18,2)</code> or <code className="text-pink-400 font-mono">DECIMAL(24,4)</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">3. Immutable Audit Lineage</span>
            <p className="text-slate-300 leading-relaxed">
              Every record in Silver and Gold embeds standard audit columns including source system code, pipeline run UUID, 
              ingestion timestamp, and SHA-256 payload hash for 100% verifiable data lineage.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">4. Conformed Kimball Star Schemas</span>
            <p className="text-slate-300 leading-relaxed">
              Gold tables adhere strictly to dimensional modeling with integer surrogate keys (<code className="text-pink-400 font-mono">_sk</code>), enabling lightning-fast OLAP aggregations and unified business metrics.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">5. Idempotent Ingestion & CDC</span>
            <p className="text-slate-300 leading-relaxed">
              Pipelines must support deterministic replay. Re-running a day's batch or streaming micro-batch must never produce 
              duplicate rows, corrupted foreign keys, or double-counted sales transactions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-indigo-300 block mb-1">6. Strict Suffix Taxonomy</span>
            <p className="text-slate-300 leading-relaxed">
              Every column name must terminate with an approved semantic suffix (<code className="text-pink-400 font-mono">_sk</code>, <code className="text-pink-400 font-mono">_id</code>, <code className="text-pink-400 font-mono">_amt</code>, <code className="text-pink-400 font-mono">_dt</code>, <code className="text-pink-400 font-mono">_ts</code>, <code className="text-pink-400 font-mono">_flg</code>, <code className="text-pink-400 font-mono">_cd</code>) for automated catalog discovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
