/* analytics.js – User Analytics */

(function () {
  const cardsWrap = document.getElementById('an-cards');
  const dauCanvas = document.getElementById('chart-dau');
  const tblCompletion = document.getElementById('an-completion')?.querySelector('tbody');
  const tblByDay = document.getElementById('an-byday')?.querySelector('tbody');

  let dauChart = null;

  async function loadAnalytics() {
    // Summary
    const res = await fetch('/admin/analytics');
    const data = await res.json();

    const cards = [
      { label: 'ผู้เยี่ยมชมทั้งหมด', key: 'total' },
      { label: 'DAU (24 ชม.)', key: 'dau' },
      { label: 'WAU (7 วัน)', key: 'wau' },
      { label: 'MAU (30 วัน)', key: 'mau' },
      { label: 'ผู้ใช้ใหม่ 30 วัน', key: 'new30' },
      { label: 'ผู้ใช้กลับมา (ประมาณ)', key: 'ret30' },
    ];
    cardsWrap.innerHTML = cards.map(c => `
      <div class="card">
        <div class="card-title">${c.label}</div>
        <div class="card-value">${data[c.key] ?? 0}</div>
      </div>
    `).join('');

    // DAU Line Chart
    const labels = (data.byday || []).map(r => r.day);
    const values = (data.byday || []).map(r => r.active);
    if (dauChart) { dauChart.destroy(); }
    dauChart = new Chart(dauCanvas, {
      type: 'line',
      data: { labels, datasets: [{ label: 'DAU', data: values, tension: .25 }] },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { display: false } }
      }
    });

    // Fill by-day table
    tblByDay.innerHTML = (data.byday || []).map(r => `
      <tr><td>${r.day}</td><td>${r.active}</td></tr>
    `).join('');

    // Completion table
    const res2 = await fetch('/admin/completion');
    const comp = await res2.json();
    const rows = comp.items || [];
    tblCompletion.innerHTML = rows.map(r => {
      const rate = r.rate ? (r.rate * 100).toFixed(0) + '%' : '0%';
      return `<tr><td>${r.category}</td><td>${r.attempts || 0}</td><td>${r.passed || 0}</td><td>${rate}</td></tr>`;
    }).join('');
  }

  window.loadAnalytics = loadAnalytics;
})();