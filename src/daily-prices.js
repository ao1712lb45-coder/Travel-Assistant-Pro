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
  function dailyPriceRows(values){const rows=normalizeDepartures(values),minimum=rows.length?Math.min(...rows.map(item=>item.price)):0;return rows.map(item=>({...item,label:shortDate(item.date),priceLabel:`${item.price.toLocaleString('zh-TW')} 元`,lowest:item.price===minimum}))}
  let departures=[],button=null,panel=null;
  function render(){if(!button||!panel)return;const rows=dailyPriceRows(departures);button.disabled=!rows.length;button.textContent=panel.hidden?`顯示每日價格${rows.length?`（${rows.length}）`:''}`:'隱藏每日價格';panel.innerHTML=rows.length?rows.map(item=>`<div class="daily-price-row"><b>${item.label}</b><span>${item.priceLabel}${item.lowest?' <em>最低價</em>':''}</span></div>`).join(''):'<div class="small">尚未取得每日價格，請先使用「自動抓取並解析」。</div>'}
  function setDepartures(values){departures=normalizeDepartures(values);if(panel)panel.hidden=true;render();return departures}
  function install(){if(typeof document==='undefined'||document.getElementById('toggleDailyPrices'))return;const proof=document.getElementById('proofPrice'),host=proof?.parentElement;if(!host)return;button=document.createElement('button');button.id='toggleDailyPrices';button.type='button';button.disabled=true;button.style.marginTop='8px';panel=document.createElement('div');panel.id='dailyPricePanel';panel.hidden=true;panel.className='hint';panel.style.marginTop='8px';button.onclick=()=>{panel.hidden=!panel.hidden;render()};host.append(button,panel);const style=document.createElement('style');style.textContent='.daily-price-row{display:flex;justify-content:space-between;gap:12px;padding:7px 2px;border-bottom:1px solid #dce9e7}.daily-price-row:last-child{border-bottom:0}.daily-price-row em{font-style:normal;font-size:11px;color:#087a55;background:#e7f8f2;padding:2px 6px;border-radius:999px}';document.head.appendChild(style);render()}
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return{normalizeDepartures,shortDate,dailyPriceRows,setDepartures,install};
});
