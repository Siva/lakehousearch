import { useState } from 'react';
import { ShieldCheck, Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { REGULATORY_FRAMEWORKS } from '../data/standardsData';

export default function RegulatoryMatrix() {
  const [selectedRegId, setSelectedRegId] = useState<string>(REGULATORY_FRAMEWORKS[0].id);

  // Unit Economics & Financial Reconciliation Calculator state
  const [calcGrossSales, setCalcGrossSales] = useState<number>(12500000);
  const [calcDiscounts, setCalcDiscounts] = useState<number>(750000);
  const [calcCogs, setCalcCogs] = useState<number>(4200000);
  const [calcGatewayFees, setCalcGatewayFees] = useState<number>(310000);
  const [calcOperatingExpenses, setCalcOperatingExpenses] = useState<number>(2800000);

  // Derived Enterprise Financial Metrics
  const netSalesRevenue = Math.max(0, calcGrossSales - calcDiscounts);
  const grossProfitAmt = netSalesRevenue - calcCogs;
  const grossMarginPct = netSalesRevenue > 0 ? (grossProfitAmt / netSalesRevenue) * 100 : 0;
  const netOperatingContribution = grossProfitAmt - calcGatewayFees - calcOperatingExpenses;
  const contributionMarginPct = netSalesRevenue > 0 ? (netOperatingContribution / netSalesRevenue) * 100 : 0;

  const activeReg = REGULATORY_FRAMEWORKS.find((r) => r.id === selectedRegId) || REGULATORY_FRAMEWORKS[0];

  return (
    <div className="space-y-8">
      {/* Header Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-blue-400 shrink-0 shadow-inner">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Enterprise Governance & Compliance Lineage Matrix
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
              Enterprise lakehouse architectures are governed by corporate internal controls, statutory financial standards, and privacy mandates. 
              The Bronze, Silver, and Gold layers must directly satisfy <strong className="text-white">SOX Section 404</strong> (ledger traceability & audit integrity), 
              <strong className="text-white"> GDPR (Art. 17) & CCPA</strong> (crypto-shredding & right to erasure), <strong className="text-white">SOC 2 Type II</strong> (pipeline security & availability), 
              <strong className="text-white"> BCBS 239</strong> (automated data lineage), and <strong className="text-white">GAAP ASC 606 / IFRS 15</strong> (revenue from customer contracts).
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Enterprise Unit Economics & Revenue Reconciliation Calculator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Interactive Financial Reconciliation & Margin Engine
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Gold Mart Metric Validation</span>
        </div>

        <p className="text-xs text-slate-300">
          Adjust the inputs below to inspect how financial measures aggregated in Gold star schemas reconcile with downstream general ledger accounting:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Gross Merchandise ($)
            </label>
            <input
              type="number"
              value={calcGrossSales}
              onChange={(e) => setCalcGrossSales(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">From gld_fct_order_sales</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Discounts & Promos ($)
            </label>
            <input
              type="number"
              value={calcDiscounts}
              onChange={(e) => setCalcDiscounts(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">From slv_ent_order_header</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Cost of Goods (COGS) ($)
            </label>
            <input
              type="number"
              value={calcCogs}
              onChange={(e) => setCalcCogs(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Qty * dim_product.cost</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Gateway & Merchant Fees ($)
            </label>
            <input
              type="number"
              value={calcGatewayFees}
              onChange={(e) => setCalcGatewayFees(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">slv_ent_payment_transaction</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Operational Overhead ($)
            </label>
            <input
              type="number"
              value={calcOperatingExpenses}
              onChange={(e) => setCalcOperatingExpenses(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Fulfillment & Shipping</span>
          </div>
        </div>

        {/* Calculated Results Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs shadow-inner">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Net Recognized Revenue</span>
            <span className="text-base font-bold font-mono text-amber-300">
              ${netSalesRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Gross GMV - Discounts</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Gross Profit</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              ${grossProfitAmt.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Margin: {grossMarginPct.toFixed(1)}%</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Gateway & OpEx Drag</span>
            <span className="text-base font-bold font-mono text-indigo-300">
              ${(calcGatewayFees + calcOperatingExpenses).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Merchant + Fulfillment</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Net Operating Contribution</span>
            <span className={`text-base font-bold font-mono ${netOperatingContribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${netOperatingContribution.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Margin: {contributionMarginPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Regulatory Framework Selector & Details */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-inner overflow-hidden">
        {/* Framework Selector Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto bg-slate-950/70 p-2 gap-1">
          {REGULATORY_FRAMEWORKS.map((reg) => {
            const isSelected = reg.id === selectedRegId;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegId(reg.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'border-slate-700 bg-slate-800 text-white shadow-inner'
                    : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {reg.title.split(':')[0]}
              </button>
            );
          })}
        </div>

        {/* Selected Framework Panel */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold font-mono uppercase text-indigo-400">
                {activeReg.authority} • {activeReg.frequency}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{activeReg.title}</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">{activeReg.summary}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 shrink-0">
              <span className="font-semibold block text-[10px] uppercase text-indigo-400">Required Lakehouse Marts</span>
              <div className="flex flex-col gap-1 mt-1 font-mono text-[11px]">
                {activeReg.targetMarts.map((m) => (
                  <span key={m} className="font-bold text-slate-200">• {m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics Required */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
              Mandatory Governance Lineage Items & Verification Controls
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeReg.keyMetrics.map((km, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{km}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lineage & Reconciliation Guarantee */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300">Auditing Standard & Automated Lineage Invariant:</span>
            </div>
            <p className="leading-relaxed pl-5 text-slate-300">{activeReg.lineageRequirements}</p>
            <div className="pl-5 pt-1 font-mono text-[11px] text-amber-300 font-semibold">
              Reconciliation Check: {activeReg.formulaOrFormat}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
