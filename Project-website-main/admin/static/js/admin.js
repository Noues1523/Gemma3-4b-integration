// MERGED_PROJECT/admin/static/js/admin.js
(() => {
  // ---------- helpers ----------
  const $id = (s) => document.getElementById(s);
  const API = async (path, opts = {}) => {
    const res = await fetch(`/admin${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  };

  const loginScreen = $id('login-screen');
  const appShell    = $id('admin-app');
  const loginForm   = $id('login-form');
  const loginError  = $id('login-error');

  const showLogin = () => { loginScreen.style.display = 'flex'; appShell.style.display = 'none'; };
  const showApp   = () => { loginScreen.style.display = 'none'; appShell.style.display = 'grid'; };

  // ---------- session gate ----------
  async function checkSessionAndShow() {
    const { ok, data } = await API('/api/me');
    if (ok && data?.ok && data.user) {
      showApp();
      await loadDashboard();
      return true;
    } else {
      showLogin();
      return false;
    }
  }

  // ---------- login ----------
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const username = $id('username').value.trim();
      const password = $id('password').value;

      const { ok, data } = await API('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (ok && data?.ok) {
        showApp();
        await loadDashboard();
      } else {
        loginError.textContent = (data && (data.error || data.message)) || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        loginError.style.display = 'block';
      }
    });
  }

  // ---------- logout ----------
  $id('logout-btn')?.addEventListener('click', async () => {
    await API('/api/logout', { method: 'POST' });
    showLogin();
  });

  // ---------- nav & section switch ----------
  (function setupNav() {
    const nav = $id('nav');
    if (!nav) return;
    const sections = Array.from(document.querySelectorAll('main section'));
    const show = (id) => {
      sections.forEach(s => s.hidden = (s.id !== id));
      nav.querySelectorAll('li').forEach(li => li.classList.toggle('active', li.dataset.target === id));
    };
    nav.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-target]');
      if (!li) return;
      const id = li.dataset.target;
      show(id);
      if (id === 'dashboard-section') loadDashboard();
      if (id === 'content-section') {
  // ✅ แจ้ง content.js ให้โหลดเอง (แทนการโหลดตรงนี้)
  document.dispatchEvent(new Event('content-section-opened'));
  console.log('📢 content-section-opened event dispatched');
}

      if (id === 'quiz-section')      window.loadQuizList?.();
      if (id === 'analytics-section') window.loadAnalytics?.();
      if (id === 'users-section')     window.loadAdmins?.();
    });
    show('dashboard-section');
  })();

  // ---------- sidebar toggle ----------
  (function setupSidebar() {
    const btn = $id('sidebar-toggle');
    if (!btn) return;
    const mq = window.matchMedia('(max-width: 1060px)');
    btn.addEventListener('click', () => {
      if (mq.matches) document.body.classList.toggle('sidebar-open');
      else document.body.classList.toggle('sidebar-collapsed');
    });
    document.querySelector('.sidebar-scrim')?.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  })();

  // ---------- dashboard ----------
  async function loadDashboard() {
    const { ok, data } = await API('/api/dashboard-cards');
    if (!ok || !data?.ok) return;

    const wrap = $id('dashboard-cards');
    if (wrap) {
      wrap.innerHTML = (data.cards || []).map(c => {
        const isDown = String(c.delta || '').trim().startsWith('-');
        return `
          <div class="stat-card">
            <div class="stat-icon"><i class="bi ${c.icon || 'bi-graph-up'}"></i></div>
            <div class="stat-title">${c.label || c.title || ''}</div>
            <div class="stat-value">${c.value ?? ''}</div>
            ${c.delta ? `<div class="stat-delta ${isDown ? 'down' : ''}">
              <i class="bi ${isDown ? 'bi-caret-down-fill' : 'bi-caret-up-fill'}"></i> ${c.delta}
            </div>` : ''}
          </div>
        `;
      }).join('');
    }

    const ts = new Date();
    const updated = $id('dash-updated');
    if (updated) {
      updated.textContent =
        ts.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' +
        ts.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
  }
  window.loadDashboard = loadDashboard;

  // ---------- content list ----------
  async function loadContentList() {
    const { ok, data } = await API('/api/lessons');
    if (!ok || !data?.ok) {
      console.error("โหลดรายการไม่สำเร็จ:", data);
      return;
    }

    const wrap = $id('ct-list');  // ✅ ตรงกับ HTML แล้ว
    if (!wrap) return;

    wrap.innerHTML = (data.items || []).map(item => `
      <div class="lesson-card">
        <div class="lesson-title">${item.title || ''}</div>
        <div class="lesson-summary">${item.summary || ''}</div>
        <div class="lesson-updated">${item.updated_at || ''}</div>
      </div>
    `).join('');
  }
  window.loadContentList = loadContentList;

  // ---------- boot ----------
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') checkSessionAndShow();
  });
  checkSessionAndShow();
})();

