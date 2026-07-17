'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { splitDates, priceNumber } = require('../src/dm-designer');

test('extracts multiple departure dates for DM date chips', () => {
  assert.deepEqual(splitDates('2026/8/4、8/8、8/9、8/11、8/15'), ['2026/8/4','8/8','8/9','8/11','8/15']);
});
test('extracts the displayed price without confusing separators', () => {
  assert.equal(priceNumber('23,900元起'), 23900);
});
