import { Database, ShieldCheck, FileDown, BookOpen, Layers, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportMarkdown: () => void;
}

export default function Header({ activeTab, setActiveTab, onExportMarkdown }: HeaderProps) {
  const navItems = [
    { id: 'overview', label: 'Architecture & Flow', icon: Layers },
    { id: 'schemas', label: 'Silver & Gold Schemas', icon: Database },
    { id: 'audit-scd2', label: 'Audit & SCD2 Engine', icon: ShieldCheck },
    { id: 'transformations', label: 'Transformations', icon: Sparkles },
    { id: 'naming', label: 'Naming & Types', icon: BookOpen },
    { id: 'regulatory', label: 'Governance Matrix', icon: ShieldCheck },
    { id: 'ddl', label: 'DDL Generator', icon: Database },
    { id: 'document', label: 'Skill Spec (.md)', icon: FileDown },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 shadow-inner">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  Enterprise Medallion Architecture
                </span>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-indigo-400 border border-indigo-500/20">
                  Standards v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Bronze, Silver & Gold Lakehouse • Customer, Orders, Products & Finance • SOX & GDPR Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full font-mono uppercase tracking-wider">
                Lineage Enabled
              </span>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full font-mono uppercase tracking-wider">
                Governance Ready
              </span>
            </div>

            <button
              onClick={onExportMarkdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-colors shadow-inner"
              title="Download full specification as Markdown file"
            >
              <FileDown className="h-4 w-4 text-indigo-400" />
              <span>Download Skill .md</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
