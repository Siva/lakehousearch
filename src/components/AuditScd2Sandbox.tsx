import { useState } from 'react';
import { ShieldCheck, Clock, Hash, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { AUDIT_COLUMNS, SCD2_SIMULATION_STEPS } from '../data/standardsData';

export default function AuditScd2Sandbox() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [selectedAuditCategory, setSelectedAuditCategory] = useState<string>('all');

  const currentStep = SCD2_SIMULATION_STEPS[activeStepIndex];

  const categories = ['all', 'Source Lineage', 'Pipeline Execution', 'Bi-Temporal SCD2', 'Data Integrity', 'Governance'];

  const filteredAuditColumns = AUDIT_COLUMNS.filter((col) => {
    if (selectedAuditCategory === 'all') return true;
    return col.category === selectedAuditCategory;
  });

  return (
    <div className="space-y-8">
      {/* Introduction Bento Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-purple-400 shrink-0 shadow-inner">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Audit Lineage Framework & Bi-Temporal SCD Type 2 Standards
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
              In enterprise analytics, financial auditing (SOX 404, GAAP ASC 606), and compliance (GDPR Art. 17, BCBS 239), historical data cannot simply be overwritten in place. 
              Customer contracts upgrade mid-cycle, seat allocations expand, and orders mutate through fulfillment stages. 
              Our enterprise lakehouse standard mandates <strong className="text-white">14 canonical audit columns </strong> 
              combined with a deterministic <strong className="text-white">SHA-256 hash diff engine</strong> to guarantee 100% idempotent CDC ingestion and point-in-time state reconstruction.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive SCD2 Life Cycle Simulator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
              Interactive Execution Sandbox
            </span>
            <h3 className="text-base font-bold text-white">
              Customer Account Subscription: Bi-Temporal SCD Type 2 Simulation
            </h3>
            <p className="text-xs text-slate-400">
              Step through incoming transactions to observe how <code className="font-mono text-pink-400">_valid_from_ts</code>, <code className="font-mono text-pink-400">_valid_to_ts</code>, and <code className="font-mono text-pink-400">_record_hash</code> evolve.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStepIndex(0)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 shadow-inner"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <div className="flex rounded-lg border border-slate-800 p-0.5 bg-slate-950">
              {SCD2_SIMULATION_STEPS.map((step, idx) => (
                <button
                  key={step.stepNumber}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeStepIndex === idx
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Step {step.stepNumber}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Step Narrative */}
        <div className="my-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold font-mono uppercase text-indigo-300">
                Step {currentStep.stepNumber}: {currentStep.eventTitle}
              </span>
              <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {currentStep.timestamp}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{currentStep.eventDescription}</p>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 text-slate-200 p-3.5 font-mono text-[11px] overflow-x-auto">
            <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1 flex items-center justify-between">
              <span>Incoming CDC Payload</span>
              <span className="text-pink-400">{currentStep.incomingPayload.action}</span>
            </div>
            <pre className="text-slate-300">{JSON.stringify(currentStep.incomingPayload, null, 2)}</pre>
          </div>
        </div>

        {/* Silver Table State Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Silver Layer Table State: <code className="font-mono text-indigo-400">slv_ent_customer_account</code>
            </span>
            <span className="text-[11px] text-slate-400">
              Total Versions Recorded: <strong className="text-white">{currentStep.resultingRows.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Version ID</th>
                  <th className="py-2.5 px-3">Account Key</th>
                  <th className="py-2.5 px-3">Tier Plan</th>
                  <th className="py-2.5 px-3">Contracted MRR</th>
                  <th className="py-2.5 px-2">Seats</th>
                  <th className="py-2.5 px-3">_valid_from_ts</th>
                  <th className="py-2.5 px-3">_valid_to_ts</th>
                  <th className="py-2.5 px-2">_is_current_flg</th>
                  <th className="py-2.5 px-3">_record_hash</th>
                  <th className="py-2.5 px-3">Action Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px]">
                {currentStep.resultingRows.map((row) => {
                  const isInserted = row.action_highlight === 'inserted';
                  const isExpired = row.action_highlight === 'expired';
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isInserted
                          ? 'bg-emerald-950/30 text-emerald-300 font-semibold'
                          : isExpired
                          ? 'bg-amber-950/20 text-slate-400'
                          : 'bg-slate-900/50 text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-white">{row.version_id}</td>
                      <td className="py-2.5 px-3">{row.business_key}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                          {row.tier_plan_cd}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-300">
                        ${row.mrr_amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2">{row.seats_cnt}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.valid_from}</td>
                      <td className="py-2.5 px-3">
                        {row.valid_to.includes('9999') ? (
                          <span className="font-bold text-emerald-400">9999-12-31 (Active)</span>
                        ) : (
                          <span className="text-amber-400">{row.valid_to}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        {row.is_current ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            TRUE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-700">
                            FALSE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">{row.record_hash}</td>
                      <td className="py-2.5 px-3">
                        {isInserted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> INSERTED (ACTIVE)
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Clock className="h-3 w-3" /> EXPIRED BY UPGRADE
                          </span>
                        )}
                        {!isInserted && !isExpired && (
                          <span className="text-slate-500 text-[10px] font-mono">HISTORICAL VERSION</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-amber-400">Point-in-Time Traceability Principle: </strong> 
              When computing recognized monthly revenue for February 2026, the engine queries where <code className="font-mono text-pink-400 font-semibold">'2026-02-15' BETWEEN _valid_from_ts AND _valid_to_ts</code>, 
              which cleanly resolves to Version 0 ($49/mo, 5 seats). When querying for April 2026, it seamlessly resolves to Version 1 ($199/mo, 20 seats). In June 2026, it resolves to Version 2 ($349/mo, 40 seats). No historical distortion occurs!
            </p>
          </div>
        </div>
      </div>

      {/* Complete Audit Columns Catalog */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              The 14 Mandatory Audit & Lineage Columns Specification
            </h3>
            <p className="text-xs text-slate-400">
              Mandatory in every Silver and Gold table to guarantee enterprise lineage (SOX 404 & BCBS 239 compliant).
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedAuditCategory(cat)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors capitalize font-medium ${
                  selectedAuditCategory === cat
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAuditColumns.map((col) => (
            <div key={col.name} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-pink-400">{col.name}</span>
                <span className="font-mono text-xs rounded bg-slate-900 px-2 py-0.5 border border-slate-800 text-slate-300">
                  {col.dataType}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{col.description}</p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div>
                  <strong className="text-slate-400">Enterprise Standard: </strong>
                  {col.rule}
                </div>
                <div>
                  <strong className="text-slate-400">Sample Value: </strong>
                  <code className="font-mono text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {col.exampleValue}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SHA-256 Hash Diff Implementation Pattern */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-6 shadow-inner">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">
            Deterministic SHA-256 Change Detection Pattern (SQL Implementation)
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Instead of performing 30-way NULL-safe equality comparisons on merge conditions, the Silver ingestion pipeline in SQL pre-calculates 
          a deterministic SHA-256 payload hash across all non-audit business attributes. This drastically reduces CPU shuffle and memory overhead during distributed Delta Lake, Snowflake, and BigQuery MERGE operations.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 font-mono mb-2 flex items-center justify-between">
              <span>Databricks Delta Lake / Spark SQL:</span>
              <span className="text-indigo-400">SHA2 + CONCAT_WS</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800 shadow-inner max-h-[300px]">
              <pre>{`-- Databricks Delta Lake SQL Pre-calculated Hash
SELECT 
    account_id AS customer_account_id,
    plan_tier AS tier_plan_cd,
    status AS account_status_cd,
    licensed_seats AS seat_licensed_cnt,
    mrr_amount AS mrr_amt,
    SHA2(
        CONCAT_WS('||',
            COALESCE(UPPER(TRIM(plan_tier)), ''),
            COALESCE(UPPER(TRIM(status)), ''),
            COALESCE(CAST(licensed_seats AS STRING), '0'),
            COALESCE(CAST(mrr_amount AS STRING), '0.00'),
            COALESCE(UPPER(TRIM(country_code)), ''),
            COALESCE(CAST(has_enterprise_sla AS STRING), 'false')
        ),
        256
    ) AS _record_hash
FROM lakehouse_bronze.brz_raw_customer_events;`}</pre>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 font-mono mb-2 flex items-center justify-between">
              <span>Snowflake / BigQuery SQL:</span>
              <span className="text-slate-500">Cloud Data Warehouse SQL</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800 shadow-inner max-h-[300px]">
              <pre>{`-- Snowflake SQL Deterministic Hash Generation
SELECT 
    account_id AS customer_account_id,
    plan_tier AS tier_plan_cd,
    status AS account_status_cd,
    licensed_seats AS seat_licensed_cnt,
    mrr_amount AS mrr_amt,
    SHA2(
        CONCAT_WS('||',
            NVL(UPPER(TRIM(plan_tier)), ''),
            NVL(UPPER(TRIM(status)), ''),
            NVL(licensed_seats::VARCHAR, '0'),
            NVL(mrr_amount::VARCHAR, '0.00'),
            NVL(UPPER(TRIM(country_code)), ''),
            NVL(has_enterprise_sla::VARCHAR, 'false')
        ),
        256
    ) AS _record_hash
FROM LAKEHOUSE_BRONZE.BRZ_RAW_CUSTOMER_EVENTS;`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
