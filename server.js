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
    const injection = '<script src="/src/tour-parser.js"></script><script src="/src/besttour-url-fetch.js"></script><script src="/src/recommendation.js"></script><script src="/src/app-shell.js"></script>';
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
  fetchBesttourApiItinerary, fetchItineraryPage, fetchBesttourPage, createServer };

