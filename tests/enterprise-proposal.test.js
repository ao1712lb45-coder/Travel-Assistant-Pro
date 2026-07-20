'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { buildEnterpriseEmail }=require('../src/enterprise-proposal.js');
test('builds one enterprise email from multiple selected trips',()=>{
  const result=buildEnterpriseEmail([
    {code:'FUK05BR261206FU',title:'九州五日',days:'5日',airline:'長榮航空',dates:'2026/12/6',price:'37,900元起',highlights:['高千穗峽'],url:'https://example.com/a'},
    {code:'PUS05BX261002J',title:'釜山五日',days:'5日',airline:'釜山航空',dates:'2026/10/2',price:'29,900元起',highlights:['海雲台'],url:'https://example.com/b'}
  ],{company:'範例科技',recipient:'王小姐',sender:'喜鴻假期－ㄚ喜',line:'0988894313'});
  assert.match(result.subject,/範例科技/);assert.match(result.body,/王小姐 您好/);assert.match(result.body,/針對 範例科技/);assert.match(result.body,/以下 2 個/);assert.match(result.body,/九州五日/);assert.match(result.body,/釜山五日/);assert.match(result.body,/釜山航空/);assert.match(result.body,/0988894313/);
});
test('omits unknown facts from enterprise email',()=>{const result=buildEnterpriseEmail([{title:'測試行程',price:'官網目前未顯示',airline:'待確認'}]);assert.doesNotMatch(result.body,/官網目前未顯示|待確認/)});
test('refreshes an automatically generated subject when company changes',()=>{const result=buildEnterpriseEmail([{title:'測試行程'}],{company:'新公司',subject:'員工旅遊精選行程提案｜舊公司'});assert.equal(result.subject,'員工旅遊精選行程提案｜新公司');assert.equal((result.subject.match(/新公司/g)||[]).length,1)});
