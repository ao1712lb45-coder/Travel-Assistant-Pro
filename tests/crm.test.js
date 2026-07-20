'use strict';const test=require('node:test'),assert=require('node:assert/strict'),{scoreTrip}=require('../src/crm.js');
test('CRM rewards matching preferences',()=>{const r=scoreTrip({likes:'日本、賞楓、長榮',avoids:'購物'},{title:'日本北海道賞楓五日',airline:'長榮航空',highlights:['紅葉名所']});assert.equal(r.suitable,true);assert.deepEqual(r.matched,['日本','賞楓','長榮']);assert.equal(r.score,75)});
test('CRM blocks a trip that contains an avoid condition',()=>{const r=scoreTrip({likes:'日本',avoids:'購物'},{title:'日本五日',highlights:['免稅店購物']});assert.equal(r.suitable,false);assert.deepEqual(r.conflicts,['購物'])});
