## シャドウバース BO9 戦績ダッシュボード - 実装ガイド

このドキュメントは、GASから取得したJSONデータをHTML上でリスト表示する実装の**完全ガイド**です。

---

## 📋 プロジェクト概要

**目的**: Googleスプレッドシートで管理しているシャドウバースのチーム戦績データを、Webサイト上のモダンな「eスポーツ風リザルト画面」として表示する。

**システム構成**:
```
Googleスプレッドシート（DB）
        ↓
Google Apps Script（doGet関数でJSON配信）
        ↓
HTML/JavaScript/CSS（ダッシュボード表示）
```

---

## 🛠️ 実装ファイル

### 1. **gas-implementation-guide.js**
- **役割**: GAS側の実装ガイド＋サンプルコード
- **用途**: Google Apps Script エディタにコピー＆ペーストして実装
- **主要関数**:
  - `doGet()` : Webアプリとしてリクエストを受け付ける
  - `fetchAndParseData()` : スプレッドシートからデータを取得
  - `buildClassMap()` : クラス情報のマッピングを作成
  - `parseMatches()` : Game1~9のデータをパース

### 2. **dashboard.js**
- **役割**: フロントエンド JavaScriptロジック
- **用途**: HTMLから読み込まれ、GAS APIと通信してデータ表示
- **主要機能**:
  - `dashboardInit()` : 初期化＆データ取得
  - `fetchDataFromGAS()` : GAS APIからJSON取得
  - `renderMatchCards()` : 戦績カード生成
  - `createMatchCard()` : 1つのマッチカード生成
  - `createGameCell()` : Game1~9のセル生成
  - `renderStatistics()` : 統計情報計算＆表示

### 3. **dashboard.html**
- **役割**: ダッシュボードページのHTML構造
- **用途**: Webサイト内の隠しページとして配置
- **構成**:
  - ヘッダーナビゲーション
  - ダッシュボードタイトル
  - 統計情報エリア（`#statistics-container`）
  - 戦績カード一覧（`#matches-container`）

### 4. **dashboard-style.css**
- **役割**: ダッシュボード用スタイルシート
- **デザイン**: e-sports公式配信風ダークテーマ
- **主要クラス**:
  - `.match-card` : マッチカード
  - `.game-cell` : Game1~9のセル
  - `.stat-card` : 統計情報カード
  - `.game-result-win` / `.game-result-loss` : 勝敗色分け

---

## 🚀 セットアップ手順

### ステップ 1: Google Apps Script 実装

1. Google スプレッドシートを開く
2. メニュー > **拡張機能** > **Apps Script** をクリック
3. エディタが開いたら、`gas-implementation-guide.js` の実装コード部分をコピー
4. 以下を変更:
   ```javascript
   const SHEET_ID = "YOUR_SPREADSHEET_ID"; // スプレッドシートのID
   const DB_SHEET_NAME = "DB";             // DBシート名
   const SETTINGS_SHEET_NAME = "Settings"; // 設定シート名
   ```
5. **保存** をクリック
6. メニュー > **デプロイ** > **新規デプロイ** をクリック
7. **タイプ** で "Web アプリ" を選択
8. **実行** で "Me" を選択
9. **アクセス** で "全員" を選択（外部アクセス許可）
10. **デプロイ** ボタンをクリック
11. 表示された **デプロイメントURL** をコピー

**例**: `https://script.google.com/macros/d/ABC123DEF456.../usercontent`

### ステップ 2: HTML/JS ファイル設定

1. `dashboard.js` を開く
2. 以下の行を見つける:
   ```javascript
   const GAS_API_URL = "https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent";
   ```
3. **YOUR_SCRIPT_ID** の部分を、ステップ1でコピーしたURLに置き換える:
   ```javascript
   const GAS_API_URL = "https://script.google.com/macros/d/ABC123DEF456.../usercontent";
   ```

### ステップ 3: ファイルをWebサーバーに配置

以下のファイルをWebサーバーに アップロード:
- `dashboard.html`
- `dashboard.js`
- `dashboard-style.css`
- `style.css` （既存）

例: `https://yoursite.com/dashboard.html`

### ステップ 4: テスト

