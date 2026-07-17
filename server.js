'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(['besttour.com.tw', 'www.besttour.com.tw']);

class FetchError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function validateBesttourUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new FetchError('INVALID_URL', '請貼上完整的 Besttour 行程網址。'); }
  if (url.protocol !== 'https:') throw new FetchError('INVALID_PROTOCOL', '僅允許 https:// Besttour 網址。');
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new FetchError('HOST_NOT_ALLOWED', '只允許讀取 besttour.com.tw 官網。');
  if (!/^\/itinerary\/[A-Z0-9-]+\/?$/i.test(url.pathname)) {
    throw new FetchError('NOT_ITINERARY_URL', '這不是單一行程網址，請貼上 https://www.besttour.com.tw/itinerary/團號');
  }
  url.hash = '';
  return url;
}

function decodeEntities(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, n) => entities[n.toLowerCase()]);
}

function htmlToText(html) {
  return decodeEntities(String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchJson(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'accept-language': 'zh-TW,zh;q=0.9',
        'user-agent': 'Travel-Assistant-Pro/1.1 (+https://github.com/ao1712lb45-coder/Travel-Assistant-Pro)'
      }
    });
    if (!response.ok) throw new FetchError('UPSTREAM_HTTP_ERROR', `Besttour 行程資料服務回傳 HTTP ${response.status}。`, 502);
    const raw = await response.text();
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new FetchError('PAGE_TOO_LARGE', '官網資料過大，已停止讀取。', 502);
    try { return JSON.parse(raw); }
    catch { throw new FetchError('INVALID_API_RESPONSE', 'Besttour 行程資料格式目前無法辨識。', 502); }
  } catch (error) {
    if (error instanceof FetchError) throw error;
    if (error && error.name === 'AbortError') throw new FetchError('TIMEOUT', 'Besttour 行程資料回應逾時，請稍後重試。', 504);
    throw new FetchError('UPSTREAM_UNAVAILABLE', '目前無法連線 Besttour 行程資料服務。', 502);
  } finally {
    clearTimeout(timer);
  }
}

