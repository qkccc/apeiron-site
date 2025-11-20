// Firebaseの機能をネットから直接読み込む (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

// 2. 管理ページ (admin.html) の処理
const logoutBtn = document.getElementById('logoutBtn');

// タイトルに "Dashboard" が含まれる場合のみ実行
if (document.title.includes("Dashboard")) {
    // ログインチェック
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

    // 保存されたデータを読み込んで表示する関数
    function loadLinks() {
        // ブラウザの保存領域からデータを取得 (ない場合は空のリスト)
        const links = JSON.parse(localStorage.getItem('adminLinks') || '[]');

        linkList.innerHTML = "";
        links.forEach((link, index) => {
            const li = document.createElement('li');
            li.className = 'link-item';
            li.innerHTML = `
                <div style="overflow: hidden;">
                    <strong style="color:#fff;">${link.title}</strong><br>
                    <a href="${link.url}" target="_blank" style="color:#D4AF37; font-size:0.8rem; display:block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${link.url}</a>
                </div>
                <button class="btn-delete" onclick="deleteLink(${index})">削除</button>
            `;
            linkList.appendChild(li);
        });
    }

    // 追加ボタンを押した時の処理
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            const title = document.getElementById('linkTitle').value;
            const url = document.getElementById('linkUrl').value;

            // 入力が空なら何もしない
            if (!title || !url) return;

            // 既存データを取得して、新しいのを追加して保存
            const links = JSON.parse(localStorage.getItem('adminLinks') || '[]');
            links.push({ title, url });
            localStorage.setItem('adminLinks', JSON.stringify(links));

            // 入力欄をクリア
            document.getElementById('linkTitle').value = "";
            document.getElementById('linkUrl').value = "";

            // リストを再描画
            loadLinks();
        });
    }

    // 削除機能 (HTMLのonclickから呼べるようにwindowに登録)
    window.deleteLink = (index) => {
        const links = JSON.parse(localStorage.getItem('adminLinks') || '[]');
        links.splice(index, 1); // 指定したインデックスを1つ削除
        localStorage.setItem('adminLinks', JSON.stringify(links));
        loadLinks();
    };

    // 初回読み込み実行
    loadLinks();
}