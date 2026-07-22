'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ITTMS_AGENT, validateItineraryUrl, validateBesttourUrl, htmlToText, fetchItineraryPage, fetchBesttourSearch, fetchItinerarySchedule, searchItineraryContents, createServer } = require('../server');

test('accepts a Besttour itinerary URL', () => {
  const result = validateItineraryUrl('https://www.besttour.com.tw/itinerary/TYO05JX260726PJ');
  assert.equal(result.provider, 'besttour');
  assert.equal(result.code, 'TYO05JX260726PJ');
  assert.equal(validateBesttourUrl(result.url).pathname, '/itinerary/TYO05JX260726PJ');
});

test('accepts ITTMS and always normalizes the agent number', () => {
  const result = validateItineraryUrl('https://itinerary.ittms.com.tw/?travel_no=BKK05JX261111SM&agt_no=265515');
  assert.equal(result.provider, 'ittms');
  assert.equal(result.code, 'BKK05JX261111SM');
  assert.equal(result.url.searchParams.get('agt_no'), ITTMS_AGENT);
  assert.equal(ITTMS_AGENT, '3004C5');
});

test('rejects unknown hosts and non-itinerary URLs', () => {
  assert.throws(() => validateItineraryUrl('https://example.com/itinerary/ABC'), /只允許/);
  assert.throws(() => validateItineraryUrl('https://www.besttour.com.tw/e_web/'), /不是單一/);
});

test('converts HTML to readable text and removes scripts', () => {
  assert.equal(htmlToText('<h1>東京水蜜桃</h1><script>bad()</script><p>$35,900元</p>'), '東京水蜜桃\n$35,900元');
});

function jsonResponse(value) { return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } }); }

