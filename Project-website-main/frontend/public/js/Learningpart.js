let currentTheme = 'modern';
let sidebarExpanded = false;

// Theme Management
function toggleTheme() {
    const body = document.body;
    if (currentTheme === 'modern') {
        body.className = 'hacker-theme';
        currentTheme = 'hacker';
        startCodeRain();
    } else {
        body.className = 'modern-theme';
        currentTheme = 'modern';
        stopCodeRain();
    }
}

// Code Rain Effect
function createCodeRain() {
    const codeRain = document.getElementById('codeRain');
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    for (let i = 0; i < 50; i++) {
        const column = document.createElement('div');
        column.className = 'code-column';
        column.style.left = Math.random() * 100 + '%';
        column.style.animationDuration = (Math.random() * 3 + 2) + 's';
        column.style.animationDelay = Math.random() * 2 + 's';
        
        let text = '';
        for (let j = 0; j < 20; j++) {
            text += chars[Math.floor(Math.random() * chars.length)] + '<br>';
        }
        column.innerHTML = text;
        
        codeRain.appendChild(column);
    }
}

function startCodeRain() {
    createCodeRain();
}

function stopCodeRain() {
    const codeRain = document.getElementById('codeRain');
    codeRain.innerHTML = '';
}

// Sidebar Management - นำมาจากไฟล์หลัก
function toggleSidebar() {
    sidebarExpanded = !sidebarExpanded;
    const sidebar = document.getElementById('sidebar');
    const navLeft = document.getElementById('nav-left');
    const mainContent = document.getElementById('mainContent');
    
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

// Lesson Navigation
function goToLesson(lessonId) {
    const lessons = {
        1: { title: "พื้นฐาน HTML", status: "completed" },
        2: { title: "CSS Styling", status: "completed" },
        3: { title: "JavaScript เบื้องต้น", status: "completed" },
        4: { title: "React Framework", status: "current" },
        5: { title: "Node.js Backend", status: "locked" }
    };

    const lesson = lessons[lessonId];
    
    if (lesson.status === 'locked') {
        alert('บทเรียนนี้ยังไม่สามารถเข้าถึงได้ กรุณาเรียนบทก่อนหน้าให้เสร็จก่อน');
        return;
    }
    
    alert(`กำลังไปยังบทเรียน: ${lesson.title}`);
}

// Chatbot functions
function openChatbot() {
    const userConfirm = confirm('เปิด AI Chatbot ใหม่ในแท็บใหม่?');
    if (userConfirm) {
        window.open('https://chat.openai.com/', '_blank');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Desktop sidebar toggle
    document.getElementById('nav-left').addEventListener('click', () => {
        if (window.innerWidth > 768) {
            toggleSidebar();
        } else {
            // Mobile sidebar toggle
            document.getElementById('sidebar').classList.toggle('open');
        }
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const navLeft = document.getElementById('nav-left');
        
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !navLeft.contains(e.target) && 
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });

    // Chatbot button
    document.getElementById('chatbotBtn').addEventListener('click', openChatbot);

    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(btn => {
        btn.addEventListener('click', () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            btn.classList.add('active');
             
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });

    // Add keyboard navigation support
    document.addEventListener('keydown', (e) => {
        // ESC to close mobile sidebar
        if (e.key === 'Escape' && window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    });
});