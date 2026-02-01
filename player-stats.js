/**
 * ============================================================================
 * player-stats.js - 個人戦績統計ページ
 * ============================================================================
 * 
 * 【実装統計】
 * 1. 全シーズン通しての出場・勝敗
 * 2. シーズンごとの戦績 - プレイヤー別
 * 3. シーズンごとの戦績 - クラス別
 * 4. 各クラスのシーズンごとの戦績
 * 5. 各プレイヤーのクラスごとの戦績(1試合出場以上)
 * 6. 各プレイヤーの全シーズン通してのクラスごとの戦績
 * 
 * ============================================================================
 */

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxZhLQ38hytU05NimDksu1Y23fEhrYBJulyOMTB30qWPIov02-Zxgx4rYe60eJHk2g8eA/exec";
const API_TIMEOUT = 10000;

const CLASS_ICONS = {
    "E": "icon/class_E.png", "R": "icon/class_R.png", "W": "icon/class_W.png",
    "D": "icon/class_D.png", "Ni": "icon/class_Ni.png", "B": "icon/class_B.png",
    "Nm": "icon/class_Nm.png", "Nc": "icon/class_Nc.png", "V": "icon/class_V.png"
};

const CLASS_NAMES = {
    "E": "エルフ", "R": "ロイヤル", "W": "ウィッチ", "D": "ドラゴン",
    "Ni": "ナイトメア", "B": "ビショップ", "Nm": "ネメシス",
    "Nc": "ネクロマンサー", "V": "ヴァンパイア"
};

const CLASS_ORDER = ["E", "R", "W", "D", "Ni", "B", "Nm", "Nc", "V"];

let allMatchesData = [];

document.addEventListener("DOMContentLoaded", async function () {
    try {
        const apiData = await fetchDataFromGAS();
        if (apiData && apiData.success && apiData.matches) {
            allMatchesData = apiData.matches;
            initializeAllFilters();
            renderAllStats();
        } else {
            showError("データの形式が正しくありません");
        }
    } catch (error) {
        console.error("Error:", error);
        showError("データ取得失敗: " + error.message);
    }
});



// ============================================================================
// データ取得
// ============================================================================

async function fetchDataFromGAS() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    try {
        const response = await fetch(GAS_API_URL, { method: "GET", signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ============================================================================
// フィルター初期化
// ============================================================================

function initializeAllFilters() {
    const seasons = [...new Set(allMatchesData.map(m => m.season))].sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, ""));
        const numB = parseInt(b.replace(/[^\d]/g, ""));
        return numA - numB;
    });

    const players = new Set();
    const classes = new Set();
    const playerAppearances = {};
    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (game.myPlayer) {
                players.add(game.myPlayer);
                playerAppearances[game.myPlayer] = (playerAppearances[game.myPlayer] || 0) + 1;
            }
            if (game.myClass) classes.add(game.myClass);
        });
    });

    addFilterOptions("season-player-filter", seasons.map(s => ({ value: s, text: s })));
    addFilterOptions("season-class-filter", seasons.map(s => ({ value: s, text: s })));

    const classOptions = CLASS_ORDER.filter(c => classes.has(c)).map(c => ({ value: c, text: CLASS_NAMES[c] }));
    addFilterOptions("class-season-filter", classOptions);

    const sortedPlayers = [...players].sort((a, b) => (playerAppearances[b] || 0) - (playerAppearances[a] || 0));
    addFilterOptions("player-class-filter", sortedPlayers.map(p => ({ value: p, text: p }))); document.getElementById("season-player-filter").addEventListener("change", renderAllStats);
    document.getElementById("season-class-filter").addEventListener("change", renderAllStats);
    document.getElementById("class-season-filter").addEventListener("change", renderAllStats);
    document.getElementById("player-class-filter").addEventListener("change", renderAllStats);
}

function addFilterOptions(elementId, options) {
    const element = document.getElementById(elementId);
    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.text;
        element.appendChild(option);
    });
}

// ============================================================================
// 統計レンダリング
// ============================================================================

function renderAllStats() {
    render1OverallStats();
    render2SeasonPlayerStats();
    render3SeasonClassStats();
    render4ClassSeasonStats();
    render5PlayerClassStats();
}

// ============================================================================
// 1. 全シーズン通しての出場・勝敗
// ============================================================================

function render1OverallStats() {
    const stats = {};
    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (!game.myPlayer) return;
            if (!stats[game.myPlayer]) {
                stats[game.myPlayer] = { player: game.myPlayer, participated: 0, wins: 0, losses: 0 };
            }
            stats[game.myPlayer].participated++;
            if (game.result === "w") stats[game.myPlayer].wins++;
            if (game.result === "l") stats[game.myPlayer].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        if (b.participated !== a.participated) return b.participated - a.participated;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
    });

    let html = `<table class="stats-table"><thead><tr><th>プレイヤー</th><th class="align-center">出場</th><th class="align-center">勝</th><th class="align-center">敗</th><th class="align-center">勝率</th></tr></thead><tbody>`;
    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        html += `<tr><td class="player-name">${stat.player}</td><td class="align-center">${stat.participated}</td><td class="align-center">${stat.wins}</td><td class="align-center">${stat.losses}</td><td class="align-center ${winRateClass}">${winRate}%</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("overall-stats-container").innerHTML = html;
}

// ============================================================================
// 2. シーズンごとの戦績 - プレイヤー別
// ============================================================================

function render2SeasonPlayerStats() {
    const selectedSeason = document.getElementById("season-player-filter").value;
    const stats = {};
    allMatchesData.forEach(match => {
        if (match.season !== selectedSeason) return;
        match.games.forEach(game => {
            if (!game.myPlayer) return;
            const key = `${match.season}-${game.myPlayer}`;
            if (!stats[key]) {
                stats[key] = { season: match.season, player: game.myPlayer, participated: 0, wins: 0, losses: 0 };
            }
            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        if (b.participated !== a.participated) return b.participated - a.participated;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
    });

    let html = `<table class="stats-table"><thead><tr><th>プレイヤー</th><th class="align-center">出場</th><th class="align-center">勝</th><th class="align-center">敗</th><th class="align-center">勝率</th></tr></thead><tbody>`;
    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        html += `<tr><td class="player-name">${stat.player}</td><td class="align-center">${stat.participated}</td><td class="align-center">${stat.wins}</td><td class="align-center">${stat.losses}</td><td class="align-center ${winRateClass}">${winRate}%</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("season-player-stats-container").innerHTML = html;
}

