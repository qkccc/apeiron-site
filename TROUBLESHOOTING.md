# ダッシュボード トラブルシューティング

## 🔴 「データの取得に失敗しました: Failed to fetch」エラー

このエラーが表示された場合の診断と解決方法を説明します。

---

## 📋 原因の特定手順

### ステップ1: ブラウザ開発者ツールでエラーを確認

1. ブラウザの **F12** キーを押す（開発者ツール起動）
2. **Console** タブを開く
3. **Network** タブを開く
4. ページを再度読み込み（F5）
5. **Network** タブで `exec` で始まるリクエストを探す

表示される情報：
```
Request URL: https://script.google.com/macros/s/.../exec
Method: GET
Status: ❌ (red) またはタイムアウト
```

---

## 🔧 原因別の解決方法

### 原因1️⃣: GAS APIのURLが無効

**症状**:
- Network タブで **Status が 404** または表示されない
- Console に `Failed to fetch` のみ表示

**確認方法**:
```javascript
// ブラウザコンソールで実行
console.log("GAS_API_URL:", GAS_API_URL);
```

**解決方法**:

1. Google Apps Script エディタを開く
2. メニュー > **デプロイ** を確認
3. 以下のいずれかが原因の可能性：
   - ✗ ウェブアプリがデプロイされていない
   - ✗ デプロイが削除されている
   - ✗ ユーザーがスクリプトの実行権限を失った

**対処**:
```
1. GAS エディタで再度 デプロイ を実行
2. 「新規デプロイ」> タイプ「Web アプリ」を選択
3. 実行として「Me」、アクセス「全員」を指定
4. デプロイして新しいURLを取得
5. dashboard.js の GAS_API_URL を更新
```

---

### 原因2️⃣: CORS エラー（ブラウザのセキュリティ）

**症状**:
- Console に **CORS エラー**が表示
- Network タブで **Status が ❌ (red)**
- Request Headers に `Origin` が見える

**エラー例**:
```
Access to fetch at 'https://script.google.com/...' from origin 'https://yoursite.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present 
on the requested resource.
```

**解決方法**:

GAS側で CORS ヘッダを設定する必要があります。

**GAS のコード修正**:

```javascript
// Google Apps Script エディタで以下を確認

function doGet(e) {
  const output = fetchAndParseData();
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")  // ← この行が重要
    .setHeader("Access-Control-Allow-Methods", "GET");
}
```

---

### 原因3️⃣: タイムアウト（APIが遅い）

**症状**:
- Network タブで **Status が 00** （タイムアウト表示）
- Console に `APIリクエストがタイムアウトしました` メッセージ

**原因**:
- スプレッドシートが大きすぎる
- ネットワーク接続が遅い
- GAS の実行に時間がかかっている

**解決方法**:

```javascript
// dashboard.js で タイムアウト時間を延長

const API_TIMEOUT = 30000; // 30秒に延長（デフォルト: 10秒）
```

---

### 原因4️⃣: GAS側で doGet 関数が実装されていない

**症状**:
- Network タブで **Status が 204（No Content）** または **500（Internal Server Error）**
- GAS ログに エラーが表示

**確認方法**:
```
GAS エディタ > ログ（または Execution log）を確認
```

**解決方法**:

1. GAS エディタ で `gas-implementation-guide.js` のコードをコピー
2. 以下を実装していることを確認：
   ```javascript
   function doGet(e) { ... }
   function fetchAndParseData() { ... }
   function buildClassMap(settingsData) { ... }
   function parseMatches(dbData, classMap) { ... }
   ```
3. スプレッドシート ID を正しく設定
4. 保存 > デプロイ

---

### 原因5️⃣: スプレッドシートのデータが読み込めない

**症状**:
- Network タブで **Status が 200**（成功）
- しかし Console に `データの形式が正しくありません` メッセージ

**確認方法**:
```javascript
// ブラウザコンソールでデバッグ
DEBUG_MODE = true;  // デバッグモード有効化
// ページ再読込
```

**解決方法**:

GAS ログで実際のエラーを確認：
```
1. GAS エディタを開く
2. メニュー > 実行ログ を確認
3. 以下を確認:
   - DB シートが存在するか
   - Settings シートが存在するか
   - ヘッダ行が正しいか
```

---

## 🧪 デバッグモードの有効化

より詳しいエラー情報を得るには、デバッグモードを有効にします：

**dashboard.js の設定**:
```javascript
// ページ最初の方にある設定を変更

DEBUG_MODE = true;      // デバッグモード有効
USE_DUMMY_DATA = false; // ダミーデータ無効（まずは本物のAPIでテスト）
```

**変更後**:
- ブラウザコンソール（F12）により詳しいログが表示される
- Network タブで レスポンスの全内容が見える

---

## 🔄 ダミーデータでテスト

GAS APIが利用できない場合、ダミーデータで見た目をテストできます：

**dashboard.js の設定**:
```javascript
DEBUG_MODE = true;
USE_DUMMY_DATA = true;  // ダミーデータを使用
```

**変更後**:
- GAS API へのリクエストが送信されず
- ダミーデータでダッシュボードが表示される
- CSS/デザインの確認に便利

---

## 🛠️ チェックリスト

実装時に以下を確認してください：

### GAS側
- [ ] `doGet()` 関数が実装されている
- [ ] `setHeader("Access-Control-Allow-Origin", "*")` が設定されている
- [ ] スプレッドシート ID（`SHEET_ID`）が正しい
- [ ] DB シートと Settings シートが存在する
- [ ] ウェブアプリとしてデプロイされている（新規デプロイ）

### HTML/JS側
- [ ] `GAS_API_URL` が正しく設定されている
- [ ] `dashboard.js` が `dashboard.html` で読み込まれている
- [ ] `#matches-container` と `#statistics-container` が存在する

### スプレッドシート
- [ ] **DB シート**:
  - ヘッダ: Season, Round, ID, Date, Enemy, G1_Player, G1_Class, G1_Res, ...
  - データ行が存在する
- [ ] **Settings シート**:
  - ヘッダ: ClassID, ClassName, ClassAbbr, IconURL
  - 全クラス情報が入力されている

---

## 📞 さらにサポートが必要な場合

### コンソールログをコピー

開発者ツール > Console タブ内のすべてのログをコピーして、以下の情報と一緒に報告：

```
【報告内容】
1. エラーメッセージ
2. Network タブの Status
3. Console ログ全文
4. GAS ログ（Apps Script エディタから）
5. スプレッドシートのスクリーンショット（ヘッダ行）
```

これでほぼ全てのエラーを特定できます。

