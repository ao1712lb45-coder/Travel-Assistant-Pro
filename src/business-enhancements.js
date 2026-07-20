/* Travel Assistant Pro 2.1 - database dashboard, change tracking and CRM follow-up */
(function (global, factory) {
  const api = factory(global);
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.TravelBusinessEnhancements = api;
})(typeof window !== 'undefined' ? window : globalThis, function (global) {
  'use strict';
  const priceNumber = value => Number((String(value || '').replace(/,/g, '').match(/\d{4,6}/) || [0])[0]);
  const dateValues = trip => [...String(trip && trip.dates || '').matchAll(/20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/g)].map(match => new Date(match[0].replace(/[.\/]/g, '-'))).filter(date => !Number.isNaN(date.getTime()));
  function analyzeChanges(before, after) {
    const previous = new Map((before || []).map(trip => [trip.code, trip])), added=[], priceDown=[], priceUp=[], changed=[];
    (after || []).forEach(trip => {
      const old = previous.get(trip.code); if (!old) { added.push(trip); return; }
      const oldPrice=priceNumber(old.price), newPrice=priceNumber(trip.price);
      if (oldPrice && newPrice && newPrice < oldPrice) priceDown.push({trip,oldPrice,newPrice});
      if (oldPrice && newPrice && newPrice > oldPrice) priceUp.push({trip,oldPrice,newPrice});
      if (String(old.dates||'') !== String(trip.dates||'') || String(old.airline||'') !== String(trip.airline||'') || Number(old.seats||0) !== Number(trip.seats||0)) changed.push(trip);
    });
    return { added, priceDown, priceUp, changed };
  }
  function isExpired(trip, today = new Date()) {
    const dates=dateValues(trip); if (!dates.length) return false;
    const start=new Date(today.getFullYear(),today.getMonth(),today.getDate());
    return dates.every(date => date < start);
  }
  function dashboardStats(database, today = new Date()) {
    const list=database||[], expired=list.filter(trip=>isExpired(trip,today));
    return { total:list.length, expired:expired.length, active:list.length-expired.length, lowSeats:list.filter(trip=>Number(trip.seats)>0&&Number(trip.seats)<=5).length,
      latestDate:list.flatMap(dateValues).sort((a,b)=>b-a)[0] || null };
  }
  function install() {
    if (typeof document === 'undefined') return;
    const dbSection=document.getElementById('syncBesttour')?.closest('.section');
    if (!dbSection || document.getElementById('databaseDashboard')) return;
    const readDb=()=>{try{return JSON.parse(localStorage.getItem('travelV10Db')||'[]')}catch(_){return[]}};
    const dashboard=document.createElement('div');dashboard.id='databaseDashboard';dashboard.innerHTML=`<div class="db-dashboard"><div class="db-stat"><b id="dashTotal">0</b><span>資料庫總團數</span></div><div class="db-stat"><b id="dashActive">0</b><span>未過期行程</span></div><div class="db-stat"><b id="dashLowSeats">0</b><span>剩餘 5 席內</span></div><div class="db-stat"><b id="dashExpired">0</b><span>已過期</span></div><div class="db-stat"><b id="dashLatest">—</b><span>最晚出發日</span></div></div><div class="hint" style="margin-top:10px"><b>最近異動</b><div id="databaseChanges" style="margin-top:6px">尚無同步異動紀錄。</div><div class="btnrow"><button id="cleanupExpiredTrips">清除已過期行程</button><button id="clearChangeLog">清除異動紀錄</button></div><div class="small" id="lastDatabaseSync"></div></div>`;
    dbSection.querySelector('h2').insertAdjacentElement('afterend',dashboard);
    function render() {
      const stats=dashboardStats(readDb());
      document.getElementById('dashTotal').textContent=stats.total;document.getElementById('dashActive').textContent=stats.active;document.getElementById('dashLowSeats').textContent=stats.lowSeats;document.getElementById('dashExpired').textContent=stats.expired;
      document.getElementById('dashLatest').textContent=stats.latestDate?stats.latestDate.toLocaleDateString('zh-TW'):'—';
      const meta=JSON.parse(localStorage.getItem('travelDatabaseSyncMeta')||'null');document.getElementById('lastDatabaseSync').textContent=meta?`上次同步：${new Date(meta.at).toLocaleString('zh-TW')}｜新增 ${meta.added}、降價 ${meta.priceDown}、漲價 ${meta.priceUp}、其他異動 ${meta.changed}`:'尚未記錄同步時間。';
      const logs=JSON.parse(localStorage.getItem('travelDatabaseChanges')||'[]');document.getElementById('databaseChanges').innerHTML=logs.length?logs.slice(0,30).map(log=>`<div class="change-row ${log.type}"><span>${log.label}</span><b>${log.code||''}</b><span>${log.detail||''}</span></div>`).join(''):'尚無同步異動紀錄。';
    }
    document.getElementById('cleanupExpiredTrips').onclick=()=>{const db=readDb(),kept=db.filter(trip=>!isExpired(trip));if(confirm(`確定清除 ${db.length-kept.length} 個已過期行程？`)){localStorage.setItem('travelV10Db',JSON.stringify(kept));global.renderDb?.();render()}};
    document.getElementById('clearChangeLog').onclick=()=>{localStorage.removeItem('travelDatabaseChanges');render()};
    let before=null;
    const start=()=>{if(!before)before=readDb()};
    document.getElementById('syncBesttour')?.addEventListener('click',start,true);document.getElementById('syncAllBesttour')?.addEventListener('click',start,true);
    const status=document.getElementById('syncStatus');
    new MutationObserver(()=>{if(!before||!/同步完成/.test(status.textContent))return;const changes=analyzeChanges(before,readDb()),logs=[];
      changes.added.forEach(trip=>logs.push({type:'new',label:'新上架',code:trip.code,detail:trip.title||trip.mainTitle||''}));
      changes.priceDown.forEach(item=>logs.push({type:'down',label:'降價',code:item.trip.code,detail:`${item.oldPrice.toLocaleString()} → ${item.newPrice.toLocaleString()}`}));
      changes.priceUp.forEach(item=>logs.push({type:'up',label:'漲價',code:item.trip.code,detail:`${item.oldPrice.toLocaleString()} → ${item.newPrice.toLocaleString()}`}));
      changes.changed.forEach(trip=>logs.push({type:'changed',label:'資料異動',code:trip.code,detail:'日期、航空或機位有更新'}));
      localStorage.setItem('travelDatabaseChanges',JSON.stringify([...logs,...JSON.parse(localStorage.getItem('travelDatabaseChanges')||'[]')].slice(0,100)));
      localStorage.setItem('travelDatabaseSyncMeta',JSON.stringify({at:new Date().toISOString(),added:changes.added.length,priceDown:changes.priceDown.length,priceUp:changes.priceUp.length,changed:changes.changed.length}));before=null;render();
    }).observe(status,{childList:true,subtree:true,characterData:true});
    render(); installCrmTracking(readDb);
    const style=document.createElement('style');style.textContent=`.db-dashboard{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:10px 0}.db-stat{padding:10px;border:1px solid #dbeae9;border-radius:12px;background:#f5faf9}.db-stat b{display:block;font-size:20px;color:#07645f}.db-stat span{font-size:11px;color:#64777a}.change-row{display:grid;grid-template-columns:62px 135px 1fr;gap:7px;padding:5px 0;border-bottom:1px solid #e7efef;font-size:12px}.change-row.down{color:#087a55}.change-row.up{color:#b42318}.change-row.new{color:#07645f}@media(max-width:700px){.db-dashboard{grid-template-columns:repeat(2,1fr)}.change-row{grid-template-columns:55px 1fr}.change-row span:last-child{grid-column:1/-1}.section>.hint,.section details{max-height:none}.grid3{grid-template-columns:1fr}.btnrow button{padding:8px 10px;font-size:12px}}`;
    document.head.appendChild(style);
  }
  function installCrmTracking(readDb) {
    const section=document.getElementById('crmSection');if(!section||document.getElementById('crmTracking'))return;
    const box=document.createElement('div');box.id='crmTracking';box.innerHTML=`<hr style="border:0;border-top:1px solid #edf1f6;margin:16px 0"><h3>客戶追蹤與自動重新配對</h3><div class="grid2"><div><label>目前狀態</label><select id="crmStage"><option>詢問中</option><option>考慮中</option><option>已報名</option><option>暫緩</option></select></div><div><label>下次追蹤日</label><input id="crmFollowUp" type="date"></div></div><label style="margin-top:10px">已推薦團號</label><input id="crmRecommended" placeholder="例如：PUS05BX261002J、FUK05BR261206FU"><div class="btnrow"><button id="crmRematchAll">重新配對所有客戶</button></div><div id="crmTrackingList" class="hint" style="margin-top:10px"></div>`;section.appendChild(box);
    const key='travelAssistantV2Clients',load=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return[]}},save=list=>localStorage.setItem(key,JSON.stringify(list));
    const render=()=>{const list=load();document.getElementById('crmTrackingList').innerHTML=list.length?list.map(client=>`<div class="dbitem"><div><b>${client.name}</b><div class="dbmeta">${client.stage||'詢問中'}｜下次追蹤：${client.followUp||'未設定'}｜已推薦：${client.recommended||'尚無'}</div>${client.suggestions?.length?`<div class="small" style="color:#087a55">新配對：${client.suggestions.join('、')}</div>`:''}</div></div>`).join(''):'尚未建立客戶。'};
    document.getElementById('crmSave')?.addEventListener('click',()=>setTimeout(()=>{const name=document.getElementById('crmName').value.trim(),list=load(),index=list.findIndex(client=>client.name===name);if(index>=0){list[index]={...list[index],stage:document.getElementById('crmStage').value,followUp:document.getElementById('crmFollowUp').value,recommended:document.getElementById('crmRecommended').value.trim()};save(list);render()}},0));
    document.getElementById('crmRematchAll').onclick=()=>{const db=readDb(),crm=global.TravelCRM,list=load().map(client=>({...client,suggestions:db.map(trip=>({trip,score:crm.scoreTrip(client,trip).score,suitable:crm.scoreTrip(client,trip).suitable})).filter(item=>item.suitable).sort((a,b)=>b.score-a.score).slice(0,3).map(item=>item.trip.code)}));save(list);render()};render();
  }
  if (typeof document !== 'undefined') { if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install(); }
  return { priceNumber, dateValues, analyzeChanges, isExpired, dashboardStats, install };
});
