// ===============================================
// 🔹 Editor: เพิ่ม / ลบ / ลากเรียง block เนื้อหา
// ===============================================
function initLessonEditor() {
  const area = document.getElementById("blockArea");
  if (!area) return;

  const btnText = document.getElementById("addTextBlock");
  const btnImage = document.getElementById("addImageBlock");
  const btnSave = document.getElementById("saveBlocks");

  // ✅ ป้องกัน error ถ้า Sortable ยังไม่โหลด
  if (typeof Sortable !== "undefined") {
    new Sortable(area, { animation: 150, handle: ".block-handle", ghostClass: "dragging" });
  }

  // ✅ เพิ่มบล็อกข้อความ
  btnText?.addEventListener("click", () => {
    area.insertAdjacentHTML("beforeend", `
      <div class="block">
        <div class="block-handle">≡</div>
        <textarea placeholder="พิมพ์ข้อความที่นี่..."></textarea>
        <button class="block-delete">ลบ</button>
      </div>
    `);
  });

  // ✅ เพิ่มบล็อกรูปภาพ
  btnImage?.addEventListener("click", () => {
    area.insertAdjacentHTML("beforeend", `
      <div class="block">
        <div class="block-handle">≡</div>
        <input type="file" accept="image/*" class="img-input" />
        <div class="img-preview"></div>
        <button class="block-delete">ลบ</button>
      </div>
    `);
  });

  // ✅ รวม event delete/preview ไว้ในที่เดียว
  area.addEventListener("click", e => {
    if (e.target.classList.contains("block-delete")) {
      e.target.closest(".block").remove();
    }
  });

  area.addEventListener("change", e => {
    if (e.target.classList.contains("img-input")) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        e.target.nextElementSibling.innerHTML = `<img src="${reader.result}" alt="preview">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // ✅ บันทึก block
  btnSave?.addEventListener("click", () => {
    const blocks = Array.from(area.querySelectorAll(".block")).map(block => {
      const text = block.querySelector("textarea");
      const img = block.querySelector("img");
      return text ? { type: "text", content: text.value.trim() } :
             img ? { type: "image", content: img.src } : null;
    }).filter(Boolean);

    console.log("🧩 Blocks Data:", blocks);
    alert("✅ บันทึกสำเร็จ! (ตรวจดูข้อมูลใน Console)");
  });
}

// ===============================================
// 🔹 Sidebar + Dropdown โหลดครั้งเดียว
// ===============================================
async function initLessonDropdowns() {
  const mainSel = document.getElementById('lesson-parent');
  const subSel = document.getElementById('lesson-sub');
  if (!mainSel || !subSel) {
    console.warn("⚠️ ไม่พบ select สำหรับ Lesson / SubLesson");
    return;
  }

  console.log("🔹 Initializing Dropdowns...");
  mainSel.innerHTML = '<option value="">เลือกหัวข้อหลัก (Lesson)</option>';
  subSel.innerHTML  = '<option value="">เลือกหัวข้อย่อย (Sub Lesson)</option>';

  try {
    const res = await fetch('/admin/api/parent-lessons', { credentials: 'same-origin' });
    const data = await res.json();
    console.log("📦 Main lessons response:", data);

    if (data.ok && Array.isArray(data.items)) {
      const seen = new Set();
      data.items.forEach(item => {
        if (!seen.has(item.slug)) {
          mainSel.insertAdjacentHTML(
            'beforeend',
            `<option value="${item.slug}">${item.title}</option>`
          );
          seen.add(item.slug);
        }
      });
      console.log(`✅ Loaded ${data.items.length} main lessons`);
    }
  } catch (err) {
    console.error("❌ โหลดหัวข้อหลักล้มเหลว:", err);
  }

  // ✅ โหลดหัวข้อย่อยเมื่อเลือก Lesson
  mainSel.addEventListener('change', async e => {
    const slug = e.target.value;
    subSel.innerHTML = '<option value="">เลือกหัวข้อย่อย (Sub Lesson)</option>';
    if (!slug) return;

    console.log(`📘 กำลังโหลดหัวข้อย่อยของ: ${slug}`);
    try {
      const res = await fetch(`/admin/api/sub_lessons?parent=${encodeURIComponent(slug)}`, {
        credentials: 'same-origin'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("📦 Sub lessons response:", data);

      if ((data.ok || data.items) && Array.isArray(data.items) && data.items.length > 0) {
        subSel.innerHTML = '<option value="">เลือกหัวข้อย่อย (Sub Lesson)</option>';
        data.items.forEach(sub => {
          subSel.insertAdjacentHTML(
            'beforeend',
            `<option value="${sub.slug || sub.title}">${sub.title}</option>`
          );
        });
        console.log(`✅ Loaded ${data.items.length} sub-lessons`);
      } else {
        subSel.insertAdjacentHTML('beforeend', '<option disabled>ไม่มีหัวข้อย่อยในหมวดนี้</option>');
        console.log("ℹ️ ไม่มีหัวข้อย่อยในหมวดนี้");
      }
    } catch (err) {
      console.error("❌ โหลดหัวข้อย่อยล้มเหลว:", err);
    }
  });
}

// ===============================================
// ✅ โหลดบทเรียนอัตโนมัติเมื่อเปิดหน้า (ใหม่)
// ===============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing Auto Loader for Lessons...");

  const waitForLessonArea = () => {
    const target = document.getElementById("lesson-list");
    if (target && (typeof loadLessons === "function" || typeof fetchLessons === "function")) {
      console.log("✅ พบ lesson-list และฟังก์ชันพร้อม → โหลดบทเรียน");
      if (typeof loadLessons === "function") loadLessons();
      else fetchLessons();
    } else {
      console.log("⏳ รอให้ loadLessons() หรือ DOM พร้อมก่อน...");
      setTimeout(waitForLessonArea, 500);
    }
  };

  // หน่วงเล็กน้อยให้ DOM ฝั่งซ้ายโหลดก่อน
  setTimeout(waitForLessonArea, 700);
});
// ===============================================
// 🔹 โหลดใหม่เมื่อคลิกเมนู "จัดการเนื้อหาอ่าน"
// ===============================================
document.querySelector('[data-target="lessons-section"]')
  ?.addEventListener('click', () => {
    console.log("📘 เปิดหน้า Lessons Editor → reload dropdowns");
    setTimeout(initLessonDropdowns, 500);
  });
