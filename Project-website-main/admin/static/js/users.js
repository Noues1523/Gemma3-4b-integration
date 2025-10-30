/* users.js – Admin Users Management */

(function () {
  const list = document.getElementById('ua-list');
  const btnCreate = document.getElementById('ua-create');

  const dlg = document.getElementById('ua-editor');
  const edTitle = document.getElementById('ua-ed-title');
  const inUser = document.getElementById('ua-username');
  const inEmail = document.getElementById('ua-email');
  const inRole = document.getElementById('ua-role');
  const inPass = document.getElementById('ua-password');
  const btnSave = document.getElementById('ua-save');
  const btnCancel = document.getElementById('ua-cancel');

  let currentId = null;

  function fmt(dt){ if(!dt) return ''; try{ return new Date(dt).toLocaleString('th-TH'); }catch{return dt;} }

  async function loadAdmins() {
    const res = await fetch('/admin/admins');
    const data = await res.json();
    const items = data.items || [];
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<div class="muted">ยังไม่มีผู้ดูแลระบบ</div>';
      return;
    }
    items.forEach(a => {
      const card = document.createElement('div');
      card.className = 'ua-item';
      card.innerHTML = `
        <div class="item-head">
          <div class="ua-title">${a.username}</div>
          <div class="actions">
            <button class="primary-btn" data-act="edit">แก้ไข</button>
            <button class="primary-btn" data-act="reset">รีเซ็ตรหัส</button>
            <button class="danger" data-act="toggle">${a.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
            <button class="danger" data-act="del">ลบ</button>
          </div>
        </div>
        <div class="meta">
          Email: ${a.email}<br>
          Role: ${a.role} • สถานะ: ${a.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}<br>
          สร้างเมื่อ: ${fmt(a.created_at)} • อัปเดต: ${fmt(a.updated_at)}
        </div>
      `;
      card.querySelector('[data-act="edit"]').onclick = ()=> openEditor(a);
      card.querySelector('[data-act="reset"]').onclick = ()=> resetPwd(a.id);
      card.querySelector('[data-act="toggle"]').onclick = ()=> toggleActive(a);
      card.querySelector('[data-act="del"]').onclick = ()=> del(a.id);
      list.appendChild(card);
    });
  }

  function openDialog(){ dlg.showModal(); }
  function closeDialog(){ dlg.close(); }

  function openEditor(a) {
    if (!a) {
      edTitle.textContent = 'เพิ่มผู้ดูแลระบบ';
      currentId = null;
      inUser.value = '';
      inEmail.value = '';
      inRole.value = 'editor';
      inPass.value = '';
      document.getElementById('ua-pass-wrap').style.display = 'grid';
    } else {
      edTitle.textContent = 'แก้ไขผู้ดูแลระบบ';
      currentId = a.id;
      inUser.value = a.username;
      inEmail.value = a.email;
      inRole.value = a.role || 'editor';
      inPass.value = '';
      // ตอนแก้ไข ไม่บังคับรหัสผ่านใหม่
      document.getElementById('ua-pass-wrap').style.display = 'none';
    }
    openDialog();
  }

  async function save() {
    if (!currentId) {
      // create
      const payload = {
        username: inUser.value.trim(),
        email: inEmail.value.trim(),
        role: inRole.value,
        password: inPass.value
      };
      if (!payload.username || !payload.email || !payload.password) {
        alert('กรุณากรอกข้อมูลให้ครบ (รวมรหัสผ่าน)');
        return;
      }
      const res = await fetch('/admin/admins', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeDialog();
        loadAdmins();
      } else {
        const j = await res.json().catch(()=> ({}));
        alert(j.error || 'สร้างผู้ดูแลล้มเหลว');
      }
    } else {
      // update (role / is_active)
      const payload = { role: inRole.value, is_active: true };
      const res = await fetch(`/admin/admins/${currentId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        closeDialog();
        loadAdmins();
      } else {
        alert('บันทึกล้มเหลว');
      }
    }
  }

  async function resetPwd(id) {
    const p = prompt('กำหนดรหัสผ่านใหม่:');
    if (!p) return;
    const res = await fetch(`/admin/admins/${id}/password`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ password: p })
    });
    if (res.ok) alert('ตั้งรหัสผ่านใหม่แล้ว');
    else alert('ตั้งรหัสผ่านใหม่ไม่สำเร็จ (เซิร์ฟเวอร์ไม่มี bcrypt?)');
  }

  async function toggleActive(a) {
    const payload = { role: a.role || 'editor', is_active: !a.is_active };
    await fetch(`/admin/admins/${a.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    loadAdmins();
  }

  async function del(id) {
    if (!confirm('ยืนยันลบผู้ดูแลคนนี้?')) return;
    await fetch(`/admin/admins/${id}`, { method:'DELETE' });
    loadAdmins();
  }

  btnCreate?.addEventListener('click', ()=> openEditor(null));
  btnSave?.addEventListener('click', save);
  btnCancel?.addEventListener('click', closeDialog);

  window.loadAdmins = loadAdmins;
})();