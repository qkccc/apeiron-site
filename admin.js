// Firebaseの機能をネットから直接読み込む (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebaseConfig.js";

// Firebaseを開始
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ★ スプレッドシート設定
const SHEET_ID = "1RbpwN1sLMJ7SwyXB1e3NGvehiYMH1ChbnHaR_xeEyL4";
// CSVとしてデータを取得するURL (公開設定が必要)
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;


// --- ページごとの処理 ---

// 1. ログインページ (login.html) の処理
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const pass = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');

        signInWithEmailAndPassword(auth, ADMIN_EMAIL, pass)
            .then((userCredential) => {
                window.location.href = "admin.html";
            })
            .catch((error) => {
                console.error(error);
                errorMsg.style.display = "block";
                const box = document.querySelector('.login-box');
                box.style.animation = "none";
                setTimeout(() => box.style.animation = "shake 0.4s", 10);
            });
    });
}

// 2. 管理ページ (admin.html) の処理
const logoutBtn = document.getElementById('logoutBtn');

if (document.title.includes("Dashboard")) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Access approved.");
        } else {
            window.location.href = "login.html";
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = "login.html";
            });
        });
    }

    /* =========================================
       機能: スプレッドシート連携 & 検索
       ========================================= */
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');

    let sheetData = []; // 取得したデータをここに保存

    // CSVデータを取得・解析する関数
    async function fetchSheetData() {
        try {
            tableBody.innerHTML = '<tr><td colspan="5" class="loading">スプレッドシートからデータを読み込み中...</td></tr>';

            const response = await fetch(CSV_URL);
            if (!response.ok) throw new Error("データの取得に失敗しました");
            const text = await response.text();

            // CSVテキストを配列に変換
            const rows = text.split('\n').map(row => {
                // 簡易的なCSVパース（カンマ区切り、引用符の処理は簡易版）
                return row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
            });

            if (rows.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="loading">データがありません</td></tr>';
                return;
            }

            // ヘッダー（1行目）を作成
            const headers = rows[0];
            let headHtml = '<tr>';
            headers.forEach(h => headHtml += `<th>${h}</th>`);
            headHtml += '</tr>';
            tableHead.innerHTML = headHtml;

            // データ（2行目以降）を保存
            // 最初の行はヘッダーなので除く
            sheetData = rows.slice(1).filter(row => row.length > 1 && row[0] !== "");

            renderTable(sheetData);

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="5" class="loading" style="color:red;">読み込みエラー: スプレッドシートの「Webに公開」設定を確認してください</td></tr>`;
        }
    }

    // テーブル描画関数
    function renderTable(data) {
        tableBody.innerHTML = "";
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="loading">該当するデータがありません</td></tr>';
            return;
        }

        data.forEach(row => {
            let tr = document.createElement('tr');
            let html = "";
            row.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            tr.innerHTML = html;
            tableBody.appendChild(tr);
        });
    }

    // 検索機能
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const filtered = sheetData.filter(row => {
                // 行内のどれかのセルにキーワードが含まれていればHIT
                return row.some(cell => cell.toLowerCase().includes(keyword));
            });
            renderTable(filtered);
        });
    }

    // 更新ボタン
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchSheetData);
    }

    /* =========================================
       機能: リンク集管理 (LocalStorage)
       ========================================= */
    const linkList = document.getElementById('linkList');
    const addLinkBtn = document.getElementById('addLinkBtn');

    function loadLinks() {
        const links = JSON.parse(localStorage.getItem('adminLinks') || '[]');
        linkList.innerHTML = "";
        links.forEach((link, index) => {
            const li = document.createElement('li');
            li.className = 'link-item';
            li.innerHTML = `
                <div>
                    <strong>${link.title}</strong><br>
                    <a href="${link.url}" target="_blank" style="color:#D4AF37; font-size:0.8rem;">${link.url}</a>
                </div>
                <button class="btn-delete" onclick="deleteLink(${index})">削除</button>
            `;
            linkList.appendChild(li);
        });
    }

    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            const title = document.getElementById('linkTitle').value;
            const url = document.getElementById('linkUrl').value;
            if (!title || !url) return;

            const links = JSON.parse(localStorage.getItem('adminLinks') || '[]');
            links.push({ title, url });
            localStorage.setItem('adminLinks', JSON.stringify(links));
            document.getElementById('linkTitle').value = "";
            document.getElementById('linkUrl').value = "";
            loadLinks();
        });
    }

    window.deleteLink = (index) => {
        const links = JSON.parse(localStorage.getItem('adminLinks') || '[]');
        links.splice(index, 1);
        localStorage.setItem('adminLinks', JSON.stringify(links));
        loadLinks();
    };

    // 初期実行
    loadLinks();
    fetchSheetData();
}