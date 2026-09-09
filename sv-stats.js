/**
 * ============================================================================
 * sv-stats.js - SVチーム統計ページ
 * ============================================================================
 * data/sv-stats.json（Discord Bot が1日1回生成してこのリポジトリに push）を
 * 読み込み、期間タブごとにチーム全体・匿名の集計を表示する。
 * ============================================================================
 */

const DATA_URL = "data/sv-stats.json";

// クラス名 -> アイコン略称（icon/class_*.png）
const CLASS_ABBR = {
    "エルフ": "E", "ロイヤル": "R", "ウィッチ": "W", "ドラゴン": "D",
    "ナイトメア": "Ni", "ビショップ": "B", "ネメシス": "Nm"
};

const WINDOW_LABELS = {
    today: "今日", "3d": "直近3日", "7d": "直近7日", "30d": "直近30日", all: "全期間"
};

let statsData = null;
let currentWindow = "7d";

document.addEventListener("DOMContentLoaded", init);

async function init() {
    // 期間タブ
    document.querySelectorAll(".window-button").forEach(btn => {
        btn.addEventListener("click", () => {
            currentWindow = btn.dataset.window;
            document.querySelectorAll(".window-button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderWindow();
        });
    });

    try {
        const res = await fetch(DATA_URL, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        statsData = await res.json();
    } catch (err) {
        showError("データの読み込みに失敗しました: " + err.message);
        return;
    }

    document.getElementById("state-box").hidden = true;
    document.getElementById("content").hidden = false;

    renderTrend();
    renderFooter();
    renderWindow();
}

function showError(message) {
    const box = document.getElementById("state-box");
    box.hidden = false;
    box.innerHTML = `<p style="color:#ef4444;">${escapeHtml(message)}</p>`;
    document.getElementById("content").hidden = true;
}

// ============================================================================
// 期間ごとの描画
// ============================================================================

function renderWindow() {
    if (!statsData) return;
    const w = statsData.windows[currentWindow];
    if (!w) return;

    renderSummary(w);

    const empty = w.total_games === 0;
    document.getElementById("empty-window").hidden = !empty;
    document.getElementById("detail-sections").hidden = empty;
    if (empty) return;

    renderByClass(w);
    renderVsClass(w);
    renderMatrix(w);
    renderArchetype(w);
}

function renderSummary(w) {
    const firstTurn = w.by_turn["先攻"];
    const secondTurn = w.by_turn["後攻"];
    const cards = [
        { h: "総試合数", v: w.total_games.toLocaleString(), sub: `記録者 ${w.recorder_count} 名` },
        { h: "勝率", v: fmtRate(w.win_rate), sub: `${w.wins}勝 ${w.losses}敗` },
        { h: "先攻 勝率", v: firstTurn ? fmtRate(firstTurn.win_rate) : "—", sub: firstTurn ? `${firstTurn.games}戦` : "記録なし" },
        { h: "後攻 勝率", v: secondTurn ? fmtRate(secondTurn.win_rate) : "—", sub: secondTurn ? `${secondTurn.games}戦` : "記録なし" }
    ];
    document.getElementById("summary-cards").innerHTML = cards.map(c => `
        <div class="summary-card">
            <h4>${c.h}</h4>
            <div class="value">${c.v}</div>
            <div class="sub">${c.sub}</div>
        </div>
    `).join("");
}

function renderByClass(w) {
    const rows = [...w.by_class].sort((a, b) => b.games - a.games);
    const tbody = document.querySelector("#by-class-table tbody");
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td class="class-name">${classLabel(r.class)}</td>
            <td class="num">${r.games ? r.usage_rate.toFixed(1) + "%" : "<span class='muted'>—</span>"}</td>
            <td class="num">${r.games}</td>
            <td class="num">${r.wins}</td>
            <td class="num">${r.games - r.wins}</td>
            <td class="num ${wrClass(r.win_rate)}">${fmtRate(r.win_rate)}</td>
        </tr>
    `).join("");
}

function renderVsClass(w) {
    const total = w.total_games || 1;
    const rows = [...w.vs_class].sort((a, b) => b.games - a.games);
    const tbody = document.querySelector("#vs-class-table tbody");
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td class="class-name">${classLabel(r.class)}</td>
            <td class="num">${r.games ? (r.games / total * 100).toFixed(1) + "%" : "<span class='muted'>—</span>"}</td>
            <td class="num">${r.games}</td>
            <td class="num">${r.wins}</td>
            <td class="num">${r.games - r.wins}</td>
            <td class="num ${wrClass(r.win_rate)}">${fmtRate(r.win_rate)}</td>
        </tr>
    `).join("");
}

function renderMatrix(w) {
    const classes = statsData.meta.class_order;
    const table = document.getElementById("matchup-matrix");

    let head = `<thead><tr><th class="corner">自 \\ 相</th>`;
    classes.forEach(c => { head += `<th>${iconImg(c)}</th>`; });
    head += `</tr></thead>`;

    let body = "<tbody>";
    classes.forEach(my => {
        body += `<tr><th>${iconImg(my)}</th>`;
        const rowData = w.matchup[my] || {};
        classes.forEach(opp => {
            const cell = rowData[opp];
            if (!cell) {
                body += `<td>—</td>`;
                return;
            }
            const losses = cell.games - cell.wins;
            const diag = my === opp ? " diagonal" : "";
            body += `<td class="has-data ${heatClass(cell.win_rate)}${diag}">
                <span class="cell-rate">${Math.round(cell.win_rate)}%</span>
                <span class="cell-wl">${cell.wins}-${losses}</span>
            </td>`;
        });
        body += `</tr>`;
    });
    body += "</tbody>";

    table.innerHTML = head + body;
}

function renderArchetype(w) {
    const section = document.getElementById("archetype-section");
    const list = w.archetype_meta || [];
    if (list.length === 0) {
        section.hidden = true;
        return;
    }
    section.hidden = false;
    const tbody = document.querySelector("#archetype-table tbody");
    tbody.innerHTML = list.map(a => `
        <tr>
            <td>${escapeHtml(a.label)}</td>
            <td class="num">${a.games}</td>
            <td class="num">${a.wins}</td>
            <td class="num ${wrClass(a.win_rate)}">${fmtRate(a.win_rate)}</td>
        </tr>
    `).join("");
}

// ============================================================================
// トレンドチャート（直近30日・SVG）
// ============================================================================

function renderTrend() {
    const daily = statsData.daily || [];
    const host = document.getElementById("trend-chart");
    if (daily.length === 0) {
        host.innerHTML = "<p class='muted'>データがありません。</p>";
        return;
    }

    const W = 920, H = 300;
    const padL = 40, padR = 16, padT = 16, padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = daily.length;
    const maxGames = Math.max(1, ...daily.map(d => d.games));
    const barW = Math.max(3, plotW / n * 0.6);
    const xAt = i => padL + (plotW / n) * (i + 0.5);
    const yRate = r => padT + plotH * (1 - r / 100);
    const yGames = g => padT + plotH * (1 - g / maxGames);

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="直近30日の勝率と試合数の推移">`;

    // 横グリッド（0/25/50/75/100%）
    [0, 25, 50, 75, 100].forEach(r => {
        const y = yRate(r);
        svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${r === 50 ? "#5a5a3a" : "#2a2a2a"}" stroke-width="1"/>`;
        svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#707070">${r}%</text>`;
    });

    // 試合数バー
    daily.forEach((d, i) => {
        if (!d.games) return;
        const x = xAt(i) - barW / 2;
        const y = yGames(d.games);
        svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${(padT + plotH - y).toFixed(1)}" fill="#3b4a6b" opacity="0.55"/>`;
    });

    // 勝率ライン（試合があった日だけ結ぶ）
    const pts = daily.map((d, i) => (d.win_rate == null ? null : [xAt(i), yRate(d.win_rate)]));
    let path = "";
    let started = false;
    pts.forEach(p => {
        if (!p) { started = false; return; }
        path += `${started ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)} `;
        started = true;
    });
    if (path) svg += `<path d="${path}" fill="none" stroke="#D4AF37" stroke-width="2"/>`;
    pts.forEach(p => { if (p) svg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="#D4AF37"/>`; });

    // x軸ラベル（約5等分でM/D表記）
    const step = Math.max(1, Math.round(n / 6));
    daily.forEach((d, i) => {
        if (i % step !== 0 && i !== n - 1) return;
        const [mm, dd] = d.date.slice(5).split("-");
        svg += `<text x="${xAt(i).toFixed(1)}" y="${H - padB + 18}" text-anchor="middle" font-size="11" fill="#707070">${Number(mm)}/${Number(dd)}</text>`;
    });

    svg += `</svg>`;
    host.innerHTML = svg;
}

function renderFooter() {
    const el = document.getElementById("update-footer");
    const gen = statsData.generated_at ? formatJst(statsData.generated_at) : "不明";
    const totalRec = statsData.meta?.total_records;
    el.textContent = `最終更新: ${gen}${totalRec != null ? ` ／ 累計記録 ${totalRec.toLocaleString()} 件` : ""} ／ チーム全体の匿名集計`;
}

// ============================================================================
// ユーティリティ
// ============================================================================

function fmtRate(rate) {
    return rate == null ? "—" : rate.toFixed(1) + "%";
}

function wrClass(rate) {
    if (rate == null) return "muted";
    if (rate >= 55) return "wr-good";
    if (rate <= 45) return "wr-bad";
    return "wr-mid";
}

function heatClass(rate) {
    if (rate == null) return "heat-3";
    if (rate >= 60) return "heat-5";
    if (rate >= 53) return "heat-4";
    if (rate > 47) return "heat-3";
    if (rate > 40) return "heat-2";
    return "heat-1";
}

function iconImg(className) {
    const abbr = CLASS_ABBR[className];
    if (!abbr) return escapeHtml(className);
    return `<img src="icon/class_${abbr}.png" alt="${escapeHtml(className)}" title="${escapeHtml(className)}">`;
}

function classLabel(className) {
    return `${iconImg(className)}<span>${escapeHtml(className)}</span>`;
}

// generated_at は "2026-01-21T20:00:00+09:00" 形式（JST固定）。
// 端末のタイムゾーンに依存せず、その壁時計時刻をそのまま表示する。
function formatJst(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso));
    if (!m) return iso;
    return `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]} JST`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}
