'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {parseSearchRequest,searchTrips}=require('../src/search-assistant.js');

test('understands next January and a scenic keyword',()=>{const result=parseSearchRequest('給我明年1月所有藏王樹冰的行程',new Date('2026-07-20T00:00:00+08:00'));assert.equal(result.year,2027);assert.equal(result.month,1);assert.equal(result.keyword,'藏王樹冰')});

test('understands a numeric month range without turning it into a calendar date',()=>{const result=parseSearchRequest('10-11月 北海道全部行程');assert.deepEqual(result.months,[10,11]);assert.equal(result.month,0);assert.equal(result.keyword,'北海道')});

test('understands common month list and Chinese month range wording',()=>{assert.deepEqual(parseSearchRequest('10、11月北海道').months,[10,11]);assert.deepEqual(parseSearchRequest('十月至十二月北海道').months,[10,11,12])});

test('searches every month in a requested range',()=>{const trips=[{code:'CTS05BR261001A',title:'北海道秋色',dates:'2026/10/01'},{code:'CTS05BR261101B',title:'北海道楓紅',dates:'2026/11/01'},{code:'CTS05BR261201C',title:'北海道雪景',dates:'2026/12/01'}];assert.equal(searchTrips(trips,{months:[10,11],keyword:'北海道'}).length,2)});

test('understands mid month and filters departures from day 11 through 20',()=>{const request=parseSearchRequest('10月中旬 北海道全部行程');assert.equal(request.month,10);assert.deepEqual(request.dayRange,[11,20]);assert.equal(request.keyword,'北海道');const trips=[{code:'CTS05BR261005A',title:'北海道初秋',dates:'2026/10/05'},{code:'CTS05BR261015B',title:'北海道楓紅',dates:'2026/10/15'},{code:'CTS05BR261025C',title:'北海道晚秋',dates:'2026/10/25'}];const results=searchTrips(trips,request);assert.equal(results.length,1);assert.equal(results[0].code,'CTS05BR261015B')});

test('understands the upcoming Lunar New Year and broad Europe destination',()=>{const request=parseSearchRequest('過年 歐洲團',new Date('2026-07-22T00:00:00+08:00'));assert.equal(request.year,2027);assert.deepEqual(request.dateRange,['2027-02-05','2027-02-11']);assert.equal(request.keyword,'歐洲');const trips=[{code:'FRA10BR270206A',title:'德瑞法十日',dates:'2027/02/06'},{code:'FRA10BR270220B',title:'巴黎春遊十日',dates:'2027/02/20'},{code:'TYO05BR270206C',title:'東京五日',dates:'2027/02/06'}];const results=searchTrips(trips,request);assert.equal(results.length,1);assert.equal(results[0].code,'FRA10BR270206A')});

test('merges identical products with different departure dates but keeps every date',()=>{const trips=[
  {code:'SDJ05BR270101ZAO',title:'藏王樹冰五日',dates:'2027/01/01',price:'39,800元起',airline:'長榮航空',highlights:['藏王樹冰']},
  {code:'SDJ05BR270103ZAO',title:'藏王樹冰五日',dates:'2027/01/03',price:'38,800元起',airline:'長榮航空',highlights:['藏王樹冰']}
];const results=searchTrips(trips,{year:2027,month:1,keyword:'藏王樹冰'});assert.equal(results.length,1);assert.match(results[0].dates,/2027\/01\/01/);assert.match(results[0].dates,/2027\/01\/03/);assert.equal(results[0].price,'38,800元起');assert.equal(results[0].groupedDepartures,2)});

test('does not merge different itinerary products',()=>{const trips=[{code:'SDJ05BR270101ZAO',title:'藏王樹冰五日',dates:'2027/01/01',highlights:['藏王樹冰']},{code:'SDJ06BR270103SNW',title:'東北樹冰六日',dates:'2027/01/03',highlights:['藏王樹冰']}];assert.equal(searchTrips(trips,{year:2027,month:1,keyword:'藏王樹冰'}).length,2)});
