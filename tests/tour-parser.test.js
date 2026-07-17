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

test('CI remains China Airlines', () => {
  const result = parser.parseTourCode('BKK05CI261111SM');
  assert.equal(result.airline, '中華航空');
});

