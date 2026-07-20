'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/recommendation.js');
const matcher = globalThis.TravelRecommendation;

test('one-click region sync covers today through six months later',()=>{
  assert.deepEqual(matcher.sixMonthRange(new Date(2026,6,18)),{from:'2026-07-18',to:'2027-01-18'});
});

const trips = [
  { code:'SPK06FD261105AB', title:'楓紅輕旅北海道６日', price:'32,800元起', dates:'10/16、11/5', airline:'泰國亞洲航空', highlights:['紅葉','溫泉'] },
  { code:'TYO05JX261111SM', title:'東京迪士尼５日', price:'39,900元起', dates:'11/11', airline:'星宇航空', highlights:['親子','迪士尼'] },
  { code:'BKK05JX261111SM', title:'漫享沙美島５日', price:'29,388元起', dates:'11/11', airline:'星宇航空', highlights:['海島','SPA'] }
];

test('matches destination, month, people and per-person budget', () => {
  const result = matcher.rankTrips(trips, { people:4, destination:'北海道', budget:35000, month:11, keywords:'溫泉' });
  assert.equal(result.length, 1);
  assert.equal(result[0].trip.code, 'SPK06FD261105AB');
  assert.equal(result[0].total, 131200);
});

test('broad Southeast Asia search includes a Samed Island Bangkok-code trip', () => {
  const result = matcher.rankTrips(trips, { people:2, destination:'東南亞', budget:50000 });
  assert.deepEqual(result.map(item => item.trip.code), ['BKK05JX261111SM']);
});

test('broad Japan destination includes Hokkaido and Tokyo', () => {
  const result = matcher.rankTrips(trips, { people:2, destination:'日本', budget:50000 });
  assert.deepEqual(result.map(item => item.trip.code).sort(), ['SPK06FD261105AB','TYO05JX261111SM']);
});

test('senior-friendly preference raises relaxed itineraries and avoids stairs or slopes when requested', () => {
  const options = [
    { code:'FUK05BR261101AA', title:'九州慢遊溫泉五日', price:'35,000元起', dates:'11/1', highlights:['溫泉','觀光列車','遊船'] },
    { code:'FUK05BR261102BB', title:'九州健行五日', price:'34,000元起', dates:'11/2', highlights:['登山步道','石階'] }
  ];
  const result = matcher.rankTrips(options, { people:2, destination:'九州', budget:50000, travelerType:'senior', avoidSlopes:true, avoidStairs:true, easyPace:true });
  assert.deepEqual(result.map(item => item.trip.code), ['FUK05BR261101AA']);
  assert.match(result[0].reasons.join(' '), /長輩|輕鬆/);
});

test('family and youth profiles reward matching experiences', () => {
  const options = [
    { code:'TYO05JX261101AA', title:'東京親子五日', price:'40,000元起', dates:'11/1', highlights:['迪士尼','水族館'] },
    { code:'TYO05JX261102BB', title:'東京潮玩五日', price:'40,000元起', dates:'11/2', highlights:['夜市','自由活動','單車體驗'] }
  ];
  assert.equal(matcher.rankTrips(options, { travelerType:'family' })[0].trip.code, 'TYO05JX261101AA');
  assert.equal(matcher.rankTrips(options, { travelerType:'youth' })[0].trip.code, 'TYO05JX261102BB');
});

test('date range airport airline and shopping constraints are applied without guessing unknown fields', () => {
  const options=[
    {code:'TYO05IT261101AA',title:'東京五日',dates:'2026/11/01',days:'5日',departureCity:'桃園',airline:'台灣虎航',highlights:['免稅店']},
    {code:'TYO05JX261105BB',title:'東京五日',dates:'2026/11/05',days:'5日',departureCity:'桃園',airline:'星宇航空',highlights:['迪士尼']},
    {code:'TYO06JX261105CC',title:'東京六日',dates:'2026/11/05',days:'6日',departureCity:'高雄',airline:'星宇航空'}
  ];
  const result=matcher.rankTrips(options,{destination:'日本',days:5,departureAirport:'桃園',dateFrom:'2026-11-03',dateTo:'2026-11-10',avoidLowCost:true,avoidShopping:true});
  assert.deepEqual(result.map(item=>item.trip.code),['TYO05JX261105BB']);
});

test('filters customer matches by airline code or airline name', () => {
  const options = [
    { code:'PUS05BX261002J', title:'釜山五日', airline:'釜山航空', dates:'2026/10/02', price:'29,900元起' },
    { code:'PUS05BR261003J', title:'釜山五日', airline:'長榮航空', dates:'2026/10/03', price:'31,900元起' },
    { code:'PUS05CI261004J', title:'釜山五日', airline:'中華航空', dates:'2026/10/04', price:'30,900元起' }
  ];
  assert.deepEqual(matcher.rankTrips(options, { airline:'BX' }).map(item => item.trip.code), ['PUS05BX261002J']);
  assert.deepEqual(matcher.rankTrips(options, { airline:'BR CI' }).map(item => item.trip.code).sort(), ['PUS05BR261003J','PUS05CI261004J']);
  assert.deepEqual(matcher.rankTrips(options, { airline:'釜山航空' }).map(item => item.trip.code), ['PUS05BX261002J']);
});

