'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cloudConfig, upsertTrips } = require('../cloud-store');

test('cloud configuration requires both URL and secret key', () => {
  assert.equal(cloudConfig({}).configured, false);
  assert.deepEqual(cloudConfig({ SUPABASE_URL:'https://sample.supabase.co/', SUPABASE_SERVICE_ROLE_KEY:'secret' }), {
    url:'https://sample.supabase.co', key:'secret', configured:true
  });
});

test('cloud upsert removes duplicate tour codes and keeps the latest occurrence', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok:true, status:201, text:async()=>'' };
  };
  const result = await upsertTrips(
    { url:'https://sample.supabase.co', key:'secret', configured:true },
    [{ code:'abc', title:'old' }, { code:' ABC ', title:'new' }, { code:'xyz', title:'second' }],
    fetchImpl
  );
  assert.equal(result.saved, 2);
  assert.match(request.url, /on_conflict=code/);
  assert.match(request.options.headers.prefer, /resolution=merge-duplicates/);
  const rows = JSON.parse(request.options.body);
  assert.deepEqual(rows.map(row => row.code), ['ABC','XYZ']);
  assert.equal(rows[0].data.title, 'new');
});
