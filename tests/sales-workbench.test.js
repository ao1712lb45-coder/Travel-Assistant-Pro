'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCustomerMessage, questionReply, comparisonRecord, buildReplies } = require('../src/sales-workbench');

test('parses a travel agent customer LINE message into structured needs',()=>{
  const result=parseCustomerMessage('想找 8/10～8/15 桃園出發，日本或韓國，2大1小，每人四萬內，5天跟團，不要廉航、不要購物站，希望有樂園，親子友善',new Date(2026,6,18));
  assert.deepEqual(result.dates,['2026-08-10','2026-08-15']);
  assert.deepEqual(result.airports,['桃園']);
  assert.equal(result.destination,'日本');
  assert.deepEqual(result.alternatives,['韓國']);
  assert.deepEqual([result.adults,result.children,result.infants],[2,1,0]);
  assert.equal(result.budget,40000);
  assert.equal(result.days,5);
  assert.equal(result.travelType,'跟團');
  assert.ok(result.preferences.includes('不要廉航'));
  assert.ok(result.preferences.includes('不要購物站'));
  assert.ok(result.preferences.includes('親子友善'));
  assert.deepEqual(result.missing,[]);
});

test('lists missing questions and generates a copyable reply',()=>{
  const result=parseCustomerMessage('想帶爸媽去日本');
  assert.ok(result.missing.includes('出發機場'));
  assert.ok(result.missing.includes('每人或總預算'));
  assert.match(questionReply(result),/想再請問/);
  assert.match(questionReply(result),/出發機場/);
});

test('recognizes snow play as a required experience',()=>{
  const result=parseCustomerMessage('寒假想帶小孩玩雪，桃園出發，2大1小，五萬內');
  assert.ok(result.preferences.includes('玩雪'));
  assert.ok(result.missing.includes('目的地或可接受的備選地點'));
});

test('recognizes next January and an unspecified party of four',()=>{
  const result=parseCustomerMessage('我想找明年一月可以玩雪的團 桃園出發 4位 預算6萬/人 跟團',new Date(2026,6,18));
  assert.equal(result.requestedYear,2027);
  assert.equal(result.month,1);
  assert.equal(result.totalPeople,4);
  assert.equal(result.adults,null);
  assert.ok(result.missing.includes('大人、兒童與嬰兒人數'));
});

test('recognizes upcoming Lunar New Year and Taiwan holiday aliases',()=>{
  const request=parseCustomerMessage('我要找過年行程 4位 預算10萬/人',new Date(2026,6,20));
  assert.equal(request.holiday,'農曆春節');
  assert.deepEqual(request.dates,['2027-02-05','2027-02-11']);
  assert.equal(request.month,2);
  assert.equal(request.requestedYear,2027);
  assert.ok(!request.missing.some(item=>item.includes('日期')));
  assert.deepEqual(parseCustomerMessage('想找雙十連假去日本',new Date(2026,6,20)).dates,['2026-10-09','2026-10-11']);
});

test('comparison never invents unknown operational fields',()=>{
  const record=comparisonRecord({trip:{code:'TYO05JX261101AA',title:'東京五日',price:'39,900元起',dates:'2026/11/01',airline:'星宇航空',source:'besttour-search',updated:'2026-07-18T10:00:00Z'}});
  assert.equal(record.hotels,'待人工確認');
  assert.equal(record.extraFees,'待人工確認');
  assert.equal(record.status,'待人工確認');
  assert.equal(record.source,'Besttour 官方搜尋');
});

test('builds short comparison and alternative LINE replies',()=>{
  const records=[comparisonRecord({trip:{title:'東京五日',price:'39,900元起',dates:'11/1',airline:'星宇航空'}}),comparisonRecord({trip:{title:'大阪五日',price:'41,900元起',dates:'11/2',airline:'長榮航空'}})];
  const replies=buildReplies(records,parseCustomerMessage('日本2大')); assert.match(replies.brief,/東京五日/);assert.match(replies.compare,/大阪五日/);assert.match(replies.alternative,/放寬/);
});

test('alternative reply states the exact relaxed condition',()=>{
  const record=comparisonRecord({relaxation:'已放寬：預算上限增加 15%',trip:{title:'東京五日',price:'45,900元起',dates:'11/1'}});
  assert.match(buildReplies([record],parseCustomerMessage('日本')).alternative,/預算上限增加 15%/);
});
