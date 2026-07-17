# Besttour／ITTMS 行程網址自動抓取

## 支援網址

- `https://www.besttour.com.tw/itinerary/團號`
- `https://besttour.com.tw/itinerary/團號`
- `https://itinerary.ittms.com.tw/?travel_no=團號&agt_no=業務代碼`

ITTMS 網址的 `agt_no` 會依本專案固定規則統一改為 `3004C5`。系統不會把官網 API 回傳的旅行社聯絡資料匯入文案，聯絡方式仍使用程式設定中的資料。

## 使用方式

1. 安裝 Node.js 18 或更新版本。
2. 雙擊 `START_SERVER.bat`，或在專案資料夾執行 `npm start`。
3. 瀏覽器開啟 `http://127.0.0.1:4173`。
4. 在首頁貼上 Besttour 或 ITTMS 的單一行程網址。
5. 按「自動抓取並解析」。

系統會透過官方行程資料介面取得行程名稱、最低售價、所有可見出發日期、航空公司、航班與行程亮點，再填入既有文案與 DM 工作區。

## 安全與錯誤處理

- 只接受 HTTPS，且只允許 `besttour.com.tw`、`www.besttour.com.tw`、`itinerary.ittms.com.tw`。
- 不接受首頁、外部網站或缺少團號的網址。
- 官網逾時、下架、資料格式異常時會顯示明確錯誤，仍可使用「貼上官網整頁文字」備援。
- 單次回傳資料上限為 2 MB，逾時上限為 15 秒。
- 舊版 `/api/besttour/fetch` 保留相容；新版前端使用 `/api/itinerary/fetch`。

## 已知限制

- 必須透過 `START_SERVER.bat` 啟動；直接雙擊 `index.html` 無法跨網站讀取官網。
- 出發日期以官方行事曆 API 當下回傳的可見資料為準，官網變更後需重新抓取。
- 若官方 API 暫時無回應，系統不會猜測價格、日期或航空公司。
