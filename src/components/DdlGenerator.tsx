import { useState, useMemo } from 'react';
import { Database, Copy, Check, Download, Settings2, Sparkles } from 'lucide-react';
import { LAKEHOUSE_TABLES, AUDIT_COLUMNS } from '../data/standardsData';
import { SqlPlatform, TableDefinition } from '../types';

interface DdlGeneratorProps {
  initialTable?: string;
}

export default function DdlGenerator({ initialTable }: DdlGeneratorProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>(
    initialTable || LAKEHOUSE_TABLES[0].id
  );
  const [platform, setPlatform] = useState<SqlPlatform>('delta');
  const [includeAuditCols, setIncludeAuditCols] = useState<boolean>(true);
  const [includeTableProps, setIncludeTableProps] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const activeTable = useMemo(() => {
    return (
      LAKEHOUSE_TABLES.find((t) => t.id === selectedTableId || t.name === selectedTableId) ||
      LAKEHOUSE_TABLES[0]
    );
  }, [selectedTableId]);

  // Platform type mapper
  const mapType = (colType: string, platformTarget: SqlPlatform): string => {
    if (platformTarget === 'delta') {
      if (colType.startsWith('VARCHAR')) return 'STRING';
      return colType;
    }
    if (platformTarget === 'snowflake') {
      if (colType === 'STRING') return 'VARCHAR(255)';
      if (colType === 'TIMESTAMP') return 'TIMESTAMP_NTZ';
      if (colType.startsWith('DECIMAL')) return colType.replace('DECIMAL', 'NUMBER');
      return colType;
    }
    if (platformTarget === 'bigquery') {
      if (colType.startsWith('VARCHAR') || colType === 'STRING' || colType.startsWith('CHAR')) return 'STRING';
      if (colType === 'INTEGER') return 'INT64';
      if (colType === 'BIGINT') return 'INT64';
      if (colType.startsWith('DECIMAL')) return 'NUMERIC';
      if (colType === 'BOOLEAN') return 'BOOL';
      if (colType.startsWith('ARRAY')) return 'ARRAY<STRING>';
      return colType;
    }
    return colType;
  };

  const generatedDdl = useMemo(() => {
    if (!activeTable) return '';

    const cols = includeAuditCols
      ? activeTable.columns
      : activeTable.columns.filter((c) => !c.isAudit);

    const schemaPrefix =
      activeTable.layer === 'silver' ? 'lakehouse_silver' : 'lakehouse_gold';

    const colLines = cols.map((col) => {
      const type = mapType(col.dataType, platform);
      const nullableStr = col.isNullable ? '' : ' NOT NULL';
      const commentStr = col.description ? ` COMMENT '${col.description.replace(/'/g, "\\'")}'` : '';
      return `    ${col.name.padEnd(30, ' ')} ${type.padEnd(16, ' ')}${nullableStr}${commentStr}`;
    });

    let ddl = '';

    if (platform === 'delta') {
      const partitions =
        activeTable.partitionKeys && activeTable.partitionKeys.length > 0
          ? `\nPARTITIONED BY (${activeTable.partitionKeys.join(', ')})`
          : '';
      const tblProps = includeTableProps
        ? `\nTBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
)`
        : '';

      ddl = `-- Databricks Delta Lake / Spark SQL DDL
-- Table: ${activeTable.name} (Layer: ${activeTable.layer.toUpperCase()}, Domain: ${activeTable.domain.toUpperCase()})
-- Grain: ${activeTable.grain}

CREATE OR REPLACE TABLE ${schemaPrefix}.${activeTable.name} (
${colLines.join(',\n')}
)
USING DELTA${partitions}${tblProps};`;
    } else if (platform === 'snowflake') {
      const clusterBy =
        activeTable.partitionKeys && activeTable.partitionKeys.length > 0
          ? `\nCLUSTER BY (${activeTable.partitionKeys.join(', ')})`
          : '';

      ddl = `-- Snowflake SQL DDL
-- Table: ${activeTable.name} (Layer: ${activeTable.layer.toUpperCase()})
-- Primary Key: (${activeTable.primaryKey.join(', ')})

CREATE OR REPLACE TABLE ${schemaPrefix}.${activeTable.name} (
${colLines.join(',\n')},
    CONSTRAINT pk_${activeTable.name} PRIMARY KEY (${activeTable.primaryKey.join(', ')})
)${clusterBy}
COMMENT = '${activeTable.description.replace(/'/g, "\\'")}';`;
    } else if (platform === 'bigquery') {
      const partitionClause =
        activeTable.partitionKeys && activeTable.partitionKeys.length > 0
          ? `\nPARTITION BY ${activeTable.partitionKeys[0]}`
          : '';
      const clusterClause =
        activeTable.primaryKey && activeTable.primaryKey.length > 0
          ? `\nCLUSTER BY ${activeTable.primaryKey.slice(0, 4).join(', ')}`
          : '';

      ddl = `-- Google BigQuery Standard SQL DDL
-- Dataset: ${schemaPrefix}
-- Table: ${activeTable.name}

CREATE OR REPLACE TABLE \`${schemaPrefix}.${activeTable.name}\` (
${colLines.join(',\n')}
)${partitionClause}${clusterClause}
OPTIONS(
    description = "${activeTable.description.replace(/"/g, '\\"')}"
);`;
    }

    return ddl;
  }, [activeTable, platform, includeAuditCols, includeTableProps]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDdl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDdl], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTable.name}_${platform}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 shrink-0 shadow-inner">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Interactive Production DDL Generator
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
              Generate battle-tested, copy-ready DDL statements parameterized for Databricks Delta Lake, 
              Snowflake, or Google BigQuery. Automatically embeds standardized audit columns, partition clauses, 
              clustering keys, and table metadata comments.
            </p>
          </div>
        </div>
      </div>

      {/* Generator Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Table Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Select Table Entity
            </label>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 font-mono font-medium text-slate-200 focus:outline-none focus:border-slate-700"
            >
              {LAKEHOUSE_TABLES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">
                  [{t.layer.toUpperCase()}] {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Engine Platform */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Target Lakehouse Platform
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 p-1 bg-slate-950">
              {(['delta', 'snowflake', 'bigquery'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`py-1 rounded-md text-center text-xs font-semibold capitalize transition-all ${
                    platform === p
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Options: Audit columns */}
          <div className="flex flex-col justify-end pb-1 space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={includeAuditCols}
                onChange={(e) => setIncludeAuditCols(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Include Standard Audit Columns</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={includeTableProps}
                onChange={(e) => setIncludeTableProps(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Include Performance Properties (CDF/Optimize)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end justify-start md:justify-end gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 px-3.5 py-2 text-xs font-semibold text-white border border-slate-700 shadow-inner transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy DDL'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 text-slate-200 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
            <span className="font-mono text-white font-semibold">
              {activeTable.name}.sql ({platform.toUpperCase()})
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {activeTable.columns.length} columns • UTF-8
          </span>
        </div>

        <pre className="p-5 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed max-h-[550px]">
          {generatedDdl}
        </pre>
      </div>
    </div>
  );
}
