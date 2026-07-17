/* Travel Assistant Pro 1.1.0 - customer trip matching */
(function (global) {
  'use strict';

  const JAPAN = ['TYO','NRT','HND','OSA','KIX','UKB','NGO','SPK','CTS','HKD','FUK','OKA','SDJ','AOJ','AKJ','AXT','TOY','KMJ','KOJ'];
  const SOUTHEAST_ASIA = ['BKK','CNX','HKT','USM','DAD','HAN','SGN','PQC','SIN','KUL','BKI','PEN','DPS','CGK','MNL','CEB','PNH','RGN','BWN','VTE'];
  const REGION_CODES = {
    '日本':JAPAN, '北海道':['SPK','CTS','HKD','AKJ'], '東京':['TYO','NRT','HND'], '大阪':['OSA','KIX'], '九州':['FUK','KMJ','KOJ'],
    '韓國':['SEL','ICN','PUS','CJU'], '東南亞':SOUTHEAST_ASIA, '泰國':['BKK','CNX','HKT','USM'], '曼谷':['BKK'],
    '沙美島':['BKK'], '越南':['DAD','HAN','SGN','PQC'], '新加坡':['SIN'], '馬來西亞':['KUL','BKI','PEN'],
    '印尼':['DPS','CGK'], '菲律賓':['MNL','CEB'], '中國':['PVG','PEK','CAN','CTU','KMG']
  };

  function numberFrom(value) {
    const match = String(value || '').replace(/,/g, '').match(/\d{4,6}/);
    return match ? Number(match[0]) : 0;
  }

  function tripText(trip) {
    return [trip.code, trip.title, trip.mainTitle, trip.subtitle, trip.destination, trip.airline, ...(trip.highlights || [])].join(' ').toLowerCase();
  }

  function destinationMatches(trip, wanted) {
    const value = String(wanted || '').trim();
    if (!value) return true;
    if (tripText(trip).includes(value.toLowerCase())) return true;
    const codes = REGION_CODES[value] || [];
    return codes.some(code => String(trip.code || '').toUpperCase().startsWith(code));
  }

  function monthMatches(trip, month) {
    if (!month) return true;
    return new RegExp(`(?:^|[^0-9])0?${Number(month)}[\\/]`).test(String(trip.dates || ''));
  }

  function rankTrips(trips, needs) {
    const people = Math.max(1, Number(needs.people) || 1);
    const budget = Math.max(0, Number(needs.budget) || 0);
    const keywords = String(needs.keywords || '').split(/[、,，\s]+/).filter(Boolean);
    return (trips || []).map(trip => {
      const price = numberFrom(trip.price);
      if (!destinationMatches(trip, needs.destination) || !monthMatches(trip, needs.month)) return null;
      if (budget && (!price || price > budget)) return null;
      const haystack = tripText(trip);
      const matchedKeywords = keywords.filter(word => haystack.includes(word.toLowerCase()));
      let score = 50;
      const reasons = [];
      if (needs.destination) { score += 25; reasons.push(`符合地區：${needs.destination}`); }
      if (budget && price) { score += Math.max(0, 20 - Math.round((price / budget) * 10)); reasons.push(`每人 ${price.toLocaleString('zh-TW')} 元，在預算內`); }
      if (needs.month) { score += 15; reasons.push(`有 ${Number(needs.month)} 月出發日`); }
      if (matchedKeywords.length) { score += matchedKeywords.length * 8; reasons.push(`符合偏好：${matchedKeywords.join('、')}`); }
      if (!reasons.length) reasons.push('符合目前設定的基本條件');
      return { trip, price, people, total: price ? price * people : 0, score, reasons };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.price - b.price).slice(0, 8);
  }

  global.TravelRecommendation = { REGION_CODES, numberFrom, destinationMatches, monthMatches, rankTrips };
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const button = $('runMatch');
  if (!button) return;
  button.addEventListener('click', () => {
    let trips = [];
    try { trips = JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) {}
    const results = rankTrips(trips, { people:$('matchPeople').value, destination:$('matchDestination').value,
      budget:$('matchBudget').value, month:$('matchMonth').value, keywords:$('matchKeywords').value });
    const box = $('matchResults'); box.innerHTML = '';
    const status = $('matchStatus'); status.className = 'status show ' + (results.length ? 'ok' : 'warn');
    status.textContent = results.length ? `找到 ${results.length} 個適合的行程，已依符合程度排序。` : (trips.length ? '資料庫中沒有符合條件的行程，請放寬地區、月份或預算。' : '行程資料庫目前是空的，請先儲存幾個行程。');
    results.forEach((item, index) => {
      const card = document.createElement('div'); card.className = 'hint';
      card.style.borderLeft = index < 3 ? '5px solid #d92d45' : '1px solid #e6ebf2';
      card.innerHTML = `<strong>${index + 1}. ${item.trip.code ? item.trip.code + '｜' : ''}${item.trip.title || item.trip.mainTitle || '未命名行程'}</strong>
        <div style="margin-top:6px">${item.trip.airline || '航空待確認'}｜${item.trip.dates || '日期待確認'}</div>
        <div style="margin-top:4px">每人：${item.price ? item.price.toLocaleString('zh-TW') + ' 元起' : '價格待確認'}${item.total ? `｜${item.people} 人預估 ${item.total.toLocaleString('zh-TW')} 元起` : ''}</div>
        <div style="margin-top:6px;color:#087a55">推薦原因：${item.reasons.join('；')}</div>
        <div style="margin-top:5px;color:#a85b00">⚠️ 實際售價與 ${item.people} 人機位需回官網確認</div>`;
      box.appendChild(card);
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);

