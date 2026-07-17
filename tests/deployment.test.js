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
    assert.match(await authorized.text(), /旅遊助手V1\.0/);
    const assistant = await fetch(`${base}/src/local-assistant.js`, { headers:{ authorization:basic('team','secret') } });
    assert.equal(assistant.status, 200);
    assert.match(await assistant.text(), /免費內建助手/);
    assert.equal(authorized.headers.get('x-frame-options'), 'DENY');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
