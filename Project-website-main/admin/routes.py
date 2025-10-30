import re
import sqlite3
import json
from datetime import datetime
from functools import wraps
from flask import Blueprint, render_template, current_app, g, request, jsonify, session, after_this_request, make_response

# -----------------------------
# Blueprint
# -----------------------------
admin_bp = Blueprint(
    "admin",
    __name__,
    template_folder="templates",
    static_folder="static",
)

# -----------------------------
# DB helpers
# -----------------------------
def get_db():
    """สร้าง connection ไปยัง SQLite พร้อมจัดการ WAL + timeout"""
    if "db" not in g:
        db_path = current_app.config.get("ADMIN_DB_PATH")
        print(f"[DEBUG] Connecting to DB: {db_path}")

        conn = sqlite3.connect(
            db_path,
            timeout=10,
            check_same_thread=False
        )
        conn.row_factory = sqlite3.Row

        # ✅ เปิด WAL mode ให้ SQLite รองรับการอ่าน/เขียนพร้อมกัน
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
        except Exception as e:
            print("[WARN] Cannot enable WAL mode:", e)

        # ✅ รีเฟรช schema ป้องกัน error column slug/sub_lessons
        try:
            conn.execute("PRAGMA schema_version = schema_version + 1;")
            conn.commit()
        except Exception as e:
            print("[WARN] Cannot refresh schema:", e)

        g.db = conn
    return g.db


@admin_bp.teardown_app_request
def close_db(exc):
    """ปิด connection หลัง request เสร็จ"""
    db = g.pop("db", None)
    if db is not None:
        db.close()
        print("[DEBUG] DB connection closed")

# -----------------------------
# Auth helpers
# -----------------------------
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"ok": False, "error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


def get_user_by_username(username: str):
    try:
        row = get_db().execute(
            """
            SELECT id, username,
                   COALESCE(password,'') AS password,
                   COALESCE(role,'admin') AS role
            FROM administrators
            WHERE username = ?
            LIMIT 1
            """,
            (username,)
        ).fetchone()
        return row
    except sqlite3.OperationalError:
        return None


def _db():
    return get_db()

# -----------------------------
# Cache Control
# -----------------------------
@admin_bp.before_request
def disable_cache():
    @after_this_request
    def add_header(response):
        response.cache_control.no_store = True
        response.cache_control.no_cache = True
        response.cache_control.must_revalidate = True
        response.cache_control.max_age = 0
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Clear-Site-Data'] = '"cache", "storage"'
        return response

# -----------------------------
# Pages
# -----------------------------
@admin_bp.route("/")
def dashboard_page():
    response = make_response(render_template("admin.html", title="Admin Dashboard"))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# -----------------------------
# Auth APIs
# -----------------------------
@admin_bp.post("/api/login")
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"ok": False, "error": "missing_fields"}), 400

    # ✅ dev shortcut
    if username == "admin" and password == "admin":
        session.update({"user_id": 1, "username": "admin", "role": "superadmin"})
        return jsonify({"ok": True})

    user = get_user_by_username(username)
    if not user or user["password"] != password:
        return jsonify({"ok": False, "error": "invalid_credentials"}), 401

    session.update({"user_id": user["id"], "username": user["username"], "role": user["role"]})
    return jsonify({"ok": True})


@admin_bp.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@admin_bp.get("/api/me")
def api_me():
    if "user_id" not in session:
        return jsonify({"ok": False, "user": None})
    return jsonify(ok=True, user={
        "id": session["user_id"],
        "username": session["username"],
        "role": session.get("role"),
    })

