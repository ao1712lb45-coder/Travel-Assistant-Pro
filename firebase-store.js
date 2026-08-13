'use strict';

const crypto=require('node:crypto');
const {CloudStoreError}=require('./cloud-store');

function firebaseConfig(source=process.env){
  const projectId=String(source.FIREBASE_PROJECT_ID||'').trim();
  const clientEmail=String(source.FIREBASE_CLIENT_EMAIL||'').trim();
  const privateKey=String(source.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n').trim();
  return{projectId,clientEmail,privateKey,provider:'firebase',configured:Boolean(projectId&&clientEmail&&privateKey)};
}

let cached=null;
function getDb(config){
  if(!config.configured)throw new CloudStoreError('CLOUD_NOT_CONFIGURED','Firebase Firestore 尚未完成設定。',503);
  if(cached)return cached;
  let appSdk,firestoreSdk;
  try{appSdk=require('firebase-admin/app');firestoreSdk=require('firebase-admin/firestore')}catch{throw new CloudStoreError('FIREBASE_SDK_MISSING','伺服器尚未安裝 Firebase 套件。',503)}
  const app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp({credential:appSdk.cert({projectId:config.projectId,clientEmail:config.clientEmail,privateKey:config.privateKey}),projectId:config.projectId});
  cached=firestoreSdk.getFirestore(app);return cached;
}
const codeOf=trip=>String(trip&&trip.code||'').trim().toUpperCase();
const safeId=value=>crypto.createHash('sha256').update(String(value)).digest('hex');

async function readCollection(db,name,limit=10000){const snapshot=await db.collection(name).orderBy('updated','asc').limit(limit).get();return snapshot.docs.map(doc=>doc.data().data).filter(Boolean)}
async function readTrips(config){return readCollection(getDb(config),'travel_trips')}
async function upsertTrips(config,trips){const db=getDb(config),unique=new Map();(trips||[]).forEach(trip=>{const code=codeOf(trip);if(code)unique.set(code,{...trip,code})});const rows=[...unique.values()];for(let start=0;start<rows.length;start+=400){const batch=db.batch();rows.slice(start,start+400).forEach(data=>batch.set(db.collection('travel_trips').doc(safeId(data.code)),{code:data.code,data,updated:data.updated||new Date().toISOString()},{merge:true}));await batch.commit()}return{saved:rows.length}}
async function readClients(config){return readCollection(getDb(config),'customers')}
async function upsertClient(config,client){const id=String(client&&client.id||'').trim(),name=String(client&&client.name||'').trim();if(!id||!name)throw new CloudStoreError('INVALID_CLIENT','客戶姓名或識別碼不完整。',400);await getDb(config).collection('customers').doc(safeId(id)).set({id,data:{...client,id,name},updated:client.updated||new Date().toISOString()},{merge:true});return{saved:1}}
async function deleteClient(config,id){const value=String(id||'').trim();if(!value)throw new CloudStoreError('INVALID_CLIENT','缺少客戶識別碼。',400);await getDb(config).collection('customers').doc(safeId(value)).delete();return{deleted:1}}
async function addSnapshot(config,type,data){const row={type,count:data.length,data,created_at:new Date().toISOString()};const ref=await getDb(config).collection('travel_backups').add(row);return{id:ref.id,...row}}
async function listType(config,type){const snap=await getDb(config).collection('travel_backups').where('type','==',type).get();return snap.docs.map(doc=>{const row=doc.data();return{id:doc.id,created_at:row.created_at,trip_count:type==='trips'?row.count:undefined,client_count:type==='crm'?row.count:undefined}}).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,3)}
async function createSnapshot(config){const trips=await readTrips(config);await addSnapshot(config,'trips',trips);return{tripCount:trips.length}}
const listSnapshots=config=>listType(config,'trips');
async function snapshot(config,id,type){const doc=await getDb(config).collection('travel_backups').doc(String(id||'')).get(),row=doc.exists?doc.data():null;if(!row||row.type!==type||!Array.isArray(row.data))throw new CloudStoreError('SNAPSHOT_NOT_FOUND','找不到指定的雲端備份。',404);return row.data}
async function clearCollection(db,name){for(;;){const snap=await db.collection(name).limit(400).get();if(snap.empty)break;const batch=db.batch();snap.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit()}}
async function restoreSnapshot(config,id){const trips=await snapshot(config,id,'trips'),db=getDb(config);await clearCollection(db,'travel_trips');await upsertTrips(config,trips);return{restored:trips.length,tripCount:trips.length}}
async function createClientSnapshot(config){const clients=await readClients(config);await addSnapshot(config,'crm',clients);return{clientCount:clients.length}}
const listClientSnapshots=config=>listType(config,'crm');
async function restoreClientSnapshot(config,id){const clients=await snapshot(config,id,'crm'),db=getDb(config);await clearCollection(db,'customers');for(const client of clients)await upsertClient(config,client);return{restored:clients.length,clients}}

module.exports={firebaseConfig,getDb,readTrips,upsertTrips,readClients,upsertClient,deleteClient,createSnapshot,listSnapshots,restoreSnapshot,createClientSnapshot,listClientSnapshots,restoreClientSnapshot};
