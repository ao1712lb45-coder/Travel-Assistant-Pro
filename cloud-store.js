'use strict';

class CloudStoreError extends Error {
  constructor(code, message, status = 502) { super(message); this.code = code; this.status = status; }
}

function cloudConfig(source = process.env) {
  const url = String(source.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(source.SUPABASE_SERVICE_ROLE_KEY || '');
  return { url, key, configured:Boolean(url && key) };
}

async function request(config, pathname, options = {}, fetchImpl = fetch) {
  if (!config.configured) throw new CloudStoreError('CLOUD_NOT_CONFIGURED', '雲端資料庫尚未完成設定。', 503);
  const authHeaders = { apikey:config.key };
  if (!config.key.startsWith('sb_secret_')) authHeaders.authorization = `Bearer ${config.key}`;
  const response = await fetchImpl(config.url + pathname, {
    ...options,
    headers:{ ...authHeaders, accept:'application/json', ...(options.headers || {}) }
  });
  const raw = await response.text();
  if (!response.ok) {
    let detail='';
    try { const payload=JSON.parse(raw); detail=String(payload.message||payload.error_description||payload.error||payload.msg||'').slice(0,200); } catch {}
    throw new CloudStoreError('CLOUD_REQUEST_FAILED', `Supabase 回傳 HTTP ${response.status}${detail?`：${detail}`:''}。`, 502);
  }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { throw new CloudStoreError('CLOUD_INVALID_RESPONSE', 'Supabase 回傳資料格式錯誤。', 502); }
}

async function readTrips(config, fetchImpl = fetch) {
  const trips=[]; let offset=0;
  while (true) {
    const rows = await request(config, '/rest/v1/travel_trips?select=code,data&order=updated_at.asc', {
      headers:{ range:`${offset}-${offset + 999}` }
    }, fetchImpl) || [];
    rows.forEach(row => { if (row && row.data && row.code) trips.push({ ...row.data, code:row.code }); });
    if (rows.length < 1000) break;
    offset += rows.length;
    if (offset >= 100000) throw new CloudStoreError('CLOUD_TOO_MANY_ROWS', '雲端行程數量超過安全上限。', 507);
  }
  return trips;
}

async function upsertTrips(config, trips, fetchImpl = fetch) {
  const unique = new Map();
  (trips || []).forEach(trip => { const code=String(trip && trip.code || '').trim().toUpperCase(); if (code) unique.set(code,{...trip,code}); });
  const records=[...unique.entries()].map(([code,data])=>({code,data,updated_at:new Date().toISOString()}));
  if (!records.length) return { saved:0 };
  await request(config, '/rest/v1/travel_trips?on_conflict=code', {
    method:'POST', headers:{'content-type':'application/json','prefer':'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify(records)
  }, fetchImpl);
  return { saved:records.length };
}

async function createSnapshot(config, fetchImpl = fetch) {
  const trips=await readTrips(config,fetchImpl);
  await request(config, '/rest/v1/travel_database_snapshots', {
    method:'POST', headers:{'content-type':'application/json','prefer':'return=minimal'},
    body:JSON.stringify([{trip_count:trips.length,data:trips}])
  }, fetchImpl);
  const old = await request(config, '/rest/v1/travel_database_snapshots?select=id&order=created_at.desc&offset=3', {}, fetchImpl) || [];
  const ids = old.map(row => Number(row.id)).filter(Number.isFinite);
  if (ids.length) await request(config, `/rest/v1/travel_database_snapshots?id=in.(${ids.join(',')})`, { method:'DELETE' }, fetchImpl);
  return { tripCount:trips.length };
}

module.exports={CloudStoreError,cloudConfig,readTrips,upsertTrips,createSnapshot};
