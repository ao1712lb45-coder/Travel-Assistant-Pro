(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TravelLocalAssistant = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STYLE_WORDS = {
    deal: /優惠|促銷|便宜|價格|特價/,
    natural: /自然|生活|口語/,
    concise: /簡短|精簡|短一點/,
    energetic: /活潑|熱情|有力|吸睛/,
    professional: /專業|正式|質感/,
    season: /季節|賞花|賞楓|櫻花|雪景/,
    relax: /放鬆|度假|悠閒|療癒/,
    family: /親子|家庭|小孩|家人/
  };

  function understand(message) {
    const text = String(message || '').trim();
    if (!text) return { intent:'empty' };
    if (/你好|嗨|哈囉|help|幫助|怎麼用/i.test(text)) return { intent:'help' };
    if (/複製/.test(text)) return { intent:'copy' };
    if (/目前|資料|行程內容|摘要|整理/.test(text)) return { intent:'summary' };
    const platform = /threads/i.test(text) ? 'threads' : /facebook|臉書|fb/i.test(text) ? 'facebook' : /line/i.test(text) ? 'line' : 'all';
    const style = Object.entries(STYLE_WORDS).find(([, pattern]) => pattern.test(text));
    if (/文案|產生|生成|重寫|改寫|換一篇|再一篇|不同|版本/.test(text) || style || platform !== 'all') {
      return { intent:'generate', platform, style:style ? style[0] : null, advance:/換一篇|再一篇|不同|版本|重寫|改寫/.test(text) };
    }
    return { intent:'unknown' };
  }

  function install() {
    const byId = id => document.getElementById(id);
    if (!document.body || byId('localAssistant')) return;
    const style = document.createElement('style');
    style.textContent = '.assistant-launch{position:fixed;right:18px;bottom:18px;z-index:50;border-radius:999px;padding:13px 17px;color:#fff;background:linear-gradient(135deg,#23314a,#d92d45);box-shadow:0 8px 24px #17203344}.assistant-box{position:fixed;right:18px;bottom:76px;z-index:50;width:min(360px,calc(100vw - 24px));background:#fff;border:1px solid #d9e2ee;border-radius:15px;box-shadow:0 15px 45px #17203335;overflow:hidden}.assistant-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;color:#fff;background:#23314a}.assistant-head button{padding:4px 8px;color:#fff;background:transparent}.assistant-log{height:280px;overflow:auto;padding:12px;background:#f8fafc}.assistant-msg{max-width:88%;margin:0 0 9px;padding:9px 11px;border-radius:12px;white-space:pre-wrap;font-size:13px;line-height:1.5}.assistant-msg.bot{background:#fff;border:1px solid #e2e8f0}.assistant-msg.user{margin-left:auto;color:#fff;background:#d92d45}.assistant-input{display:flex;gap:7px;padding:10px;border-top:1px solid #e2e8f0}.assistant-input input{min-width:0}.assistant-input button{color:#fff;background:#23314a}.assistant-chips{display:flex;gap:5px;flex-wrap:wrap;padding:0 10px 10px}.assistant-chips button{padding:6px 8px;font-size:12px}.assistant-note{padding:0 12px 9px;color:#667085;font-size:11px}@media(max-width:600px){.assistant-box{right:12px;bottom:70px}.assistant-launch{right:12px;bottom:12px}}';
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'localAssistant';
    box.className = 'assistant-box';
    box.hidden = true;
    box.innerHTML = '<div class="assistant-head"><b>旅遊文案助手</b><button type="button" aria-label="關閉">✕</button></div><div class="assistant-log" aria-live="polite"></div><div class="assistant-chips"><button>換一篇 Threads</button><button>產生親子文案</button><button>改成專業語氣</button><button>整理目前行程</button></div><div class="assistant-input"><input aria-label="輸入訊息" placeholder="例如：幫我換一篇親子文案"><button type="button">送出</button></div><div class="assistant-note">免費內建助手，不會連線至 GPT，也不會傳送資料給 AI。</div>';
    const launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'assistant-launch';
    launch.textContent = '💬 文案助手';
    document.body.append(box, launch);
    const log = box.querySelector('.assistant-log'), input = box.querySelector('input');
    const add = (text, role = 'bot') => { const node=document.createElement('div'); node.className=`assistant-msg ${role}`; node.textContent=text; log.appendChild(node); log.scrollTop=log.scrollHeight; };
    const currentData = () => ({ title:byId('mainTitle')?.value.trim() || '尚未填寫', price:byId('price')?.value.trim() || '尚未填寫', dates:byId('dates')?.value.trim() || '尚未填寫', airline:byId('airline')?.value.trim() || '尚未填寫', highlights:(byId('highlights')?.value || '').split(/\r?\n/).filter(Boolean) });
    function reply(message) {
      add(message, 'user');
      const command = understand(message);
      if (command.intent === 'help' || command.intent === 'empty') return add('你可以說：「換一篇 Threads」、「產生親子文案」、「改成專業語氣」、「複製文案」或「整理目前行程」。');
      if (command.intent === 'summary') { const d=currentData(); return add(`目前行程：${d.title}\n航空：${d.airline}\n日期：${d.dates}\n價格：${d.price}\n亮點：${d.highlights.join('、') || '尚未填寫'}`); }
      if (command.intent === 'copy') { byId('copyText')?.click(); return add('已嘗試複製目前顯示的文案。若瀏覽器阻擋，請在文案框按 Ctrl+A、Ctrl+C。'); }
      if (command.intent === 'generate') {
        if (command.style && byId('copyStyle')) { byId('copyStyle').value=command.style; byId('copyStyle').dispatchEvent(new Event('change')); }
        if (command.platform === 'threads' && command.advance) byId('regenThreads')?.click(); else byId('generateCopy')?.click();
        const tabId = command.platform === 'facebook' ? 'fbOut' : command.platform === 'threads' ? 'threadsOut' : command.platform === 'line' ? 'lineOut' : null;
        if (tabId) document.querySelector(`[data-tab="${tabId}"]`)?.click();
        return add(`${command.platform === 'all' ? '三平台' : command.platform} 文案已更新。你可以再說「換一篇」繼續變化。`);
      }
      add('我目前專門協助旅遊文案。你可以說「換一篇 Threads」或「產生優惠文案」。');
    }
    launch.onclick = () => { box.hidden=!box.hidden; if (!box.hidden) input.focus(); };
    box.querySelector('.assistant-head button').onclick = () => { box.hidden=true; };
    box.querySelector('.assistant-input button').onclick = () => { const value=input.value; input.value=''; reply(value); };
    input.addEventListener('keydown', event => { if (event.key === 'Enter') box.querySelector('.assistant-input button').click(); });
    box.querySelectorAll('.assistant-chips button').forEach(button => button.onclick=()=>reply(button.textContent));
    add('你好！我是免費內建的旅遊文案助手。告訴我想要的平台或語氣，我會直接更新頁面上的文案。');
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install(); }
  return { understand, install };
});
