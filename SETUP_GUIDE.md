# GAS + ダッシュボード 実装ステップ（詳細版）

「Failed to fetch」エラーを解決するための完全実装ガイドです。

---

## ⚠️ よくある失敗パターン

### ❌ パターン1: GAS_API_URL を設定しただけで、GAS側をデプロイしていない

```javascript
// dashboard.js のこの行を設定しても...
const GAS_API_URL = "https://script.google.com/macros/s/...";
```

**必要な作業**: GAS を「ウェブアプリ」としてデプロイ

---

### ❌ パターン2: GAS側で CORS ヘッダを設定していない

GAS の `doGet()` で以下のヘッダが **必須**：

```javascript
.setHeader("Access-Control-Allow-Origin", "*")
```

---

### ❌ パターン3: ファイルパスが間違っている

HTML では相対パスで読み込む：

```html
<!-- ✓ 正しい -->
<script src="dashboard.js"></script>

<!-- ✗ 間違い -->
<script src="/dashboard.js"></script>
<script src="./dashboard.js"></script>
```

---

## 🚀 完全実装フロー

### フェーズ1: GAS側の実装（Google Apps Script）

#### ステップ1-1: GAS エディタを開く

1. Googleスプレッドシートを開く
2. メニュー > **拡張機能** > **Apps Script** をクリック
3. GAS エディタが開く

#### ステップ1-2: コードを貼り付け

`gas-implementation-guide.js` の **実装コード部分** をコピーして、GAS エディタに貼り付け：

```javascript
const SHEET_ID = "スプレッドシートID"; // ← 要変更
const DB_SHEET_NAME = "DB";
const SETTINGS_SHEET_NAME = "Settings";

function doGet(e) {
  const output = fetchAndParseData();
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");  // ← CORS設定
}

function fetchAndParseData() {
  // ... (残りの実装)
}

// ... (その他の関数)
```

**スプレッドシートID の取得方法**:
```
スプレッドシートの URL: https://docs.google.com/spreadsheets/d/[ID]/edit
                                                    ↑ この部分
```

#### ステップ1-3: 保存 & デプロイ

1. 上部の **保存** ボタンをクリック
2. メニュー > **デプロイ** をクリック
3. **新規デプロイ** ボタンをクリック
4. ダイアログが表示される：

```
【新規デプロイ】
タイプ:          Web アプリ
実行対象:        Me
アクセス権:      全員
```

5. **デプロイ** ボタンをクリック
6. **デプロイされたURL** が表示される：

```
デプロイメントID: [ID]
URL: https://script.google.com/macros/s/[ID]/usercontent
または
URL: https://script.google.com/macros/d/[ID]/usercontent
```

**このURLをメモしておく** ← 重要！

---

### フェーズ2: HTML/JS側の設定

#### ステップ2-1: GAS_API_URL を設定

`dashboard.js` の最初の方にある設定を変更：

**変更前**:
```javascript
const GAS_API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/usercontent";
```

**変更後** (ステップ1-3 でメモしたURLを使用):
```javascript
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxZhLQ38hytU05NimDksu1Y23fEhrYBJulyOMTB30qWPIov02-Zxgx4rYe60eJHk2g8eA/exec";
```

#### ステップ2-2: ファイルをアップロード

以下のファイルをWebサーバーにアップロード（同じフォルダに配置）：

```
dashboard.html         ← HTMLファイル
dashboard.js           ← JavaScriptファイル（GAS_API_URL 設定済み）
dashboard-style.css    ← スタイルシート
style.css              ← 共通スタイルシート
```

**配置例**:
```
https://yoursite.com/
├── dashboard.html
├── dashboard.js
├── dashboard-style.css
└── style.css
```

#### ステップ2-3: ブラウザで確認

1. ブラウザで `https://yoursite.com/dashboard.html` を開く
2. ローディング画面が表示される
3. データが読み込まれて戦績カードが表示される

---

## 🧪 テストと デバッグ

### テスト1: ダミーデータで動作確認

GAS APIが利用できない場合、ダミーデータで確認できます：

**dashboard.js で以下を変更**:
```javascript
const DEBUG_MODE = true;
const USE_DUMMY_DATA = true;  // ← true に変更
```

**期待される動作**:
- GAS へのリクエストが送信されない
- ダミーデータで戦績カードが表示される
- CSS/デザインが確認できる

