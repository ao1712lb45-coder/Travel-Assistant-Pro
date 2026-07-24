/* Travel Assistant Pro 2.2 - natural-language itinerary search assistant */
(function(global,factory){const api=factory(global);if(typeof module==='object'&&module.exports)module.exports=api;global.TravelSearchAssistant=api;})(typeof window!=='undefined'?window:globalThis,function(global){
  'use strict';
  const clean=value=>String(value||'').trim();
  const DEPARTURE_CITIES=['桃園','松山','台中','高雄'];
  function chineseNumber(value){const map={一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12};return map[value]||Number(value)||0}
  const monthToken='([一二兩三四五六七八九十]{1,2}|1[0-2]|0?[1-9])';
  const TAIWAN_HOLIDAYS={
    2026:[['元旦','2026-01-01','2026-01-01',['元旦','跨年','開國紀念日']],['農曆春節','2026-02-14','2026-02-22',['過年','春節','農曆年','農曆春節','新年假期']],['和平紀念日','2026-02-27','2026-03-01',['二二八','228','和平紀念日']],['兒童節及清明節','2026-04-03','2026-04-06',['兒童節','清明','清明節','清明連假']],['勞動節','2026-05-01','2026-05-03',['勞動節','五一勞動節']],['端午節','2026-06-19','2026-06-21',['端午','端午節','端午連假']],['中秋節及教師節','2026-09-25','2026-09-28',['中秋','中秋節','中秋連假','教師節']],['國慶日','2026-10-09','2026-10-11',['國慶','雙十','雙十節','國慶日']],['光復節','2026-10-24','2026-10-26',['光復節','台灣光復節']],['行憲紀念日','2026-12-25','2026-12-27',['行憲紀念日','聖誕節','耶誕節']]],
    2027:[['元旦','2027-01-01','2027-01-03',['元旦','跨年','開國紀念日']],['農曆春節','2027-02-05','2027-02-11',['過年','春節','農曆年','農曆春節','新年假期']],['和平紀念日','2027-02-27','2027-03-01',['二二八','228','和平紀念日']],['兒童節及清明節','2027-04-03','2027-04-06',['兒童節','清明','清明節','清明連假']],['勞動節','2027-04-30','2027-05-02',['勞動節','五一勞動節']],['端午節','2027-06-09','2027-06-09',['端午','端午節','端午連假']],['中秋節','2027-09-15','2027-09-15',['中秋','中秋節','中秋連假']],['教師節','2027-09-28','2027-09-28',['教師節']],['國慶日','2027-10-09','2027-10-11',['國慶','雙十','雙十節','國慶日']],['光復節','2027-10-23','2027-10-25',['光復節','台灣光復節']],['行憲紀念日','2027-12-24','2027-12-26',['行憲紀念日','聖誕節','耶誕節']]]
  };
  const EUROPE_TERMS=['歐洲','英國','英格蘭','蘇格蘭','倫敦','法國','巴黎','義大利','意大利','羅馬','米蘭','威尼斯','德國','慕尼黑','法蘭克福','瑞士','奧地利','維也納','荷蘭','比利時','盧森堡','西班牙','葡萄牙','希臘','捷克','匈牙利','波蘭','斯洛伐克','克羅埃西亞','斯洛維尼亞','塞爾維亞','羅馬尼亞','保加利亞','芬蘭','瑞典','挪威','丹麥','冰島','愛沙尼亞','拉脫維亞','立陶宛','中西歐','東歐','南歐','北歐','巴爾幹','德瑞法','英法','義瑞','西葡'];
  const DESTINATION_ALIASES={
    '東北':['東北','仙台','青森','秋田','山形','岩手','福島','藏王','奧入瀨','十和田','銀山溫泉','SDJ','AOJ','AXT','HNA'],
    '北海道':['北海道','札幌','函館','旭川','小樽','富良野','美瑛','SPK','CTS','HKD','AKJ'],
    '北陸':['北陸','富山','金澤','金沢','立山','黑部','白川鄉','合掌村','TOY','KMQ'],
    '關西':['關西','大阪','京都','奈良','神戶','和歌山','OSA','KIX','UKB'],
    '九州':['九州','福岡','熊本','鹿兒島','宮崎','長崎','大分','FUK','KMJ','KOJ'],
    '沖繩':['沖繩','琉球','那霸','OKA']
  };
  function monthSequence(start,end){const months=[];let current=start;for(let count=0;count<12&&current;count++){months.push(current);if(current===end)break;current=current===12?1:current+1}return months}
  const iso=(year,month,day)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  function explicitDateRange(source,now,preferredYear){
    const match=source.match(/(?:(20\d{2})[\/.\-])?(\d{1,2})[\/.](\d{1,2})\s*(?:-|~|～|至|到)\s*(?:(20\d{2})[\/.\-])?(\d{1,2})[\/.](\d{1,2})/);
    const natural=source.match(/(?:(20\d{2})\s*年)?(\d{1,2})\s*月\s*(\d{1,2})\s*日?\s*(?:-|~|～|至|到)\s*(?:(20\d{2})\s*年)?(?:(\d{1,2})\s*月)?\s*(\d{1,2})\s*日/);
    if(!match&&!natural)return null;
    const raw=match||natural,startMonth=Number(raw[2]),startDay=Number(raw[3]),endMonth=Number(raw[5]||startMonth),endDay=Number(raw[6]);
    let startYear=Number(raw[1]||preferredYear||now.getFullYear()),endYear=Number(raw[4]||startYear);
    if(!raw[1]&&!preferredYear&&iso(startYear,endMonth,endDay)<iso(now.getFullYear(),now.getMonth()+1,now.getDate()))startYear++;
    if(!raw[4])endYear=endMonth<startMonth?startYear+1:startYear;
    return {raw:raw[0],from:iso(startYear,startMonth,startDay),to:iso(endYear,endMonth,endDay)};
  }
  function monthPeriodRange(source,now,preferredYear){
    const pattern=new RegExp(`${monthToken}\\s*月\\s*(上旬|初|初旬|中旬|下旬|底|末)?\\s*(?:-|~|～|至|到)\\s*${monthToken}\\s*月\\s*(上旬|初|初旬|中旬|下旬|底|末)?`),match=source.match(pattern);
    if(!match)return null;
    const startMonth=chineseNumber(match[1]),startPeriod=match[2]||'',endMonth=chineseNumber(match[3]),endPeriod=match[4]||'';
    const startDay=/中旬/.test(startPeriod)?11:/下旬|底|末/.test(startPeriod)?21:1;
    let startYear=preferredYear||now.getFullYear(),endYear=endMonth<startMonth?startYear+1:startYear;
    const endDay=/上旬|初|初旬/.test(endPeriod)?10:/中旬/.test(endPeriod)?20:new Date(endYear,endMonth,0).getDate();
    if(!preferredYear&&iso(endYear,endMonth,endDay)<iso(now.getFullYear(),now.getMonth()+1,now.getDate())){startYear++;endYear++}
    return {raw:match[0],from:iso(startYear,startMonth,startDay),to:iso(endYear,endMonth,endDay)};
  }
  function resolveHoliday(source,now,preferredYear){const today=iso(now.getFullYear(),now.getMonth()+1,now.getDate()),matches=Object.values(TAIWAN_HOLIDAYS).flat().map(([name,from,to,aliases])=>({name,from,to,aliases})).filter(item=>(!preferredYear||Number(item.from.slice(0,4))===preferredYear)&&item.aliases.some(alias=>source.includes(alias))).sort((a,b)=>a.from.localeCompare(b.from));return matches.find(item=>preferredYear||item.to>=today)||matches[matches.length-1]||null}
  function parseSearchRequest(text,now=new Date()){
    const source=clean(text),explicitYear=(source.match(/(20\d{2})\s*年?/)||[])[1];
    const departureCity=DEPARTURE_CITIES.find(city=>new RegExp(`${city}(?:機場)?\\s*(?:出發|起飛)`).test(source))||'';
    const year=explicitYear?Number(explicitYear):source.includes('後年')?now.getFullYear()+2:source.includes('明年')?now.getFullYear()+1:source.includes('今年')?now.getFullYear():0;
    const rangePattern=new RegExp(`${monthToken}\\s*月?\\s*[-~～至到]\\s*${monthToken}\\s*月`),listPattern=new RegExp(`${monthToken}\\s*月?\\s*[、,，及和]\\s*${monthToken}\\s*月`),range=source.match(rangePattern),list=source.match(listPattern);
    let months=[];
    if(range)months=monthSequence(chineseNumber(range[1]),chineseNumber(range[2]));
    else if(list)months=[chineseNumber(list[1]),chineseNumber(list[2])];
    else months=[...source.matchAll(new RegExp(`${monthToken}\\s*月`,'g'))].map(match=>chineseNumber(match[1]));
    months=[...new Set(months.filter(value=>value>=1&&value<=12))];
    let month=months.length===1?months[0]:0;
    const customRange=explicitDateRange(source,now,year)||monthPeriodRange(source,now,year),holiday=customRange?null:resolveHoliday(source,now,year),dateRange=customRange?[customRange.from,customRange.to]:holiday?[holiday.from,holiday.to]:[];
    if(dateRange.length&&!months.length)months=monthSequence(Number(dateRange[0].slice(5,7)),Number(dateRange[1].slice(5,7)));
    month=months.length===1?months[0]:0;
    const resolvedYear=year||(dateRange.length?Number(dateRange[0].slice(0,4)):0);
    const period=customRange?'':/上旬|月初|初旬/.test(source)?'early':/中旬/.test(source)?'middle':/下旬|月底|月末/.test(source)?'late':'';
    const dayRange=period==='early'?[1,10]:period==='middle'?[11,20]:period==='late'?[21,31]:[];
    const holidayAliases=Object.values(TAIWAN_HOLIDAYS).flat().flatMap(item=>item[3]).sort((a,b)=>b.length-a.length).join('|');
    let keyword=source.replace(customRange&&customRange.raw||/(?!)/g,' ').replace(new RegExp(holidayAliases,'g'),' ').replace(new RegExp(`(?:${DEPARTURE_CITIES.join('|')})(?:機場)?\\s*(?:出發|起飛)`,'g'),' ').replace(/20\d{2}\s*年?/g,' ').replace(/今年|明年|後年/g,' ').replace(new RegExp(`${monthToken}\\s*月?\\s*[-~～至到]\\s*${monthToken}\\s*月`,'g'),' ').replace(new RegExp(`${monthToken}\\s*月?\\s*[、,，及和]\\s*${monthToken}\\s*月`,'g'),' ').replace(new RegExp(`${monthToken}\\s*月`,'g'),' ').replace(/上旬|月初|初旬|中旬|下旬|月底|月末/g,' ').replace(/之間出發|期間出發|出發/g,' ').replace(/給我|幫我|請幫我|搜尋|查詢|找出|找|所有|全部|有哪些|行程|團體|旅遊|的|團/g,' ').replace(/[~～，,。！？!?]/g,' ').replace(/\s+/g,' ').trim();
    keyword=keyword.replace(/^日本\s*(?=東北|北海道|北陸|關西|九州|沖繩)/,'').trim();
    return {raw:source,year:resolvedYear,month,months,period,dayRange,dateRange,holiday:holiday&&holiday.name||'',departureCity,keyword};
  }
  function tripText(trip){const matches=(trip.contentMatches||[]).flatMap(item=>[item.title,item.excerpt,...(item.attractions||[])]);return [trip.code,trip.title,trip.mainTitle,trip.subtitle,trip.destination,trip.raw,trip.fullContent,...(trip.highlights||[]),...matches].join(' ').toLowerCase()}
  function tripDates(trip){const values=[...clean(trip.dates).matchAll(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/g)].map(match=>({year:+match[1],month:+match[2],day:+match[3]}));if(!values.length){const code=clean(trip.code).toUpperCase().match(/^[A-Z]{3}\d{2}[A-Z0-9]{2}(\d{2})(\d{2})(\d{2})/);if(code)values.push({year:2000+Number(code[1]),month:Number(code[2]),day:Number(code[3])})}return values}
  function productKey(trip){const code=clean(trip.code).toUpperCase(),match=code.match(/^([A-Z]{3}\d{2}[A-Z0-9]{2})\d{6}(.*)$/),title=clean(trip.title||trip.mainTitle).replace(/\s+/g,'');return match?`${match[1]}|${match[2]}|${title}`:`${code}|${title}`}
  function dateStrings(trip){const values=[...clean(trip.dates).matchAll(/20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}/g)].map(match=>match[0].replace(/[.-]/g,'/'));if(!values.length){const match=clean(trip.code).toUpperCase().match(/^[A-Z]{3}\d{2}[A-Z0-9]{2}(\d{2})(\d{2})(\d{2})/);if(match)values.push(`20${match[1]}/${Number(match[2])}/${Number(match[3])}`)}return values}
  function mergeProducts(trips){const groups=new Map();(trips||[]).forEach(trip=>{const key=productKey(trip),existing=groups.get(key);if(!existing){groups.set(key,{...trip,dates:dateStrings(trip).join('、')||trip.dates||'',groupedDepartures:1});return}const dates=[...new Set([...dateStrings(existing),...dateStrings(trip)])].sort((a,b)=>new Date(a)-new Date(b)),price=value=>Number((clean(value).replace(/,/g,'').match(/\d{4,6}/)||[])[0])||Infinity;if(price(trip.price)<price(existing.price)){existing.price=trip.price;existing.url=trip.url||existing.url;existing.code=trip.code||existing.code}existing.dates=dates.join('、');existing.groupedDepartures+=1;if((trip.highlights||[]).length>(existing.highlights||[]).length)existing.highlights=trip.highlights;existing.raw=existing.raw||trip.raw;existing.fullContent=existing.fullContent||trip.fullContent});return [...groups.values()]}
  function searchTrips(trips,request){const keyword=clean(request.keyword).toLowerCase(),months=(request.months&&request.months.length?request.months:request.month?[request.month]:[]).map(Number),dayRange=request.dayRange||[],dateRange=request.dateRange||[],filtered=(trips||[]).filter(trip=>{const text=tripText(trip);if(keyword){const aliases=DESTINATION_ALIASES[request.keyword]||[],keywordMatch=keyword==='歐洲'?EUROPE_TERMS.some(term=>text.includes(term.toLowerCase())):aliases.length?aliases.some(term=>text.includes(term.toLowerCase())):text.includes(keyword);if(!keywordMatch)return false}if(request.departureCity&&!clean(trip.departureCity).includes(request.departureCity))return false;const dates=tripDates(trip);if(request.year&&dates.length&&!dates.some(date=>date.year===request.year))return false;if(months.length&&dates.length&&!dates.some(date=>(!request.year||date.year===request.year)&&months.includes(date.month)))return false;if(dayRange.length&&dates.length&&!dates.some(date=>(!request.year||date.year===request.year)&&(!months.length||months.includes(date.month))&&date.day>=dayRange[0]&&date.day<=dayRange[1]))return false;if(dateRange.length&&dates.length&&!dates.some(date=>{const value=`${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`;return value>=dateRange[0]&&value<=dateRange[1]}))return false;return true});return mergeProducts(filtered).sort((a,b)=>clean(a.dates).localeCompare(clean(b.dates))).slice(0,100)}
  function officialSearchPlan(request){
    const keywords=request.keyword==='歐洲'?['歐洲','德瑞法','義大利','北歐','東歐','南歐','西班牙']:[request.keyword].filter(Boolean);
    let dateFrom=(request.dateRange||[])[0]||'',dateTo=(request.dateRange||[])[1]||dateFrom;
    const months=(request.months||[]).map(Number).filter(Boolean);
    if(!dateFrom&&request.year&&months.length){const first=months[0],last=months[months.length-1];dateFrom=`${request.year}-${String(first).padStart(2,'0')}-01`;dateTo=`${request.year}-${String(last).padStart(2,'0')}-${new Date(request.year,last,0).getDate()}`}
    return {keywords,dateFrom,dateTo};
  }
  function install(){
    if(typeof document==='undefined'||document.getElementById('searchAssistantSection'))return;
    const panel=document.querySelector('.wrap > .panel'),dbSection=document.getElementById('syncBesttour')?.closest('.section');if(!panel||!dbSection)return;
    const section=document.createElement('section');section.id='searchAssistantSection';section.className='section';section.innerHTML=`<h2>行程搜尋助手 <span class="badge">免付費 AI</span></h2><div class="hint">直接輸入想找的月份與景點，例如「給我明年 1 月所有藏王樹冰的行程」。會搜尋目前瀏覽器的行程資料庫與已保存官網全文。</div><label style="margin-top:12px">想找什麼行程？</label><textarea id="assistantSearchInput" placeholder="例如：給我明年 1 月所有藏王樹冰的行程" style="min-height:90px"></textarea><div class="btnrow"><button class="primary" id="assistantSearchButton">搜尋行程</button><button id="assistantSelectAll">全選結果</button><button id="assistantClearSelection">取消全選</button></div><div id="assistantSearchStatus" class="status"></div><div id="assistantSearchResults" style="display:grid;gap:8px;margin-top:12px"></div><div class="btnrow"><button class="dark" id="assistantGenerateCopy">依勾選行程產生文案</button><button id="assistantSendToMarketing">送到行銷素材</button><button id="assistantCopyText">複製文案</button></div><textarea id="assistantCopyOutput" class="output" style="margin-top:10px;min-height:320px" placeholder="勾選行程後產生 LINE 社群文案"></textarea>`;panel.appendChild(section);
    const byId=id=>document.getElementById(id),status=(message,type='ok')=>{const box=byId('assistantSearchStatus');box.textContent=message;box.className='status show '+type};let results=[],materials=null;
    const database=()=>{try{return JSON.parse(localStorage.getItem('travelV10Db')||'[]')}catch(_){return[]}};
    const saveDatabase=trips=>{const map=new Map(database().map(trip=>[clean(trip.code).toUpperCase(),trip]));trips.forEach(trip=>{const code=clean(trip.code).toUpperCase();if(code)map.set(code,{...(map.get(code)||{}),...trip,code})});localStorage.setItem('travelV10Db',JSON.stringify([...map.values()]));global.renderDb?.()};
    async function fetchOfficial(request){const plan=officialSearchPlan(request),found=[];for(const keyword of plan.keywords){let page=1,totalPages=1;do{const params=new URLSearchParams({keyword,page:String(page),pageSize:'50'});if(plan.dateFrom)params.set('dateFrom',plan.dateFrom.replaceAll('-','/'));if(plan.dateTo)params.set('dateTo',plan.dateTo.replaceAll('-','/'));const response=await fetch('/api/besttour/search?'+params);const payload=await response.json();if(!response.ok||!payload.ok)break;found.push(...(payload.data.trips||[]));totalPages=Math.min(100,Number(payload.data.totalPages)||1);page++}while(page<=totalPages)}const unique=[...new Map(found.map(trip=>[clean(trip.code).toUpperCase(),trip])).values()];if(unique.length)saveDatabase(unique);return unique}
    const selected=()=>[...section.querySelectorAll('.assistant-trip:checked')].map(input=>results[Number(input.value)]).filter(Boolean);
    function render(){const box=byId('assistantSearchResults');box.innerHTML='';results.forEach((trip,index)=>{const label=document.createElement('label');label.className='dbitem';label.style.cssText='cursor:pointer;align-items:flex-start;border:1px solid #e2e8f0;border-radius:10px';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='assistant-trip';checkbox.value=String(index);checkbox.style.cssText='width:auto;margin-top:4px';const info=document.createElement('span'),title=document.createElement('b'),meta=document.createElement('small');title.textContent=`${trip.code||''}｜${trip.title||trip.mainTitle||'未命名行程'}`;title.style.display='block';meta.textContent=[trip.dates,trip.price,trip.airline,trip.groupedDepartures>1?`已合併 ${trip.groupedDepartures} 筆相同行程`:'' ].filter(Boolean).join('・');meta.style.cssText='display:block;color:#64748b;margin-top:4px';info.append(title,meta);label.append(checkbox,info);box.appendChild(label)})}
    byId('assistantSearchButton').onclick=async()=>{const button=byId('assistantSearchButton'),request=parseSearchRequest(byId('assistantSearchInput').value);if(!request.keyword&&!request.months.length&&!request.year){status('請輸入月份、年份或景點關鍵字。','warn');return}button.disabled=true;let supplemented=0;try{results=searchTrips(database(),request);if(!results.length&&request.keyword){status('共用資料庫沒有符合行程，正在補查 Besttour 官網…','warn');supplemented=(await fetchOfficial(request)).length;results=searchTrips(database(),request)}render();const monthLabel=request.months.length>1?`${request.months[0]}–${request.months[request.months.length-1]} 月 `:request.month?request.month+' 月 ':'';const periodLabel={early:'上旬 ',middle:'中旬 ',late:'下旬 '}[request.period]||'';const dateLabel=request.dateRange.length?`${request.holiday?request.holiday+' ':''}${request.dateRange[0]}～${request.dateRange[1]} `:`${request.year?request.year+' 年 ':''}${monthLabel}${periodLabel}`;status(`已辨識：${dateLabel}${request.keyword||'不限地區'}；找到 ${results.length} 個行程${supplemented?`（官網補入 ${supplemented} 團）`:''}。`,results.length?'ok':'warn')}catch(error){status(`官網補查失敗：${error.message}，請稍後再試。`,'warn')}finally{button.disabled=false}};
    byId('assistantSelectAll').onclick=()=>section.querySelectorAll('.assistant-trip').forEach(input=>input.checked=true);byId('assistantClearSelection').onclick=()=>section.querySelectorAll('.assistant-trip').forEach(input=>input.checked=false);
    byId('assistantGenerateCopy').onclick=()=>{const trips=selected();if(!trips.length){status('請先勾選至少一個行程。','warn');return}const items=trips.map(record=>({record})),options={contact:document.getElementById('contact')?.value.trim(),line:document.getElementById('line')?.value.trim()};materials=global.TravelBulkItineraryImport?.joinBatchMaterials(items,options);if(!materials){status('文案模組尚未載入，請重新整理頁面。','warn');return}byId('assistantCopyOutput').value=materials.lineOut;status(`已依照勾選的 ${trips.length} 個行程產生 LINE 社群文案。`)};
    byId('assistantSendToMarketing').onclick=()=>{if(!materials)byId('assistantGenerateCopy').click();if(!materials)return;Object.entries(materials).forEach(([id,value])=>{const field=document.getElementById(id);if(field)field.value=value});document.querySelector('.workspace-nav button[data-view="copy"]')?.click();};
    byId('assistantCopyText').onclick=()=>navigator.clipboard.writeText(byId('assistantCopyOutput').value).then(()=>status('文案已複製。')).catch(()=>status('瀏覽器未允許自動複製，請在文字框按 Ctrl+A、Ctrl+C。','warn'));
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return {parseSearchRequest,tripDates,productKey,mergeProducts,searchTrips,officialSearchPlan,install};
});
