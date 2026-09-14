#!/usr/bin/env python3
"""
Python Medallion Lakehouse Application Server
Pure Python 3 backend serving the Lakehouse Architecture Standards UI
and providing a live SQL execution engine powered by in-memory SQLite.
"""

import http.server
import socketserver
import json
import os
import sys
import time
import mimetypes
import sqlite3
import hashlib
from typing import Dict, Any, List

# Hardcoded to 3000 per infrastructure network configuration
PORT = 3000
HOST = '0.0.0.0'
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

# Global database connection for SQL simulation
db_conn = sqlite3.connect(':memory:', check_same_thread=False)

def generate_standalone_html() -> str:
    """Generates an all-in-one pure Python HTML/JS interface when no npm/dist build is present."""
    return """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enterprise Medallion Architecture Standards & SQL Modeling Guide (Python Native)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        slate: { 950: '#030712', 900: '#0f172a', 800: '#1e293b' }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #030712; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
        pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    </style>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <!-- Header -->
    <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/30">
                💎
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-base font-bold text-white tracking-tight">Enterprise Medallion Lakehouse Standards</h1>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PYTHON NATIVE</span>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">ZERO NPM</span>
                </div>
                <p class="text-xs text-slate-400">Pure Python Backend (sqlite3 in-memory) • 100% SQL Data Engineering Standards</p>
            </div>
        </div>
        <div class="flex items-center gap-3 text-xs">
            <button onclick="resetDatabase()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition">
                ↻ Reset Lakehouse DB
            </button>
            <div class="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-mono">
                Port 3000 • Online
            </div>
        </div>
    </header>

    <!-- Navigation Bar -->
    <nav class="border-b border-slate-800 bg-slate-900/50 px-6 flex gap-2 overflow-x-auto text-xs font-semibold">
        <button onclick="switchTab('sql')" id="tab-sql" class="tab-btn px-4 py-3 border-b-2 border-indigo-500 text-indigo-400 flex items-center gap-2">
            ⚡ Interactive SQL Runner
        </button>
        <button onclick="switchTab('schema')" id="tab-schema" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
            🏛️ Medallion Tables (Bronze, Silver, Gold)
        </button>
        <button onclick="switchTab('ddl')" id="tab-ddl" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
            📜 Multi-Dialect SQL DDL
        </button>
        <button onclick="switchTab('scd2')" id="tab-scd2" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
            ⏳ Bi-Temporal SCD2 & Hashes
        </button>
        <button onclick="switchTab('arch')" id="tab-arch" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2">
            📐 Architectural Tenets
        </button>
    </nav>

    <!-- Main Content Container -->
    <main class="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        <!-- TAB 1: INTERACTIVE SQL RUNNER -->
        <section id="view-sql" class="tab-view space-y-6">
            <div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 class="text-base font-bold text-white flex items-center gap-2">
                            <span>Interactive SQL Lakehouse Runner</span>
                        </h2>
                        <p class="text-xs text-slate-400 mt-0.5">
                            Executes directly in the Python in-memory SQLite database pre-seeded with Bronze, Silver, and Gold tables.
                        </p>
                    </div>
                    <button onclick="runQuery()" id="run-btn" class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition">
                        ▶ Run SQL (Ctrl+Enter)
                    </button>
                </div>

                <!-- Template Selector -->
                <div class="mb-3 flex flex-wrap gap-2 items-center text-xs">
                    <span class="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">Presets:</span>
                    <button onclick="loadTemplate('silver_current')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700">
                        Silver Current Accounts (SCD2)
                    </button>
                    <button onclick="loadTemplate('gold_star')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700">
                        Gold Kimball Sales & Margins
                    </button>
                    <button onclick="loadTemplate('hash_diff')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700">
                        Deterministic SHA-256 Diff
                    </button>
                    <button onclick="loadTemplate('bronze_raw')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700">
                        Bronze Raw Audit Ingest
                    </button>
                    <button onclick="loadTemplate('scd2_history')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700">
                        Account Revision History
                    </button>
                </div>

                <!-- Query Text Area -->
                <div class="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                    <textarea id="sql-editor" rows="6" class="w-full bg-transparent p-4 font-mono text-xs text-emerald-300 focus:outline-none resize-y selection:bg-indigo-500/30" placeholder="Enter standard SQL statement..."></textarea>
                </div>

                <!-- Status Banner -->
                <div id="query-status" class="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span id="status-text">Ready. Enter SQL and press Run.</span>
                    <span id="exec-time" class="text-slate-500"></span>
                </div>
            </div>

            <!-- Query Results Table -->
            <div class="rounded-xl border border-slate-800 bg-slate-900 p-6 overflow-hidden">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <span>Query Results</span>
                        <span id="row-count-badge" class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">0 rows</span>
                    </h3>
                </div>
                <div id="results-container" class="overflow-x-auto max-h-96 rounded-lg border border-slate-800 bg-slate-950">
                    <div class="p-8 text-center text-xs text-slate-500">
                        No query executed yet. Click "Run SQL" to view results.
                    </div>
                </div>
            </div>
        </section>

        <!-- TAB 2: MEDALLION TABLES & SCHEMA -->
        <section id="view-schema" class="tab-view hidden space-y-6">
            <div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h2 class="text-base font-bold text-white mb-2">Medallion Table Dictionary & Live Counts</h2>
                <p class="text-xs text-slate-400 mb-6">Real-time status of all in-memory tables managed by the Python Lakehouse Engine.</p>
                
                <div id="tables-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="p-4 rounded-xl border border-slate-800 bg-slate-950 animate-pulse">
                        <div class="h-4 bg-slate-800 rounded w-2/3 mb-2"></div>
                        <div class="h-3 bg-slate-800 rounded w-1/3"></div>
                    </div>
                </div>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h3 class="text-sm font-bold text-white mb-3">14 Mandatory Enterprise Audit Columns</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                            <tr class="border-b border-slate-800 text-slate-400 text-[11px]">
                                <th class="py-2.5 px-3">Column Name</th>
                                <th class="py-2.5 px-3">Data Type</th>
                                <th class="py-2.5 px-3">Category</th>
                                <th class="py-2.5 px-3">Purpose & Rule</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60 text-slate-300">
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_src_sys_cd</td><td class="py-2 px-3 text-slate-400">VARCHAR(32)</td><td class="py-2 px-3 text-amber-400">Source Lineage</td><td class="py-2 px-3 text-slate-400">Originating system (e.g. SFDC, STRIPE, KAFKA).</td></tr>
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_ingest_ts</td><td class="py-2 px-3 text-slate-400">TIMESTAMP</td><td class="py-2 px-3 text-amber-400">Lineage</td><td class="py-2 px-3 text-slate-400">Bronze ingestion timestamp UTC.</td></tr>
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_etl_job_id</td><td class="py-2 px-3 text-slate-400">VARCHAR(64)</td><td class="py-2 px-3 text-indigo-400">Execution</td><td class="py-2 px-3 text-slate-400">Pipeline execution UUID / run ID.</td></tr>
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_valid_from_ts</td><td class="py-2 px-3 text-slate-400">TIMESTAMP</td><td class="py-2 px-3 text-emerald-400">SCD Type 2</td><td class="py-2 px-3 text-slate-400">Start of business reality interval.</td></tr>
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_valid_to_ts</td><td class="py-2 px-3 text-slate-400">TIMESTAMP</td><td class="py-2 px-3 text-emerald-400">SCD Type 2</td><td class="py-2 px-3 text-slate-400">End of business validity ('9999-12-31' for active).</td></tr>
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_is_current_flg</td><td class="py-2 px-3 text-slate-400">BOOLEAN</td><td class="py-2 px-3 text-emerald-400">SCD Type 2</td><td class="py-2 px-3 text-slate-400">True (1) if record is the active current version.</td></tr>
                            <tr><td class="py-2 px-3 text-indigo-400 font-bold">_record_hash</td><td class="py-2 px-3 text-slate-400">CHAR(64)</td><td class="py-2 px-3 text-pink-400">CDC / Diff</td><td class="py-2 px-3 text-slate-400">SHA-256 payload hash across non-audit business fields.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- TAB 3: MULTI-DIALECT SQL DDL -->
        <section id="view-ddl" class="tab-view hidden space-y-6">
            <div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 class="text-base font-bold text-white">Multi-Dialect SQL DDL Generator</h2>
                        <p class="text-xs text-slate-400">Pure SQL schema definitions for Delta Lake, Snowflake, BigQuery, and ANSI SQL.</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="showDdl('delta')" id="btn-ddl-delta" class="ddl-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">Databricks Delta</button>
                        <button onclick="showDdl('snowflake')" id="btn-ddl-snowflake" class="ddl-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400">Snowflake</button>
                        <button onclick="showDdl('bigquery')" id="btn-ddl-bigquery" class="ddl-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400">BigQuery</button>
                    </div>
                </div>

                <div class="rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800 shadow-inner max-h-[500px]">
                    <pre id="ddl-output"></pre>
                </div>
            </div>
        </section>

        <!-- TAB 4: SCD2 & HASH DIFF -->
        <section id="view-scd2" class="tab-view hidden space-y-6">
            <div class="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h2 class="text-base font-bold text-white mb-2">Bi-Temporal SCD Type 2 & SHA-256 Hash Diff</h2>
                <p class="text-xs text-slate-300 leading-relaxed mb-6">
                    Customer subscriptions, account tiers, and pricing terms evolve continuously. Silver dimension entities MUST preserve both transaction posting time and real-world validity intervals.
                </p>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="rounded-xl bg-slate-950 p-4 border border-slate-800">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Databricks / Spark SQL Hash Function</h3>
                        <pre class="font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">SELECT 
    account_id AS customer_account_id,
    plan_tier AS tier_plan_cd,
    status AS account_status_cd,
    mrr_amount AS mrr_amt,
    SHA2(
        CONCAT_WS('||',
            COALESCE(UPPER(TRIM(plan_tier)), ''),
            COALESCE(UPPER(TRIM(status)), ''),
            COALESCE(CAST(mrr_amount AS STRING), '0.00'),
            COALESCE(UPPER(TRIM(country_code)), '')
        ),
        256
    ) AS _record_hash
FROM lakehouse_bronze.brz_raw_customer_events;</pre>
                    </div>

                    <div class="rounded-xl bg-slate-950 p-4 border border-slate-800">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Snowflake SQL Hash Function</h3>
                        <pre class="font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">SELECT 
    account_id AS customer_account_id,
    plan_tier AS tier_plan_cd,
    status AS account_status_cd,
    mrr_amount AS mrr_amt,
    SHA2(
        CONCAT_WS('||',
            NVL(UPPER(TRIM(plan_tier)), ''),
            NVL(UPPER(TRIM(status)), ''),
            NVL(mrr_amount::VARCHAR, '0.00'),
            NVL(UPPER(TRIM(country_code)), '')
        ),
        256
    ) AS _record_hash
FROM LAKEHOUSE_BRONZE.BRZ_RAW_CUSTOMER_EVENTS;</pre>
                    </div>
                </div>
            </div>
        </section>

        <!-- TAB 5: ARCHITECTURAL TENETS -->
        <section id="view-arch" class="tab-view hidden space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <span class="font-bold text-indigo-400 text-sm block mb-1">1. Bi-Temporal SCD2</span>
                    <p class="text-slate-400 leading-relaxed">Preserve transaction posting time and real-world validity intervals (_valid_from_ts, _valid_to_ts).</p>
                </div>
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <span class="font-bold text-indigo-400 text-sm block mb-1">2. Absolute Currency Precision</span>
                    <p class="text-slate-400 leading-relaxed">Floats are strictly prohibited. All financial columns use DECIMAL(18,2) or DECIMAL(24,4).</p>
                </div>
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <span class="font-bold text-indigo-400 text-sm block mb-1">3. Immutable Audit Lineage</span>
                    <p class="text-slate-400 leading-relaxed">Embed source code, pipeline UUID, ingestion timestamp, and SHA-256 hash in every row.</p>
                </div>
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <span class="font-bold text-indigo-400 text-sm block mb-1">4. Conformed Kimball Star</span>
                    <p class="text-slate-400 leading-relaxed">Gold tables adhere strictly to dimensional star modeling with integer surrogate keys (_sk).</p>
                </div>
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <span class="font-bold text-indigo-400 text-sm block mb-1">5. Idempotent Ingestion & CDC</span>
                    <p class="text-slate-400 leading-relaxed">Replays must never create duplicate records or double-counted financial metrics.</p>
                </div>
                <div class="p-5 rounded-xl bg-slate-900 border border-slate-800">
                    <span class="font-bold text-indigo-400 text-sm block mb-1">6. Semantic Suffix Taxonomy</span>
                    <p class="text-slate-400 leading-relaxed">Mandatory column suffixes (_sk, _id, _amt, _cnt, _cd, _flg, _ts) for automated catalog discovery.</p>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-800 bg-slate-900/60 px-6 py-4 text-center text-xs text-slate-500">
        Python Medallion Lakehouse Server • Running locally without npm or Node.js • Standard Library Powered
    </footer>

    <!-- Application Script -->
    <script>
        const PRESETS = {
            silver_current: "SELECT customer_account_id, company_name, tier_plan_cd, mrr_amt, country_iso_cd, _valid_from_ts, _is_current_flg\\nFROM slv_ent_customer_account\\nWHERE _is_current_flg = 1;",
            gold_star: "SELECT \\n    f.order_id,\\n    c.company_name,\\n    c.tier_plan_cd,\\n    p.product_name,\\n    f.order_quantity_cnt,\\n    f.net_sales_amt,\\n    f.gross_margin_amt\\nFROM gld_fct_order_sales f\\nJOIN gld_dim_customer c ON f.customer_sk = c.customer_sk\\nJOIN gld_dim_product p ON f.product_sk = p.product_sk;",
            hash_diff: "SELECT \\n    order_id,\\n    customer_account_id,\\n    total_gross_amt,\\n    SHA2(CONCAT_WS('||', customer_account_id, order_status_cd, total_gross_amt), 256) AS _computed_hash\\nFROM slv_ent_order_header;",
            bronze_raw: "SELECT payload_id, event_type_cd, account_id, plan_tier, mrr_amount, _raw_payload_json\\nFROM brz_raw_customer_events;",
            scd2_history: "SELECT customer_account_id, _version_seq_id, tier_plan_cd, mrr_amt, _valid_from_ts, _valid_to_ts, _is_current_flg\\nFROM slv_ent_customer_account\\nORDER BY customer_account_id, _version_seq_id;"
        };

        const DDL_TEMPLATES = {
            delta: `-- Databricks Delta Lake 3.0+ Enterprise SQL DDL
CREATE OR REPLACE TABLE lakehouse_silver.slv_ent_customer_account (
    customer_account_version_id VARCHAR(64) NOT NULL,
    customer_account_id         VARCHAR(64) NOT NULL,
    company_name                VARCHAR(255),
    primary_email               VARCHAR(255) NOT NULL,
    tier_plan_cd                VARCHAR(32) NOT NULL,
    account_status_cd           VARCHAR(32) NOT NULL,
    seat_licensed_cnt           INTEGER NOT NULL,
    mrr_amt                     DECIMAL(18, 2) NOT NULL,
    country_iso_cd              VARCHAR(8) NOT NULL,
    is_enterprise_sla_flg       BOOLEAN NOT NULL,
    _src_sys_cd                 VARCHAR(32) NOT NULL,
    _ingest_ts                  TIMESTAMP NOT NULL,
    _valid_from_ts              TIMESTAMP NOT NULL,
    _valid_to_ts                TIMESTAMP NOT NULL,
    _is_current_flg             BOOLEAN NOT NULL,
    _record_hash                CHAR(64) NOT NULL,
    CONSTRAINT pk_customer PRIMARY KEY (customer_account_version_id)
)
USING DELTA
PARTITIONED BY (tier_plan_cd)
TBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true'
);`,
            snowflake: `-- Snowflake Enterprise SQL DDL
CREATE OR REPLACE TABLE LAKEHOUSE_SILVER.SLV_ENT_CUSTOMER_ACCOUNT (
    CUSTOMER_ACCOUNT_VERSION_ID VARCHAR(64) NOT NULL,
    CUSTOMER_ACCOUNT_ID         VARCHAR(64) NOT NULL,
    COMPANY_NAME                VARCHAR(255),
    PRIMARY_EMAIL               VARCHAR(255) NOT NULL,
    TIER_PLAN_CD                VARCHAR(32) NOT NULL,
    ACCOUNT_STATUS_CD           VARCHAR(32) NOT NULL,
    SEAT_LICENSED_CNT           INTEGER NOT NULL,
    MRR_AMT                     NUMBER(18, 2) NOT NULL,
    COUNTRY_ISO_CD              VARCHAR(8) NOT NULL,
    IS_ENTERPRISE_SLA_FLG       BOOLEAN NOT NULL,
    _SRC_SYS_CD                 VARCHAR(32) NOT NULL,
    _VALID_FROM_TS              TIMESTAMP_NTZ NOT NULL,
    _VALID_TO_TS                TIMESTAMP_NTZ NOT NULL,
    _IS_CURRENT_FLG             BOOLEAN NOT NULL,
    _RECORD_HASH                CHAR(64) NOT NULL,
    CONSTRAINT PK_CUSTOMER PRIMARY KEY (CUSTOMER_ACCOUNT_VERSION_ID)
)
CLUSTER BY (TIER_PLAN_CD, CUSTOMER_ACCOUNT_ID);
ALTER TABLE LAKEHOUSE_SILVER.SLV_ENT_CUSTOMER_ACCOUNT SET DATA_RETENTION_TIME_IN_DAYS = 90;`,
            bigquery: `-- Google BigQuery SQL DDL
CREATE OR REPLACE TABLE \`gcp_project.lakehouse_silver.slv_ent_customer_account\` (
    customer_account_version_id STRING NOT NULL,
    customer_account_id         STRING NOT NULL,
    company_name                STRING,
    primary_email               STRING NOT NULL,
    tier_plan_cd                STRING NOT NULL,
    account_status_cd           STRING NOT NULL,
    seat_licensed_cnt           INT64 NOT NULL,
    mrr_amt                     NUMERIC NOT NULL,
    country_iso_cd              STRING NOT NULL,
    is_enterprise_sla_flg       BOOL NOT NULL,
    _src_sys_cd                 STRING NOT NULL,
    _valid_from_ts              TIMESTAMP NOT NULL,
    _valid_to_ts                TIMESTAMP NOT NULL,
    _is_current_flg             BOOL NOT NULL,
    _record_hash                STRING NOT NULL
)
PARTITION BY DATE(_valid_from_ts)
CLUSTER BY tier_plan_cd, customer_account_id;`
        };

        function switchTab(tab) {
            document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('border-indigo-500', 'text-indigo-400');
                el.classList.add('border-transparent', 'text-slate-400');
            });
            document.getElementById('view-' + tab).classList.remove('hidden');
            const btn = document.getElementById('tab-' + tab);
            btn.classList.add('border-indigo-500', 'text-indigo-400');
            btn.classList.remove('border-transparent', 'text-slate-400');

            if (tab === 'schema') loadTables();
            if (tab === 'ddl') showDdl('delta');
        }

        function loadTemplate(key) {
            document.getElementById('sql-editor').value = PRESETS[key] || '';
            runQuery();
        }

        async function runQuery() {
            const sql = document.getElementById('sql-editor').value.trim();
            if (!sql) return;

            const runBtn = document.getElementById('run-btn');
            const statusText = document.getElementById('status-text');
            const execTime = document.getElementById('exec-time');
            const resultsContainer = document.getElementById('results-container');
            const countBadge = document.getElementById('row-count-badge');

            runBtn.disabled = true;
            statusText.innerText = "Executing in Python SQLite engine...";
            statusText.className = "text-slate-400";

            try {
                const res = await fetch('/api/execute-sql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sql })
                });
                const data = await res.json();
                runBtn.disabled = false;

                if (!data.success) {
                    statusText.innerText = "SQL Error: " + data.error;
                    statusText.className = "text-red-400 font-bold";
                    execTime.innerText = data.executionTimeMs + "ms";
                    resultsContainer.innerHTML = '<div class="p-6 text-xs text-red-400 font-mono bg-red-950/20 border border-red-900/40 rounded m-3">✕ ' + data.error + '</div>';
                    countBadge.innerText = '0 rows';
                    return;
                }

                statusText.innerText = "Query completed successfully.";
                statusText.className = "text-emerald-400 font-semibold";
                execTime.innerText = data.executionTimeMs + "ms (Python in-memory SQLite)";
                countBadge.innerText = data.rowCount + " rows";

                if (data.rows.length === 0) {
                    resultsContainer.innerHTML = '<div class="p-8 text-center text-xs text-slate-500">Query executed successfully. 0 rows returned. (Affected: ' + data.affectedRows + ')</div>';
                    return;
                }

                let html = '<table class="w-full text-left text-xs border-collapse font-mono">';
                html += '<thead><tr class="border-b border-slate-800 bg-slate-900 text-slate-400 text-[11px] sticky top-0">';
                data.columns.forEach(col => {
                    html += '<th class="py-2.5 px-3 whitespace-nowrap">' + col + '</th>';
                });
                html += '</tr></thead><tbody class="divide-y divide-slate-800/50 text-slate-300">';

                data.rows.forEach(row => {
                    html += '<tr class="hover:bg-slate-900/60">';
                    row.forEach(cell => {
                        const val = cell === null ? '<span class="text-slate-600">NULL</span>' : cell;
                        html += '<td class="py-2 px-3 whitespace-nowrap">' + val + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
                resultsContainer.innerHTML = html;
            } catch (err) {
                runBtn.disabled = false;
                statusText.innerText = "Network / execution error: " + err.message;
                statusText.className = "text-red-400 font-bold";
            }
        }

        async function loadTables() {
            const grid = document.getElementById('tables-grid');
            try {
                const res = await fetch('/api/tables');
                const data = await res.json();
                let html = '';
                data.tables.forEach(tbl => {
                    const badgeClass = tbl.layer === 'bronze' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                        : (tbl.layer === 'silver' ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30');
                    html += '<div class="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col justify-between">';
                    html += '  <div>';
                    html += '    <div class="flex items-center justify-between mb-2">';
                    html += '      <span class="font-mono text-xs font-bold text-white">' + tbl.name + '</span>';
                    html += '      <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold border ' + badgeClass + '">' + tbl.layer + '</span>';
                    html += '    </div>';
                    html += '    <p class="text-xs text-slate-400">Current record count: <strong class="text-emerald-400 font-mono">' + tbl.rowCount + '</strong> rows</p>';
                    html += '  </div>';
                    html += '  <button onclick="inspectTable(\\'' + tbl.name + '\\')" class="mt-3 text-left text-[11px] text-indigo-400 hover:text-indigo-300 font-mono">Query table →</button>';
                    html += '</div>';
                });
                grid.innerHTML = html;
            } catch (err) {
                grid.innerHTML = '<div class="p-4 text-xs text-red-400">Failed to load tables: ' + err.message + '</div>';
            }
        }

        function inspectTable(tableName) {
            switchTab('sql');
            document.getElementById('sql-editor').value = 'SELECT * FROM ' + tableName + ' LIMIT 50;';
            runQuery();
        }

        function showDdl(dialect) {
            document.querySelectorAll('.ddl-tab-btn').forEach(btn => {
                btn.className = 'ddl-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400';
            });
            document.getElementById('btn-ddl-' + dialect).className = 'ddl-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white';
            document.getElementById('ddl-output').innerText = DDL_TEMPLATES[dialect] || '';
        }

        async function resetDatabase() {
            if (!confirm("Reset in-memory Lakehouse database to original benchmark fixtures?")) return;
            try {
                const res = await fetch('/api/reset-db', { method: 'POST' });
                const data = await res.json();
                alert(data.message || "Database reset successfully!");
                loadTemplate('silver_current');
            } catch (err) {
                alert("Error resetting database: " + err.message);
            }
        }

        // Initialize with default query on load
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('sql-editor').value = PRESETS.silver_current;
            runQuery();

            // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to run SQL
            document.getElementById('sql-editor').addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    runQuery();
                }
            });
        });
    </script>
</body>
</html>
"""

