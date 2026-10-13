'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeTrips, mergeClients, changedTrips } = require('../src/cloud-database');

test('cloud merge returns only one record for each normalized tour code', () => {
  const merged = mergeTrips(
    [{ code:'ABC', title:'cloud', updated:'2026-07-20T00:00:00Z' }],
    [{ code:' abc ', title:'local', updated:'2026-07-21T00:00:00Z' }, { code:'XYZ', title:'other' }]
  );
  assert.equal(merged.length, 2);
  assert.equal(merged.find(row => row.code === 'ABC').title, 'local');
});

test('unchanged records are not uploaded again', () => {
  const trip = { code:'ABC', title:'same' };
  const known = new Map([['ABC', JSON.stringify(trip)]]);
  assert.deepEqual(changedTrips([trip], known), []);
  assert.equal(changedTrips([{ ...trip, title:'updated' }], known).length, 1);
});

test('Drive client merge keeps the latest CRM record',()=>{const rows=mergeClients([{id:'1',name:'舊',updated:'2026-01-01'}],[{id:'1',name:'新',updated:'2026-01-02'}]);assert.equal(rows[0].name,'新')});
