/* Travel Assistant Pro 1.1 - travel poster DM designer */
(function (global) {
  'use strict';

  function splitDates(value, limit = 6) {
    return String(value || '').match(/(?:20\d{2}[\/-])?\d{1,2}[\/-]\d{1,2}/g)?.slice(0, limit) || [];
  }
  function priceNumber(value) {
    const match = String(value || '').replace(/,/g, '').match(/\d{4,6}/);
    return match ? Number(match[0]) : 0;
  }
  const FONT_MAP = { microsoft:'Microsoft JhengHei, sans-serif', noto:'Noto Sans TC, Microsoft JhengHei, sans-serif', kai:'DFKai-SB, BiauKai, serif', arial:'Arial Black, Arial, sans-serif' };
  function safeFont(value) { return FONT_MAP[value] || FONT_MAP.microsoft; }
  function fitText(ctx, text, maxWidth, startSize, minSize, weight = 900, family = FONT_MAP.microsoft) {
    let size = startSize;
    do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; }
    while (size >= minSize && ctx.measureText(text).width > maxWidth);
    return size + 2;
  }
  function roundPath(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius); else ctx.rect(x, y, w, h);
  }
  function drawImageCover(ctx, image, x, y, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  }
  function drawPhoto(ctx, image, x, y, w, h, radius = 22) {
    ctx.save(); roundPath(ctx, x, y, w, h, radius); ctx.clip();
    if (image) drawImageCover(ctx, image, x, y, w, h);
    else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#87d8ff'); g.addColorStop(1, '#1667aa'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `900 ${Math.round(w * .16)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✈', x + w / 2, y + h / 2 - w * .08);
    }
    ctx.restore(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; roundPath(ctx, x, y, w, h, radius); ctx.stroke();
  }
  function loadFiles(files) {
    return Promise.all([...files].slice(0, 5).map(file => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = reject; reader.onload = () => {
        const image = new Image(); image.onerror = reject; image.onload = () => resolve(image); image.src = reader.result;
      }; reader.readAsDataURL(file);
    })));
  }

  global.TravelDmDesigner = { splitDates, priceNumber, safeFont };
  if (typeof module !== 'undefined') module.exports = { splitDates, priceNumber, safeFont };
  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), photoInput = $('photo'), makeButton = $('makeDm');
  if (!canvas || !photoInput || !makeButton) return;
  let photos = [];

  photoInput.onchange = async event => {
    const files = [...event.target.files].slice(0, 5);
    try {
      photos = await loadFiles(files);
      $('fileName').textContent = photos.length ? `已載入 ${photos.length} 張照片，可直接產生拼貼 DM。` : '未選照片時使用彩色旅遊圖形背景。';
      draw();
    } catch (_) { $('fileName').textContent = '有照片無法讀取，請改用 JPG 或 PNG。'; }
  };

  function values() {
    const lines = $('highlights').value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    return { title:$('dmHeadline').value.trim() || $('mainTitle').value.trim() || '精選旅遊行程', subtitle:$('dmSlogan').value.trim() || $('subtitle').value.trim(), code:$('code').value.trim(),
      airline:$('airline').value.trim() || '航空公司待確認', price:$('price').value.trim() || '價格待確認', dates:splitDates($('dates').value),
      highlights:lines.slice(0, 5), contact:$('contact').value.trim(), line:$('line').value.trim() };
  }
  function background(ctx, w, h) {
    const themes = { sunset:['#ff7a59','#ffcf67'], ocean:['#2b9bd8','#9ee7ff'], sakura:['#f287aa','#ffd5e3'], winter:['#4f91be','#e5f7ff'], luxury:['#171717','#b88b38'] };
    const colors = themes[$('theme').value] || themes.ocean;
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .22; ctx.fillStyle = '#fff';
    for (let i=0;i<9;i++){ctx.beginPath();ctx.arc((i%3)*w*.44, (i%4)*h*.27, w*.18, 0, Math.PI*2);ctx.fill();}
    ctx.globalAlpha = 1;
  }
  function collage(ctx, w, h) {
    const gap = 14, x = w*.50, y = h*.045, areaW = w*.455, areaH = h*.45;
    if ($('dmLayout').value === 'hero') { drawPhoto(ctx, photos[0], x, y, areaW, areaH, 28); return; }
    const cellW=(areaW-gap)/2, cellH=(areaH-gap)/2;
    drawPhoto(ctx,photos[0],x,y,cellW,cellH); drawPhoto(ctx,photos[1],x+cellW+gap,y,cellW,cellH);
    drawPhoto(ctx,photos[2],x,y+cellH+gap,cellW,cellH); drawPhoto(ctx,photos[3]||photos[0],x+cellW+gap,y+cellH+gap,cellW,cellH);
  }
  function pill(ctx, text, x, y, color, font) {
    ctx.font=`800 25px ${font}`; const width=Math.min(230,ctx.measureText(text).width+38);
    ctx.fillStyle=color; roundPath(ctx,x,y,width,48,18);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(text,x+width/2,y+9);ctx.textAlign='left';return width;
  }
  function draw() {
    const [w,h]=$('size').value.split('x').map(Number),ctx=canvas.getContext('2d'),d=values(),font=safeFont($('dmFont').value);
    canvas.width=w;canvas.height=h;background(ctx,w,h);ctx.textBaseline='top';
    collage(ctx,w,h);
    ctx.fillStyle='#fff';ctx.strokeStyle='#174276';ctx.lineWidth=12;ctx.lineJoin='round';
    const titleWidth=w*.44, titleSize=fitText(ctx,d.title,titleWidth,88,48,900,font);ctx.font=`900 ${titleSize}px ${font}`;
    const titleLines=[];let line='';for(const ch of d.title){if(ctx.measureText(line+ch).width>titleWidth&&line){titleLines.push(line);line=ch}else line+=ch;}if(line)titleLines.push(line);
    let ty=h*.075;titleLines.slice(0,3).forEach(text=>{ctx.strokeText(text,w*.055,ty);ctx.fillText(text,w*.055,ty);ty+=titleSize*1.08});
    ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.fillStyle='#f23867';ctx.font=`900 ${Math.round(titleSize*.78)}px ${font}`;
    const slogan=(d.subtitle||d.highlights.slice(0,2).join('・')||'精彩行程・安心暢玩').slice(0,18);ctx.strokeText(slogan,w*.06,ty+10);ctx.fillText(slogan,w*.06,ty+10);
    const cardY=h*.525,cardH=h-cardY-h*.09;ctx.fillStyle='rgba(255,255,255,.95)';roundPath(ctx,w*.025,cardY,w*.95,cardH,30);ctx.fill();
    ctx.fillStyle='#172033';ctx.font=`900 39px ${font}`;ctx.fillText(d.title,w*.06,cardY+34);
    ctx.font=`700 25px ${font}`;ctx.fillStyle='#344054';ctx.fillText(`✈ ${d.airline}　${d.code}`,w*.06,cardY+88);
    let px=w*.06,py=cardY+136;(d.highlights.length?d.highlights:['精選景點','特色餐食','安心服務']).slice(0,4).forEach((item,i)=>{const colors=['#e83d64','#f28b20','#1686c9','#55a630'];px+=pill(ctx,item.slice(0,8),px,py,colors[i%4],font)+12;if(px>w*.82){px=w*.06;py+=60;}});
    ctx.fillStyle='#d71920';const amount=priceNumber(d.price);ctx.font='900 86px Arial';ctx.textAlign='right';ctx.fillText(amount?amount.toLocaleString('en-US'):d.price,w*.93,cardY+220);ctx.font=`800 24px ${font}`;ctx.fillText(amount?'元起':'',w*.93,cardY+302);ctx.textAlign='left';
    const dates=d.dates.length?d.dates:['日期待確認'];let dx=w*.06,dy=cardY+225;ctx.font=`900 26px ${font}`;ctx.fillStyle='#fff';dates.slice(0,6).forEach((date,i)=>{const label=date.replace(/^20\d{2}[\/-]/,'').replace(/[\/-]/g,'/');ctx.fillStyle=['#ec476c','#ef8b22','#1686c9','#62a839','#8f62bc'][i%5];roundPath(ctx,dx,dy,125,56,14);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(label,dx+62,dy+13);dx+=137;if(dx>w*.54){dx=w*.06;dy+=66;}});ctx.textAlign='left';
    ctx.fillStyle='#0c6b52';ctx.fillRect(0,h-h*.075,w,h*.075);ctx.fillStyle='#fff';ctx.font=`900 31px ${font}`;ctx.fillText(d.contact||'喜鴻假期',w*.055,h-h*.057);ctx.textAlign='right';ctx.font='900 37px Arial';ctx.fillText('LINE '+(d.line||''),w*.945,h-h*.061);ctx.textAlign='left';
    $('downloadDm').disabled=false;const s=$('dmStatus');s.textContent=`DM 已完成：${photos.length} 張照片、旅行社拼貼版型，可下載 PNG。`;s.className='status show ok';
  }
  function progress(percent, text) {
    $('dmProgressBox').style.display='block';$('dmProgressBar').style.width=percent+'%';$('dmProgressBar').setAttribute('aria-valuenow',String(percent));
    $('dmProgressPercent').textContent=percent+'%';$('dmProgressText').textContent=text;
  }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function generateWithProgress() {
    makeButton.disabled=true;$('downloadDm').disabled=true;progress(10,'整理行程文字…');await pause(90);
    progress(35,'處理景點照片…');await pause(110);progress(65,'設計版面與色塊…');await pause(110);
    draw();progress(90,'輸出高解析度圖片…');await pause(100);progress(100,'DM 製作完成');makeButton.disabled=false;
  }
  makeButton.onclick=()=>{ if(typeof global.generateCopy==='function') global.generateCopy(); generateWithProgress(); };
  $('dmLayout').onchange=draw;
  $('dmFont').onchange=draw;
  ['dmHeadline','dmSlogan'].forEach(id=>$(id).addEventListener('input',draw));
  ['size','theme','highlightCount'].forEach(id=>$(id).addEventListener('change',draw));
  global.drawTravelPoster = draw;
})(typeof window !== 'undefined' ? window : globalThis);
