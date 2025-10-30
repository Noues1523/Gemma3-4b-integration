document.addEventListener('DOMContentLoaded', () => {
  const chatBtn = document.getElementById('chatbotBtn');
  const openChatFromSection = document.getElementById('openChatFromSection');
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const sections = document.querySelectorAll('.content-area');
  const sidebar = document.getElementById('sidebar');
  const navLeft = document.getElementById('nav-left');
  const mainContent = document.getElementById('mainContent');

  // เริ่มต้นด้วย sidebar ปิด
  let sidebarExpanded = false;

  function toggleSidebar() {
    sidebarExpanded = !sidebarExpanded;
    sidebar.classList.toggle('expanded', sidebarExpanded);
    navLeft.classList.toggle('expanded', sidebarExpanded);
    mainContent.classList.toggle('expanded', sidebarExpanded);
    navLeft.setAttribute('aria-expanded', sidebarExpanded ? 'true' : 'false');
  }

  // แสดง/ซ่อน section
  function showSection(id) {
    sections.forEach(sec => {
      sec.classList.toggle('hidden', '#' + sec.id !== id);
    });
  }

  // นำทางด้วย sidebar
  sidebarItems.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      btn.classList.add('active');
      const route = btn.getAttribute('data-route') || '#home';
      showSection(route);
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });

  // toggle sidebar (desktop/mobile)
  navLeft?.addEventListener('click', () => {
    if (window.innerWidth > 768) toggleSidebar();
    else sidebar.classList.toggle('open');
  });

  // ปิด sidebar เมื่อคลิกนอกพื้นที่ (mobile)
  document.addEventListener('click', (e) => {
    if (
      window.innerWidth <= 768 &&
      !sidebar.contains(e.target) &&
      !navLeft.contains(e.target) &&
      sidebar.classList.contains('open')
    ) {
      sidebar.classList.remove('open');
    }
  });

  // Chatbot
  function openChatbot() {
    if (confirm('🤖 เปิด AI Chatbot ใหม่ในแท็บใหม่?')) {
      window.open('/chatbot', '_blank');
    }
  }
  chatBtn?.addEventListener('click', openChatbot);
  openChatFromSection?.addEventListener('click', openChatbot);

  // -------- ปรับปรุงส่วนนี้ --------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.card-btn');
    if (!el) return;

    // ✅ ปล่อยลิงก์ /mainmenu/<slug> หรือ /lesson/<slug> ให้ทำงานปกติ
    const href = el.getAttribute('href') || '';
    if (href.startsWith('/mainmenu/') || href.startsWith('/lesson/')) return;

    // ถ้าไม่มี data-action ก็ไม่ต้องทำอะไร
    const action = el.dataset.action;
    if (!action) return;

    // ดักเฉพาะปุ่ม action
    e.preventDefault();

    const cardName = el.closest('.card')?.getAttribute('data-name') || '';

    if (action === 'start') {
      el.style.transform = 'scale(0.95)';
      el.innerHTML = '⏳ กำลังเข้าสู่ระบบ...';
      setTimeout(() => {
        el.style.transform = '';
        el.innerHTML = '📖 เพิ่มเติม';
        showCourseDetails(cardName);
      }, 1000);
    }
  });
  // ----------------------------------

  // แสดงรายละเอียดคอร์ส (demo static)
  function showCourseDetails(courseName) {
    const details = {
      'ทั่วไป': {
        title: '🌐 หมวดบุคคลทั่วไป',
        description: 'เรียนรู้การใช้งานอินเทอร์เน็ตอย่างปลอดภัย รู้จักการป้องกันตัวเองจากภัยคุกคามออนไลน์',
        topics: [
          '🔍 การสร้างรหัสผ่านที่แข็งแกร่ง',
          '📧 การจดจำอีเมลหลอกลวง',
          '🛡️ การใช้งานโซเชียลมีเดียอย่างปลอดภัย',
          '💳 การทำธุรกรรมออนไลน์'
        ]
      },
      'ผู้ดูแลระบบ': {
        title: '👨‍💻 การจัดการผู้ใช้',
        description: 'ความรู้และทักษะที่จำเป็นสำหรับผู้ดูแลระบบ',
        topics: [
          '⚙️ การตั้งค่าระบบความปลอดภัย',
          '👥 การจัดการสิทธิ์ผู้ใช้',
          '🔍 การตรวจสอบและประเมินความเสี่ยง',
          '📋 การสร้างนโยบายความปลอดภัย'
        ]
      }
    };

    const courseInfo = details[courseName];
    if (!courseInfo) return;

    const topicsList = courseInfo.topics.map(t => `• ${t}`).join('\n');
    alert(`${courseInfo.title}

📖 รายละเอียด:
${courseInfo.description}

📚 หัวข้อที่จะได้เรียนรู้:
${topicsList}

✅ บันทึกลงในรายการโปรดแล้ว!`);
    console.log(`บันทึก "${courseName}" ลงในรายการโปรดแล้ว`);
  }

  // คีย์บอร์ดชอร์ตคัต
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  });

  // เริ่มต้น
  showSection('#home');
});
