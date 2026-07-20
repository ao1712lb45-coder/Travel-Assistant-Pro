/* Travel Assistant Pro 2.0 - extended marketing materials */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.TravelMarketingSuite = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const clean = value => String(value || '').trim();
  const valid = value => value && !/官網目前未顯示|未辨識|待確認/.test(value);
  const highlights = data => (data.highlights || []).map(clean).filter(Boolean).slice(0, 6);
  const facts = data => [
    valid(data.airline) ? `航空公司：${data.airline}` : '',
    valid(data.dates) ? `出發日期：${data.dates}` : '',
    valid(data.price) ? `參考售價：${data.price}` : ''
  ].filter(Boolean);
  const footer = data => [valid(data.url) ? `完整行程：${data.url}` : '', data.contact, data.line ? `LINE：${data.line}` : ''].filter(Boolean).join('\n');

  function edm(data) {
    const list = highlights(data).map(item => `・${item}`).join('\n');
    return `主旨：【精選旅遊】${clean(data.title) || '本期推薦行程'}\n\n${clean(data.subtitle) || '把值得期待的旅程，整理成一封信與你分享。'}\n\n${list ? `行程亮點\n${list}\n\n` : ''}${facts(data).join('\n')}\n\n適合正在比較目的地、日期與預算的旅客。實際機位、售價與行程內容，請以報名時官網及業務確認為準。\n\n${footer(data)}`.trim();
  }

  function committee(data) {
    const list = highlights(data).slice(0, 5).map(item => `✓ ${item}`).join('\n');
    return `【企業福委／員工旅遊提案】\n${clean(data.title) || '精選團體行程'}\n\n提案特色\n${list || '✓ 完整團體行程規劃\n✓ 專人協助諮詢與報名'}\n\n${facts(data).join('\n')}\n\n適合用於員工旅遊、部門活動、獎勵旅遊或企業團體詢價。可依人數、預算與希望日期進一步確認適合梯次；實際機位及報價以業務回覆為準。\n\n${footer(data)}`.trim();
  }

  function video(data) {
    const list = highlights(data);
    const shots = (list.length ? list : ['目的地風景', '特色體驗', '旅遊氛圍']).slice(0, 4);
    return `【30 秒短影音腳本】\n\n0–3 秒｜開場\n畫面：最吸睛的目的地風景\n字幕：${clean(data.title) || '下一趟旅行去哪裡？'}\n旁白：想安排下一趟旅行，先看看這個行程。\n\n4–18 秒｜亮點快剪\n${shots.map((item, index) => `畫面 ${index + 1}：${item}\n字幕：${item}`).join('\n')}\n\n19–25 秒｜關鍵資訊\n字幕：${facts(data).join('｜') || '日期與價格歡迎詢問'}\n旁白：行程、日期和價格都整理好了，選一個適合自己的出發時間。\n\n26–30 秒｜行動呼籲\n字幕：私訊索取完整行程\n旁白：想看完整內容，直接私訊詢問。\n${footer(data)}`.trim();
  }

  function generateExtendedSet(data) { return { edm: edm(data), committee: committee(data), video: video(data) }; }

  function install() {
    const section = document.querySelector('[data-tab="lineOut"]')?.closest('.section');
    const tabs = section?.querySelector('.tabs');
    if (!section || !tabs || document.getElementById('edmOut')) return;
    const outputs = [
      ['edmOut', 'EDM 電子報'],
      ['committeeOut', '福委提案'],
      ['videoOut', '短影音腳本']
    ];
    outputs.forEach(([id, label]) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'tab'; tab.dataset.tab = id; tab.textContent = label; tabs.appendChild(tab);
      const area = document.createElement('textarea'); area.id = id; area.className = 'output'; area.style.display = 'none'; area.setAttribute('aria-label', label); section.insertBefore(area, section.querySelector('.btnrow'));
    });
    const generate = document.getElementById('generateCopy');
    generate.textContent = '一鍵產生全部素材';
    const readData = () => ({
      url:document.getElementById('url').value.trim(), days:document.getElementById('days').value.trim(), title:document.getElementById('mainTitle').value.trim(), subtitle:document.getElementById('subtitle').value.trim(), price:document.getElementById('price').value.trim(), airline:document.getElementById('airline').value.trim(), dates:document.getElementById('dates').value.trim(), highlights:document.getElementById('highlights').value.split(/\r?\n/).map(clean).filter(Boolean), contact:document.getElementById('contact').value.trim(), line:document.getElementById('line').value.trim()
    });
    const render = () => { const result = generateExtendedSet(readData()); outputs.forEach(([id]) => { document.getElementById(id).value = result[id.replace('Out', '')]; }); };
    generate.addEventListener('click', render);
    ['url','days','mainTitle','subtitle','price','airline','dates','highlights','contact','line'].forEach(id => document.getElementById(id).addEventListener('input', render));
    tabs.addEventListener('click', event => {
      const button = event.target.closest('[data-tab]'); if (!button) return;
      section.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === button));
      section.querySelectorAll('.output').forEach(item => { item.style.display = item.id === button.dataset.tab ? 'block' : 'none'; });
      global.currentTab = button.dataset.tab;
    });
    render();
  }

  if (typeof document !== 'undefined') {
    if (document.querySelector('[data-tab="lineOut"]')) install();
    else document.addEventListener('DOMContentLoaded', install);
  }
  return { edm, committee, video, generateExtendedSet };
});
