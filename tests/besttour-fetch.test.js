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
  const mockFetch = async () => new Response(
    '<html><h1>喜鴻假期首頁</h1><p>' + '推薦旅遊 '.repeat(40) + '</p></html>',
    { status: 200, headers: { 'content-type': 'text/html' } }
  );
  await assert.rejects(
    fetchBesttourPage('https://www.besttour.com.tw/itinerary/TYO05JX260726PJ', mockFetch),
    error => error.code === 'ITINERARY_NOT_FOUND'
  );
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
