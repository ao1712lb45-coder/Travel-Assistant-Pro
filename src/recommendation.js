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
  const KEYWORD_ALIASES = {
    '人妖':['人妖','人妖秀','變性人秀','蒂芬妮','tiffany','阿卡薩','alcazar','卡里普索','calypso'],
    '人妖秀':['人妖','人妖秀','變性人秀','蒂芬妮','tiffany','阿卡薩','alcazar','卡里普索','calypso'],
    '海島':['海島','沙灘','沙美島','珊瑚島','格蘭島','浮潛'],
    '親子':['親子','樂園','動物園','水族館','迪士尼','環球影城'],
    '溫泉':['溫泉','泡湯','湯泉','美人湯'],
    '賞楓':['賞楓','楓葉','紅葉','楓紅'],
    '賞櫻':['賞櫻','櫻花','花見'],
    '夜市':['夜市','市集','步行街']
  };

  function parseKeywords(value) { return String(value || '').split(/[、,，\s]+/).map(word => word.trim()).filter(Boolean).slice(0, 5); }
  function expandKeyword(word) {
    const key = String(word || '').trim().toLowerCase();
    return [...new Set([key, ...(KEYWORD_ALIASES[key] || [])].map(value => String(value).toLowerCase()))];
  }

  function numberFrom(value) {
    const match = String(value || '').replace(/,/g, '').match(/\d{4,6}/);
    return match ? Number(match[0]) : 0;
  }

  function tripText(trip) {
    return [trip.code, trip.title, trip.mainTitle, trip.subtitle, trip.destination, trip.airline, ...(trip.highlights || []), ...(trip.officialMatchedKeywords || [])].join(' ').toLowerCase();
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
    const keywords = parseKeywords(needs.keywords);
    return (trips || []).map(trip => {
      const price = numberFrom(trip.price);
      if (!destinationMatches(trip, needs.destination) || !monthMatches(trip, needs.month)) return null;
      if (budget && (!price || price > budget)) return null;
      if (Number(trip.seats) > 0 && Number(trip.seats) < people) return null;
      const haystack = tripText(trip);
      const matchedKeywords = keywords.filter(word => expandKeyword(word).some(alias => haystack.includes(alias)));
      if (keywords.length && !matchedKeywords.length) return null;
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

  global.TravelRecommendation = { REGION_CODES, KEYWORD_ALIASES, parseKeywords, expandKeyword, numberFrom, destinationMatches, monthMatches, rankTrips };
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const button = $('runMatch');
  if (!button) return;

  function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function fetchJsonWithRetry(url, attempts = 2) {
    if (location.protocol === 'file:') throw new Error('目前是直接開啟 index.html，官網同步功能無法運作。請關閉此頁，改用 START_SERVER.bat 啟動程式。');
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 35000);
      try {
        const response = await fetch(url, { headers:{ accept:'application/json' }, signal:controller.signal });
        const type = response.headers.get('content-type') || '';
        if (!type.includes('application/json')) throw new Error('本機服務版本過舊，請關閉程式後重新執行 START_SERVER.bat。');
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error && payload.error.message || '官網同步失敗。');
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 700));
      } finally { clearTimeout(timer); }
    }
    if (lastError && lastError.name === 'AbortError') throw new Error('Besttour 官網回應逾時，程式已自動重試仍未成功。請縮小日期範圍或改成每次匯入 50 團。');
    if (lastError instanceof TypeError || /Failed to fetch/i.test(String(lastError && lastError.message))) {
      throw new Error('本機服務沒有回應。請確認網址是 http://127.0.0.1:4173，並重新執行 START_SERVER.bat。');
    }
    throw lastError;
  }

  const syncButton = $('syncBesttour');
  if (syncButton) {
    const today = new Date();
    const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1);
    if (!$('syncDateFrom').value) $('syncDateFrom').value = localDate(today);
    if (!$('syncDateTo').value) $('syncDateTo').value = localDate(nextYear);
    syncButton.addEventListener('click', async () => {
      const keyword = $('syncKeyword').value.trim();
      const status = $('syncStatus');
      if (!keyword) { status.className = 'status show warn'; status.textContent = '請輸入地區或關鍵字，例如：東南亞、北海道、沙美島。'; return; }
      syncButton.disabled = true; syncButton.textContent = '正在讀取 Besttour…';
      status.className = 'status show warn'; status.textContent = '正在同步官網行程，請稍候…';
      try {
        const params = new URLSearchParams({ keyword, dateFrom:$('syncDateFrom').value.replaceAll('-','/'),
          dateTo:$('syncDateTo').value.replaceAll('-','/'), limit:$('syncLimit').value });
        const payload = await fetchJsonWithRetry('/api/besttour/search?' + params);
        let database = [];
        try { database = JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) {}
        const byCode = new Map(database.map(trip => [trip.code, trip]));
        let added = 0; let updated = 0;
        payload.data.trips.forEach(trip => {
          const parsed = global.TravelAssistantParser && global.TravelAssistantParser.parseTourCode(trip.code);
          trip.airline = parsed ? parsed.airline.replace('（舊代碼）','') : trip.airline;
          const old = byCode.get(trip.code);
          if (old) { byCode.set(trip.code, { ...trip, ...old, price:trip.price, dates:trip.dates, seats:trip.seats, destination:trip.destination, updated:trip.updated }); updated++; }
          else { byCode.set(trip.code, trip); added++; }
        });
        localStorage.setItem('travelV10Db', JSON.stringify([...byCode.values()]));
        if (typeof global.renderDb === 'function') global.renderDb();
        status.className = 'status show ok';
        status.textContent = `同步完成：新增 ${added} 團、更新 ${updated} 團。官網符合「${keyword}」共 ${payload.data.total} 團，本次最多匯入 ${$('syncLimit').value} 團。`;
      } catch (error) {
        status.className = 'status show err'; status.textContent = error.message + ' 你仍可使用單一網址逐團匯入。';
      } finally { syncButton.disabled = false; syncButton.textContent = '從 Besttour 官網同步'; }
    });
  }
  async function searchOfficialKeywords(words) {
    const results = [];
    for (const word of words.slice(0, 3)) {
      const params = new URLSearchParams({ keyword:word, limit:'100' });
      const payload = await fetchJsonWithRetry('/api/besttour/search?' + params);
      payload.data.trips.forEach(trip => results.push({ ...trip, officialMatchedKeywords:[word] }));
    }
    return results;
  }

  button.addEventListener('click', async () => {
    button.disabled = true; button.textContent = '正在搜尋本機與 Besttour 官網…';
    const status = $('matchStatus'); status.className = 'status show warn'; status.textContent = '正在比對行程名稱、景點特色與官網關鍵字…';
    let trips = [];
    try { trips = JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) {}
    const keywordWords = parseKeywords($('matchKeywords').value);
    let officialCount = 0, officialError = '';
    if (keywordWords.length) {
      try {
        const officialTrips = await searchOfficialKeywords(keywordWords);
        officialCount = officialTrips.length;
        const byCode = new Map(trips.map(trip => [trip.code, trip]));
        officialTrips.forEach(trip => {
          const parsed = global.TravelAssistantParser && global.TravelAssistantParser.parseTourCode(trip.code);
          if (parsed && parsed.airline) trip.airline = parsed.airline.replace('（舊代碼）','');
          const old = byCode.get(trip.code);
          if (old) byCode.set(trip.code, { ...trip, ...old, price:trip.price, dates:trip.dates,
            officialMatchedKeywords:[...new Set([...(old.officialMatchedKeywords||[]),...(trip.officialMatchedKeywords||[])])] });
          else byCode.set(trip.code, trip);
        });
        trips = [...byCode.values()]; localStorage.setItem('travelV10Db', JSON.stringify(trips));
        if (typeof global.renderDb === 'function') global.renderDb();
      } catch (error) { officialError = error.message; }
    }
    const results = rankTrips(trips, { people:$('matchPeople').value, destination:$('matchDestination').value,
      budget:$('matchBudget').value, month:$('matchMonth').value, keywords:$('matchKeywords').value });
    const box = $('matchResults'); box.innerHTML = '';
    status.className = 'status show ' + (results.length ? 'ok' : 'warn');
    status.textContent = results.length ? `找到 ${results.length} 個符合關鍵字的行程，已依符合程度排序。${officialCount ? ` 官網補充搜尋 ${officialCount} 筆結果。` : ''}` : (officialError ? `官網搜尋未完成：${officialError}；本機資料庫也沒有符合全部條件的行程。` : '沒有符合地區、月份、預算與關鍵字的行程，請嘗試放寬其中一項。');
    results.forEach((item, index) => {
      const card = document.createElement('div'); card.className = 'hint';
      card.style.borderLeft = index < 3 ? '5px solid #d92d45' : '1px solid #e6ebf2';
      card.innerHTML = `<strong>${index + 1}. ${item.trip.code ? item.trip.code + '｜' : ''}${item.trip.title || item.trip.mainTitle || '未命名行程'}</strong>
        <div style="margin-top:6px">${item.trip.airline || '航空待確認'}｜${item.trip.dates || '日期待確認'}</div>
        <div style="margin-top:4px">每人：${item.price ? item.price.toLocaleString('zh-TW') + ' 元起' : '價格待確認'}${item.total ? `｜${item.people} 人預估 ${item.total.toLocaleString('zh-TW')} 元起` : ''}</div>
        <div style="margin-top:6px;color:#087a55">推薦原因：${item.reasons.join('；')}</div>
        <div style="margin-top:5px;color:#a85b00">⚠️ 實際售價與 ${item.people} 人機位需回官網確認</div>
        ${item.trip.url ? `<div style="margin-top:7px"><a href="${item.trip.url}" target="_blank" rel="noopener">開啟官網行程</a></div>` : ''}`;
      box.appendChild(card);
    });
    button.disabled = false; button.textContent = '幫客人找適合的團';
  });
})(typeof window !== 'undefined' ? window : globalThis);

