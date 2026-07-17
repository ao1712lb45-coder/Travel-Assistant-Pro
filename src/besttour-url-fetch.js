/* Travel Assistant Pro 1.1.0 - Besttour URL workflow */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const urlInput = $('url');
  const openButton = $('openUrl');
  if (!urlInput || !openButton) return;

  const fetchButton = document.createElement('button');
  fetchButton.id = 'fetchBesttour';
  fetchButton.className = 'primary';
  fetchButton.textContent = '自動抓取並解析';
  openButton.parentElement.insertBefore(fetchButton, openButton);

  const message = document.createElement('div');
  message.id = 'urlFetchStatus';
  message.className = 'status';
  openButton.parentElement.parentElement.appendChild(message);

  function show(text, type) {
    message.textContent = text;
    message.className = 'status show ' + (type || 'warn');
  }

  function setValue(id, value) {
    const element = $(id);
    if (element) element.value = value == null ? '' : value;
  }

  function applyResult(result, pageText) {
    setValue('rawText', pageText);
    setValue('url', result.url);
    setValue('code', result.code);
    setValue('days', result.days ? result.days + '日' : '');
    setValue('mainTitle', result.title);
    setValue('subtitle', result.subtitle);
    setValue('price', result.price);
    setValue('airline', result.airline);
    setValue('dates', result.dates.join('、'));
    setValue('highlights', result.highlights.join('\n'));

    const missing = Object.entries(result.confidence).filter(([, ok]) => !ok).map(([key]) => key);
    const generator = $('generateCopy');
    const dm = $('makeDm');
    if (generator) generator.click();
    if (dm) dm.click();
    return missing;
  }

  fetchButton.addEventListener('click', async () => {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return show('請先貼上 Besttour 單一行程網址。', 'warn');
    fetchButton.disabled = true;
    fetchButton.textContent = '正在讀取官網…';
    show('正在連線 Besttour 並確認行程內容，請稍候。', 'warn');
    try {
      const response = await fetch('/api/besttour/fetch?url=' + encodeURIComponent(rawUrl), { headers: { accept: 'application/json' } });
      let payload;
      try { payload = await response.json(); }
      catch { throw new Error('代理服務回應格式不正確。'); }
      if (!response.ok || !payload.ok) throw new Error(payload.error && payload.error.message || '官網讀取失敗。');
      if (!window.TravelAssistantParser) throw new Error('行程解析器尚未載入。');
      const result = window.TravelAssistantParser.parse({ url: payload.data.finalUrl, text: payload.data.text });
      if (!result.code || result.code !== payload.data.requestedCode) throw new Error('官網內容與網址團號不一致，已停止套用。');
      const missing = applyResult(result, payload.data.text);
      show(missing.length ? '已抓取，但部分欄位未確認：' + missing.join('、') + '。請人工檢查。' : '已完成官網抓取、解析、文案與 DM 更新。', missing.length ? 'warn' : 'ok');
    } catch (error) {
      const localFile = location.protocol === 'file:';
      show((localFile ? '請使用 START_SERVER.bat 啟動自動抓取功能。' : error.message) + ' 仍可使用下方「貼上官網整頁文字」備援。', 'err');
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = '自動抓取並解析';
    }
  });
})();