ブラウザで `https://yoursite.com/dashboard.html` にアクセス

✅ 戦績カードが表示されれば成功！

---

## 📊 データ構造詳細

### Googleスプレッドシート - DB シート

| ID | Season | Round | Date | Enemy | Game1 | Game2 | ... | Game9 |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 2025-02-01 | Enemy Team A | Player1\|E\|w\|W\|Enemy1 | Player2\|R\|l\|B\|Enemy2 | ... | Player3\|D\|w\|R\|Enemy3 |
| 2 | 1 | 2 | 2025-02-08 | Enemy Team B | Player1\|W\|w\|E\|Enemy4 | ... | ... | ... |

**Game列のデータ形式**: `自選手|自クラス|勝敗|敵クラス|敵選手`

例:
- `Player1|E|w|W|Enemy1` = Player1（Elf）が勝利、相手はWitch（Enemy1）
- `Player2|R|l|B|Enemy2` = Player2（Rune）が敗北、相手はBishop（Enemy2）

### Googleスプレッドシート - Settings シート

| ClassID | ClassName | ClassAbbr | IconURL |
|---|---|---|---|
| 1 | Elf | E | https://example.com/elf.png |
| 2 | Rune | R | https://example.com/rune.png |
| 3 | Witch | W | https://example.com/witch.png |
| ... | ... | ... | ... |

---

## 🔄 API レスポンス形式

GAS から返されるJSON:

```json
{
  "success": true,
  "timestamp": "2025-02-02T10:30:00.000Z",
  "matches": [
    {
      "id": 1,
      "season": 1,
      "round": 1,
      "date": "2025-02-01",
      "enemy": "Enemy Team A",
      "games": [
        {
          "gameNumber": 1,
          "myPlayer": "Player1",
          "myClass": "E",
          "myClassInfo": {
            "id": "E",
            "name": "Elf",
            "abbr": "E",
            "iconUrl": "https://example.com/elf.png"
          },
          "result": "w",
          "enemyClass": "W",
          "enemyClassInfo": {
            "id": "W",
            "name": "Witch",
            "abbr": "W",
            "iconUrl": "https://example.com/witch.png"
          },
          "enemyPlayer": "Enemy1"
        },
        ...
      ]
    },
    ...
  ],
  "totalMatches": 5
}
```

---

## 📈 JavaScript 処理フロー

```
ページ読込
    ↓
dashboardInit() 実行
    ↓
showLoadingState() - ローディング表示
    ↓
fetchDataFromGAS() - GAS APIからデータ取得
    ↓
renderMatchCards() - 戦績カード生成・表示
    ├→ createMatchCard() - マッチカード HTML生成
    │   └→ createGameCell() - Game1~9 セル HTML生成
    └→ renderStatistics() - 統計情報計算・表示
         ├→ 総合勝率
         ├→ Form（直近5試合）
         ├→ Clutch Factor（Game9までもつれた場合の勝率）
         └→ 総試合数
```

---

## ⚙️ 主要な関数と処理

### 1. **fetchDataFromGAS()**
GAS APIにフェッチリクエストを送信し、JSONデータを取得

```javascript
async function fetchDataFromGAS() {
  // GAS_API_URL にリクエスト
  // タイムアウト処理: 10秒
  // 成功 → レスポンスJSON を return
  // 失敗 → エラーメッセージ を throw
}
```

### 2. **renderMatchCards(matches)**
試合配列を ループして、各試合のカード要素を生成

```javascript
function renderMatchCards(matches) {
  matches.forEach((match, index) => {
    const card = createMatchCard(match, index);
    container.appendChild(card); // DOM に追加
  });
}
```

### 3. **createGameCell(game, gameIdx)**
1つのゲーム結果を HTML文字列として生成（Game1~9）

```javascript
function createGameCell(game, gameIdx) {
  // 構成:
  // - ゲーム番号（G1~G9）
  // - 勝敗表示（W/L）
  // - 自選手情報（名前 + クラスアイコン）
  // - VS
  // - 敵選手情報（名前 + クラスアイコン）
}
```

### 4. **renderStatistics(matches)**
全試合から統計情報を計算して表示

