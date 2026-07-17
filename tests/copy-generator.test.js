const test = require('node:test');
const assert = require('node:assert/strict');
const { detectStyle, generateSet } = require('../src/copy-generator.js');
const trip = { title:'東京親子歡樂5日', days:'5日', price:'35,900元起', airline:'星宇航空', dates:'2026/07/26、2026/08/02', highlights:['東京迪士尼','水蜜桃吃到飽','螃蟹吃到飽'], url:'https://www.besttour.com.tw/itinerary/TYO05JX260726PJ', contact:'喜鴻假期－ㄚ喜', line:'0988894313' };
test('auto style detects family trips',()=>assert.equal(detectStyle(trip,'auto'),'family'));
test('fifty variants produce different copy sets',()=>{const out=Array.from({length:50},(_,i)=>generateSet(trip,'natural',i+1));assert.equal(new Set(out.map(x=>x.line)).size,50);assert.equal(new Set(out.map(x=>x.facebook)).size,50);assert.equal(new Set(out.map(x=>x.threads)).size,50)});
test('Threads excludes URL and contact',()=>{const out=generateSet(trip,'deal',3).threads;assert.doesNotMatch(out,/https?:\/\//);assert.doesNotMatch(out,/0988894313/)});
test('copy does not invent unsupported claims',()=>{const out=generateSet(trip,'professional',6);const all=out.line+out.facebook+out.threads;assert.match(all,/東京迪士尼/);assert.match(all,/星宇航空/);assert.doesNotMatch(all,/保證出團|限量席次|不拉車/)});
