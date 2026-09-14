import { useState } from 'react';
import { 
  Sparkles, Terminal, CheckCircle, ArrowRight, Copy, Check, 
  Play, RotateCcw, AlertCircle, Clock, Database, Table, Layers
} from 'lucide-react';
import { TRANSFORMATION_RULES } from '../data/standardsData';

interface SqlQueryResult {
  success: boolean;
  columns?: string[];
  rows?: any[][];
  rowCount?: number;
  affectedRows?: number;
  executionTimeMs?: number;
  error?: string;
  query?: string;
}

const PRESET_QUERIES = [
  {
    id: 'bronze_raw',
    label: '1. Bronze: Raw Ingested Events',
    description: 'Inspect raw streaming landing records with audit source file and ingest timestamp',
    sql: `SELECT 
    event_id, 
    account_id, 
    company_name, 
    plan_tier, 
    mrr_amount, 
    _src_sys_cd, 
    _src_file_name, 
    _ingest_ts 
FROM brz_raw_customer_events 
ORDER BY _ingest_ts DESC;`,
  },
  {
    id: 'silver_active_scd2',
    label: '2. Silver: Active SCD2 State',
    description: 'Query current single-source-of-truth customer entities where _is_current_flg = 1',
    sql: `SELECT 
    customer_account_id, 
    company_name, 
    tier_plan_cd, 
    account_status_cd, 
    seat_licensed_cnt, 
    mrr_amt, 
    _valid_from_ts, 
    _valid_to_ts, 
    _is_current_flg, 
    _record_hash 
FROM slv_ent_customer_account 
WHERE _is_current_flg = 1 
ORDER BY customer_account_id;`,
  },
  {
    id: 'silver_history_scd2',
    label: '3. Silver: Bi-Temporal Version History',
    description: 'Track version changes for ACC-101 transitioning from STARTER to ENTERPRISE',
    sql: `SELECT 
    customer_account_id, 
    company_name, 
    tier_plan_cd, 
    mrr_amt, 
    _valid_from_ts, 
    _valid_to_ts, 
    _is_current_flg,
    _record_hash
FROM slv_ent_customer_account 
WHERE customer_account_id = 'ACC-101' 
ORDER BY _valid_from_ts ASC;`,
  },
  {
    id: 'gold_star_schema',
    label: '4. Gold: Kimball Star Schema Fact',
    description: 'Conformed join between order sales fact and customer & product dimensions',
    sql: `SELECT 
    f.order_number_id,
    c.company_name,
    c.tier_plan_cd,
    p.product_name,
    p.product_family_cd,
    f.ordered_qty,
    f.gross_sales_amt,
    f.cogs_cost_amt,
    f.gross_profit_amt
FROM gld_fct_order_sales f
JOIN gld_dim_customer c ON f.customer_sk = c.customer_sk
JOIN gld_dim_product p ON f.product_sk = p.product_sk
ORDER BY f.order_sales_sk;`,
  },
  {
    id: 'gold_margin_analytics',
    label: '5. Gold: Product Margin & Profitability',
    description: 'Aggregate enterprise sales performance, revenue, cost, and gross margin percentage',
    sql: `SELECT 
    p.product_family_cd,
    COUNT(DISTINCT f.order_number_id) AS total_orders,
    SUM(f.ordered_qty) AS units_sold,
    ROUND(SUM(f.gross_sales_amt), 2) AS total_gross_sales,
    ROUND(SUM(f.gross_profit_amt), 2) AS total_gross_profit,
    ROUND((SUM(f.gross_profit_amt) / SUM(f.gross_sales_amt)) * 100, 2) AS gross_margin_pct
FROM gld_fct_order_sales f
JOIN gld_dim_product p ON f.product_sk = p.product_sk
GROUP BY p.product_family_cd
ORDER BY total_gross_sales DESC;`,
  },
  {
    id: 'scd2_hash_test',
    label: '6. SQL SHA-256 Change Detection',
    description: 'Validate deterministic payload hashing across business columns for delta merge',
    sql: `SELECT 
    customer_account_id,
    company_name,
    tier_plan_cd,
    mrr_amt,
    SHA256(CONCAT_WS('||', tier_plan_cd, account_status_cd, CAST(mrr_amt AS TEXT))) AS generated_record_hash
FROM slv_ent_customer_account
WHERE _is_current_flg = 1;`,
  },
];

