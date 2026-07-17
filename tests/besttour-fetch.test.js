'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBesttourUrl, htmlToText, fetchBesttourPage } = require('../server');

test('accepts a Besttour itinerary URL', () => {
  const url = validateBesttourUrl('https://www.besttour.com.tw/itinerary/TYO05JX260726PJ');
  assert.equal(url.pathname, '/itinerary/TYO05JX260726PJ');
});

test('rejects non-Besttour and non-itinerary URLs', () => {
  assert.throws(() => validateBesttourUrl('https://example.com/itinerary/ABC'), /只允許/);
  assert.throws(() => validateBesttourUrl('https://www.besttour.com.tw/e_web/'), /不是單一行程網址/);
});

test('converts HTML to readable text and removes scripts', () => {
  assert.equal(htmlToText('<h1>東京五日</h1><script>bad()</script><p>$35,900元</p>'), '東京五日\n$35,900元');
});

test('fetches a matching itinerary page', async () => {
  const mockFetch = async url => new Response(
    '<html><h1>【東京水蜜桃５日】迪士尼、水蜜桃吃到飽</h1><p>團號 TYO05JX260726PJ</p><p>$35,900元</p><section>' + '行程特色與每日行程內容 '.repeat(20) + '</section></html>',
    { status: 200, headers: { 'content-type': 'text/html' } }
  );
  const result = await fetchBesttourPage('https://www.besttour.com.tw/itinerary/TYO05JX260726PJ', mockFetch);
  assert.equal(result.requestedCode, 'TYO05JX260726PJ');
  assert.match(result.text, /35,900/);
});

test('rejects a homepage fallback that lacks the requested code', async () => {
  const mockFetch = async url => String(url).includes('travel_detail_info.asp')
    ? new Response(JSON.stringify({ status: '1', data: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    : new Response('<html><h1>喜鴻假期首頁</h1><p>' + '推薦旅遊 '.repeat(40) + '</p></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  await assert.rejects(
    fetchBesttourPage('https://www.besttour.com.tw/itinerary/TYO05JX260726PJ', mockFetch),
    error => error.code === 'ITINERARY_NOT_FOUND'
  );
});

test('loads itinerary data from the official API when HTML is only an app shell', async () => {
  const mockFetch = async url => {
    const value = String(url);
    if (value.includes('travel_detail_info.asp')) return new Response(JSON.stringify({
      status: '0', data: [{ status: '0', id_key: '4415', title_1: '【福岡鐵道海陸空５日】由布院之森鐵道、柳川搖船', date: '2026/09/21', day: '5', mini_price: '38900' }]
    }), { status: 200 });
    if (value.includes('travel_flight.asp')) return new Response(JSON.stringify({
      status: '0', data: [{ name: '長榮航空', flight: 'BR106', date: '2026/09/21', place_1: '桃園', place_2: '福岡' }]
    }), { status: 200 });
    if (value.includes('travel_detail_feature.asp')) return new Response(JSON.stringify({
      status: '0', data: [{ name: '特色光點', content: '由布院之森鐵道<br>柳川搖船' }]
    }), { status: 200 });
    if (value.includes('travel_detail_calendar.asp')) return new Response(JSON.stringify({
      status: '0', data: [{ year: '2026', data: [{ month: '9', data: [
        { date: '16', no: 'FUK05BR260916C', price: '40900', amount: '15', flight: 'BR106', flight_name: '長榮航空', city: '桃園' },
        { date: '21', no: 'FUK05BR260921C', price: '38900', amount: '31', flight: 'BR106', flight_name: '長榮航空', city: '桃園' }
      ] }] }]
    }), { status: 200 });
    return new Response('<html><title>喜鴻假期</title><div id="root"></div></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };
  const result = await fetchBesttourPage('https://www.besttour.com.tw/itinerary/FUK05BR260921C', mockFetch);
  assert.equal(result.source, 'besttour-api');
  assert.equal(result.fields.price, 38900);
  assert.equal(result.fields.airline, '長榮航空');
  assert.deepEqual(result.fields.dates, ['2026/09/16', '2026/09/21']);
  assert.equal(result.fields.departures.length, 2);
  assert.equal(result.fields.departures[0].seats, 15);
  assert.match(result.text, /38,900元起/);
});

test('serves the friendly workspace shell with the existing app', async () => {
  const { createServer } = require('../server');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /\/src\/tour-parser\.js/);
    assert.match(html, /\/src\/besttour-url-fetch\.js/);
    assert.match(html, /\/src\/app-shell\.js/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
