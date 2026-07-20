/* Travel Assistant Pro 1.1.0 - Besttour / ITTMS URL workflow */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const urlInput = $('url');
  const codeInput = $('tourCodeInput');
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

  function show(text, type) { message.textContent = text; message.className = 'status show ' + (type || 'warn'); }
  function setValue(id, value) { const element = $(id); if (element) element.value = value == null ? '' : value; }
  function applyResult(result, pageText, normalizedUrl) {
    setValue('rawText', pageText); setValue('url', normalizedUrl); setValue('tourCodeInput', result.code); setValue('code', result.code);
    setValue('days', result.days ? result.days + '日' : ''); setValue('mainTitle', result.title); setValue('subtitle', result.subtitle);
    setValue('price', result.price); setValue('airline', result.airline); setValue('dates', result.dates.join('、'));
    setValue('highlights', result.highlights.join('\n'));
    const missing = Object.entries(result.confidence).filter(([, ok]) => !ok).map(([key]) => key);
    if ($('generateCopy')) $('generateCopy').click();
    return missing;
  }

  fetchButton.addEventListener('click', async () => {
    const rawUrl = (codeInput && codeInput.value.trim()) || urlInput.value.trim();
    if (!rawUrl) return show('請輸入團號，或貼上 Besttour／ITTMS 的單一行程網址。', 'warn');
    fetchButton.disabled = true; fetchButton.textContent = '正在讀取官網…';
    show('正在讀取官方行程、出發日期、價格與航班資料…', 'warn');
    try {
      const response = await fetch('/api/itinerary/fetch?url=' + encodeURIComponent(rawUrl), { headers: { accept: 'application/json' } });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('伺服器回傳格式無法辨識。'); }
      if (!response.ok || !payload.ok) throw new Error(payload.error && payload.error.message || '官網讀取失敗。');
      if (!window.TravelAssistantParser) throw new Error('行程解析模組尚未載入。');
      const result = window.TravelAssistantParser.parse({ url: payload.data.finalUrl, text: payload.data.text });
      if (!result.code || result.code !== payload.data.requestedCode) throw new Error('官網回傳的團號與網址不一致，已停止匯入。');
      const copyUrl = payload.data.fields && payload.data.fields.lowestPriceUrl || payload.data.finalUrl;
      const missing = applyResult(result, payload.data.text, copyUrl);
      const providerName = payload.data.provider === 'ittms' ? 'ITTMS' : 'Besttour';
      const dates = payload.data.fields && payload.data.fields.dates ? payload.data.fields.dates.length : result.dates.length;
      show(missing.length ? `${providerName} 已匯入 ${dates} 個出發日期；請人工確認：${missing.join('、')}` : `${providerName} 已完成解析，共匯入 ${dates} 個出發日期，社群文案已更新。`, missing.length ? 'warn' : 'ok');
    } catch (error) {
      const localFile = location.protocol === 'file:';
      show((localFile ? '請雙擊 START_SERVER.bat 後再使用自動抓取。' : error.message) + ' 仍可使用下方「貼上官網整頁文字」備援。', 'err');
    } finally { fetchButton.disabled = false; fetchButton.textContent = '自動抓取並解析'; }
  });
  if (codeInput) codeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); fetchButton.click(); }
  });
  if (codeInput) codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (codeInput.value) urlInput.value = '';
  });
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim() && codeInput) codeInput.value = '';
  });
})();
