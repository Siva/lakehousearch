import { useState, useMemo } from 'react';
import { Database, Copy, Check, Download, Layers, ShieldCheck } from 'lucide-react';
import { LAKEHOUSE_TABLES } from '../data/standardsData';
import { SqlPlatform } from '../types';

export type SqlDialect = 'delta' | 'snowflake' | 'bigquery' | 'postgres' | 'athena' | 'dbt';

interface DdlGeneratorProps {
  initialTable?: string;
}

export default function DdlGenerator({ initialTable }: DdlGeneratorProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>(
    initialTable || LAKEHOUSE_TABLES[0].id
  );
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>('delta');
  const [includeAuditCols, setIncludeAuditCols] = useState<boolean>(true);
  const [includeTableProps, setIncludeTableProps] = useState<boolean>(true);
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const activeTable = useMemo(() => {
    return (
      LAKEHOUSE_TABLES.find((t) => t.id === selectedTableId || t.name === selectedTableId) ||
      LAKEHOUSE_TABLES[0]
    );
  }, [selectedTableId]);

  // SQL Platform type mapper
  const mapSqlType = (colType: string, dialect: SqlDialect): string => {
    if (dialect === 'delta') {
      if (colType.startsWith('VARCHAR')) return 'STRING';
      return colType;
    }
    if (dialect === 'snowflake') {
      if (colType === 'STRING') return 'VARCHAR(255)';
      if (colType === 'TIMESTAMP') return 'TIMESTAMP_NTZ(9)';
      if (colType.startsWith('DECIMAL')) return colType.replace('DECIMAL', 'NUMBER');
      return colType;
    }
    if (dialect === 'bigquery') {
      if (colType.startsWith('VARCHAR') || colType === 'STRING' || colType.startsWith('CHAR')) return 'STRING';
      if (colType === 'INTEGER' || colType === 'BIGINT') return 'INT64';
      if (colType.startsWith('DECIMAL')) return 'NUMERIC';
      if (colType === 'BOOLEAN') return 'BOOL';
      if (colType.startsWith('ARRAY')) return 'ARRAY<STRING>';
      return colType;
    }
    if (dialect === 'postgres') {
      if (colType === 'STRING') return 'TEXT';
      if (colType === 'BIGINT') return 'BIGINT';
      if (colType === 'TIMESTAMP') return 'TIMESTAMP WITHOUT TIME ZONE';
      if (colType === 'BOOLEAN') return 'BOOLEAN';
      if (colType.startsWith('DECIMAL')) return colType.replace('DECIMAL', 'NUMERIC');
      return colType;
    }
    if (dialect === 'athena') {
      if (colType === 'STRING' || colType.startsWith('VARCHAR')) return 'string';
      if (colType === 'INTEGER') return 'int';
      if (colType === 'BIGINT') return 'bigint';
      if (colType === 'TIMESTAMP') return 'timestamp';
      if (colType === 'DATE') return 'date';
      if (colType === 'BOOLEAN') return 'boolean';
      if (colType.startsWith('DECIMAL')) return colType.toLowerCase();
      return 'string';
    }
    return colType;
  };

  const generatedSql = useMemo(() => {
    if (!activeTable) return '';

    const cols = includeAuditCols
      ? activeTable.columns
      : activeTable.columns.filter((c) => !c.isAudit);

    const schemaPrefix =
      activeTable.layer === 'silver' ? 'lakehouse_silver' : 'lakehouse_gold';

    // 1. Databricks Delta Lake SQL
    if (sqlDialect === 'delta') {
      const colDefs = cols.map((col) => {
        const type = mapSqlType(col.dataType, 'delta');
        const notNull = !col.isNullable ? ' NOT NULL' : '';
        const comment = includeComments && col.description ? ` COMMENT '${col.description.replace(/'/g, "\\'")}'` : '';
        return `    ${col.name.padEnd(28)} ${type.padEnd(16)}${notNull}${comment}`;
      });

      const pkConstraint = activeTable.primaryKey.length > 0
        ? `,\n    CONSTRAINT pk_${activeTable.name} PRIMARY KEY (${activeTable.primaryKey.join(', ')})`
        : '';

      const partClause = activeTable.partitionKeys.length > 0
        ? `\nPARTITIONED BY (${activeTable.partitionKeys.join(', ')})`
        : '';

      const clusterCols = activeTable.partitionKeys.length > 0 ? activeTable.partitionKeys : activeTable.primaryKey;
      const clusterClause = clusterCols.length > 0
        ? `\nCLUSTER BY (${clusterCols.join(', ')})`
        : '';

      const tblProps = includeTableProps
        ? `\nTBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.deletedFileRetentionDuration' = 'interval 30 days',
    'lakehouse.domain' = '${activeTable.domain}',
    'lakehouse.layer' = '${activeTable.layer.toUpperCase()}',
    'lakehouse.governance.sox404' = 'compliant',
    'lakehouse.governance.gdpr_art17' = '${activeTable.domain === 'customer' ? 'pii_tracked' : 'no_pii'}'
);`
        : ';';

      return `-- ==============================================================================
-- Databricks Delta Lake 3.0+ Enterprise SQL DDL
-- Table: ${schemaPrefix}.${activeTable.name}
-- Layer: ${activeTable.layer.toUpperCase()} | Domain: ${activeTable.domain.toUpperCase()}
-- Modeling Pattern: ${activeTable.scdPattern}
-- Description: ${activeTable.description}
-- ==============================================================================

CREATE OR REPLACE TABLE ${schemaPrefix}.${activeTable.name} (
${colDefs.join(',\n')}${pkConstraint}
)
USING DELTA${partClause}${clusterClause}${tblProps}

-- Optimization & Maintenance Commands:
-- OPTIMIZE ${schemaPrefix}.${activeTable.name} ZORDER BY (${clusterCols.join(', ') || activeTable.primaryKey.join(', ')});
-- VACUUM ${schemaPrefix}.${activeTable.name} RETAIN 168 HOURS;`;
    }

    // 2. Snowflake SQL
    if (sqlDialect === 'snowflake') {
      const colDefs = cols.map((col) => {
        const type = mapSqlType(col.dataType, 'snowflake');
        const notNull = !col.isNullable ? ' NOT NULL' : '';
        const comment = includeComments && col.description ? ` COMMENT '${col.description.replace(/'/g, "\\'")}'` : '';
        return `    ${col.name.toUpperCase().padEnd(28)} ${type.padEnd(18)}${notNull}${comment}`;
      });

      const clusterCols = activeTable.partitionKeys.length > 0 ? activeTable.partitionKeys : activeTable.primaryKey;
      const clusterClause = clusterCols.length > 0
        ? `\nCLUSTER BY (${clusterCols.map(c => c.toUpperCase()).join(', ')})`
        : '';

      const pkConstraint = activeTable.primaryKey.length > 0
        ? `,\n    CONSTRAINT PK_${activeTable.name.toUpperCase()} PRIMARY KEY (${activeTable.primaryKey.map(k => k.toUpperCase()).join(', ')})`
        : '';

      return `-- ==============================================================================
-- Snowflake Enterprise SQL DDL
-- Table: ${schemaPrefix.toUpperCase()}.${activeTable.name.toUpperCase()}
-- Layer: ${activeTable.layer.toUpperCase()} | Domain: ${activeTable.domain.toUpperCase()}
-- Description: ${activeTable.description}
-- ==============================================================================

CREATE OR REPLACE TABLE ${schemaPrefix.toUpperCase()}.${activeTable.name.toUpperCase()} (
${colDefs.join(',\n')}${pkConstraint}
)${clusterClause}
COMMENT = '${activeTable.description.replace(/'/g, "\\'")}';

-- Set Data Retention for Time Travel & Zero-Copy Clone
ALTER TABLE ${schemaPrefix.toUpperCase()}.${activeTable.name.toUpperCase()} SET DATA_RETENTION_TIME_IN_DAYS = 90;`;
    }

    // 3. Google BigQuery SQL
    if (sqlDialect === 'bigquery') {
      const colDefs = cols.map((col) => {
        const type = mapSqlType(col.dataType, 'bigquery');
        const notNull = !col.isNullable ? ' NOT NULL' : '';
        const comment = includeComments && col.description ? ` OPTIONS(description="${col.description.replace(/"/g, '\\"')}")` : '';
        return `    ${col.name.padEnd(28)} ${type.padEnd(12)}${notNull}${comment}`;
      });

      const partitionClause = activeTable.partitionKeys.length > 0
        ? `\nPARTITION BY DATE(${activeTable.partitionKeys[0]})`
        : '\nPARTITION BY DATE(_created_ts)';

      const clusterCols = activeTable.partitionKeys.length > 0 ? activeTable.partitionKeys : activeTable.primaryKey;
      const clusterClause = clusterCols.length > 0
        ? `\nCLUSTER BY ${clusterCols.slice(0, 4).join(', ')}`
        : '';

      return `-- ==============================================================================
-- Google BigQuery SQL DDL
-- Table: \`gcp_project_id.${schemaPrefix}.${activeTable.name}\`
-- Layer: ${activeTable.layer.toUpperCase()} | Domain: ${activeTable.domain.toUpperCase()}
-- Description: ${activeTable.description}
-- ==============================================================================

CREATE OR REPLACE TABLE \`gcp_project_id.${schemaPrefix}.${activeTable.name}\` (
${colDefs.join(',\n')}
)${partitionClause}${clusterClause}
OPTIONS(
    description = "${activeTable.description.replace(/"/g, '\\"')}",
    require_partition_filter = false
);`;
    }

    // 4. PostgreSQL / ANSI SQL
    if (sqlDialect === 'postgres') {
      const colDefs = cols.map((col) => {
        const type = mapSqlType(col.dataType, 'postgres');
        const notNull = !col.isNullable ? ' NOT NULL' : '';
        return `    ${col.name.padEnd(28)} ${type.padEnd(18)}${notNull}`;
      });

      const pkConstraint = activeTable.primaryKey.length > 0
        ? `,\n    CONSTRAINT pk_${activeTable.name} PRIMARY KEY (${activeTable.primaryKey.join(', ')})`
        : '';

      const comments = includeComments
        ? '\n\n' + cols
            .filter((c) => c.description)
            .map((c) => `COMMENT ON COLUMN ${schemaPrefix}.${activeTable.name}.${c.name} IS '${c.description.replace(/'/g, "''")}';`)
            .join('\n')
        : '';

      return `-- ==============================================================================
-- PostgreSQL / ANSI SQL DDL
-- Table: ${schemaPrefix}.${activeTable.name}
-- Layer: ${activeTable.layer.toUpperCase()} | Domain: ${activeTable.domain.toUpperCase()}
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS ${schemaPrefix};

CREATE TABLE IF NOT EXISTS ${schemaPrefix}.${activeTable.name} (
${colDefs.join(',\n')}${pkConstraint}
);${comments}`;
    }

    // 5. AWS Athena / Trino SQL
    if (sqlDialect === 'athena') {
      const colDefs = cols.map((col) => {
        const type = mapSqlType(col.dataType, 'athena');
        const comment = includeComments && col.description ? ` COMMENT '${col.description.replace(/'/g, "\\'")}'` : '';
        return `    \`${col.name}\` ${type}${comment}`;
      });

      const partClause = activeTable.partitionKeys.length > 0
        ? `\nPARTITIONED BY (${activeTable.partitionKeys.map(c => `\`${c}\` string`).join(', ')})`
        : '';

      return `-- ==============================================================================
-- AWS Athena / Trino SQL DDL (External Apache Parquet / Iceberg Table)
-- Table: ${schemaPrefix}.${activeTable.name}
-- Layer: ${activeTable.layer.toUpperCase()} | Domain: ${activeTable.domain.toUpperCase()}
-- ==============================================================================

CREATE EXTERNAL TABLE IF NOT EXISTS ${schemaPrefix}.${activeTable.name} (
${colDefs.join(',\n')}
)${partClause}
STORED AS PARQUET
LOCATION 's3://corporate-lakehouse-bucket/${activeTable.layer}/${activeTable.domain}/${activeTable.name}/'
TBLPROPERTIES (
    'parquet.compression' = 'SNAPPY',
    'classification' = 'parquet'
);`;
    }

    // 6. dbt (data build tool) SQL Model
    const isIncremental = activeTable.layer === 'silver';
    return `-- ==============================================================================
-- dbt Core / dbt Cloud SQL Model
-- Path: models/${activeTable.layer}/${activeTable.domain}/${activeTable.name}.sql
-- Layer: ${activeTable.layer.toUpperCase()} | Domain: ${activeTable.domain.toUpperCase()}
-- ==============================================================================

{{
    config(
        materialized = '${isIncremental ? 'incremental' : 'table'}',
        unique_key = [${activeTable.primaryKey.map(k => `'${k}'`).join(', ')}],
        incremental_strategy = 'merge',
        on_schema_change = 'fail',
        tags = ['${activeTable.layer}', '${activeTable.domain}', 'enterprise_lakehouse']
    )
}}

WITH source_data AS (
    SELECT
${cols.map(c => `        ${c.name}`).join(',\n')}
    FROM {{ ref('${activeTable.layer === 'gold' ? 'slv_ent_' + activeTable.domain : 'brz_raw_' + activeTable.domain}') }}
    {% if is_incremental() %}
    WHERE _created_ts > (SELECT MAX(_created_ts) FROM {{ this }})
    {% endif %}
)

SELECT * FROM source_data;`;
  }, [activeTable, sqlDialect, includeAuditCols, includeTableProps, includeComments]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedSql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTable.name}_${sqlDialect}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dialectLabels: Record<SqlDialect, { title: string; subtitle: string }> = {
    delta: { title: 'Databricks Delta Lake SQL', subtitle: 'Delta 3.0+ with CDF & Liquid Clustering' },
    snowflake: { title: 'Snowflake SQL', subtitle: 'Time Travel & Clustering Keys' },
    bigquery: { title: 'Google BigQuery SQL', subtitle: 'Partitioned & Clustered Tables' },
    postgres: { title: 'PostgreSQL / ANSI SQL', subtitle: 'Relational Standard DDL' },
    athena: { title: 'AWS Athena / Trino SQL', subtitle: 'External S3 Parquet Tables' },
    dbt: { title: 'dbt Model SQL', subtitle: 'Incremental Jinja2 SQL Contract' },
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-inner">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-indigo-400 shrink-0 shadow-inner">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Multi-Dialect SQL DDL & Schema Generator
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
                Generate production-ready, standardized SQL DDL statements for Databricks Delta Lake, Snowflake, Google BigQuery, PostgreSQL, AWS Athena, and dbt models. 
                All tables adhere strictly to Medallion naming taxonomy, strict data typing, 14 mandatory audit columns, and optimal engine clustering.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs uppercase font-bold">
              Pure SQL Only
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Selector Sidebar */}
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-inner space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Select Lakehouse Table
            </label>
            <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
              {LAKEHOUSE_TABLES.map((tbl) => {
                const isSelected = tbl.id === activeTable.id;
                return (
                  <button
                    key={tbl.id}
                    onClick={() => setSelectedTableId(tbl.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300 shadow-inner font-semibold'
                        : 'border-transparent text-slate-300 hover:bg-slate-950 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate">{tbl.name}</span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          tbl.layer === 'silver'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {tbl.layer}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate capitalize">
                      {tbl.domain} • {tbl.scdPattern}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DDL Options */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              SQL Generation Options
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAuditCols}
                onChange={(e) => setIncludeAuditCols(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Include 14 Audit Columns</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTableProps}
                onChange={(e) => setIncludeTableProps(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Engine TBLPROPERTIES & CDF</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeComments}
                onChange={(e) => setIncludeComments(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Column Comments & Metadata</span>
            </label>
          </div>
        </div>

        {/* SQL Output View */}
        <div className="lg:col-span-3 space-y-4">
          {/* Dialect Selector Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
            {(Object.keys(dialectLabels) as SqlDialect[]).map((d) => {
              const isCurrent = sqlDialect === d;
              return (
                <button
                  key={d}
                  onClick={() => setSqlDialect(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    isCurrent
                      ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300 shadow-inner'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="text-left">
                    <div>{dialectLabels[d].title}</div>
                    <div className="text-[10px] font-normal text-slate-400">{dialectLabels[d].subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Table Details Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-white">{activeTable.name}</span>
                <span className="text-xs text-slate-400">({activeTable.columns.length} columns)</span>
              </div>
              <div className="text-xs text-slate-400">
                Primary Key: <code className="text-indigo-400">{activeTable.primaryKey.join(', ') || 'None'}</code> | 
                Partitions: <code className="text-amber-400">{activeTable.partitionKeys.join(', ') || 'None'}</code>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 shadow-inner transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SQL'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-inner transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs overflow-x-auto text-emerald-300 leading-relaxed shadow-inner max-h-[580px]">
            <pre>{generatedSql}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
