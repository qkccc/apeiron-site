/**
 * ============================================================================
 * sv-stats.js - SVチーム統計ページ
 * ============================================================================
 * data/sv-stats.json（Discord Bot が1日1回生成してこのリポジトリに push）を
 * 読み込み、期間タブごとにチーム全体・匿名の集計を表示する。
 * ============================================================================
 */

const DATA_URL = "data/sv-stats.json";

// 対面マトリクス: この試合数未満のセルは色付けしない（少数サンプルのノイズ回避）
const MIN_HEAT_GAMES = 5;

// クラス名 -> アイコン略称（icon/class_*.png）
const CLASS_ABBR = {
    "エルフ": "E", "ロイヤル": "R", "ウィッチ": "W", "ドラゴン": "D",
    "ナイトメア": "Ni", "ビショップ": "B", "ネメシス": "Nm"
};

const WINDOW_LABELS = {
    "3d": "直近3日", "7d": "直近7日", season: "今環境", all: "全期間"
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

    // JSON に無い期間タブは隠す（古い sv-stats.json でも壊れないように）
    const windows = statsData.windows || {};
    let firstAvailable = null;
    document.querySelectorAll(".window-button").forEach(btn => {
        const key = btn.dataset.window;
        if (windows[key]) {
            btn.hidden = false;
            if (!firstAvailable) firstAvailable = key;
        } else {
            btn.hidden = true;
            btn.classList.remove("active");
        }
    });
    if (!windows[currentWindow]) {
        currentWindow = firstAvailable || currentWindow;
    }
    document.querySelectorAll(".window-button").forEach(b => {
        b.classList.toggle("active", b.dataset.window === currentWindow);
    });

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

    renderCaption();
    renderSummary(w);

    const empty = w.total_games === 0;
    const suppressed = !empty && (w.detail_suppressed || !w.by_class);

    document.getElementById("empty-window").hidden = !empty;
    const supNote = document.getElementById("suppressed-note");
    supNote.hidden = !suppressed;
    if (suppressed) {
        const min = statsData.meta?.min_recorders_for_detail || 3;
        supNote.textContent =
            `この期間の記録者が ${min} 名未満のため、個人の特定を避ける目的で詳細集計は非表示にしています（全体の勝敗のみ表示）。`;
    }
    document.getElementById("detail-sections").hidden = empty || suppressed;
    if (empty || suppressed) return;

    renderByClass(w);
    renderVsClass(w);
    renderMatrix(w);
    renderArchetype(w);
}

function renderCaption() {
    const el = document.getElementById("window-caption");
    if (currentWindow !== "season") {
        el.textContent = "";
        return;
    }
    const s = statsData.meta?.season_start;
    if (!s) { el.textContent = ""; return; }
    const [, mm, dd] = s.split("-");
    const isDefault = statsData.meta?.season_start_is_default;
    el.textContent =
        `今環境: ${Number(mm)}/${Number(dd)} 〜` +
        (isDefault ? "（未設定のため26日区切りで自動判定）" : "（/season_start 設定値）");
}

function renderSummary(w) {
    const cards = [
        { h: "総試合数", v: w.total_games.toLocaleString(), sub: `記録者 ${w.recorder_count} 名` },
        { h: "勝率", v: fmtRate(w.win_rate), sub: `${w.wins}勝 ${w.losses}敗` },
        { h: "記録者数", v: String(w.recorder_count), sub: "この期間に記録した人数" }
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
            const lowN = cell.games < MIN_HEAT_GAMES;
            const style = lowN ? "" : matrixCellStyle(cell.win_rate);
            body += `<td class="has-data${lowN ? " low-n" : ""}${diag}"${style ? ` style="${style}"` : ""}>
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

// 対面マトリクスのセル背景色（インラインstyle文字列）。
// 50% = 白、100%に近づくほど濃い青、0%に近づくほど濃い赤。
function matrixCellStyle(rate) {
    if (rate == null) return "";
    const t = (rate - 50) / 50;                      // -1..+1
    const mag = Math.pow(Math.min(1, Math.abs(t)), 0.75);  // 中間域も少し色づける
    const target = t >= 0 ? [31, 111, 235] : [220, 38, 38]; // 青 / 赤
    const mix = i => Math.round(255 + (target[i] - 255) * mag);
    const r = mix(0), g = mix(1), b = mix(2);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const fg = lum > 0.62 ? "#14181c" : "#ffffff";
    return `background:rgb(${r},${g},${b});color:${fg}`;
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
