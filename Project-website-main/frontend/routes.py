import sqlite3
from flask import Blueprint, render_template, current_app,request, Response
from .gemma_stream import stream_gemma_response  # 👈 make sure this file exists

front_bp = Blueprint(
    "frontend",
    __name__,
    template_folder="templates",
    static_folder="public"
)

# ===============================
# /chatbot: แสดงหน้า UI ของแชทบอท
# ===============================
@front_bp.route("/chatbot")
def chatbot_ui():
    return render_template("chatbot.html")

@front_bp.route("/chatbot/stream", methods=["POST"])
def chatbot_stream():
    data = request.get_json()
    user_input = data.get("message", "")
    session_id = data.get("session_id", None)
    return Response(stream_gemma_response(user_input, session_id), mimetype="text/event-stream")

# ===============================
# หน้าแรก: แสดง "หมวดใหญ่" (lessons ที่เป็นหมวด)
# ===============================
@front_bp.route("/")
def index():
    db_path = current_app.config["ADMIN_DB_PATH"]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    lessons = conn.execute(
        """
        SELECT id, title, slug, summary, cover_image
        FROM lessons
        WHERE status='published'
        ORDER BY id DESC
        """
    ).fetchall()
    conn.close()

    return render_template("maincontent.html", lessons=lessons)


# ===============================
# mainmenu/<slug>: แสดง "บทเรียนย่อย" ของหมวดนั้น (จากตาราง sub_lessons)
# ===============================
@front_bp.route("/mainmenu/<slug>")
def mainmenu(slug):
    db_path = current_app.config["ADMIN_DB_PATH"]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # ✅ หา parent (บทเรียนหลัก)
    parent = conn.execute(
        "SELECT id, title, slug, summary, cover_image FROM lessons WHERE slug=? AND status='published' LIMIT 1",
        (slug,)
    ).fetchone()

    if not parent:
        conn.close()
        return render_template("404.html"), 404

    # ✅ ดึงหัวข้อย่อย โดยอิง parent_slug
    sub_lessons = conn.execute(
        """
        SELECT id, title, description AS summary, image_url AS cover_image
        FROM sub_lessons
        WHERE parent_slug=? AND status='published'
        ORDER BY id DESC
        """,
        (slug,)
    ).fetchall()

    conn.close()
    return render_template("mainmenu.html", parent=parent, lessons=sub_lessons)



# ===============================
# lesson/<sub_slug>: แสดง "เนื้อหาเต็ม" ของบทเรียนย่อย 1 เรื่อง
# ===============================
@front_bp.route("/lesson/<int:sub_id>")
def lesson(sub_id):
    db_path = current_app.config["ADMIN_DB_PATH"]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    print(f"[DEBUG] เปิดหน้าเนื้อหาเต็มของ sub_lesson id = {sub_id}")

    # ✅ แก้ query ให้ใช้ id แทน slug เพราะ sub_lessons ไม่มี slug
    item = conn.execute(
        """
        SELECT s.id, s.title, s.content, s.description, s.image_url,
               l.title AS parent_title, l.slug AS parent_slug
        FROM sub_lessons s
        LEFT JOIN lessons l ON s.parent_slug = l.slug
        WHERE s.id=? AND s.status='published'
        LIMIT 1
        """,
        (sub_id,)
    ).fetchone()

    conn.close()

    if not item:
        print(f"[WARN] ไม่พบ sub_lesson id={sub_id}")
        return render_template("404.html"), 404

    print(f"[DEBUG] โหลดบทเรียนย่อยสำเร็จ: {item['title']}")
    return render_template("lesson.html", lesson=item)
