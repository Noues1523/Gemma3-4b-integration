// map-editor.js – Learning Map Editor
(function () {
  // ===== Subtabs switching =====
  const tabs = document.querySelectorAll('.subtab-btn');
  const panels = { article: document.getElementById('tab-article'), map: document.getElementById('tab-map') };
  tabs.forEach(b => b.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('is-active'));
    b.classList.add('is-active');
    const k = b.dataset.tab;
    panels.article.classList.toggle('is-hidden', k !== 'article');
    panels.map.classList.toggle('is-hidden', k !== 'map');
    if (k === 'map') initOnce();
  }));

  // ===== Map editor state =====
  let inited = false;
  let svg, rowsEl, colsEl, startEl, endEl, linkAEl, linkBEl, linkAddBtn, linkListEl;
  let W = 1200, H = 520, padding = 60, nodeR = 26;

  // canonical data structure
  let mapData = {
    rows: 3,
    cols: 4,
    start: 1,
    end: 13,
    completed: [],       // [nodeId,...]
    extraLinks: [ [4,9] ]// additional links (vertical/diagonal)
  };

  function initOnce() {
    if (inited) return;
    inited = true;
    // cache elements
    svg = document.getElementById('map-canvas');
    rowsEl = document.getElementById('map-rows');
    colsEl = document.getElementById('map-cols');
    startEl = document.getElementById('map-start');
    endEl   = document.getElementById('map-end');
    linkAEl = document.getElementById('link-a');
    linkBEl = document.getElementById('link-b');
    linkAddBtn = document.getElementById('link-add');
    linkListEl = document.getElementById('link-list');

    // buttons
    document.getElementById('map-apply').onclick = applyLayout;
    document.getElementById('map-save').onclick = saveMap;
    document.getElementById('map-export').onclick = exportJSON;
    document.getElementById('map-import').onchange = importJSON;
    linkAddBtn.onclick = addExtra;

    // load from backend first time
    loadMap();
  }

  async function loadMap() {
    try {
      const res = await fetch('/admin/learning-map');
      if (res.ok) {
        const j = await res.json();
        if (j && j.rows) mapData = j;
      }
    } catch {}
    // sync UI inputs
    rowsEl.value = mapData.rows;
    colsEl.value = mapData.cols;
    startEl.value = mapData.start;
    endEl.value = mapData.end;
    renderLinksPills();
    renderSVG();
  }

  function applyLayout() {
    mapData.rows = clamp(parseInt(rowsEl.value || 3), 1, 10);
    mapData.cols = clamp(parseInt(colsEl.value || 4), 1, 20);
    mapData.start = clamp(parseInt(startEl.value || 1), 1, mapData.rows * mapData.cols);
    mapData.end   = clamp(parseInt(endEl.value   || mapData.rows*mapData.cols), 1, mapData.rows * mapData.cols);
    renderSVG();
  }

  async function saveMap() {
    try {
      const res = await fetch('/admin/learning-map', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(mapData)
      });
      alert(res.ok ? 'บันทึกแผนที่แล้ว' : 'บันทึกไม่สำเร็จ');
    } catch {
      alert('บันทึกไม่สำเร็จ');
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(mapData, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'learning-map.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const j = JSON.parse(reader.result);
        if (j && j.rows && j.cols) {
          mapData = j;
          rowsEl.value = mapData.rows;
          colsEl.value = mapData.cols;
          startEl.value = mapData.start;
          endEl.value = mapData.end;
          renderLinksPills();
          renderSVG();
        }
      } catch { alert('ไฟล์ไม่ถูกต้อง'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  function addExtra() {
    const a = parseInt(linkAEl.value); const b = parseInt(linkBEl.value);
    const max = mapData.rows * mapData.cols;
    if (!a || !b || a<1 || b<1 || a>max || b>max || a===b) return;
    mapData.extraLinks = mapData.extraLinks || [];
    if (!mapData.extraLinks.find(p => (p[0]===a && p[1]===b) || (p[0]===b && p[1]===a))) {
      mapData.extraLinks.push([a,b]);
      renderLinksPills(); renderSVG();
    }
    linkAEl.value=''; linkBEl.value='';
  }

  function removeExtra(idx) {
    mapData.extraLinks.splice(idx,1);
    renderLinksPills(); renderSVG();
  }

  function renderLinksPills() {
    linkListEl.innerHTML = (mapData.extraLinks||[]).map((p,i)=>`
      <span class="link-pill">${p[0]}→${p[1]} <button data-i="${i}" title="ลบ">&times;</button></span>
    `).join('');
    linkListEl.querySelectorAll('button').forEach(b => {
      b.onclick = () => removeExtra(parseInt(b.dataset.i));
    });
  }

  // ====== Render SVG nodes/links ======
  function renderSVG() {
    svg.innerHTML = '';
    const n = mapData.rows * mapData.cols;
    const gridW = W - padding*2;
    const gridH = H - padding*2;

    // positions in snake layout (1..n)
    const pos = {};
    const colGap = gridW / Math.max(1, mapData.cols - 1);
    const rowGap = gridH / Math.max(1, mapData.rows - 1);

    let id = 1;
    for (let r=0; r<mapData.rows; r++) {
      const leftToRight = (r % 2 === 0); // ซิกแซ็กเหมือนภาพ
      for (let c=0; c<mapData.cols; c++) {
        const cc = leftToRight ? c : (mapData.cols - 1 - c);
        const x = padding + cc * colGap;
        const y = padding + r * rowGap;
        pos[id] = {x,y};
        id++;
      }
    }

    // horizontal links (snake)
    for (let i=1; i<=n; i++) {
      const next = i+1;
      if (i % mapData.cols === 0) continue; // ปลายแถวไม่เชื่อม
      drawLink(pos[i], pos[next], false);
    }

    // vertical/diagonal extra links
    (mapData.extraLinks||[]).forEach(p => {
      const [a,b] = p;
      if (pos[a] && pos[b]) drawLink(pos[a], pos[b], true);
    });

    // nodes
    for (let i=1; i<=n; i++) drawNode(i, pos[i]);
  }

  function drawLink(p1, p2, extra=false) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
    line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
    line.setAttribute('class', 'map-link' + (extra ? ' extra' : ''));
    svg.appendChild(line);
  }

  function drawNode(id, p) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'map-node' + 
      (mapData.completed?.includes(id) ? ' completed' : '') + 
      (id===mapData.start ? ' start' : '') + 
      (id===mapData.end ? ' end' : '')
    );
    g.setAttribute('transform', `translate(${p.x},${p.y})`);
    g.setAttribute('data-id', id);

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', 26);
    c.setAttribute('cx', 0); c.setAttribute('cy', 0);
    g.appendChild(c);

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('text-anchor','middle');
    t.setAttribute('dominant-baseline','central');
    t.textContent = id;
    g.appendChild(t);

    // toggle completed on double click
    g.ondblclick = () => {
      const i = mapData.completed.indexOf(id);
      if (i>=0) mapData.completed.splice(i,1); else mapData.completed.push(id);
      renderSVG();
    };

    svg.appendChild(g);
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
})();