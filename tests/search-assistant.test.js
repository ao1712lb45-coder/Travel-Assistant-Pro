'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {parseSearchRequest,searchTrips,officialSearchPlan}=require('../src/search-assistant.js');

test('understands next January and a scenic keyword',()=>{const result=parseSearchRequest('給我明年1月所有藏王樹冰的行程',new Date('2026-07-20T00:00:00+08:00'));assert.equal(result.year,2027);assert.equal(result.month,1);assert.equal(result.keyword,'藏王樹冰')});

test('understands a numeric month range without turning it into a calendar date',()=>{const result=parseSearchRequest('10-11月 北海道全部行程');assert.deepEqual(result.months,[10,11]);assert.equal(result.month,0);assert.equal(result.keyword,'北海道')});

test('understands common month list and Chinese month range wording',()=>{assert.deepEqual(parseSearchRequest('10、11月北海道').months,[10,11]);assert.deepEqual(parseSearchRequest('十月至十二月北海道').months,[10,11,12])});

test('searches every month in a requested range',()=>{const trips=[{code:'CTS05BR261001A',title:'北海道秋色',dates:'2026/10/01'},{code:'CTS05BR261101B',title:'北海道楓紅',dates:'2026/11/01'},{code:'CTS05BR261201C',title:'北海道雪景',dates:'2026/12/01'}];assert.equal(searchTrips(trips,{months:[10,11],keyword:'北海道'}).length,2)});

test('understands mid month and filters departures from day 11 through 20',()=>{const request=parseSearchRequest('10月中旬 北海道全部行程');assert.equal(request.month,10);assert.deepEqual(request.dayRange,[11,20]);assert.equal(request.keyword,'北海道');const trips=[{code:'CTS05BR261005A',title:'北海道初秋',dates:'2026/10/05'},{code:'CTS05BR261015B',title:'北海道楓紅',dates:'2026/10/15'},{code:'CTS05BR261025C',title:'北海道晚秋',dates:'2026/10/25'}];const results=searchTrips(trips,request);assert.equal(results.length,1);assert.equal(results[0].code,'CTS05BR261015B')});

test('understands the upcoming Lunar New Year and broad Europe destination',()=>{const request=parseSearchRequest('過年 歐洲團',new Date('2026-07-22T00:00:00+08:00'));assert.equal(request.year,2027);assert.deepEqual(request.dateRange,['2027-02-05','2027-02-11']);assert.equal(request.keyword,'歐洲');const trips=[{code:'FRA10BR270206A',title:'德瑞法十日',dates:'2027/02/06'},{code:'FRA10BR270220B',title:'巴黎春遊十日',dates:'2027/02/20'},{code:'TYO05BR270206C',title:'東京五日',dates:'2027/02/06'}];const results=searchTrips(trips,request);assert.equal(results.length,1);assert.equal(results[0].code,'FRA10BR270206A')});

test('plans an official Besttour fallback for missing Lunar New Year Japan trips',()=>{const plan=officialSearchPlan(parseSearchRequest('過年日本',new Date('2026-07-22T00:00:00+08:00')));assert.deepEqual(plan,{keywords:['日本'],dateFrom:'2027-02-05',dateTo:'2027-02-11'})});

test('recognizes upcoming Taiwan statutory holiday aliases',()=>{const now=new Date('2026-07-23T00:00:00+08:00');const cases=[['中秋節的行程','中秋節及教師節',['2026-09-25','2026-09-28']],['跨年日本','元旦',['2027-01-01','2027-01-03']],['清明韓國','兒童節及清明節',['2027-04-03','2027-04-06']],['聖誕節歐洲','行憲紀念日',['2026-12-25','2026-12-27']]];for(const [text,name,range] of cases){const result=parseSearchRequest(text,now);assert.equal(result.holiday,name);assert.deepEqual(result.dateRange,range)}});

test('recognizes numeric departure ranges and rolls a past range into next year',()=>{const result=parseSearchRequest('9/23-9/25之間出發的日本行程',new Date('2026-07-23T00:00:00+08:00'));assert.deepEqual(result.dateRange,['2026-09-23','2026-09-25']);assert.equal(result.keyword,'日本');const next=parseSearchRequest('2/3-2/5日本',new Date('2026-07-23T00:00:00+08:00'));assert.deepEqual(next.dateRange,['2027-02-03','2027-02-05'])});

test('recognizes full-year and Chinese date range formats',()=>{assert.deepEqual(parseSearchRequest('2027/9/23～9/25日本').dateRange,['2027-09-23','2027-09-25']);assert.deepEqual(parseSearchRequest('9月23日至25日日本',new Date('2026-07-23T00:00:00+08:00')).dateRange,['2026-09-23','2026-09-25'])});

test('normalizes Japan subregions and matches their cities or airport codes',()=>{const request=parseSearchRequest('10-11月 日本東北');assert.equal(request.keyword,'東北');const trips=[{code:'HNA07CX261015A',title:'藏王奧入瀨七日',dates:'2026/10/15'},{code:'SDJ06BR261105B',title:'仙台山形六日',dates:'2026/11/05'},{code:'TYO05BR261105C',title:'東京五日',dates:'2026/11/05'}];assert.equal(searchTrips(trips,request).length,2);assert.deepEqual(officialSearchPlan(request).keywords,['東北'])});

test('recognizes a range from mid October through the end of November',()=>{const request=parseSearchRequest('10月中旬到11月底 日本東北',new Date('2026-07-23T00:00:00+08:00'));assert.deepEqual(request.dateRange,['2026-10-11','2026-11-30']);assert.equal(request.keyword,'東北');const trips=[{code:'SDJ06BR261010A',title:'仙台六日',dates:'2026/10/10'},{code:'SDJ06BR261011B',title:'仙台六日',dates:'2026/10/11'},{code:'AOJ06BR261130C',title:'青森六日',dates:'2026/11/30'},{code:'AOJ06BR261201D',title:'青森六日',dates:'2026/12/01'}];assert.equal(searchTrips(trips,request).length,2)});

test('recognizes a cross-year month-period range',()=>{const result=parseSearchRequest('12月中旬到1月初北海道',new Date('2026-07-23T00:00:00+08:00'));assert.deepEqual(result.dateRange,['2026-12-11','2027-01-10']);assert.equal(result.keyword,'北海道')});

test('merges identical products with different departure dates but keeps every date',()=>{const trips=[
  {code:'SDJ05BR270101ZAO',title:'藏王樹冰五日',dates:'2027/01/01',price:'39,800元起',airline:'長榮航空',highlights:['藏王樹冰']},
  {code:'SDJ05BR270103ZAO',title:'藏王樹冰五日',dates:'2027/01/03',price:'38,800元起',airline:'長榮航空',highlights:['藏王樹冰']}
];const results=searchTrips(trips,{year:2027,month:1,keyword:'藏王樹冰'});assert.equal(results.length,1);assert.match(results[0].dates,/2027\/01\/01/);assert.match(results[0].dates,/2027\/01\/03/);assert.equal(results[0].price,'38,800元起');assert.equal(results[0].groupedDepartures,2)});

test('does not merge different itinerary products',()=>{const trips=[{code:'SDJ05BR270101ZAO',title:'藏王樹冰五日',dates:'2027/01/01',highlights:['藏王樹冰']},{code:'SDJ06BR270103SNW',title:'東北樹冰六日',dates:'2027/01/03',highlights:['藏王樹冰']}];assert.equal(searchTrips(trips,{year:2027,month:1,keyword:'藏王樹冰'}).length,2)});
