#!/usr/bin/env python3
"""
Python Medallion Lakehouse Application Entrypoint
Run this app with Python only:
    python3 app.py
    # or
    python app.py

No npm, Node.js, or external pip packages required.
Uses standard library modules: http.server, sqlite3, json, hashlib.
"""

import sys
import server

if __name__ == '__main__':
    try:
        server.run()
    except KeyboardInterrupt:
        print("\n[INFO] Application stopped by user.")
        sys.exit(0)
