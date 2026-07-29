'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cloudConfig, readTrips, upsertTrips, readClients, upsertClient, deleteClient, listSnapshots, restoreSnapshot, createClientSnapshot, listClientSnapshots, restoreClientSnapshot } = require('../cloud-store');

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

test('new Supabase secret keys use the apikey header without an invalid bearer token', async () => {
  let headers;
  await upsertTrips(
    { url:'https://sample.supabase.co', key:'sb_secret_example', configured:true },
    [{ code:'ABC' }],
    async (_url, options) => { headers=options.headers; return { ok:true, status:201, text:async()=>'' }; }
  );
  assert.equal(headers.apikey, 'sb_secret_example');
  assert.equal(headers.authorization, undefined);
});

test('Supabase error details are preserved without exposing request credentials', async () => {
  await assert.rejects(
    readTrips(
      { url:'https://sample.supabase.co', key:'sb_secret_hidden', configured:true },
      async () => ({ ok:false, status:403, text:async()=>JSON.stringify({ message:'Invalid API key' }) })
    ),
    error => error.code==='CLOUD_REQUEST_FAILED' && /Invalid API key/.test(error.message) && !/sb_secret_hidden/.test(error.message)
  );
});

test('CRM records share Supabase safely without appearing in the trip database', async()=>{
  let tripUrl='';
  const trips=await readTrips({url:'https://sample.supabase.co',key:'secret',configured:true},async url=>{tripUrl=String(url);return{ok:true,status:200,text:async()=>JSON.stringify([])}});
  assert.deepEqual(trips,[]);assert.match(tripUrl,/code=not\.like\.__CRM__/);
  const clients=await readClients({url:'https://sample.supabase.co',key:'secret',configured:true},async url=>{assert.match(String(url),/code=like\.__CRM__/);return{ok:true,status:200,text:async()=>JSON.stringify([{code:'__CRM__1',data:{id:'1',name:'王小姐'}}])}});
  assert.deepEqual(clients,[{id:'1',name:'王小姐'}]);
});

test('CRM customers can be saved and deleted in Supabase',async()=>{const requests=[],fetchImpl=async(url,options)=>{requests.push({url:String(url),options});return{ok:true,status:204,text:async()=>''}},config={url:'https://sample.supabase.co',key:'secret',configured:true};await upsertClient(config,{id:'123',name:'陳先生',likes:'日本'},fetchImpl);await deleteClient(config,'123',fetchImpl);const row=JSON.parse(requests[0].options.body)[0];assert.equal(row.code,'__CRM__123');assert.equal(row.data.likes,'日本');assert.match(requests[1].url,/code=eq\.__CRM__123/);assert.equal(requests[1].options.method,'DELETE')});

test('trip snapshot restore replaces trips but preserves CRM rows',async()=>{const requests=[],config={url:'https://sample.supabase.co',key:'secret',configured:true},fetchImpl=async(url,options={})=>{requests.push({url:String(url),options});if(String(url).includes('select=data'))return{ok:true,status:200,text:async()=>JSON.stringify([{trip_count:1,data:[{code:'TYO05BR261101A',title:'東京'}]}])};return{ok:true,status:204,text:async()=>''}};const result=await restoreSnapshot(config,7,fetchImpl);assert.equal(result.tripCount,1);const deletion=requests.find(item=>item.options.method==='DELETE');assert.match(deletion.url,/code=not\.like\.__CRM__/);assert.equal(requests.some(item=>item.url.includes('on_conflict=code')),true)});

test('snapshot lists keep trip and CRM backups separate',async()=>{const config={url:'https://sample.supabase.co',key:'secret',configured:true};const tripRows=await listSnapshots(config,async url=>{assert.match(String(url),/trip_count=gte\.0/);return{ok:true,status:200,text:async()=>JSON.stringify([{id:1,trip_count:5000}])}});assert.equal(tripRows[0].trip_count,5000);const crmRows=await listClientSnapshots(config,async url=>{assert.match(String(url),/trip_count=lt\.0/);return{ok:true,status:200,text:async()=>JSON.stringify([{id:2,trip_count:-4}])}});assert.equal(crmRows[0].client_count,3)});

test('CRM snapshot backup and restore replace only CRM records',async()=>{const config={url:'https://sample.supabase.co',key:'secret',configured:true},requests=[],fetchImpl=async(url,options={})=>{requests.push({url:String(url),options});if(String(url).includes('select=code,data'))return{ok:true,status:200,text:async()=>JSON.stringify([{data:{id:'1',name:'王先生'}}])};if(String(url).includes('select=data'))return{ok:true,status:200,text:async()=>JSON.stringify([{data:[{id:'1',name:'王先生'}]}])};if(String(url).includes('offset=3'))return{ok:true,status:200,text:async()=>JSON.stringify([])};return{ok:true,status:204,text:async()=>''}};assert.equal((await createClientSnapshot(config,fetchImpl)).clientCount,1);assert.equal((await restoreClientSnapshot(config,9,fetchImpl)).restored,1);assert.equal(requests.some(item=>item.options.method==='DELETE'&&item.url.includes('code=like.__CRM__')),true)});
