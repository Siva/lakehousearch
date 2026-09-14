import { useState } from 'react';
import Header from './components/Header';
import OverviewSection from './components/OverviewSection';
import SchemaExplorer from './components/SchemaExplorer';
import AuditScd2Sandbox from './components/AuditScd2Sandbox';
import TransformationEngine from './components/TransformationEngine';
import NamingTaxonomy from './components/NamingTaxonomy';
import RegulatoryMatrix from './components/RegulatoryMatrix';
import DdlGenerator from './components/DdlGenerator';
import DocumentViewer, { ENTERPRISE_MARKDOWN_SPEC } from './components/DocumentViewer';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedTableForDdl, setSelectedTableForDdl] = useState<string>('slv_ent_customer_account');

  const handleNavigateToDdl = (tableName: string) => {
    setSelectedTableForDdl(tableName);
    setActiveTab('ddl');
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([ENTERPRISE_MARKDOWN_SPEC], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SKILL_ENTERPRISE_MEDALLION_STANDARDS.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header with Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportMarkdown={handleDownloadMarkdown}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewSection onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'schemas' && (
          <SchemaExplorer onSelectTableForDdl={handleNavigateToDdl} />
        )}

        {activeTab === 'audit-scd2' && <AuditScd2Sandbox />}

        {activeTab === 'transformations' && <TransformationEngine />}

        {activeTab === 'naming' && <NamingTaxonomy />}

        {activeTab === 'regulatory' && <RegulatoryMatrix />}

        {activeTab === 'ddl' && (
          <DdlGenerator initialTable={selectedTableForDdl} />
        )}

        {activeTab === 'document' && (
          <DocumentViewer onDownload={handleDownloadMarkdown} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12 text-xs text-slate-500 font-mono">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 uppercase tracking-tight">
              Enterprise Medallion Lakehouse Architecture Standards
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Ref: DQ-STD-2025-V3.0</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Schema: Medallion_Enterprise_L4</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[11px] tracking-wider uppercase">
            <span>SOX 404</span>
            <span>•</span>
            <span>GDPR Art. 17</span>
            <span>•</span>
            <span>SOC 2 Type II</span>
            <span>•</span>
            <span>BCBS 239</span>
            <span>•</span>
            <span>GAAP ASC 606</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
