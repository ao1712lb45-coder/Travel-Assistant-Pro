'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {parseSearchRequest,searchTrips}=require('../src/search-assistant.js');

test('understands next January and a scenic keyword',()=>{const result=parseSearchRequest('給我明年1月所有藏王樹冰的行程',new Date('2026-07-20T00:00:00+08:00'));assert.equal(result.year,2027);assert.equal(result.month,1);assert.equal(result.keyword,'藏王樹冰')});

test('merges identical products with different departure dates but keeps every date',()=>{const trips=[
  {code:'SDJ05BR270101ZAO',title:'藏王樹冰五日',dates:'2027/01/01',price:'39,800元起',airline:'長榮航空',highlights:['藏王樹冰']},
  {code:'SDJ05BR270103ZAO',title:'藏王樹冰五日',dates:'2027/01/03',price:'38,800元起',airline:'長榮航空',highlights:['藏王樹冰']}
];const results=searchTrips(trips,{year:2027,month:1,keyword:'藏王樹冰'});assert.equal(results.length,1);assert.match(results[0].dates,/2027\/01\/01/);assert.match(results[0].dates,/2027\/01\/03/);assert.equal(results[0].price,'38,800元起');assert.equal(results[0].groupedDepartures,2)});

test('does not merge different itinerary products',()=>{const trips=[{code:'SDJ05BR270101ZAO',title:'藏王樹冰五日',dates:'2027/01/01',highlights:['藏王樹冰']},{code:'SDJ06BR270103SNW',title:'東北樹冰六日',dates:'2027/01/03',highlights:['藏王樹冰']}];assert.equal(searchTrips(trips,{year:2027,month:1,keyword:'藏王樹冰'}).length,2)});
