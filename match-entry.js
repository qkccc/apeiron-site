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

// ===== デッキ画像アップロード先（GitHub Contents／Git Data API） =====
const GITHUB_OWNER = "qkccc";
const GITHUB_REPO = "apeiron-site";
const GITHUB_BRANCH = "main";
const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN_STORAGE_KEY = "apeiron_github_token";

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

// side ("my"/"enemy") -> { file, status: "idle"|"uploading"|"done"|"error", error }
const deckState = {
    my: { file: null, status: "idle", error: "" },
    enemy: { file: null, status: "idle", error: "" }
};

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

// dashboard.js の getRoundNumber と同じ規則（"TOP32" のような非数値ラウンドから数字だけ抜き出す）
function extractRoundNumber() {
    const m = String(state.round).match(/\d+/);
    return m ? parseInt(m[0], 10) : state.round;
}

// dashboard.js の resolveDeckLinksByFileName と同じ命名規則
// deck-images/s{season}-{first|second}-r{round}-{my|enemy}[-{team}].{ext}
function deckImagePath(side, ext) {
    const teamSuffix = state.team === "ap" ? "-ap" : state.team === "ae" ? "-ae" : "";
    return `deck-images/s${state.season}-${state.half}-r${extractRoundNumber()}-${side}${teamSuffix}.${ext}`;
}

const DECK_EXT_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif"
};

function deckExtOf(file) {
    const fromName = (file.name || "").split(".").pop();
    if (fromName && /^[a-z0-9]+$/i.test(fromName) && fromName.length <= 5) {
        return fromName.toLowerCase() === "jpeg" ? "jpg" : fromName.toLowerCase();
    }
    return DECK_EXT_BY_MIME[file.type] || "png";
}

const CUSTOM_PLAYER_VALUE = "__custom__";

function makeEmptyGames() {
    const games = [];
    for (let i = 0; i < 9; i++) {
        games.push({ id: i + 1, myPlayer: "", myClass: "", result: "", enemyClass: "" });
    }
    return games;
}

function classOptionsHtml(selected) {
    const blank = `<option value="" ${selected ? "" : "selected"}>クラスを選択</option>`;
    const opts = CLASS_OPTIONS.map(
        (c) => `<option value="${c.short}" ${c.short === selected ? "selected" : ""}>${c.name} (${c.short})</option>`
    ).join("");
    return blank + opts;
}

function playerOptionsHtml(selected) {
    const isCustom = selected !== "" && !ROSTER.includes(selected);
    const blank = `<option value="" ${selected === "" ? "selected" : ""}>選手を選択</option>`;
    const opts = ROSTER.map(
        (name) => `<option value="${escapeAttr(name)}" ${name === selected ? "selected" : ""}>${name}</option>`
    ).join("");
    const custom = `<option value="${CUSTOM_PLAYER_VALUE}" ${isCustom ? "selected" : ""}>その他（自由入力）</option>`;
    return blank + opts + custom;
}

function renderGames() {
    const list = document.getElementById("games-list");

    list.innerHTML = state.games.map((game, idx) => {
        const isCustom = game.myPlayer !== "" && !ROSTER.includes(game.myPlayer);
        return `
    <div class="game-row" data-id="${game.id}">
      <div class="game-row-head">
        <span>GAME ${idx + 1}</span>
      </div>
      <div class="game-row-grid">
        <label class="entry-field entry-field-wide">
          <span class="entry-label">自選手名</span>
          <select data-action="my-player-select">${playerOptionsHtml(game.myPlayer)}</select>
          <input type="text" class="entry-custom-player" data-action="my-player-custom"
                 placeholder="選手名を入力" value="${escapeAttr(isCustom ? game.myPlayer : "")}" ${isCustom ? "" : "hidden"}>
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
  `;
    }).join("");
}

function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function updateSeasonPreview() {
    document.getElementById("season-preview").textContent = composeSeasonString();
}

// ===== デッキ画像スロット =====
const DECK_STATUS_LABEL = {
    idle: "未アップロード",
    uploading: "アップロード中…",
    done: "アップロード済み",
    error: "エラー"
};

