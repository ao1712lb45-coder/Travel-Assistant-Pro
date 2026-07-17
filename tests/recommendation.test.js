'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/recommendation.js');
const matcher = globalThis.TravelRecommendation;

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

test('full itinerary matches can make hidden attractions searchable', () => {
  const hidden = [{ code:'FUK05BR261104U', title:'超值九州５日', price:'39,900元起', dates:'11/4',
    officialMatchedKeywords:['真名井瀑布'], contentMatches:[{ day:2, excerpt:'高千穗峽－真名井瀑布' }] }];
  const result = matcher.rankTrips(hidden, { people:2, destination:'九州', budget:50000, month:11, keywords:'真名井瀑布' });
  assert.equal(result[0].trip.code, 'FUK05BR261104U');
  assert.equal(result[0].trip.contentMatches[0].day, 2);
});

