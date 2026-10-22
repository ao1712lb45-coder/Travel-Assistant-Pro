'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {pack,unpack,read,write}=require('../src/trip-storage');

test('trip storage round trips every field without losing nested data',()=>{
  const trips=[{code:'A',title:'日本五日',price:'29,900元起',departures:[{date:'2027/01/01',seats:3}],guaranteedDeparture:false},{code:'B',title:'韓國四日',extra:'保留'}];
  assert.deepEqual(unpack(pack(trips)),trips);
});

test('trip storage reads legacy arrays and writes the compact TAP2 format',()=>{
  const values=new Map([['travelV10Db',JSON.stringify([{code:'OLD',title:'舊資料'}])]]),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  assert.deepEqual(read(storage),[{code:'OLD',title:'舊資料'}]);
  write([{code:'NEW',title:'新資料'}],storage);
  assert.equal(JSON.parse(values.get('travelV10Db')).format,'TAP2');
  assert.deepEqual(read(storage),[{code:'NEW',title:'新資料'}]);
});

test('compact storage removes repeated object keys from every trip row',()=>{
  const trips=Array.from({length:100},(_,index)=>({code:`T${index}`,title:'很長的行程標題',price:'29,900元起'}));
  assert.ok(JSON.stringify(pack(trips)).length<JSON.stringify(trips).length*.7);
});
