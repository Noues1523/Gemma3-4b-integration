// content.js

let completedSections = [];

document.addEventListener('DOMContentLoaded', () => {
  const chatBtn = document.getElementById('chatbotBtn');
  const openChatFromSection = document.getElementById('openChatFromSection');
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const sections = document.querySelectorAll('.content-area');
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleBtn');
  const navLeft = document.getElementById('nav-left');
  const mainContent = document.getElementById('mainContent');

  // เริ่มต้นด้วย sidebar ปิด
  let sidebarExpanded = false;

  // ฟังก์ชันสำหรับสลับสถานะ sidebar
  function toggleSidebar() {
    sidebarExpanded = !sidebarExpanded;
    
    if (sidebarExpanded) {
      sidebar.classList.add('expanded');
      navLeft.classList.add('expanded');
      mainContent.classList.add('expanded');
      navLeft.setAttribute('aria-expanded', 'true');
    } else {
      sidebar.classList.remove('expanded');
      navLeft.classList.remove('expanded');
      mainContent.classList.remove('expanded');
      navLeft.setAttribute('aria-expanded', 'false');
    }
  }

  // Show/Hide sections function
  function showSection(id) {
    sections.forEach(sec => {
      sec.classList.toggle('hidden', '#' + sec.id !== id);
    });
  }

  // Sidebar navigation
  sidebarItems.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all items
      sidebarItems.forEach(i => i.classList.remove('active'));
      // Add active class to clicked item
      btn.classList.add('active');
      
      // Get route and show corresponding section
      const route = btn.getAttribute('data-route') || '#home';
      showSection(route);
      
      // Close sidebar on mobile after selection
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Desktop sidebar toggle
  navLeft.addEventListener('click', () => {
    if (window.innerWidth > 768) {
      toggleSidebar();
    } else {
      // Mobile sidebar toggle
      sidebar.classList.toggle('open');
    }
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !navLeft.contains(e.target) && 
        sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
  });

  // Chatbot functions with enhanced UX
function openChatbot() {
  const userConfirm = confirm('เปิด AI Chatbot ใหม่ในแท็บใหม่?');
  if (userConfirm) {
    window.open('/chatbot', '_blank');  // ✅ Redirects to your Flask chatbot.html
  }
}

  // Add click event listeners for chatbot buttons
  chatBtn.addEventListener('click', openChatbot);
  if (openChatFromSection) {
    openChatFromSection.addEventListener('click', openChatbot);
  }

  // Add keyboard navigation support
  document.addEventListener('keydown', (e) => {
    // ESC to close mobile sidebar
    if (e.key === 'Escape' && window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  });

  // Initialize page
  showSection('#home');
});

/**
 * คลิก "เรียนเสร็จ" แต่ละหัวข้อ
 */
function completeSection(button, sectionNumber) {
  if (!button.classList.contains('completed')) {
    button.classList.add('completed');
    button.textContent = 'เรียนเสร็จแล้ว ✓';
    button.style.transform = 'scale(1.1)';
    setTimeout(() => button.style.transform = 'scale(1)', 200);

    if (!completedSections.includes(sectionNumber)) {
      completedSections.push(sectionNumber);
    }

    updateProgress();
    scrollToNextSection(sectionNumber);
  }
}

/**
 * อัปเดต Progress Indicator
 */
function updateProgress() {
  const total = document.querySelectorAll('.topic-section').length;
  const done = completedSections.length;
  const next = done + 1 <= total ? done + 1 : total;
  const el = document.querySelector('.progress-indicator');
  if (!el) return;
  el.textContent = `${next} / ${total}`;

  if (done === total) {
    el.style.backgroundColor = '#28a745';
    el.style.color = '#fff';
    showCompletionMessage();
  }
}

/**
 * เลื่อนไปยังหัวข้อถัดไป
 */
function scrollToNextSection(currentSection) {
  const sections = document.querySelectorAll('.topic-section');
  const idx = currentSection; // เพราะ array 0-based
  if (idx < sections.length) {
    sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * แสดง overlay ยินดี + ปุ่ม "เรียนซ้ำอีกรอบ" (ซ้าย) และ "ไปบทเรียนต่อไป" (ขวา)
 */
function showCompletionMessage() {
  setTimeout(() => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.8);display:flex;' +
      'justify-content:center;align-items:center;z-index:10000;';
    overlay.innerHTML = `
      <div style="
        background:#fff;
        padding:2rem;
        border-radius:12px;
        text-align:center;
        max-width:400px;
        box-shadow:0 4px 20px rgba(0,0,0,0.3);
      ">
        <h3>🎉 ยินดีด้วย! 🎉</h3>
        <p>คุณได้เรียนจบบทเรียนนี้เรียบร้อยแล้ว</p>
        <div style="
          margin-top:1.5rem;
          display:flex;
          justify-content:space-between;
          gap:0.5rem;
        ">
          <button id="retryBtn" style="
            background:#FFA500;
            color:#fff;
            border:none;
            padding:0.8rem 1.5rem;
            border-radius:6px;
            cursor:pointer;
            font-size:1rem;
          ">เรียนซ้ำอีกรอบ</button>
          <button id="nextLessonBtn" style="
            background:#0a2540;
            color:#fff;
            border:none;
            padding:0.8rem 1.5rem;
            border-radius:6px;
            cursor:pointer;
            font-size:1rem;
          ">ไปบทเรียนต่อไป</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // ปิด overlay ถ้าคลิกรอบนอก
    overlay.addEventListener('click', e => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    // ไปบทเรียนต่อไป
    document.getElementById('nextLessonBtn')
      .addEventListener('click', goToNextLesson);

    // เรียนซ้ำ: รีเซ็ตคะแนน + สี progress + ปุ่มกลับคืนสถานะเดิม
    document.getElementById('retryBtn')
      .addEventListener('click', () => {
        // รีเซ็ตตัวแปร
        completedSections = [];

        // คืนสถานะปุ่มในแต่ละหัวข้อ
        document.querySelectorAll('.complete-btn').forEach(btn => {
          btn.classList.remove('completed');
          btn.textContent = 'เรียนเสร็จ';
        });

        // รีเซ็ต Progress Indicator สีและข้อความ
        const el = document.querySelector('.progress-indicator');
        if (el) {
          el.textContent = `1 / ${document.querySelectorAll('.topic-section').length}`;
          el.style.backgroundColor = '';
          el.style.color = '';
        }

        // เลื่อนกลับไปบนสุด
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // ปิด overlay
        document.body.removeChild(overlay);
      });
  }, 500);
}

/**
 * ฟังก์ชันตัวอย่างสำหรับไปบทเรียนถัดไป
 */
function goToNextLesson() {
  window.location.href = 'lesson-2.html';
}