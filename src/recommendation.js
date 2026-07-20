/* Travel Assistant Pro 1.1.0 - customer trip matching */
(function (global) {
  'use strict';

  const JAPAN = ['TYO','NRT','HND','OSA','KIX','UKB','NGO','SPK','CTS','HKD','FUK','OKA','SDJ','AOJ','AKJ','AXT','TOY','KMJ','KOJ'];
  const SOUTHEAST_ASIA = ['BKK','CNX','HKT','USM','DAD','HAN','SGN','PQC','SIN','KUL','BKI','PEN','DPS','CGK','MNL','CEB','PNH','RGN','BWN','VTE'];
  const ALL_SYNC_REGIONS = ['日本','韓國','東南亞','中西歐','北歐','南歐','東歐','美加','紐澳','中東非洲'];
  const REGION_CODES = {
    '日本':JAPAN, '北海道':['SPK','CTS','HKD','AKJ'], '東京':['TYO','NRT','HND'], '大阪':['OSA','KIX'], '九州':['FUK','KMJ','KOJ'],
    '韓國':['SEL','ICN','PUS','CJU'], '東南亞':SOUTHEAST_ASIA, '泰國':['BKK','CNX','HKT','USM'], '曼谷':['BKK'],
    '沙美島':['BKK'], '越南':['DAD','HAN','SGN','PQC'], '新加坡':['SIN'], '馬來西亞':['KUL','BKI','PEN'],
    '印尼':['DPS','CGK'], '菲律賓':['MNL','CEB'], '中國':['PVG','PEK','CAN','CTU','KMG']
  };
  const STRICT_DESTINATIONS = {
    '印度':{codes:['DEL','BOM','MAA','BLR','CCU','COK','JAI','VNS','ATQ'],terms:['印度共和國']},
    '印尼':{codes:['DPS','CGK','BTH','SUB','JOG'],terms:['印尼','印度尼西亞','峇里島','巴里島','民丹島']},
    '印度尼西亞':{codes:['DPS','CGK','BTH','SUB','JOG'],terms:['印尼','印度尼西亞','峇里島','巴里島','民丹島']}
  };
  const KEYWORD_ALIASES = {
    '人妖':['人妖','人妖秀','變性人秀','蒂芬妮','tiffany','阿卡薩','alcazar','卡里普索','calypso'],
    '人妖秀':['人妖','人妖秀','變性人秀','蒂芬妮','tiffany','阿卡薩','alcazar','卡里普索','calypso'],
    '海島':['海島','沙灘','沙美島','珊瑚島','格蘭島','浮潛'],
    '親子':['親子','樂園','動物園','水族館','迪士尼','環球影城'],
    '溫泉':['溫泉','泡湯','湯泉','美人湯'],
    '賞楓':['賞楓','楓葉','紅葉','楓紅'],
    '賞櫻':['賞櫻','櫻花','花見'],
    '玩雪':['玩雪','滑雪','雪地','雪盆','雪樂園','雪祭','冰雪','戲雪','雪上活動'],
    '滑雪':['滑雪','玩雪','雪地','雪盆','雪樂園','雪祭','冰雪','戲雪','雪上活動'],
    '夜市':['夜市','市集','步行街']
  };
  const PROFILE_TERMS = {
    senior:['溫泉','遊船','纜車','觀光列車','慢遊','輕鬆','登山','健行','步道','階梯','樓梯','爬坡','陡坡'],
    family:['親子','樂園','動物園','水族館','迪士尼','環球影城','農場','DIY','體驗'],
    youth:['體驗','夜市','樂園','自由活動','浮潛','滑雪','越野','健行','單車','遊船']
  };
  const SLOPE_TERMS = /登山|健行|爬山|爬坡|陡坡|山路|上坡|下坡/;
  const STAIR_TERMS = /階梯|樓梯|石階|千階|登階/;
  const LOW_COST_TERMS = /廉航|台灣虎航|亞洲航空|酷航|樂桃|越捷|捷星|宿霧太平洋/;
  const SHOPPING_TERMS = /購物站|購物店|免稅店|土產店|珠寶店|乳膠店/;

  function parseKeywords(value) { return String(value || '').split(/[、,，\s]+/).map(word => word.trim()).filter(Boolean).slice(0, 5); }
  const NON_CONTENT_PREFERENCES = new Set(['跟團','自由行','機加酒','不要廉航','可搭廉航','不要購物站','可接受購物站','少爬坡','少樓梯','長輩適合','親子友善','年輕人體驗']);
  function contentKeywords(value) { return parseKeywords(value).filter(word=>!NON_CONTENT_PREFERENCES.has(word)); }
  function sixMonthRange(base = new Date()) {
    const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const to = new Date(from); to.setMonth(to.getMonth() + 6);
    return { from:localDate(from), to:localDate(to) };
  }
  function oneYearRange(base = new Date()) {
    const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const to = new Date(from); to.setFullYear(to.getFullYear() + 1);
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
    const content = (trip.contentMatches || []).flatMap(match => [match.title, match.excerpt, ...(match.attractions || [])]);
    // Search API tags only record the query used; they are not proof that the itinerary contains it.
    return [trip.code, trip.title, trip.mainTitle, trip.subtitle, trip.destination, trip.airline, ...(trip.highlights || []), ...content].join(' ').toLowerCase();
  }

  function profileSearchTerms(needs) {
    const terms = [...(PROFILE_TERMS[String(needs.travelerType || '')] || [])];
    if (needs.avoidSlopes) terms.push('登山','健行','爬坡','陡坡','山路');
    if (needs.avoidStairs) terms.push('階梯','樓梯','石階');
    if (needs.easyPace) terms.push('慢遊','輕鬆','自由活動','溫泉','遊船');
    return [...new Set(terms)];
  }

  function destinationMatches(trip, wanted) {
    const value = String(wanted || '').trim();
    if (!value) return true;
    const strict = STRICT_DESTINATIONS[value];
    if (strict) {
      const code=String(trip.code||'').toUpperCase(),identity=[trip.title,trip.mainTitle,trip.destination].join(' ').toLowerCase();
      return strict.codes.some(prefix=>code.startsWith(prefix)) || strict.terms.some(term=>identity.includes(term.toLowerCase()));
    }
    if (tripText(trip).includes(value.toLowerCase())) return true;
    const codes = REGION_CODES[value] || [];
    return codes.some(code => String(trip.code || '').toUpperCase().startsWith(code));
  }

  function monthMatches(trip, month) {
    const months = (Array.isArray(month) ? month : [month]).map(Number).filter(Boolean);
    if (!months.length) return true;
    return months.some(value => new RegExp(`(?:^|[^0-9])0?${value}[\\/]`).test(String(trip.dates || '')));
  }

  function yearMatches(trip, year) {
    if (!year) return true;
    const years=[...String(trip.dates||'').matchAll(/(?:^|[^0-9])(20\d{2})[\/.-]/g)].map(match=>+match[1]);
    return !years.length || years.includes(Number(year));
  }

  function dateRangeMatches(trip, from, to) {
    if (!from && !to) return true;
    const values=[...String(trip.dates||'').matchAll(/20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}/g)].map(match=>new Date(match[0].replace(/[.]/g,'-'))).filter(date=>!Number.isNaN(date.getTime()));
    if (!values.length) return true;
    const start=from?new Date(from):null,end=to?new Date(to):null;
    return values.some(date=>(!start||date>=start)&&(!end||date<=end));
  }

  function airlineMatches(trip, wanted) {
    const terms = String(wanted || '').toUpperCase().split(/[、,，\s]+/).map(value => value.trim()).filter(Boolean);
    if (!terms.length) return true;
    const code = String(trip.code || '').toUpperCase();
    const codeMatch = code.match(/^[A-Z]{3}\d{2}([A-Z0-9]{2})/);
    const tripAirlineCode = codeMatch ? codeMatch[1] : '';
    const airlineName = String(trip.airline || '').toLowerCase();
    const airlines = global.TravelAssistantParser && global.TravelAssistantParser.AIRLINES || {};
    return terms.some(term => {
      if (/^[A-Z0-9]{2}$/.test(term)) return tripAirlineCode === term;
      const mappedCode = Object.keys(airlines).find(key => String(airlines[key]).toLowerCase().includes(term.toLowerCase()));
      return airlineName.includes(term.toLowerCase()) || Boolean(mappedCode && tripAirlineCode === mappedCode);
    });
  }

  function weekdayMatches(trip, wanted) {
    const selected = (wanted || []).map(Number).filter(value => value >= 0 && value <= 6);
    if (!selected.length || selected.length === 7) return true;
    const dates = [...String(trip.dates || '').matchAll(/20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/g)]
      .map(match => new Date(match[0].replace(/[.\/]/g, '-'))).filter(date => !Number.isNaN(date.getTime()));
    if (!dates.length) {
      const codeMatch = String(trip.code || '').toUpperCase().match(/^[A-Z]{3}\d{2}[A-Z0-9]{2}(\d{6})/);
      if (codeMatch) {
        const raw = codeMatch[1];
        const date = new Date(`20${raw.slice(0,2)}-${raw.slice(2,4)}-${raw.slice(4,6)}`);
        if (!Number.isNaN(date.getTime())) dates.push(date);
      }
    }
    return dates.some(date => selected.includes(date.getDay()));
  }

  function basicMatches(trip, needs) {
    const price = numberFrom(trip.price), budget = Math.max(0, Number(needs.budget) || 0), people = Math.max(1, Number(needs.people) || 1);
    if (!destinationMatches(trip, needs.destination) || !monthMatches(trip, needs.month) || !yearMatches(trip,needs.year) || !dateRangeMatches(trip,needs.dateFrom,needs.dateTo) || !airlineMatches(trip, needs.airline) || !weekdayMatches(trip, needs.weekdays)) return false;
    if (budget && (!price || price > budget)) return false;
    if (Number(needs.priceMin) > 0 && (!price || price < Number(needs.priceMin))) return false;
    if (Number(trip.seats) > 0 && Number(trip.seats) < people) return false;
    if (Number(needs.minSeats) > 0 && (!Number(trip.seats) || Number(trip.seats) < Number(needs.minSeats))) return false;
    const wantedDays = Number(needs.days) || 0, tripDays = Number((String(trip.days || '').match(/\d{1,2}/) || [])[0]) || 0;
    if (wantedDays && tripDays && wantedDays !== tripDays) return false;
    if (Number(needs.minDays) > 0 && tripDays && tripDays < Number(needs.minDays)) return false;
    if (Number(needs.maxDays) > 0 && tripDays && tripDays > Number(needs.maxDays)) return false;
    const airport = String(needs.departureAirport || '').trim(), knownAirport = String(trip.departureCity || '').trim();
    if (airport && knownAirport && !knownAirport.includes(airport)) return false;
    if (needs.avoidRedEye && /紅眼|凌晨|00:\d{2}|01:\d{2}|02:\d{2}|03:\d{2}|04:\d{2}/.test(tripText(trip))) return false;
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
      if (needs.avoidLowCost && LOW_COST_TERMS.test(haystack)) return null;
      if (needs.avoidShopping && SHOPPING_TERMS.test(haystack)) return null;
      if (needs.avoidSlopes && SLOPE_TERMS.test(haystack)) return null;
      if (needs.avoidStairs && STAIR_TERMS.test(haystack)) return null;
      const matchedKeywords = keywords.filter(word => expandKeyword(word).some(alias => haystack.includes(alias)));
      if (keywords.length && !matchedKeywords.length) return null;
      let score = 50;
      const reasons = [];
      if (needs.destination) { score += 25; reasons.push(`符合地區：${needs.destination}`); }
      if (budget && price) { score += Math.max(0, 20 - Math.round((price / budget) * 10)); reasons.push(`每人 ${price.toLocaleString('zh-TW')} 元，在預算內`); }
      if (needs.month) { score += 15; reasons.push(`有 ${Number(needs.month)} 月出發日`); }
      if (matchedKeywords.length) { score += matchedKeywords.length * 8; reasons.push(`符合偏好：${matchedKeywords.join('、')}`); }
      const travelerType = String(needs.travelerType || '');
      const profileLabels = { senior:'長輩／銀髮', family:'親子家庭', youth:'年輕人體驗' };
      const positive = travelerType === 'senior' ? /溫泉|遊船|纜車|觀光列車|慢遊|輕鬆/ : travelerType === 'family' ? /親子|樂園|動物園|水族館|迪士尼|環球影城|農場|DIY/ : travelerType === 'youth' ? /體驗|夜市|樂園|自由活動|浮潛|滑雪|越野|健行|單車/ : null;
      if (positive && positive.test(haystack)) { score += 18; reasons.push(`適合${profileLabels[travelerType]}的內容`); }
      if (travelerType === 'senior' && (SLOPE_TERMS.test(haystack) || STAIR_TERMS.test(haystack))) { score -= 25; reasons.push('含步道／坡道資訊，長輩需再評估'); }
      if (needs.easyPace) {
        if (/慢遊|輕鬆|自由活動|溫泉|遊船/.test(haystack)) { score += 12; reasons.push('有較輕鬆的行程內容'); }
        if (SLOPE_TERMS.test(haystack) || STAIR_TERMS.test(haystack)) score -= 15;
      }
      if (needs.avoidSlopes) reasons.push('未在已取得文字中發現明顯爬坡描述，仍需人工確認');
      if (needs.avoidStairs) reasons.push('未在已取得文字中發現明顯樓梯描述，仍需人工確認');
      if (needs.avoidLowCost) reasons.push('目前資料未顯示廉航，仍需人工確認實際航班');
      if (needs.avoidShopping) reasons.push('目前資料未顯示購物站，仍需人工確認完整行程');
      if (!reasons.length) reasons.push('符合目前設定的基本條件');
      return { trip, price, people, total: price ? price * people : 0, score, reasons };
    }).filter(Boolean).sort((a, b) => needs.sortBy === 'price' ? a.price - b.price : needs.sortBy === 'date' ? String(a.trip.dates||'').localeCompare(String(b.trip.dates||'')) : b.score - a.score || a.price - b.price).slice(0, 8);
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

  global.TravelRecommendation = { REGION_CODES, STRICT_DESTINATIONS, ALL_SYNC_REGIONS, KEYWORD_ALIASES, PROFILE_TERMS, parseKeywords, contentKeywords, sixMonthRange, oneYearRange, expandKeyword, profileSearchTerms, numberFrom, destinationMatches, monthMatches, yearMatches, dateRangeMatches, airlineMatches, weekdayMatches, basicMatches, rankTrips, mergeOfficialTrip, applyLatestFields };
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const button = $('runMatch');
  if (!button) return;
  const keywordInput = $('matchKeywords');
  if (keywordInput && !$('matchAirline')) keywordInput.insertAdjacentHTML('afterend', `<label style="margin-top:10px">航空公司或代碼（選填）</label><input id="matchAirline" placeholder="例如：BX、BR、CI，或釜山航空、長榮航空">`);
  if (keywordInput && !$('advancedMatchFilters')) keywordInput.insertAdjacentHTML('afterend', `<details id="advancedMatchFilters" style="margin-top:10px" class="hint"><summary style="cursor:pointer;font-weight:800">更多篩選條件</summary><div class="grid3" style="margin-top:10px"><div><label>最低價格</label><input id="matchPriceMin" type="number" min="0" step="1000" placeholder="例如 20000"></div><div><label>至少剩餘機位</label><input id="matchMinSeats" type="number" min="0" placeholder="例如 4"></div><div><label>行程天數</label><input id="matchDays" type="number" min="1" max="30" placeholder="例如 5"></div></div><div class="grid2" style="margin-top:10px"><div><label>出發機場</label><select id="matchAirport"><option value="">不限</option><option>桃園</option><option>台中</option><option>高雄</option></select></div><div><label>排序</label><select id="matchSort"><option value="score">符合度優先</option><option value="price">價格低到高</option><option value="date">出發日優先</option></select></div></div><div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px"><label style="font-weight:400"><input id="matchAvoidLowCost" type="checkbox" style="width:auto"> 排除廉航</label><label style="font-weight:400"><input id="matchAvoidShopping" type="checkbox" style="width:auto"> 排除購物站</label><label style="font-weight:400"><input id="matchAvoidRedEye" type="checkbox" style="width:auto"> 排除紅眼航班</label></div></details>`);
  const monthSelect = $('matchMonth');
  if (monthSelect) {
    monthSelect.style.display = 'none';
    if (!$('matchMonths')) monthSelect.insertAdjacentHTML('afterend', `<div id="matchMonths" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">${Array.from({length:12},(_,index)=>`<label style="font-weight:400;font-size:12px"><input class="matchMonthChoice" type="checkbox" value="${index+1}" style="width:auto"> ${index+1}月</label>`).join('')}<span class="small" style="width:100%">未勾選任何月份＝不限月份</span></div>`);
  }
  if (keywordInput && !$('matchWeekdays')) keywordInput.insertAdjacentHTML('afterend', `<div id="matchWeekdays" style="margin-top:10px"><label>每週出發日</label><div class="hint" style="padding:8px;display:flex;gap:14px;flex-wrap:wrap">${[['一',1],['二',2],['三',3],['四',4],['五',5],['六',6],['日',0]].map(([label,value])=>`<label style="font-weight:400"><input class="matchWeekday" type="checkbox" value="${value}" checked style="width:auto"> 週${label}</label>`).join('')}</div></div>`);
  if (keywordInput && !$('travelerType')) keywordInput.insertAdjacentHTML('afterend', `<div class="grid2" style="margin-top:10px"><div><label>旅客類型</label><select id="travelerType"><option value="">不限</option><option value="senior">長輩／銀髮</option><option value="family">親子家庭</option><option value="youth">年輕人體驗</option></select></div><div><label>行動與步調需求</label><div class="hint" style="padding:8px"><label style="font-weight:400"><input id="avoidSlopes" type="checkbox" style="width:auto"> 少爬坡／避免登山</label><label style="font-weight:400;margin-top:5px"><input id="avoidStairs" type="checkbox" style="width:auto"> 少樓梯／避免階梯</label><label style="font-weight:400;margin-top:5px"><input id="easyPace" type="checkbox" style="width:auto"> 步調輕鬆</label></div></div></div><div class="note">坡道、樓梯與無障礙資訊依官網文字初步判斷，報名前仍需向業務、景點及飯店確認。</div>`);

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
    const allSyncButton = document.createElement('button');
    allSyncButton.id = 'syncAllBesttour'; allSyncButton.type = 'button'; allSyncButton.className = 'primary'; allSyncButton.textContent = '一次同步全部行程';
    syncButton.insertAdjacentElement('beforebegin', allSyncButton);
    const stopButton = document.createElement('button');
    stopButton.id = 'stopSync'; stopButton.type = 'button'; stopButton.textContent = '停止同步'; stopButton.disabled = true;
    syncButton.insertAdjacentElement('afterend', stopButton);
    let stopRequested = false, allSyncActive = false, allSyncCancelled = false;
    stopButton.addEventListener('click', () => {
      stopRequested = true; allSyncCancelled = true; stopButton.disabled = true; stopButton.textContent = '停止中…';
      const status = $('syncStatus'); status.className = 'status show warn'; status.textContent = '正在完成並儲存目前這一批，完成後就會停止。';
    });
    const today = new Date();
    const nextYear = new Date(today); nextYear.setFullYear(today.getFullYear() + 1);
    if (!$('syncDateFrom').value) $('syncDateFrom').value = localDate(today);
    if (!$('syncDateTo').value) $('syncDateTo').value = localDate(nextYear);
    const quickRegions = $('quickRegionSync');
    if (quickRegions) quickRegions.addEventListener('click', event => {
      const button = event.target.closest('button[data-region]');
      if (!button || syncButton.disabled) return;
      const range = oneYearRange(new Date());
      $('syncKeyword').value = button.dataset.region;
      $('syncDateFrom').value = range.from; $('syncDateTo').value = range.to; $('syncLimit').value = '5000';
      syncButton.click();
    });
    allSyncButton.addEventListener('click', async () => {
      if (allSyncActive || syncButton.disabled) return;
      allSyncActive = true; allSyncCancelled = false; allSyncButton.disabled = true;
      const range = sixMonthRange(new Date());
      $('syncDateFrom').value = range.from; $('syncDateTo').value = range.to; $('syncLimit').value = '5000';
      for (let index = 0; index < ALL_SYNC_REGIONS.length; index++) {
        if (allSyncCancelled) break;
        const region = ALL_SYNC_REGIONS[index];
        $('syncKeyword').value = region;
        const status = $('syncStatus'); status.className = 'status show warn';
        status.textContent = `全部同步進度 ${index + 1}/${ALL_SYNC_REGIONS.length}：正在下載${region}行程…`;
        syncButton.click();
        await new Promise(resolve => {
          const timer = setInterval(() => { if (!syncButton.disabled) { clearInterval(timer); resolve(); } }, 250);
        });
      }
      const database = (() => { try { return JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) { return []; } })();
      const status = $('syncStatus');
      status.className = 'status show ' + (allSyncCancelled ? 'warn' : 'ok');
      status.textContent = allSyncCancelled ? `全部同步已停止，目前資料庫共有 ${database.length} 團。` : `全部地區同步完成，資料庫共有 ${database.length} 團（重複團號已自動合併）。`;
      allSyncActive = false; allSyncButton.disabled = false;
    });
    syncButton.addEventListener('click', async () => {
      const keyword = $('syncKeyword').value.trim();
      const status = $('syncStatus');
      if (!keyword) { status.className = 'status show warn'; status.textContent = '請輸入地區或關鍵字，例如：東南亞、北海道、沙美島。'; return; }
      stopRequested = false; stopButton.disabled = false; stopButton.textContent = '停止同步';
      const limit = Number($('syncLimit').value) || 100;
      const fingerprint = JSON.stringify({ keyword, from:$('syncDateFrom').value, to:$('syncDateTo').value, limit });
      let checkpoint = null;
      try { checkpoint = JSON.parse(localStorage.getItem('travelSyncCheckpoint') || 'null'); } catch (_) {}
      if (!checkpoint || checkpoint.fingerprint !== fingerprint) checkpoint = { fingerprint, nextPage:1, processed:0, added:0, updated:0, skipped:0 };
      checkpoint.skipped = Number(checkpoint.skipped) || 0;
      syncButton.disabled = true; syncButton.textContent = checkpoint.processed ? '繼續同步中…' : '正在讀取 Besttour…';
      $('syncProgressBox').style.display = 'block';
      status.className = 'status show warn'; status.textContent = checkpoint.processed ? `從上次的 ${checkpoint.processed} 團後繼續…` : '正在分批同步官網行程，每批會立即儲存…';
      try {
        let database = [];
        try { database = JSON.parse(localStorage.getItem('travelV10Db') || '[]'); } catch (_) {}
        const byCode = new Map(database.map(trip => [trip.code, trip]));
        let completed = false, stopped = false, officialPages = 0;
        while (checkpoint.processed < limit && !completed) {
          if (stopRequested) { stopped = true; break; }
          const pageSize = 50;
          const params = new URLSearchParams({ keyword, dateFrom:$('syncDateFrom').value.replaceAll('-','/'),
            dateTo:$('syncDateTo').value.replaceAll('-','/'), page:String(checkpoint.nextPage), pageSize:String(pageSize) });
          const payload = await fetchJsonWithRetry('/api/besttour/search?' + params, 3, 45000);
          const rows = (payload.data.trips || []).slice(0, Math.max(0, limit - checkpoint.processed)); officialPages = payload.data.totalPages || officialPages;
          rows.forEach(trip => {
            const parsed = global.TravelAssistantParser && global.TravelAssistantParser.parseTourCode(trip.code);
            if (parsed && parsed.airline) trip.airline = parsed.airline.replace('（舊代碼）','');
            const old = byCode.get(trip.code);
            if (old) {
              const changed = ['title','mainTitle','price','dates','seats','airline','destination','url'].some(key => String(old[key] ?? '') !== String(trip[key] ?? ''));
              if (changed) { byCode.set(trip.code, mergeOfficialTrip(old, trip)); checkpoint.updated++; }
              else checkpoint.skipped++;
            }
            else { byCode.set(trip.code, trip); checkpoint.added++; }
          });
          checkpoint.processed += rows.length; checkpoint.nextPage++;
          localStorage.setItem('travelV10Db', JSON.stringify([...byCode.values()]));
          localStorage.setItem('travelSyncCheckpoint', JSON.stringify(checkpoint));
          const percent = Math.min(99, Math.round(checkpoint.processed / Math.max(1, limit) * 100));
          $('syncProgress').value = percent; $('syncProgressPercent').textContent = percent + '%';
          $('syncProgressText').textContent = `已儲存 ${checkpoint.processed} 團，正在讀取第 ${checkpoint.nextPage} 批…`;
          status.textContent = `同步中：新增 ${checkpoint.added} 團、更新 ${checkpoint.updated} 團、略過未變更 ${checkpoint.skipped} 團。`;
          if (stopRequested) { stopped = true; break; }
          const maxPages = officialPages || 100;
          completed = !payload.data.hasMore || checkpoint.processed >= limit || checkpoint.nextPage > Math.min(100, maxPages);
        }
        if (stopped) {
          localStorage.setItem('travelSyncCheckpoint', JSON.stringify(checkpoint));
          $('syncProgressText').textContent = `已停止，已安全儲存 ${checkpoint.processed} 團`;
          status.className = 'status show warn';
          status.textContent = `同步已停止：新增 ${checkpoint.added} 團、更新 ${checkpoint.updated} 團。再按同一地區即可從第 ${checkpoint.nextPage} 批繼續。`;
          return;
        }
        localStorage.removeItem('travelSyncCheckpoint');
        $('syncProgress').value = 100; $('syncProgressPercent').textContent = '100%'; $('syncProgressText').textContent = '同步完成';
        if (typeof global.renderDb === 'function') global.renderDb();
        status.className = 'status show ok';
        status.textContent = `同步完成：新增 ${checkpoint.added} 團、更新 ${checkpoint.updated} 團、略過未變更 ${checkpoint.skipped} 團，共檢查 ${checkpoint.processed} 團。`;
      } catch (error) {
        localStorage.setItem('travelSyncCheckpoint', JSON.stringify(checkpoint));
        status.className = 'status show err'; status.textContent = error.message + ` 已保留進度（${checkpoint.processed} 團），稍後再按一次「從 Besttour 官網同步」即可繼續。`;
      } finally { syncButton.disabled = false; syncButton.textContent = '從 Besttour 官網同步'; stopButton.disabled = true; stopButton.textContent = '停止同步'; }
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
    let customerRequest = {}; try { customerRequest=JSON.parse(button.dataset.customerRequest||'{}'); } catch (_) {}
    const keywordWords = contentKeywords($('matchKeywords').value);
    const travelerNeeds = { travelerType:$('travelerType').value, avoidSlopes:$('avoidSlopes').checked,
      avoidStairs:$('avoidStairs').checked, easyPace:$('easyPace').checked };
    const contentWords = [...new Set([...keywordWords.flatMap(expandKeyword), ...profileSearchTerms(travelerNeeds)])];
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
    if (contentWords.length) {
      const needs = { people:$('matchPeople').value, destination:$('matchDestination').value,
        budget:$('matchBudget').value, month:$('matchMonth').value };
      const candidates = trips.filter(trip => trip.code && basicMatches(trip, needs)).slice(0, 50);
      if (candidates.length) {
        status.textContent = `正在深入檢查 ${candidates.length} 團的每日行程、景點說明與體驗內容…`;
        try {
          const params = new URLSearchParams({ codes:candidates.map(trip => trip.code).join(','), keywords:contentWords.join(',') });
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
    const selectedMonths=[...document.querySelectorAll('.matchMonthChoice:checked')].map(input=>Number(input.value));
    const exactNeeds = { people:$('matchPeople').value, destination:$('matchDestination').value, airline:$('matchAirline').value,
      weekdays:[...document.querySelectorAll('.matchWeekday:checked')].map(input=>Number(input.value)),
      budget:$('matchBudget').value, priceMin:$('matchPriceMin').value, minSeats:$('matchMinSeats').value,
      month:selectedMonths.length ? selectedMonths : $('matchMonth').value, year:customerRequest.requestedYear, keywords:keywordWords.join('、'),
      days:$('matchDays').value || customerRequest.days, minDays:customerRequest.minDays, maxDays:customerRequest.maxDays,
      departureAirport:$('matchAirport').value || (customerRequest.airports||[])[0], dateFrom:(customerRequest.dates||[])[0], dateTo:(customerRequest.dates||[])[1]||(customerRequest.dates||[])[0], sortBy:$('matchSort').value,
      avoidLowCost:$('matchAvoidLowCost').checked || (customerRequest.preferences||[]).includes('不要廉航'), avoidShopping:$('matchAvoidShopping').checked || (customerRequest.preferences||[]).includes('不要購物站'), avoidRedEye:$('matchAvoidRedEye').checked, ...travelerNeeds };
    let results = rankTrips(trips, exactNeeds), relaxed = '';
    if (!results.length) {
      const alternatives = [
        ...((customerRequest.alternatives||[]).map(destination=>[{...exactNeeds,destination},`已放寬：改用備選目的地 ${destination}`])),
        [{...exactNeeds, dateFrom:'',dateTo:''}, '已放寬：指定日期範圍'],
        [{...exactNeeds, month:''}, '已放寬：出發月份'],
        [{...exactNeeds, departureAirport:''}, '已放寬：出發機場'],
        [{...exactNeeds, days:''}, '已放寬：旅遊天數'],
        [{...exactNeeds, budget:Math.round((Number(exactNeeds.budget)||0)*1.15)}, '已放寬：預算上限增加 15%']
      ];
      for (const [needs,label] of alternatives) { const found=rankTrips(trips,needs); if(found.length){results=found.map(item=>({...item,relaxation:label}));relaxed=label;break;} }
    }
    const box = $('matchResults'); box.innerHTML = '';
    status.className = 'status show ' + (results.length ? 'ok' : 'warn');
    status.textContent = results.length ? `${relaxed?`沒有完全符合的商品；${relaxed}後，`:''}找到 ${results.length} 個行程。${contentChecked ? ` 已檢查 ${contentChecked} 團的完整每日行程。` : ''}${officialCount ? ` 官網另補充 ${officialCount} 筆搜尋結果。` : ''}` : (officialError ? `官網搜尋未完成：${officialError}；本機資料庫也沒有符合全部條件的行程。` : `沒有符合條件的行程。${contentChecked ? `已檢查 ${contentChecked} 團完整內容。` : '請先從行程資料庫同步目的地行程，再搜尋內容。'}`);
    if (customerRequest.travelType && customerRequest.travelType !== '跟團') status.textContent += ` 注意：目前官方資料來源以團體行程為主，「${customerRequest.travelType}」商品需至外部訂房／機票系統人工確認。`;
    results.forEach((item, index) => {
      const card = document.createElement('div'); card.className = 'hint'; card.dataset.matchIndex=String(index);
      card.style.borderLeft = index < 3 ? '5px solid #d92d45' : '1px solid #e6ebf2';
      const contentProof = (item.trip.contentMatches || []).slice(0, 2).map(match => `<div style="margin-top:7px;padding:7px 9px;background:#fff7ed;border-radius:7px;color:#7a3e00"><b>第 ${match.day || '?'} 天${match.date ? `（${match.date}）` : ''}</b>｜${match.excerpt}</div>`).join('');
      card.innerHTML = `<strong>${index + 1}. ${item.trip.code ? item.trip.code + '｜' : ''}${item.trip.title || item.trip.mainTitle || '未命名行程'}</strong>
        <div style="margin-top:6px">${item.trip.airline || '航空待確認'}｜${item.trip.dates || '日期待確認'}</div>
        <div style="margin-top:4px">每人：${item.price ? item.price.toLocaleString('zh-TW') + ' 元起' : '價格待確認'}${item.total ? `｜${item.people} 人預估 ${item.total.toLocaleString('zh-TW')} 元起` : ''}</div>
        <div style="margin-top:6px;color:#087a55">推薦原因：${item.reasons.join('；')}</div>
        ${item.relaxation?`<div style="margin-top:6px;color:#a85b00"><b>替代方案：${item.relaxation}</b></div>`:''}
        ${contentProof}
        <div style="margin-top:5px;color:#a85b00">⚠️ 實際售價與 ${item.people} 人機位需回官網確認</div>
        <div style="margin-top:5px;color:#667085">資料來源：${item.trip.source || '待人工確認'}｜最後更新：${item.trip.lastChecked || item.trip.updated || '待人工確認'}</div>
        ${item.trip.url ? `<div style="margin-top:7px"><a href="${item.trip.url}" target="_blank" rel="noopener">開啟官網行程</a></div>` : ''}`;
      box.appendChild(card);
    });
    document.dispatchEvent(new CustomEvent('travel:match-results',{detail:results}));
    button.disabled = false; button.textContent = '深入搜尋';
  });
})(typeof window !== 'undefined' ? window : globalThis);

