'use strict';

const crypto = require('node:crypto');

class GoogleDriveError extends Error {
  constructor(code, message, status = 500) { super(message); this.code = code; this.status = status; }
}

function driveConfig(env = process.env) {
  const clientId = String(env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
  const clientSecret = String(env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim();
  const refreshToken = String(env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim();
  const folderId = String(env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
  return { clientId, clientSecret, refreshToken, folderId,
    oauthReady:Boolean(clientId && clientSecret && folderId), configured:Boolean(clientId && clientSecret && refreshToken && folderId) };
}

async function responseJson(response, fallback) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { throw new GoogleDriveError('GOOGLE_DRIVE_RESPONSE', fallback, 502); }
}

async function accessToken(config, fetchImpl = fetch, code, redirectUri) {
  const body = new URLSearchParams({ client_id:config.clientId, client_secret:config.clientSecret,
    grant_type:code ? 'authorization_code' : 'refresh_token' });
  if (code) { body.set('code', code); body.set('redirect_uri', redirectUri); }
  else body.set('refresh_token', config.refreshToken);
  const response = await fetchImpl('https://oauth2.googleapis.com/token', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
  const payload = await responseJson(response, 'Google 授權服務回傳無法辨識的資料。');
  if (!response.ok || !payload.access_token) {
    const description = String(payload.error_description || payload.error || '授權失敗');
    throw new GoogleDriveError('GOOGLE_DRIVE_AUTH', `Google Drive 授權失敗：${description}`, 502);
  }
  return payload;
}

function oauthUrl(config, redirectUri, state) {
  if (!config.oauthReady) throw new GoogleDriveError('GOOGLE_DRIVE_NOT_READY','尚未設定 Google Drive OAuth 用戶端。',503);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id:config.clientId, redirect_uri:redirectUri, response_type:'code',
    access_type:'offline', prompt:'consent', scope:'https://www.googleapis.com/auth/drive', state }).toString();
  return url.href;
}

function stateToken(secret, now = Date.now()) {
  const timestamp = String(now), signature = crypto.createHmac('sha256', secret).update(timestamp).digest('base64url');
  return `${timestamp}.${signature}`;
}

function validState(value, secret, now = Date.now()) {
  const [timestamp, signature] = String(value || '').split('.');
  if (!/^\d+$/.test(timestamp) || now - Number(timestamp) > 10 * 60 * 1000 || Number(timestamp) > now + 60000) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('base64url');
  const left=Buffer.from(signature || ''), right=Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left,right);
}

async function authorized(config, fetchImpl) {
  if (!config.configured) throw new GoogleDriveError('GOOGLE_DRIVE_NOT_CONNECTED','Google Drive 尚未完成連接。',503);
  return (await accessToken(config,fetchImpl)).access_token;
}

async function createBackup(config, data, fetchImpl = fetch) {
  const trips = Array.isArray(data.trips) ? data.trips : [], clients = Array.isArray(data.clients) ? data.clients : [];
  if (!trips.length && !clients.length) throw new GoogleDriveError('EMPTY_BACKUP','沒有可備份的行程或 CRM 資料。',400);
  const createdAt = new Date().toISOString();
  const contents = Buffer.from(JSON.stringify({ version:1, createdAt, tripCount:trips.length, clientCount:clients.length, trips, clients }));
  const token = await authorized(config,fetchImpl);
  const filename = `travel-assistant-backup-${createdAt.replace(/[:.]/g,'-')}.json`;
  const start = await fetchImpl('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,createdTime,size', {
    method:'POST', headers:{ authorization:`Bearer ${token}`, 'content-type':'application/json; charset=UTF-8',
      'x-upload-content-type':'application/json', 'x-upload-content-length':String(contents.length) },
    body:JSON.stringify({ name:filename, mimeType:'application/json', parents:[config.folderId], description:`Travel Assistant 備份：${trips.length} 團、${clients.length} 位客戶` })
  });
  if (!start.ok || !start.headers.get('location')) {
    const detail=await responseJson(start,'無法建立 Google Drive 上傳工作。').catch(()=>({}));
    throw new GoogleDriveError('GOOGLE_DRIVE_UPLOAD',`Google Drive 無法開始備份：${detail.error?.message || `HTTP ${start.status}`}`,502);
  }
  const upload = await fetchImpl(start.headers.get('location'), { method:'PUT', headers:{'content-type':'application/json','content-length':String(contents.length)}, body:contents });
  const result = await responseJson(upload,'Google Drive 備份結果無法辨識。');
  if (!upload.ok) throw new GoogleDriveError('GOOGLE_DRIVE_UPLOAD',`Google Drive 備份失敗：${result.error?.message || `HTTP ${upload.status}`}`,502);
  return { ...result, createdAt, tripCount:trips.length, clientCount:clients.length };
}

async function listBackups(config, fetchImpl = fetch) {
  const token=await authorized(config,fetchImpl);
  const url=new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q',`'${config.folderId}' in parents and trashed = false and name contains 'travel-assistant-backup-'`);
  url.searchParams.set('orderBy','createdTime desc');url.searchParams.set('pageSize','50');url.searchParams.set('fields','files(id,name,createdTime,size,description)');
  const response=await fetchImpl(url,{headers:{authorization:`Bearer ${token}`}}), payload=await responseJson(response,'Google Drive 備份清單無法辨識。');
  if(!response.ok)throw new GoogleDriveError('GOOGLE_DRIVE_LIST',`Google Drive 備份清單讀取失敗：${payload.error?.message || `HTTP ${response.status}`}`,502);
  return payload.files || [];
}

async function readBackup(config, id, fetchImpl = fetch) {
  if(!/^[\w-]{10,200}$/.test(String(id||'')))throw new GoogleDriveError('INVALID_BACKUP_ID','備份檔案代碼無效。',400);
  const allowed=(await listBackups(config,fetchImpl)).some(file=>file.id===id);
  if(!allowed)throw new GoogleDriveError('BACKUP_NOT_FOUND','指定的 Google Drive 備份不存在。',404);
  const token=await authorized(config,fetchImpl),response=await fetchImpl(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{authorization:`Bearer ${token}`}});
  const payload=await responseJson(response,'Google Drive 備份內容無法辨識。');
  if(!response.ok)throw new GoogleDriveError('GOOGLE_DRIVE_DOWNLOAD',`Google Drive 備份下載失敗：${payload.error?.message || `HTTP ${response.status}`}`,502);
  if(!Array.isArray(payload.trips)||!Array.isArray(payload.clients))throw new GoogleDriveError('INVALID_BACKUP','備份格式不完整，已停止還原。',422);
  return payload;
}

module.exports={GoogleDriveError,driveConfig,accessToken,oauthUrl,stateToken,validState,createBackup,listBackups,readBackup};
