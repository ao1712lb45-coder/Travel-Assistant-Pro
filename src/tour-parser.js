/* Travel Assistant Pro 1.1.0 - itinerary parser */
(function (global) {
  'use strict';

  const AIRLINES = {
    AE:'華信航空', BR:'長榮航空', B7:'立榮航空', CI:'中華航空', FE:'遠東航空（舊代碼）', GE:'復興航空（舊代碼）',
    IT:'台灣虎航', JX:'星宇航空', KE:'大韓航空', LJ:'真航空', OZ:'韓亞航空', JL:'日本航空', NH:'全日空', TW:'德威航空',
    CA:'中國國際航空', CX:'國泰航空', CZ:'中國南方航空', FM:'上海航空', HO:'吉祥航空', HU:'海南航空', HX:'香港航空',
    KA:'港龍航空（舊代碼）', MF:'廈門航空', MU:'中國東方航空', NX:'澳門航空', OM:'蒙古航空', SC:'山東航空',
    UO:'香港快運航空', ZH:'深圳航空', '3U':'四川航空', AI:'印度航空', AK:'亞洲航空', BX:'釜山航空', BG:'孟加拉航空', BI:'汶萊皇家航空',
    D7:'亞洲航空X', FD:'泰國亞洲航空', FJ:'斐濟航空', GA:'印尼航空', JQ:'捷星航空', MH:'馬來西亞航空',
    MI:'勝安航空（舊代碼）', NZ:'紐西蘭航空', PG:'曼谷航空', PR:'菲律賓航空', QF:'澳洲航空', QV:'寮國航空',
    QZ:'印尼亞洲航空', RA:'尼泊爾航空', SL:'泰國獅子航空', SQ:'新加坡航空', TG:'泰國航空', TN:'大溪地航空', TR:'酷航',
    TZ:'酷航（舊代碼）', WE:'泰國微笑航空（舊代碼）', '3K':'捷星亞洲航空', '5J':'宿霧太平洋航空', '8M':'緬甸國際航空',
    '9W':'印度捷特航空（舊代碼）', AA:'美國航空', AC:'加拿大航空', AM:'墨西哥國際航空', AR:'阿根廷航空',
    AS:'阿拉斯加航空', AV:'哥倫比亞航空', B6:'捷藍航空', CM:'巴拿馬航空', DL:'達美航空', F9:'邊疆航空',
    HA:'夏威夷航空', LA:'南美航空', LP:'秘魯航空（舊代碼）', MX:'墨西哥航空（舊代碼）', TA:'中美洲航空',
    UA:'聯合航空', US:'全美航空（舊代碼）', VS:'維珍航空', WN:'西南航空', WS:'西捷航空', EK:'阿聯酋航空',
    EY:'阿提哈德航空', ET:'衣索比亞航空', GF:'海灣航空', LY:'以色列航空', IR:'伊朗航空', KQ:'肯亞航空',
    KU:'科威特航空', MK:'模里西斯航空', MS:'埃及航空', QR:'卡達航空', RJ:'皇家約旦航空', SA:'南非航空',
    SV:'沙烏地阿拉伯航空', TK:'土耳其航空', UL:'斯里蘭卡航空', A3:'愛琴海航空', AF:'法國航空', AY:'芬蘭航空',
    AZ:'義大利航空（舊代碼）', BA:'英國航空', EI:'愛爾蘭航空', FI:'冰島航空', IB:'西班牙航空', KC:'哈薩克航空',
    KL:'荷蘭航空', LH:'德國漢莎航空', LO:'波蘭航空', LX:'瑞士航空', OS:'奧地利航空', SK:'北歐航空',
    SN:'比利時航空', SU:'俄羅斯航空', TP:'葡萄牙航空', U2:'易捷航空', UX:'歐羅巴航空',
    MM:'樂桃航空', VZ:'泰越捷航空', VN:'越南航空', QH:'越竹航空'
  };

  const CITY_NAMES = {
    SPK: '北海道', AKJ: '旭川', TYO: '東京', OSA: '大阪', UKB: '神戶',
    FUK: '福岡／九州', KOJ: '鹿兒島', OKA: '沖繩', SDJ: '仙台／東北',
    AOJ: '青森', AXT: '秋田', TOY: '富山／北陸', NGO: '名古屋',
    BKK: '曼谷', CNX: '清邁', HKT: '普吉島', PUS: '釜山', ICN: '首爾',
    PVG: '上海／江南', KMG: '昆明／雲南', AMS: '阿姆斯特丹', ROM: '羅馬'
  };

  const clean = value => String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .trim();

  const unique = values => [...new Set(values.filter(Boolean))];

  function normalizeUrl(url) {
    const raw = clean(url);
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      if (parsed.hostname.includes('ittms.com.tw')) parsed.searchParams.set('agt_no', '3004C5');
      return parsed.toString();
    } catch (_) {
      return raw;
    }
  }

  function parseTourCode(codeOrText) {
    const text = clean(codeOrText).toUpperCase();
    const match = text.match(/\b([A-Z]{3})(\d{2})([A-Z0-9]{2})(\d{6})([A-Z0-9]{1,5})\b/);
    if (!match) return null;
    const [, cityCode, dayCode, airlineCode, yymmdd, suffix] = match;
    return {
      code: match[0],
      cityCode,
      destination: CITY_NAMES[cityCode] || cityCode,
      days: Number(dayCode),
      airlineCode,
      airline: AIRLINES[airlineCode] || airlineCode,
      departureDate: `${Number(yymmdd.slice(2, 4))}/${Number(yymmdd.slice(4, 6))}`,
      year: 2000 + Number(yymmdd.slice(0, 2)),
      suffix
    };
  }

  function extractCode(text, url) {
    const combined = `${url || ''}\n${text || ''}`;
    const byParam = combined.match(/[?&]travel_no=([A-Z0-9]{10,30})/i);
    const byLabel = combined.match(/(?:團號|行程代碼)\s*[:：]?\s*([A-Z0-9]{10,30})/i);
    const generic = combined.match(/\b[A-Z]{3}\d{2}[A-Z0-9]{2}\d{6}[A-Z0-9]{1,5}\b/i);
    return clean((byParam && byParam[1]) || (byLabel && byLabel[1]) || (generic && generic[0])).toUpperCase();
  }

  function extractTitle(text) {
    const lines = String(text || '').split(/\r?\n/).map(clean).filter(Boolean);
    let candidate = lines.find(line => /[【\[][^】\]]+(?:日|天)[】\]]/.test(line));
    if (!candidate) candidate = lines.find(line => /(?:[3-9３-９]|10|１０)(?:日|天)/.test(line) && line.length <= 150);
    candidate = clean(candidate);
    if (!candidate) return { title: '', subtitle: '', source: '' };
    const wrapped = candidate.match(/[【\[]([^】\]]+)[】\]]\s*(.*)/);
    if (wrapped) return { title: clean(wrapped[1]), subtitle: clean(wrapped[2]), source: candidate };
    const parts = candidate.split(/[｜|]/).map(clean);
    return { title: parts[0], subtitle: parts.slice(1).join('、'), source: candidate };
  }

  function extractPrice(text) {
    const source = String(text || '');
    const patterns = [
      /(?:最低售價|最低價|優惠價|清艙價|一口價|團費|售價|價格)\s*[:：]?\s*(?:NT\$|NTD|\$)?\s*([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{3,5})\s*元?\s*(?:起)?/i,
      /(?:NT\$|NTD|\$)\s*([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{3,5})\s*元?\s*(?:起)?/i,
      /([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{3,5})\s*元\s*(?:起)?/i
    ];
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (!match) continue;
      const value = Number(match[1].replace(/,/g, ''));
      if (value >= 1000 && value <= 999999) return { value, display: `${value.toLocaleString('en-US')}元起`, source: match[0] };
    }
    return { value: null, display: '', source: '' };
  }

  function extractDates(text, fallbackDate) {
    let zone = String(text || '');
    const preferred = zone.match(/(?:出發日期|可售日期|選擇日期|團體售價)[\s\S]{0,2600}/i);
    if (preferred) zone = preferred[0];
    zone = zone.replace(/(?:參考航班|航班資訊|去程航班|回程航班)[\s\S]{0,1200}/ig, ' ');
    const dates = [];
    for (const match of zone.matchAll(/(?<!\d)(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?!\d)/g)) {
      dates.push(`${Number(match[2])}/${Number(match[3])}`);
    }
    for (const match of zone.matchAll(/(?<!\d)(\d{1,2})[\/.\-](\d{1,2})(?!\d)/g)) {
      const month = Number(match[1]);
      const day = Number(match[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) dates.push(`${month}/${day}`);
    }
    const output = unique(dates).slice(0, 60);
    if (!output.length && fallbackDate) output.push(fallbackDate);
    return output;
  }

  function extractAirline(text, parsedCode) {
    // 喜鴻團號中的航空代碼是產品識別的一部分，優先於頁面內可能混入的
    // 共用參考航班文字，避免 FD 團被 CI 航班內容錯誤覆蓋。
    if (parsedCode && AIRLINES[parsedCode.airlineCode]) return AIRLINES[parsedCode.airlineCode];
    const source = String(text || '');
    const flightZone = (source.match(/(?:參考航班|航班資訊|去程航班|回程航班)[\s\S]{0,1600}/i) || [''])[0];
    const target = flightZone || source;
    for (const [code, name] of Object.entries(AIRLINES)) {
      const namePattern = name.replace('航空', '(?:航空)?');
      if (new RegExp(`${namePattern}|\\b${code}\\s*\\d{2,4}\\b`, 'i').test(target)) return name;
    }
    return '';
  }

  function extractHighlights(text, subtitle) {
    const highlights = clean(subtitle).split(/[、，,／/・]/).map(clean).filter(item => item.length >= 2);
    const zone = (String(text || '').match(/(?:行程特色|行程亮點|特色光點|行程焦點)[\s\S]{0,2200}/i) || [''])[0];
    if (zone) {
      highlights.push(...zone.split(/\r?\n/).map(clean).filter(line =>
        line.length >= 3 && line.length <= 36 &&
        !/(?:第\s*[一二三四五六七八九十0-9]+\s*天|早餐|午餐|晚餐|住宿|參考航班|團費包含)/.test(line)
      ));
    }
    return unique(highlights).slice(0, 10);
  }

  function parse(input) {
    const text = String((input && input.text) || '');
    const url = normalizeUrl(input && input.url);
    const code = extractCode(text, url);
    const parsedCode = parseTourCode(code);
    const title = extractTitle(text);
    const price = extractPrice(text);
    const dates = extractDates(text, parsedCode && parsedCode.departureDate);
    const airline = extractAirline(text, parsedCode);
    const highlights = extractHighlights(text, title.subtitle);
    return {
      url,
      code,
      destination: parsedCode ? parsedCode.destination : '',
      days: parsedCode ? parsedCode.days : null,
      title: title.title,
      subtitle: title.subtitle,
      price: price.display,
      priceValue: price.value,
      airline,
      dates,
      highlights,
      confidence: {
        code: Boolean(code), title: Boolean(title.title), price: Boolean(price.value),
        airline: Boolean(airline), dates: dates.length > 0, highlights: highlights.length >= 3
      }
    };
  }

  global.TravelAssistantParser = { AIRLINES, CITY_NAMES, clean, normalizeUrl, parseTourCode, parse };
})(typeof window !== 'undefined' ? window : globalThis);