export default function TransformationEngine() {
  const [activeRuleId, setActiveRuleId] = useState<string>(TRANSFORMATION_RULES[0].id);
  const [activeSqlPreset, setActiveSqlPreset] = useState<string>(PRESET_QUERIES[1].id);
  const [customSql, setCustomSql] = useState<string>(PRESET_QUERIES[1].sql);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [sqlDialectTab, setSqlDialectTab] = useState<'delta' | 'snowflake' | 'bigquery' | 'ansi'>('delta');

  const activeRule = TRANSFORMATION_RULES.find((r) => r.id === activeRuleId) || TRANSFORMATION_RULES[0];

  const handleSelectPreset = (preset: typeof PRESET_QUERIES[0]) => {
    setActiveSqlPreset(preset.id);
    setCustomSql(preset.sql);
    setQueryResult(null);
  };

  const handleExecuteSql = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: customSql }),
      });

      const data = await res.json();
      setQueryResult(data);
    } catch (err: any) {
      setQueryResult({
        success: false,
        error: `Failed to communicate with Python backend: ${err.message}`,
        executionTimeMs: 0,
        query: customSql,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetDatabase = async () => {
    try {
      await fetch('/api/reset-db', { method: 'POST' });
      handleExecuteSql();
    } catch (err) {
      console.error('Failed to reset database', err);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Dialect specific SQL code for active transformation rule
  const getDialectSql = () => {
    if (sqlDialectTab === 'snowflake') {
      return `-- Snowflake SQL Transformation: ${activeRule.title}
-- Domain: ${activeRule.domain.toUpperCase()} | Layer: ${activeRule.sourceLayer.toUpperCase()} -> ${activeRule.targetLayer.toUpperCase()}

MERGE INTO LAKEHOUSE_SILVER.SLV_ENT_${activeRule.domain.toUpperCase()} AS target
USING (
    SELECT 
        account_id AS customer_account_id,
        TRIM(company_name) AS company_name,
        LOWER(TRIM(primary_email)) AS primary_email,
        UPPER(TRIM(plan_tier)) AS tier_plan_cd,
        UPPER(TRIM(status)) AS account_status_cd,
        TRY_TO_NUMBER(licensed_seats) AS seat_licensed_cnt,
        TRY_TO_DECIMAL(mrr_amount, 18, 2) AS mrr_amt,
        CURRENT_TIMESTAMP() AS _valid_from_ts,
        TO_TIMESTAMP_NTZ('9999-12-31 23:59:59') AS _valid_to_ts,
        1 AS _is_current_flg,
        SHA2(CONCAT_WS('||', 
            COALESCE(UPPER(TRIM(plan_tier)), ''),
            COALESCE(UPPER(TRIM(status)), ''),
            COALESCE(TRY_TO_DECIMAL(mrr_amount, 18, 2)::VARCHAR, '0.00')
        ), 256) AS _record_hash
    FROM LAKEHOUSE_BRONZE.BRZ_RAW_${activeRule.domain.toUpperCase()}_EVENTS
    QUALIFY ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY _ingest_ts DESC) = 1
) AS source
ON target.customer_account_id = source.customer_account_id AND target._is_current_flg = 1
WHEN MATCHED AND target._record_hash != source._record_hash THEN
    UPDATE SET 
        target._valid_to_ts = source._valid_from_ts,
        target._is_current_flg = 0,
        target._updated_ts = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
    INSERT (customer_account_id, company_name, primary_email, tier_plan_cd, account_status_cd, seat_licensed_cnt, mrr_amt, _valid_from_ts, _valid_to_ts, _is_current_flg, _record_hash, _created_ts, _updated_ts)
    VALUES (source.customer_account_id, source.company_name, source.primary_email, source.tier_plan_cd, source.account_status_cd, source.seat_licensed_cnt, source.mrr_amt, source._valid_from_ts, source._valid_to_ts, source._is_current_flg, source._record_hash, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());`;
    }

    if (sqlDialectTab === 'bigquery') {
      return `-- Google BigQuery SQL Transformation: ${activeRule.title}
-- Domain: ${activeRule.domain.toUpperCase()} | Layer: ${activeRule.sourceLayer.toUpperCase()} -> ${activeRule.targetLayer.toUpperCase()}

MERGE \`gcp_project.lakehouse_silver.slv_ent_${activeRule.domain}\` AS target
USING (
    SELECT 
        account_id AS customer_account_id,
        TRIM(company_name) AS company_name,
        LOWER(TRIM(primary_email)) AS primary_email,
        UPPER(TRIM(plan_tier)) AS tier_plan_cd,
        UPPER(TRIM(status)) AS account_status_cd,
        CAST(licensed_seats AS INT64) AS seat_licensed_cnt,
        CAST(mrr_amount AS NUMERIC) AS mrr_amt,
        CURRENT_TIMESTAMP() AS _valid_from_ts,
        TIMESTAMP('9999-12-31 23:59:59') AS _valid_to_ts,
        TRUE AS _is_current_flg,
        TO_HEX(SHA256(CONCAT(
            COALESCE(UPPER(TRIM(plan_tier)), ''), '||',
            COALESCE(UPPER(TRIM(status)), ''), '||',
            COALESCE(CAST(mrr_amount AS STRING), '0.00')
        ))) AS _record_hash
    FROM \`gcp_project.lakehouse_bronze.brz_raw_${activeRule.domain}_events\`
    QUALIFY ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY _ingest_ts DESC) = 1
) AS source
ON target.customer_account_id = source.customer_account_id AND target._is_current_flg = TRUE
WHEN MATCHED AND target._record_hash != source._record_hash THEN
    UPDATE SET 
        _valid_to_ts = source._valid_from_ts,
        _is_current_flg = FALSE,
        _updated_ts = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
    INSERT ROW;`;
    }

    if (sqlDialectTab === 'ansi') {
      return `-- ANSI SQL Standard Transformation: ${activeRule.title}
-- Pure SQL Pipeline with Window Functions and Deterministic Hashing

WITH ranked_bronze AS (
    SELECT 
        account_id AS customer_account_id,
        TRIM(company_name) AS company_name,
        LOWER(TRIM(primary_email)) AS primary_email,
        UPPER(TRIM(plan_tier)) AS tier_plan_cd,
        UPPER(TRIM(status)) AS account_status_cd,
        CAST(licensed_seats AS INTEGER) AS seat_licensed_cnt,
        CAST(mrr_amount AS NUMERIC) AS mrr_amt,
        CURRENT_TIMESTAMP AS _valid_from_ts,
        TIMESTAMP '9999-12-31 23:59:59' AS _valid_to_ts,
        1 AS _is_current_flg,
        SHA256(CONCAT_WS('||', plan_tier, status, CAST(mrr_amount AS VARCHAR))) AS _record_hash,
        ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY _ingest_ts DESC) AS rn
    FROM lakehouse_bronze.brz_raw_${activeRule.domain}_events
)
SELECT * FROM ranked_bronze WHERE rn = 1;`;
    }

    // Default: Databricks Delta Lake SQL
    return activeRule.sqlSnippet;
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 shrink-0 shadow-inner">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                SQL Lakehouse Transformation Engine & Interactive Query Runner
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
                100% SQL-native enterprise data pipeline specifications across Bronze, Silver, and Gold tiers.
                Execute and validate real SQL queries directly against our in-memory Medallion database powered by the Python server backend, 
                inspecting bi-temporal SCD2 versions, SHA-256 delta hashes, and Kimball dimensional marts.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full font-mono uppercase tracking-wider">
              Python Backend Connected
            </span>
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded-full font-mono uppercase tracking-wider">
              SQL Only
            </span>
          </div>
        </div>
      </div>

      {/* Interactive SQL Lakehouse Sandbox */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-inner overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Live SQL Query Runner (Python Server SQLite In-Memory Database)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test queries against live Bronze, Silver, and Gold tables seeded in the Python server memory.
            </p>
          </div>

          {/* Quick Preset Queries */}
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                  activeSqlPreset === preset.id
                    ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 font-semibold shadow-inner'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* SQL Editor & Controls */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
              <span>SQL Statement Editor:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDatabase}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                  title="Reset database seed data"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Data</span>
                </button>
                <button
                  onClick={() => handleCopyCode(customSql)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>
            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-indigo-500/50 leading-relaxed resize-y"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Tables available: <code className="text-slate-300">brz_raw_customer_events</code>, <code className="text-slate-300">slv_ent_customer_account</code>, <code className="text-slate-300">gld_fct_order_sales</code>, <code className="text-slate-300">gld_dim_customer</code>, <code className="text-slate-300">gld_dim_product</code>
            </span>

            <button
              onClick={handleExecuteSql}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-inner transition-colors"
            >
              <Play className={`h-3.5 w-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Executing SQL...' : 'Run SQL Query'}</span>
            </button>
          </div>

          {/* Execution Result Area */}
          {queryResult && (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden text-xs">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${queryResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="font-semibold text-slate-200">
                    {queryResult.success ? 'Query Succeeded' : 'Execution Error'}
                  </span>
                  {queryResult.success && (
                    <span className="text-slate-400 text-[11px]">
                      ({queryResult.rowCount ?? 0} rows returned
                      {queryResult.affectedRows ? `, ${queryResult.affectedRows} affected` : ''})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Clock className="h-3 w-3" />
                  <span>{queryResult.executionTimeMs} ms</span>
                </div>
              </div>

              {queryResult.error ? (
                <div className="p-4 flex items-start gap-2 text-rose-400 bg-rose-950/20 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <pre className="whitespace-pre-wrap">{queryResult.error}</pre>
                </div>
              ) : queryResult.rows && queryResult.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-[320px]">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-300 uppercase">
                      <tr>
                        {queryResult.columns?.map((col, idx) => (
                          <th key={idx} className="p-2.5 font-semibold text-slate-300 border-r border-slate-800/60 last:border-r-0 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {queryResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2.5 border-r border-slate-800/40 last:border-r-0 whitespace-nowrap">
                              {cell === null ? (
                                <span className="text-slate-600 italic">NULL</span>
                              ) : typeof cell === 'boolean' ? (
                                <span className={cell ? 'text-emerald-400' : 'text-slate-400'}>{String(cell)}</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 font-mono">
                  Statement executed successfully. (0 rows returned)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Standard Medallion Pipeline SQL Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              Enterprise SQL Pipeline Transformation Standards
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Production SQL specifications for Bronze streaming landing, Silver SCD2 delta merging, and Gold Kimball mart aggregation.
            </p>
          </div>
        </div>

        {/* Pipeline Selector Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {TRANSFORMATION_RULES.map((rule) => {
            const isActive = rule.id === activeRuleId;
            return (
              <button
                key={rule.id}
                onClick={() => setActiveRuleId(rule.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300 shadow-inner'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="capitalize">{rule.domain}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {rule.sourceLayer} → {rule.targetLayer}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Rule Details Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-inner overflow-hidden">
          <div className="p-6 border-b border-slate-800 bg-slate-950/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {activeRule.id}
                  </span>
                  <span className="text-xs font-medium text-slate-400 capitalize">
                    Domain: {activeRule.domain}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{activeRule.title}</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl">{activeRule.summary}</p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="text-xs uppercase font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeRule.sourceLayer}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
                <span className="text-xs uppercase font-bold px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {activeRule.targetLayer}
                </span>
              </div>
            </div>

            {/* Business Validation Rules */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                SQL Data Invariants & Quality Rules
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeRule.businessRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dialect Tabs & Copy */}
          <div className="bg-slate-900 px-5 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setSqlDialectTab('delta')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  sqlDialectTab === 'delta'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Databricks Delta Lake SQL</span>
              </button>

              <button
                onClick={() => setSqlDialectTab('snowflake')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  sqlDialectTab === 'snowflake'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Snowflake SQL</span>
              </button>

              <button
                onClick={() => setSqlDialectTab('bigquery')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  sqlDialectTab === 'bigquery'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Google BigQuery SQL</span>
              </button>

              <button
                onClick={() => setSqlDialectTab('ansi')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  sqlDialectTab === 'ansi'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>ANSI / Spark SQL</span>
              </button>
            </div>

            <button
              onClick={() => handleCopyCode(getDialectSql())}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-950 border border-slate-800 px-2.5 py-1 text-slate-300 hover:text-white hover:border-slate-700 transition-colors shadow-inner"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>

          {/* SQL Display */}
          <div className="p-5 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto text-emerald-300 leading-relaxed max-h-[480px]">
            <pre>{getDialectSql()}</pre>
          </div>
        </div>
      </div>

      {/* Lakehouse Layer Architectural Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
          <h3 className="text-sm font-bold text-white mb-2">Streaming Bronze Auto Loader Ingestion</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Ingests streaming events from Kafka or object storage directly via SQL. Schema evolution is preserved, corrupt records are isolated into rescue columns, and immutable landing timestamps are recorded.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div>• Target: lakehouse_bronze.brz_raw_customer_events</div>
            <div>• Format: Delta Lake (Append-Only)</div>
            <div>• Quality Invariant: Immutable landing</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
          <h3 className="text-sm font-bold text-white mb-2">Silver Bi-Temporal SCD2 SQL MERGE</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Calculates deterministic SHA-256 payload hashes across business attributes. Executes atomic SQL MERGE operations to seamlessly expire outdated record versions and insert new active states with millisecond precision.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div>• Target: lakehouse_silver.slv_ent_customer_account</div>
            <div>• Engine: SQL MERGE INTO target USING source</div>
            <div>• Temporal: _valid_from_ts & _valid_to_ts</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
          <h3 className="text-sm font-bold text-white mb-2">Gold Star Schemas & GAAP ASC 606 Marts</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Pure SQL analytical joins between transactional order entities and conformed dimensions. Calculates atomic financial indicators (Net Sales, COGS, Gross Margin) and subscription metrics (Starting MRR, Expansion, Churn).
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div>• Target: lakehouse_gold.gld_fct_order_sales</div>
            <div>• Modeling: Kimball Star Schema Fact Table</div>
            <div>• Aggregation: Periodic Monthly MRR Mart</div>
          </div>
        </div>
      </div>
    </div>
  );
}
