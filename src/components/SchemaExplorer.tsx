import { useState, useMemo } from 'react';
import { Search, Filter, Database, Key, Shield, Layers, ArrowUpRight, Copy, Check } from 'lucide-react';
import { LAKEHOUSE_TABLES } from '../data/standardsData';
import { InsuranceDomain, MedallionLayer, TableDefinition } from '../types';

interface SchemaExplorerProps {
  onSelectTableForDdl?: (tableName: string) => void;
}

export default function SchemaExplorer({ onSelectTableForDdl }: SchemaExplorerProps) {
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTableId, setActiveTableId] = useState<string>(LAKEHOUSE_TABLES[0].id);
  const [showOnlyAuditCols, setShowOnlyAuditCols] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTables = useMemo(() => {
    return LAKEHOUSE_TABLES.filter((tbl) => {
      const matchLayer = selectedLayer === 'all' || tbl.layer === selectedLayer;
      const matchDomain = selectedDomain === 'all' || tbl.domain === selectedDomain;
      const matchSearch =
        searchQuery.trim() === '' ||
        tbl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tbl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tbl.columns.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchLayer && matchDomain && matchSearch;
    });
  }, [selectedLayer, selectedDomain, searchQuery]);

  const activeTable = useMemo(() => {
    return LAKEHOUSE_TABLES.find((t) => t.id === activeTableId) || filteredTables[0] || LAKEHOUSE_TABLES[0];
  }, [activeTableId, filteredTables]);

  const displayedColumns = useMemo(() => {
    if (!activeTable) return [];
    if (showOnlyAuditCols) {
      return activeTable.columns.filter((c) => c.isAudit);
    }
    return activeTable.columns;
  }, [activeTable, showOnlyAuditCols]);

  const handleCopyTableName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedId(name);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bento Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-inner">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tables, columns, or keywords (e.g. customer, order, _amt, _sk)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>

            {/* Layer Filter */}
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Layers</option>
              <option value="silver">Silver (Normalized)</option>
              <option value="gold">Gold (Star Marts)</option>
            </select>

            {/* Domain Filter */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Domains</option>
              <option value="customer">Customer & Accounts</option>
              <option value="orders">Orders & Commerce</option>
              <option value="products">Products & Inventory</option>
              <option value="finance">Finance & Payments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Table List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Tables Catalog ({filteredTables.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredTables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-500">
                No tables match your search filter.
              </div>
            ) : (
              filteredTables.map((tbl) => {
                const isSelected = activeTable?.id === tbl.id;
                const isSilver = tbl.layer === 'silver';
                return (
                  <button
                    key={tbl.id}
                    onClick={() => setActiveTableId(tbl.id)}
                    className={`w-full text-left rounded-xl p-3 border transition-all text-xs ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-inner ring-1 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-bold text-slate-100 truncate">
                        {tbl.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 border ${
                          isSilver
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {tbl.layer}
                      </span>
                    </div>
                    <p className="text-slate-400 line-clamp-1 text-[11px] mb-2">{tbl.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="capitalize font-medium text-slate-400">{tbl.domain}</span>
                      <span>•</span>
                      <span>{tbl.columns.length} columns</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-400">{tbl.scdPattern}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Table Inspector */}
        {activeTable && (
          <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900 shadow-inner overflow-hidden">
            {/* Table Header Details */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-mono font-bold text-white">
                      {activeTable.name}
                    </h2>
                    <button
                      onClick={() => handleCopyTableName(activeTable.name)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                      title="Copy table name"
                    >
                      {copiedId === activeTable.name ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span
                      className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                        activeTable.layer === 'silver'
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {activeTable.layer} Layer
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">{activeTable.description}</p>
                </div>

                {onSelectTableForDdl && (
                  <button
                    onClick={() => onSelectTableForDdl(activeTable.name)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 self-start shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 border border-slate-800 hover:border-slate-700 shadow-inner"
                  >
                    <span>Generate Python & DDL</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Business Domain</span>
                  <span className="font-semibold text-slate-200 capitalize">{activeTable.domain}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">SCD Pattern</span>
                  <span className="font-mono font-semibold text-indigo-400">{activeTable.scdPattern}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Primary Key</span>
                  <span className="font-mono text-slate-200 truncate block">
                    {activeTable.primaryKey.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Partition Key</span>
                  <span className="font-mono text-slate-200 truncate block">
                    {activeTable.partitionKeys.join(', ') || 'None'}
                  </span>
                </div>
              </div>

              {/* Grain & Business Purpose */}
              <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div>
                  <strong className="text-slate-400 font-semibold">Table Grain: </strong>
                  <span className="text-slate-200">{activeTable.grain}</span>
                </div>
                <div>
                  <strong className="text-slate-400 font-semibold">Business Purpose: </strong>
                  <span className="text-slate-300">{activeTable.businessPurpose}</span>
                </div>
              </div>
            </div>

            {/* Column Explorer Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Attributes & Columns ({displayedColumns.length})
              </span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showOnlyAuditCols}
                  onChange={(e) => setShowOnlyAuditCols(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                />
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                <span>Show audit columns only</span>
              </label>
            </div>

            {/* Columns Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Suffix</th>
                    <th className="py-2.5 px-3">Role / Key</th>
                    <th className="py-2.5 px-4">Description & Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-normal">
                  {displayedColumns.map((col) => {
                    const isPk = col.isPrimaryKey;
                    const isAudit = col.isAudit;
                    const isFk = col.isForeignKey;
                    const isPartition = col.isPartitionKey;

                    return (
                      <tr
                        key={col.name}
                        className={`hover:bg-slate-850/50 transition-colors ${
                          isAudit ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-100 whitespace-nowrap">
                          {col.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                          <span className="rounded bg-slate-950 px-1.5 py-0.5 text-[11px] border border-slate-800">
                            {col.dataType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-pink-400 font-medium whitespace-nowrap">
                          {col.suffix}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {isPk && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                                <Key className="h-2.5 w-2.5" /> PK
                              </span>
                            )}
                            {isFk && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                                FK
                              </span>
                            )}
                            {isPartition && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                Partition
                              </span>
                            )}
                            {isAudit && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                                <Shield className="h-2.5 w-2.5" /> Audit
                              </span>
                            )}
                            {!isPk && !isFk && !isPartition && !isAudit && (
                              <span className="text-slate-500 text-[11px]">Attribute</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 leading-relaxed">
                          {col.description}
                          {col.transformationLogic && (
                            <span className="block font-mono text-[10px] text-indigo-400 mt-0.5">
                              Logic: {col.transformationLogic}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Lineage Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-slate-400 block text-[11px] uppercase tracking-wider">
                  Data Lineage & Traceability
                </span>
                <div className="flex flex-wrap items-center gap-2 text-slate-300">
                  <span className="text-slate-500">Upstream:</span>
                  {(activeTable.upstreamTables || ['Raw Source Payload']).map((up) => (
                    <span key={up} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {up}
                    </span>
                  ))}
                  <span className="text-slate-500">→</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800 font-semibold">
                    {activeTable.name}
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-500">Downstream:</span>
                  {(activeTable.downstreamConsumers || ['BI & Regulatory']).map((down) => (
                    <span key={down} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {down}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
