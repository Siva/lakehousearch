import { useState } from 'react';
import { BookOpen, CheckCircle, XCircle, FileCode, Check, Copy } from 'lucide-react';
import { NAMING_RULES } from '../data/standardsData';

export default function NamingTaxonomy() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const categories = ['all', 'Keys & IDs', 'Dates & Timestamps', 'Financial & Metrics', 'Codes & Flags'];

  const categoryFilterMap: Record<string, string[]> = {
    'Keys & IDs': ['_sk', '_id', '_hash_key'],
    'Dates & Timestamps': ['_dt', '_ts'],
    'Financial & Metrics': ['_amt', '_pct', '_rate', '_cnt', '_qty'],
    'Codes & Flags': ['_flg', '_cd', '_desc', '_txt'],
  };

  const filteredRules = NAMING_RULES.filter((rule) => {
    if (selectedCategory === 'all') return true;
    return categoryFilterMap[selectedCategory]?.includes(rule.suffix);
  });

  const tablePrefixes = [
    { prefix: 'brz_<src>_<entity>', layer: 'Bronze', role: 'Raw Landing Store', example: 'brz_raw_orders', description: 'Source fidelity raw streaming/batch table with original schema.' },
    { prefix: 'slv_ent_<entity>', layer: 'Silver', role: 'Normalized 3NF / SCD2', example: 'slv_ent_customer_account', description: 'Cleaned, deduplicated single source of truth at atomic event grain.' },
    { prefix: 'slv_ref_<entity>', layer: 'Silver', role: 'Conformed Reference / Lookup', example: 'slv_ref_country_code', description: 'Standardized industry lookup codes, geographic taxonomies, and crosswalks.' },
    { prefix: 'gld_dim_<entity>', layer: 'Gold', role: 'Kimball Dimension', example: 'gld_dim_customer', description: 'Conformed dimension with surrogate key (_sk) for slicing fact metrics.' },
    { prefix: 'gld_fct_<entity>', layer: 'Gold', role: 'Transactional / Periodic Fact', example: 'gld_fct_order_sales', description: 'Numerical financial measures joined to dimensions at atomic or snapshot grain.' },
    { prefix: 'gld_agg_<entity>_<grain>', layer: 'Gold', role: 'Aggregated Rollup Mart', example: 'gld_agg_daily_revenue_mart', description: 'Pre-computed rollup mart optimized for high-speed executive dashboards.' },
    { prefix: 'gld_rpt_<reg>_<schedule>', layer: 'Gold', role: 'Statutory Audit / Regulatory Report', example: 'gld_rpt_sox_reconciliation', description: 'Frozen regulatory submission tables strictly mapped to official audit schedules.' },
  ];

  const typeCrosswalk = [
    { domainType: 'Monetary Currency', suffix: '_amt', deltaType: 'DECIMAL(18,2)', snowflakeType: 'NUMBER(18,2)', bqType: 'NUMERIC' },
    { domainType: 'Calendar Date', suffix: '_dt', deltaType: 'DATE', snowflakeType: 'DATE', bqType: 'DATE' },
    { domainType: 'UTC Timestamp', suffix: '_ts', deltaType: 'TIMESTAMP', snowflakeType: 'TIMESTAMP_NTZ', bqType: 'TIMESTAMP' },
    { domainType: 'Boolean Flag', suffix: '_flg', deltaType: 'BOOLEAN', snowflakeType: 'BOOLEAN', bqType: 'BOOL' },
    { domainType: 'Surrogate Key', suffix: '_sk', deltaType: 'BIGINT', snowflakeType: 'NUMBER(38,0)', bqType: 'INT64' },
    { domainType: 'Cryptographic Hash', suffix: '_hash_key', deltaType: 'STRING / CHAR(64)', snowflakeType: 'VARCHAR(64)', bqType: 'STRING' },
    { domainType: 'Percentage Ratio', suffix: '_pct', deltaType: 'DECIMAL(7,4)', snowflakeType: 'NUMBER(7,4)', bqType: 'NUMERIC' },
    { domainType: 'Lookup Code', suffix: '_cd', deltaType: 'STRING', snowflakeType: 'VARCHAR(32)', bqType: 'STRING' },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 shrink-0 shadow-inner">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Enterprise Naming Taxonomy & Type Standards
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
              Consistent naming guarantees that any data engineer, actuary, or automated catalog crawler 
              (Unity Catalog, Snowflake Horizon, Google Dataplex) can immediately infer an attribute's 
              data type, semantic role, and lineage origin simply from its identifier. 
              Our taxonomy enforces strict <strong className="text-white">snake_case</strong> with standardized suffixes and table prefixes.
            </p>
          </div>
        </div>
      </div>

      {/* Table Prefix Taxonomy */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">
            1. Standard Lakehouse Table Prefix Taxonomy
          </h3>
          <p className="text-xs text-slate-400">
            Every lakehouse table must carry an explicit architectural layer and structural role prefix.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Prefix Pattern</th>
                <th className="py-2.5 px-2">Layer</th>
                <th className="py-2.5 px-3">Architectural Role</th>
                <th className="py-2.5 px-3">Example Table Name</th>
                <th className="py-2.5 px-4">Standard Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {tablePrefixes.map((p) => (
                <tr key={p.prefix} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-indigo-400 whitespace-nowrap">{p.prefix}</td>
                  <td className="py-2.5 px-2 font-sans font-semibold text-slate-200">{p.layer}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-400 whitespace-nowrap">{p.role}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-100 whitespace-nowrap">
                    <button
                      onClick={() => handleCopy(p.example)}
                      className="hover:underline text-left inline-flex items-center gap-1 text-slate-200 hover:text-white"
                      title="Click to copy"
                    >
                      {p.example}
                      {copiedText === p.example ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-500" />}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-300">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Suffix Reference */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              2. Strict Column Suffix Taxonomy & Semantic Rules
            </h3>
            <p className="text-xs text-slate-400">
              Every column name MUST terminate with one of the authorized suffixes below.
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors border ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white border-slate-700 shadow-inner'
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <div key={rule.suffix} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-pink-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {rule.suffix}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">{rule.category}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">{rule.allowedTypes}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{rule.ruleDescription}</p>

              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                    <CheckCircle className="h-3 w-3" /> Valid:
                  </span>
                  <code className="font-mono text-[11px] text-slate-200">{rule.validExample}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 flex items-center gap-1 font-semibold text-[11px]">
                    <XCircle className="h-3 w-3" /> Anti-pattern:
                  </span>
                  <code className="font-mono text-[11px] text-slate-500 line-through">{rule.invalidExample}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Engine Data Type Crosswalk */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">
            3. Multi-Engine Data Type Crosswalk
          </h3>
          <p className="text-xs text-slate-400">
            Approved type mappings across Databricks Delta Lake / Spark SQL, Snowflake, and Google BigQuery.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Semantic Category</th>
                <th className="py-2.5 px-2">Suffix</th>
                <th className="py-2.5 px-3">Databricks Delta / Spark</th>
                <th className="py-2.5 px-3">Snowflake</th>
                <th className="py-2.5 px-3">Google BigQuery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {typeCrosswalk.map((tc) => (
                <tr key={tc.domainType} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-2 px-3 font-sans font-medium text-slate-200">{tc.domainType}</td>
                  <td className="py-2 px-2 font-bold text-pink-400">{tc.suffix}</td>
                  <td className="py-2 px-3 text-slate-300">{tc.deltaType}</td>
                  <td className="py-2 px-3 text-slate-300">{tc.snowflakeType}</td>
                  <td className="py-2 px-3 text-slate-300">{tc.bqType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
