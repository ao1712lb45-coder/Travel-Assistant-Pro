/* Travel Assistant Pro 2.2 - bulk itinerary import */
(function(global,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;global.TravelBulkItineraryImport=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const clean=value=>String(value||'').trim();
  function parseBulkEntries(value){
    const matches=clean(value).match(/https?:\/\/[^\s,，;；]+|[A-Za-z]{3}\d{2}[A-Za-z0-9]{2}\d{6}[A-Za-z0-9]{0,6}/g)||[];
    return [...new Set(matches.map(item=>/^https?:/i.test(item)?item:item.toUpperCase()))].slice(0,50);
  }
  function recordFromResult(result,payload){
    const fields=payload.data.fields||{},url=fields.lowestPriceUrl||payload.data.finalUrl;
    return {url,code:result.code,days:result.days?`${result.days}日`:'',title:result.title,mainTitle:result.title,subtitle:result.subtitle,price:result.price,airline:result.airline,dates:(result.dates||[]).join('、'),highlights:result.highlights||[],raw:payload.data.text,updated:new Date().toISOString()};
  }
  function mergeRecords(database,records){
    const merged=[...(database||[])];
    records.forEach(record=>{const index=merged.findIndex(item=>(record.code&&item.code===record.code)||(!record.code&&(item.title||item.mainTitle)===(record.title||record.mainTitle)));if(index>=0)merged[index]={...merged[index],...record};else merged.unshift(record)});
    return merged;
  }
  function install(){
    if(typeof document==='undefined'||document.getElementById('bulkImportPanel'))return;
    const singleButton=document.getElementById('fetchBesttour'),url=document.getElementById('url');if(!singleButton||!url)return;
    const toggle=document.createElement('button');toggle.id='toggleBulkImport';toggle.type='button';toggle.textContent='批次匯入多團';singleButton.parentElement.appendChild(toggle);
    const panel=document.createElement('div');panel.id='bulkImportPanel';panel.style.display='none';panel.innerHTML=`<div class="hint" style="margin-top:10px"><b>批次匯入多團</b><br>每行貼一個團號或網址，也可用空格、逗號分隔；一次最多 50 團。成功資料會直接存入行程資料庫。</div><textarea id="bulkItineraryInput" placeholder="例如：\nASB07BR261226DW\nPUS05BX261002J\nhttps://www.besttour.com.tw/itinerary/FUK05BR261206FU" style="min-height:150px;margin-top:8px"></textarea><div class="btnrow"><button class="primary" id="runBulkImport">開始批次匯入</button><button id="clearBulkImport">清除</button></div><div id="bulkImportProgress" class="status"></div>`;
    document.getElementById('urlFetchStatus').insertAdjacentElement('afterend',panel);
    toggle.onclick=()=>{const open=panel.style.display==='none';panel.style.display=open?'block':'none';toggle.textContent=open?'收起批次匯入':'批次匯入多團'};
    document.getElementById('clearBulkImport').onclick=()=>{document.getElementById('bulkItineraryInput').value='';document.getElementById('bulkImportProgress').className='status'};
    document.getElementById('runBulkImport').onclick=async()=>{
      const entries=parseBulkEntries(document.getElementById('bulkItineraryInput').value),button=document.getElementById('runBulkImport'),status=document.getElementById('bulkImportProgress');
      if(!entries.length){status.textContent='請至少貼上一個有效團號或行程網址。';status.className='status show warn';return}
      button.disabled=true;const saved=[],failed=[];
      for(let index=0;index<entries.length;index++){
        status.textContent=`正在匯入 ${index+1} / ${entries.length}：${entries[index]}`;status.className='status show warn';
        try{const response=await fetch('/api/itinerary/fetch?url='+encodeURIComponent(entries[index]),{headers:{accept:'application/json'}});const payload=await response.json();if(!response.ok||!payload.ok)throw new Error(payload.error?.message||'官網讀取失敗');if(!global.TravelAssistantParser)throw new Error('解析模組尚未載入');const result=global.TravelAssistantParser.parse({url:payload.data.finalUrl,text:payload.data.text});if(!result.code||result.code!==payload.data.requestedCode)throw new Error('團號不一致');saved.push(recordFromResult(result,payload));}catch(error){failed.push(`${entries[index]}：${error.message}`)}
      }
      let database=[];try{database=JSON.parse(localStorage.getItem('travelV10Db')||'[]')}catch(_){}
      localStorage.setItem('travelV10Db',JSON.stringify(mergeRecords(database,saved)));global.renderDb?.();
      status.textContent=`批次匯入完成：成功 ${saved.length} 團，失敗 ${failed.length} 團。${failed.length?' 失敗項目：'+failed.join('；'):''}`;status.className='status show '+(failed.length?'warn':'ok');button.disabled=false;
    };
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return {parseBulkEntries,recordFromResult,mergeRecords,install};
});
