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
  function withTimeout(promise,milliseconds,onTimeout){
    let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{onTimeout?.();const error=new Error(`等待超過 ${Math.round(milliseconds/1000)} 秒`);error.name='TimeoutError';reject(error)},milliseconds)});
    return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
  }
  function validateParsedResult(result){
    const missing=[];if(!result?.confidence?.title)missing.push('行程名稱');if(!result?.confidence?.price)missing.push('售價');if(!result?.confidence?.dates)missing.push('出發日期');
    if(missing.length)throw new Error(`官網尚未提供完整行程（缺少${missing.join('、')}）`);return result;
  }
  function install(){
    if(typeof document==='undefined'||document.getElementById('bulkImportPanel'))return;
    const singleButton=document.getElementById('fetchBesttour'),url=document.getElementById('url');if(!singleButton||!url)return;
    const codeInput=document.getElementById('tourCodeInput'),codeHost=codeInput?.parentElement;
    if(codeInput&&codeHost){
      const firstRow=document.createElement('div');firstRow.className='tour-code-row';codeHost.insertBefore(firstRow,codeInput);firstRow.appendChild(codeInput);
      const addCode=document.createElement('button');addCode.id='addTourCodeField';addCode.type='button';addCode.textContent='＋ 增加團號欄位';firstRow.appendChild(addCode);
      const extraCodes=document.createElement('div');extraCodes.id='extraTourCodeFields';codeHost.appendChild(extraCodes);
      const addField=()=>{const count=1+extraCodes.querySelectorAll('.extra-tour-code').length;if(count>=7)return;const row=document.createElement('div');row.className='tour-code-row';row.innerHTML=`<input class="extra-tour-code" aria-label="團號 ${count+1}" placeholder="團號 ${count+1}"><button type="button" class="remove-tour-code">移除</button>`;const input=row.querySelector('input');input.oninput=()=>{input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'')};row.querySelector('button').onclick=()=>{row.remove();addCode.disabled=false};extraCodes.appendChild(row);addCode.disabled=1+extraCodes.querySelectorAll('.extra-tour-code').length>=7};
      addCode.onclick=addField;addField();
      const style=document.createElement('style');style.textContent=`.tour-code-row{display:flex;gap:7px;align-items:center;margin-bottom:7px}.tour-code-row input{flex:1;min-width:0}.tour-code-row button{white-space:nowrap}.remove-tour-code{padding:9px 10px}@media(max-width:600px){.tour-code-row{align-items:stretch;flex-wrap:wrap}.tour-code-row input{flex:1 1 180px}}`;document.head.appendChild(style);
    }
    const toggle=document.createElement('button');toggle.id='toggleBulkImport';toggle.type='button';toggle.textContent='批次匯入多團';singleButton.parentElement.appendChild(toggle);
    const panel=document.createElement('div');panel.id='bulkImportPanel';panel.style.display='none';panel.innerHTML=`<div class="hint" style="margin-top:10px"><b>批次匯入多團</b><br>每行貼一個團號或網址，也可用空格、逗號分隔；一次最多 50 團。成功資料會直接存入行程資料庫。</div><textarea id="bulkItineraryInput" placeholder="例如：\nASB07BR261226DW\nPUS05BX261002J\nhttps://www.besttour.com.tw/itinerary/FUK05BR261206FU" style="min-height:150px;margin-top:8px"></textarea><div class="btnrow"><button class="primary" id="runBulkImport">開始批次匯入</button><button id="stopBulkImport" disabled>停止匯入</button><button id="clearBulkImport">清除</button></div><div id="bulkProgressBox" style="display:none;margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700"><span id="bulkProgressLabel">準備匯入…</span><span id="bulkProgressPercent">0%</span></div><progress id="bulkProgressBar" value="0" max="100" style="width:100%;height:16px;margin-top:6px"></progress></div><div id="bulkImportProgress" class="status"></div><div id="bulkImportedResults" style="display:grid;gap:8px;margin-top:10px"></div>`;
    document.getElementById('urlFetchStatus').insertAdjacentElement('afterend',panel);
    toggle.onclick=()=>{const open=panel.style.display==='none';panel.style.display=open?'block':'none';toggle.textContent=open?'收起批次匯入':'批次匯入多團'};
    let activeController=null,stopped=false;
    const applyRecord=record=>{const values={url:record.url,tourCodeInput:record.code,code:record.code,days:record.days,mainTitle:record.mainTitle||record.title,subtitle:record.subtitle,price:record.price,airline:record.airline,dates:record.dates,highlights:(record.highlights||[]).join('\n'),rawText:record.raw};Object.entries(values).forEach(([id,value])=>{const field=document.getElementById(id);if(field)field.value=value||''});document.getElementById('generateCopy')?.click()};
    const renderImported=records=>{const box=document.getElementById('bulkImportedResults');box.innerHTML='';records.forEach(record=>{const row=document.createElement('div');row.className='dbitem';const info=document.createElement('div'),heading=document.createElement('b'),meta=document.createElement('div');heading.textContent=`${record.code}｜${record.title}`;meta.className='dbmeta';meta.textContent=[record.dates,record.price,record.airline].filter(Boolean).join('・');info.append(heading,meta);const button=document.createElement('button');button.type='button';button.textContent='載入並產生文案';button.onclick=()=>{applyRecord(record);document.getElementById('bulkImportProgress').textContent=`已載入 ${record.code} 並產生文案，請按「下一步」查看。`;document.getElementById('bulkImportProgress').className='status show ok'};row.append(info,button);box.appendChild(row)})};
    document.getElementById('stopBulkImport').onclick=()=>{stopped=true;activeController?.abort()};
    document.getElementById('clearBulkImport').onclick=()=>{document.getElementById('bulkItineraryInput').value='';document.getElementById('bulkImportProgress').className='status';document.getElementById('bulkProgressBox').style.display='none';document.getElementById('bulkImportedResults').innerHTML=''};
    document.getElementById('runBulkImport').onclick=async()=>{
      const entries=parseBulkEntries(document.getElementById('bulkItineraryInput').value),button=document.getElementById('runBulkImport'),stopButton=document.getElementById('stopBulkImport'),status=document.getElementById('bulkImportProgress'),progressBox=document.getElementById('bulkProgressBox'),progressBar=document.getElementById('bulkProgressBar'),progressLabel=document.getElementById('bulkProgressLabel'),progressPercent=document.getElementById('bulkProgressPercent');
      if(!entries.length){status.textContent='請至少貼上一個有效團號或行程網址。';status.className='status show warn';return}
      button.disabled=true;stopButton.disabled=false;stopped=false;progressBox.style.display='block';progressBar.value=0;progressPercent.textContent='0%';const saved=[],failed=[];
      for(let index=0;index<entries.length;index++){
        if(stopped)break;const started=Date.now();progressLabel.textContent=`正在匯入 ${index+1} / ${entries.length}：${entries[index]}（等待 0 / 20 秒）`;status.textContent=`已完成 ${index} / ${entries.length} 團`;status.className='status show warn';const ticker=setInterval(()=>{progressLabel.textContent=`正在匯入 ${index+1} / ${entries.length}：${entries[index]}（等待 ${Math.min(20,Math.floor((Date.now()-started)/1000))} / 20 秒）`},1000);activeController=new AbortController();
        try{const task=(async()=>{const response=await fetch('/api/itinerary/fetch?url='+encodeURIComponent(entries[index]),{headers:{accept:'application/json'},signal:activeController.signal});const payload=await response.json();if(!response.ok||!payload.ok)throw new Error(payload.error?.message||'官網讀取失敗');if(!global.TravelAssistantParser)throw new Error('解析模組尚未載入');const result=validateParsedResult(global.TravelAssistantParser.parse({url:payload.data.finalUrl,text:payload.data.text}));if(!result.code||result.code!==payload.data.requestedCode)throw new Error('團號不一致');return recordFromResult(result,payload)})();saved.push(await withTimeout(task,20000,()=>activeController?.abort()));}catch(error){failed.push(`${entries[index]}：${stopped?'已停止':error.name==='AbortError'||error.name==='TimeoutError'?'等待超過 20 秒':error.message}`)}finally{clearInterval(ticker);activeController=null}
        const percent=Math.round(((index+1)/entries.length)*100);progressBar.value=percent;progressPercent.textContent=`${percent}%`;
      }
      let database=[];try{database=JSON.parse(localStorage.getItem('travelV10Db')||'[]')}catch(_){}
      localStorage.setItem('travelV10Db',JSON.stringify(mergeRecords(database,saved)));global.renderDb?.();
      const completed=saved.length+failed.length;progressLabel.textContent=stopped?`已停止，共處理 ${completed} / ${entries.length} 團`:`匯入完成，共處理 ${entries.length} 團`;status.textContent=`${stopped?'批次匯入已停止':'批次匯入完成'}：成功 ${saved.length} 團，失敗 ${failed.length} 團。${failed.length?' 失敗項目：'+failed.join('；'):''}`;status.className='status show '+(failed.length||stopped?'warn':'ok');button.disabled=false;stopButton.disabled=true;
      renderImported(saved);if(saved.length){applyRecord(saved[0]);status.textContent+=` 已自動載入 ${saved[0].code} 並產生文案，請按「下一步」查看。`}
    };
    singleButton.addEventListener('click',event=>{const codes=[codeInput?.value,...document.querySelectorAll('.extra-tour-code')].map(item=>clean(item&&item.value!==undefined?item.value:item)).filter(Boolean);if(codes.length<=1)return;event.preventDefault();event.stopImmediatePropagation();document.getElementById('bulkItineraryInput').value=codes.join('\n');panel.style.display='block';toggle.textContent='收起批次匯入';document.getElementById('runBulkImport').click()},true);
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return {parseBulkEntries,recordFromResult,mergeRecords,withTimeout,validateParsedResult,install};
});
