/**
 * ============================================================================
 * match-entry.js - モバイル戦績登録ページ
 * ============================================================================
 * DBシートの列構成（gas-implementation-guide.js 参照）:
 *   Season | Round | ID | Date | Enemy | (Game1: Player,Class,Result,E_Class,E_Player) x 9
 * この列順に合わせて GAS の doPost へ1試合分をPOSTする。
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

// ===== Firebase 認証ガード（admin.js と同じ考え方） =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        });
    });
}

// ===== 送信先（dashboard.js と同じ GAS Web アプリ URL。doGet/doPost 共通） =====
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxZhLQ38hytU05NimDksu1Y23fEhrYBJulyOMTB30qWPIov02-Zxgx4rYe60eJHk2g8eA/exec";
const TOKEN_STORAGE_KEY = "apeiron_entry_token";

// ===== マスタデータ（Settingsシートの内容をそのまま使用） =====
const CLASS_OPTIONS = [
    { name: "エルフ", short: "E" },
    { name: "ロイヤル", short: "R" },
    { name: "ウィッチ", short: "W" },
    { name: "ドラゴン", short: "D" },
    { name: "ナイトメア", short: "Ni" },
    { name: "ビショップ", short: "B" },
    { name: "ネメシス", short: "Nm" },
    { name: "ネクロマンサー", short: "Nc" },
    { name: "ヴァンパイア", short: "V" }
];

const ROSTER = [
    "nobu", "かいっく", "そー", "くろっち", "みんち", "ヒヨぴー", "カニカマ", "nanashi", "poke",
    "ホーク", "エリス", "maho", "母なるママ", "みかにゃん", "Liel", "イクラ", "ありす", "みこと",
    "わいえす", "さくちゃ", "久遠", "シャルル", "SKY", "リボンズ", "アイリア", "Azure", "はる",
    "クレピー", "platinum", "斑目彩華", "noa", "Esukusu", "かんらく", "さめにき", "Light", "yotty",
    "じゅーむ。", "ササキ", "ぼけつちゃん", "ゆきしろ", "もんぶらん"
];

// ===== 状態 =====
const state = {
    season: 16,
    half: "first",
    team: "ap",
    round: "1",
    date: todayString(),
    enemy: "",
    games: [],
    submitting: false
};

let gameRowCounter = 0;

function todayString() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function halfLabel(half) {
    return half === "first" ? "前半" : "後半";
}

function teamLabel(team) {
    if (team === "ap") return "∞";
    if (team === "ae") return "∞AE";
    return "";
}

function composeSeasonString() {
    return `第${state.season}回${halfLabel(state.half)}${teamLabel(state.team)}`;
}

function addGameRow() {
    if (state.games.length >= 9) return;
    state.games.push({
        id: ++gameRowCounter,
        myPlayer: "",
        myClass: "E",
        result: "w",
        enemyClass: "E"
    });
    renderGames();
}

function removeGameRow(id) {
    state.games = state.games.filter((g) => g.id !== id);
    renderGames();
}

function classOptionsHtml(selected) {
    return CLASS_OPTIONS.map(
        (c) => `<option value="${c.short}" ${c.short === selected ? "selected" : ""}>${c.name} (${c.short})</option>`
    ).join("");
}

function renderGames() {
    const list = document.getElementById("games-list");
    const addBtn = document.getElementById("add-game-btn");
    addBtn.disabled = state.games.length >= 9;

    if (state.games.length === 0) {
        list.innerHTML = `<p class="entry-empty">「＋ ゲームを追加」で1ゲーム目を追加してください</p>`;
        return;
    }

    list.innerHTML = state.games.map((game, idx) => `
    <div class="game-row" data-id="${game.id}">
      <div class="game-row-head">
        <span>GAME ${idx + 1}</span>
        <button type="button" class="game-row-remove" data-action="remove-game" aria-label="このゲームを削除">&times;</button>
      </div>
      <div class="game-row-grid">
        <label class="entry-field entry-field-wide">
          <span class="entry-label">自選手名</span>
          <input type="text" list="roster-list" data-action="my-player" value="${escapeAttr(game.myPlayer)}" placeholder="選手名">
        </label>
        <label class="entry-field">
          <span class="entry-label">自クラス</span>
          <select data-action="my-class">${classOptionsHtml(game.myClass)}</select>
        </label>
        <label class="entry-field">
          <span class="entry-label">敵クラス</span>
          <select data-action="enemy-class">${classOptionsHtml(game.enemyClass)}</select>
        </label>
        <div class="entry-field entry-field-wide">
          <span class="entry-label">勝敗</span>
          <div class="segmented side-toggle" data-action="result-toggle">
            <button type="button" data-value="w" class="${game.result === "w" ? "active result-w" : ""}">WIN</button>
            <button type="button" data-value="l" class="${game.result === "l" ? "active result-l" : ""}">LOSE</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function updateSeasonPreview() {
    document.getElementById("season-preview").textContent = composeSeasonString();
}

// ===== イベント配線: 試合情報 =====
document.getElementById("season-input").addEventListener("input", (e) => {
    const n = parseInt(e.target.value, 10);
    state.season = Number.isFinite(n) && n > 0 ? n : state.season;
    updateSeasonPreview();
});

document.getElementById("half-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.half = btn.dataset.value;
    document.querySelectorAll("#half-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
    updateSeasonPreview();
});

document.getElementById("team-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.team = btn.dataset.value;
    document.querySelectorAll("#team-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
    updateSeasonPreview();
});

document.getElementById("round-input").addEventListener("input", (e) => {
    state.round = e.target.value;
});

document.getElementById("date-input").addEventListener("input", (e) => {
    state.date = e.target.value;
});

document.getElementById("enemy-input").addEventListener("input", (e) => {
    state.enemy = e.target.value;
});

document.getElementById("date-input").value = state.date;

// ===== イベント配線: ゲーム行（イベント委譲） =====
document.getElementById("add-game-btn").addEventListener("click", addGameRow);

document.getElementById("games-list").addEventListener("click", (e) => {
    const rowEl = e.target.closest(".game-row");
    if (!rowEl) return;
    const id = Number(rowEl.dataset.id);
    const game = state.games.find((g) => g.id === id);
    if (!game) return;

    if (e.target.closest("[data-action='remove-game']")) {
        removeGameRow(id);
        return;
    }

    const resultBtn = e.target.closest("[data-value]");
    if (resultBtn && resultBtn.closest("[data-action='result-toggle']")) {
        game.result = resultBtn.dataset.value;
        renderGames();
    }
});

document.getElementById("games-list").addEventListener("input", (e) => {
    const rowEl = e.target.closest(".game-row");
    if (!rowEl) return;
    const id = Number(rowEl.dataset.id);
    const game = state.games.find((g) => g.id === id);
    if (!game) return;

    if (e.target.dataset.action === "my-player") game.myPlayer = e.target.value;
});

document.getElementById("games-list").addEventListener("change", (e) => {
    const rowEl = e.target.closest(".game-row");
    if (!rowEl) return;
    const id = Number(rowEl.dataset.id);
    const game = state.games.find((g) => g.id === id);
    if (!game) return;

    if (e.target.dataset.action === "my-class") game.myClass = e.target.value;
    if (e.target.dataset.action === "enemy-class") game.enemyClass = e.target.value;
});

// ===== トークン設定 =====
function refreshTokenUi() {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    document.getElementById("token-card").hidden = !!saved;
    document.getElementById("token-saved-row").hidden = !saved;
}

document.getElementById("token-save-btn").addEventListener("click", () => {
    const val = document.getElementById("token-input").value.trim();
    if (!val) return;
    localStorage.setItem(TOKEN_STORAGE_KEY, val);
    refreshTokenUi();
});

document.getElementById("token-change-btn").addEventListener("click", () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    document.getElementById("token-input").value = "";
    refreshTokenUi();
});

// ===== 送信 =====
function setStatus(text, kind) {
    const el = document.getElementById("status-msg");
    el.textContent = text;
    el.className = `entry-status ${kind || ""}`;
}

async function submitMatch() {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
        setStatus("先に登録用の合言葉を保存してください", "error");
        return;
    }

    const games = state.games
        .filter((g) => g.myPlayer.trim() !== "")
        .map((g) => ({
            myPlayer: g.myPlayer.trim(),
            myClass: g.myClass,
            result: g.result,
            enemyClass: g.enemyClass,
            enemyPlayer: ""
        }));

    if (games.length === 0) {
        setStatus("少なくとも1ゲームは入力してください", "error");
        return;
    }

    if (!state.enemy.trim()) {
        setStatus("対戦相手チーム名を入力してください", "error");
        return;
    }

    const payload = {
        token,
        season: composeSeasonString(),
        round: state.round,
        date: state.date,
        enemy: state.enemy.trim(),
        games
    };

    state.submitting = true;
    document.getElementById("submit-btn").disabled = true;
    setStatus("送信中…", "pending");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(GAS_API_URL, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data && data.success) {
            setStatus(`登録しました（ID: ${data.id}）`, "success");
            document.getElementById("continue-btn").hidden = false;
        } else {
            setStatus(`登録に失敗しました: ${(data && data.error) || "不明なエラー"}`, "error");
        }
    } catch (err) {
        clearTimeout(timeoutId);
        setStatus(`通信エラー: ${err.message}`, "error");
    } finally {
        state.submitting = false;
        document.getElementById("submit-btn").disabled = false;
    }
}

document.getElementById("submit-btn").addEventListener("click", submitMatch);

document.getElementById("continue-btn").addEventListener("click", () => {
    // シーズン/期間/チーム/日付は維持し、ラウンドを+1、ゲーム行と相手名だけリセット
    const n = parseInt(state.round, 10);
    state.round = Number.isFinite(n) ? String(n + 1) : state.round;
    document.getElementById("round-input").value = state.round;

    state.enemy = "";
    document.getElementById("enemy-input").value = "";

    state.games = [];
    gameRowCounter = 0;
    addGameRow();

    document.getElementById("continue-btn").hidden = true;
    setStatus("", "");
});

// ===== 初期化 =====
(function init() {
    const datalist = document.getElementById("roster-list");
    datalist.innerHTML = ROSTER.map((name) => `<option value="${escapeAttr(name)}"></option>`).join("");

    refreshTokenUi();
    updateSeasonPreview();
    addGameRow();
})();