function renderDeckSlot(side) {
    const slot = deckState[side];
    const thumb = document.getElementById(`deck-${side}-thumb`);
    const placeholder = document.getElementById(`deck-${side}-placeholder`);
    const filenameEl = document.getElementById(`deck-${side}-filename`);
    const statusEl = document.getElementById(`deck-${side}-status`);
    const uploadBtn = document.getElementById(`deck-${side}-upload-btn`);

    if (slot.file) {
        thumb.src = URL.createObjectURL(slot.file);
        thumb.hidden = false;
        placeholder.hidden = true;
        filenameEl.textContent = deckImagePath(side, deckExtOf(slot.file));
    } else {
        thumb.hidden = true;
        placeholder.hidden = false;
        filenameEl.textContent = "";
    }

    statusEl.textContent = DECK_STATUS_LABEL[slot.status] + (slot.status === "error" && slot.error ? `: ${slot.error}` : "");
    statusEl.className = `status-pill ${slot.status}`;
    uploadBtn.disabled = !slot.file || slot.status === "uploading" || slot.status === "done";
}

function updateDeckFilenames() {
    ["my", "enemy"].forEach((side) => {
        if (deckState[side].file) {
            document.getElementById(`deck-${side}-filename`).textContent = deckImagePath(side, deckExtOf(deckState[side].file));
        }
    });
}

async function fileToBase64(file) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function githubHeaders(token) {
    return {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    };
}

async function githubJson(url, token, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...githubHeaders(token), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error((data && data.message) || `HTTP ${response.status}`);
    }
    return data;
}

// blob作成 → 現在のtree取得 → 新tree作成 → コミット作成 → ブランチ参照を更新、の5段階
// (Contents APIの単純PUTは1MB制限があり、デッキ画像は数MBになるためGit Data APIを使用)
async function uploadDeckImageToGithub(file, path, token) {
    const base64 = await fileToBase64(file);
    const repoBase = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

    const blob = await githubJson(`${repoBase}/git/blobs`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: base64, encoding: "base64" })
    });

    const ref = await githubJson(`${repoBase}/git/ref/heads/${GITHUB_BRANCH}`, token);
    const parentCommitSha = ref.object.sha;

    const parentCommit = await githubJson(`${repoBase}/git/commits/${parentCommitSha}`, token);
    const baseTreeSha = parentCommit.tree.sha;

    const tree = await githubJson(`${repoBase}/git/trees`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: [{ path, mode: "100644", type: "blob", sha: blob.sha }]
        })
    });

    const newCommit = await githubJson(`${repoBase}/git/commits`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: `deck: add ${path}`,
            tree: tree.sha,
            parents: [parentCommitSha]
        })
    });

    await githubJson(`${repoBase}/git/refs/heads/${GITHUB_BRANCH}`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: newCommit.sha })
    });

    return newCommit.sha;
}

async function uploadDeckSlot(side) {
    const slot = deckState[side];
    if (!slot.file) return;

    const token = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
    if (!token) {
        slot.status = "error";
        slot.error = "GitHubトークンを保存してください";
        renderDeckSlot(side);
        return;
    }

    slot.status = "uploading";
    slot.error = "";
    renderDeckSlot(side);

    try {
        const path = deckImagePath(side, deckExtOf(slot.file));
        await uploadDeckImageToGithub(slot.file, path, token);
        slot.status = "done";
    } catch (err) {
        slot.status = "error";
        slot.error = err.message;
    }
    renderDeckSlot(side);
}

["my", "enemy"].forEach((side) => {
    document.getElementById(`deck-${side}-input`).addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        deckState[side] = { file, status: "idle", error: "" };
        renderDeckSlot(side);
    });

    document.getElementById(`deck-${side}-upload-btn`).addEventListener("click", () => uploadDeckSlot(side));
});

// ===== GitHubトークン設定 =====
function refreshGithubTokenUi() {
    const saved = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
    document.getElementById("github-token-card").hidden = !!saved;
    document.getElementById("github-token-saved-row").hidden = !saved;
}

document.getElementById("github-token-save-btn").addEventListener("click", () => {
    const val = document.getElementById("github-token-input").value.trim();
    if (!val) return;
    localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, val);
    refreshGithubTokenUi();
});

document.getElementById("github-token-change-btn").addEventListener("click", () => {
    localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
    document.getElementById("github-token-input").value = "";
    refreshGithubTokenUi();
});

// ===== イベント配線: 試合情報 =====
document.getElementById("season-input").addEventListener("input", (e) => {
    const n = parseInt(e.target.value, 10);
    state.season = Number.isFinite(n) && n > 0 ? n : state.season;
    updateSeasonPreview();
    updateDeckFilenames();
});

