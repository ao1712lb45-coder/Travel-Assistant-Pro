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
    const panel=document.createElement('div');panel.id='cloudDatabasePanel';panel.className='hint';panel.style.marginTop='10px';panel.innerHTML=`<b>Supabase 雲端資料庫</b><div id="cloudDatabaseStatus" class="small" style="margin-top:5px">正在確認連線…</div><div class="btnrow"><button id="cloudSyncNow" type="button">立即同步雲端</button><button id="cloudCreateSnapshot" type="button">建立雲端備份</button></div>`;
    section.querySelector('h2').insertAdjacentElement('afterend',panel);
    const byId=id=>document.getElementById(id),readLocal=()=>{try{const value=JSON.parse(localStorage.getItem('travelV10Db')||'[]');return Array.isArray(value)?value:[]}catch(_){return[]}},writeLocal=trips=>{localStorage.setItem('travelV10Db',JSON.stringify(trips));root.renderDb?.()};
    const known=new Map();let configured=false,busy=false;
    const setKnown=trips=>{known.clear();trips.forEach(trip=>known.set(clean(trip.code).toUpperCase(),signature(trip)))};
    async function json(url,options){const response=await fetch(url,{headers:{accept:'application/json','content-type':'application/json'},...options});const payload=await response.json();if(!response.ok||!payload.ok)throw new Error(payload.error?.message||'雲端同步失敗');return payload.data}
    async function upload(records){for(let index=0;index<records.length;index+=200)await json('/api/cloud/database/sync',{method:'POST',body:JSON.stringify({trips:records.slice(index,index+200)})})}
    async function syncNow(refreshCloud=true){
      if(busy)return;busy=true;byId('cloudDatabaseStatus').textContent='正在同步 Supabase…';
      try{
        let local=readLocal(),cloud=[];
        if(refreshCloud){const data=await json('/api/cloud/database');configured=data.configured;if(!configured){byId('cloudDatabaseStatus').textContent='尚未設定 Supabase 連線；目前仍使用瀏覽器資料庫。';return}cloud=data.trips||[];local=mergeTrips(cloud,local);writeLocal(local)}
        if(!configured)return;
        const changed=changedTrips(local,known);if(changed.length)await upload(changed);setKnown(local);
        byId('cloudDatabaseStatus').textContent=`雲端連線正常｜共 ${local.length.toLocaleString('zh-TW')} 團｜${changed.length?`本次上傳 ${changed.length} 團`:'資料已是最新'}`;
      }catch(error){byId('cloudDatabaseStatus').textContent=`雲端同步失敗：${error.message}。本機資料仍保留。`}finally{busy=false}
    }
    byId('cloudSyncNow').onclick=()=>syncNow(true);
    byId('cloudCreateSnapshot').onclick=async()=>{if(!configured)await syncNow(true);if(!configured)return;try{byId('cloudDatabaseStatus').textContent='正在建立雲端備份…';const data=await json('/api/cloud/database/snapshot',{method:'POST',body:'{}'});byId('cloudDatabaseStatus').textContent=`雲端備份完成，共 ${Number(data.tripCount||0).toLocaleString('zh-TW')} 團。`}catch(error){byId('cloudDatabaseStatus').textContent=`雲端備份失敗：${error.message}`}};
    syncNow(true);setInterval(()=>syncNow(false),10000);setInterval(()=>syncNow(true),60000);
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return{mergeTrips,changedTrips,install};
});
