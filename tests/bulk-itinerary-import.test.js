'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {parseBulkEntries,mergeRecords}=require('../src/bulk-itinerary-import.js');
test('accepts multiple tour codes and URLs separated by lines spaces or commas',()=>{const entries=parseBulkEntries('asb07br261226dw\nPUS05BX261002J, https://www.besttour.com.tw/itinerary/FUK05BR261206FU');assert.deepEqual(entries,['ASB07BR261226DW','PUS05BX261002J','https://www.besttour.com.tw/itinerary/FUK05BR261206FU'])});
test('removes duplicate bulk entries',()=>{assert.deepEqual(parseBulkEntries('PUS05BX261002J PUS05BX261002J'),['PUS05BX261002J'])});
test('bulk records update existing tours instead of duplicating them',()=>{const result=mergeRecords([{code:'AAA05BR261001A',title:'舊名稱',price:'30,000元'}],[{code:'AAA05BR261001A',title:'新名稱',price:'29,000元'}]);assert.equal(result.length,1);assert.equal(result[0].title,'新名稱');assert.equal(result[0].price,'29,000元')});
