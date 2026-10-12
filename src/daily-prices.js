/* Travel Assistant Pro 2.2 - per-departure price viewer */
(function(global,factory){const api=factory(global);if(typeof module==='object'&&module.exports)module.exports=api;global.TravelDailyPrices=api})(typeof window!=='undefined'?window:globalThis,function(global){
  'use strict';
  const clean=value=>String(value||'').trim();
  function normalizeDepartures(values){
    const map=new Map();
    (values||[]).forEach(item=>{const date=clean(item&&item.date).replace(/-/g,'/'),price=Number(String(item&&item.price||'').replace(/,/g,''));if(!/^20\d{2}\/\d{2}\/\d{2}$/.test(date)||!price)return;const code=clean(item.code).toUpperCase(),key=`${date}|${code||price}`;map.set(key,{date,code,price,seats:Number(item.seats)||0})});
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.price-b.price);
  }
  function shortDate(value){const match=clean(value).match(/^20\d{2}\/(\d{2})\/(\d{2})$/);return match?`${Number(match[1])}/${Number(match[2])}`:clean(value)}
  function filterDeparturesByRange(values,from,to){
    const start=clean(from).replace(/-/g,'/'),end=clean(to).replace(/-/g,'/');
    return normalizeDepartures(values).filter(item=>(!start||item.date>=start)&&(!end||item.date<=end));
  }
  function departureSummary(values){
    const rows=normalizeDepartures(values),minimum=rows.length?Math.min(...rows.map(item=>item.price)):0;
    return{count:rows.length,minimum,price:minimum?`${minimum.toLocaleString('zh-TW')}元起`:'',dates:rows.map(item=>shortDate(item.date)).join('、')};
  }
  function dailyPriceRows(values){const rows=normalizeDepartures(values),minimum=rows.length?Math.min(...rows.map(item=>item.price)):0;return rows.map(item=>({...item,label:shortDate(item.date),priceLabel:`${item.price.toLocaleString('zh-TW')} 元`,lowest:item.price===minimum}))}
  function groupedPriceRows(values){const rows=dailyPriceRows(values),groups=new Map();rows.forEach(item=>{if(!groups.has(item.price))groups.set(item.price,{price:item.price,priceLabel:`${item.price.toLocaleString('zh-TW')}元`,dates:[],lowest:item.lowest});groups.get(item.price).dates.push(item.label)});return [...groups.values()].sort((a,b)=>a.price-b.price)}
  function marketingPriceText(values){const groups=groupedPriceRows(values);return groups.length?`\n\n💰 每日出發價格\n${groups.map(item=>`💰 ${item.priceLabel}${item.lowest?'（最低價）':''}｜${item.dates.join('、')}`).join('\n')}`:''}
  let allDepartures=[],departures=[],button=null,panel=null,rangeBox=null;
  function render(){const rows=dailyPriceRows(departures),groups=groupedPriceRows(departures);if(button&&panel){button.disabled=!rows.length;button.textContent=panel.hidden?`顯示每日價格${rows.length?`（${rows.length}）`:''}`:'隱藏每日價格';panel.innerHTML=groups.length?groups.map(item=>`<div class="daily-price-row"><b>${item.priceLabel}${item.lowest?' <em>最低價</em>':''}</b><span>${item.dates.join('、')}</span></div>`).join(''):'<div class="small">尚未取得每日價格，請先使用「自動抓取並解析」。</div>'}const option=document.getElementById('includeDailyPricesInCopy'),note=document.getElementById('dailyPricesCopyNote');if(option){option.disabled=!rows.length;if(!rows.length)option.checked=false}if(note)note.textContent=rows.length?`已取得 ${rows.length} 個出發日價格`:'請先自動抓取行程，取得每日價格'}
  function updateForm(rows,message,type){
    const summary=departureSummary(rows),price=document.getElementById('price'),dates=document.getElementById('dates'),priceProof=document.getElementById('proofPrice'),dateProof=document.getElementById('proofDates'),status=document.getElementById('departureRangeStatus');
    if(price)price.value=summary.price;if(dates)dates.value=summary.dates;
    if(priceProof)priceProof.textContent=`✅ 區間最低價 ${summary.price}（由 ${summary.count} 個出發日計算）`;
    if(dateProof)dateProof.textContent=`✅ 已保留區間內 ${summary.count} 個出發日期`;
    if(status){status.textContent=message;status.className=`departure-range-status ${type||'ok'}`}
    document.getElementById('generateCopy')?.click();
  }
  function applyRange(){
    const from=document.getElementById('departureRangeFrom')?.value||'',to=document.getElementById('departureRangeTo')?.value||'',status=document.getElementById('departureRangeStatus');
    if(from&&to&&from>to){if(status){status.textContent='開始日期不能晚於結束日期，資料未變更。';status.className='departure-range-status err'}return false}
    const filtered=filterDeparturesByRange(allDepartures,from,to);
    if(!filtered.length){if(status){status.textContent='此區間沒有可用出發日，原本日期與最低價未變更。';status.className='departure-range-status warn'}return false}
    departures=filtered;if(panel)panel.hidden=true;render();
    const label=from||to?`已套用 ${from||'最早'} 至 ${to||'最晚'}，最低價只依這個區間計算。`:'已恢復全部出發日期與全部日期的最低價。';
    updateForm(departures,label,'ok');return true;
  }
  function clearRange(){const from=document.getElementById('departureRangeFrom'),to=document.getElementById('departureRangeTo');if(from)from.value='';if(to)to.value='';return applyRange()}
  function setDepartures(values){allDepartures=normalizeDepartures(values);departures=allDepartures.slice();if(panel)panel.hidden=true;const from=document.getElementById('departureRangeFrom'),to=document.getElementById('departureRangeTo'),status=document.getElementById('departureRangeStatus');if(from)from.value='';if(to)to.value='';if(status){status.textContent=allDepartures.length?'請選擇需要的日期區間；最低價會跟著區間重新計算。':'請先自動抓取行程，取得可選日期。';status.className='departure-range-status'}render();return departures}
  function install(){if(typeof document==='undefined'||document.getElementById('toggleDailyPrices'))return;const proof=document.getElementById('proofPrice'),host=proof?.parentElement;if(!host)return;button=document.createElement('button');button.id='toggleDailyPrices';button.type='button';button.disabled=true;button.style.marginTop='8px';panel=document.createElement('div');panel.id='dailyPricePanel';panel.hidden=true;panel.className='hint';panel.style.marginTop='8px';button.onclick=()=>{panel.hidden=!panel.hidden;render()};host.append(button,panel);const proofDates=document.getElementById('proofDates');if(proofDates&&!document.getElementById('departureRangeBox')){rangeBox=document.createElement('div');rangeBox.id='departureRangeBox';rangeBox.className='departure-range-box';rangeBox.innerHTML='<b>需要的出發日期區間</b><div class="departure-range-grid"><label>開始日期<input id="departureRangeFrom" type="date"></label><label>結束日期<input id="departureRangeTo" type="date"></label></div><div class="departure-range-actions"><button id="applyDepartureRange" type="button" class="primary">套用區間</button><button id="clearDepartureRange" type="button">顯示全部日期</button></div><div id="departureRangeStatus" class="departure-range-status">請先自動抓取行程，取得可選日期。</div>';proofDates.insertAdjacentElement('afterend',rangeBox);document.getElementById('applyDepartureRange').onclick=applyRange;document.getElementById('clearDepartureRange').onclick=clearRange}const copySection=document.querySelector('[data-tab="lineOut"]')?.closest('.section'),tabs=copySection?.querySelector('.tabs');if(copySection&&tabs&&!document.getElementById('includeDailyPricesInCopy')){const option=document.createElement('label');option.className='daily-price-copy-option';option.innerHTML='<input id="includeDailyPricesInCopy" type="checkbox"> <span><b>在文案顯示每日價格</b><small id="dailyPricesCopyNote">請先自動抓取行程，取得每日價格</small></span>';tabs.before(option);option.querySelector('input').addEventListener('change',()=>document.getElementById('generateCopy')?.click())}const style=document.createElement('style');style.textContent='.daily-price-row{display:flex;justify-content:space-between;gap:12px;padding:7px 2px;border-bottom:1px solid #dce9e7}.daily-price-row:last-child{border-bottom:0}.daily-price-row em{font-style:normal;font-size:11px;color:#087a55;background:#e7f8f2;padding:2px 6px;border-radius:999px}.departure-range-box{margin-top:12px;padding:12px;border:1px solid #cfe3df;border-radius:12px;background:#f4faf8}.departure-range-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.departure-range-grid label{font-size:13px}.departure-range-grid input{margin-top:4px}.departure-range-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.departure-range-status{margin-top:8px;font-size:12px;color:#607773}.departure-range-status.ok{color:#087a55}.departure-range-status.warn,.departure-range-status.err{color:#b85b00}@media(max-width:640px){.departure-range-grid{grid-template-columns:1fr}}.daily-price-copy-option{display:flex;align-items:center;gap:9px;margin:10px 0;padding:10px 12px;border:1px solid #cfe3df;border-radius:12px;background:#f4faf8;cursor:pointer}.daily-price-copy-option input{width:18px;height:18px}.daily-price-copy-option span{display:flex;flex-direction:column;gap:2px}.daily-price-copy-option small{color:#607773}';document.head.appendChild(style);render()}
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  function getDepartures(){return departures.slice()}
  return{normalizeDepartures,shortDate,filterDeparturesByRange,departureSummary,dailyPriceRows,groupedPriceRows,marketingPriceText,setDepartures,getDepartures,applyRange,clearRange,install};
});
