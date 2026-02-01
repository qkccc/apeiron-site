/**
 * ============================================================================
 * dashboard.js - シャドウバース BO9 戦績ダッシュボード
 * ============================================================================
 * 
 * 【機能】
 * - GAS APIからJSON形式の戦績データを取得
 * - Game1~9のデータを解析・整形
 * - e-sports風ダークテーマで戦績カードを動的生成・表示
 * - 勝敗統計・好調度（Form）・クラッチファクターを動的計算
 * 
 * 【使用方法】
 * 1. HTMLファイルで <script src="dashboard.js"></script> で読み込み
 * 2. ページ読込時に dashboardInit() が自動実行される
 * 3. GAS APIのURLを設定して、データ取得が開始される
 * 
 * ============================================================================
 */

// ============================================================================
// グローバル設定
// ============================================================================

// GAS デプロイメントURL(変更必要)
// GAS側で「デプロイ > ウェブアプリ」として取得したURLを設定
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxZhLQ38hytU05NimDksu1Y23fEhrYBJulyOMTB30qWPIov02-Zxgx4rYe60eJHk2g8eA/exec";
// API取得時のタイムアウト(ミリ秒)
const API_TIMEOUT = 10000;

// デバッグモード(ローカルテスト時はtrueに変更)
const DEBUG_MODE = false;
const USE_DUMMY_DATA = false;

// クラスアイコンマッピング(ローカル icon/)
const CLASS_ICONS = {
    "E": "icon/class_E.png",
    "R": "icon/class_R.png",
    "W": "icon/class_W.png",
    "D": "icon/class_D.png",
    "Ni": "icon/class_Ni.png",
    "B": "icon/class_B.png",
    "Nm": "icon/class_Nm.png",
    "Nc": "icon/class_Nc.png",
    "V": "icon/class_V.png"
};

const CLASS_NAMES = {
    "E": "エルフ",
    "R": "ロイヤル",
    "W": "ウィッチ",
    "D": "ドラゴン",
    "Ni": "ナイトメア",
    "B": "ビショップ",
    "Nm": "ネメシス",
    "Nc": "ネクロマンサー",
    "V": "ヴァンパイア"
};

// グローバル変数: 全データとフィルター用
let allMatchesData = [];
let currentSeasonFilter = "all";

// ============================================================================
// ページ読込時の初期化
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    dashboardInit();
});

/**
 * ダッシュボード初期化関数
 * ページ読込時に自動実行される
 */
