/* Travel Assistant Pro 2.0 - visual refresh */
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#f3f7f8;--card:#fff;--ink:#102a2e;--muted:#64777a;--line:#dce7e8;--brand:#007f78;--brand2:#e9863b;--ok:#087a55}
    body{background:radial-gradient(circle at 15% 0,#dff5f1 0,transparent 32%),linear-gradient(180deg,#f7faf9,#eef4f5);min-height:100vh}
    header{padding:22px clamp(18px,4vw,46px);background:linear-gradient(125deg,#073f43 0%,#007f78 58%,#e9863b 140%);box-shadow:0 10px 30px rgba(4,50,53,.2)}
    header h1{font-size:clamp(22px,3vw,30px);letter-spacing:.02em}header p{max-width:760px;line-height:1.6}
    .v2-kicker{display:inline-flex;align-items:center;gap:7px;margin-bottom:8px;padding:5px 10px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:800;letter-spacing:.08em}
    .panel,.workspace-nav,.workspace-toolbar{border-color:rgba(133,168,170,.3)!important;box-shadow:0 12px 35px rgba(15,58,61,.08)!important}
    .panel{border-radius:20px}.section{padding:clamp(17px,2.5vw,25px)}.section h2{font-size:19px;color:#123f42}
    input,textarea,select{border-color:#c7d9da;border-radius:11px;padding:11px 12px;transition:border-color .15s,box-shadow .15s}input:focus,textarea:focus,select:focus{outline:none;border-color:#15958d;box-shadow:0 0 0 4px rgba(21,149,141,.12)}
    button{border-radius:11px;transition:transform .12s,box-shadow .12s,background .12s}button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 12px rgba(16,42,46,.1)}button.primary,.workspace-actions .next{background:linear-gradient(135deg,#007f78,#15a298)!important}button.dark{background:#103f43}.tab.active{background:#0e5053;border-color:#0e5053}
    .hint{background:#f5faf9;border-color:#dbeae9}.badge{background:#e3f5f2;color:#087069}.output{min-height:300px;background:#fbfdfd;border-color:#cfdfdf;line-height:1.65}
    .workspace-brand strong:before{content:'✦';color:#e9863b;margin-right:7px}.workspace-nav button.active{background:linear-gradient(135deg,#e4f6f3,#fff4e9)!important;color:#07645f!important;border-color:#bde2dd!important}.active .nav-step{background:#007f78!important}.workspace-progress{color:#07645f!important;background:#e4f6f3!important}
    @media(max-width:820px){.mobile-nav{grid-template-columns:repeat(7,minmax(0,1fr))!important}.mobile-nav button{font-size:9px!important}}
    @media(max-width:600px){header{padding:18px 16px}.tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.tab{width:100%;font-size:12px}.output{min-height:260px}}
  `;
  document.head.appendChild(style);
  document.title = 'Travel Assistant Pro 2.0';
  const header = document.querySelector('header');
  if (header) header.innerHTML = '<div class="v2-kicker">TRAVEL ASSISTANT PRO · 2.0</div><h1>旅行社智慧業務工作台</h1><p>官網行程擷取、完整內容搜尋、六種行銷素材、客戶需求配對與行程資料庫，一個網站完成日常工作。</p>';
})();
