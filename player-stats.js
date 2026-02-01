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

// ============================================================================
// グローバル設定
// ============================================================================

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

// ============================================================================
// 初期化
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    playerStatsInit();
});

async function playerStatsInit() {
    console.log("Player Stats initializing...");

    try {
        const apiData = await fetchDataFromGAS();

        if (apiData && apiData.success && apiData.matches) {
            console.log(`Fetched ${apiData.matches.length} matches`);
            allMatchesData = apiData.matches;

            initializeAllFilters();
            renderAllStats();
        } else {
            showError("データの形式が正しくありません");
        }
    } catch (error) {
        console.error("Error initializing player stats:", error);
        showError("データの取得に失敗しました: " + error.message);
    }
}

// ============================================================================
// データ取得
// ============================================================================

async function fetchDataFromGAS() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const response = await fetch(GAS_API_URL, {
            method: "GET",
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
    // シーズンリスト
    const seasons = [...new Set(allMatchesData.map(m => m.season))].sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, ""));
        const numB = parseInt(b.replace(/[^\d]/g, ""));
        return numB - numA;
    });

    // プレイヤーリスト
    const players = new Set();
    const classes = new Set();

    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (game.myPlayer) players.add(game.myPlayer);
            if (game.myClass) classes.add(game.myClass);
        });
    });

    // セクション2: シーズンごとの戦績 - プレイヤー別
    const seasonPlayerFilter = document.getElementById("season-player-filter");
    seasons.forEach(season => {
        const option = document.createElement("option");
        option.value = season;
        option.textContent = season;
        seasonPlayerFilter.appendChild(option);
    });
    seasonPlayerFilter.addEventListener("change", renderAllStats);

    // セクション3: シーズンごとの戦績 - クラス別
    const seasonClassFilter = document.getElementById("season-class-filter");
    seasons.forEach(season => {
        const option = document.createElement("option");
        option.value = season;
        option.textContent = season;
        seasonClassFilter.appendChild(option);
    });
    seasonClassFilter.addEventListener("change", renderAllStats);

    // セクション4: 各クラスのシーズンごとの戦績
    const classSeasonFilter = document.getElementById("class-season-filter");
    CLASS_ORDER.forEach(cls => {
        if (classes.has(cls)) {
            const option = document.createElement("option");
            option.value = cls;
            option.textContent = CLASS_NAMES[cls];
            classSeasonFilter.appendChild(option);
        }
    });
    classSeasonFilter.addEventListener("change", renderAllStats);

    // セクション5: 各プレイヤーのクラスごとの戦績
    const playerClassFilter = document.getElementById("player-class-filter");
    [...players].sort().forEach(player => {
        const option = document.createElement("option");
        option.value = player;
        option.textContent = player;
        playerClassFilter.appendChild(option);
    });
    playerClassFilter.addEventListener("change", renderAllStats);
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
    render6PlayerClassAllSeasonStats();
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
                stats[game.myPlayer] = {
                    player: game.myPlayer,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
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

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>プレイヤー</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));

        html += `
            <tr>
                <td class="player-name">${stat.player}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
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
        if (selectedSeason !== "all" && match.season !== selectedSeason) return;

        match.games.forEach(game => {
            if (!game.myPlayer) return;

            const key = `${match.season}-${game.myPlayer}`;
            if (!stats[key]) {
                stats[key] = {
                    season: match.season,
                    player: game.myPlayer,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        if (a.season !== b.season) return a.season.localeCompare(b.season);
        if (b.participated !== a.participated) return b.participated - a.participated;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>シーズン</th>
                    <th>プレイヤー</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));

        html += `
            <tr>
                <td>${stat.season}</td>
                <td class="player-name">${stat.player}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
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
        if (selectedSeason !== "all" && match.season !== selectedSeason) return;

        match.games.forEach(game => {
            if (!game.myClass) return;

            const key = `${match.season}-${game.myClass}`;
            if (!stats[key]) {
                stats[key] = {
                    season: match.season,
                    class: game.myClass,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        if (a.season !== b.season) return a.season.localeCompare(b.season);
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>シーズン</th>
                    <th>クラス</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                <td>${stat.season}</td>
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
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
            if (!game.myClass || (selectedClass !== "all" && game.myClass !== selectedClass)) return;

            const key = `${game.myClass}-${match.season}`;
            if (!stats[key]) {
                stats[key] = {
                    class: game.myClass,
                    season: match.season,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        if (selectedClass === "all" && a.class !== b.class) {
            return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
        }
        return a.season.localeCompare(b.season);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    ${selectedClass === "all" ? "<th>クラス</th>" : ""}
                    <th>シーズン</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                ${selectedClass === "all" ? `<td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>` : ""}
                <td>${stat.season}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
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
            if (!game.myPlayer || (selectedPlayer !== "all" && game.myPlayer !== selectedPlayer)) return;

            const key = `${game.myPlayer}-${game.myClass}`;
            if (!stats[key]) {
                stats[key] = {
                    player: game.myPlayer,
                    class: game.myClass,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).filter(s => s.participated >= 1).sort((a, b) => {
        if (a.player !== b.player) return a.player.localeCompare(b.player);
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    ${selectedPlayer === "all" ? "<th>プレイヤー</th>" : ""}
                    <th>クラス</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                ${selectedPlayer === "all" ? `<td class="player-name">${stat.player}</td>` : ""}
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById("player-class-stats-container").innerHTML = html;
}

// ============================================================================
// 6. 各プレイヤーの全シーズン通してのクラスごとの戦績
// ============================================================================

function render6PlayerClassAllSeasonStats() {
    const stats = {};

    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (!game.myPlayer || !game.myClass) return;

            const key = `${game.myPlayer}-${game.myClass}`;
            if (!stats[key]) {
                stats[key] = {
                    player: game.myPlayer,
                    class: game.myClass,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        if (a.player !== b.player) return a.player.localeCompare(b.player);
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>プレイヤー</th>
                    <th>クラス</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                <td class="player-name">${stat.player}</td>
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById("player-class-allseason-stats-container").innerHTML = html;
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
    const containers = [
        "overall-stats-container",
        "season-player-stats-container",
        "season-class-stats-container",
        "class-season-stats-container",
        "player-class-stats-container",
        "player-class-allseason-stats-container"
    ];

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `<div class="loading-state"><p style="color: #ef4444;">${message}</p></div>`;
        }
    });
}

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

const CLASS_ORDER = ["E", "R", "W", "D", "Ni", "B", "Nm", "Nc", "V"];

// グローバルデータ
let allMatchesData = [];
let currentFilters = {
    season: "all",
    player: "all",
    class: "all"
};

// ============================================================================
// 初期化
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    playerStatsInit();
});

async function playerStatsInit() {
    console.log("Player Stats initializing...");

    try {
        const apiData = await fetchDataFromGAS();

        if (apiData && apiData.success && apiData.matches) {
            console.log(`Fetched ${apiData.matches.length} matches`);
            allMatchesData = apiData.matches;

            // フィルター初期化
            initializeFilters();

            // 統計表示
            renderAllStatistics();
        } else {
            showError("データの形式が正しくありません");
        }
    } catch (error) {
        console.error("Error initializing player stats:", error);
        showError("データの取得に失敗しました: " + error.message);
    }
}

// ============================================================================
// データ取得
// ============================================================================

async function fetchDataFromGAS() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const response = await fetch(GAS_API_URL, {
            method: "GET",
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ============================================================================
// フィルター初期化
// ============================================================================

function initializeFilters() {
    const seasons = [...new Set(allMatchesData.map(m => m.season))].sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, ""));
        const numB = parseInt(b.replace(/[^\d]/g, ""));
        return numB - numA;
    });

    const players = new Set();
    const classes = new Set();

    allMatchesData.forEach(match => {
        match.games.forEach(game => {
            if (game.myPlayer) players.add(game.myPlayer);
            if (game.myClass) classes.add(game.myClass);
        });
    });

    // シーズンフィルター
    const seasonFilter = document.getElementById("season-filter");
    seasons.forEach(season => {
        const option = document.createElement("option");
        option.value = season;
        option.textContent = season;
        seasonFilter.appendChild(option);
    });

    // プレイヤーフィルター
    const playerFilter = document.getElementById("player-filter");
    [...players].sort().forEach(player => {
        const option = document.createElement("option");
        option.value = player;
        option.textContent = player;
        playerFilter.appendChild(option);
    });

    // クラスフィルター
    const classFilter = document.getElementById("class-filter");
    CLASS_ORDER.forEach(cls => {
        if (classes.has(cls)) {
            const option = document.createElement("option");
            option.value = cls;
            option.textContent = CLASS_NAMES[cls];
            classFilter.appendChild(option);
        }
    });

    // イベントリスナー
    seasonFilter.addEventListener("change", () => {
        currentFilters.season = seasonFilter.value;
        renderAllStatistics();
    });

    playerFilter.addEventListener("change", () => {
        currentFilters.player = playerFilter.value;
        renderAllStatistics();
    });

    classFilter.addEventListener("change", () => {
        currentFilters.class = classFilter.value;
        renderAllStatistics();
    });
}

// ============================================================================
// 統計レンダリング
// ============================================================================

function renderAllStatistics() {
    const filteredMatches = getFilteredMatches();

    renderRoundParticipation(filteredMatches);
    renderSeasonPlayerStats(filteredMatches);
    renderSeasonClassStats(filteredMatches);
    renderClassTournamentStats(filteredMatches);
    renderClassPlayerStats(filteredMatches);
    renderPlayerClassStats(filteredMatches);
}

function getFilteredMatches() {
    return allMatchesData.filter(match => {
        if (currentFilters.season !== "all" && match.season !== currentFilters.season) {
            return false;
        }
        return true;
    });
}

// ============================================================================
// 1. 節別出場・勝敗
// ============================================================================

function renderRoundParticipation(matches) {
    const stats = {};

    matches.forEach(match => {
        const key = `${match.season}-Round${match.round}`;
        match.games.forEach(game => {
            if (!game.myPlayer) return;

            if (!stats[key]) {
                stats[key] = {};
            }

            if (!stats[key][game.myPlayer]) {
                stats[key][game.myPlayer] = {
                    season: match.season,
                    round: match.round,
                    player: game.myPlayer,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key][game.myPlayer].participated++;
            if (game.result === "w") stats[key][game.myPlayer].wins++;
            if (game.result === "l") stats[key][game.myPlayer].losses++;
        });
    });

    // 配列に変換してソート（出場数降順）
    const statsList = Object.values(stats).flatMap(round => Object.values(round))
        .sort((a, b) => b.participated - a.participated);

    // テーブル生成
    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>シーズン</th>
                    <th>節</th>
                    <th>プレイヤー</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));

        html += `
            <tr>
                <td>${stat.season}</td>
                <td class="align-center">${stat.round}</td>
                <td class="player-name">${stat.player}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("round-participation-container").innerHTML = html;
}

// ============================================================================
// 2. シーズン別プレイヤー戦績
// ============================================================================

function renderSeasonPlayerStats(matches) {
    const stats = {};

    matches.forEach(match => {
        match.games.forEach(game => {
            if (!game.myPlayer) return;

            const key = `${match.season}-${game.myPlayer}`;
            if (!stats[key]) {
                stats[key] = {
                    season: match.season,
                    player: game.myPlayer,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    // ソート: 出場数 > 勝 > 負
    const statsList = Object.values(stats).sort((a, b) => {
        if (b.participated !== a.participated) return b.participated - a.participated;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>シーズン</th>
                    <th>プレイヤー</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));

        html += `
            <tr>
                <td>${stat.season}</td>
                <td class="player-name">${stat.player}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("season-player-stats-container").innerHTML = html;
}

// ============================================================================
// 3. シーズン別クラス戦績
// ============================================================================

function renderSeasonClassStats(matches) {
    const stats = {};

    matches.forEach(match => {
        match.games.forEach(game => {
            if (!game.myClass) return;

            const key = `${match.season}-${game.myClass}`;
            if (!stats[key]) {
                stats[key] = {
                    season: match.season,
                    class: game.myClass,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    // クラス順ソート
    const statsList = Object.values(stats).sort((a, b) => {
        if (a.season !== b.season) return a.season.localeCompare(b.season);
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>シーズン</th>
                    <th>クラス</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                <td>${stat.season}</td>
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("season-class-stats-container").innerHTML = html;
}

// ============================================================================
// 4. クラス別大会戦績
// ============================================================================

function renderClassTournamentStats(matches) {
    const stats = {};

    matches.forEach(match => {
        match.games.forEach(game => {
            if (!game.myClass) return;

            if (!stats[game.myClass]) {
                stats[game.myClass] = {
                    class: game.myClass,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[game.myClass].participated++;
            if (game.result === "w") stats[game.myClass].wins++;
            if (game.result === "l") stats[game.myClass].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>クラス</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("class-tournament-stats-container").innerHTML = html;
}

// ============================================================================
// 5. クラス別個人戦績
// ============================================================================

function renderClassPlayerStats(matches) {
    const stats = {};

    matches.forEach(match => {
        match.games.forEach(game => {
            if (!game.myClass || !game.myPlayer) return;

            const key = `${game.myClass}-${game.myPlayer}`;
            if (!stats[key]) {
                stats[key] = {
                    class: game.myClass,
                    player: game.myPlayer,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        const classCompare = CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
        if (classCompare !== 0) return classCompare;
        if (b.participated !== a.participated) return b.participated - a.participated;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>クラス</th>
                    <th>プレイヤー</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="player-name">${stat.player}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("class-player-stats-container").innerHTML = html;
}

// ============================================================================
// 6. 個人のクラス戦績
// ============================================================================

function renderPlayerClassStats(matches) {
    const stats = {};

    matches.forEach(match => {
        match.games.forEach(game => {
            if (!game.myClass || !game.myPlayer) return;

            const key = `${game.myPlayer}-${game.myClass}`;
            if (!stats[key]) {
                stats[key] = {
                    player: game.myPlayer,
                    class: game.myClass,
                    participated: 0,
                    wins: 0,
                    losses: 0
                };
            }

            stats[key].participated++;
            if (game.result === "w") stats[key].wins++;
            if (game.result === "l") stats[key].losses++;
        });
    });

    const statsList = Object.values(stats).sort((a, b) => {
        const playerCompare = a.player.localeCompare(b.player);
        if (playerCompare !== 0) return playerCompare;
        return CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class);
    });

    let html = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>プレイヤー</th>
                    <th>クラス</th>
                    <th class="align-center">出場</th>
                    <th class="align-center">勝</th>
                    <th class="align-center">敗</th>
                    <th class="align-center">勝率</th>
                </tr>
            </thead>
            <tbody>
    `;

    statsList.forEach(stat => {
        const winRate = stat.participated > 0 ? ((stat.wins / stat.participated) * 100).toFixed(1) : "0.0";
        const winRateClass = getWinRateClass(parseFloat(winRate));
        const icon = CLASS_ICONS[stat.class] ? `<img src="${CLASS_ICONS[stat.class]}" class="class-icon-small" alt="${stat.class}">` : "";

        html += `
            <tr>
                <td class="player-name">${stat.player}</td>
                <td class="class-name">${icon}${CLASS_NAMES[stat.class] || stat.class}</td>
                <td class="align-center">${stat.participated}</td>
                <td class="align-center">${stat.wins}</td>
                <td class="align-center">${stat.losses}</td>
                <td class="align-center ${winRateClass}">${winRate}%</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

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
    const containers = [
        "round-participation-container",
        "season-player-stats-container",
        "season-class-stats-container",
        "class-tournament-stats-container",
        "class-player-stats-container",
        "player-class-stats-container"
    ];

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <p style="color: #ef4444;">${message}</p>
                </div>
            `;
        }
    });
}
