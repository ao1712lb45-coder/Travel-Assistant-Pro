(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TravelCloudDatabase=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clean=value=>String(value||'').trim();
  function mergeTrips(cloud,local){
    const map=new Map();
    [...(cloud||[]),...(local||[])].forEach(trip=>{const code=clean(trip&&trip.code).toUpperCase();if(!code)return;const old=map.get(code),oldTime=Date.parse(old&&old.updated||0)||0,newTime=Date.parse(trip.updated||0)||0;if(!old||newTime>=oldTime)map.set(code,{...trip,code})});
    return [...map.values()];
  }
  const signature=trip=>JSON.stringify(trip);
  function changedTrips(trips,known){return (trips||[]).filter(trip=>clean(trip.code)&&known.get(clean(trip.code).toUpperCase())!==signature(trip))}
  function install(){
    if(typeof document==='undefined'||document.getElementById('cloudDatabasePanel'))return;
    const section=document.getElementById('syncBesttour')?.closest('.section');if(!section)return;
    const panel=document.createElement('div');panel.id='cloudDatabasePanel';panel.className='hint';panel.style.marginTop='10px';panel.innerHTML=`<b>Supabase 雲端資料庫</b><div id="cloudDatabaseStatus" class="small" style="margin-top:5px">正在確認連線…</div><div id="cloudSyncDetails" class="small" style="margin-top:4px">本機 —｜雲端 —｜待上傳 —｜最後同步 —</div><div id="cloudProgressWrap" style="margin-top:8px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px"><span id="cloudProgressStage">準備同步</span><b id="cloudProgressPercent">0%</b></div><div role="progressbar" aria-label="雲端同步進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="height:9px;margin-top:4px;background:#dce9e7;border-radius:999px;overflow:hidden"><div id="cloudProgressBar" style="width:0%;height:100%;background:linear-gradient(90deg,#12988d,#53c9b8);border-radius:999px;transition:width .25s ease"></div></div></div><div class="btnrow"><button id="cloudSyncNow" type="button">立即同步雲端</button><button id="cloudCreateSnapshot" type="button">建立雲端備份</button></div><div class="grid2" style="margin-top:8px"><select id="cloudSnapshotSelect" aria-label="選擇行程備份"><option value="">正在載入備份…</option></select><button id="cloudRestoreSnapshot" type="button">還原所選備份</button></div>`;
    section.querySelector('h2').insertAdjacentElement('afterend',panel);
    const byId=id=>document.getElementById(id),readLocal=()=>{try{const value=JSON.parse(localStorage.getItem('travelV10Db')||'[]');return Array.isArray(value)?value:[]}catch(_){return[]}},writeLocal=trips=>{localStorage.setItem('travelV10Db',JSON.stringify(trips));root.renderDb?.()};
    const known=new Map();let configured=false,busy=false;
    const setKnown=trips=>{known.clear();trips.forEach(trip=>known.set(clean(trip.code).toUpperCase(),signature(trip)))};
    const progress=(value,stage)=>{const percent=Math.max(0,Math.min(100,Math.round(value)));byId('cloudProgressBar').style.width=`${percent}%`;byId('cloudProgressPercent').textContent=`${percent}%`;byId('cloudProgressStage').textContent=stage;byId('cloudProgressWrap').querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(percent))};
    const details=(local,cloud,pending,last)=>{byId('cloudSyncDetails').textContent=`本機 ${Number(local||0).toLocaleString('zh-TW')}｜雲端 ${Number(cloud||0).toLocaleString('zh-TW')}｜待上傳 ${Number(pending||0).toLocaleString('zh-TW')}｜最後同步 ${last?new Date(last).toLocaleString('zh-TW'):'—'}`};
    async function json(url,options){const response=await fetch(url,{headers:{accept:'application/json','content-type':'application/json'},...options});const payload=await response.json();if(!response.ok||!payload.ok)throw new Error(payload.error?.message||'雲端同步失敗');return payload.data}
    async function upload(records){for(let index=0;index<records.length;index+=200){await json('/api/cloud/database/sync',{method:'POST',body:JSON.stringify({trips:records.slice(index,index+200)})});progress(60+Math.round(Math.min(index+200,records.length)/records.length*35),`正在上傳 ${Math.min(index+200,records.length).toLocaleString('zh-TW')} / ${records.length.toLocaleString('zh-TW')} 團`)}}
    async function syncNow(refreshCloud=true){
      if(busy)return;busy=true;progress(5,'正在連接 Supabase');byId('cloudDatabaseStatus').textContent='正在同步 Supabase…';
      try{
        let local=readLocal(),cloud=[];
        if(refreshCloud){progress(15,'正在下載雲端行程');const data=await json('/api/cloud/database');configured=data.configured;if(!configured){progress(0,'尚未連接雲端');byId('cloudDatabaseStatus').textContent='尚未設定 Supabase 連線；目前仍使用瀏覽器資料庫。';return}cloud=data.trips||[];progress(40,`正在合併並去除重複團號（雲端 ${cloud.length.toLocaleString('zh-TW')} 團）`);local=mergeTrips(cloud,local);writeLocal(local)}
        if(!configured)return;
        progress(55,'正在檢查新增與更新資料');const changed=changedTrips(local,known);details(local.length,cloud.length,changed.length,localStorage.getItem('travelCloudLastSync'));if(changed.length)await upload(changed);setKnown(local);const syncedAt=new Date().toISOString();localStorage.setItem('travelCloudLastSync',syncedAt);details(local.length,Math.max(cloud.length,local.length),0,syncedAt);progress(100,'同步完成');
        byId('cloudDatabaseStatus').textContent=`雲端連線正常｜共 ${local.length.toLocaleString('zh-TW')} 團｜${changed.length?`本次上傳 ${changed.length} 團`:'資料已是最新'}`;
      }catch(error){progress(0,'同步失敗');byId('cloudDatabaseStatus').textContent=`雲端同步失敗：${error.message}。本機資料仍保留。`}finally{busy=false}
    }
    byId('cloudSyncNow').onclick=()=>syncNow(true);
    async function loadSnapshots(){try{const data=await json('/api/cloud/database/snapshots'),rows=data.snapshots||[];byId('cloudSnapshotSelect').innerHTML='<option value="">選擇最近備份</option>'+rows.map(row=>`<option value="${row.id}">${new Date(row.created_at).toLocaleString('zh-TW')}｜${Number(row.trip_count||0).toLocaleString('zh-TW')} 團</option>`).join('')}catch(error){byId('cloudSnapshotSelect').innerHTML='<option value="">備份清單讀取失敗</option>'}}
    byId('cloudCreateSnapshot').onclick=async()=>{if(!configured)await syncNow(true);if(!configured)return;try{progress(10,'正在建立雲端備份');byId('cloudDatabaseStatus').textContent='正在建立雲端備份…';const data=await json('/api/cloud/database/snapshot',{method:'POST',body:'{}'});progress(100,'雲端備份完成');byId('cloudDatabaseStatus').textContent=`雲端備份完成，共 ${Number(data.tripCount||0).toLocaleString('zh-TW')} 團。`;await loadSnapshots()}catch(error){progress(0,'備份失敗');byId('cloudDatabaseStatus').textContent=`雲端備份失敗：${error.message}`}};
    byId('cloudRestoreSnapshot').onclick=async()=>{const id=byId('cloudSnapshotSelect').value;if(!id){byId('cloudDatabaseStatus').textContent='請先選擇要還原的備份。';return}if(prompt('還原會以備份內容取代目前雲端行程。請輸入「還原」確認：')!=='還原')return;try{progress(10,'正在還原雲端備份');const data=await json('/api/cloud/database/restore',{method:'POST',body:JSON.stringify({id:Number(id)})});progress(80,'正在下載還原結果');const restored=await json('/api/cloud/database'),trips=restored.trips||[];writeLocal(trips);setKnown(trips);const syncedAt=new Date().toISOString();localStorage.setItem('travelCloudLastSync',syncedAt);details(trips.length,trips.length,0,syncedAt);progress(100,'還原完成');byId('cloudDatabaseStatus').textContent=`備份還原完成，共 ${Number(data.tripCount||0).toLocaleString('zh-TW')} 團。`}catch(error){progress(0,'還原失敗');byId('cloudDatabaseStatus').textContent=`雲端備份還原失敗：${error.message}`}};
    details(readLocal().length,0,0,localStorage.getItem('travelCloudLastSync'));loadSnapshots();syncNow(true);setInterval(()=>syncNow(false),10000);setInterval(()=>syncNow(true),60000);
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return{mergeTrips,changedTrips,install};
});
