# Enterprise Medallion Architecture Standards & Modeling Guide

An enterprise-grade architectural blueprint, modeling dictionary, and interactive SQL engineering guide for building modern **Bronze**, **Silver**, and **Gold** Data Lakehouses. 

The application is powered by a lightweight **Python 3 backend** (`server.py`) with an embedded in-memory **SQLite Medallion database** and served via an interactive web interface.

---

## Architecture Overview

```
[Operational Sources & Streams] (Kafka, CRM, ERP, Stripe)
              │
              ▼
  ┌────────────────────────────────────────────────────────┐
  │  BRONZE LAYER (Append-Only Raw Audit Landing)          │
  │  - brz_raw_customer_events                             │
  └───────────────────────────┬────────────────────────────┘
                              │ SQL MERGE (SHA-256 Hash Diff)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  SILVER LAYER (Cleaned, 3NF & Bi-Temporal SCD Type 2)  │
  │  - slv_ent_customer_account (_valid_from, _valid_to)   │
  │  - slv_ent_order_header & slv_ent_order_line_item      │
  └───────────────────────────┬────────────────────────────┘
                              │ SQL Star Aggregations & Joins
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  GOLD LAYER (Kimball Star Schemas & GAAP ARR Marts)    │
  │  - gld_dim_customer (_sk) & gld_dim_product (_sk)      │
  │  - gld_fct_order_sales (Surrogate Joins, COGS, Margin) │
  └────────────────────────────────────────────────────────┘
```

- **Backend Runtime**: Pure Python 3.10+ (built-in `http.server`, `socketserver`, and `sqlite3` — zero third-party Python dependencies).
- **Standards & Code Generation**: 100% SQL-native (Databricks Delta Lake 3.0+, Snowflake, Google BigQuery, PostgreSQL/ANSI, AWS Athena, and dbt).
- **Frontend**: React 19, TypeScript, and Tailwind CSS.

---

## Prerequisites

- **Python 3.10+** (That's all! Uses only standard library modules: `http.server`, `sqlite3`, `json`, `hashlib`).
- **Zero third-party pip packages required.**
- **Zero npm or Node.js required** to run the app.

---

## Quickstart: How to Run the App (Python Only)

You do **not** need `npm` or `Node.js` installed on your machine. Simply run with Python 3:

```bash
# Option 1: Using the launcher
python3 app.py

# Option 2: Or directly with the server
python3 server.py
```

*(On Windows systems, you can also use `python app.py` or `python server.py`)*

The server will initialize the Lakehouse Medallion schema in memory and start listening immediately:

```text
============================================================
🚀 Python Medallion Lakehouse Server
• Runtime: Python 3.10.x
• In-Memory SQL Engine: SQLite 3 with Medallion Schema
• Serving Port: http://0.0.0.0:3000
============================================================
```

Now open your web browser and navigate to:
```
http://localhost:3000
```

### What Happens When You Run with Python Only?
- The Python server boots an in-memory SQLite database pre-seeded with **Bronze**, **Silver**, and **Gold** tables (`brz_raw_customer_events`, `slv_ent_customer_account`, `gld_fct_order_sales`, etc.).
- It serves the complete interactive Lakehouse Standards web application directly to your browser.
- You can execute live SQL queries, inspect table schemas, simulate bi-temporal SCD2 versioning, and generate multi-dialect DDL (Delta Lake, Snowflake, BigQuery).

---

## (Optional) Running with npm (If npm is available)

If you happen to have `npm` installed and want to modify the React frontend source code:

```bash
npm install
npm run dev
```

The Python server will output:
```text
============================================================
🚀 Python Medallion Lakehouse Server
• Runtime: Python 3.10.x
• In-Memory SQL Engine: SQLite 3 with Medallion Schema
• Serving Port: http://0.0.0.0:3000
============================================================
```

---

## Python Server Endpoints & SQL API

The Python backend exposes REST API endpoints for live SQL simulation and schema inspection:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Verifies Python runtime and server health. |
| `GET` | `/api/tables` | Lists all seeded Medallion tables with real-time row counts. |
| `POST` | `/api/execute-sql` | Executes SQL queries in the in-memory SQLite engine and returns formatted results, columns, and latency. |
| `POST` | `/api/reset-db` | Re-seeds the in-memory lakehouse tables to default benchmark records. |

### Testing the Python API via cURL

**Health Check:**
```bash
curl -s http://localhost:3000/api/health
```

**List Medallion Tables:**
```bash
curl -s http://localhost:3000/api/tables
```

**Execute SQL Query:**
```bash
curl -s -X POST http://localhost:3000/api/execute-sql \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT customer_account_id, company_name, tier_plan_cd, mrr_amt FROM slv_ent_customer_account WHERE _is_current_flg = 1;"}'
```

---

## Project Structure

```
├── server.py                 # Pure Python 3 server (HTTP handler, SQLite engine, API routes)
├── dist/                     # Compiled production UI assets served by server.py
├── src/
│   ├── components/
│   │   ├── Header.tsx                 # Top navigation and export triggers
│   │   ├── OverviewSection.tsx        # Medallion data flow diagrams and architectural tenets
│   │   ├── SchemaViewer.tsx           # Interactive dictionary for Silver & Gold tables
│   │   ├── AuditScd2Sandbox.tsx       # Bi-temporal SCD2 versioning & SHA-256 hash simulator
│   │   ├── TransformationEngine.tsx   # Live SQL Query Runner & Medallion pipeline rules
│   │   ├── NamingConventions.tsx      # Suffix dictionary (_sk, _id, _amt, _ts, _flg, etc.)
│   │   ├── RegulatoryMatrix.tsx       # Compliance crosswalk (SOX 404, GDPR, SOC 2, GAAP)
│   │   ├── DdlGenerator.tsx           # Pure SQL DDL generator (Delta, Snowflake, BigQuery, dbt)
│   │   └── DocumentViewer.tsx         # Downloadable lakehouse standard markdown specification
│   ├── data/
│   │   └── standardsData.ts           # Table schemas, audit columns, rules, and seed queries
│   ├── types.ts                       # TypeScript interfaces for lakehouse metadata
│   └── App.tsx                        # Root layout component
├── package.json              # Project scripts and dependencies
├── metadata.json             # Application metadata and runtime descriptors
└── README.md                 # Project documentation and run guide
```

---

## Core Lakehouse Standards Included

1. **Bi-Temporal SCD Type 2**:
   - Every mutating dimension tracks both system transaction timestamps (`_created_ts`, `_updated_ts`) and business validity intervals (`_valid_from_ts`, `_valid_to_ts`, `_is_current_flg`).
2. **Deterministic SHA-256 Change Detection**:
   - `SHA2(CONCAT_WS('||', ...), 256)` computed across business columns to eliminate costly 30-column comparisons during distributed SQL `MERGE` operations.
3. **14 Mandatory Audit Lineage Columns**:
   - Enforces end-to-end traceability (`_src_sys_cd`, `_ingest_ts`, `_etl_job_id`, `_pipeline_run_id`, `_dq_score`, etc.) across all Silver and Gold entities.
4. **Strict Semantic Suffix Taxonomy**:
   - Uniform naming standards (`_sk`, `_id`, `_amt`, `_pct`, `_qty`, `_cnt`, `_cd`, `_desc`, `_flg`, `_dt`, `_ts`) for automated data cataloging.
5. **Multi-Dialect SQL DDL**:
   - Production DDL definitions for Databricks Delta Lake 3.0+, Snowflake, Google BigQuery, PostgreSQL/ANSI, AWS Athena, and dbt models.