async function dashboardInit() {
    console.log("Dashboard initializing...");

    // ローディング表示
    showLoadingState();

    try {
        // GAS APIからデータを取得
        const apiData = await fetchDataFromGAS();

        if (apiData && apiData.success && apiData.matches) {
            // データ取得成功
            console.log(`Fetched ${apiData.matches.length} matches`);

            // グローバル変数に保存
            allMatchesData = apiData.matches;

            // シーズンフィルターを生成
            renderSeasonFilter(allMatchesData);

            // 戦績カードを生成・表示
            renderMatchCards(allMatchesData);

            // 統計情報を計算・表示
            renderStatistics(allMatchesData);
        } else {
            showErrorState("データの形式が正しくありません");
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showErrorState("データの取得に失敗しました: " + error.message);
    }
}

// ============================================================================
// GAS API データ取得
// ============================================================================

/**
 * GAS APIからデータを取得
 * @returns {Promise<Object>} APIレスポンス（JSON）
 */
async function fetchDataFromGAS() {
    console.log(`Fetching from GAS: ${GAS_API_URL}`);

    // ダミーデータ使用モード（デバッグ用）
    if (USE_DUMMY_DATA) {
        console.warn("⚠️ ダミーデータを使用しています");
        return getDummyData();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const response = await fetch(GAS_API_URL, {
            method: "GET",
            signal: controller.signal,
            headers: {
                "Accept": "application/json"
            }
        });

        clearTimeout(timeoutId);

        if (DEBUG_MODE) {
            console.log(`Response Status: ${response.status}`);
            console.log(`Response Headers:`, response.headers);
        }

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (DEBUG_MODE) {
            console.log("API Response:", data);
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        if (DEBUG_MODE) {
            console.error("Fetch Error Details:", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }

        if (error.name === "AbortError") {
            throw new Error("APIリクエストがタイムアウトしました（" + API_TIMEOUT + "ms）");
        }

        throw error;
    }
}

// ============================================================================
// シーズンフィルター
// ============================================================================

/**
 * シーズンフィルターのドロップダウンを生成
 * @param {Array} matches - 全試合データ
 */
function renderSeasonFilter(matches) {
    const filterContainer = document.getElementById("season-filter-container");
    if (!filterContainer) {
        console.warn("season-filter-container element not found");
        return;
    }

    // ユニークなシーズン一覧を取得
    const seasons = [...new Set(matches.map(m => m.season))].sort();

    // ドロップダウン生成
    const selectHTML = `
        <label for="season-select">シーズン: </label>
        <select id="season-select" class="season-select">
            <option value="all">すべて</option>
            ${seasons.map(season => `<option value="${season}">${season}</option>`).join("")}
        </select>
    `;

    filterContainer.innerHTML = selectHTML;

    // イベントリスナー設定
    const selectElement = document.getElementById("season-select");
    selectElement.addEventListener("change", (e) => {
        currentSeasonFilter = e.target.value;
        filterAndRenderMatches();
    });
}

/**
 * フィルタリングして再描画
 */
function filterAndRenderMatches() {
    const filteredMatches = currentSeasonFilter === "all"
        ? allMatchesData
        : allMatchesData.filter(m => m.season === currentSeasonFilter);

    renderMatchCards(filteredMatches);
    renderStatistics(filteredMatches);
}

// ============================================================================
// 戦績カード表示
// ============================================================================

/**
 * 戦績カードを生成・表示
 * @param {Array} matches - 試合データの配列
 */
function renderMatchCards(matches) {
    const container = document.getElementById("matches-container");

    if (!container) {
        console.warn("matches-container element not found");
        return;
    }

    // コンテナをクリア
    container.innerHTML = "";

    // 各試合ごとにカードを生成
    matches.forEach((match, index) => {
        const matchCard = createMatchCard(match, index);
        container.appendChild(matchCard);
    });

    // ローディング状態を解除
    hideLoadingState();
}

/**
 * 1つの戦績カードのDOM要素を生成
 * @param {Object} match - 試合データ
 * @param {Number} index - 試合インデックス
 * @returns {HTMLElement} カードのDOM要素
 */
function createMatchCard(match, index) {
    // 勝敗統計を計算
    const stats = calculateGameStats(match.games);

    // カードのコンテナ（div）を作成
    const card = document.createElement("div");
    card.className = "match-card";
    card.setAttribute("data-match-id", match.id);

    // 背景色を勝敗で決定（BO9での勝率が高い方を背景色）
    const cardBgClass = stats.totalWins > stats.totalLosses ? "bg-win" : "bg-loss";
    card.classList.add(cardBgClass);

    // カードのHTML構造を生成
    card.innerHTML = `
    <div class="match-card-header">
      <div class="match-info">
        <h3 class="match-title">#${index + 1} Round ${match.round}</h3>
        <p class="match-date">${formatDate(match.date)} vs ${match.enemy}</p>
      </div>
      <div class="match-result">
        <span class="result-badge ${stats.totalWins > stats.totalLosses ? 'win' : 'loss'}">
          ${stats.totalWins} - ${stats.totalLosses}
        </span>
      </div>
    </div>
    
    <div class="match-card-body">
      <div class="games-grid">
        ${match.games.map((game, gameIdx) => createGameCell(game, gameIdx)).join("")}
      </div>
    </div>
    
    <div class="match-card-footer">
      <div class="game-stats">
        <span class="stat-item">
          <strong>Win Rate:</strong> ${((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100).toFixed(1)}%
        </span>
        <span class="stat-item">
          <strong>Games:</strong> ${match.games.length} / 9
        </span>
      </div>
    </div>
  `;

    return card;
}

/**
 * 1つのゲーム結果のセルHTMLを生成（Game1~9）
 * @param {Object} game - ゲームデータ
 * @param {Number} gameIdx - ゲームインデックス（0~8）
 * @returns {String} セルのHTML
 */
function createGameCell(game, gameIdx) {
    // クラスアイコンURL（ローカルマッピングを優先）
    const myClassIcon = CLASS_ICONS[game.myClass] || game.myClassInfo?.iconUrl || null;
    const enemyClassIcon = CLASS_ICONS[game.enemyClass] || game.enemyClassInfo?.iconUrl || null;
    const myClassName = CLASS_NAMES[game.myClass] || game.myClass;
    const enemyClassName = CLASS_NAMES[game.enemyClass] || game.enemyClass;

    // 勝敗に応じたCSSクラス（"w" or "l" のみ有効）
    const resultClass = game.result === "w" ? "game-result-win" : (game.result === "l" ? "game-result-loss" : "");
    const resultText = game.result === "w" ? "W" : (game.result === "l" ? "L" : "?");
    const resultColor = game.result === "w" ? "#4ade80" : (game.result === "l" ? "#ef4444" : "#707070"); // 緑 / 赤 / グレー

    return `
    <div class="game-cell ${resultClass}" data-game-number="${game.gameNumber}">
      <div class="game-header">
        <span class="game-number">G${game.gameNumber}</span>
        <span class="game-result" style="color: ${resultColor}; font-weight: bold;">
          ${resultText}
        </span>
      </div>
      
      <div class="game-body">
        <!-- 自選手情報 -->
        <div class="player-info my-player">
          <div class="player-name">${game.myPlayer || "?"}</div>
          <div class="player-class">
            ${myClassIcon
            ? `<img src="${myClassIcon}" alt="${game.myClass}" class="class-icon" title="${myClassName}">`
            : `<span class="class-abbr">${game.myClass || "?"}</span>`
        }
          </div>
        </div>
        
        <!-- VS テキスト -->
        <div class="vs-text">VS</div>
        
        <!-- 敵情報（敵プレイヤー名は基本空なので敵クラスのみ表示） -->
        <div class="player-info enemy-player">
          <div class="player-class">
            ${enemyClassIcon
            ? `<img src="${enemyClassIcon}" alt="${game.enemyClass}" class="class-icon" title="${enemyClassName}">`
            : `<span class="class-abbr">${game.enemyClass || "?"}</span>`
        }
          </div>
          <div class="player-name" style="font-size: 0.65rem; color: var(--text-tertiary);">敵</div>
        </div>
      </div>
    </div>
  `;
}// ============================================================================
// 統計情報の計算・表示
// ============================================================================

/**
 * 1つの試合の統計情報を計算
 * @param {Array} games - ゲーム配列
 * @returns {Object} 統計情報
 */
function calculateGameStats(games) {
    const wins = games.filter(g => g.result === "w").length;
    const losses = games.filter(g => g.result === "l").length;

    return {
        totalWins: wins,
        totalLosses: losses,
        totalGames: games.length,
        winRate: games.length > 0 ? (wins / games.length) * 100 : 0
    };
}

/**
 * 全試合の統計情報を計算して表示
 * @param {Array} matches - 試合配列
 */
function renderStatistics(matches) {
    // 全ゲームの集計
    let totalWins = 0;
    let totalLosses = 0;
    let gameCount = 0;
    const recentGames = [];

    // 各試合のゲーム結果を集計
    matches.forEach(match => {
        match.games.forEach(game => {
            if (game.result === "w") {
                totalWins++;
            } else {
                totalLosses++;
            }
            gameCount++;
            recentGames.push(game.result);
        });
    });

    // Form (直近5試合の勝敗)
    const recentForm = recentGames.slice(-5);
    const formWins = recentForm.filter(r => r === "w").length;

    // Clutch Factor (Game 9までもつれた場合の勝率)
    const go9Matches = matches.filter(m => m.games.length === 9);
    const go9Wins = go9Matches.filter(m => {
        const g9 = m.games.find(g => g.gameNumber === 9);
        return g9 && g9.result === "w";
    }).length;
    const clutchFactor = go9Matches.length > 0
        ? ((go9Wins / go9Matches.length) * 100).toFixed(1)
        : "N/A";

    // 統計表示エリアに出力
    const statsContainer = document.getElementById("statistics-container");
    if (statsContainer) {
        statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Overall Win Rate</h4>
          <p class="stat-value">${((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)}%</p>
          <p class="stat-detail">${totalWins}W - ${totalLosses}L</p>
        </div>
        
        <div class="stat-card">
          <h4>Form (Recent 5)</h4>
          <p class="stat-value">${formWins}/5</p>
          <p class="stat-detail">${recentForm.map(r => r.toUpperCase()).join("")}</p>
        </div>
        
        <div class="stat-card">
          <h4>Clutch Factor</h4>
          <p class="stat-value">${clutchFactor}%</p>
          <p class="stat-detail">BO9 Games (${go9Matches.length})</p>
        </div>
        
        <div class="stat-card">
          <h4>Total Matches</h4>
          <p class="stat-value">${matches.length}</p>
          <p class="stat-detail">${gameCount} games played</p>
        </div>
      </div>
    `;
    }
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 日付をフォーマット（YYYY-MM-DD => "2025-02-01" 等）
 * @param {String|Date} date - 日付
 * @returns {String} フォーマット済み日付
 */
function formatDate(date) {
    if (!date) return "N/A";

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}/${month}/${day}`;
}

/**
 * ローディング状態を表示
 */
function showLoadingState() {
    const container = document.getElementById("matches-container");
    if (container) {
        container.innerHTML = `
      <div class="loading-state">
        <p>データを読み込み中...</p>
        <div class="spinner"></div>
      </div>
    `;
    }
}

/**
 * ローディング状態を非表示
 */
function hideLoadingState() {
    // 特に何もしない（renderMatchCards で置き換わる）
}

/**
 * エラー状態を表示
 * @param {String} message - エラーメッセージ
 */
function showErrorState(message) {
    const container = document.getElementById("matches-container");
    if (container) {
        container.innerHTML = `
      <div class="error-state">
        <h3>エラー</h3>
        <p>${message}</p>
        <button onclick="dashboardInit()" class="retry-btn">
          再度読み込み
        </button>
      </div>
    `;
    }
}

// ============================================================================
// ダミーデータ（デバッグ用）
// ============================================================================

/**
 * デバッグ用ダミーデータを返す
 * USE_DUMMY_DATA = true の場合に使用
 */
function getDummyData() {
    return {
        success: true,
        timestamp: new Date().toISOString(),
        matches: [
            {
                id: 1,
                season: "第14回前半",
                round: 1,
                date: "2026/01/28",
                enemy: "COL",
                games: [
                    {
                        gameNumber: 1,
                        myPlayer: "そー",
                        myClass: "Nm",
                        myClassInfo: { name: "Forestcraft", abbr: "Nm" },
                        result: "l",
                        enemyClass: "Nm",
                        enemyClassInfo: { name: "Forestcraft", abbr: "Nm" },
                        enemyPlayer: ""
                    },
                    {
                        gameNumber: 2,
                        myPlayer: "ヒヨぴー",
                        myClass: "R",
                        myClassInfo: { name: "Runecraft", abbr: "R" },
                        result: "w",
                        enemyClass: "W",
                        enemyClassInfo: { name: "Witch", abbr: "W" },
                        enemyPlayer: ""
                    },
                    {
                        gameNumber: 3,
                        myPlayer: "poke",
                        myClass: "B",
                        myClassInfo: { name: "Bishop", abbr: "B" },
                        result: "w",
                        enemyClass: "B",
                        enemyClassInfo: { name: "Bishop", abbr: "B" },
                        enemyPlayer: ""
                    },
                    {
                        gameNumber: 4,
                        myPlayer: "SKY",
                        myClass: "D",
                        myClassInfo: { name: "Dragoncraft", abbr: "D" },
                        result: "l",
                        enemyClass: "D",
                        enemyClassInfo: { name: "Dragoncraft", abbr: "D" },
                        enemyPlayer: ""
                    },
                    {
                        gameNumber: 5,
                        myPlayer: "maho",
                        myClass: "W",
                        myClassInfo: { name: "Witch", abbr: "W" },
                        result: "w",
                        enemyClass: "W",
                        enemyClassInfo: { name: "Witch", abbr: "W" },
                        enemyPlayer: ""
                    },
                    {
                        gameNumber: 6,
                        myPlayer: "そー",
                        myClass: "Nm",
                        myClassInfo: { name: "Forestcraft", abbr: "Nm" },
                        result: "w",
                        enemyClass: "R",
                        enemyClassInfo: { name: "Runecraft", abbr: "R" },
                        enemyPlayer: ""
                    },
                    {
                        gameNumber: 7,
                        myPlayer: "SKY",
                        myClass: "D",
                        myClassInfo: { name: "Dragoncraft", abbr: "D" },
                        result: "w",
                        enemyClass: "R",
                        enemyClassInfo: { name: "Runecraft", abbr: "R" },
                        enemyPlayer: ""
                    }
                ]
            }
        ],
        totalMatches: 1
    };
}