// ============================================================================
// 3. シーズンごとの戦績 - クラス別
// ============================================================================

function render3SeasonClassStats() {
    const selectedSeason = document.getElementById("season-class-filter").value;
    const stats = {};
    allMatchesData.forEach(match => {
        if (match.season !== selectedSeason) return;
        match.games.forEach(game => {
            if (!game.myClass) return;
            const key = `${match.season}-${game.myClass}`;
            if (!stats[key]) {
                stats[key] = { season: match.season, class: game.myClass, participated: 0, wins: 0, losses: 0 };
            }
            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `<table class="stats-table"><thead><tr><th>クラス</th><th class="align-center">出場</th><th class="align-center">勝</th><th class="align-center">敗</th><th class="align-center">勝率</th></tr></thead><tbody>`;
    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";
        html += `<tr><td class="class-name">${icon}${CLASS_NAMES[stat.class]}</td><td class="align-center">${stat.participated}</td><td class="align-center">${stat.wins}</td><td class="align-center">${stat.losses}</td><td class="align-center ${winRateClass}">${winRate}%</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("season-class-stats-container").innerHTML = html;
}

// ============================================================================
// 4. 各クラスのシーズンごとの戦績
// ============================================================================

function render4ClassSeasonStats() {
    const selectedClass = document.getElementById("class-season-filter").value;
    const stats = {};
    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (!game.myClass || game.myClass !== selectedClass) return;
            const key = `${match.season}`;
            if (!stats[key]) {
                stats[key] = { season: match.season, participated: 0, wins: 0, losses: 0 };
            }
            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        const numA = parseInt(a.season.match(/\d+/)[0]);
        const numB = parseInt(b.season.match(/\d+/)[0]);
        return numA - numB;
    });

    let html = `<table class="stats-table"><thead><tr><th>シーズン</th><th class="align-center">出場</th><th class="align-center">勝</th><th class="align-center">敗</th><th class="align-center">勝率</th></tr></thead><tbody>`;
    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        html += `<tr><td>${stat.season}</td><td class="align-center">${stat.participated}</td><td class="align-center">${stat.wins}</td><td class="align-center">${stat.losses}</td><td class="align-center ${winRateClass}">${winRate}%</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("class-season-stats-container").innerHTML = html;
}

// ============================================================================
// 5. 各プレイヤーのクラスごとの戦績(1試合出場以上)
// ============================================================================

function render5PlayerClassStats() {
    const selectedPlayer = document.getElementById("player-class-filter").value;
    const stats = {};
    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (!game.myPlayer || game.myPlayer !== selectedPlayer) return;
            const key = `${game.myClass}`;
            if (!stats[key]) {
                stats[key] = { class: game.myClass, participated: 0, wins: 0, losses: 0 };
            }
            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).filter(s => s.participated >= 1).sort((a, b) => {
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `<table class="stats-table"><thead><tr><th>クラス</th><th class="align-center">出場</th><th class="align-center">勝</th><th class="align-center">敗</th><th class="align-center">勝率</th></tr></thead><tbody>`;
    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";
        html += `<tr><td class="class-name">${icon}${CLASS_NAMES[stat.class]}</td><td class="align-center">${stat.participated}</td><td class="align-center">${stat.wins}</td><td class="align-center">${stat.losses}</td><td class="align-center ${winRateClass}">${winRate}%</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("player-class-stats-container").innerHTML = html;
}


// ============================================================================
// ユーティリティ
// ============================================================================

function getWinRateClass(winRate) {
    if (winRate >= 60) return "winrate-high";
    if (winRate >= 40) return "winrate-medium";
    return "winrate-low";
}

function showError(message) {
    ["overall-stats-container", "season-player-stats-container", "season-class-stats-container", "class-season-stats-container", "player-class-stats-container"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="loading-state"><p style="color: #ef4444;">${message}</p></div>`;
    });
}

// ============================================================================
// セクション選択ナビゲーション機能
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    // セクションナビゲーションボタンのイベントリスナーを設定
    document.querySelectorAll(".nav-button").forEach(button => {
        button.addEventListener("click", function () {
            const sectionId = this.getAttribute("data-section");
            switchSection(sectionId);
        });
    });
});

function switchSection(sectionId) {
    // 全セクションを非表示
    document.querySelectorAll(".stats-section").forEach(section => {
        section.style.display = "none";
    });

    // 選択されたセクションのみ表示
    const targetSection = document.getElementById("section-" + sectionId);
    if (targetSection) {
        targetSection.style.display = "block";
    }

    // ボタンのアクティブ状態を更新
    document.querySelectorAll(".nav-button").forEach(button => {
        button.classList.remove("active");
        if (button.getAttribute("data-section") === sectionId) {
            button.classList.add("active");
        }
    });

    // ページトップへスクロール
    window.scrollTo({ top: 0, behavior: "smooth" });
}

