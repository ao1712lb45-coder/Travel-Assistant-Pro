'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../src/tour-parser.js');
const parser = globalThis.TravelAssistantParser;

test('FD airline code is Thai AirAsia, not China Airlines', () => {
  const result = parser.parseTourCode('BKK05FD261111SM');
  assert.equal(result.airlineCode, 'FD');
  assert.equal(result.airline, '泰國亞洲航空');
  assert.notEqual(result.airline, '中華航空');
});

test('tour code airline wins when page flight text conflicts', () => {
  const result = parser.parse({
    url: 'https://www.besttour.com.tw/itinerary/SPK06FD261105AB',
    text: '團號 SPK06FD261105AB\n參考航班\n中華航空 CI123\n最低售價 32,800元起\n出發日期 2026/11/05'
  });
  assert.equal(result.airline, '泰國亞洲航空');
});

test('CI remains China Airlines', () => {
  const result = parser.parseTourCode('BKK05CI261111SM');
  assert.equal(result.airline, '中華航空');
});

test('supports airline codes that contain a number', () => {
  assert.equal(parser.parseTourCode('CTU05D7261111SM').airline, '亞洲航空X');
  assert.equal(parser.parseTourCode('CTU053U261111SM').airline, '四川航空');
});

test('includes the common airline code table from the supplied PDF', () => {
  assert.equal(parser.AIRLINES.AE, '華信航空');
  assert.equal(parser.AIRLINES.UO, '香港快運航空');
  assert.equal(parser.AIRLINES.QR, '卡達航空');
  assert.equal(parser.AIRLINES.LH, '德國漢莎航空');
  assert.ok(Object.keys(parser.AIRLINES).length >= 100);
});

