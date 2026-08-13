'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {firebaseConfig}=require('../firebase-store');

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
