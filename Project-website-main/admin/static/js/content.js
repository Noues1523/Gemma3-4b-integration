// admin/static/js/content.js — เวอร์ชันปรับปรุง (Clean + Optimized)
(() => {
  const $ = s => document.querySelector(s);

  const listEl   = $('#ct-list');
  const btnCreate= $('#ct-create');
  const btnSave  = $('#ct-save');
  const titleEl  = $('#ct-title');
  const slugEl   = $('#ct-slug');
  const statusEl = $('#ct-status-edit');
  const editorEl = $('#ct-editor');

  // 🔹 Modal Elements
  const deleteModal = $('#delete-modal');
  const deleteConfirmBtn = $('#delete-confirm');
  const deleteCancelBtn = $('#delete-cancel');
  const successModal = $('#success-modal');
  const successMessage = $('#success-message');
  const successCloseBtn = $('#success-close');

  let currentId = null;
  let deleteTargetId = null;
  let deleteTargetTitle = '';

  // -------------------------------------------------------
  // 🔹 Utilities
  // -------------------------------------------------------
  const escapeHtml = s =>
    (s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  const autoSlug = s => (s || '').toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-').replace(/^\-|\-$/g, '');

  const showSuccessModal = (message, isError = false) => {
    successMessage.textContent = message;
    const modalDialog = successModal.querySelector('.modal-dialog');
    const modalTitle = successModal.querySelector('.modal-title');
    modalDialog.style.background = isError
      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    modalTitle.textContent = isError ? 'เกิดข้อผิดพลาด!' : 'สำเร็จ!';
    successModal.style.display = 'flex';
    setTimeout(() => successModal.classList.add('fade-out'), 2500);
    setTimeout(() => {
      successModal.style.display = 'none';
      successModal.classList.remove('fade-out');
    }, 2900);
  };

  const hideSuccessModal = () => {
    successModal.style.display = 'none';
    successModal.classList.remove('fade-out');
  };

  const showDeleteModal = (lessonId, lessonTitle) => {
    deleteTargetId = lessonId;
    deleteTargetTitle = lessonTitle;
    $('#delete-lesson-name').textContent = lessonTitle;
    deleteModal.style.display = 'flex';
  };
  const hideDeleteModal = () => {
    deleteTargetId = null;
    deleteModal.style.display = 'none';
  };

  // -------------------------------------------------------
  // 🔹 Load List (Single Fetch)
  // -------------------------------------------------------
  async function loadList() {
    if (!listEl) return;
    listEl.innerHTML = '<div class="hint">กำลังโหลด...</div>';
    try {
      const res = await fetch('/admin/api/lessons', { credentials:'same-origin', cache:'no-cache' });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      listEl.innerHTML = '';

      if (!data.items?.length) {
        listEl.innerHTML = '<div class="hint">ยังไม่มีบทเรียน</div>';
        return;
      }

      const frag = document.createDocumentFragment();
      data.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ct-row';

        const content = document.createElement('div');
        content.className = 'ct-row-content';
        content.innerHTML = `
          <div class="ct-title">${escapeHtml(item.title)}</div>
          <div class="ct-meta">${item.status} • ${item.slug || ''}</div>
        `;

        const del = document.createElement('button');
        del.className = 'ct-delete-btn';
        del.innerHTML = '<i class="bi bi-trash"></i>';
        del.title = 'ลบบทเรียน';

        del.addEventListener('click', e => {
          e.stopPropagation();
          showDeleteModal(item.id, item.title);
        });

        content.addEventListener('click', () => openItem(item.id));
        row.append(content, del);
        frag.appendChild(row);
      });

      listEl.appendChild(frag);
      console.log(`✅ Loaded ${data.items.length} lessons`);
    } catch (err) {
      console.error('❌ Load list failed:', err);
      listEl.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลด</div>';
    }
  }

  // -------------------------------------------------------
  // 🔹 Open Lesson
  // -------------------------------------------------------
  async function openItem(id) {
    try {
      const res = await fetch(`/admin/api/lessons/${id}`, { credentials:'same-origin' });
      if (!res.ok) throw new Error('Not found');
      const { item } = await res.json();
      currentId = item.id;
      titleEl.value = item.title || '';
      slugEl.value = item.slug || '';
      statusEl.value = (item.status || 'draft')[0].toUpperCase() + (item.status || 'draft').slice(1);
      editorEl.innerHTML = item.content || '';
    } catch (err) {
      showSuccessModal('ไม่สามารถโหลดบทเรียนได้', true);
    }
  }

  // -------------------------------------------------------
  // 🔹 Save / Update Lesson
  // -------------------------------------------------------
  async function saveLesson() {
    const title = titleEl.value.trim();
    if (!title) return showSuccessModal('กรุณากรอกชื่อบทเรียน', true);

    const payload = {
      title,
      slug: slugEl.value.trim(),
      status: (statusEl.value || 'draft').toLowerCase(),
      content: editorEl.innerHTML,
      summary: editorEl.innerText.trim().slice(0, 160)
    };
    const method = currentId ? 'PUT' : 'POST';
    const url = currentId ? `/admin/api/lessons/${currentId}` : '/admin/api/lessons';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      if (method === 'POST') currentId = data.id;
      showSuccessModal(`${method === 'POST' ? 'สร้าง' : 'บันทึก'} "${title}" สำเร็จ`);
      await loadList();
      if (method === 'POST') resetForm();
    } catch (err) {
      showSuccessModal('บันทึกไม่สำเร็จ', true);
    }
  }

  // -------------------------------------------------------
  // 🔹 Delete Lesson
  // -------------------------------------------------------
  async function confirmDelete() {
    if (!deleteTargetId) return hideDeleteModal();
    try {
      const res = await fetch(`/admin/api/lessons/${deleteTargetId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error('Delete failed');
      hideDeleteModal();
      await loadList();
      resetForm();
      showSuccessModal(`ลบ "${deleteTargetTitle}" สำเร็จ`);
    } catch (err) {
      showSuccessModal('ไม่สามารถลบบทเรียนได้', true);
    }
  }

  // -------------------------------------------------------
  // 🔹 Reset Form
  // -------------------------------------------------------
  function resetForm() {
    currentId = null;
    titleEl.value = '';
    slugEl.value = '';
    statusEl.value = 'Draft';
    editorEl.innerHTML = '';
    console.log('🧹 Reset form complete');
  }

  // -------------------------------------------------------
  // 🔹 Initialize UI + Events
  // -------------------------------------------------------
  function initContentManager() {
    console.log('🚀 Initializing content manager...');
    if (!listEl) return;

    // ป้องกันการ bind ซ้ำ
    if (btnCreate._init) return;
    btnCreate._init = true;

    btnCreate.addEventListener('click', resetForm);
    btnSave.addEventListener('click', saveLesson);
    deleteConfirmBtn.addEventListener('click', confirmDelete);
    deleteCancelBtn.addEventListener('click', hideDeleteModal);
    successCloseBtn?.addEventListener('click', hideSuccessModal);
    deleteModal.addEventListener('click', e => { if (e.target === deleteModal) hideDeleteModal(); });

    titleEl.addEventListener('input', () => {
      if (!slugEl.value.trim()) slugEl.value = autoSlug(titleEl.value);
    });

    loadList(); // โหลดรายการทันที
  }

  // -------------------------------------------------------
  // 🔹 Run Once
  // -------------------------------------------------------
  document.addEventListener('DOMContentLoaded', initContentManager);
})();
