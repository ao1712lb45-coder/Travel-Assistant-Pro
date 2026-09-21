'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {firebaseConfig,toCloudStoreError}=require('../firebase-store');

test('Firebase is configured only when all server credentials exist',()=>{
  assert.equal(firebaseConfig({FIREBASE_PROJECT_ID:'travel-assistant-pro-a2a5e'}).configured,false);
  const config=firebaseConfig({FIREBASE_PROJECT_ID:'travel-assistant-pro-a2a5e',FIREBASE_CLIENT_EMAIL:'firebase-admin@example.iam.gserviceaccount.com',FIREBASE_PRIVATE_KEY:'line1\\nline2'});
  assert.equal(config.configured,true);
  assert.equal(config.provider,'firebase');
  assert.equal(config.privateKey,'line1\nline2');
});

test('Firebase configuration never exposes an entire downloaded JSON value',()=>{
  const config=firebaseConfig({FIREBASE_SERVICE_ACCOUNT_JSON:'secret-json'});
  assert.equal(config.configured,false);
  assert.equal(Object.values(config).includes('secret-json'),false);
});

test('Firebase operational failures become safe actionable messages',()=>{
  const permission=toCloudStoreError({code:7,message:'sensitive upstream details'});
  assert.equal(permission.code,'FIREBASE_PERMISSION_DENIED');
  assert.match(permission.message,/權限不足/);
  assert.doesNotMatch(permission.message,/sensitive/);
  assert.equal(toCloudStoreError({code:16}).code,'FIREBASE_AUTH_FAILED');
  assert.equal(toCloudStoreError({code:8}).code,'FIREBASE_QUOTA_EXCEEDED');
});
