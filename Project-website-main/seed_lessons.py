# seed_lessons.py
import os, sqlite3
BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, 'admin', 'data', 'admin.db')

schema = """
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  cover_image TEXT,
  status TEXT DEFAULT 'draft',
  body TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

sample = """
INSERT OR REPLACE INTO lessons (id, title, slug, summary, cover_image, status, body)
VALUES (
  1,
  'บทเรียนที่ 1: ความรู้เบื้องต้นเกี่ยวกับมัลแวร์',
  'malware-intro',
  'เรียนรู้ว่ามัลแวร์คืออะไร และมีชนิดใดบ้าง',
  '',
  'published',
  '<div class="card">
     <h3>หัวข้อที่ 1: มัลแวร์คืออะไร</h3>
     <p>มัลแวร์ (Malware) ย่อมาจาก Malicious Software ...</p>
     <p>ตัวอย่างเช่น ไวรัส เวิร์ม โทรจัน ฯลฯ</p>
   </div>'
);
"""

con = sqlite3.connect(DB)
con.executescript(schema + sample)
con.commit()
con.close()
print("Seed OK -> slug: malware-intro")
