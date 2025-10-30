# init_admin.py — seed แอดมินลง SQLite
import os, sqlite3
from werkzeug.security import generate_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
DB   = os.path.join(BASE, 'admin', 'data', 'admin.db')

conn = sqlite3.connect(DB)
cur  = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'superadmin'
)
""")

username = 'admin'          # เปลี่ยนได้
password = 'admin123'       # เปลี่ยนได้
cur.execute(
  "INSERT OR REPLACE INTO admins (id, username, password_hash, role) VALUES (1, ?, ?, 'superadmin')",
  (username, generate_password_hash(password))
)

conn.commit()
conn.close()
print('Created/updated admin user:', username)
