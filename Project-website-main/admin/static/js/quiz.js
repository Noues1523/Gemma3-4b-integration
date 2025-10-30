/* quiz.js – Quiz Management */

(function () {
  const els = {
    list: document.getElementById('q-list'),
    side: document.getElementById('q-side'),
    search: document.getElementById('q-search'),
    status: document.getElementById('q-status'),
    category: document.getElementById('q-category'),
    create: document.getElementById('q-create'),
    dlg: document.getElementById('q-editor'),

    qeTitle: document.getElementById('qe-title'),
    qeSlug: document.getElementById('qe-slug'),
    qeStatus: document.getElementById('qe-status'),
    qeStats: document.getElementById('qe-stats'),
    qbList: document.getElementById('qb-list'),
    btnAdd: document.getElementById('qe-add'),
    btnSave: document.getElementById('qe-save'),
  };

  let currentId = null;
  let meta = { category: '', publish_at: null };

  /* ---------- Load List ---------- */
  async function loadList() {
    const qs = new URLSearchParams();
    const q = els.search.value.trim(); if (q) qs.set('search', q);
    const st = els.status.value; if (st) qs.set('status', st);
    const cat = els.category.value; if (cat) qs.set('category', cat);

    const res = await fetch(`/admin/quizzes?${qs.toString()}`);
    const data = await res.json();
    const items = data.items || [];

    // เติม dropdown category จากข้อมูลที่มี
    const distinct = [...new Set(items.map(i => (i.description || '').trim()).filter(Boolean))];
    els.category.innerHTML = `<option value="">ทุกหมวดหมู่</option>` + distinct.map(c => `<option>${c}</option>`).join('');

    els.list.innerHTML = '';
    if (!items.length) {
      els.list.innerHTML = '<div class="muted" style="padding:.5rem 0">ไม่พบแบบทดสอบ</div>';
      return;
    }

    items.forEach(it => {
    const node = document.createElement('div');
    node.className = 'qm-item';
    node.innerHTML = `
      <div class="item-head">
        <div class="qm-title">${it.title || '(ไม่มีชื่อ)'}</div>
        <div class="actions">
          <button class="primary-btn" data-act="edit">แก้ไข</button>
          <button class="danger" data-act="delete">ลบ</button>
        </div>
      </div>
      <div class="meta">
        slug: ${it.slug || '-'} • สถานะ: ${it.status || '-'} • หมวดหมู่: ${it.description || '-'} • คำถาม: ${it.question_count || 0}
      </div>
    `;
    node.querySelector('[data-act="edit"]').onclick = () => openEditor(it.id);
    node.querySelector('[data-act="delete"]').onclick = () => del(it.id);
    els.list.appendChild(node);
  });

  }

  /* ---------- Open Editor ---------- */
  function openDialog() {
    els.dlg.showModal();
    els.dlg.querySelector('.modal-close').onclick = () => els.dlg.close();
  }

  async function openEditor(id) {
    currentId = id || null;
    els.qbList.innerHTML = '';
    meta = { category: '', publish_at: null };

    if (!id) {
      els.qeTitle.value = '';
      els.qeSlug.value = '';
      els.qeStatus.value = 'draft';
      updateStats();
      renderMetaBar();
      openDialog();
      return;
    }

    const res = await fetch(`/admin/quizzes/${id}`);
    const qz = await res.json();

    els.qeTitle.value = qz.title || '';
    els.qeSlug.value = qz.slug || '';
    els.qeStatus.value = qz.status || 'draft';

    // category เก็บใน description
    meta.category = (qz.description || '').trim() || '';
    // publish_at เก็บใน settings
    try {
      const s = qz.settings || {};
      meta.publish_at = s.publish_at || null;
    } catch { meta.publish_at = null; }

    // questions
    (qz.questions || []).forEach(addQuestionFromData);

    updateStats();
    renderMetaBar();
    openDialog();
  }

  function addQuestionFromData(q) {
    const node = makeQuestionCard(q.qtype || 'mcq', q.question || '', q.choices || [], q.answer_key, q.points || 1);
    els.qbList.appendChild(node);
  }

  function addQuestion() {
    const node = makeQuestionCard('mcq', '', ['', '', '', ''], 0, 1);
    els.qbList.appendChild(node);
    updateStats();
  }

  function makeQuestionCard(qtype, text, choices, answer_key, points) {
    const card = document.createElement('div');
    card.className = 'qb-card';
    card.innerHTML = `
      <div class="qb-row">
        <div class="richbar">
          <button data-cmd="bold"><b>B</b></button>
          <button data-cmd="italic"><i>I</i></button>
          <button data-cmd="underline"><u>U</u></button>
        </div>
        <div class="qb-controls">
          <select class="qtype">
            <option value="mcq" ${qtype==='mcq'?'selected':''}>ปรนัย (MCQ)</option>
            <option value="tf" ${qtype==='tf'?'selected':''}>ถูก/ผิด</option>
            <option value="short" ${qtype==='short'?'selected':''}>บรรยายสั้น</option>
          </select>
          <input class="points" type="number" min="1" value="${points||1}" style="width:80px">
          <button class="danger" data-act="remove">ลบ</button>
        </div>
      </div>
      <div class="rte" contenteditable="true"></div>
      <div class="qb-choices"></div>
    `;
    const rte = card.querySelector('.rte');
    rte.innerHTML = text || '';

    // simple rich buttons
    card.querySelectorAll('.richbar button').forEach(b=>{
      b.onclick = ()=>{
        const cmd = b.textContent.trim()==='B'?'bold':b.textContent.trim()==='I'?'italic':'underline';
        document.execCommand(cmd,false,null);
        rte.focus();
      };
    });

    const qtypeEl = card.querySelector('.qtype');
    const choicesWrap = card.querySelector('.qb-choices');
    const pointsEl = card.querySelector('.points');

    function renderChoices() {
      const t = qtypeEl.value;
      choicesWrap.innerHTML = '';
      if (t === 'mcq') {
        (choices && choices.length ? choices : ['', '', '', '']).forEach((c,i)=>{
          const row = document.createElement('div');
          row.className = 'qb-choice';
          row.innerHTML = `
            <input type="radio" name="ans-${Math.random().toString(36).slice(2)}" ${String(answer_key)==String(i)?'checked':''}>
            <input class="qb-choice-text" value="${c || ''}">
          `;
          choicesWrap.appendChild(row);
        });
      } else if (t === 'tf') {
        const row = document.createElement('div');
        row.className='qb-choice';
        row.innerHTML = `
          <select class="qb-choice-text">
            <option value="true" ${String(answer_key)==='true'?'selected':''}>ถูก</option>
            <option value="false" ${String(answer_key)==='false'?'selected':''}>ผิด</option>
          </select>
        `;
        choicesWrap.appendChild(row);
      } else {
        // short answer -> ไม่มีตัวเลือก
      }
    }

    qtypeEl.onchange = ()=>{ choices = []; answer_key = null; renderChoices(); };
    renderChoices();

    card.querySelector('[data-act="remove"]').onclick = ()=>{ card.remove(); updateStats(); };

    // getter
    card.getValue = () => {
      const t = qtypeEl.value;
      let ans = null, chs = null;
      if (t==='mcq') {
        const radios = choicesWrap.querySelectorAll('input[type="radio"]');
        const texts = choicesWrap.querySelectorAll('.qb-choice-text');
        chs = Array.from(texts).map(inp => inp.value);
        ans = Array.from(radios).findIndex(r => r.checked);
        if (ans < 0) ans = 0;
      } else if (t==='tf') {
        chs = null;
        ans = choicesWrap.querySelector('.qb-choice-text')?.value === 'true';
      } else {
        chs = null; ans = '';
      }
      return {
        qtype: t,
        question: rte.innerHTML,
        choices: chs,
        answer_key: ans,
        points: Number(pointsEl.value || 1)
      };
    };

    return card;
  }

  function collect() {
    const cards = els.qbList.querySelectorAll('.qb-card');
    return Array.from(cards).map(c => c.getValue());
  }

  function updateStats() {
    const n = els.qbList.querySelectorAll('.qb-card').length;
    els.qeStats.textContent = `คำถาม: ${n}`;
  }

  /* ---------- Save / Delete ---------- */
  async function save() {
    const payload = {
      title: els.qeTitle.value.trim(),
      slug: els.qeSlug.value.trim(),
      status: els.qeStatus.value || 'draft',
      category: meta.category || '',
      settings: { publish_at: meta.publish_at || null },
      questions: collect()
    };
    if (!payload.title) {
      alert('กรุณากรอกชื่อแบบทดสอบ');
      return;
    }
    let res;
    if (currentId) {
      res = await fetch(`/admin/quizzes/${currentId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/admin/quizzes`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const j = await res.json().catch(()=> ({}));
      if (j.id) currentId = j.id;
    }
    if (res.ok) {
      alert('บันทึกแล้ว');
      els.dlg.close();
      window.loadQuizList?.();
    } else {
      alert('บันทึกล้มเหลว');
    }
  }

  async function del(id) {
    if (!confirm('ยืนยันลบแบบทดสอบนี้?')) return;
    await fetch(`/admin/quizzes/${id}`, { method: 'DELETE' });
    window.loadQuizList?.();
  }

  /* ---------- Meta Bar (category + schedule) ---------- */
  function renderMetaBar() {
    let wrap = document.querySelector('.qm-meta-grid');
    if (!wrap) return;
    const old = wrap.querySelector('.meta-extra');
    old && old.remove();

    const node = document.createElement('div');
    node.className = 'meta-extra';
    node.style.gridColumn = '1 / -1';
    node.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <label>หมวดหมู่ <input id="qe-category" value="${meta.category || ''}"></label>
        <label>กำหนดเวลาโพสต์ <input id="qe-publish" type="datetime-local" value="${meta.publish_at ? meta.publish_at.slice(0,16) : ''}"></label>
      </div>
    `;
    wrap.appendChild(node);

    node.querySelector('#qe-category').oninput = (e)=> meta.category = e.target.value.trim();
    node.querySelector('#qe-publish').onchange = (e)=> meta.publish_at = e.target.value ? new Date(e.target.value).toISOString() : null;
  }

  /* ---------- Bindings ---------- */
  els.search?.addEventListener('input', debounce(loadList, 300));
  els.status?.addEventListener('change', loadList);
  els.category?.addEventListener('change', loadList);
  els.create?.addEventListener('click', ()=> openEditor(null));
  els.btnAdd?.addEventListener('click', addQuestion);
  els.btnSave?.addEventListener('click', save);

  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  window.loadQuizList = loadList;
})();