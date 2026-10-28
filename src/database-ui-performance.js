/* Travel Assistant Pro 2.2 - keep large database lists responsive */
(function () {
  'use strict';
  const LIMIT = 200;
  let scheduled = false;

  function trimDatabaseList() {
    scheduled = false;
    const list = document.getElementById('dbList');
    if (!list) return;
    const rows = Array.from(list.querySelectorAll(':scope > .dbitem'));
    if (rows.length <= LIMIT) return;
    rows.slice(LIMIT).forEach(row => row.remove());
    let note = list.querySelector(':scope > .database-list-limit');
    if (!note) {
      note = document.createElement('div');
      note.className = 'dbmeta database-list-limit';
      note.style.padding = '8px';
      list.prepend(note);
    }
    note.textContent = `資料庫共有更多行程，為保持操作順暢先顯示前 ${LIMIT} 團；可輸入團號或名稱縮小範圍。`;
  }

  function scheduleTrim() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(trimDatabaseList);
  }

  function install() {
    const list = document.getElementById('dbList');
    if (!list || list.dataset.performanceReady === 'true') return;
    list.dataset.performanceReady = 'true';
    trimDatabaseList();
    new MutationObserver(scheduleTrim).observe(list, { childList:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
