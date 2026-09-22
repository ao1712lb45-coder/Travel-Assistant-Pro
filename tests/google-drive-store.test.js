'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {driveConfig,stateToken,validState,oauthUrl}=require('../google-drive-store');

test('Google Drive config requires refresh token before backup is connected',()=>{
  const partial=driveConfig({GOOGLE_DRIVE_CLIENT_ID:'id',GOOGLE_DRIVE_CLIENT_SECRET:'secret',GOOGLE_DRIVE_FOLDER_ID:'folder'});
  assert.equal(partial.oauthReady,true);assert.equal(partial.configured,false);
  assert.equal(driveConfig({GOOGLE_DRIVE_CLIENT_ID:'id',GOOGLE_DRIVE_CLIENT_SECRET:'secret',GOOGLE_DRIVE_FOLDER_ID:'folder',GOOGLE_DRIVE_REFRESH_TOKEN:'refresh'}).configured,true);
});

test('Google Drive OAuth state is signed and expires',()=>{
  const state=stateToken('secret',100000);assert.equal(validState(state,'secret',100001),true);
  assert.equal(validState(state,'wrong',100001),false);assert.equal(validState(state,'secret',100000+11*60*1000),false);
});

test('Google Drive authorization requests offline access',()=>{
  const url=new URL(oauthUrl({oauthReady:true,clientId:'client'},'https://app.example/callback','state'));
  assert.equal(url.searchParams.get('access_type'),'offline');assert.equal(url.searchParams.get('prompt'),'consent');
  assert.match(url.searchParams.get('scope'),/\/auth\/drive/);
});
