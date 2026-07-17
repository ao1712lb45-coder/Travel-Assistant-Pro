# Travel Assistant Pro

旅行社官網行程解析、完整內容搜尋、社群文案與客戶需求配對工具。

## 1.1.0 開發版

- Besttour 單一行程網址自動抓取與解析
- 安全的本機抓取代理（只允許 Besttour 行程頁）
- 官網導回首頁、逾時、非 HTML、內容過大及欄位不足等錯誤處理
- 團號、目的地、天數、價格、日期、航空與亮點解析
- 手動貼上官網整頁文字備援
- 自動更新 LINE、Facebook 與 Threads 文案
- Node.js 自動測試

## 使用方式

1. 安裝 Node.js 18 或更新版本。
2. 雙擊 `START_SERVER.bat`。
3. 開啟 `http://127.0.0.1:4173`。
4. 貼上 Besttour 單一行程網址。
5. 按「自動抓取並解析」。
6. 發布前人工確認資料。

直接開啟 `index.html` 時仍可使用手動貼文字備援。

## 測試

`npm test`

詳細設計與限制請見 [Besttour 行程網址自動抓取](docs/BESTTOUR_URL_FETCH.md)。
