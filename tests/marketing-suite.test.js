'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateExtendedSet } = require('../src/marketing-suite.js');
const trip = { title:'北海道賞楓五日', subtitle:'秋季限定風景', price:'45,900元起', airline:'長榮航空', dates:'2026/10/15、2026/10/22', highlights:['層雲峽紅葉','美瑛拼布之路','溫泉飯店'], url:'https://example.com/trip', contact:'喜鴻假期－ㄚ喜', line:'0988894313' };
test('generates three additional marketing materials from verified trip facts', () => {
  const result = generateExtendedSet(trip);
  assert.match(result.edm, /北海道賞楓五日/);
  assert.match(result.edm, /45,900元起/);
  assert.match(result.committee, /企業福委/);
  assert.match(result.video, /30 秒短影音腳本/);
  for (const output of Object.values(result)) assert.match(output, /0988894313/);
});
test('does not present missing facts as verified information', () => {
  const result = generateExtendedSet({ title:'測試行程', price:'官網目前未顯示', airline:'待確認', dates:'未辨識', highlights:[] });
  assert.doesNotMatch(result.edm, /官網目前未顯示|待確認|未辨識/);
});
