'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeDepartures,shortDate,filterDeparturesByRange,departureSummary,dailyPriceRows,groupedPriceRows,marketingPriceText}=require('../src/daily-prices.js');

test('shows a separate price for every departure date',()=>{
  const rows=dailyPriceRows([
    {code:'OSA05D7270301A',date:'2027/03/01',price:23888,seats:20},
    {code:'OSA05D7270313A',date:'2027/03/13',price:'25,888',seats:12}
  ]);
  assert.deepEqual(rows.map(row=>[row.label,row.priceLabel,row.lowest]),[
    ['3/1','23,888 元',true],['3/13','25,888 元',false]
  ]);
});

test('groups matching prices and puts price before dates in step four copy',()=>{
  const departures=[{date:'2027/03/01',price:23888},{date:'2027/03/13',price:25888},{date:'2027/03/14',price:25888},{date:'2027/03/15',price:25888}];
  const groups=groupedPriceRows(departures);
  assert.deepEqual(groups[1].dates,['3/13','3/14','3/15']);
  const text=marketingPriceText(departures);
  assert.match(text,/每日出發價格/);
  assert.match(text,/23,888元（最低價）｜3\/1/);
  assert.match(text,/25,888元｜3\/13、3\/14、3\/15/);
});

test('daily prices remove invalid duplicate rows and sort by date',()=>{
  const rows=normalizeDepartures([{code:'B',date:'2027-03-13',price:25888},{code:'A',date:'2027/03/01',price:23888},{code:'A',date:'2027/03/01',price:23888},{date:'bad',price:1}]);
  assert.deepEqual(rows.map(row=>row.date),['2027/03/01','2027/03/13']);
  assert.equal(shortDate(rows[0].date),'3/1');
});

test('filters departures inclusively and recalculates the minimum price for that range',()=>{
  const departures=[
    {date:'2026/10/14',price:33900},
    {date:'2027/01/04',price:35900},
    {date:'2027/02/18',price:32900},
    {date:'2027/04/01',price:31900}
  ];
  const filtered=filterDeparturesByRange(departures,'2027-01-01','2027-03-31');
  assert.deepEqual(filtered.map(row=>row.date),['2027/01/04','2027/02/18']);
  assert.deepEqual(departureSummary(filtered),{count:2,minimum:32900,price:'32,900元起',dates:'1/4、2/18'});
  assert.equal(departureSummary(departures).price,'31,900元起');
});

test('supports an open date range without changing the original departure data',()=>{
  const departures=[{date:'2026/12/14',price:33900},{date:'2027/01/04',price:35900}];
  assert.deepEqual(filterDeparturesByRange(departures,'2027-01-01','').map(row=>row.date),['2027/01/04']);
  assert.equal(departures.length,2);
});