test('filters departures by selected weekdays using dates or tour code date', () => {
  const options = [
    { code:'PUS05BX261002J', title:'週五釜山', dates:'2026/10/02', price:'29,900元起' },
    { code:'PUS05BX261003J', title:'週六釜山', dates:'2026/10/03', price:'30,900元起' },
    { code:'PUS05BX261004J', title:'週日釜山', dates:'', price:'31,900元起' }
  ];
  assert.deepEqual(matcher.rankTrips(options, { weekdays:[5] }).map(item => item.trip.code), ['PUS05BX261002J']);
  assert.deepEqual(matcher.rankTrips(options, { weekdays:[6,0] }).map(item => item.trip.code).sort(), ['PUS05BX261003J','PUS05BX261004J']);
  assert.equal(matcher.rankTrips(options, { weekdays:[0,1,2,3,4,5,6] }).length, 3);
});

test('keyword is a required filter when the user enters one', () => {
  const result = matcher.rankTrips(trips, { people:2, destination:'日本', budget:50000, keywords:'人妖秀' });
  assert.equal(result.length, 0);
});

test('human show aliases match common official attraction names', () => {
  const thailand = [
    { code:'BKK05BR261010AB', title:'曼谷五星五日', price:'35,000元起', dates:'10/10', highlights:['卡里普索 Calypso 秀'] },
    { code:'BKK05BR261012CD', title:'曼谷經典五日', price:'34,000元起', dates:'10/12', highlights:['水上市場'] }
  ];
  const result = matcher.rankTrips(thailand, { people:2, destination:'泰國', budget:35000, month:10, keywords:'人妖秀' });
  assert.deepEqual(result.map(item => item.trip.code), ['BKK05BR261010AB']);
  assert.ok(matcher.expandKeyword('人妖秀').includes('alcazar'));
});

test('snow experience never matches tropical beach trips', () => {
  const options=[
    {code:'SPK05BR270110AA',title:'北海道玩雪五日',highlights:['雪盆','雪上活動'],price:'45,000元起'},
    {code:'BKK05BR270110BB',title:'泰國曼谷五日',highlights:['水上市場','夜市'],officialMatchedKeywords:['玩雪'],price:'30,000元起'},
    {code:'CEB05JX270110CC',title:'宿霧海島五日',highlights:['沙灘','浮潛'],officialMatchedKeywords:['玩雪'],price:'32,000元起'}
  ];
  const result=matcher.rankTrips(options,{keywords:'玩雪'});
  assert.deepEqual(result.map(item=>item.trip.code),['SPK05BR270110AA']);
  assert.ok(matcher.expandKeyword('玩雪').includes('滑雪'));
});

test('snow remains a content keyword while operational preferences are removed', () => {
  assert.deepEqual(matcher.contentKeywords('玩雪、跟團、不要廉航'),['玩雪']);
});

test('requested year rejects trips from a different known year', () => {
  const options=[
    {code:'SPK05BR270110AA',title:'北海道玩雪五日',dates:'2027/01/10',highlights:['玩雪'],price:'45,000元起'},
    {code:'SPK05BR260110AA',title:'北海道玩雪五日',dates:'2026/01/10',highlights:['玩雪'],price:'42,000元起'}
  ];
  assert.deepEqual(matcher.rankTrips(options,{month:1,year:2027,keywords:'玩雪'}).map(item=>item.trip.code),['SPK05BR270110AA']);
});

test('full itinerary matches can make hidden attractions searchable', () => {
  const hidden = [{ code:'FUK05BR261104U', title:'超值九州５日', price:'39,900元起', dates:'11/4',
    officialMatchedKeywords:['真名井瀑布'], contentMatches:[{ day:2, excerpt:'高千穗峽－真名井瀑布' }] }];
  const result = matcher.rankTrips(hidden, { people:2, destination:'九州', budget:50000, month:11, keywords:'真名井瀑布' });
  assert.equal(result[0].trip.code, 'FUK05BR261104U');
  assert.equal(result[0].trip.contentMatches[0].day, 2);
});

test('official database sync refreshes volatile fields but keeps saved highlights', () => {
  const oldTrip = { code:'FUK05BR261104U', title:'舊名稱', price:'39,900元起', dates:'11/4', seats:3, highlights:['真名井瀁布'] };
  const fresh = { code:'FUK05BR261104U', title:'最新九州五日', price:'37,900元起', dates:'11/4、11/11', seats:12, source:'besttour-search' };
  const result = matcher.mergeOfficialTrip(oldTrip, fresh);
  assert.equal(result.price, '37,900元起');
  assert.equal(result.seats, 12);
  assert.deepEqual(result.highlights, ['真名井瀁布']);
});

test('latest itinerary fields update price dates airline and selected departure seats', () => {
  const result = matcher.applyLatestFields({ code:'GES10BR261118PAK', price:'99,900元起', seats:1 }, {
    source:'besttour-api', fields:{ title:'瑞士雙峰１０日', price:109900, dates:['2026/11/18','2026/11/25'], airline:'長榮航空',
      departures:[{ code:'GES10BR261118PAK', date:'2026/11/18', seats:18 }] }
  });
  assert.equal(result.price, '109,900元起');
  assert.equal(result.dates, '2026/11/18、2026/11/25');
  assert.equal(result.airline, '長榮航空');
  assert.equal(result.seats, 18);
  assert.ok(result.lastChecked);
});

