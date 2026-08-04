'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeDepartures,shortDate,dailyPriceRows}=require('../src/daily-prices.js');

test('shows a separate price for every departure date',()=>{
  const rows=dailyPriceRows([
    {code:'OSA05D7270301A',date:'2027/03/01',price:23888,seats:20},
    {code:'OSA05D7270313A',date:'2027/03/13',price:'25,888',seats:12}
  ]);
  assert.deepEqual(rows.map(row=>[row.label,row.priceLabel,row.lowest]),[
    ['3/1','23,888 元',true],['3/13','25,888 元',false]
  ]);
});

test('daily prices remove invalid duplicate rows and sort by date',()=>{
  const rows=normalizeDepartures([{code:'B',date:'2027-03-13',price:25888},{code:'A',date:'2027/03/01',price:23888},{code:'A',date:'2027/03/01',price:23888},{date:'bad',price:1}]);
  assert.deepEqual(rows.map(row=>row.date),['2027/03/01','2027/03/13']);
  assert.equal(shortDate(rows[0].date),'3/1');
});
