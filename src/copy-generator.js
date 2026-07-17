(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TravelCopyGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STYLE_LABELS = {
    auto: '自動判斷', deal: '優惠促銷', natural: '自然分享', concise: '精簡重點',
    energetic: '活潑吸睛', professional: '專業介紹', season: '季節旅行',
    relax: '放鬆度假', family: '親子同行', quality: '質感行程'
  };
  const OPENERS = {
    deal: ['🔥 這個價格值得先存起來！', '想找高 CP 值行程，這團可以看看。', '近期優惠團整理給大家：', '價格和行程亮點一次看：'],
    natural: ['最近看到一團滿有意思的行程。', '如果最近正想安排旅行，可以看看這團。', '分享一個我剛整理好的行程。', '這團的幾個亮點滿吸引我的。'],
    concise: ['行程重點快速看：', '重點資訊整理如下：', '不用滑太久，重點都在這裡：', '一分鐘掌握這團：'],
    energetic: ['✈️ 準備出發！這團亮點滿滿！', '旅行清單再加一筆！', '🌏 想出國玩的看過來！', '這個行程讓人很想立刻排假！'],
    professional: ['精選行程資訊如下：', '為您整理本團主要資訊：', '行程、航班與出發日期完整整理：', '本團重點與可售資訊如下：'],
    season: ['季節限定的風景，錯過就要再等一年。', '把握最適合出發的季節，一起去看美景。', '這一季的旅行清單，可以放進這團。', '季節美景與特色行程一次收藏。'],
    relax: ['想暫時離開日常，這團很適合放進口袋名單。', '給自己幾天假，換個地方放鬆一下。', '旅行不用想得太複雜，先從喜歡的風景開始。', '想找度假感行程，可以先看看這一團。'],
    family: ['親子旅行清單又多一個選擇！', '正在安排全家旅行嗎？這團可以先收藏。', '帶家人一起出發，行程亮點先整理給你。', '適合全家一起看的旅遊資訊來了。'],
    quality: ['想把旅行安排得更有質感，可以看看這團。', '精選景點與行程資訊，一次整理給你。', '重視旅遊內容的人，這團值得仔細看看。', '不只到此一遊，行程亮點更值得期待。']
  };
  const FORMAT_NOTES = ['先看基本資料與主要亮點。', '日期、價格與航空資訊都整理好了。', '挑出幾個值得注意的行程內容。', '出發前最想知道的資訊一次看。', '先收藏，再和旅伴一起研究。', '正在比行程的人可以快速比較。', '把重點濃縮成一篇，閱讀更方便。', '從景點到出發資訊，快速掌握。'];
  const clean = value => String(value || '').trim();
  const valid = value => value && !/官網目前未顯示|未辨識|待確認/.test(value);
  const list = d => (d.highlights || []).filter(Boolean).slice(0, 5);
  const bullets = (d, icon = '•') => list(d).map(x => `${icon} ${x}`).join('\n');
  const contact = d => [d.contact, d.line ? `LINE ${d.line}` : ''].filter(Boolean).join('\n');
  const info = d => [valid(d.airline) ? `✈️ ${d.airline}` : '', valid(d.dates) ? `📅 ${d.dates}` : '', valid(d.price) ? `💰 ${d.price}` : ''].filter(Boolean).join('\n');
  function detectStyle(d, requested) {
    if (requested && requested !== 'auto') return requested;
    const text = [d.title, d.subtitle, ...(d.highlights || [])].join(' ');
    if (/親子|樂園|動物園|迪士尼|兒童/.test(text)) return 'family';
    if (/櫻|楓|雪|紅葉|花季|聖誕|紫藤|薰衣草/.test(text)) return 'season';
    if (/海島|沙灘|度假|渡假|SPA|溫泉/.test(text)) return 'relax';
    if (/五星|豪華|質感|米其林|精品/.test(text)) return 'quality';
    return 'natural';
  }
  function normalizeVariant(value) { const n = Number(value); return Number.isFinite(n) && n >= 1 ? ((n - 1) % 8) + 1 : 1; }
  function opener(style, variant) { const choices = OPENERS[style] || OPENERS.natural; return choices[(variant - 1) % choices.length]; }
  function lineText(d, style, variant) {
    const title = `【${clean(d.title)}${d.days && !clean(d.title).includes(d.days) ? ` ${d.days}` : ''}】`;
    const b = bullets(d, variant % 2 ? '✅' : '🔸');
    const url = valid(d.url) ? `\n\n🔗 完整行程：\n${d.url}` : '';
    const endings = ['有興趣歡迎私訊詢問！', '想了解名額或完整內容，歡迎找我。', '需要確認日期與席次，可以直接詢問。', '喜歡這個行程，記得先問問最新席位。'];
    const layouts = [
      `${opener(style, variant)}\n\n${title}\n\n${info(d)}\n\n${b}`,
      `${title}\n${opener(style, variant)}\n\n${b}\n\n${info(d)}`,
      `${opener(style, variant)}\n\n${b}\n\n${title}\n${info(d)}`,
      `${title}\n\n${info(d)}\n\n行程亮點：\n${b}`
    ];
    return `${layouts[(variant - 1) % layouts.length]}\n\n${FORMAT_NOTES[variant - 1]}${url}\n\n${endings[(variant - 1) % endings.length]}\n${contact(d)}`.trim();
  }
  function facebookText(d, style, variant) {
    const b = bullets(d, variant % 2 ? '✨' : '📍');
    const url = valid(d.url) ? `\n\n👉 查看完整行程：${d.url}` : '';
    const calls = ['喜歡這個行程嗎？歡迎留言或私訊詢問最新席位。', '想知道更多細節，直接私訊我幫你確認。', '出發日期與名額以官網最新資訊為準，歡迎詢問。', '把行程分享給旅伴，一起選個適合的日期出發！'];
    const body = [
      `${opener(style, variant)}\n\n【${d.title}】\n\n${b}\n\n${info(d)}`,
      `${opener(style, variant)}\n\n這次整理的是「${d.title}」\n\n行程亮點\n${b}\n\n${info(d)}`,
      `【${d.title}】\n\n${opener(style, variant)}\n\n${info(d)}\n\n值得期待的亮點：\n${b}`,
      `${opener(style, variant)}\n\n${b}\n\n行程：${d.title}\n${info(d)}`
    ][(variant - 1) % 4];
    return `${body}\n\n${FORMAT_NOTES[variant - 1]}${url}\n\n${calls[(variant - 1) % calls.length]}\n\n${contact(d)}`.trim();
  }
  function threadsText(d, style, variant) {
    const h = list(d).slice(0, 3).join('、') || d.subtitle || '行程亮點';
    const versions = [
      `${opener(style, variant)}\n\n${d.title}\n重點有 ${h}。\n${valid(d.price) ? d.price : ''} ${valid(d.dates) ? `｜${d.dates}` : ''}`,
      `看到「${h}」就忍不住多看兩眼。\n\n${d.title}\n${valid(d.airline) ? `${d.airline}｜` : ''}${valid(d.price) ? d.price : ''}\n${valid(d.dates) ? `出發日：${d.dates}` : ''}`,
      `最近有人也在找這類行程嗎？\n\n${d.title}\n有 ${h}\n${valid(d.price) ? `價格 ${d.price}` : ''}`,
      `如果只能先記三個重點：\n${list(d).slice(0, 3).map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n${d.title}\n${valid(d.dates) ? d.dates : ''}`,
      `${d.title}\n\n${opener(style, variant)}\n最吸引我的是 ${h}。\n${valid(d.price) ? d.price : ''}`,
      `這團先不講太多形容詞，直接看內容：\n\n${h}\n${valid(d.airline) ? d.airline : ''}\n${valid(d.dates) ? d.dates : ''}\n${valid(d.price) ? d.price : ''}`,
      `旅伴丟來這團，你會先看哪個？\n\n${h}\n\n${d.title}\n${valid(d.price) ? d.price : ''}`,
      `把這團放進候選清單了。\n\n${d.title}\n${h}\n${valid(d.airline) ? `${d.airline}，` : ''}${valid(d.dates) ? d.dates : ''}\n${valid(d.price) ? d.price : ''}`
    ];
    return versions[variant - 1].replace(/\n{3,}/g, '\n\n').trim();
  }
  function generateSet(data, requestedStyle = 'auto', variant = 1) {
    const normalized = { ...data, title: clean(data.title) || '行程名稱待確認' };
    const selectedStyle = detectStyle(normalized, requestedStyle), selectedVariant = normalizeVariant(variant);
    return { style: selectedStyle, variant: selectedVariant, line: lineText(normalized, selectedStyle, selectedVariant), facebook: facebookText(normalized, selectedStyle, selectedVariant), threads: threadsText(normalized, selectedStyle, selectedVariant) };
  }
  function install() {
    const byId = id => document.getElementById(id), styleSelect = byId('copyStyle'), variantSelect = byId('threadVariant');
    if (!styleSelect || !variantSelect || !byId('generateCopy')) return;
    styleSelect.innerHTML = Object.entries(STYLE_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    variantSelect.previousElementSibling.textContent = '文案版型';
    variantSelect.innerHTML = '<option value="auto">每次自動變化</option>' + Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}">版型 ${i + 1}</option>`).join('');
    let counter = 0;
    const readData = () => ({ url:byId('url').value.trim(), code:byId('code').value.trim(), days:byId('days').value.trim(), title:byId('mainTitle').value.trim(), subtitle:byId('subtitle').value.trim(), price:byId('price').value.trim(), airline:byId('airline').value.trim(), dates:byId('dates').value.trim(), highlights:byId('highlights').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean), contact:byId('contact').value.trim(), line:byId('line').value.trim() });
    const render = advance => {
      if (advance) {
        counter += 1;
        if (variantSelect.value !== 'auto') variantSelect.value = String((Number(variantSelect.value) % 8) + 1);
      }
      const requested = variantSelect.value === 'auto' ? (counter % 8) + 1 : Number(variantSelect.value), result = generateSet(readData(), styleSelect.value, requested);
      byId('lineOut').value=result.line; byId('fbOut').value=result.facebook; byId('threadsOut').value=result.threads;
      const status=byId('copyStatus'); status.textContent=`已產生：${STYLE_LABELS[result.style]}・版型 ${result.variant}`; status.className='status show ok';
      if (typeof globalThis.runCheck === 'function') globalThis.runCheck();
    };
    byId('generateCopy').textContent='產生三平台文案'; byId('generateCopy').onclick=()=>render(false);
    byId('regenThreads').textContent='換一組三平台文案'; byId('regenThreads').onclick=()=>render(true);
    styleSelect.onchange=()=>render(false); variantSelect.onchange=()=>render(false);
    ['url','code','days','mainTitle','subtitle','price','airline','dates','highlights','contact','line'].forEach(id=>byId(id).addEventListener('input',()=>render(false)));
    render(false);
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install(); }
  return { STYLE_LABELS, detectStyle, generateSet };
});
