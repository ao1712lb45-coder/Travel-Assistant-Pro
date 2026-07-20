/* Travel Assistant Pro 2.2 - multi-trip enterprise proposal email */
(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.TravelEnterpriseProposal = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const clean = value => String(value || '').trim();
  const valid = value => value && !/官網目前未顯示|未辨識|待確認/.test(String(value));
  const titleOf = trip => clean(trip.title || trip.mainTitle) || clean(trip.code) || '精選團體行程';
  function buildEnterpriseEmail(trips, options = {}) {
    const company=clean(options.company), recipient=clean(options.recipient), sender=clean(options.sender), line=clean(options.line);
    const subject=clean(options.subject) || `員工旅遊精選行程提案${company ? `｜${company}` : ''}`;
    const greeting=recipient ? `${recipient} 您好：` : '福委您好：';
    const items=(trips||[]).map((trip,index)=>{
      const facts=[valid(trip.days)?`天數：${clean(trip.days)}`:'',valid(trip.airline)?`航空公司：${clean(trip.airline)}`:'',valid(trip.dates)?`出發日期：${clean(trip.dates)}`:'',valid(trip.price)?`參考售價：${clean(trip.price)}`:''].filter(Boolean);
      const highlights=(trip.highlights||[]).map(clean).filter(Boolean).slice(0,3);
      return `${index+1}. ${titleOf(trip)}${trip.code?`（${clean(trip.code)}）`:''}\n${facts.join('\n')}${highlights.length?`\n行程亮點：${highlights.join('、')}`:''}${valid(trip.url)?`\n完整行程：${clean(trip.url)}`:''}`;
    });
    const body=`${greeting}\n\n為貴公司整理以下 ${items.length} 個員工旅遊行程，方便福委依目的地、日期與預算進行初步比較：\n\n${items.join('\n\n')}\n\n以上售價、機位與行程內容仍以報名時確認為準；若能提供預計人數、預算、希望日期及旅遊天數，我可以再協助縮小範圍並確認團體方案。\n\n${[sender,line?`LINE／電話：${line}`:''].filter(Boolean).join('\n')}`.trim();
    return { subject, body };
  }
  function install() {
    if (typeof document === 'undefined' || document.getElementById('enterpriseProposalSection')) return;
    const panel=document.querySelector('.wrap > .panel'); if(!panel)return;
    const section=document.createElement('section'); section.id='enterpriseProposalSection'; section.className='section';
    section.innerHTML=`<h2>企業福委提案 <span class="badge">企業戶</span></h2><div class="hint">從行程資料庫一次勾選多個行程，自動整理成企業提案郵件；複製後可貼到你平常使用的郵件系統。</div><div class="grid2" style="margin-top:12px"><div><label>企業名稱</label><input id="enterpriseCompany" placeholder="例如：○○科技股份有限公司"></div><div><label>收件人稱呼</label><input id="enterpriseRecipient" placeholder="例如：王小姐／福委會"></div></div><label style="margin-top:10px">郵件主旨</label><input id="enterpriseSubject" placeholder="未填寫時會自動產生"><div style="margin-top:12px"><label>選擇行程</label><div class="grid2"><input id="enterpriseTripSearch" placeholder="搜尋團號、行程名稱、航空公司"><div class="btnrow" style="margin-top:0"><button id="enterpriseSelectAll">全選目前結果</button><button id="enterpriseClear">取消全選</button><button id="enterpriseRefresh">重新載入資料庫</button></div></div><div id="enterpriseTripList" class="enterprise-trip-list"></div></div><div class="btnrow"><button class="primary" id="generateEnterpriseEmail">產生企業提案郵件</button><button id="copyEnterpriseEmail">複製郵件內容</button></div><div id="enterpriseStatus" class="status"></div><label style="margin-top:10px">郵件內容</label><textarea id="enterpriseEmailOutput" class="output" style="min-height:360px"></textarea>`;
    panel.appendChild(section);
    const byId=id=>document.getElementById(id), readDb=()=>{try{return JSON.parse(localStorage.getItem('travelV10Db')||'[]')}catch(_){return[]}}, selected=new Set();
    const rows=()=>readDb().filter(trip=>[trip.code,trip.title,trip.mainTitle,trip.airline,trip.dates].join(' ').toLowerCase().includes(byId('enterpriseTripSearch').value.trim().toLowerCase()));
    function render(){const list=rows(),box=byId('enterpriseTripList');box.innerHTML=list.length?list.map((trip,index)=>{const key=clean(trip.code)||`${titleOf(trip)}::${index}`;return `<label class="enterprise-trip"><input type="checkbox" data-enterprise-key="${encodeURIComponent(key)}" ${selected.has(key)?'checked':''}><span><b>${titleOf(trip)}</b><small>${[trip.code,trip.dates,trip.price,trip.airline].map(clean).filter(Boolean).join('｜')}</small></span></label>`}).join(''):'<div class="hint">資料庫尚無符合的行程，請先到「行程資料庫」同步。</div>';box.querySelectorAll('[data-enterprise-key]').forEach(input=>input.onchange=()=>{const key=decodeURIComponent(input.dataset.enterpriseKey);input.checked?selected.add(key):selected.delete(key);showCount()});showCount()}
    const selectedTrips=()=>readDb().filter((trip,index)=>selected.has(clean(trip.code)||`${titleOf(trip)}::${index}`));
    function showCount(message){const status=byId('enterpriseStatus');status.textContent=message||`已選擇 ${selectedTrips().length} 個行程。`;status.className='status show '+(selectedTrips().length?'ok':'warn')}
    function generate(){const trips=selectedTrips();if(!trips.length){showCount('請至少選擇一個行程。');return null}const result=buildEnterpriseEmail(trips,{company:byId('enterpriseCompany').value,recipient:byId('enterpriseRecipient').value,subject:byId('enterpriseSubject').value,sender:document.getElementById('contact')?.value,line:document.getElementById('line')?.value});byId('enterpriseSubject').value=result.subject;byId('enterpriseEmailOutput').value=result.body;showCount(`已將 ${trips.length} 個行程整理成企業提案郵件。`);return result}
    byId('enterpriseTripSearch').oninput=render;byId('enterpriseRefresh').onclick=render;byId('enterpriseSelectAll').onclick=()=>{rows().forEach((trip,index)=>selected.add(clean(trip.code)||`${titleOf(trip)}::${index}`));render()};byId('enterpriseClear').onclick=()=>{selected.clear();render()};byId('generateEnterpriseEmail').onclick=generate;
    byId('copyEnterpriseEmail').onclick=async()=>{const result=generate();if(!result)return;const text=`主旨：${result.subject}\n\n${result.body}`;try{await navigator.clipboard.writeText(text);showCount('郵件主旨與內容已複製。')}catch(_){showCount('瀏覽器未允許自動複製，請在文字框按 Ctrl+A、Ctrl+C。')}};
    const style=document.createElement('style');style.textContent=`.enterprise-trip-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:380px;overflow:auto;margin:8px 0 14px;padding:8px;border:1px solid #dbeae9;border-radius:12px;background:#f8fbfb}.enterprise-trip{display:flex;gap:9px;align-items:flex-start;padding:10px;border:1px solid #dce7e8;border-radius:10px;background:#fff;cursor:pointer}.enterprise-trip input{width:auto;margin-top:3px}.enterprise-trip span{min-width:0}.enterprise-trip b,.enterprise-trip small{display:block}.enterprise-trip small{margin-top:4px;color:#64777a;line-height:1.4}@media(max-width:700px){.enterprise-trip-list{grid-template-columns:1fr}}`;document.head.appendChild(style);render();
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()}
  return { buildEnterpriseEmail, install };
});