### テスト2: ブラウザ開発者ツール でデバッグ

**F12** を押して開発者ツールを開く：

**Console タブ** で以下のコマンドを実行:
```javascript
console.log("GAS_API_URL:", GAS_API_URL);
console.log("DEBUG_MODE:", DEBUG_MODE);
console.log("USE_DUMMY_DATA:", USE_DUMMY_DATA);
```

**Network タブ** で:
1. ページを再読込（F5）
2. **exec** で始まるリクエストを探す
3. **Status** が **200** なら成功
4. **Status** が **❌** なら CORS エラーの可能性

---

## 🔍 よくあるエラーと解決方法

### エラー: 「Failed to fetch」

**原因と解決**:

| 原因 | 症状 | 解決方法 |
|---|---|---|
| GAS がデプロイされていない | Network Status が表示されない | GAS エディタで「新規デプロイ」 > 「Web アプリ」 |
| CORS ヘッダが設定されていない | Network Status が ❌ (red) | GAS の doGet() に `setHeader("Access-Control-Allow-Origin", "*")` を追加 |
| GAS_API_URL が誤っている | Network に リクエストが表示されない | ステップ1-3 でメモしたURLを再確認 |
| タイムアウト | Network Status が 00 | `API_TIMEOUT = 30000` に延長 |

### エラー: 「データの形式が正しくありません」

**原因**: GAS は成功（Status 200）だが、返されたJSONが不正

**デバッグ方法**:
```javascript
// ブラウザコンソールで実行
DEBUG_MODE = true;
// ページ再読込
```

**確認項目**:
- GAS ログでエラーを確認
- スプレッドシートの形式が正しいか確認
- DB シートと Settings シートが存在するか確認

---

## 📝 スプレッドシート データ形式

### DB シート

| Column | Header | データ例 |
|---|---|---|
| A | Season | 第14回前半 |
| B | Round | 1 |
| C | ID | 91 |
| D | Date | 2026/01/28 |
| E | Enemy | COL |
| F | G1_Player | そー |
| G | G1_Class | Nm |
| H | G1_Res | l |
| I | G1_E_Class | Nm |
| J | G1_E_Player | (空) |
| K | G2_Player | ヒヨぴー |
| L | G2_Class | R |
| ... | ... | ... |

### Settings シート

| Column | Header | データ例 |
|---|---|---|
| A | ClassID | E |
| B | ClassName | Elf |
| C | ClassAbbr | E |
| D | IconURL | https://example.com/elf.png |

---

## ✅ チェックリスト（実装完了時）

### GAS側
- [ ] `doGet()` 関数が実装されている
- [ ] `fetchAndParseData()` が定義されている
- [ ] `buildClassMap()` が定義されている
- [ ] `parseMatches()` が定義されている
- [ ] `setHeader("Access-Control-Allow-Origin", "*")` が設定されている
- [ ] スプレッドシート ID が正しく設定されている
- [ ] **「Web アプリ」としてデプロイされている**

### HTML/JS側
- [ ] `GAS_API_URL` がステップ1-3 のURLに設定されている
- [ ] `dashboard.js`, `dashboard.html`, `dashboard-style.css` が同じフォルダにある
- [ ] `#matches-container` と `#statistics-container` が dashboard.html に存在する
- [ ] Webサーバーにアップロードされている（または ローカルで テスト中）

### スプレッドシート
- [ ] **DB シート**が存在する
- [ ] **Settings シート** が存在する
- [ ] **ヘッダ行** が正しい
- [ ] **データ行** が1件以上存在する
- [ ] **Game列** のデータ形式が正しい（G1_Player, G1_Class, G1_Res, G1_E_Class, G1_E_Player）

### テスト完了
- [ ] ブラウザで `dashboard.html` を開くとローディング表示される
- [ ] 数秒後にデータが表示される
- [ ] 戦績カードが表示される
- [ ] 統計情報が表示される
- [ ] ブラウザコンソールにエラーがない

---

## 🎉 実装完了！

すべてのステップが完了したら、ダッシュボードは完全に動作します。

**次のステップ** (オプション):
- [ ] クラスアイコンの URL を Settings シートに追加
- [ ] フィルター機能を追加
- [ ] リアルタイム更新機能を追加
- [ ] 統計データの詳細ページを追加
