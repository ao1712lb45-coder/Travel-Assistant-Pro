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
  const DECORATORS = ['━━ 旅遊精選 ━━', '✦ 行程亮點 ✦', '｜旅行提案｜', '〔本次推薦〕', '— 出發靈感 —', '✈ TRAVEL NOTE', '▸ 行程速報', '◆ 精選假期 ◆', '◌ 旅行清單 ◌', '【行程筆記】', '✧ 今日推薦 ✧', '旅 行 提 案', '⋯ READY TO GO ⋯'];
  const COPY_BLUEPRINTS = [
    ['最近整理行程時，這一團讓我停下來多看了一會。','景點、交通與日期安排得很清楚，適合先加入比較清單。','想確認最新席次，我可以協助查詢。'],
    ['下一趟旅行還沒決定去哪裡嗎？先看看這個選擇。','把旅途中值得期待的內容集中在一起，規劃起來更省心。','有興趣就先收藏，需要時直接找我。'],
    ['有些旅程光看名稱，就會讓人開始期待。','這次的重點不只是一個景點，而是整體行程的搭配。','想了解完整安排，歡迎傳訊息詢問。'],
    ['今天分享一個適合放進口袋名單的行程。','從出發資訊到主要亮點都整理好了，可以快速掌握全貌。','日期合適的話，可以先問問目前名額。'],
    ['如果你正在比較旅行團，這篇可以先存起來。','我把最常被問到的價格、日期、航空和景點一次列出。','需要比較其他日期，也可以交給我確認。'],
    ['旅行的開始，常常只是看到一個心動的地方。','這團把幾個受歡迎的體驗串在一起，內容相當充實。','想把心動變成出發，歡迎找我聊聊。'],
    ['假期有限，更要把時間留給真正想去的地方。','行程安排聚焦重要景點，不用自己從零開始做功課。','想知道適不適合你的假期，我可以協助評估。'],
    ['看到這個組合，我第一個想到的是「很適合揪旅伴」。','不同類型的亮點放在同一趟旅程裡，同行者都能找到期待。','把這篇傳給旅伴，再一起決定出發日。'],
    ['想換個地方生活幾天，這個行程值得參考。','不只是走景點，也能感受目的地不同的節奏與風景。','想看每日安排，完整網址已經附在下方。'],
    ['不用等到萬事俱備，先從挑一個喜歡的行程開始。','重要資訊已濃縮整理，適合忙碌時快速做決定。','有任何疑問，直接用 LINE 找我最快。'],
    ['這團最吸引人的地方，是亮點彼此搭配得剛剛好。','熱門內容與旅遊節奏都有兼顧，讀完就能想像旅程畫面。','想確認細節，我可以一項一項幫你查。'],
    ['正在找一趟不用煩惱太多細節的旅行嗎？','跟團安排能省下交通與銜接時間，把心力留給享受旅程。','有喜歡就先詢問，避免錯過合適日期。'],
    ['每次規劃旅行，我都會先看三件事：內容、日期和價格。','這團的重要條件已經整理在一起，方便直接比較。','若預算或日期有條件，也歡迎告訴我。'],
    ['這不是一篇華麗的廣告，而是一份實用行程筆記。','該知道的航空、出發日、售價與特色都沒有省略。','需要最新狀態時，我再幫你即時確認。'],
    ['旅行清單總要留一格，給意料之外的好選擇。','這個行程兼具經典景點與特色體驗，適合多看一眼。','覺得不錯就先存，想出發時再找我。'],
    ['如果今年只安排一次出國，你會把假期留給哪裡？','這團用有限天數串起多個重點，適合珍惜假期的人。','想比較同地區其他行程，也可以一起問。'],
    ['有時候選旅行，不是選最便宜，而是選最想回憶的。','行程內容決定旅程質感，這幾個亮點值得仔細看看。','想知道目前優惠與席次，歡迎私訊。'],
    ['分享給最近一直說「好想出國」的你。','從景點到交通都已有完整規劃，只差選定出發日期。','準備好排假時，記得先來確認名額。'],
    ['這趟旅程的重點，我幫你整理成最容易閱讀的版本。','不用在多個頁面來回找，核心資訊一次就能看懂。','完整內容在網址裡，有問題可以直接問我。'],
    ['旅行前的期待，往往從研究行程的那一刻就開始。','每一項亮點都代表旅程中的一段體驗，而不是只有打卡。','想進一步了解，我很樂意協助說明。'],
    ['如果你喜歡行程有重點、又不想自己安排交通，可以看看。','整體路線已經串接完成，適合想輕鬆出發的旅客。','把需求告訴我，我可以幫你判斷是否合適。'],
    ['今天不談空泛形容詞，直接把行程內容攤開來看。','景點、航班、日期與價格才是選團時真正重要的依據。','想核對官網最新資料，直接聯絡我。'],
    ['有些行程適合慢慢研究，這團則可以快速抓到重點。','資訊結構簡單明確，幾分鐘就能完成第一輪比較。','先把網址留下，需要時隨時回來看。'],
    ['選一趟旅行，也是在選接下來想收藏的回憶。','這組景點帶來不同層次的體驗，旅程內容不會太單一。','如果這正是你想找的，歡迎詢問。'],
    ['給正在規劃家庭、朋友或兩人旅行的你一個靈感。','行程亮點多元，能讓不同喜好的旅伴一起參與。','可以先分享到群組，再一起討論日期。'],
    ['價格重要，但每天去了哪裡、看了什麼同樣不能忽略。','我把團費與內容放在一起呈現，選擇時更有依據。','想看更詳細的每日行程，請點下方網址。'],
    ['把複雜的行程資料，整理成一篇看得懂的推薦。','你可以先看亮點，再依日期、航空和預算逐步確認。','需要我協助篩選，直接說你的條件即可。'],
    ['最近在找旅遊靈感的人，這團也許正好適合你。','有經典內容，也有值得期待的特色安排，整體相當完整。','先問不代表一定要訂，歡迎放心諮詢。'],
    ['當目的地選好了，下一步就是找到適合自己的走法。','這個路線已把主要景點串好，能減少自行規劃的負擔。','想比較不同走法，我可以提供更多選項。'],
    ['一趟好旅行，不一定塞滿行程，而是每一站都有意義。','這團的亮點清楚，能看出安排想帶給旅客的體驗。','喜歡這樣的節奏，可以先確認可售日期。'],
    ['你負責期待，我先幫你把旅遊資訊整理好。','從基本條件到內容特色都有列出，適合直接拿來討論。','有想調整的需求，也歡迎先告訴我。'],
    ['這篇送給不想再開十幾個分頁比較行程的人。','最關鍵的資料集中在同一處，省下搜尋與整理時間。','看完還有疑問，LINE 上直接問最方便。'],
    ['旅遊團百百種，真正適合自己的才值得選。','先從亮點與日期判斷，再確認價格和航空是否符合期待。','告訴我你的優先順序，我可以一起分析。'],
    ['有一種快樂，是終於把想去的地方排進行事曆。','這份行程已準備好主要路線，只需要選一個合適日期。','想讓計畫往前一步，就先來確認席次。'],
    ['今天的旅行提案，適合喜歡先看內容再做決定的人。','不靠誇張口號，而是用實際景點和資訊呈現價值。','完整資料都附上了，歡迎慢慢比較。'],
    ['如果旅伴問「這團到底有什麼」，把這篇傳給他就好。','主打內容、出發資訊和費用整理得一目了然。','討論完想進一步詢問，我一直都在。'],
    ['旅行不是逃離生活，而是替生活增加新的畫面。','這幾個行程亮點，能讓短短幾天留下豐富記憶。','想親自走進這些畫面，歡迎聯絡我。'],
    ['排假不容易，所以每一天的行程都值得仔細選。','路線是否順暢、景點是否喜歡，都比一時衝動更重要。','我可以協助你確認每日安排是否符合需求。'],
    ['這個行程適合先看亮點，再慢慢研究完整細節。','摘要讓你快速判斷喜不喜歡，官網則保留所有完整內容。','先看摘要、再點網址，有問題隨時問。'],
    ['正在猶豫要不要出發？先看看這團能帶來哪些體驗。','把抽象的旅行想像，轉成具體景點、日期與價格。','條件都合適時，就別讓想法只停在想法。'],
    ['一份好的推薦，應該讓你看完就知道適不適合。','因此我保留實際資訊，也把最有感的內容放在前面。','適合你就詢問，不適合也可以請我再找。'],
    ['今天想用一分鐘，帶你快速認識這趟旅程。','先掌握核心亮點，再看航班、日期與費用，不浪費時間。','想進入下一步，直接傳訊息給我即可。'],
    ['與其一直等完美時機，不如先找到值得期待的目的地。','這個行程提供一個清楚起點，讓旅行計畫更容易成形。','有合適假期時，歡迎先來詢問。'],
    ['這團不是只有目的地吸引人，內容組合也很有看點。','多個亮點彼此呼應，能讓旅程從早到晚都有記憶點。','想知道每一天怎麼走，請看完整行程。'],
    ['如果你習慣先做功課，這份整理可以幫你省一點時間。','必要資料與特色已分類呈現，方便核對自己的需求。','還缺哪項資訊，告訴我就能幫你補查。'],
    ['把今年想去的地方寫下來，也許這團就在清單裡。','從想法到成行，中間只差了解內容與確認日期。','想開始規劃，就從一則訊息開始。'],
    ['這是一個可以兼顧看風景、玩體驗與放鬆的選擇。','不同亮點交錯安排，讓整趟旅程有變化也有節奏。','想找內容均衡的行程，可以優先詢問。'],
    ['先別急著問哪一團最好，先看哪一團最適合你。','目的、預算、日期與喜好不同，答案自然也會不同。','把你的條件傳給我，我幫你一起篩選。'],
    ['旅程還沒開始，光是看行程就已經有一點期待。','這份整理把期待落實成景點、航班與可選日期。','若你也有感，歡迎把它加入候選。'],
    ['最後分享一個簡單原則：喜歡內容，再確認條件。','這團的內容與基本資訊都在下方，適不適合可以自己判斷。','看完想問什麼，直接聯絡我就好。']
  ].map(([opening, body, closing]) => ({ opening, body, closing }));
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
  function normalizeVariant(value) { const n = Number(value); return Number.isFinite(n) && n >= 1 ? ((n - 1) % 50) + 1 : 1; }
  function decorator(variant) { return DECORATORS[(variant - 1) % DECORATORS.length]; }
  function opener(style, variant) { const choices = OPENERS[style] || OPENERS.natural; return choices[(variant - 1) % choices.length]; }
  function blueprint(variant) { return COPY_BLUEPRINTS[(variant - 1) % COPY_BLUEPRINTS.length]; }
  function lineText(d, style, variant) {
    const script = blueprint(variant), title = `【${clean(d.title)}${d.days && !clean(d.title).includes(d.days) ? ` ${d.days}` : ''}】`;
    const b = bullets(d, variant % 2 ? '✅' : '🔸');
    const url = valid(d.url) ? `\n\n🔗 完整行程：\n${d.url}` : '';
    return `${decorator(variant)}\n${opener(style, variant)}\n${script.opening}\n\n${title}\n\n${script.body}\n\n${b}\n\n${info(d)}${url}\n\n${script.closing}\n${contact(d)}`.trim();
  }
  function facebookText(d, style, variant) {
    const script = blueprint(variant);
    const b = bullets(d, variant % 2 ? '✨' : '📍');
    const url = valid(d.url) ? `\n\n👉 查看完整行程：${d.url}` : '';
    return `${decorator(variant)}\n${script.opening}\n\n【${d.title}】\n\n${script.body}\n\n行程亮點\n${b}\n\n${info(d)}${url}\n\n${script.closing}\n\n${contact(d)}`.trim();
  }
  function threadsText(d, style, variant) {
    const script = blueprint(variant), h = list(d).slice(0, 3).join('、') || d.subtitle || '行程亮點';
    const url = valid(d.url) ? `🔗 完整行程：${d.url}` : '';
    const footer = [url, contact(d)].filter(Boolean).join('\n');
    return `${decorator(variant)}\n${script.opening}\n\n${script.body}\n\n${d.title}\n${h}\n${info(d)}\n\n${script.closing}${footer ? `\n\n${footer}` : ''}`.replace(/\n{3,}/g, '\n\n').trim();
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
    variantSelect.innerHTML = '<option value="auto">每次自動變化</option>' + Array.from({ length: 50 }, (_, i) => `<option value="${i + 1}">版型 ${i + 1}</option>`).join('');
    let counter = 0;
    const readData = () => ({ url:byId('url').value.trim(), code:byId('code').value.trim(), days:byId('days').value.trim(), title:byId('mainTitle').value.trim(), subtitle:byId('subtitle').value.trim(), price:byId('price').value.trim(), airline:byId('airline').value.trim(), dates:byId('dates').value.trim(), highlights:byId('highlights').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean), contact:byId('contact').value.trim(), line:byId('line').value.trim() });
    const render = (advance, target = 'all') => {
      if (advance) {
        counter += 1;
        if (variantSelect.value !== 'auto') variantSelect.value = String((Number(variantSelect.value) % 50) + 1);
      }
      const requested = variantSelect.value === 'auto' ? (counter % 50) + 1 : Number(variantSelect.value), result = generateSet(readData(), styleSelect.value, requested);
      if (target === 'all' || target === 'line') byId('lineOut').value=result.line;
      if (target === 'all' || target === 'facebook') byId('fbOut').value=result.facebook;
      if (target === 'all' || target === 'threads') byId('threadsOut').value=result.threads;
      const status=byId('copyStatus'); status.textContent=`已產生：${STYLE_LABELS[result.style]}・版型 ${result.variant}`; status.className='status show ok';
      if (typeof globalThis.runCheck === 'function') globalThis.runCheck();
    };
    byId('generateCopy').textContent='產生社群文案'; byId('generateCopy').onclick=()=>render(false);
    byId('regenLine').textContent='換一篇文案'; byId('regenLine').onclick=()=>render(true, 'all');
    if (byId('regenFacebook')) byId('regenFacebook').onclick=()=>render(true, 'facebook');
    if (byId('regenThreads')) { byId('regenThreads').textContent='換一篇 Threads'; byId('regenThreads').onclick=()=>render(true, 'threads'); }
    styleSelect.onchange=()=>render(false); variantSelect.onchange=()=>render(false);
    ['url','code','days','mainTitle','subtitle','price','airline','dates','highlights','contact','line'].forEach(id=>byId(id).addEventListener('input',()=>render(false)));
    render(false);
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install(); }
  return { STYLE_LABELS, COPY_BLUEPRINTS, detectStyle, generateSet };
});
