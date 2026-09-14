#!/usr/bin/env python3
"""
Enterprise Medallion Architecture Standards & SQL Modeling Engine
Pure Python 3 backend (Zero external pip dependencies, standard library only).
Serves the HTML/CSS/JS frontend and provides a live in-memory SQL execution engine
with pre-seeded Bronze, Silver, and Gold Medallion tables.
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
from datetime import datetime
from typing import Dict, Any, List

PORT = 3000
HOST = '0.0.0.0'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Global in-memory SQLite database
db_conn = sqlite3.connect(':memory:', check_same_thread=False)

def register_custom_sql_functions(conn: sqlite3.Connection):
    """Registers modern data warehouse SQL functions in SQLite."""
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
    """Initializes and seeds the in-memory SQLite database with Bronze, Silver, and Gold tables."""
    cursor = db_conn.cursor()

    cursor.executescript("""
    DROP TABLE IF EXISTS brz_raw_customer_events;
    DROP TABLE IF EXISTS slv_ent_customer_account;
    DROP TABLE IF EXISTS slv_ent_order_header;
    DROP TABLE IF EXISTS slv_ent_order_line_item;
    DROP TABLE IF EXISTS gld_dim_customer;
    DROP TABLE IF EXISTS gld_dim_product;
    DROP TABLE IF EXISTS gld_fct_order_sales;

    -- BRONZE LAYER: Raw, immutable, append-only event landing
    CREATE TABLE brz_raw_customer_events (
        payload_id VARCHAR(64) PRIMARY KEY,
        event_type_cd VARCHAR(32) NOT NULL,
        account_id VARCHAR(64) NOT NULL,
        plan_tier VARCHAR(32) NOT NULL,
        mrr_amount DECIMAL(18, 2) NOT NULL,
        country_code VARCHAR(8) NOT NULL,
        _raw_payload_json TEXT NOT NULL,
        _src_sys_cd VARCHAR(32) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL,
        _kafka_partition INT NOT NULL,
        _kafka_offset INT NOT NULL
    );

    -- SILVER LAYER: Conformed, cleaned, bi-temporal SCD Type 2 dimension
    CREATE TABLE slv_ent_customer_account (
        customer_account_version_id VARCHAR(64) PRIMARY KEY,
        customer_account_id VARCHAR(64) NOT NULL,
        _version_seq_id INT NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        primary_email VARCHAR(255) NOT NULL,
        tier_plan_cd VARCHAR(32) NOT NULL,
        account_status_cd VARCHAR(32) NOT NULL,
        seat_licensed_cnt INT NOT NULL,
        mrr_amt DECIMAL(18, 2) NOT NULL,
        country_iso_cd VARCHAR(8) NOT NULL,
        is_enterprise_sla_flg INT NOT NULL,
        _src_sys_cd VARCHAR(32) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL,
        _valid_from_ts TIMESTAMP NOT NULL,
        _valid_to_ts TIMESTAMP NOT NULL,
        _is_current_flg INT NOT NULL,
        _record_hash CHAR(64) NOT NULL,
        _dq_score DECIMAL(5, 2) NOT NULL,
        _etl_job_id VARCHAR(64) NOT NULL
    );

    -- SILVER LAYER: Order Header (3NF Transaction Entity)
    CREATE TABLE slv_ent_order_header (
        order_id VARCHAR(64) PRIMARY KEY,
        customer_account_id VARCHAR(64) NOT NULL,
        order_date_dt DATE NOT NULL,
        order_status_cd VARCHAR(32) NOT NULL,
        currency_iso_cd VARCHAR(8) NOT NULL,
        total_gross_amt DECIMAL(18, 2) NOT NULL,
        tax_amt DECIMAL(18, 2) NOT NULL,
        total_net_amt DECIMAL(18, 2) NOT NULL,
        _src_sys_cd VARCHAR(32) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL,
        _record_hash CHAR(64) NOT NULL
    );

    -- SILVER LAYER: Order Line Items
    CREATE TABLE slv_ent_order_line_item (
        order_line_item_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        line_item_seq_no INT NOT NULL,
        product_sku_cd VARCHAR(64) NOT NULL,
        quantity_cnt INT NOT NULL,
        unit_price_amt DECIMAL(18, 2) NOT NULL,
        line_total_amt DECIMAL(18, 2) NOT NULL,
        _ingest_ts TIMESTAMP NOT NULL
    );

    -- GOLD LAYER: Kimball Dimensional Star - Conformed Customer Dimension
    CREATE TABLE gld_dim_customer (
        customer_sk INT PRIMARY KEY,
        customer_account_id VARCHAR(64) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        tier_plan_cd VARCHAR(32) NOT NULL,
        country_iso_cd VARCHAR(8) NOT NULL,
        is_enterprise_sla_flg INT NOT NULL,
        _is_current_flg INT NOT NULL,
        _effective_start_dt DATE NOT NULL,
        _effective_end_dt DATE NOT NULL
    );

    -- GOLD LAYER: Kimball Dimensional Star - Product Dimension
    CREATE TABLE gld_dim_product (
        product_sk INT PRIMARY KEY,
        product_sku_cd VARCHAR(64) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_category_cd VARCHAR(64) NOT NULL,
        standard_unit_cost_amt DECIMAL(18, 2) NOT NULL,
        standard_unit_price_amt DECIMAL(18, 2) NOT NULL
    );

    -- GOLD LAYER: Kimball Dimensional Star - Sales & Margin Fact Table
    CREATE TABLE gld_fct_order_sales (
        order_sales_fact_sk INT PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        customer_sk INT NOT NULL,
        product_sk INT NOT NULL,
        order_date_key INT NOT NULL,
        order_quantity_cnt INT NOT NULL,
        gross_sales_amt DECIMAL(18, 2) NOT NULL,
        discount_amt DECIMAL(18, 2) NOT NULL,
        net_sales_amt DECIMAL(18, 2) NOT NULL,
        cost_of_goods_sold_amt DECIMAL(18, 2) NOT NULL,
        gross_margin_amt DECIMAL(18, 2) NOT NULL,
        _created_ts TIMESTAMP NOT NULL
    );
    """)

    # Seed Bronze records
    cursor.executemany("""
    INSERT INTO brz_raw_customer_events (
        payload_id, event_type_cd, account_id, plan_tier, mrr_amount, country_code,
        _raw_payload_json, _src_sys_cd, _ingest_ts, _kafka_partition, _kafka_offset
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ('evt_001_raw', 'ACCOUNT_CREATED', 'ACC-101', 'GROWTH', 3200.00, 'USA', '{"source": "salesforce", "region": "US-EAST", "rep": "Sarah J."}', 'SFDC_CDC', '2026-01-01 10:20:00', 0, 1024),
        ('evt_002_raw', 'ACCOUNT_CREATED', 'ACC-102', 'GROWTH', 1850.00, 'GBR', '{"source": "stripe", "region": "EU-WEST", "plan_currency": "GBP"}', 'STRIPE_WEBHOOK', '2026-02-15 08:15:00', 1, 4096),
        ('evt_003_raw', 'ACCOUNT_CREATED', 'ACC-103', 'ENTERPRISE', 5200.00, 'CAN', '{"source": "salesforce", "region": "CAN-CENTRAL"}', 'SFDC_CDC', '2026-03-01 14:40:00', 0, 1025),
        ('evt_004_raw', 'TIER_UPGRADE', 'ACC-101', 'ENTERPRISE', 4200.00, 'USA', '{"source": "deal_desk", "seat_count": 75, "sla": "platinum"}', 'SFDC_CDC', '2026-06-01 09:00:00', 0, 1026),
        ('evt_005_raw', 'ACCOUNT_CREATED', 'ACC-104', 'ENTERPRISE', 4200.00, 'DEU', '{"source": "salesforce", "region": "EU-CENTRAL"}', 'SFDC_CDC', '2026-04-10 11:30:00', 1, 4097)
    ])

    # Seed Silver customer accounts (Demonstrates SCD Type 2 with revision history)
    cursor.executemany("""
    INSERT INTO slv_ent_customer_account (
        customer_account_version_id, customer_account_id, _version_seq_id, company_name,
        primary_email, tier_plan_cd, account_status_cd, seat_licensed_cnt, mrr_amt,
        country_iso_cd, is_enterprise_sla_flg, _src_sys_cd, _ingest_ts,
        _valid_from_ts, _valid_to_ts, _is_current_flg, _record_hash, _dq_score, _etl_job_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        # ACC-101 version 1 (Closed)
        ('ACC-101_v1', 'ACC-101', 1, 'Acme Corp', 'billing@acme.com', 'GROWTH', 'ACTIVE', 45, 3200.00, 'USA', 0, 'SFDC_CDC', '2026-01-01 10:20:00', '2026-01-01 00:00:00', '2026-05-31 23:59:59', 0, 'c8b91a74d2e8b0123456789abcdef0123456789abcdef0123456789abcdef01', 99.8, 'job_dlt_silver_001'),
        # ACC-101 version 2 (Active Current)
        ('ACC-101_v2', 'ACC-101', 2, 'Acme Corp', 'billing@acme.com', 'ENTERPRISE', 'ACTIVE', 75, 4200.00, 'USA', 1, 'SFDC_CDC', '2026-06-01 09:00:00', '2026-06-01 00:00:00', '9999-12-31 23:59:59', 1, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 100.0, 'job_dlt_silver_004'),
        # ACC-102 (Active Current)
        ('ACC-102_v1', 'ACC-102', 1, 'BioHealth Corp', 'ops@biohealth.io', 'GROWTH', 'ACTIVE', 25, 1850.00, 'GBR', 0, 'STRIPE_WEBHOOK', '2026-02-15 08:15:00', '2026-02-15 00:00:00', '9999-12-31 23:59:59', 1, '4a6b2c8d1e9f0123456789abcdef0123456789abcdef0123456789abcdef02', 100.0, 'job_dlt_silver_002'),
        # ACC-103 (Active Current)
        ('ACC-103_v1', 'ACC-103', 1, 'Omni Logistics', 'admin@omnilog.com', 'ENTERPRISE', 'ACTIVE', 100, 5200.00, 'CAN', 1, 'SFDC_CDC', '2026-03-01 14:40:00', '2026-03-01 00:00:00', '9999-12-31 23:59:59', 1, '5b7c3d9e2f0a123456789abcdef0123456789abcdef0123456789abcdef03', 100.0, 'job_dlt_silver_003'),
        # ACC-104 (Active Current)
        ('ACC-104_v1', 'ACC-104', 1, 'FinEdge Global', 'tech@finedge.de', 'ENTERPRISE', 'ACTIVE', 60, 4200.00, 'DEU', 1, 'SFDC_CDC', '2026-04-10 11:30:00', '2026-04-10 00:00:00', '9999-12-31 23:59:59', 1, '6c8d4e0f3a1b23456789abcdef0123456789abcdef0123456789abcdef04', 99.5, 'job_dlt_silver_005')
    ])

    # Seed Silver order headers
    cursor.executemany("""
    INSERT INTO slv_ent_order_header (
        order_id, customer_account_id, order_date_dt, order_status_cd,
        currency_iso_cd, total_gross_amt, tax_amt, total_net_amt,
        _src_sys_cd, _ingest_ts, _record_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ('ORD-1001', 'ACC-101', '2026-06-15', 'SETTLED', 'USD', 4200.00, 0.00, 4200.00, 'BILLING_SYSTEM', '2026-06-15 12:00:00', 'hash_ord_1001'),
        ('ORD-1002', 'ACC-102', '2026-07-01', 'SETTLED', 'USD', 1850.00, 0.00, 1850.00, 'BILLING_SYSTEM', '2026-07-01 12:00:00', 'hash_ord_1002'),
        ('ORD-1003', 'ACC-103', '2026-07-10', 'SETTLED', 'USD', 10400.00, 0.00, 10400.00, 'BILLING_SYSTEM', '2026-07-10 12:00:00', 'hash_ord_1003'),
        ('ORD-1004', 'ACC-101', '2026-08-01', 'SETTLED', 'USD', 4200.00, 0.00, 4200.00, 'BILLING_SYSTEM', '2026-08-01 12:00:00', 'hash_ord_1004'),
        ('ORD-1005', 'ACC-104', '2026-08-15', 'PENDING', 'USD', 4200.00, 0.00, 4200.00, 'BILLING_SYSTEM', '2026-08-15 12:00:00', 'hash_ord_1005')
    ])

    # Seed Silver line items
    cursor.executemany("""
    INSERT INTO slv_ent_order_line_item (
        order_line_item_id, order_id, line_item_seq_no, product_sku_cd,
        quantity_cnt, unit_price_amt, line_total_amt, _ingest_ts
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        ('LI-1001-1', 'ORD-1001', 1, 'SKU-ENT-PLATFORM', 1, 4200.00, 4200.00, '2026-06-15 12:00:00'),
        ('LI-1002-1', 'ORD-1002', 1, 'SKU-GROWTH-SaaS', 1, 1850.00, 1850.00, '2026-07-01 12:00:00'),
        ('LI-1003-1', 'ORD-1003', 1, 'SKU-ENT-PLATFORM', 2, 4200.00, 8400.00, '2026-07-10 12:00:00'),
        ('LI-1003-2', 'ORD-1003', 2, 'SKU-PREMIUM-SUPPORT', 1, 2000.00, 2000.00, '2026-07-10 12:00:00'),
        ('LI-1004-1', 'ORD-1004', 1, 'SKU-ENT-PLATFORM', 1, 4200.00, 4200.00, '2026-08-01 12:00:00')
    ])

    # Seed Gold Customer Dimension
    cursor.executemany("""
    INSERT INTO gld_dim_customer (
        customer_sk, customer_account_id, company_name, tier_plan_cd,
        country_iso_cd, is_enterprise_sla_flg, _is_current_flg,
        _effective_start_dt, _effective_end_dt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, [
        (1, 'ACC-101', 'Acme Corp (Growth Era)', 'GROWTH', 'USA', 0, 0, '2026-01-01', '2026-05-31'),
        (2, 'ACC-101', 'Acme Corp', 'ENTERPRISE', 'USA', 1, 1, '2026-06-01', '9999-12-31'),
        (3, 'ACC-102', 'BioHealth Corp', 'GROWTH', 'GBR', 0, 1, '2026-02-15', '9999-12-31'),
        (4, 'ACC-103', 'Omni Logistics', 'ENTERPRISE', 'CAN', 1, 1, '2026-03-01', '9999-12-31'),
        (5, 'ACC-104', 'FinEdge Global', 'ENTERPRISE', 'DEU', 1, 1, '2026-04-10', '9999-12-31')
    ])

    # Seed Gold Product Dimension
    cursor.executemany("""
    INSERT INTO gld_dim_product (
        product_sk, product_sku_cd, product_name, product_category_cd,
        standard_unit_cost_amt, standard_unit_price_amt
    ) VALUES (?, ?, ?, ?, ?, ?);
    """, [
        (1, 'SKU-ENT-PLATFORM', 'Enterprise Lakehouse Suite', 'CORE_PLATFORM', 850.00, 4200.00),
        (2, 'SKU-GROWTH-SaaS', 'Growth Lakehouse Engine', 'CORE_PLATFORM', 380.00, 1850.00),
        (3, 'SKU-ADDON-GOVERNANCE', 'Data Governance Sentinel', 'ADD_ON', 220.00, 1200.00),
        (4, 'SKU-PREMIUM-SUPPORT', '24/7 Dedicated SRE Support', 'SERVICES', 450.00, 2000.00)
    ])

    # Seed Gold Sales Fact
    cursor.executemany("""
    INSERT INTO gld_fct_order_sales (
        order_sales_fact_sk, order_id, customer_sk, product_sk, order_date_key,
        order_quantity_cnt, gross_sales_amt, discount_amt, net_sales_amt,
        cost_of_goods_sold_amt, gross_margin_amt, _created_ts
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
    """, [
        (1, 'ORD-1001', 2, 1, 20260615, 1, 4200.00, 0.00, 4200.00, 850.00, 3350.00),
        (2, 'ORD-1002', 3, 2, 20260701, 1, 1850.00, 0.00, 1850.00, 380.00, 1470.00),
        (3, 'ORD-1003', 4, 1, 20260710, 2, 8400.00, 0.00, 8400.00, 1700.00, 6700.00),
        (4, 'ORD-1003', 4, 4, 20260710, 1, 2000.00, 0.00, 2000.00, 450.00, 1550.00),
        (5, 'ORD-1004', 2, 1, 20260801, 1, 4200.00, 0.00, 4200.00, 850.00, 3350.00)
    ])

    db_conn.commit()
    print("✓ Lakehouse SQLite Medallion tables initialized successfully.")

# Seed on server boot
init_lakehouse_database()

class MedallionHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler serving pure HTML frontend and live Python SQL endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        url_path = self.path.split('?')[0]

        # API 1: Health check
        if url_path == '/api/health':
            self.send_json_response(200, {
                "status": "ok",
                "app": "pure-python-medallion-lakehouse",
                "runtime": f"Python {sys.version.split()[0]}",
                "engine": "Python in-memory SQLite3 SQL Engine",
                "layers": ["bronze", "silver", "gold"],
                "activePort": PORT
            })
            return

        # API 2: List Medallion Tables
        if url_path == '/api/tables':
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

        # API 3: Table details and sample data
        if url_path.startswith('/api/table/'):
            table_name = url_path.replace('/api/table/', '').strip()
            try:
                cursor = db_conn.cursor()
                cursor.execute(f"PRAGMA table_info({table_name});")
                col_info = cursor.fetchall()
                if not col_info:
                    self.send_json_response(404, {"error": f"Table '{table_name}' does not exist"})
                    return
                
                columns = [{"name": c[1], "type": c[2], "notNull": bool(c[3]), "pk": bool(c[5])} for c in col_info]
                
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 25;")
                rows = cursor.fetchall()
                
                self.send_json_response(200, {
                    "table": table_name,
                    "columns": columns,
                    "rows": rows,
                    "rowCount": len(rows)
                })
            except Exception as e:
                self.send_json_response(500, {"error": str(e)})
            return

        # API 4: Export Full Architecture Markdown Specification
        if url_path == '/api/export-spec':
            spec_md = generate_lakehouse_specification_markdown()
            self.send_response(200)
            self.send_header('Content-Type', 'text/markdown; charset=utf-8')
            self.send_header('Content-Disposition', 'attachment; filename="Enterprise_Medallion_Lakehouse_Standard.md"')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(spec_md.encode('utf-8'))
            return

        # Root and SPA fallback: Serve index.html
        if url_path in ['/', '/index.html']:
            index_path = os.path.join(BASE_DIR, 'index.html')
            if os.path.exists(index_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(index_path, 'rb') as f:
                    self.wfile.write(f.read())
                return

        # Fallback to standard static file serving
        return super().do_GET()

    def do_POST(self):
        url_path = self.path.split('?')[0]

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Malformed JSON payload"})
            return

        # API 5: Execute SQL
        if url_path == '/api/execute-sql':
            sql = payload.get('sql', '').strip()
            if not sql:
                self.send_json_response(400, {"error": "SQL statement is required"})
                return

            start_time = time.perf_counter()
            cursor = db_conn.cursor()

            try:
                # Handle multi-statement scripts
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

        # API 6: Reset Database
        if url_path == '/api/reset-db':
            try:
                init_lakehouse_database()
                self.send_json_response(200, {"success": True, "message": "Lakehouse SQLite database re-seeded successfully."})
            except Exception as e:
                self.send_json_response(500, {"error": str(e)})
            return

        # API 7: Simulate Upstream CDC Event & SCD2 Version Evolution
        if url_path == '/api/scd2-simulate':
            account_id = payload.get('account_id', 'ACC-101')
            new_tier = payload.get('tier_plan_cd', 'ENTERPRISE_PREMIUM')
            new_mrr = float(payload.get('mrr_amt', 6500.00))
            new_seats = int(payload.get('seat_licensed_cnt', 120))
            company_name = payload.get('company_name', 'Acme Corp')

            cursor = db_conn.cursor()
            try:
                # 1. Fetch current active record
                cursor.execute("""
                SELECT customer_account_version_id, _version_seq_id, _record_hash, tier_plan_cd, mrr_amt, seat_licensed_cnt, _valid_from_ts
                FROM slv_ent_customer_account
                WHERE customer_account_id = ? AND _is_current_flg = 1;
                """, [account_id])
                curr = cursor.fetchone()

                if not curr:
                    self.send_json_response(404, {"error": f"Active customer record for '{account_id}' not found"})
                    return

                curr_ver_id, curr_seq, old_hash, old_tier, old_mrr, old_seats, valid_from = curr

                # 2. Calculate new deterministic SHA-256 hash across business fields
                hash_input = f"{company_name.upper()}||{new_tier.upper()}||{new_mrr:.2f}||{new_seats}||USA"
                new_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

                now_ts = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

                # Check if change actually occurred
                if new_hash == old_hash:
                    self.send_json_response(200, {
                        "changeDetected": False,
                        "message": "SHA-256 hash is identical. No SCD2 evolution required (Idempotent bypass).",
                        "currentVersion": curr_ver_id,
                        "hash": new_hash
                    })
                    return

                # 3. Close the previous active record
                cursor.execute("""
                UPDATE slv_ent_customer_account
                SET _valid_to_ts = ?, _is_current_flg = 0
                WHERE customer_account_version_id = ?;
                """, [now_ts, curr_ver_id])

                # 4. Insert the new active record
                new_seq = curr_seq + 1
                new_ver_id = f"{account_id}_v{new_seq}"

                cursor.execute("""
                INSERT INTO slv_ent_customer_account (
                    customer_account_version_id, customer_account_id, _version_seq_id,
                    company_name, primary_email, tier_plan_cd, account_status_cd,
                    seat_licensed_cnt, mrr_amt, country_iso_cd, is_enterprise_sla_flg,
                    _src_sys_cd, _ingest_ts, _valid_from_ts, _valid_to_ts,
                    _is_current_flg, _record_hash, _dq_score, _etl_job_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, [
                    new_ver_id, account_id, new_seq, company_name, 'billing@acme.com',
                    new_tier, 'ACTIVE', new_seats, new_mrr, 'USA', 1, 'SFDC_CDC',
                    now_ts, now_ts, '9999-12-31 23:59:59', 1, new_hash, 100.0,
                    f"job_scd2_sim_{int(time.time())}"
                ])

                # Also insert raw audit event into Bronze
                cursor.execute("""
                INSERT INTO brz_raw_customer_events (
                    payload_id, event_type_cd, account_id, plan_tier, mrr_amount, country_code,
                    _raw_payload_json, _src_sys_cd, _ingest_ts, _kafka_partition, _kafka_offset
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, [
                    f"evt_sim_{int(time.time())}", 'TIER_UPGRADE_SIM', account_id, new_tier, new_mrr, 'USA',
                    json.dumps({"seat_count": new_seats, "mrr": new_mrr, "tier": new_tier, "event": "SCD2_SIMULATION"}),
                    'SIM_ENGINE', now_ts, 0, 9999
                ])

                db_conn.commit()

                self.send_json_response(200, {
                    "changeDetected": True,
                    "message": f"Successfully simulated SCD2 evolution for {account_id}.",
                    "closedVersion": {
                        "versionId": curr_ver_id,
                        "seq": curr_seq,
                        "tier": old_tier,
                        "mrr": old_mrr,
                        "seats": old_seats,
                        "validFrom": valid_from,
                        "validTo": now_ts,
                        "recordHash": old_hash
                    },
                    "newVersion": {
                        "versionId": new_ver_id,
                        "seq": new_seq,
                        "tier": new_tier,
                        "mrr": new_mrr,
                        "seats": new_seats,
                        "validFrom": now_ts,
                        "validTo": '9999-12-31 23:59:59',
                        "recordHash": new_hash
                    }
                })
            except Exception as e:
                self.send_json_response(500, {"error": str(e)})
            return

        self.send_json_response(404, {"error": f"Endpoint '{url_path}' not found"})

    def send_json_response(self, status_code: int, data: Dict[str, Any]):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

def generate_lakehouse_specification_markdown() -> str:
    """Generates the official enterprise lakehouse architecture specification document."""
    return f"""# Enterprise Medallion Architecture Standards & SQL Modeling Specification
**Standard Document ID**: ARCH-SPEC-MEDALLION-2026-V1  
**Author**: Data Architecture Governance Board  
**Runtime Compatibility**: Databricks Delta Lake 3.0+, Snowflake, Google BigQuery, PostgreSQL/ANSI  

---

## 1. Executive Summary & Architectural Axioms
The Medallion Architecture organizes Lakehouse data into three distinct, governed physical zones:
1. **Bronze (Raw Audit Landing)**: Append-only, immutable ingestion preserving upstream fidelity.
2. **Silver (Conformed Enterprise 3NF & Bi-Temporal SCD2)**: Cleaned, deduplicated, standardized entities enforcing strict data contracts, business validity timestamps, and deterministic SHA-256 hash diffing.
3. **Gold (Curated Kimball Dimensional Marts)**: Conformed Star Schemas with integer surrogate keys (`_sk`), optimized for GAAP revenue reporting, financial audits, and analytical consumption.

---

## 2. Mandatory Suffix Taxonomy
Every physical column name MUST strictly adhere to the following semantic suffix rules:

| Suffix | Logical Concept | Mandatory SQL Type | Example |
|---|---|---|---|
| `_sk` | Integer Surrogate Key (Kimball Star) | `BIGINT` / `INTEGER` | `customer_sk`, `product_sk` |
| `_id` | Natural / System Identifier | `VARCHAR(64)` / `STRING` | `customer_account_id`, `order_id` |
| `_amt` | Exact Financial Amount | `DECIMAL(18,2)` (NEVER FLOAT) | `mrr_amt`, `gross_sales_amt` |
| `_cnt` | Exact Integer Count | `INTEGER` / `INT64` | `seat_licensed_cnt`, `quantity_cnt` |
| `_cd` | Normalized Code / Enum | `VARCHAR(32)` | `tier_plan_cd`, `country_iso_cd` |
| `_flg` | Boolean Flag | `BOOLEAN` / `INT (0 or 1)` | `_is_current_flg`, `is_enterprise_sla_flg` |
| `_dt` | Calendar Date | `DATE` | `order_date_dt`, `_effective_start_dt` |
| `_ts` | High-Precision Timestamp | `TIMESTAMP` / `TIMESTAMP_NTZ` | `_valid_from_ts`, `_ingest_ts` |
| `_pct` | Decimal Percentage (0.0 to 1.0) | `DECIMAL(7,4)` | `discount_pct`, `churn_probability_pct` |

---

## 3. The 14 Mandatory Audit Lineage Columns
To satisfy SOX 404, GDPR Article 17, and SOC 2 Type II controls, all Silver and Gold entities MUST contain the following immutable audit envelope:

1. `_src_sys_cd`: Originating system (`SFDC_CDC`, `STRIPE_WEBHOOK`, `KAFKA_TELEMETRY`).
2. `_ingest_ts`: High-precision UTC timestamp when the record landed in Bronze.
3. `_etl_job_id`: Continuous integration or orchestration run identifier.
4. `_pipeline_run_id`: Unique execution UUID for idempotency tracking.
5. `_valid_from_ts`: Bi-temporal interval start (when the record became factually true in business reality).
6. `_valid_to_ts`: Bi-temporal interval end (`9999-12-31 23:59:59` for active records).
7. `_is_current_flg`: Boolean flag indicating whether this row represents the active state.
8. `_version_seq_id`: Strictly monotonic sequence integer (1, 2, 3...) per business entity.
9. `_record_hash`: SHA-256 hash computed deterministically across all non-audit business fields.
10. `_dq_score`: Numeric quality score (0.00 to 100.00) assigned by expectation checks.
11. `_dq_status_cd`: Quality category (`PASSED`, `WARNING_COERCED`, `QUARANTINED`).
12. `_gdpr_crypto_key_id`: Cryptographic key pointer for GDPR Article 17 crypto-shredding.
13. `_is_deleted_flg`: Soft deletion tombstone flag.
14. `_created_ts`: Database transaction posting timestamp.

---

## 4. Deterministic SHA-256 Change Detection Pattern
Distributed SQL engines suffer major network shuffle bottlenecks when performing 30-column `OR` equality checks during `MERGE INTO`. Standardize on a single SHA-256 hash comparison:

```sql
-- Databricks Delta Lake / Spark SQL
SELECT 
    account_id AS customer_account_id,
    plan_tier AS tier_plan_cd,
    mrr_amount AS mrr_amt,
    SHA2(
        CONCAT_WS('||',
            COALESCE(UPPER(TRIM(account_id)), ''),
            COALESCE(UPPER(TRIM(plan_tier)), ''),
            COALESCE(CAST(mrr_amount AS STRING), '0.00'),
            COALESCE(UPPER(TRIM(country_code)), '')
        ),
        256
    ) AS _record_hash
FROM lakehouse_bronze.brz_raw_customer_events;
```

---

## 5. Regulatory Compliance Mapping
- **SOX 404 (Financial Internal Controls)**: Requires financial amounts to use `DECIMAL` precision and enforces an immutable audit trail from raw landing to ledger posting.
- **GDPR Article 17 (Right to Erasure)**: Enforced via Crypto-Shredding; PII is encrypted at the column level with a per-user key (`_gdpr_crypto_key_id`). When an erasure request arrives, the key is destroyed.
- **GAAP / ASC 606 (Revenue Recognition)**: Standardizes subscription billing schedules, gross margins, and MRR metrics using conformed dimensions and non-overlapping SCD2 validity slices.
"""

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def run():
    print(f"============================================================")
    print(f"💎 Pure Python Medallion Lakehouse Server")
    print(f"• Runtime: Python {sys.version.split()[0]}")
    print(f"• In-Memory SQL Engine: SQLite 3 with Medallion Schema")
    print(f"• Serving Port: http://{HOST}:{PORT}")
    print(f"• Architecture: 100% Python & HTML (Zero Node/npm required)")
    print(f"============================================================")
    server = ThreadedHTTPServer((HOST, PORT), MedallionHTTPRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Python server...")
        server.server_close()

if __name__ == '__main__':
    run()
