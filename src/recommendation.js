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
  function sixMonthRange(base = new Date()) {
    const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const to = new Date(from); to.setMonth(to.getMonth() + 6);
    return { from:localDate(from), to:localDate(to) };
  }
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

  function basicMatches(trip, needs) {
    const price = numberFrom(trip.price), budget = Math.max(0, Number(needs.budget) || 0), people = Math.max(1, Number(needs.people) || 1);
    if (!destinationMatches(trip, needs.destination) || !monthMatches(trip, needs.month)) return false;
    if (budget && (!price || price > budget)) return false;
    if (Number(trip.seats) > 0 && Number(trip.seats) < people) return false;
    return true;
  }

  function rankTrips(trips, needs) {
    const people = Math.max(1, Number(needs.people) || 1);
    const budget = Math.max(0, Number(needs.budget) || 0);
    const keywords = parseKeywords(needs.keywords);
    return (trips || []).map(trip => {
      const price = numberFrom(trip.price);
      if (!basicMatches(trip, needs)) return null;
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

  function mergeOfficialTrip(oldTrip, officialTrip) {
    const old = oldTrip || {}, fresh = officialTrip || {};
    return { ...fresh, ...old,
      code:fresh.code || old.code, title:fresh.title || old.title, mainTitle:fresh.mainTitle || fresh.title || old.mainTitle,
      price:fresh.price || old.price, dates:fresh.dates || old.dates, seats:Number.isFinite(Number(fresh.seats)) ? Number(fresh.seats) : old.seats,
      airline:fresh.airline || old.airline, destination:fresh.destination || old.destination, url:fresh.url || old.url,
      source:fresh.source || old.source, updated:fresh.updated || new Date().toISOString()
    };
  }

  function applyLatestFields(trip, payload) {
    const fields = payload && payload.fields || {};
    const departures = Array.isArray(fields.departures) ? fields.departures : [];
    const selected = departures.find(item => String(item.code || '').toUpperCase() === String(trip.code || '').toUpperCase());
    const price = Number(fields.price) > 0 ? `${Number(fields.price).toLocaleString('en-US')}元起` : trip.price;
    return { ...trip,
      title:fields.title || trip.title, mainTitle:fields.title || trip.mainTitle || trip.title,
      price, dates:Array.isArray(fields.dates) && fields.dates.length ? fields.dates.join('、') : trip.dates,
      airline:fields.airline || trip.airline, seats:selected ? Number(selected.seats) || 0 : trip.seats,
      departures:departures.length ? departures : trip.departures,
      lastChecked:new Date().toISOString(), updated:new Date().toISOString(), source:payload.source || trip.source
    };
  }

  global.TravelRecommendation = { REGION_CODES, KEYWORD_ALIASES, parseKeywords, sixMonthRange, expandKeyword, numberFrom, destinationMatches, monthMatches, basicMatches, rankTrips, mergeOfficialTrip, applyLatestFields };
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

  async function fetchJsonWithRetry(url, attempts = 2, timeoutMs = 35000) {
    if (location.protocol === 'file:') throw new Error('目前是直接開啟 index.html，官網同步功能無法運作。請關閉此頁，改用 START_SERVER.bat 啟動程式。');
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
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
    const quickRegions = $('quickRegionSync');
    if (quickRegions) quickRegions.addEventListener('click', event => {
      const button = event.target.closest('button[data-region]');
      if (!button || syncButton.disabled) return;
      const range = sixMonthRange(new Date());
      $('syncKeyword').value = button.dataset.region;
      $('syncDateFrom').value = range.from; $('syncDateTo').value = range.to; $('syncLimit').value = '5000';
      syncButton.click();
    });
    syncButton.addEventListener('click', async () => {
      const keyword = $('syncKeyword').value.trim();
      const status = $('syncStatus');
      if (!keyword) { status.className = 'status show warn'; status.textContent = '請輸入地區或關鍵字，例如：東南亞、北海道、沙美島。'; return; }
      const limit = Number($('syncLimit').value) || 100;
      const fingerprint = JSON.stringify({ keyword, from:$('syncDateFrom').value, to:$('syncDateTo').value, limit });
      let checkpoint = null;
      try { checkpoint = JSON.parse(localStorage.getItem('travelSyncCheckpoint') || 'null'); } catch (_) {}
      if (!checkpoint || checkpoint.fingerprint !== fingerprint) checkpoint = { fingerprint, nextPage:1, processed:0, added:0, updated:0 };
      syncButton.disabled = true; syncButton.textContent = checkpoint.processed ? '繼續同步中…' : '正在讀取 Besttour…';
      $('syncProgressBox').style.display = 'block';
      status.className = 'status show warn'; status.textContent = checkpoint.processed ? `從上次的 ${checkpoint.processed} 團後繼續…` : '正在分批同步官網行程，每批會立即儲存…';
      try {
        let database = [];
        try { database = JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) {}
        const byCode = new Map(database.map(trip => [trip.code, trip]));
        let completed = false, officialPages = 0;
        while (checkpoint.processed < limit && !completed) {
          const pageSize = 50;
          const params = new URLSearchParams({ keyword, dateFrom:$('syncDateFrom').value.replaceAll('-','/'),
            dateTo:$('syncDateTo').value.replaceAll('-','/'), page:String(checkpoint.nextPage), pageSize:String(pageSize) });
          const payload = await fetchJsonWithRetry('/api/besttour/search?' + params, 3, 45000);
          const rows = (payload.data.trips || []).slice(0, Math.max(0, limit - checkpoint.processed)); officialPages = payload.data.totalPages || officialPages;
          rows.forEach(trip => {
            const parsed = global.TravelAssistantParser && global.TravelAssistantParser.parseTourCode(trip.code);
            if (parsed && parsed.airline) trip.airline = parsed.airline.replace('（舊代碼）','');
            const old = byCode.get(trip.code);
            if (old) { byCode.set(trip.code, mergeOfficialTrip(old, trip)); checkpoint.updated++; }
            else { byCode.set(trip.code, trip); checkpoint.added++; }
          });
          checkpoint.processed += rows.length; checkpoint.nextPage++;
          localStorage.setItem('travelV10Db', JSON.stringify([...byCode.values()]));
          localStorage.setItem('travelSyncCheckpoint', JSON.stringify(checkpoint));
          const percent = Math.min(99, Math.round(checkpoint.processed / Math.max(1, limit) * 100));
          $('syncProgress').value = percent; $('syncProgressPercent').textContent = percent + '%';
          $('syncProgressText').textContent = `已儲存 ${checkpoint.processed} 團，正在讀取第 ${checkpoint.nextPage} 批…`;
          status.textContent = `同步中：新增 ${checkpoint.added} 團、更新 ${checkpoint.updated} 團。`;
          const maxPages = officialPages || 100;
          completed = !payload.data.hasMore || checkpoint.processed >= limit || checkpoint.nextPage > Math.min(100, maxPages);
        }
        localStorage.removeItem('travelSyncCheckpoint');
        $('syncProgress').value = 100; $('syncProgressPercent').textContent = '100%'; $('syncProgressText').textContent = '同步完成';
        if (typeof global.renderDb === 'function') global.renderDb();
        status.className = 'status show ok';
        status.textContent = `同步完成：新增 ${checkpoint.added} 團、更新 ${checkpoint.updated} 團，共處理 ${checkpoint.processed} 團。`;
      } catch (error) {
        localStorage.setItem('travelSyncCheckpoint', JSON.stringify(checkpoint));
        status.className = 'status show err'; status.textContent = error.message + ` 已保留進度（${checkpoint.processed} 團），稍後再按一次「從 Besttour 官網同步」即可繼續。`;
      } finally { syncButton.disabled = false; syncButton.textContent = '從 Besttour 官網同步'; }
    });
  }

  const refreshButton = $('refreshDb');
  if (refreshButton) refreshButton.addEventListener('click', async () => {
    const status = $('refreshStatus'); const query = String($('dbSearch').value || '').trim().toLowerCase();
    let database = []; try { database = JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) {}
    const candidates = database.filter(trip => trip.code && (!query || `${trip.code} ${trip.title || trip.mainTitle || ''}`.toLowerCase().includes(query))).slice(0, 50);
    if (!candidates.length) { status.className='status show warn'; status.textContent='目前搜尋結果沒有可更新的團。'; return; }
    refreshButton.disabled=true; refreshButton.textContent='正在確認官網…';status.className='status show warn';status.textContent=`正在重新確認 ${candidates.length} 團的價格、機位與出發日…`;
    const byCode = new Map(database.map(trip => [trip.code, trip])); let cursor=0, success=0, failed=0;
    async function worker(){while(cursor<candidates.length){const trip=candidates[cursor++];try{const payload=await fetchJsonWithRetry('/api/itinerary/fetch?url='+encodeURIComponent(trip.code),2,45000);byCode.set(trip.code,applyLatestFields(trip,payload.data));success++;}catch(_){failed++;}status.textContent=`已確認 ${success+failed} / ${candidates.length} 團…`;}}
    await Promise.all(Array.from({length:Math.min(4,candidates.length)},worker));
    localStorage.setItem('travelV10Db',JSON.stringify([...byCode.values()]));if(typeof global.renderDb==='function')global.renderDb();
    status.className='status show '+(success?'ok':'err');status.textContent=`官網確認完成：成功 ${success} 團${failed?`、暫時失敗 ${failed} 團`:''}。已更新最低價、可見出發日、航空公司與當團機位。`;refreshButton.disabled=false;refreshButton.textContent='更新目前搜尋結果';
  });
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
    let contentChecked = 0;
    if (keywordWords.length) {
      const needs = { people:$('matchPeople').value, destination:$('matchDestination').value,
        budget:$('matchBudget').value, month:$('matchMonth').value };
      const candidates = trips.filter(trip => trip.code && basicMatches(trip, needs)).slice(0, 50);
      if (candidates.length) {
        status.textContent = `正在深入檢查 ${candidates.length} 團的每日行程、景點說明與體驗內容…`;
        try {
          const aliases = [...new Set(keywordWords.flatMap(expandKeyword))];
          const params = new URLSearchParams({ codes:candidates.map(trip => trip.code).join(','), keywords:aliases.join(',') });
          const payload = await fetchJsonWithRetry('/api/besttour/content-search?' + params, 1, 70000);
          contentChecked = payload.data.checked;
          const byCode = new Map(trips.map(trip => [trip.code, trip]));
          payload.data.results.forEach(result => {
            const old = byCode.get(result.code); if (!old) return;
            const matchedTerms = [...new Set(result.matches.flatMap(match => match.matchedTerms))];
            const originals = keywordWords.filter(word => expandKeyword(word).some(alias => matchedTerms.includes(alias)));
            const attractions = [...new Set(result.matches.flatMap(match => match.attractions || []))];
            byCode.set(result.code, { ...old,
              officialMatchedKeywords:[...new Set([...(old.officialMatchedKeywords||[]),...originals])],
              contentMatches:result.matches,
              highlights:[...new Set([...(old.highlights||[]),...attractions])]
            });
          });
          trips = [...byCode.values()]; localStorage.setItem('travelV10Db', JSON.stringify(trips));
        } catch (error) { officialError = officialError || error.message; }
      }
    }
    const results = rankTrips(trips, { people:$('matchPeople').value, destination:$('matchDestination').value,
      budget:$('matchBudget').value, month:$('matchMonth').value, keywords:$('matchKeywords').value });
    const box = $('matchResults'); box.innerHTML = '';
    status.className = 'status show ' + (results.length ? 'ok' : 'warn');
    status.textContent = results.length ? `找到 ${results.length} 個符合關鍵字的行程。${contentChecked ? ` 已檢查 ${contentChecked} 團的完整每日行程。` : ''}${officialCount ? ` 官網另補充 ${officialCount} 筆搜尋結果。` : ''}` : (officialError ? `官網搜尋未完成：${officialError}；本機資料庫也沒有符合全部條件的行程。` : `沒有符合條件的行程。${contentChecked ? `已檢查 ${contentChecked} 團完整內容。` : '請先從行程資料庫同步目的地行程，再搜尋內容。'}`);
    results.forEach((item, index) => {
      const card = document.createElement('div'); card.className = 'hint';
      card.style.borderLeft = index < 3 ? '5px solid #d92d45' : '1px solid #e6ebf2';
      const contentProof = (item.trip.contentMatches || []).slice(0, 2).map(match => `<div style="margin-top:7px;padding:7px 9px;background:#fff7ed;border-radius:7px;color:#7a3e00"><b>第 ${match.day || '?'} 天${match.date ? `（${match.date}）` : ''}</b>｜${match.excerpt}</div>`).join('');
      card.innerHTML = `<strong>${index + 1}. ${item.trip.code ? item.trip.code + '｜' : ''}${item.trip.title || item.trip.mainTitle || '未命名行程'}</strong>
        <div style="margin-top:6px">${item.trip.airline || '航空待確認'}｜${item.trip.dates || '日期待確認'}</div>
        <div style="margin-top:4px">每人：${item.price ? item.price.toLocaleString('zh-TW') + ' 元起' : '價格待確認'}${item.total ? `｜${item.people} 人預估 ${item.total.toLocaleString('zh-TW')} 元起` : ''}</div>
        <div style="margin-top:6px;color:#087a55">推薦原因：${item.reasons.join('；')}</div>
        ${contentProof}
        <div style="margin-top:5px;color:#a85b00">⚠️ 實際售價與 ${item.people} 人機位需回官網確認</div>
        ${item.trip.url ? `<div style="margin-top:7px"><a href="${item.trip.url}" target="_blank" rel="noopener">開啟官網行程</a></div>` : ''}`;
      box.appendChild(card);
    });
    button.disabled = false; button.textContent = '幫客人找適合的團';
  });
})(typeof window !== 'undefined' ? window : globalThis);

