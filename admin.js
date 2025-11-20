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

if (document.title.includes("Dashboard")) {
    // ログインチェック
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Access approved.");
            // ログイン済みならページを表示するだけ（追加処理なし）
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
}