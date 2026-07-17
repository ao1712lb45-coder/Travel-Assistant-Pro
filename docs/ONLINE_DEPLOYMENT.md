# Travel Assistant Pro 線上部署

此專案已可部署為 Render Node.js Web Service。同事不需要安裝 Node.js，只要開啟 Render 提供的網址並輸入團隊帳號密碼。

## 第一次部署

1. 前往 <https://dashboard.render.com/select-repo?type=iac> 並使用 GitHub 登入。
2. 選擇 `ao1712lb45-coder/Travel-Assistant-Pro`。
3. Render 會讀取根目錄的 `render.yaml`。
4. 在 `APP_PASSWORD` 欄位輸入團隊共用密碼。請勿把密碼寫進 GitHub。
5. 確認建立 Blueprint，等待部署完成。
6. 完成後會取得類似 `https://travel-assistant-pro-ao1712.onrender.com` 的網址。
7. 將網址、帳號 `team` 與密碼分開傳給同事。

## 日後更新

`develop/1.1.0` 分支每次推送新版本後，Render 會自動重新部署。部署期間舊版本仍可繼續使用。

## 密碼與安全

- `APP_USER` 預設為 `team`，可在 Render 的 Environment 頁面修改。
- `APP_PASSWORD` 只存放在 Render，不會出現在程式碼中。
- `/api/health` 不需要密碼，供 Render 判斷服務是否正常；其他頁面與 API 都需要登入。
- 若有人離職或不再需要使用，請在 Render 更換 `APP_PASSWORD`。

## 免費方案限制

Render 免費 Web Service 閒置一段時間後會休眠，第一次開啟可能需要約一分鐘喚醒。瀏覽器內的行程資料庫仍儲存在每位使用者自己的裝置中，目前不會自動共用。

## 本機測試密碼保護

PowerShell：

```powershell
$env:APP_USER='team'
$env:APP_PASSWORD='你的測試密碼'
npm start
```

未設定 `APP_PASSWORD` 時，本機版維持免密碼模式。