test('loads all Besttour calendar departures from the official API', async () => {
  const mockFetch = async url => {
    const value = String(url);
    if (value.includes('travel_detail_info.asp')) return jsonResponse({ status: '0', data: [{ status: '0', id_key: '4415', title_1: '九州五日', date: '2026/09/21', day: '5', mini_price: '38900' }] });
    if (value.includes('travel_flight.asp')) return jsonResponse({ status: '0', data: [{ name: '長榮航空', flight: 'BR106', date: '2026/09/21', place_1: '桃園', place_2: '福岡' }] });
    if (value.includes('travel_detail_feature.asp')) return jsonResponse({ status: '0', data: [{ name: '行程特色', content: '柳川遊船<br>太宰府' }] });
    if (value.includes('travel_detail_calendar.asp')) return jsonResponse({ status: '0', data: [{ year: '2026', data: [{ month: '9', data: [
      { date: '16', no: 'FUK05BR260916C', price: '40900', amount: '15' }, { date: '21', no: 'FUK05BR260921C', price: '38900', amount: '31' }
    ] }] }] });
    return new Response('<html><div id="root"></div></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const result = await fetchItineraryPage('https://www.besttour.com.tw/itinerary/FUK05BR260916C', mockFetch);
  assert.equal(result.source, 'besttour-api');
  assert.equal(result.fields.price, 38900);
  assert.equal(result.fields.lowestPriceDeparture.code, 'FUK05BR260921C');
  assert.equal(result.fields.lowestPriceUrl, 'https://www.besttour.com.tw/itinerary/FUK05BR260921C');
  assert.deepEqual(result.fields.dates, ['2026/09/16', '2026/09/21']);
  assert.equal(result.fields.airline, '長榮航空');
});

test('loads ITTMS through the official ERP API without exposing agent data', async () => {
  const requested = [];
  const mockFetch = async url => {
    const value = String(url); requested.push(value);
    if (value.includes('travel_detail_info_erp.asp')) return jsonResponse({ status: '0', data: [{ status: '0', id_key: '31449', title_1: '【漫享沙美島５日】海島住宿、精油SPA、沙灘火舞', date: '2026/11/11', day: '5', mini_price: '29888', agt: { phone: 'private' } }] });
    if (value.includes('travel_flight.asp')) return jsonResponse({ status: '0', data: [{ name: '星宇航空', flight: 'JX745', date: '2026/11/11', place_1: '桃園', place_2: '曼谷' }] });
    if (value.includes('travel_detail_feature.asp')) return jsonResponse({ status: '0', data: [{ name: '沙美島', content: '海島住宿<br>沙灘火舞' }] });
    if (value.includes('travel_detail_calendar.asp')) return jsonResponse({ status: '0', data: [{ year: '2026', data: [{ month: '11', data: [
      { date: '11', no: 'BKK05JX261111SM', price: '29888', amount: '20', flight_name: '星宇航空' },
      { date: '18', no: 'BKK05JX261118SM', price: '30900', amount: '18', flight_name: '星宇航空' }
    ] }] }] });
    throw new Error('Unexpected request: ' + value);
  };
  const result = await fetchItineraryPage('https://itinerary.ittms.com.tw/?travel_no=BKK05JX261111SM&agt_no=265515', mockFetch);
  assert.equal(result.provider, 'ittms');
  assert.equal(result.source, 'ittms-api');
  assert.equal(result.finalUrl, 'https://itinerary.ittms.com.tw/?travel_no=BKK05JX261111SM&agt_no=3004C5');
  assert.equal(result.fields.price, 29888);
  assert.equal(result.fields.lowestPriceDeparture.code, 'BKK05JX261111SM');
  assert.equal(result.fields.lowestPriceUrl, 'https://itinerary.ittms.com.tw/?travel_no=BKK05JX261111SM&agt_no=3004C5');
  assert.equal(result.fields.airline, '星宇航空');
  assert.deepEqual(result.fields.dates, ['2026/11/11', '2026/11/18']);
  assert.doesNotMatch(result.text, /private/);
  assert.ok(requested.some(url => url.includes('agt_no=3004C5')));
});

test('serves both the new and legacy fetch endpoints', async () => {
  const mockFetch = async url => {
    const value = String(url);
    if (value.includes('travel_detail_info_erp.asp')) return jsonResponse({ status: '0', data: [{ status: '0', id_key: '', title_1: '曼谷五日', date: '2026/11/11', day: '5', mini_price: '29888' }] });
    if (value.includes('travel_flight.asp') || value.includes('travel_detail_feature.asp')) return jsonResponse({ status: '1', data: [] });
    throw new Error(value);
  };
  const server = createServer({ fetchImpl: mockFetch });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const target = encodeURIComponent('https://itinerary.ittms.com.tw/?travel_no=BKK05JX261111SM&agt_no=265515');
    const response = await fetch(`${base}/api/itinerary/fetch?url=${target}`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.data.provider, 'ittms');
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /\/src\/besttour-url-fetch\.js/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('accepts a tour code and converts it to a Besttour itinerary URL', () => {
  const result = validateItineraryUrl('GES10BR261118PAK');
  assert.equal(result.provider, 'besttour');
  assert.equal(result.code, 'GES10BR261118PAK');
  assert.equal(result.url.href, 'https://www.besttour.com.tw/itinerary/GES10BR261118PAK');
});

test('imports matching trips from the official Besttour search API', async () => {
  const mockFetch = async (url, options) => {
    assert.match(String(url), /query_List_all\.asp/);
    assert.equal(options.method, 'POST');
    const form = new URLSearchParams(options.body);
    assert.equal(form.get('searchTxt'), '沙美島');
    assert.equal(form.get('date_from'), '2026/09/01');
    assert.equal(form.get('pagesize'), '50');
    assert.equal(form.get('pageid'), '2');
    return jsonResponse({ status:'0', pagecount:'4', data:[{
      id:'BKK05JX261111SM', name:'【漫享沙美島５日】海島住宿、沙灘火舞', member_price:'29888',
      date:'2026/11/11', day:'5', amount_2:'20', from_city:'桃園', city:'曼谷'
    }, { id:'YLN02BS260719N', name:'宜蘭找茶趣２日', member_price:'5399', date:'2026/07/19', day:'2', city:'台灣 宜蘭' }] });
  };
  const result = await fetchBesttourSearch({ keyword:'沙美島', dateFrom:'2026/09/01', dateTo:'2027/08/31', page:2, pageSize:50 }, mockFetch);
  assert.equal(result.total, 4);
  assert.equal(result.totalPages, 4);
  assert.equal(result.page, 2);
  assert.equal(result.hasMore, true, 'must continue to the remaining official pages even when this page contains fewer than 50 raw rows');
  assert.equal(result.trips[0].code, 'BKK05JX261111SM');
  assert.equal(result.trips[0].price, '29,888元起');
  assert.equal(result.trips[0].seats, 20);
  assert.equal(result.trips.length, 1);
});

test('requires a keyword before syncing the Besttour database', async () => {
  await assert.rejects(() => fetchBesttourSearch({ keyword:'' }), /請輸入地區或關鍵字/);
});

test('exposes a health endpoint so the browser can detect the local service', async () => {
  const server = createServer({ fetchImpl:async () => { throw new Error('not used'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.data.service, 'Travel Assistant Pro');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('searches hidden attractions inside the complete daily itinerary', async () => {
  const mockFetch = async url => {
    assert.match(String(url), /travel_detail_schedule\.asp\?travel_no=FUK05BR261104U/);
    return jsonResponse({ status:'0', data:[
      { day:'1', date:'2026/11/04', abstract_1:'桃園－福岡', abstract_2:[], view:[] },
      { day:'2', date:'2026/11/05', abstract_1:'湯布院－高千穗峽－真名井瀑布',
        abstract_2:[{ name:'真名井瀑布【日本瀑布百選之一】' }],
        view:[{ name:'真名井瀑布', images:'https://example.com/waterfall.jpg', memo_2:'約17公尺高的瀑布美景' }] }
    ] });
  };
  const schedule = await fetchItinerarySchedule('FUK05BR261104U', mockFetch);
  assert.equal(schedule[1].day, 2);
  assert.match(schedule[1].content, /真名井瀑布/);
  const result = await searchItineraryContents(['FUK05BR261104U'], ['真名井瀑布'], mockFetch);
  assert.equal(result.checked, 1);
  assert.equal(result.results[0].matches[0].day, 2);
  assert.match(result.results[0].matches[0].excerpt, /真名井瀑布/);
});
