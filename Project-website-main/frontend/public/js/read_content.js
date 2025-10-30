document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleBtn");
  const navLeft = document.getElementById("nav-left");
  const mainContent = document.getElementById("mainContent");
  const sidebarItems = document.querySelectorAll(".sidebar-item");

  // เริ่มต้นด้วย sidebar ปิด
  let sidebarExpanded = false;

  // ฟังก์ชัน Toggle Sidebar
  function toggleSidebar() {
    sidebarExpanded = !sidebarExpanded;
    sidebar.classList.toggle("expanded", sidebarExpanded);
    navLeft.classList.toggle("expanded", sidebarExpanded);
    mainContent.classList.toggle("expanded", sidebarExpanded);
    navLeft.setAttribute("aria-expanded", sidebarExpanded ? "true" : "false");
  }

  // คลิกที่ปุ่ม Toggle (desktop/mobile)
  navLeft?.addEventListener("click", () => {
    if (window.innerWidth > 768) {
      // Desktop: ขยาย/ย่อ sidebar
      toggleSidebar();
    } else {
      // Mobile: เปิด/ปิด sidebar
      sidebar.classList.toggle("open");
    }
  });

  // คลิกที่ปุ่ม toggleBtn (สำหรับเผื่อใช้)
  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.innerWidth > 768) {
      toggleSidebar();
    } else {
      sidebar.classList.toggle("open");
    }
  });

  // ปิด sidebar เมื่อคลิกนอกพื้นที่ (mobile only)
  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 768 &&
      !sidebar.contains(e.target) &&
      !navLeft.contains(e.target) &&
      sidebar.classList.contains("open")
    ) {
      sidebar.classList.remove("open");
    }
  });

  // จัดการ Sidebar Items
  sidebarItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      // ลบ active จากทุกปุ่ม
      sidebarItems.forEach((i) => i.classList.remove("active"));
      
      // เพิ่ม active ให้ปุ่มที่ถูกคลิก
      btn.classList.add("active");

      // ถ้าเป็น mobile ให้ปิด sidebar
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("open");
      }
    });
  });

  // Keyboard shortcut (ESC เพื่อปิด sidebar บน mobile)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && window.innerWidth <= 768) {
      sidebar.classList.remove("open");
    }
  });

  // Smooth scroll สำหรับลิงก์ภายในหน้า
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href !== "#" && document.querySelector(href)) {
        e.preventDefault();
        document.querySelector(href).scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });

  // เพิ่ม animation เมื่อ scroll
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1 }
  );

  // สังเกตการณ์ content-block
  document.querySelectorAll(".content-block").forEach((block) => {
    block.style.opacity = "0";
    block.style.transform = "translateY(20px)";
    block.style.transition = "all 0.6s ease";
    observer.observe(block);
  });

  // ✅ Highlight Active Sidebar ตาม URL
  const currentPath = window.location.pathname;
  sidebarItems.forEach((btn) => {
    const route = btn.getAttribute("data-route");
    if (route && currentPath.includes(route) && route !== "/") {
      btn.classList.add("active");
    } else if (route === "/" && currentPath === "/") {
      btn.classList.add("active");
    }
  });
});