def register_custom_sql_functions(conn: sqlite3.Connection):
    """Registers lakehouse SQL functions in SQLite."""
    def sha256_func(val):
        if val is None:
            return None
        return hashlib.sha256(str(val).encode('utf-8')).hexdigest()
    
    def sha2_func(val, bits=256):
        return sha256_func(val)

    def concat_ws(separator, *args):
        parts = [str(a) for a in args if a is not None]
        return separator.join(parts)

    conn.create_function("SHA256", 1, sha256_func)
    conn.create_function("SHA2", 2, sha2_func)
    conn.create_function("CONCAT_WS", -1, concat_ws)

register_custom_sql_functions(db_conn)

def init_lakehouse_database():
    """Seeds the in-memory SQLite database with standard Medallion tables and data."""
    cursor = db_conn.cursor()

    # Drop existing if re-initializing
    cursor.executescript("""
    DROP TABLE IF EXISTS brz_raw_customer_events;
    DROP TABLE IF EXISTS slv_ent_customer_account;
    DROP TABLE IF EXISTS slv_ent_order_header;
    DROP TABLE IF EXISTS slv_ent_order_line_item;
    DROP TABLE IF EXISTS gld_dim_customer;
    DROP TABLE IF EXISTS gld_dim_product;
    DROP TABLE IF EXISTS gld_fct_order_sales;
    """)

    # 1. Bronze: Raw landing immutable table
    cursor.execute("""
    CREATE TABLE brz_raw_customer_events (
        event_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        company_name TEXT,
        primary_email TEXT,
        plan_tier TEXT,
        status TEXT,
        licensed_seats INTEGER,
        mrr_amount REAL,
        _src_sys_cd TEXT,
        _src_file_name TEXT,
        _ingest_ts TEXT,
        _lakehouse_layer TEXT
    );
    """)

    cursor.executemany("""
    INSERT INTO brz_raw_customer_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'BRONZE');
    """, [
        ('EVT-001', 'ACC-101', 'Acme Corp', 'billing@acme.com', 'STARTER', 'ACTIVE', 10, 499.00, 'KAFKA_CRM', 'crm_stream_part0.json'),
        ('EVT-002', 'ACC-102', 'BioHealth Corp', 'ops@biohealth.org', 'GROWTH', 'ACTIVE', 45, 1850.00, 'KAFKA_CRM', 'crm_stream_part0.json'),
        ('EVT-003', 'ACC-103', 'Omni Logistics', 'admin@omnilog.io', 'ENTERPRISE', 'ACTIVE', 120, 5200.00, 'KAFKA_CRM', 'crm_stream_part1.json'),
        ('EVT-004', 'ACC-104', 'FinEdge Global', 'security@finedge.com', 'ENTERPRISE', 'TRIAL', 80, 4200.00, 'KAFKA_CRM', 'crm_stream_part1.json'),
        ('EVT-005', 'ACC-101', 'Acme Corp', 'billing@acme.com', 'ENTERPRISE', 'ACTIVE', 100, 4200.00, 'KAFKA_CRM', 'crm_stream_part2.json'),
    ])

    # 2. Silver: Conformed 3NF Customer Account with Bi-Temporal SCD2
    cursor.execute("""
    CREATE TABLE slv_ent_customer_account (
        customer_account_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        primary_email TEXT NOT NULL,
        tier_plan_cd TEXT NOT NULL,
        account_status_cd TEXT NOT NULL,
        seat_licensed_cnt INTEGER,
        mrr_amt REAL,
        _valid_from_ts TEXT NOT NULL,
        _valid_to_ts TEXT NOT NULL,
        _is_current_flg INTEGER NOT NULL,
        _record_hash TEXT NOT NULL,
        _created_ts TEXT,
        PRIMARY KEY (customer_account_id, _valid_from_ts)
    );
    """)

    cursor.executemany("""
    INSERT INTO slv_ent_customer_account VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
    """, [
        ('ACC-101', 'Acme Corp', 'billing@acme.com', 'STARTER', 'ACTIVE', 10, 499.00, '2025-01-01 00:00:00', '2026-06-01 00:00:00', 0, 'a1b2c3d4e5f6001'),
        ('ACC-101', 'Acme Corp', 'billing@acme.com', 'ENTERPRISE', 'ACTIVE', 100, 4200.00, '2026-06-01 00:00:00', '9999-12-31 23:59:59', 1, 'a1b2c3d4e5f6002'),
        ('ACC-102', 'BioHealth Corp', 'ops@biohealth.org', 'GROWTH', 'ACTIVE', 45, 1850.00, '2025-03-15 00:00:00', '9999-12-31 23:59:59', 1, 'b2c3d4e5f6a1001'),
        ('ACC-103', 'Omni Logistics', 'admin@omnilog.io', 'ENTERPRISE', 'ACTIVE', 120, 5200.00, '2025-05-10 00:00:00', '9999-12-31 23:59:59', 1, 'c3d4e5f6a1b2001'),
        ('ACC-104', 'FinEdge Global', 'security@finedge.com', 'ENTERPRISE', 'TRIAL', 80, 4200.00, '2026-01-01 00:00:00', '9999-12-31 23:59:59', 1, 'd4e5f6a1b2c3001'),
    ])

    # 3. Silver: Order Headers & Order Line Items
    cursor.execute("""
    CREATE TABLE slv_ent_order_header (
        order_number_id TEXT PRIMARY KEY,
        customer_account_id TEXT NOT NULL,
        order_placed_ts TEXT NOT NULL,
        order_status_cd TEXT NOT NULL,
        currency_iso_cd TEXT NOT NULL,
        total_gross_amt REAL,
        _created_ts TEXT
    );
    """)

    cursor.executemany("""
    INSERT INTO slv_ent_order_header VALUES (?, ?, ?, ?, 'USD', ?, datetime('now'));
    """, [
        ('ORD-1001', 'ACC-101', '2026-06-15 14:30:00', 'COMPLETED', 4200.00),
        ('ORD-1002', 'ACC-102', '2026-07-01 09:15:00', 'COMPLETED', 1850.00),
        ('ORD-1003', 'ACC-103', '2026-07-10 16:45:00', 'COMPLETED', 10400.00),
        ('ORD-1004', 'ACC-101', '2026-08-01 11:20:00', 'COMPLETED', 4200.00),
        ('ORD-1005', 'ACC-104', '2026-08-15 10:00:00', 'PENDING', 4200.00),
    ])

    cursor.execute("""
    CREATE TABLE slv_ent_order_line_item (
        order_line_id TEXT PRIMARY KEY,
        order_number_id TEXT NOT NULL,
        product_sku_id TEXT NOT NULL,
        ordered_qty INTEGER NOT NULL,
        unit_price_amt REAL NOT NULL,
        line_discount_amt REAL NOT NULL,
        line_gross_amt REAL NOT NULL
    );
    """)

    cursor.executemany("""
    INSERT INTO slv_ent_order_line_item VALUES (?, ?, ?, ?, ?, ?, ?);
    """, [
        ('LIN-001', 'ORD-1001', 'SKU-ENT-01', 1, 4200.00, 0.00, 4200.00),
        ('LIN-002', 'ORD-1002', 'SKU-GRW-01', 1, 1850.00, 0.00, 1850.00),
        ('LIN-003', 'ORD-1003', 'SKU-ENT-01', 2, 4200.00, 0.00, 8400.00),
        ('LIN-004', 'ORD-1003', 'SKU-SPT-01', 1, 2000.00, 0.00, 2000.00),
        ('LIN-005', 'ORD-1004', 'SKU-ENT-01', 1, 4200.00, 0.00, 4200.00),
    ])

    # 4. Gold: Conformed Dimensions & Star Schema Fact
    cursor.execute("""
    CREATE TABLE gld_dim_customer (
        customer_sk INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_account_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        tier_plan_cd TEXT NOT NULL,
        account_status_cd TEXT NOT NULL,
        mrr_amt REAL NOT NULL,
        _valid_from_ts TEXT NOT NULL,
        _valid_to_ts TEXT NOT NULL,
        _is_current_flg INTEGER NOT NULL
    );
    """)

    cursor.executemany("""
    INSERT INTO gld_dim_customer (customer_account_id, company_name, tier_plan_cd, account_status_cd, mrr_amt, _valid_from_ts, _valid_to_ts, _is_current_flg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ('ACC-101', 'Acme Corp', 'STARTER', 'ACTIVE', 499.00, '2025-01-01 00:00:00', '2026-06-01 00:00:00', 0),
        ('ACC-101', 'Acme Corp', 'ENTERPRISE', 'ACTIVE', 4200.00, '2026-06-01 00:00:00', '9999-12-31 23:59:59', 1),
        ('ACC-102', 'BioHealth Corp', 'GROWTH', 'ACTIVE', 1850.00, '2025-03-15 00:00:00', '9999-12-31 23:59:59', 1),
        ('ACC-103', 'Omni Logistics', 'ENTERPRISE', 'ACTIVE', 5200.00, '2025-05-10 00:00:00', '9999-12-31 23:59:59', 1),
        ('ACC-104', 'FinEdge Global', 'ENTERPRISE', 'TRIAL', 4200.00, '2026-01-01 00:00:00', '9999-12-31 23:59:59', 1),
    ])

    cursor.execute("""
    CREATE TABLE gld_dim_product (
        product_sk INTEGER PRIMARY KEY AUTOINCREMENT,
        product_sku_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_family_cd TEXT NOT NULL,
        unit_list_price_amt REAL NOT NULL,
        standard_cost_amt REAL NOT NULL,
        _is_current_flg INTEGER NOT NULL
    );
    """)

    cursor.executemany("""
    INSERT INTO gld_dim_product (product_sku_id, product_name, product_family_cd, unit_list_price_amt, standard_cost_amt, _is_current_flg)
    VALUES (?, ?, ?, ?, ?, 1);
    """, [
        ('SKU-ENT-01', 'Enterprise Cloud License', 'PLATFORM', 4200.00, 850.00),
        ('SKU-GRW-01', 'Growth Tier License', 'PLATFORM', 1850.00, 380.00),
        ('SKU-STR-01', 'Starter Tier License', 'PLATFORM', 499.00, 110.00),
        ('SKU-SPT-01', 'Dedicated SLA Support', 'ADDON', 2000.00, 450.00),
    ])

    cursor.execute("""
    CREATE TABLE gld_fct_order_sales (
        order_sales_sk INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number_id TEXT NOT NULL,
        customer_sk INTEGER NOT NULL,
        product_sk INTEGER NOT NULL,
        date_sk INTEGER NOT NULL,
        ordered_qty INTEGER NOT NULL,
        gross_sales_amt REAL NOT NULL,
        discount_amt REAL NOT NULL,
        net_sales_amt REAL NOT NULL,
        cogs_cost_amt REAL NOT NULL,
        gross_profit_amt REAL NOT NULL,
        _created_ts TEXT
    );
    """)

    cursor.executemany("""
    INSERT INTO gld_fct_order_sales (order_number_id, customer_sk, product_sk, date_sk, ordered_qty, gross_sales_amt, discount_amt, net_sales_amt, cogs_cost_amt, gross_profit_amt, _created_ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
    """, [
        ('ORD-1001', 2, 1, 20260615, 1, 4200.00, 0.00, 4200.00, 850.00, 3350.00),
        ('ORD-1002', 3, 2, 20260701, 1, 1850.00, 0.00, 1850.00, 380.00, 1470.00),
        ('ORD-1003', 4, 1, 20260710, 2, 8400.00, 0.00, 8400.00, 1700.00, 6700.00),
        ('ORD-1003', 4, 4, 20260710, 1, 2000.00, 0.00, 2000.00, 450.00, 1550.00),
        ('ORD-1004', 2, 1, 20260801, 1, 4200.00, 0.00, 4200.00, 850.00, 3350.00),
    ])

    db_conn.commit()
    print("✓ Lakehouse SQLite Medallion tables successfully initialized.")

# Initialize database on startup
init_lakehouse_database()

class LakehouseHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler serving the React client build and Python SQL endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]

        # API: Health check
        if path == '/api/health':
            self.send_json_response(200, {
                "status": "ok",
                "app": "python-medallion-lakehouse",
                "runtime": f"Python {sys.version.split()[0]}",
                "engine": "Python sqlite3 in-memory SQL Engine",
                "medallion_layers": ["bronze", "silver", "gold"]
            })
            return

        # API: List all lakehouse tables with row counts
        if path == '/api/tables':
            try:
                cursor = db_conn.cursor()
                cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name;
                """)
                tables = [r[0] for r in cursor.fetchall()]
                
                table_stats = []
                for tbl in tables:
                    cursor.execute(f"SELECT count(*) FROM {tbl}")
                    cnt = cursor.fetchone()[0]
                    layer = 'bronze' if tbl.startswith('brz_') else ('silver' if tbl.startswith('slv_') else 'gold')
                    table_stats.append({
                        "name": tbl,
                        "layer": layer,
                        "rowCount": cnt
                    })

                self.send_json_response(200, {"tables": table_stats})
            except Exception as e:
                self.send_json_response(500, {"error": str(e)})
            return

        # SPA Static File Serving
        # If requested file exists in dist, serve it; otherwise serve dist/index.html
        local_path = os.path.join(DIST_DIR, path.lstrip('/'))
        if os.path.exists(local_path) and not os.path.isdir(local_path):
            return super().do_GET()

        # Fallback to index.html for SPA routes, or serve embedded Python-native UI
        index_file = os.path.join(DIST_DIR, 'index.html')
        if os.path.exists(index_file) and not 'mode=python_native' in self.path:
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            with open(index_file, 'rb') as f:
                self.wfile.write(f.read())
        else:
            # Standalone zero-npm Python interface
            html_content = generate_standalone_html()
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html_content.encode('utf-8'))

    def do_POST(self):
        path = self.path.split('?')[0]

        # Read JSON body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON in request payload"})
            return

        # API: Execute SQL in Python SQLite engine
        if path == '/api/execute-sql':
            sql = data.get('sql', '').strip()
            if not sql:
                self.send_json_response(400, {"error": "No SQL query provided"})
                return

            start_time = time.perf_counter()
            cursor = db_conn.cursor()

            try:
                # Execute query (can be multi-statement)
                statements = [s.strip() for s in sql.split(';') if s.strip()]
                last_cursor = None
                rows = []
                columns = []
                affected_rows = 0

                for stmt in statements:
                    last_cursor = cursor.execute(stmt)
                    if cursor.rowcount > 0:
                        affected_rows += cursor.rowcount

                if last_cursor and last_cursor.description:
                    columns = [d[0] for d in last_cursor.description]
                    raw_rows = last_cursor.fetchall()
                    rows = [list(r) for r in raw_rows]

                db_conn.commit()
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                self.send_json_response(200, {
                    "success": True,
                    "columns": columns,
                    "rows": rows,
                    "rowCount": len(rows),
                    "affectedRows": affected_rows,
                    "executionTimeMs": elapsed_ms,
                    "query": sql
                })
            except Exception as e:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                self.send_json_response(400, {
                    "success": False,
                    "error": str(e),
                    "executionTimeMs": elapsed_ms,
                    "query": sql
                })
            return

        # API: Reset SQLite database to initial state
        if path == '/api/reset-db':
            try:
                init_lakehouse_database()
                self.send_json_response(200, {"success": True, "message": "Lakehouse database reset to default schema and seed data."})
            except Exception as e:
                self.send_json_response(500, {"error": str(e)})
            return

        self.send_json_response(404, {"error": f"Endpoint {path} not found"})

    def send_json_response(self, status_code: int, data: Dict[str, Any]):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    print(f"============================================================")
    print(f"🚀 Python Medallion Lakehouse Server")
    print(f"• Runtime: Python {sys.version.split()[0]}")
    print(f"• In-Memory SQL Engine: SQLite 3 with Medallion Schema")
    print(f"• Serving Port: http://{HOST}:{PORT}")
    print(f"============================================================")
    server = ThreadedHTTPServer((HOST, PORT), LakehouseHTTPRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Python server...")
        server.server_close()

if __name__ == '__main__':
    run()
