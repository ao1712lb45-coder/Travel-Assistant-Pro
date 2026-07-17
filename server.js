'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const MAX_BYTES = 2 * 1024 * 1024;
const ITTMS_AGENT = '3004C5';
const BESTTOUR_HOSTS = new Set(['besttour.com.tw', 'www.besttour.com.tw']);
const ITTMS_HOSTS = new Set(['itinerary.ittms.com.tw']);

class FetchError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function validateItineraryUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new FetchError('INVALID_URL', '請輸入完整的 Besttour 或 ITTMS 行程網址。'); }
  if (url.protocol !== 'https:') throw new FetchError('INVALID_PROTOCOL', '官網網址必須以 https:// 開頭。');

  const host = url.hostname.toLowerCase();
  let provider;
  let code;
  if (BESTTOUR_HOSTS.has(host)) {
    const match = url.pathname.match(/^\/itinerary\/([A-Z0-9-]+)\/?$/i);
    if (!match) throw new FetchError('NOT_ITINERARY_URL', '這不是單一 Besttour 行程網址。');
    provider = 'besttour';
    code = match[1].toUpperCase();
  } else if (ITTMS_HOSTS.has(host)) {
    code = String(url.searchParams.get('travel_no') || '').toUpperCase();
    if (!/^[A-Z0-9-]{10,30}$/.test(code)) throw new FetchError('NOT_ITINERARY_URL', 'ITTMS 網址缺少有效的 travel_no 團號。');
    provider = 'ittms';
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('travel_no', code);
    url.searchParams.set('agt_no', ITTMS_AGENT);
  } else {
    throw new FetchError('HOST_NOT_ALLOWED', '只允許讀取 besttour.com.tw 或 itinerary.ittms.com.tw 官網。');
  }
  url.hash = '';
  return { url, provider, code };
}

function validateBesttourUrl(value) {
  const result = validateItineraryUrl(value);
  if (result.provider !== 'besttour') throw new FetchError('HOST_NOT_ALLOWED', '這不是 Besttour 行程網址。');
  return result.url;
}

function decodeEntities(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, n) => entities[n.toLowerCase()]);
}

function htmlToText(html) {
  return decodeEntities(String(html || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|tr|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchJson(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: {
      accept: 'application/json', 'accept-language': 'zh-TW,zh;q=0.9',
      'user-agent': 'Travel-Assistant-Pro/1.1 (+https://github.com/ao1712lb45-coder/Travel-Assistant-Pro)'
    }});
    if (!response.ok) throw new FetchError('UPSTREAM_HTTP_ERROR', `官網資料介面回傳 HTTP ${response.status}。`, 502);
    const raw = await response.text();
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new FetchError('PAGE_TOO_LARGE', '官網回傳資料過大，已停止讀取。', 502);
    try { return JSON.parse(raw); }
    catch { throw new FetchError('INVALID_API_RESPONSE', '官網回傳的資料格式無法辨識。', 502); }
  } catch (error) {
    if (error instanceof FetchError) throw error;
    if (error && error.name === 'AbortError') throw new FetchError('TIMEOUT', '官網讀取逾時，請稍後再試。', 504);
    throw new FetchError('UPSTREAM_UNAVAILABLE', '目前無法連接官網資料介面。', 502);
  } finally { clearTimeout(timer); }
}

async function fetchFormJson(url, params, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetchImpl(url, {
      method: 'POST', signal: controller.signal,
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'accept-language': 'zh-TW,zh;q=0.9', 'user-agent': 'Travel-Assistant-Pro/1.1' },
      body: new URLSearchParams(params)
    });
    if (!response.ok) throw new FetchError('UPSTREAM_HTTP_ERROR', `Besttour 搜尋服務回傳 HTTP ${response.status}。`, 502);
    const raw = await response.text();
    if (Buffer.byteLength(raw) > MAX_BYTES * 4) throw new FetchError('PAGE_TOO_LARGE', '官網搜尋結果過大，請縮小日期或地區範圍。', 502);
    try { return JSON.parse(raw); } catch { throw new FetchError('INVALID_API_RESPONSE', 'Besttour 搜尋資料格式無法辨識。', 502); }
  } catch (error) {
    if (error instanceof FetchError) throw error;
    if (error && error.name === 'AbortError') throw new FetchError('TIMEOUT', 'Besttour 搜尋逾時，請縮小範圍再試。', 504);
    throw new FetchError('UPSTREAM_UNAVAILABLE', '目前無法連接 Besttour 搜尋服務。', 502);
  } finally { clearTimeout(timer); }
}

