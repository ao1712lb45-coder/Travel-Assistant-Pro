/* Travel Assistant Pro 1.1.0 - friendly workspace shell */
(function () {
  'use strict';
  const panel = document.querySelector('.wrap > .panel');
  if (!panel || panel.dataset.workspaceReady === 'true') return;
  const sections = Array.from(panel.querySelectorAll(':scope > .section'));
  if (sections.length < 7) return;

  const views = [
    { id:'start', label:'匯入行程', icon:'1', sections:sections.slice(0,2), help:'輸入團號或網址，自動抓取並解析官方行程。' },
    { id:'trip', label:'確認行程', icon:'2', sections:[sections[2]], help:'確認名稱、價格、日期、航空公司與行程亮點。' },
    { id:'copy', label:'行銷素材', icon:'3', sections:[sections[3]], help:'一鍵產生 LINE、Facebook、Threads、EDM、福委提案與短影音腳本。' },
    { id:'check', label:'發布檢查', icon:'4', sections:[sections[4]], help:'發布前確認必要資料與網址格式。' },
    { id:'match', label:'客戶配對', icon:'5', sections:[sections[5]], help:'依地區、預算、月份與完整行程內容搜尋合適團體。' },
    { id:'database', label:'行程資料庫', icon:'6', sections:[sections[6]], help:'同步、搜尋、匯入與備份行程資料。' },
    { id:'crm', label:'客戶 CRM', icon:'7', sections:[sections[7]], help:'記錄客戶喜好與避開條件，快速檢查行程適配度。' }
  ];

  const style = document.createElement('style');
  style.textContent = `
    body{padding-bottom:0} header{position:sticky;top:0;z-index:30;box-shadow:0 4px 18px rgba(23,32,51,.14)}
    header h1{font-size:21px} header p{font-size:13px}
    .workspace{max-width:1280px;margin:18px auto;padding:0 16px;display:grid;grid-template-columns:250px minmax(0,1fr);gap:16px;align-items:start}
    .workspace-nav{position:sticky;top:94px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px;box-shadow:0 5px 18px #1e293b0d}
    .workspace-brand{padding:7px 8px 14px;border-bottom:1px solid #edf1f6;margin-bottom:8px}.workspace-brand strong{display:block;font-size:15px}.workspace-brand span{display:block;color:var(--muted);font-size:12px;margin-top:4px;line-height:1.45}
    .workspace-nav button{width:100%;display:grid;grid-template-columns:32px 1fr;align-items:center;text-align:left;margin:3px 0;background:transparent;color:#344054;padding:10px 9px;border:1px solid transparent}.workspace-nav button:hover{background:#fff7ed}.workspace-nav button.active{background:linear-gradient(135deg,#fff1f2,#fff7ed);color:#9f1239;border-color:#fecdd3}
    .nav-step{width:27px;height:27px;border-radius:9px;background:#eef2f7;display:grid;place-items:center;font-size:12px}.active .nav-step{background:#d92d45;color:#fff}
    .workspace-main{min-width:0}.workspace-toolbar{background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px 16px;margin-bottom:12px;display:flex;justify-content:space-between;gap:12px;align-items:center}.workspace-toolbar h2{font-size:18px;margin:0}.workspace-toolbar p{font-size:12px;color:var(--muted);margin:3px 0 0}.workspace-progress{font-size:12px;font-weight:700;color:#9f1239;background:#fff1f2;padding:7px 10px;border-radius:999px;white-space:nowrap}
    .workspace-main>.panel{overflow:visible}.workspace-main>.panel>.section{display:none}.workspace-main>.panel>.section.workspace-visible{display:block;animation:workspaceIn .18s ease-out}.workspace-main>.panel>.section.workspace-visible+.workspace-visible{border-top:1px solid #edf1f6}
    .workspace-actions{display:flex;justify-content:space-between;gap:8px;padding:12px 0 4px}.workspace-actions button{min-width:118px}.workspace-actions .next{color:#fff;background:linear-gradient(135deg,var(--brand),var(--brand2))}.mobile-nav{display:none}
    @keyframes workspaceIn{from{opacity:.35;transform:translateY(4px)}to{opacity:1;transform:none}}
    @media(max-width:820px){body{padding-bottom:72px}header{position:relative}.workspace{display:block;margin:10px auto;padding:0 8px}.workspace-nav{display:none}.workspace-toolbar{position:sticky;top:6px;z-index:20;padding:10px 12px}.workspace-progress{font-size:11px}.workspace-main>.panel{border-radius:13px}.mobile-nav{position:fixed;display:grid;grid-template-columns:repeat(6,1fr);left:0;right:0;bottom:0;z-index:50;background:rgba(255,255,255,.97);border-top:1px solid #d9e2ee;padding:6px 4px max(6px,env(safe-area-inset-bottom));box-shadow:0 -5px 18px rgba(23,32,51,.12)}.mobile-nav button{padding:5px 1px;background:transparent;border-radius:8px;color:#667085;font-size:10px;display:grid;justify-items:center;gap:2px}.mobile-nav button.active{background:#fff1f2;color:#9f1239}.mobile-nav .nav-step{width:25px;height:25px;border-radius:8px}.workspace-actions{padding:10px 2px}.workspace-actions button{min-width:0;flex:1}.section{padding:13px}}
  `;
  document.head.appendChild(style);

  const workspace=document.createElement('div'),nav=document.createElement('aside'),main=document.createElement('main'),toolbar=document.createElement('div'),actions=document.createElement('div'),mobileNav=document.createElement('nav');
  workspace.className='workspace';nav.className='workspace-nav';main.className='workspace-main';toolbar.className='workspace-toolbar';actions.className='workspace-actions';mobileNav.className='mobile-nav';
  nav.setAttribute('aria-label','主要功能');mobileNav.setAttribute('aria-label','手機功能列');
  nav.innerHTML='<div class="workspace-brand"><strong>V2.1 工作流程</strong><span>完成行程解析、行銷素材、客戶配對與資料庫管理。</span></div>';
  toolbar.innerHTML='<div><h2 id="workspaceTitle"></h2><p id="workspaceHelp"></p></div><span id="workspaceProgress" class="workspace-progress"></span>';
  actions.innerHTML='<button id="workspacePrev">← 上一步</button><button id="workspaceNext" class="next">下一步 →</button>';
  panel.parentElement.insertBefore(workspace,panel);workspace.append(nav,main);main.append(toolbar,panel,actions);document.body.appendChild(mobileNav);panel.dataset.workspaceReady='true';

  let current=0;const desktopButtons=[],mobileButtons=[];
  function buttonFor(view,compact){const button=document.createElement('button');button.type='button';button.dataset.view=view.id;button.innerHTML='<span class="nav-step">'+view.icon+'</span><span>'+view.label+'</span>';button.addEventListener('click',()=>showView(views.indexOf(view)));if(compact)button.setAttribute('aria-label',view.label);return button}
  views.forEach(view=>{const desktop=buttonFor(view,false),mobile=buttonFor(view,true);desktopButtons.push(desktop);mobileButtons.push(mobile);nav.appendChild(desktop);mobileNav.appendChild(mobile)});
  function showView(index,updateHash=true){current=Math.max(0,Math.min(index,views.length-1));sections.forEach(section=>section.classList.remove('workspace-visible'));views[current].sections.forEach(section=>section.classList.add('workspace-visible'));[...desktopButtons,...mobileButtons].forEach(button=>{const active=button.dataset.view===views[current].id;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false')});document.getElementById('workspaceTitle').textContent=views[current].label;document.getElementById('workspaceHelp').textContent=views[current].help;document.getElementById('workspaceProgress').textContent=(current+1)+' / '+views.length;document.getElementById('workspacePrev').disabled=current===0;document.getElementById('workspaceNext').textContent=current===views.length-1?'回到開始':'下一步 →';if(updateHash)history.replaceState(null,'','#'+views[current].id);window.scrollTo({top:0,behavior:'smooth'})}
  document.getElementById('workspacePrev').addEventListener('click',()=>showView(current-1));document.getElementById('workspaceNext').addEventListener('click',()=>showView(current===views.length-1?0:current+1));const hashIndex=views.findIndex(view=>'#'+view.id===location.hash);showView(hashIndex>=0?hashIndex:0,false);
})();
