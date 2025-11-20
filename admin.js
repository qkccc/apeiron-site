// Firebaseの機能をネットから直接読み込む (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ▼▼▼ ここにステップ1で取得した鍵を再度貼り付けてください ▼▼▼
const firebaseConfig = {
    apiKey: "AIzaSyBwlG_aWINAxETLtGUZ3Jyg2IPqr8wVQs4",
    authDomain: "apeiron-admin.firebaseapp.com",
    projectId: "apeiron-admin",
    storageBucket: "apeiron-admin.firebasestorage.app",
    messagingSenderId: "252150803236",
    appId: "1:252150803236:web:03be5b59071dac65a9a1b1"
};
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// Firebaseを開始
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ★ 共通の裏アカウント設定
// ※ Firebaseコンソールで作ったメールアドレスと同じにしてください
const ADMIN_EMAIL = "kaiyuu2420@gmail.com";


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

// 【修正箇所】判定ワードを "Admin" から "Dashboard" に変更しました
// これでログインページ（Admin Login）ではこのチェックが動かなくなります
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
    const addBtn = document.getElementById('addLinkBtn');

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

    if (addBtn) {
        addBtn.addEventListener('click', () => {
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

    loadLinks();
}