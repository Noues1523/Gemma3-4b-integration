
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

/* ================================
   0) Utility: updated_at trigger
   ================================ */
-- We'll create a helper trigger generator via comments; For SQLite we define triggers per table.

/* ================================
   1) Administrators & Auth
   ================================ */
CREATE TABLE IF NOT EXISTS administrators (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,             -- store bcrypt/argon2 hash
  role          TEXT NOT NULL DEFAULT 'editor', -- 'superadmin','editor','analyst'
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at    DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_active ON administrators(is_active);

CREATE TRIGGER IF NOT EXISTS trg_admin_updated_at
AFTER UPDATE ON administrators
FOR EACH ROW
BEGIN
  UPDATE administrators SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS login_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL,
  login_time DATETIME NOT NULL DEFAULT (datetime('now')),
  logout_time DATETIME,
  ip_hash    TEXT,             -- store hashed IP for privacy
  user_agent TEXT,
  FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_login_admin_time ON login_history(admin_id, login_time);

/* ================================
   2) Lessons / Content
   ================================ */
CREATE TABLE IF NOT EXISTS lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  excerpt     TEXT,
  content     TEXT,                  -- HTML/Markdown/JSON
  status      TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'published' | 'archived'
  cover_image TEXT,                  -- path or URL
  tags        TEXT,                  -- comma-separated or JSON
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_updated ON lessons(updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_lessons_updated_at
AFTER UPDATE ON lessons
FOR EACH ROW
BEGIN
  UPDATE lessons SET updated_at = datetime('now') WHERE id = OLD.id;
END;

/* ================================
   3) Media Assets
   ================================ */
CREATE TABLE IF NOT EXISTS media_assets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,        -- relative or absolute URL
  file_type    TEXT,                 -- 'image/png','image/jpeg','application/pdf', etc.
  size_bytes   INTEGER,
  uploaded_by  INTEGER,              -- administrators.id
  linked_to    TEXT,                 -- 'lesson','quiz','map','generic'
  linked_id    INTEGER,              -- id in the linked table
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (uploaded_by) REFERENCES administrators(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_link ON media_assets(linked_to, linked_id);

/* ================================
   4) Quizzes
   ================================ */
CREATE TABLE IF NOT EXISTS quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  settings    TEXT,                  -- JSON settings (timeLimit, attempts, shuffle)
  status      TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_updated ON quizzes(updated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_quizzes_updated_at
AFTER UPDATE ON quizzes
FOR EACH ROW
BEGIN
  UPDATE quizzes SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL,
  qtype       TEXT NOT NULL DEFAULT 'mcq', -- 'mcq' | 'truefalse' | 'text'
  question    TEXT NOT NULL,
  choices     TEXT,                         -- JSON array (for mcq)
  answer_key  TEXT,                         -- JSON or text
  points      REAL NOT NULL DEFAULT 1,
  order_no    INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON quiz_questions(quiz_id, order_no);

CREATE TRIGGER IF NOT EXISTS trg_questions_updated_at
AFTER UPDATE ON quiz_questions
FOR EACH ROW
BEGIN
  UPDATE quiz_questions SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL,
  visitor_id  TEXT,                   -- from visitors table (not FK to avoid orphan if purge visitors)
  user_id     INTEGER,                -- if you later add registered learners
  answers     TEXT,                   -- JSON
  score       REAL,
  max_score   REAL,
  started_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  finished_at DATETIME,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_visitor ON quiz_attempts(visitor_id);

/* ================================
   5) Learning Map (Graph JSON)
   ================================ */
CREATE TABLE IF NOT EXISTS learning_map (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL DEFAULT 'default',
  graph_json TEXT NOT NULL,      -- nodes/edges/style
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_map_active ON learning_map(is_active);

CREATE TRIGGER IF NOT EXISTS trg_map_updated_at
AFTER UPDATE ON learning_map
FOR EACH ROW
BEGIN
  UPDATE learning_map SET updated_at = datetime('now') WHERE id = OLD.id;
END;

/* ================================
   6) Visitors (privacy-preserving)
   ================================ */
CREATE TABLE IF NOT EXISTS visitors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id  TEXT NOT NULL UNIQUE,  -- UUID stored in cookie/localStorage
  ip_hash     TEXT,                  -- SHA-256(IP+salt), nullable
  user_agent  TEXT,
  first_seen  DATETIME NOT NULL DEFAULT (datetime('now')),
  last_seen   DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);

CREATE TRIGGER IF NOT EXISTS trg_visitors_touch
AFTER UPDATE ON visitors
FOR EACH ROW
BEGIN
  UPDATE visitors SET last_seen = datetime('now') WHERE id = OLD.id;
END;

/* ================================
   7) Activity Log (Admin actions)
   ================================ */
CREATE TABLE IF NOT EXISTS activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,        -- e.g., 'create_lesson','update_map','publish_quiz','admin_login'
  ref_table  TEXT,                 -- 'lessons','quizzes','learning_map','media_assets', etc.
  ref_id     INTEGER,              -- id in that table
  admin_id   INTEGER,
  detail     TEXT,                 -- JSON payload
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES administrators(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_log(created_at DESC);

/* ================================
   8) Views for Dashboard
   ================================ */
CREATE VIEW IF NOT EXISTS vw_dashboard_counts AS
SELECT
  (SELECT COUNT(*) FROM visitors)       AS total_visitors,
  (SELECT COUNT(*) FROM visitors WHERE last_seen >= datetime('now','-10 minutes')) AS active_visitors,
  (SELECT COUNT(*) FROM lessons  WHERE status='published') AS total_lessons_published,
  (SELECT COUNT(*) FROM lessons) AS total_lessons_all,
  (SELECT COUNT(*) FROM quizzes  WHERE status='published') AS total_quizzes_published,
  (SELECT COUNT(*) FROM quizzes) AS total_quizzes_all;

CREATE VIEW IF NOT EXISTS vw_recent_activity AS
SELECT id, type, ref_table, ref_id, admin_id, created_at
FROM activity_log
ORDER BY created_at DESC
LIMIT 20;

/* ================================
   9) Seed data (safe defaults)
   ================================ */
-- Admin user placeholder (replace hash with a real bcrypt/argon2)
INSERT INTO administrators (username, email, password_hash, role)
SELECT 'admin', 'admin@example.com', '$2b$12$REPLACE_WITH_BCRYPT_HASH', 'superadmin'
WHERE NOT EXISTS (SELECT 1 FROM administrators WHERE username='admin');

-- Default learning map
INSERT INTO learning_map (name, graph_json, is_active)
SELECT 'default', '{"nodes":[{"id":"intro","title":"บทนำ","x":120,"y":80}],"edges":[],"style":{"theme":"light"}}', 1
WHERE NOT EXISTS (SELECT 1 FROM learning_map WHERE is_active=1);

-- Example lesson & quiz
INSERT INTO lessons (title, slug, excerpt, content, status)
SELECT 'รู้ทันมัลแวร์การเงิน', 'financial-malware', 'เกริ่นนำเรื่องภัยคุกคามการเงิน', '<p>เนื้อหาตัวอย่าง</p>', 'published'
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE slug='financial-malware');

INSERT INTO quizzes (title, slug, description, status)
SELECT 'แบบทดสอบพื้นฐานความปลอดภัย', 'basic-security-quiz', 'ทดสอบความรู้เบื้องต้น', 'published'
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE slug='basic-security-quiz');

INSERT INTO quiz_questions (quiz_id, qtype, question, choices, answer_key, points, order_no)
SELECT q.id, 'mcq', 'รหัสผ่านที่ดีควรเป็นแบบใด?', '["123456","Password1","J4s!9w@#G"]', '["J4s!9w@#G"]', 1, 1
FROM quizzes q
WHERE q.slug='basic-security-quiz' AND NOT EXISTS (
  SELECT 1 FROM quiz_questions WHERE quiz_id = q.id
);