計算内容:
- **Overall Win Rate**: 全ゲームの勝率
- **Form（直近5試合）**: 最新5ゲームの勝敗
- **Clutch Factor**: Game9までもつれた試合での勝率
- **Total Matches**: 試合数・総ゲーム数

---

## 🎨 CSSのポイント

### ダークテーマカラー
- **背景**: `#0a0a0a` （黒）
- **カード背景**: `#1a1a1a` （濃いグレー）
- **アクセント**: `#D4AF37` （ゴールド）
- **勝利**: `#4ade80` （緑）
- **敗北**: `#ef4444` （赤）

### レイアウト
- **マッチカード**: グリッド形式（最小幅400px、自動折り返し）
- **ゲームセル**: 3列グリッド（Game1~9）
- **統計情報**: 4カラム（レスポンシブ）

### レスポンシブ対応
- タブレット（768px以下）: マッチカード 1列
- スマートフォン（480px以下）: 全要素 1列 + フォントサイズ縮小

---

## 🔧 トラブルシューティング

### 問題1: "データの取得に失敗しました"
**原因**: GAS APIのURL が誤っている、または GAS がデプロイされていない

**解決方法**:
1. `dashboard.js` の `GAS_API_URL` を確認
2. GAS が "Web アプリ" としてデプロイされているか確認
3. アクセス権が "全員" に設定されているか確認

### 問題2: CORS エラーが表示される
**原因**: ブラウザの CORS ポリシーによってリクエストがブロックされている

**解決方法**:
- GAS の `doGet()` 関数で以下のヘッダを設定していることを確認:
  ```javascript
  .setHeader("Access-Control-Allow-Origin", "*")
  ```

### 問題3: ゲーム結果が表示されない
**原因**: スプレッドシートの Game列データ形式が正しくない

**解決方法**:
- Game列のデータが `自選手|自クラス|勝敗|敵クラス|敵選手` 形式であるか確認
- 空白やパイプの数が正しいか確認

### 問題4: クラスアイコンが表示されない
**原因**: Settings シートの IconURL が空か無効なURL

**解決方法**:
- Settings シート で すべてのクラスに有効な IconURL が設定されているか確認
- 画像URLが HTTPS で始まっているか確認（混合コンテンツエラー防止）

---

## 🔐 セキュリティ設定

### GAS側
1. **CORS 許可**: `"*"` で全域からのアクセスを許可
   - 本番環境では特定のドメインに限定することを推奨
   ```javascript
   .setHeader("Access-Control-Allow-Origin", "https://yoursite.com")
   ```

2. **データ公開範囲**: 現在のコードは全戦績が公開される
   - 非公開情報の場合は 認証機能を追加

### HTML側
1. **XSS対策**: ユーザー入力は無いため、現状では問題なし
2. **HTTPS**: 本番環境では HTTPS で運用してください

---

## 📱 マルチデバイス対応

- **デスクトップ**: 3列のマッチカード + Game1~9を3列×3行で表示
- **タブレット**: 2列のマッチカード
- **スマートフォン**: 1列のマッチカード + Game1~9を3列で表示

CSS で `@media (max-width: ...)` によるレスポンシブ対応済み

---

## 🚀 拡張機能のアイデア

- [ ] フィルター機能（シーズン別・プレイヤー別）
- [ ] ソート機能（勝率・日付）
- [ ] プレイヤー詳細統計（個人勝率・クラス別成績）
- [ ] グラフ表示（勝敗推移）
- [ ] CSVエクスポート機能
- [ ] リアルタイム更新（WebSocket / Server-Sent Events）
- [ ] ダークモード/ライトモード切り替え
- [ ] スマートフォン向けアプリ化（PWA）

---

## 📞 サポート

実装に関する質問や問題がある場合は、以下を確認してください:

1. **console.log()** でエラーメッセージを確認（ブラウザの開発者ツール）
2. **Network タブ** で GAS APIレスポンスを確認
3. **スプレッドシート データ** の形式が正しいか確認
4. **GAS ログ** を確認（Apps Script エディタ > ログ）

---

**最終更新**: 2025-02-02  
**バージョン**: 1.0.0
