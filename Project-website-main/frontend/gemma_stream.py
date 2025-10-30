import subprocess
import uuid
from .chat_memory import ensure_chat_table, log_message, get_conversation

ensure_chat_table()

def stream_gemma_response(user_input, session_id=None):
    if not session_id:
        session_id = str(uuid.uuid4())

    history = get_conversation(session_id)
    context = "\n".join([f"{role}: {msg}" for role, msg in history])

    prompt = f"""
    You're a helpful assistance

    {context}
    ผู้ใช้: {user_input}
    Gemma:
    """

    log_message(session_id, "User", user_input)

    process = subprocess.Popen(
        ["ollama", "run", "gemma3:4b"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
        encoding="utf-8"  # ✅ Force UTF-8 decoding
    )

    process.stdin.write(prompt + "\n")
    process.stdin.close()

    for line in process.stdout:
        log_message(session_id, "Gemma", line.strip())
        yield f"data: {line.strip()}\n\n"
