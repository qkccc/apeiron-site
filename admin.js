// Firebaseの機能をネットから直接読み込む (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 【変更点】別ファイルから設定とメールアドレスを読み込む
import { firebaseConfig, ADMIN_EMAIL } from "./firebaseConfig.js";

// Firebaseを開始
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- ページごとの処理 ---

// 1. ログインページ (login.html) の処理
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const pass = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');

        // メールアドレスは固定のものを使用し、パスワードだけ検証する
        signInWithEmailAndPassword(auth, ADMIN_EMAIL, pass)
            .then((userCredential) => {
                // ログイン成功 -> 管理画面へ
                window.location.href = "admin.html";
            })
            .catch((error) => {
                // 失敗
                console.error(error);
                errorMsg.style.display = "block";
                // パスワード間違いのアニメーション用
                const box = document.querySelector('.login-box');
                box.style.animation = "none";
                setTimeout(() => box.style.animation = "shake 0.4s", 10);
            });
    });
}

// 2. 管理ページ (admin.html) のセキュリティ処理
const logoutBtn = document.getElementById('logoutBtn');

// タイトルに "Dashboard" が含まれる場合のみ実行
if (document.title.includes("Dashboard")) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Logged in access approved.");
        } else {
            // ログインしていない -> 強制的にログイン画面へ
            window.location.href = "login.html";
        }
    });

    // ログアウト処理
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = "login.html";
            });
        });
    }

    // --- 簡易リンク追加機能 (LocalStorage) ---
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

    /* =========================================
       機能2: 検索機能付きデータベース (DB連携デモ)
       ========================================= */
    const dbList = document.getElementById('dbList');
    const addDbBtn = document.getElementById('addDbBtn');
    const searchInput = document.getElementById('searchInput');

    // データの読み込み & 表示
    function loadDbData(filterText = "") {
        const data = JSON.parse(localStorage.getItem('adminDb') || '[]');
        dbList.innerHTML = "";

        // 検索フィルター
        const filteredData = data.filter(item => {
            return item.name.toLowerCase().includes(filterText.toLowerCase()) ||
                item.role.toLowerCase().includes(filterText.toLowerCase());
        });

        if (filteredData.length === 0) {
            dbList.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#666;">データが見つかりません</td></tr>`;
            return;
        }

        // データ表示
        filteredData.forEach((item) => {
            const originalIndex = data.indexOf(item);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:bold;">${item.name}</td>
                <td><span class="tag">${item.role}</span></td>
                <td><button class="btn-delete" onclick="deleteDbData(${originalIndex})">×</button></td>
            `;
            dbList.appendChild(tr);
        });
    }

    // データ追加
    if (addDbBtn) {
        addDbBtn.addEventListener('click', () => {
            const name = document.getElementById('dbName').value;
            const role = document.getElementById('dbRole').value;
            if (!name) return;

            const data = JSON.parse(localStorage.getItem('adminDb') || '[]');
            data.push({ name, role });
            localStorage.setItem('adminDb', JSON.stringify(data));

            document.getElementById('dbName').value = "";
            document.getElementById('dbRole').value = "";
            loadDbData();
        });
    }

    // 検索処理
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadDbData(e.target.value);
        });
    }

    // データ削除
    window.deleteDbData = (index) => {
        const data = JSON.parse(localStorage.getItem('adminDb') || '[]');
        data.splice(index, 1);
        localStorage.setItem('adminDb', JSON.stringify(data));

        const currentSearch = document.getElementById('searchInput').value;
        loadDbData(currentSearch);
    };

    // 初回読み込み
    loadLinks();
    loadDbData();
}