# -----------------------------
# Lesson APIs (เนื้อหาหลัก)
# -----------------------------
@admin_bp.post("/api/lessons")
@login_required
def adm_lessons_create():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    slug = (data.get("slug") or "").strip()
    summary = (data.get("summary") or "").strip()
    content = data.get("content") or ""
    status = (data.get("status") or "draft").strip().lower()
    cover_image = (data.get("cover_image") or "").strip()
    tags = (data.get("tags") or "").strip()

    if not title:
        return jsonify(ok=False, error="missing_title"), 400

    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    excerpt = summary or (re.sub(r"<[^>]+>", "", content)[:160] + "…") if len(content) > 160 else content

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO lessons (title, slug, excerpt, content, status, cover_image, tags, created_at, updated_at, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
    """, (title, slug, excerpt, content, status, cover_image, tags, summary))
    conn.commit()
    return jsonify(ok=True, id=cur.lastrowid, slug=slug)


@admin_bp.get("/api/lessons")
@login_required
def adm_lessons_list():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, slug, summary, content, status, cover_image, tags,
               created_at, updated_at
        FROM lessons
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()

    return jsonify(ok=True, items=[dict(r) for r in rows])


@admin_bp.get("/api/lessons/<int:lesson_id>")
@login_required
def adm_lessons_get(lesson_id: int):
    conn = _db()
    row = conn.execute("SELECT * FROM lessons WHERE id=?", (lesson_id,)).fetchone()
    if not row:
        return jsonify(ok=False, error="not_found"), 404
    return jsonify(ok=True, item=dict(row))


@admin_bp.put("/api/lessons/<int:lesson_id>")
@login_required
def adm_lessons_update(lesson_id: int):
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    slug = (data.get("slug") or "").strip()
    summary = (data.get("summary") or "").strip()
    content = data.get("content") or ""
    status = (data.get("status") or "draft").strip().lower()
    cover_image = (data.get("cover_image") or "").strip()
    tags = (data.get("tags") or "").strip()

    if not title:
        return jsonify(ok=False, error="missing_title"), 400

    excerpt = summary or (re.sub(r"<[^>]+>", "", content)[:160] + "…") if len(content) > 160 else content

    conn = _db()
    conn.execute("""
        UPDATE lessons 
        SET title=?, slug=?, excerpt=?, content=?, status=?, 
            cover_image=?, tags=?, updated_at=datetime('now'), summary=?
        WHERE id=?
    """, (title, slug, excerpt, content, status, cover_image, tags, summary, lesson_id))
    conn.commit()
    return jsonify(ok=True)


@admin_bp.delete("/api/lessons/<int:lesson_id>")
@login_required
def adm_lessons_delete(lesson_id: int):
    conn = _db()
    conn.execute("DELETE FROM lessons WHERE id=?", (lesson_id,))
    conn.commit()
    return jsonify(ok=True)

# -----------------------------
# ✅ Save Lesson Blocks (ใหม่)
# -----------------------------
@admin_bp.route('/api/lessons/<slug>/save', methods=['POST'])
@login_required
def save_lesson_blocks(slug):
    """บันทึก block content (JSON) ของบทเรียน"""
    data = request.get_json(silent=True) or []

    conn = get_db()
    cur = conn.cursor()

    # ตรวจว่ามีคอลัมน์ content_blocks แล้วหรือยัง
    cur.execute("PRAGMA table_info(lessons)")
    cols = [r[1] for r in cur.fetchall()]
    if "content_blocks" not in cols:
        cur.execute("ALTER TABLE lessons ADD COLUMN content_blocks TEXT")

    cur.execute(
        "UPDATE lessons SET content_blocks = ? WHERE slug = ?",
        (json.dumps(data, ensure_ascii=False), slug)
    )
    conn.commit()

    return jsonify({'ok': True, 'message': 'saved'})

# -----------------------------
# Sublesson APIs
# -----------------------------
# -----------------------------
# Sublesson APIs (รวมของเดิม + ปรับปรุงใหม่)
# -----------------------------
@admin_bp.get("/api/sub_lessons/<int:sub_id>")
@login_required
def adm_sublesson_get(sub_id: int):
    """ดึงข้อมูลหัวข้อย่อย 1 รายการตาม ID"""
    conn = get_db()
    row = conn.execute("SELECT * FROM sub_lessons WHERE id=?", (sub_id,)).fetchone()
    if not row:
        return jsonify(ok=False, error="not_found"), 404
    return jsonify(ok=True, item=dict(row))


@admin_bp.post("/api/sub_lessons")
@login_required
def adm_sublesson_create():
    """สร้างหัวข้อย่อยใหม่"""
    data = request.get_json(silent=True) or {}
    parent_slug = (data.get("parent_slug") or "").strip()
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    content = data.get("content") or ""
    image_url = (data.get("image_url") or "").strip()
    status = (data.get("status") or "published").strip().lower()

    if not title or not parent_slug:
        return jsonify(ok=False, error="missing_fields"), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO sub_lessons (parent_slug, title, description, content, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (parent_slug, title, description, content, image_url, status))
    conn.commit()
    return jsonify(ok=True, id=cur.lastrowid)


@admin_bp.get("/api/sub_lessons")
@login_required
def adm_sublesson_list():
    """
    ✅ ดึงรายการหัวข้อย่อยทั้งหมด หรือกรองตาม parent_slug (ใช้ในหน้า Lessons Editor)
    - ถ้าไม่มี parent_slug → ดึงทั้งหมด
    - ถ้ามี parent_slug → กรองเฉพาะหมวดนั้น
    """
    parent_slug = request.args.get("parent_slug") or request.args.get("parent") or ""
    status = (request.args.get("status") or "").strip().lower()

    conn = get_db()
    query = """
        SELECT id, parent_slug, title, description, image_url, status
        FROM sub_lessons
    """
    conditions = []
    params = []

    # ✅ ถ้ามี parent_slug → กรองเฉพาะหมวดนั้น
    if parent_slug:
        conditions.append("parent_slug = ?")
        params.append(parent_slug)

    if status:
        conditions.append("LOWER(status) = ?")
        params.append(status)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY id DESC"

    rows = conn.execute(query, params).fetchall()
    print(f"✅ Sub Lessons filtered by parent_slug={parent_slug or 'ALL'} -> {len(rows)} rows")
    return jsonify(ok=True, items=[dict(r) for r in rows])


@admin_bp.put("/api/sub_lessons/<int:sub_id>")
@login_required
def adm_sublesson_update(sub_id: int):
    """อัปเดตหัวข้อย่อย"""
    data = request.get_json(silent=True) or {}
    parent_slug = (data.get("parent_slug") or "").strip()
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    content = data.get("content") or ""
    image_url = (data.get("image_url") or "").strip()
    status = (data.get("status") or "draft").strip().lower()

    conn = get_db()
    conn.execute("""
        UPDATE sub_lessons
        SET parent_slug=?, title=?, description=?, content=?, image_url=?, status=?
        WHERE id=?
    """, (parent_slug, title, description, content, image_url, status, sub_id))
    conn.commit()
    return jsonify(ok=True)


@admin_bp.delete("/api/sub_lessons/<int:sub_id>")
@login_required
def adm_sublesson_delete(sub_id: int):
    """ลบหัวข้อย่อย"""
    conn = _db()
    conn.execute("DELETE FROM sub_lessons WHERE id=?", (sub_id,))
    conn.commit()
    return jsonify(ok=True)


# -----------------------------
# ✅ Dropdown APIs
# -----------------------------
# ===============================================
# 🔹 API: ดึงหัวข้อหลักทั้งหมด (Lessons)
# ===============================================
@admin_bp.route('/api/parent-lessons')
@login_required
def get_parent_lessons():
    """ดึงหัวข้อหลักทั้งหมด (ใช้ใน dropdown เลือก Lesson)"""
    try:
        with sqlite3.connect('admin/data/admin.db') as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT title, slug FROM lessons")
            items = [dict(r) for r in c.fetchall()]

        return jsonify({'ok': True, 'items': items})
    except Exception as e:
        print("❌ Error loading lessons:", e)
        return jsonify({'ok': False, 'error': str(e)}), 500


# ===============================================
# 🔹 API: ดึงหัวข้อย่อยทั้งหมด (Sub Lessons)
# ===============================================
# ===============================================
# 🔹 API: ดึงรายชื่อหัวข้อย่อย (Sub Lessons)
# ===============================================
@admin_bp.route('/api/sub_lessons')
@login_required
def get_sub_lessons():
    """ดึงรายชื่อหัวข้อย่อย ตาม slug ของหัวข้อหลัก (ใช้ในหน้า Lessons Editor)"""
    parent = request.args.get('parent') or request.args.get('parent_slug')
    try:
        with sqlite3.connect('admin/data/admin.db') as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            # ✅ ถ้ามี parent ให้กรองเฉพาะหัวข้อย่อยของ lesson นั้น
            if parent:
                print(f"📘 กำลังกรอง sub_lessons ที่ parent_slug = {parent}")
                c.execute("SELECT title, slug FROM sub_lessons WHERE parent_slug = ?", (parent,))
            else:
                print("📘 โหลด sub_lessons ทั้งหมด (ไม่มี parent filter)")
                c.execute("SELECT title, slug, parent_slug FROM sub_lessons")

            items = [dict(r) for r in c.fetchall()]

        print(f"✅ โหลด sub_lessons สำเร็จ {len(items)} รายการ")
        return jsonify({'ok': True, 'items': items})

    except Exception as e:
        print("❌ Error loading sub_lessons:", e)
        return jsonify({'ok': False, 'error': str(e)}), 500





# ✅ ALIAS: ให้ Flask รองรับทั้ง sub_lessons และ sub-lessons
@admin_bp.get("/api/sublessons")
@login_required
def adm_sublesson_list_alias():
    return adm_sublesson_list()

# -----------------------------
# ✅ Dashboard Summary (ป้องกัน 404)
# -----------------------------
@admin_bp.route('/api/dashboard-cards')
@login_required
def get_dashboard_cards():
    """Mock ข้อมูล Dashboard ป้องกัน Error 404"""
    try:
        with sqlite3.connect('admin/data/admin.db') as conn:
            conn.row_factory = sqlite3.Row
            c = conn.cursor()

            # ดึงจำนวนสถิติพื้นฐาน
            c.execute("SELECT COUNT(*) FROM lessons")
            lessons = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM sub_lessons")
            sub_lessons = c.fetchone()[0]

            c.execute("SELECT COUNT(*) FROM administrators")
            admins = c.fetchone()[0]

        data = {
            "ok": True,
            "cards": [
                {"title": "บทเรียนหลัก", "count": lessons, "icon": "book"},
                {"title": "บทเรียนย่อย", "count": sub_lessons, "icon": "list"},
                {"title": "ผู้ดูแลระบบ", "count": admins, "icon": "shield-lock"},
            ]
        }
        return jsonify(data)
    except Exception as e:
        print("Error loading dashboard cards:", e)
        return jsonify({'ok': False, 'error': str(e)}), 500
