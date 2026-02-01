/**
 * ============================================================================
 * Google Apps Script (GAS) - doGet関数 実装ガイド
 * ============================================================================
 * 
 * 【概要】
 * Googleスプレッドシートのデータを JSON形式で外部に配信するGAS関数です。
 * Web APIとして機能し、HTMLからfetchで呼び出すことで戦績データを取得できます。
 * 
 * 【セットアップ手順】
 * 1. Google Apps Script エディタを開く（スプレッドシートメニュー > 拡張機能 > Apps Script）
 * 2. 下記コードをコピーして実装する
 * 3. 「デプロイ」をクリック > 「新規デプロイ」> タイプ「Web アプリ」を選択
 * 4. 実行として「Me」、アクセス権「全員」を指定してデプロイ
 * 5. デプロイされたURLをメモ（HTMLでfetch時に使用）
 * 6. 変更時は新バージョンとして再デプロイ
 * 
 * 【データ構造】
 * DB シート:
 *   列: ID | Season | Round | Date | Enemy | Game1 | Game2 | ... | Game9
 *   行: 試合ごとのデータ（2行目以降）
 * 
 * Settings シート:
 *   列: ClassID | ClassName | ClassAbbr | IconURL
 *   行: クラスマスタデータ
 * 
 * ============================================================================
 */

/**
 * =====================================================================
 * GAS側の実装コード（コピー用）
 * =====================================================================
 */

/*
// Google Apps Script エディタに貼り付けるコード

const SHEET_ID = "YOUR_SPREADSHEET_ID"; // 対象スプレッドシートのID
const DB_SHEET_NAME = "DB";           // 戦績データシート
const SETTINGS_SHEET_NAME = "Settings"; // クラス設定シート

// CORS対応のレスポンスヘッダを返す
function doGet(e) {
  const output = fetchAndParseData();
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

// スプレッドシートからデータを読み込み、JSON形式で返す
function fetchAndParseData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // DBシートを取得
  const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
  const dbData = dbSheet.getDataRange().getValues();
  
  // Settingsシートを取得
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  const settingsData = settingsSheet.getDataRange().getValues();
  
  // クラス情報をマッピング（ClassID => クラス情報）
  const classMap = buildClassMap(settingsData);
  
  // DBデータを解析して試合配列を生成
  const matches = parseMatches(dbData, classMap);
  
  // レスポンス形式
  return {
    success: true,
    timestamp: new Date().toISOString(),
    matches: matches,
    totalMatches: matches.length
  };
}

// Settings データからクラスマッピングを作成
// 形式: { "E": { name: "Elf", abbr: "E", iconUrl: "..." }, ... }
function buildClassMap(settingsData) {
  const map = {};
  
  // ヘッダ行をスキップ（1行目）し、2行目以降をループ
  for (let i = 1; i < settingsData.length; i++) {
    const row = settingsData[i];
    // [ClassID, ClassName, ClassAbbr, IconURL]
    const classId = row[0];
    const className = row[1];
    const classAbbr = row[2];
    const iconUrl = row[3];
    
    map[classAbbr] = {
      id: classId,
      name: className,
      abbr: classAbbr,
      iconUrl: iconUrl
    };
  }
  
  return map;
}

// DB データを解析して試合配列を生成
// CSV構造: Season, Round, ID, Date, Enemy, G1_Player, G1_Class, G1_Res, G1_E_Class, G1_E_Player, 
//          G2_Player, G2_Class, G2_Res, G2_E_Class, G2_E_Player, ... G9_Player, G9_Class, ...
// つまり Game1~9 が各5列ずつ（合計45列）
function parseMatches(dbData, classMap) {
  const matches = [];
  
  // ヘッダ行をスキップし、2行目以降をループ
  for (let i = 1; i < dbData.length; i++) {
    const row = dbData[i];
    
    // 基本情報（最初の5列）
    const match = {
      id: row[0],                  // ID
      season: row[1],              // Season
      round: row[2],               // Round
      date: row[3],                // Date
      enemy: row[4],               // Enemy
      games: []                    // Game1~9の配列
    };
    
    // Game1~9: 各ゲームは5列構成（Player, Class, Result, E_Class, E_Player）
    // Game1: 5-9列目 (row[5], row[6], row[7], row[8], row[9])
    // Game2: 10-14列目 (row[10], row[11], row[12], row[13], row[14])
    // ...
    // Game9: 40-44列目 (row[40], row[41], row[42], row[43], row[44])
    
    for (let gameIndex = 0; gameIndex < 9; gameIndex++) {
      const baseColIndex = 5 + (gameIndex * 5);
      const myPlayer = row[baseColIndex];     // GX_Player
      const myClass = row[baseColIndex + 1];  // GX_Class
      const result = row[baseColIndex + 2];   // GX_Res
      const enemyClass = row[baseColIndex + 3]; // GX_E_Class
      const enemyPlayer = row[baseColIndex + 4]; // GX_E_Player (基本空)
      
      // プレイヤー名があればゲーム結果として記録
      if (myPlayer && String(myPlayer).trim() !== "") {
        match.games.push({
          gameNumber: gameIndex + 1,          // 1~9
          myPlayer: String(myPlayer).trim(),  // 自選手名
          myClass: myClass ? String(myClass).trim() : "",   // 自クラス略称
          myClassInfo: classMap[myClass] || {}, // クラス詳細情報
          result: result ? String(result).toLowerCase().trim() : "", // "w" or "l"
          enemyClass: enemyClass ? String(enemyClass).trim() : "", // 敵クラス略称
          enemyClassInfo: classMap[enemyClass] || {}, // 敵クラス詳細情報
          enemyPlayer: enemyPlayer ? String(enemyPlayer).trim() : "" // 敵選手名（基本空）
        });
      }
    }
    
    matches.push(match);
  }
  
  return matches;
}

// このファイル終了
*/

/**
 * =====================================================================
 * レスポンス例
 * =====================================================================
 */

/*
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
*/

export { };
