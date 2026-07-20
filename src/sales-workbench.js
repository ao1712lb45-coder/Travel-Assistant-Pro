(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TravelSalesWorkbench = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DESTINATIONS = ['日本','北海道','東京','大阪','九州','沖繩','韓國','首爾','釜山','濟州島','東南亞','泰國','曼谷','清邁','普吉島','越南','峴港','河內','富國島','新加坡','馬來西亞','中西歐','北歐','南歐','東歐','美加','紐澳','中東非洲'];
  const AIRPORTS = ['桃園','松山','台中','高雄'];
  const TAIWAN_HOLIDAYS = {
    2026:[
      ['元旦','2026-01-01','2026-01-01',['元旦','跨年','開國紀念日']],
      ['農曆春節','2026-02-14','2026-02-22',['過年','春節','農曆年','農曆春節','新年假期']],
      ['和平紀念日','2026-02-27','2026-03-01',['二二八','228','和平紀念日']],
      ['兒童節及清明節','2026-04-03','2026-04-06',['兒童節','清明節','清明連假']],
      ['勞動節','2026-05-01','2026-05-03',['勞動節','五一勞動節']],
      ['端午節','2026-06-19','2026-06-21',['端午','端午節','端午連假']],
      ['中秋節及教師節','2026-09-25','2026-09-28',['中秋','中秋節','中秋連假','教師節']],
      ['國慶日','2026-10-09','2026-10-11',['國慶','雙十','雙十節','國慶日']],
      ['光復節','2026-10-24','2026-10-26',['光復節','台灣光復節']],
      ['行憲紀念日','2026-12-25','2026-12-27',['行憲紀念日','聖誕節','耶誕節']]
    ],
    2027:[
      ['元旦','2027-01-01','2027-01-03',['元旦','跨年','開國紀念日']],
      ['農曆春節','2027-02-05','2027-02-11',['過年','春節','農曆年','農曆春節','新年假期']],
      ['和平紀念日','2027-02-27','2027-03-01',['二二八','228','和平紀念日']],
      ['兒童節及清明節','2027-04-03','2027-04-06',['兒童節','清明節','清明連假']],
      ['勞動節','2027-04-30','2027-05-02',['勞動節','五一勞動節']],
      ['端午節','2027-06-09','2027-06-09',['端午','端午節','端午連假']],
      ['中秋節','2027-09-15','2027-09-15',['中秋','中秋節','中秋連假']],
      ['教師節','2027-09-28','2027-09-28',['教師節']],
      ['國慶日','2027-10-09','2027-10-11',['國慶','雙十','雙十節','國慶日']],
      ['光復節','2027-10-23','2027-10-25',['光復節','台灣光復節']],
      ['行憲紀念日','2027-12-24','2027-12-26',['行憲紀念日','聖誕節','耶誕節']]
    ]
  };
  function resolveTaiwanHoliday(text, now = new Date()) {
    const source=clean(text),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const matches=Object.values(TAIWAN_HOLIDAYS).flat().map(([name,from,to,aliases])=>({name,from,to,aliases})).filter(item=>item.aliases.some(alias=>source.includes(alias))).sort((a,b)=>a.from.localeCompare(b.from));
    return matches.find(item=>item.to>=today)||matches[matches.length-1]||null;
  }
  const PREFS = [
    ['不要廉航',/不要廉航|不搭廉航|排除廉航|傳統航空/],['可搭廉航',/可以廉航|可搭廉航|廉航也可以/],
    ['不要購物站',/不要購物|無購物|不進購物站|不要購物站/],['可接受購物站',/可以購物|購物站沒關係|可接受購物/],
    ['樂園',/樂園|迪士尼|環球影城/],['親子友善',/親子|小孩|兒童友善/],['長輩適合',/長輩|老人|銀髮|爸媽|父母/],
    ['少爬坡',/不要爬坡|少爬坡|不爬山|不要爬山/],['少樓梯',/不要樓梯|少樓梯|避免階梯|不要階梯/],
    ['年輕人體驗',/年輕人|體驗多|刺激|夜生活|自由活動/],['玩雪',/玩雪|滑雪|戲雪|雪盆|雪樂園|雪祭|雪上活動/],['跟團',/跟團|團體旅遊/],['自由行',/自由行/],['機加酒',/機加酒|機票加酒店|機票\+飯店/]
  ];
  const clean = value => String(value || '').trim();
  function moneyNumber(raw) {
    const text = clean(raw).replace(/,/g,'');
    const match = text.match(/(\d+(?:\.\d+)?)\s*(萬|千)?/); if (!match) return null;
    const scale = match[2] === '萬' ? 10000 : match[2] === '千' ? 1000 : 1;
    return Math.round(Number(match[1]) * scale);
  }
  function chineseNumber(value) {
    const digits={零:0,一:1,二:2,兩:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
    const text=clean(value); if(text==='十')return 10;
    if(text.includes('十')){const [a,b]=text.split('十');return (a?digits[a]:1)*10+(b?digits[b]:0);}
    return digits[text] == null ? null : digits[text];
  }
  function parseCustomerMessage(message, now = new Date()) {
    const text = clean(message), lower = text.toLowerCase();
    const fullDatePattern=/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/g;
    const fullDates = [...text.matchAll(fullDatePattern)].map(m => `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`);
    const shortDateSource=text.replace(fullDatePattern,' ');
    const shortDates = [...shortDateSource.matchAll(/(?<!\d)(\d{1,2})[\/.-](\d{1,2})(?!\d|\s*(?:天|日))/g)].map(m => `${now.getFullYear()}-${String(+m[1]).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`);
    const chineseDates = [...text.matchAll(/(\d{1,2})月(\d{1,2})[日號]?/g)].map(m => `${now.getFullYear()}-${String(+m[1]).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`);
    let dates = [...new Set([...fullDates,...shortDates,...chineseDates])].slice(0,2);
    const relativeMonth = text.match(/(今年|明年|後年)?\s*([一二兩三四五六七八九十\d]{1,3})月(?:底|中|初|份)?/);
    let monthOnly = relativeMonth ? (/^\d+$/.test(relativeMonth[2]) ? +relativeMonth[2] : chineseNumber(relativeMonth[2])) : null;
    const yearOffset = relativeMonth && relativeMonth[1] ? ({今年:0,明年:1,後年:2}[relativeMonth[1]]) : null;
    let requestedYear = yearOffset == null ? null : now.getFullYear() + yearOffset;
    const holiday = dates.length ? null : resolveTaiwanHoliday(text, now);
    if (holiday) { dates=[holiday.from,holiday.to]; requestedYear=Number(holiday.from.slice(0,4)); monthOnly=Number(holiday.from.slice(5,7)); }
    const airports = AIRPORTS.filter(name => text.includes(name));
    const destinations = DESTINATIONS.filter(name => text.includes(name));
    const adult = text.match(/(?:大人|成人|大)(?:\s*)(\d+)\s*(?:位|人)?|(?<!\d)(\d+)\s*(?:位|人)?成人/);
    const child = text.match(/(?:小孩|兒童|小童|孩童|小)(?:\s*)(\d+)\s*(?:位|人)?/);
    const infant = text.match(/(?:嬰兒|嬰幼兒|嬰)(?:\s*)(\d+)\s*(?:位|人)?/);
    const compactParty = text.match(/(\d+)\s*大\s*(\d+)\s*小(?:\s*(\d+)\s*嬰)?/);
    const adults = compactParty ? +compactParty[1] : adult ? +(adult[1] || adult[2]) : null;
    const children = compactParty ? +compactParty[2] : child ? +child[1] : 0;
    const infants = compactParty && compactParty[3] ? +compactParty[3] : infant ? +infant[1] : 0;
    const totalPartyMatch = !adults && text.match(/(?<![\d萬千])(\d+|[一二兩三四五六七八九十]+)\s*(?:位|人)(?!\s*(?:成人|大人|小孩|兒童|嬰兒))/);
    const totalPeople = totalPartyMatch ? (/^\d+$/.test(totalPartyMatch[1]) ? +totalPartyMatch[1] : chineseNumber(totalPartyMatch[1])) : (adults ? adults + children + infants : null);
    const budgetMatch = text.match(/(?:每人|一人|一位|單人)?\s*(?:預算|抓|大約|約)?\s*(\d+(?:\.\d+)?\s*(?:萬|千)|\d{4,6})\s*(?:元)?(?:以內|以下|左右)?/);
    const totalBudget = /總預算|全部預算|一家預算/.test(text);
    const chineseBudget = text.match(/([一二兩三四五六七八九十]+)\s*萬/);
    const budget = budgetMatch ? moneyNumber(budgetMatch[1]) : chineseBudget ? chineseNumber(chineseBudget[1]) * 10000 : null;
    const dayRangeMatch = text.match(/(\d{1,2})\s*(?:-|~|～|至|到)\s*(\d{1,2})\s*(?:天|日)(?!期)/);
    const dayMatch = dayRangeMatch ? null : text.match(/(\d{1,2})\s*(?:天|日)(?!期)/);
    const travelType = /機加酒|機票加酒店|機票\+飯店/.test(text) ? '機加酒' : /自由行/.test(text) ? '自由行' : /跟團|團體旅遊/.test(text) ? '跟團' : '';
    const preferences = PREFS.filter(([,pattern]) => pattern.test(text)).map(([label]) => label);
    const knownPrefs = new Set(preferences);
    const sights = text.split(/[，,、。\n]/).map(clean).filter(part => /想去|一定要|指定|希望有/.test(part) && part.length <= 40);
    const result = { raw:text, dates, month:monthOnly || (dates[0] ? +dates[0].slice(5,7) : null), requestedYear, airports,
      destination:destinations[0] || '', alternatives:destinations.slice(1), adults, children, infants, totalPeople, budget,
      budgetType:totalBudget ? 'total' : 'perPerson', days:dayMatch ? +dayMatch[1] : null,
      minDays:dayRangeMatch ? Math.min(+dayRangeMatch[1],+dayRangeMatch[2]) : null, maxDays:dayRangeMatch ? Math.max(+dayRangeMatch[1],+dayRangeMatch[2]) : null,
      travelType, preferences:[...knownPrefs], sights, holiday:holiday&&holiday.name||'' };
    result.missing = missingFields(result);
    return result;
  }
  function missingFields(request) {
    const missing=[];
    if (!request.dates.length && !request.month) missing.push('希望出發日期或日期範圍');
    if (!request.airports.length) missing.push('出發機場');
    if (!request.destination) missing.push('目的地或可接受的備選地點');
    if (!request.totalPeople && !request.adults) missing.push('旅客總人數');
    if (!request.budget) missing.push('每人或總預算');
    if (!request.days) missing.push('希望旅遊天數');
    if (!request.travelType) missing.push('跟團、自由行或機加酒');
    return missing;
  }
  function questionReply(request) {
    if (!request.missing.length) return '您好，需求已收到，我先依照您提供的條件查找合適行程，整理後再回覆您。';
    return `您好，為了幫您更精準查找行程，想再請問：\n${request.missing.map((item,i)=>`${i+1}. ${item}`).join('\n')}\n收到後我就能接著幫您篩選，謝謝！`;
  }
  function sourceInfo(trip) {
    const labels = { 'besttour-search':'Besttour 官方搜尋', 'besttour-api':'Besttour 官方行程 API', 'ittms-api':'ITTMS 官方行程 API', html:'Besttour 官方頁面' };
    return { source:labels[trip.source] || '本機已儲存資料／來源待確認', updated:trip.lastChecked || trip.updated || trip.fetchedAt || '待人工確認' };
  }
  function comparisonRecord(item) {
    const trip=item.trip || item, text=[trip.title,trip.subtitle,...(trip.highlights||[])].join(' '), meta=sourceInfo(trip);
    return { code:trip.code || '待人工確認', title:trip.title || trip.mainTitle || '未命名行程', relaxation:item.relaxation||'', price:trip.price || '待人工確認', dates:trip.dates || '待人工確認',
      flight:(trip.departures&&trip.departures[0]&&trip.departures[0].flight)||'待人工確認', airline:trip.airline||'待人工確認', days:trip.days||'待人工確認',
      hotels:trip.hotels||'待人工確認', shopping:/無購物|不進購物/.test(text)?'標示無購物':/購物站|購物/.test(text)?'行程文字提及購物（需人工確認站數）':'待人工確認',
      attractions:(trip.highlights||[]).slice(0,5).join('、')||'待人工確認', extraFees:trip.extraFees||'待人工確認',
      status:Number(trip.seats)>0?`目前可售 ${trip.seats} 席（不代表已成團）`:'待人工確認', source:meta.source, updated:meta.updated, url:trip.url||'' };
  }
  function buildReplies(records, request) {
    const first=records[0], brief=first?`您好，依照您的需求先推薦「${first.title}」，${first.dates} 出發，${first.airline}，${first.price}。${first.url?`\n完整行程：${first.url}`:''}\n價格、名額與成團狀態請以報名時人工確認為準。`:questionReply(request);
    const compare=records.length?`您好，先提供 ${records.length} 個方案比較：\n\n${records.map((r,i)=>`${i+1}. ${r.title}\n日期：${r.dates}\n航空：${r.airline}\n價格：${r.price}\n重點：${r.attractions}`).join('\n\n')}\n\n以上價格、名額、額外費用與成團狀態仍需人工確認，您比較喜歡哪一個方向？`:'目前沒有可比較的行程。';
    const relaxed=[...new Set(records.map(r=>r.relaxation).filter(Boolean))];
    const alternative=relaxed.length?`您好，目前沒有找到完全符合所有條件的商品。以下方案是「${relaxed.join('、')}」後找到的替代選擇：\n${records.slice(0,3).map((r,i)=>`${i+1}. ${r.title}｜${r.dates}｜${r.price}`).join('\n')}\n價格、名額與成團狀態仍需人工確認，您可以接受這個調整方向嗎？`:`您好，目前沒有找到完全符合所有條件的商品。建議可以依序考慮：放寬出發日期、改由其他機場出發、接受備選目的地、前後調整 1 天，或將預算提高約 10%～15%。您願意先放寬哪一項，我再繼續幫您查找。`;
    return { brief, compare, alternative };
  }

  function install() {
    if (typeof document === 'undefined' || document.getElementById('customerLineRequest')) return;
    const run=document.getElementById('runMatch'); if (!run) return;
    const section=run.closest('.section'), intro=section.querySelector('.hint');
    const box=document.createElement('div'); box.id='salesWorkbench'; box.innerHTML=`<div style="border:1px solid #cbd5e1;border-radius:12px;padding:13px;margin-bottom:14px;background:#f8fafc"><h2 style="margin:0 0 8px">貼上客人的 LINE 原話</h2><textarea id="customerLineRequest" placeholder="例如：想找 8/10～8/15 桃園出發，日本或韓國，2大1小，每人四萬內，5天跟團，不要廉航，希望有樂園"></textarea><div class="btnrow"><button class="primary" id="parseCustomerLine">辨識客戶需求</button><button id="applyCustomerSearch">套用條件並搜尋</button></div><div id="requestSummary" class="hint" style="margin-top:10px">尚未辨識。</div></div>`;
    section.insertBefore(box,intro);
    const byId=id=>document.getElementById(id); let parsed=null, currentResults=[];
    const value=(label,v)=>`<div><b>${label}</b>：${v||'未提供'}</div>`;
    byId('parseCustomerLine').onclick=()=>{parsed=parseCustomerMessage(byId('customerLineRequest').value);const dateSummary=parsed.dates.join('～')||(parsed.month?`${parsed.requestedYear?parsed.requestedYear+' 年 ':''}${parsed.month} 月`:'');const peopleSummary=parsed.adults?`${parsed.adults}大 ${parsed.children}小 ${parsed.infants}嬰`:(parsed.totalPeople?`總共 ${parsed.totalPeople} 位`:'');byId('requestSummary').innerHTML=[value('日期',dateSummary),value('機場',parsed.airports.join('、')),value('目的地',[parsed.destination,...parsed.alternatives].filter(Boolean).join('／')),value('人數',peopleSummary),value('預算',parsed.budget?`${parsed.budgetType==='total'?'總預算':'每人'} ${parsed.budget.toLocaleString('zh-TW')} 元`:''),value('天數',parsed.minDays?`${parsed.minDays}～${parsed.maxDays}天`:(parsed.days?parsed.days+'天':'')),value('類型',parsed.travelType),value('偏好',parsed.preferences.join('、')),`<div style="margin-top:6px;color:${parsed.missing.length?'#a85b00':'#087a55'}"><b>${parsed.missing.length?'仍需詢問':'資料狀態'}</b>：${parsed.missing.join('、')||'主要條件已齊全'}</div>`].join('');};
    byId('applyCustomerSearch').onclick=()=>{if(!parsed)byId('parseCustomerLine').click();if(!parsed)return;byId('matchPeople').value=parsed.totalPeople||2;byId('matchDestination').value=parsed.destination;const heads=(parsed.adults||0)+(parsed.children||0)||parsed.totalPeople||1;byId('matchBudget').value=parsed.budgetType==='total'?Math.round((parsed.budget||0)/heads):(parsed.budget||'');byId('matchMonth').value=parsed.month||'';byId('matchKeywords').value=[...parsed.sights,...parsed.preferences.filter(x=>!['跟團','自由行','機加酒'].includes(x))].join('、');if(parsed.preferences.includes('長輩適合'))byId('travelerType').value='senior';if(parsed.preferences.includes('親子友善'))byId('travelerType').value='family';if(parsed.preferences.includes('年輕人體驗'))byId('travelerType').value='youth';byId('avoidSlopes').checked=parsed.preferences.includes('少爬坡');byId('avoidStairs').checked=parsed.preferences.includes('少樓梯');run.click();};
    byId('applyCustomerSearch').addEventListener('click',()=>{if(parsed)run.dataset.customerRequest=JSON.stringify(parsed);},true);
    const copy=id=>navigator.clipboard.writeText(byId(id).value).catch(()=>{});
    const resultBox=byId('matchResults'); const replyBox=document.createElement('div');replyBox.id='salesReplies';replyBox.style.marginTop='12px';resultBox.insertAdjacentElement('afterend',replyBox);
    resultBox.addEventListener('change',event=>{if(event.target.classList.contains('compareTrip')&&event.target.checked&&resultBox.querySelectorAll('.compareTrip:checked').length>5){event.target.checked=false;const status=byId('matchStatus');status.className='status show warn';status.textContent='最多只能勾選 5 個行程進行比較。';}});
    document.addEventListener('travel:match-results',event=>{currentResults=event.detail||[];setTimeout(()=>{resultBox.querySelectorAll('[data-match-index]').forEach((card,index)=>{const row=document.createElement('label');row.style.cssText='display:block;margin:8px 0 0;font-weight:700';row.innerHTML=`<input type="checkbox" class="compareTrip" value="${index}" style="width:auto"> 加入比較（選 2～5 團）`;card.appendChild(row);});replyBox.innerHTML='<div class="btnrow"><button id="compareSelected">比較已勾選行程</button></div><div id="comparisonOutput"></div><label style="margin-top:10px">LINE 回覆版本</label><select id="replyType"><option value="brief">簡短版</option><option value="compare">三方案比較版</option><option value="alternative">找不到商品／替代方案版</option></select><textarea id="customerReplyOutput" class="output" style="min-height:180px"></textarea><button id="copyCustomerReply">複製 LINE 回覆</button>';const selected=()=>[...resultBox.querySelectorAll('.compareTrip:checked')].map(x=>comparisonRecord(currentResults[+x.value])).slice(0,5);const refreshReply=()=>{const records=selected().length?selected():currentResults.slice(0,3).map(comparisonRecord),replies=buildReplies(records,parsed||parseCustomerMessage(''));byId('customerReplyOutput').value=replies[byId('replyType').value];};byId('compareSelected').onclick=()=>{const records=selected();if(records.length<2||records.length>5){byId('comparisonOutput').innerHTML='<div class="status show warn">請勾選 2～5 個行程。</div>';return;}const fields=[['價格','price'],['日期','dates'],['航班','flight'],['航空公司','airline'],['天數','days'],['飯店','hotels'],['購物站','shopping'],['主要景點','attractions'],['額外費用','extraFees'],['成團狀態','status'],['資料來源','source'],['最後更新','updated']];byId('comparisonOutput').innerHTML=`<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><th style="text-align:left;padding:7px;border:1px solid #ddd">比較項目</th>${records.map(r=>`<th style="text-align:left;padding:7px;border:1px solid #ddd">${r.title}</th>`).join('')}</tr>${fields.map(([label,key])=>`<tr><th style="text-align:left;padding:7px;border:1px solid #ddd">${label}</th>${records.map(r=>`<td style="padding:7px;border:1px solid #ddd">${r[key]}</td>`).join('')}</tr>`).join('')}</table></div>`;refreshReply();};byId('replyType').onchange=refreshReply;byId('copyCustomerReply').onclick=()=>copy('customerReplyOutput');refreshReply();},0);});
  }
  if (typeof document !== 'undefined') { if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install(); }
  return { TAIWAN_HOLIDAYS, resolveTaiwanHoliday, parseCustomerMessage, missingFields, questionReply, sourceInfo, comparisonRecord, buildReplies, install };
});
