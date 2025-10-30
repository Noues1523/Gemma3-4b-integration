// admin/static/js/sub_lessons.js
(() => {
  const $ = s => document.querySelector(s);

  // ✅ อ้างอิง element หลักในหน้า sublessons-section
  const listEl   = $('#sub-list');
  const btnCreate= $('#sub-create');
  const btnSave  = $('#sub-save');
  const btnDelete= $('#sub-delete');
  const titleEl  = $('#sub-title');
  const slugEl   = $('#sub-slug');
  const parentEl = $('#sub-parent');
  const imgEl    = $('#sub-image');
  const statusEl = $('#sub-status-edit');
  const editorEl = $('#sub-editor');
  const descEl   = $('#sub-desc'); // ✅ ป้องกัน null
  const filterParentEl = $('#filter-parent');
  const filterStatusEl = $('#sub-status');

  // ✅ modal และ success
  const deleteModal = $('#delete-modal');
  const deleteConfirmBtn = $('#delete-confirm');
  const deleteCancelBtn = $('#delete-cancel');
  const successModal = $('#success-modal');
  const successMessage = $('#success-message');

  let currentId = null;
  let deleteTargetId = null;
  let deleteTargetTitle = '';

  // =============================================
  // Toolbar
  document.querySelectorAll('#sublessons-section .editor-toolbar button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      document.execCommand(cmd, false, null);
      editorEl.focus();
    });
  });

  // =============================================
  // โหลดหัวข้อหลักทั้งหมดมาใส่ใน select + filter
  async function loadParentList() {
    try {
      console.log('🔄 กำลังโหลดหัวข้อหลักจาก /admin/api/lessons ...');
      const res = await fetch('/admin/api/lessons');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      parentEl.innerHTML = '<option value="">เลือกหัวข้อหลัก (parent_slug)</option>';
      filterParentEl.innerHTML = '<option value="">หมวดหัวข้อหลัก</option>';

      if (!data.items || data.items.length === 0) {
        parentEl.innerHTML += '<option value="">(ไม่พบหัวข้อหลัก)</option>';
        filterParentEl.innerHTML += '<option value="">(ไม่พบหัวข้อหลัก)</option>';
        return;
      }

      data.items.forEach(l => {
        const opt1 = document.createElement('option');
        opt1.value = l.slug;
        opt1.textContent = l.title;
        parentEl.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = l.slug;
        opt2.textContent = l.title;
        filterParentEl.appendChild(opt2);
      });

      console.log(`✅ โหลดหัวข้อหลักสำเร็จ (${data.items.length} รายการ)`);
    } catch (err) {
      console.error('❌ โหลดหัวข้อหลักไม่สำเร็จ:', err);
      parentEl.innerHTML = '<option value="">(โหลดไม่สำเร็จ)</option>';
      filterParentEl.innerHTML = '<option value="">(โหลดไม่สำเร็จ)</option>';
    }
  }

  // =============================================
  // โหลดรายการหัวข้อย่อยทั้งหมด
  async function loadList() {
    listEl.innerHTML = '<div class="hint">กำลังโหลด...</div>';

    const selectedParent = filterParentEl ? filterParentEl.value : '';
    const selectedStatus = filterStatusEl ? filterStatusEl.value : '';

    let url = '/admin/api/sub_lessons';
    const params = [];
    if (selectedParent) params.push(`parent_slug=${encodeURIComponent(selectedParent)}`);
    if (selectedStatus) params.push(`status=${encodeURIComponent(selectedStatus)}`);
    if (params.length) url += `?${params.join('&')}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      listEl.innerHTML = '';

      if (!data.items || data.items.length === 0) {
        listEl.innerHTML = '<div class="hint">ไม่พบหัวข้อย่อยที่ตรงกับเงื่อนไข</div>';
        return;
      }

      data.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ct-row';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'ct-row-content';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'ct-title';
        titleDiv.textContent = item.title;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'ct-meta';
        metaDiv.textContent = `${item.parent_slug} • ${item.status}`;

        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(metaDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ct-delete-btn';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';

        deleteBtn.addEventListener('click', e => {
          e.stopPropagation();
          showDeleteModal(item.id, item.title);
        });

        row.appendChild(contentDiv);
        row.appendChild(deleteBtn);
        contentDiv.addEventListener('click', () => openItem(item.id));
        listEl.appendChild(row);
      });

      console.log(`✅ โหลดหัวข้อย่อยสำเร็จ (${data.items.length} รายการ)`);
    } catch (err) {
      listEl.innerHTML = '<div class="error">โหลดไม่สำเร็จ</div>';
      console.error('❌ loadList error:', err);
    }
  }

  // =============================================
  // โหลดข้อมูลหัวข้อเดียว
  async function openItem(id) {
    try {
      console.log(`📂 เปิดหัวข้อย่อย ID: ${id}`);
      const res = await fetch(`/admin/api/sub_lessons/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const item = data.item;

      currentId = item.id;
      parentEl.value = item.parent_slug;
      titleEl.value = item.title;
      slugEl.value = item.slug || '';
      imgEl.value = item.image_url || '';
      statusEl.value = item.status[0].toUpperCase() + item.status.slice(1);
      if (descEl) descEl.value = item.description || '';
      editorEl.innerHTML = item.content || '';

      console.log(`✅ โหลดหัวข้อย่อย: ${item.title}`);
    } catch (err) {
      console.error('❌ openItem error:', err);
    }
  }

  // =============================================
  // สร้าง / อัปเดต
  btnSave.addEventListener('click', async () => {
    const payload = {
      parent_slug: parentEl.value.trim(),
      title: titleEl.value.trim(),
      slug: slugEl.value.trim(),
      image_url: imgEl.value.trim(),
      status: (statusEl.value || 'Draft').toLowerCase(),
      description: descEl ? descEl.value.trim() : '',
      content: editorEl.innerHTML
    };

    // Validation
    if (!payload.title || !payload.parent_slug || !payload.slug) {
      alert('⚠️ กรุณากรอกชื่อหัวข้อ, slug และเลือกหัวข้อหลัก');
      return;
    }

    const method = currentId ? 'PUT' : 'POST';
    const url = currentId ? `/admin/api/sub_lessons/${currentId}` : '/admin/api/sub_lessons';

    try {
      console.log(`💾 กำลัง${method === 'POST' ? 'สร้าง' : 'บันทึก'}หัวข้อย่อย...`, payload);
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccessModal(`${method === 'POST' ? 'สร้าง' : 'บันทึก'} "${payload.title}" สำเร็จ`);

      await loadList();
      currentId = null;
    } catch (err) {
      console.error('❌ save error:', err);
      showSuccessModal('บันทึกไม่สำเร็จ', true);
    }
  });

  // =============================================
  // ปุ่มสร้างใหม่
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      currentId = null;
      titleEl.value = '';
      slugEl.value = '';
      parentEl.value = '';
      imgEl.value = '';
      statusEl.value = 'Published';
      if (descEl) descEl.value = '';
      editorEl.innerHTML = '';
      console.log('🆕 เริ่มสร้างหัวข้อย่อยใหม่');
    });
  }

  // =============================================
  // ลบ
  function showDeleteModal(id, title) {
    deleteTargetId = id;
    deleteTargetTitle = title;
    deleteModal.style.display = 'flex';
    document.querySelector('#delete-lesson-name').textContent = title;
  }

  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', () => (deleteModal.style.display = 'none'));
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', async () => {
      try {
        const res = await fetch(`/admin/api/sub_lessons/${deleteTargetId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        deleteModal.style.display = 'none';
        showSuccessModal(`ลบ "${deleteTargetTitle}" สำเร็จ`);
        await loadList();
      } catch (err) {
        console.error('❌ delete error:', err);
        showSuccessModal('ลบไม่สำเร็จ', true);
      }
    });
  }

  // =============================================
  // Modal success helper
  function showSuccessModal(msg) {
    successMessage.textContent = msg;
    successModal.style.display = 'flex';
    setTimeout(() => (successModal.style.display = 'none'), 2000);
  }

  // =============================================
  // เริ่มต้น
  async function init() {
    console.log('🟡 Initializing Sub Lessons...');
    await loadParentList();
    await loadList();
    console.log('✅ Sub lessons ready');
  }

  // =============================================
  // Filter event
  if (filterParentEl) filterParentEl.addEventListener('change', loadList);
  if (filterStatusEl) filterStatusEl.addEventListener('change', loadList);

  // =============================================
  // โหลดเมื่อคลิกเมนู “จัดการหัวข้อย่อย”
  const sidebarItem = document.querySelector('[data-target="sublessons-section"]');
  if (sidebarItem) {
    sidebarItem.addEventListener('click', () => setTimeout(init, 400));
  } else {
    console.warn('⚠️ sidebarItem not found — running init() directly');
    setTimeout(init, 800);
  }

  // =============================================
  // โหลดอัตโนมัติเมื่อเปิดหน้าโดยตรง
  window.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#sublessons-section')) {
      console.log('⚙️ หน้า SubLessons ถูกเปิดโดยตรง → init() อัตโนมัติ');
      setTimeout(init, 600);
    }
  });

})();