function apiUrl(endpoint, params) {
  const url = new URL(`https://travelapi.besttour.com.tw/api/${endpoint}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

function firstApiRecord(payload) {
  return payload && payload.status === '0' && Array.isArray(payload.data) ? payload.data[0] : null;
}

async function fetchOfficialItinerary(code, fetchImpl, options = {}) {
  const provider = options.provider || 'besttour';
  const infoEndpoint = provider === 'ittms' ? 'travel_detail_info_erp.asp' : 'travel_detail_info.asp';
  const infoParams = provider === 'ittms'
    ? { m_class: '', m_mid: '', travel_no: code, agt_no: ITTMS_AGENT, no: code }
    : { travel_no: code };
  const info = firstApiRecord(await fetchJson(apiUrl(infoEndpoint, infoParams), fetchImpl));
  if (!info || info.status === '1') throw new FetchError('ITINERARY_NOT_FOUND', '官網未回傳這個團號的行程內容，可能已下架。', 404);

  const [flightPayload, featurePayload, calendarPayload] = await Promise.all([
    fetchJson(apiUrl('travel_flight.asp', { travel_no: code }), fetchImpl).catch(() => ({ status: '1', data: [] })),
    fetchJson(apiUrl('travel_detail_feature.asp', { travel_no: code }), fetchImpl).catch(() => ({ status: '1', data: [] })),
    info.id_key ? fetchJson(apiUrl('travel_detail_calendar.asp', { code: info.id_key }), fetchImpl).catch(() => ({ status: '1', data: [] })) : Promise.resolve({ status: '1', data: [] })
  ]);
  const calendarRows = calendarPayload && calendarPayload.status === '0' && Array.isArray(calendarPayload.data)
    ? calendarPayload.data.flatMap(year => (year.data || []).flatMap(month => (month.data || []).map(day => ({
      ...day, dateFull: `${year.year}/${String(month.month).padStart(2, '0')}/${String(day.date).padStart(2, '0')}`
    })))) : [];
  const dates = [...new Set((calendarRows.length ? calendarRows.map(row => row.dateFull) : [info.date]).filter(Boolean))].sort();
  const prices = (calendarRows.length ? calendarRows.map(row => row.price) : [info.mini_price || info.member_price])
    .map(value => Number(String(value || '').replace(/,/g, ''))).filter(value => value > 0);
  const minimumPrice = prices.length ? Math.min(...prices) : null;
  const flights = flightPayload && flightPayload.status === '0' && Array.isArray(flightPayload.data) ? flightPayload.data : [];
  const features = featurePayload && featurePayload.status === '0' && Array.isArray(featurePayload.data) ? featurePayload.data : [];
  const lines = [
    info.title_1 || info.title_2 || '', `團號 ${code}`, info.day ? `天數 ${info.day}日` : '',
    minimumPrice ? `最低售價 ${minimumPrice.toLocaleString('en-US')}元起` : '', dates.length ? `出發日期 ${dates.join('、')}` : '',
    flights.length ? '參考航班' : '', ...flights.map(item => `${item.name || ''} ${item.flight || ''} ${item.date || ''} ${item.place_1 || ''} ${item.place_2 || ''}`),
    features.length ? '行程亮點' : '', ...features.map(item => `${item.name || ''}\n${htmlToText(item.content || '')}`)
  ].filter(Boolean);
  return { text: lines.join('\n'), source: `${provider}-api`, fields: {
    title: info.title_1 || info.title_2 || '', price: minimumPrice, dates,
    airline: flights.find(item => item.name)?.name || '', flights,
    departures: calendarRows.map(item => ({ date: item.dateFull, code: item.no, price: Number(String(item.price || '').replace(/,/g, '')) || null,
      seats: Number(item.amount) || 0, airline: item.flight_name || '', flight: item.flight || '', departureCity: item.city || '' }))
  }};
}

const fetchBesttourApiItinerary = (code, fetchImpl) => fetchOfficialItinerary(code, fetchImpl, { provider: 'besttour' });

async function fetchItinerarySchedule(code, fetchImpl = fetch) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{8,24}$/.test(normalized)) throw new FetchError('INVALID_TOUR_CODE', '團號格式無法辨識。');
  const payload = await fetchJson(apiUrl('travel_detail_schedule.asp', { travel_no:normalized }), fetchImpl);
  const rows = payload && payload.status === '0' && Array.isArray(payload.data) ? payload.data : [];
  return rows.map(row => {
    const views = Array.isArray(row.view) ? row.view : [];
    const abstract = Array.isArray(row.abstract_2) ? row.abstract_2 : [];
    const hotels = row.hotel && Array.isArray(row.hotel.data) ? row.hotel.data : [];
    const attractions = [...new Set([...abstract.map(item => htmlToText(item.name || '')), ...views.map(item => htmlToText(item.name || ''))].filter(Boolean))];
    const content = [row.abstract_1, ...attractions, row.memo_1, row.memo_2, row.memo_3,
      ...views.flatMap(item => [item.name, item.memo_1, item.memo_2, item.memo_3]),
      row.breakfast, row.lunch, row.dinner, ...hotels.map(item => item.name)].map(htmlToText).filter(Boolean).join('\n');
    return { day:Number(row.day) || null, date:String(row.date || ''), title:htmlToText(row.abstract_1 || ''), content, attractions,
      images:views.map(item => item.images).filter(url => /^https:\/\//i.test(String(url || ''))) };
  });
}

function matchSchedule(schedule, keywords) {
  const terms = [...new Set((keywords || []).map(value => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 30);
  const matches = [];
  schedule.forEach(day => {
    const lower = day.content.toLowerCase();
    const matchedTerms = terms.filter(term => lower.includes(term));
    if (!matchedTerms.length) return;
    const first = Math.min(...matchedTerms.map(term => lower.indexOf(term)).filter(index => index >= 0));
    const start = Math.max(0, first - 45), end = Math.min(day.content.length, first + 115);
    matches.push({ day:day.day, date:day.date, title:day.title, matchedTerms, excerpt:day.content.slice(start, end).replace(/\s+/g, ' '),
      attractions:day.attractions.filter(name => matchedTerms.some(term => name.toLowerCase().includes(term))), images:day.images.slice(0, 4) });
  });
  return matches;
}

async function searchItineraryContents(codes, keywords, fetchImpl = fetch) {
  const list = [...new Set((codes || []).map(value => String(value).trim().toUpperCase()).filter(value => /^[A-Z0-9]{8,24}$/.test(value)))].slice(0, 50);
  const terms = [...new Set((keywords || []).map(value => String(value).trim()).filter(Boolean))].slice(0, 30);
  const results = new Array(list.length); let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const index = cursor++, code = list[index];
      try { const schedule = await fetchItinerarySchedule(code, fetchImpl); results[index] = { code, matches:matchSchedule(schedule, terms) }; }
      catch (_) { results[index] = { code, matches:[] }; }
    }
  }
  await Promise.all(Array.from({ length:Math.min(6, list.length) }, worker));
  return { checked:list.length, results:results.filter(item => item && item.matches.length) };
}

function validSearchDate(value) {
  const text = String(value || '').trim();
  return /^20\d{2}\/\d{2}\/\d{2}$/.test(text) ? text : '//';
}

async function fetchBesttourSearch(query, fetchImpl = fetch) {
  const keyword = String(query.keyword || '').trim().slice(0, 40);
  if (!keyword) throw new FetchError('KEYWORD_REQUIRED', '請輸入地區或關鍵字，例如：東南亞、北海道、沙美島。');
  const limit = Math.max(1, Math.min(300, Number(query.limit) || 100));
  const payload = await fetchFormJson(apiUrl('query_List_all.asp'), {
    date_from: validSearchDate(query.dateFrom), date_to: validSearchDate(query.dateTo), country: '', day: '',
    price_min: '', price_max: '', city: '', other: '', talent: '', searchTxt: keyword, slogan: '', slogan_1: '',
    slogan_2: '', travel_data: '', pageid: '1', pagesize: String(limit), m_class: '', m_mid: ''
  }, fetchImpl);
  const rows = payload && payload.status === '0' && Array.isArray(payload.data) ? payload.data : [];
  return {
    keyword, total: Math.max(Number(payload.pagecount) || 0, rows.length),
    trips: rows.map(row => {
      const code = String(row.id || '').toUpperCase();
      const price = Number(row.member_price || row.price) || 0;
      return {
        code, title: htmlToText(row.name || ''), mainTitle: htmlToText(row.name || ''), subtitle: '',
        price: price ? `${price.toLocaleString('en-US')}元起` : '官網目前未顯示', dates: row.date || '',
        airline: '', destination: row.city || '', highlights: [], days: row.day ? `${row.day}日` : '',
        seats: Number(row.amount_2) || 0, departureCity: row.from_city || '',
        url: `https://www.besttour.com.tw/itinerary/${code}`, source: 'besttour-search', updated: new Date().toISOString()
      };
    })
  };
}

