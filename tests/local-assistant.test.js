'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { understand } = require('../src/local-assistant');

test('understands platform and rewrite requests', () => {
  assert.deepEqual(understand('幫我換一篇 Threads'), { intent:'generate', platform:'threads', style:null, advance:true });
  assert.equal(understand('產生 Facebook 文案').platform, 'facebook');
  assert.equal(understand('LINE 文案').platform, 'line');
});

test('understands tone requests without an API', () => {
  assert.equal(understand('改成親子語氣').style, 'family');
  assert.equal(understand('專業一點').style, 'professional');
  assert.equal(understand('做優惠文案').style, 'deal');
});

test('understands utility requests', () => {
  assert.equal(understand('整理目前行程').intent, 'summary');
  assert.equal(understand('複製目前文案').intent, 'copy');
  assert.equal(understand('你好').intent, 'help');
});