document.getElementById("half-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.half = btn.dataset.value;
    document.querySelectorAll("#half-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
    updateSeasonPreview();
    updateDeckFilenames();
});

document.getElementById("team-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.team = btn.dataset.value;
    document.querySelectorAll("#team-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
    updateSeasonPreview();
    updateDeckFilenames();
});

document.getElementById("round-input").addEventListener("input", (e) => {
    state.round = e.target.value;
    updateDeckFilenames();
});

document.getElementById("date-input").addEventListener("input", (e) => {
    state.date = e.target.value;
});

document.getElementById("enemy-input").addEventListener("input", (e) => {
    state.enemy = e.target.value;
});

document.getElementById("date-input").value = state.date;

// ===== イベント配線: ゲーム行（イベント委譲、9行は常時表示なので再描画せず直接DOM更新） =====
document.getElementById("games-list").addEventListener("click", (e) => {
    const rowEl = e.target.closest(".game-row");
    if (!rowEl) return;
    const id = Number(rowEl.dataset.id);
    const game = state.games.find((g) => g.id === id);
    if (!game) return;

    const resultBtn = e.target.closest("[data-value]");
    if (resultBtn && resultBtn.closest("[data-action='result-toggle']")) {
        game.result = resultBtn.dataset.value;
        rowEl.querySelectorAll("[data-action='result-toggle'] button").forEach((btn) => {
            const isActive = btn.dataset.value === game.result;
            btn.classList.toggle("active", isActive);
            btn.classList.toggle("result-w", isActive && game.result === "w");
            btn.classList.toggle("result-l", isActive && game.result === "l");
        });
    }
});

document.getElementById("games-list").addEventListener("input", (e) => {
    const rowEl = e.target.closest(".game-row");
    if (!rowEl) return;
    const id = Number(rowEl.dataset.id);
    const game = state.games.find((g) => g.id === id);
    if (!game) return;

    if (e.target.dataset.action === "my-player-custom") game.myPlayer = e.target.value;
});

document.getElementById("games-list").addEventListener("change", (e) => {
    const rowEl = e.target.closest(".game-row");
    if (!rowEl) return;
    const id = Number(rowEl.dataset.id);
    const game = state.games.find((g) => g.id === id);
    if (!game) return;

    if (e.target.dataset.action === "my-class") game.myClass = e.target.value;
    if (e.target.dataset.action === "enemy-class") game.enemyClass = e.target.value;

    if (e.target.dataset.action === "my-player-select") {
        const customInput = rowEl.querySelector("[data-action='my-player-custom']");
        if (e.target.value === CUSTOM_PLAYER_VALUE) {
            customInput.hidden = false;
            customInput.value = "";
            game.myPlayer = "";
            customInput.focus();
        } else {
            customInput.hidden = true;
            customInput.value = "";
            game.myPlayer = e.target.value;
        }
    }
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

    const playedGames = state.games.filter((g) => g.myPlayer.trim() !== "");

    if (playedGames.length === 0) {
        setStatus("少なくとも1ゲームは入力してください", "error");
        return;
    }

    const incomplete = [];
    state.games.forEach((g, idx) => {
        if (g.myPlayer.trim() !== "" && (!g.myClass || !g.enemyClass || !g.result)) {
            incomplete.push(idx + 1);
        }
    });
    if (incomplete.length > 0) {
        setStatus(`GAME ${incomplete.join(", ")} のクラス/勝敗が未入力です`, "error");
        return;
    }

    const games = playedGames.map((g) => ({
        myPlayer: g.myPlayer.trim(),
        myClass: g.myClass,
        result: g.result,
        enemyClass: g.enemyClass,
        enemyPlayer: ""
    }));

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

    state.games = makeEmptyGames();
    renderGames();

    deckState.my = { file: null, status: "idle", error: "" };
    deckState.enemy = { file: null, status: "idle", error: "" };
    renderDeckSlot("my");
    renderDeckSlot("enemy");
    updateDeckFilenames();

    document.getElementById("continue-btn").hidden = true;
    setStatus("", "");
});

// ===== 初期化 =====
(function init() {
    refreshTokenUi();
    refreshGithubTokenUi();
    updateSeasonPreview();
    state.games = makeEmptyGames();
    renderGames();
    renderDeckSlot("my");
    renderDeckSlot("enemy");
})();