function apiUrl(endpoint, params) {
  const url = new URL(`https://travelapi.besttour.com.tw/api/${endpoint}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

function firstApiRecord(payload) {
  return payload && payload.status === '0' && Array.isArray(payload.data) ? payload.data[0] : null;
}

async function fetchBesttourApiItinerary(code, fetchImpl) {
  const infoPayload = await fetchJson(apiUrl('travel_detail_info.asp', { travel_no: code }), fetchImpl);
  const info = firstApiRecord(infoPayload);
  if (!info || info.status === '1') {
    throw new FetchError('ITINERARY_NOT_FOUND', 'Besttour 查無這個團號，可能已下架或停止銷售。', 404);
  }

  const [flightPayload, featurePayload, calendarPayload] = await Promise.all([
    fetchJson(apiUrl('travel_flight.asp', { travel_no: code }), fetchImpl).catch(() => ({ status: '1', data: [] })),
    fetchJson(apiUrl('travel_detail_feature.asp', { travel_no: code }), fetchImpl).catch(() => ({ status: '1', data: [] })),
    info.id_key
      ? fetchJson(apiUrl('travel_detail_calendar.asp', { code: info.id_key }), fetchImpl).catch(() => ({ status: '1', data: [] }))
      : Promise.resolve({ status: '1', data: [] })
  ]);

  const calendarRows = calendarPayload && calendarPayload.status === '0' && Array.isArray(calendarPayload.data)
    ? calendarPayload.data.flatMap(yearGroup => (yearGroup.data || []).flatMap(monthGroup =>
      (monthGroup.data || []).map(day => ({
        ...day,
        dateFull: `${yearGroup.year}/${String(monthGroup.month).padStart(2, '0')}/${String(day.date).padStart(2, '0')}`
      }))
    ))
    : [];
  const dates = [...new Set((calendarRows.length ? calendarRows.map(item => item.dateFull) : [info.date]).filter(Boolean))].sort();
  const prices = (calendarRows.length ? calendarRows.map(item => item.price) : [info.mini_price])
    .map(value => Number(String(value || '').replace(/,/g, ''))).filter(value => value > 0);
  const minimumPrice = prices.length ? Math.min(...prices) : null;
  const flights = flightPayload && flightPayload.status === '0' && Array.isArray(flightPayload.data) ? flightPayload.data : [];
  const features = featurePayload && featurePayload.status === '0' && Array.isArray(featurePayload.data) ? featurePayload.data : [];
  const lines = [
    info.title_1 || info.title_2 || '',
    `團號 ${code}`,
    info.day ? `天數 ${info.day}日` : '',
    minimumPrice ? `最低售價 ${minimumPrice.toLocaleString('en-US')}元起` : '',
    dates.length ? `出發日期 ${dates.join('、')}` : '',
    flights.length ? '參考航班' : '',
    ...flights.map(item => `${item.name || ''} ${item.flight || ''} ${item.date || ''} ${item.place_1 || ''} ${item.place_2 || ''}`),
    features.length ? '行程特色' : '',
    ...features.map(item => `${item.name || ''}\n${htmlToText(item.content || '')}`)
  ].filter(Boolean);

  return {
    text: lines.join('\n'),
    source: 'besttour-api',
    fields: {
      title: info.title_1 || info.title_2 || '',
      price: minimumPrice,
      dates,
      airline: flights.find(item => item.name)?.name || '',
      flights,
      departures: calendarRows.map(item => ({
        date: item.dateFull,
        code: item.no,
        price: Number(String(item.price || '').replace(/,/g, '')) || null,
        seats: Number(item.amount) || 0,
        airline: item.flight_name || '',
        flight: item.flight || '',
        departureCity: item.city || ''
      }))
    }
  };
}

async function fetchBesttourPage(rawUrl, fetchImpl = fetch) {
  const requested = validateBesttourUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetchImpl(requested, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'zh-TW,zh;q=0.9',
        'user-agent': 'Travel-Assistant-Pro/1.1 (+https://github.com/ao1712lb45-coder/Travel-Assistant-Pro)'
      }
    });
  } catch (error) {
    if (error && error.name === 'AbortError') throw new FetchError('TIMEOUT', '官網回應逾時，請稍後重試。', 504);
    throw new FetchError('UPSTREAM_UNAVAILABLE', '目前無法連線 Besttour 官網。', 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new FetchError('UPSTREAM_HTTP_ERROR', `Besttour 官網回傳 HTTP ${response.status}。`, 502);
  const finalUrl = validateBesttourUrl(response.url || requested.href);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new FetchError('UNEXPECTED_CONTENT', '官網沒有回傳可解析的 HTML 頁面。', 502);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new FetchError('PAGE_TOO_LARGE', '官網頁面過大，已停止讀取。', 502);

  const html = await response.text();
  if (Buffer.byteLength(html) > MAX_BYTES) throw new FetchError('PAGE_TOO_LARGE', '官網頁面過大，已停止讀取。', 502);
  const text = htmlToText(html);
  const requestedCode = requested.pathname.split('/').filter(Boolean).pop().toUpperCase();
  const hasRequestedCode = text.toUpperCase().includes(requestedCode) || html.toUpperCase().includes(requestedCode);
  if (!hasRequestedCode) {
    const apiResult = await fetchBesttourApiItinerary(requestedCode, fetchImpl);
    return {
      requestedUrl: requested.href,
      finalUrl: finalUrl.href,
      requestedCode,
      text: apiResult.text,
      source: apiResult.source,
      fields: apiResult.fields,
      fetchedAt: new Date().toISOString()
    };
  }
  if (text.length < 200) throw new FetchError('CONTENT_INCOMPLETE', '官網內容尚未完整載入，請改用「貼上官網整頁文字」。', 422);

  return { requestedUrl: requested.href, finalUrl: finalUrl.href, requestedCode, text, source: 'html', fetchedAt: new Date().toISOString() };
}

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
    const injection = '<script src="/src/tour-parser.js"></script><script src="/src/besttour-url-fetch.js"></script><script src="/src/app-shell.js"></script>';
    data = Buffer.from(data.toString('utf8').replace('</body>', injection + '</body>'));
  }
  const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg' };
  res.writeHead(200, { 'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
  res.end(data);
  return true;
}

function createServer(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && requestUrl.pathname === '/api/besttour/fetch') {
        const result = await fetchBesttourPage(requestUrl.searchParams.get('url'), fetchImpl);
        return sendJson(res, 200, { ok: true, data: result });
      }
      if (req.method === 'GET' && serveFile(res, requestUrl.pathname)) return;
      sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: '找不到此功能。' } });
    } catch (error) {
      const known = error instanceof FetchError;
      sendJson(res, known ? error.status : 500, { ok: false, error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : '系統發生未預期錯誤。' } });
    }
  });
}

if (require.main === module) {
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`Travel Assistant Pro: http://127.0.0.1:${PORT}`);
  });
}

module.exports = { FetchError, validateBesttourUrl, htmlToText, fetchBesttourApiItinerary, fetchBesttourPage, createServer };
