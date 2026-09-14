import { useState } from 'react';
import { Sparkles, Code2, CheckCircle, ArrowRight, Copy, Check } from 'lucide-react';
import { TRANSFORMATION_RULES } from '../data/standardsData';

export default function TransformationEngine() {
  const [activeRuleId, setActiveRuleId] = useState<string>(TRANSFORMATION_RULES[0].id);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const activeRule = TRANSFORMATION_RULES.find((r) => r.id === activeRuleId) || TRANSFORMATION_RULES[0];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 shrink-0 shadow-inner">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Enterprise Normalization & Transformation Engine (Bronze → Silver → Gold)
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
              Enterprise lakehouse data processing requires rigorous mathematical transformations between layers. 
              Bronze landing payloads are deduplicated and normalized into 3NF Silver entities with bi-temporal versioning, 
              which are then aggregated into Kimball star schemas, sales fact tables, and periodic monthly financial snapshots in Gold.
            </p>
          </div>
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
                  ? 'border-slate-700 bg-slate-800 text-white shadow-inner'
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
              Enterprise Business Rules & Invariants
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

        {/* Code Snippet */}
        <div className="p-5 bg-slate-950 text-slate-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Code2 className="h-4 w-4 text-indigo-400" />
              <span className="font-mono">Standard Production SQL (Spark SQL / Delta Lake)</span>
            </div>
            <button
              onClick={() => handleCopyCode(activeRule.sqlSnippet)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors shadow-inner"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>

          <pre className="font-mono text-xs overflow-x-auto text-emerald-300 leading-relaxed max-h-[450px]">
            {activeRule.sqlSnippet}
          </pre>
        </div>
      </div>

      {/* Three Domain Transformation Deep Dives */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
          <h3 className="text-sm font-bold text-white mb-2">Customer Account Ingestion Flow</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Deduplicates real-time CRM and authentication event streams. Generates deterministic SHA-256 payload hashes to perform high-speed SCD Type 2 merges into historical customer revisions.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div>• Bronze: brz_raw_customer_events</div>
            <div>• Silver: slv_ent_customer_account (SCD2)</div>
            <div>• Gold: gld_dim_customer</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
          <h3 className="text-sm font-bold text-white mb-2">Order Line Item & Sales Fact Flow</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Pairs transactional order headers with granular item lines. Resolves conformed customer and product surrogate keys to build atomic sales facts with net revenue, discounts, and COGS margins.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div>• Bronze: brz_raw_orders</div>
            <div>• Silver: slv_ent_order_header & line_item</div>
            <div>• Gold: gld_fct_order_sales</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
          <h3 className="text-sm font-bold text-white mb-2">Financial Snapshot & Revenue Rollup</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Builds periodic end-of-month snapshot marts tracking starting MRR, expansion, contraction, and churn. Powers sub-second executive dashboards and ASC 606 revenue recognition.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div>• Bronze: brz_raw_payments</div>
            <div>• Silver: slv_ent_payment_transaction</div>
            <div>• Gold: gld_fct_customer_monthly_snapshot</div>
          </div>
        </div>
      </div>
    </div>
  );
}
