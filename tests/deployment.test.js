'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer, isAuthorized } = require('../server');

function basic(user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}

test('authorization is optional when no deployment password is configured', () => {
  assert.equal(isAuthorized({ headers:{} }, 'team', ''), true);
});

test('authorization accepts only the configured team credentials', () => {
  assert.equal(isAuthorized({ headers:{ authorization:basic('team','secret') } }, 'team', 'secret'), true);
  assert.equal(isAuthorized({ headers:{ authorization:basic('team','wrong') } }, 'team', 'secret'), false);
});

test('online deployment protects the app but leaves health checks available', async () => {
  const server = createServer({ appUser:'team', appPassword:'secret', fetchImpl:async()=>{ throw new Error('not used'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const unauthorized = await fetch(`${base}/`);
    assert.equal(unauthorized.status, 401);
    assert.match(unauthorized.headers.get('www-authenticate'), /Basic/);

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).data.protected, true);

    const authorized = await fetch(`${base}/`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(authorized.status, 200);
    const page = await authorized.text();
    assert.match(page, /marketing-suite\.js/);
    assert.match(page, /enterprise-proposal\.js/);
    assert.match(page, /bulk-itinerary-import\.js/);
    assert.match(page, /crm\.js/);
    assert.match(page, /v2-ui\.js/);
    assert.ok(page.indexOf('crm.js') < page.indexOf('app-shell.js'), 'CRM must load before the workspace reads its sections');
    const marketing = await fetch(`${base}/src/marketing-suite.js`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(marketing.status, 200);
    const marketingScript = await marketing.text();
    assert.match(marketingScript, /一鍵產生全部素材/);
    assert.match(marketingScript, /已複製目前素材/);
    const bulkImport = await fetch(`${base}/src/bulk-itinerary-import.js`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(bulkImport.status, 200);
    const bulkImportScript = await bulkImport.text();
    assert.match(bulkImportScript, /addTourCodeField/);
    assert.match(bulkImportScript, /count>=7/);
    assert.match(bulkImportScript, /extra-tour-code/);
    assert.match(bulkImportScript, /bulkProgressBar/);
    assert.match(bulkImportScript, /withTimeout\(task,20000/);
    assert.match(bulkImportScript, /stopBulkImport/);
    assert.match(page, /data-tab="lineOut">社群文案/);
    assert.match(page, /id="regenLine">換一篇文案/);
    assert.doesNotMatch(page, /data-tab="fbOut">Facebook/);
    assert.doesNotMatch(page, /data-tab="threadsOut">Threads/);
    assert.match(page, /id="quickRegionSync"/);
    assert.match(page, /data-region="日本">日本全部/);
    assert.match(page, /data-region="中西歐">中西歐全部/);
    const recommendation = await fetch(`${base}/src/recommendation.js`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(recommendation.status, 200);
    const recommendationScript = await recommendation.text();
    assert.match(recommendationScript, /stopSync/);
    assert.match(recommendationScript, /travelerType/);
    assert.match(recommendationScript, /avoidSlopes/);
    const workbench = await fetch(`${base}/src/sales-workbench.js`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(workbench.status, 200);
    assert.match(await workbench.text(), /parseCustomerMessage/);
    const shell = await fetch(`${base}/src/app-shell.js`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(shell.status, 200);
    const shellScript = await shell.text();
    assert.match(shellScript, /sections\.length < 9/);
    assert.match(shellScript, /DOMContentLoaded', install/);
    assert.equal(authorized.headers.get('x-frame-options'), 'DENY');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