async function fetchItineraryPage(rawUrl, fetchImpl = fetch) {
  const requested = validateItineraryUrl(rawUrl);
  if (requested.provider === 'ittms') {
    const apiResult = await fetchOfficialItinerary(requested.code, fetchImpl, { provider: 'ittms' });
    return { requestedUrl: requested.url.href, finalUrl: requested.url.href, requestedCode: requested.code,
      provider: requested.provider, text: apiResult.text, source: apiResult.source, fields: apiResult.fields, fetchedAt: new Date().toISOString() };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try { response = await fetchImpl(requested.url, { redirect: 'follow', signal: controller.signal, headers: {
    accept: 'text/html,application/xhtml+xml', 'accept-language': 'zh-TW,zh;q=0.9',
    'user-agent': 'Travel-Assistant-Pro/1.1 (+https://github.com/ao1712lb45-coder/Travel-Assistant-Pro)'
  }}); }
  catch (error) {
    if (error && error.name === 'AbortError') throw new FetchError('TIMEOUT', '官網讀取逾時，請稍後再試。', 504);
    throw new FetchError('UPSTREAM_UNAVAILABLE', '目前無法連接 Besttour 官網。', 502);
  } finally { clearTimeout(timer); }
  if (!response.ok) throw new FetchError('UPSTREAM_HTTP_ERROR', `Besttour 官網回傳 HTTP ${response.status}。`, 502);
  const html = await response.text();
  if (Buffer.byteLength(html) > MAX_BYTES) throw new FetchError('PAGE_TOO_LARGE', '官網頁面過大，已停止讀取。', 502);
  const text = htmlToText(html);
  const hasCode = text.toUpperCase().includes(requested.code) || html.toUpperCase().includes(requested.code);
  if (!hasCode) {
    const apiResult = await fetchOfficialItinerary(requested.code, fetchImpl, { provider: 'besttour' });
    return { requestedUrl: requested.url.href, finalUrl: requested.url.href, requestedCode: requested.code,
      provider: requested.provider, text: apiResult.text, source: apiResult.source, fields: apiResult.fields, fetchedAt: new Date().toISOString() };
  }
  if (text.length < 200) throw new FetchError('CONTENT_INCOMPLETE', '官網內容不完整，請使用貼上整頁文字備援。', 422);
  return { requestedUrl: requested.url.href, finalUrl: requested.url.href, requestedCode: requested.code,
    provider: requested.provider, text, source: 'html', fetchedAt: new Date().toISOString() };
}

const fetchBesttourPage = fetchItineraryPage;

function sendJson(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': data.length, 'cache-control': 'no-store' });
  res.end(data);
}

function serveFile(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return false;
  let data = fs.readFileSync(target);
  if (relative === 'index.html') {
    const injection = '<script src="/src/tour-parser.js"></script><script src="/src/besttour-url-fetch.js"></script><script src="/src/recommendation.js"></script><script src="/src/dm-designer.js"></script><script src="/src/app-shell.js"></script>';
    data = Buffer.from(data.toString('utf8').replace('</body>', injection + '</body>'));
  }
  const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg' };
  res.writeHead(200, { 'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
  res.end(data); return true;
}

function createServer(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && ['/api/itinerary/fetch', '/api/besttour/fetch'].includes(requestUrl.pathname)) {
        return sendJson(res, 200, { ok: true, data: await fetchItineraryPage(requestUrl.searchParams.get('url'), fetchImpl) });
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/besttour/search') {
        return sendJson(res, 200, { ok: true, data: await fetchBesttourSearch({
          keyword: requestUrl.searchParams.get('keyword'), dateFrom: requestUrl.searchParams.get('dateFrom'),
          dateTo: requestUrl.searchParams.get('dateTo'), limit: requestUrl.searchParams.get('limit')
        }, fetchImpl) });
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/besttour/content-search') {
        return sendJson(res, 200, { ok:true, data:await searchItineraryContents(
          String(requestUrl.searchParams.get('codes') || '').split(','), String(requestUrl.searchParams.get('keywords') || '').split(','), fetchImpl
        ) });
      }
      if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
        return sendJson(res, 200, { ok:true, data:{ service:'Travel Assistant Pro', version:'1.1.0' } });
      }
      if (req.method === 'GET' && serveFile(res, requestUrl.pathname)) return;
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: '找不到指定資源。' } });
    } catch (error) {
      const known = error instanceof FetchError;
      sendJson(res, known ? error.status : 500, { ok: false, error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : '系統發生未預期錯誤。' } });
    }
  });
}

if (require.main === module) createServer().listen(PORT, '127.0.0.1', () => console.log(`Travel Assistant Pro: http://127.0.0.1:${PORT}`));

module.exports = { FetchError, ITTMS_AGENT, validateItineraryUrl, validateBesttourUrl, htmlToText, fetchOfficialItinerary,
  fetchBesttourApiItinerary, fetchItinerarySchedule, matchSchedule, searchItineraryContents, fetchBesttourSearch, fetchItineraryPage, fetchBesttourPage, createServer };

