/**
 * ============================================================================
 * APEIRON チーム公式サイト - 管理画面用JavaScriptファイル
 * ============================================================================
 * 
 * 【概要】
 * このファイルは、Firebase Authenticationを使用した認証機能を提供します。
 * ログインページ（login.html）と管理画面（admin.html）で動作します。
 * 
 * 【主な機能】
 * 1. ログイン処理（login.html）
 * 2. ログイン状態の確認（admin.html）
 * 3. ログアウト処理（admin.html）
 * 
 * 【セキュリティ】
 * - Firebase Authenticationで認証を実施
 * - 管理者メールアドレスは固定（ADMIN_EMAIL）
 * - パスワードのみをユーザーが入力
 * ============================================================================
 */

// ===== Firebase SDK のインポート =====
// CDNから直接Firebase機能を読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebaseConfig.js";

// ===== Firebase 初期化 =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


/**
 * ============================================================================
 * ログインページ（login.html）の処理
 * ============================================================================
 */
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        // パスワード入力欄の値を取得
        const pass = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');

        // Firebase Authenticationでログイン試行
        // メールアドレスは固定値（ADMIN_EMAIL）を使用
        signInWithEmailAndPassword(auth, ADMIN_EMAIL, pass)
            .then((userCredential) => {
                // ログイン成功 → 管理画面へリダイレクト
                window.location.href = "admin.html";
            })
            .catch((error) => {
                // ログイン失敗時の処理
                console.error(error);
                
                // エラーメッセージを表示
                errorMsg.style.display = "block";
                
                // パスワード入力欄を揺らすアニメーション
                const box = document.querySelector('.login-box');
                box.style.animation = "none";
                setTimeout(() => box.style.animation = "shake 0.4s", 10);
            });
    });
}


/**
 * ============================================================================
 * 管理画面（admin.html）の処理
 * ============================================================================
 */
const logoutBtn = document.getElementById('logoutBtn');

// ページタイトルに "Dashboard" が含まれる場合のみ実行（admin.html判定）
if (document.title.includes("Dashboard")) {
    
    // ===== ログイン状態の確認 =====
    // Firebase Authの認証状態をリアルタイムで監視
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ログイン済み → アクセス許可
            console.log("Access approved.");
            // 特別な処理は不要（ページ表示を継続）
        } else {
            // 未ログイン → ログインページへ強制リダイレクト
            window.location.href = "login.html";
        }
    });

    // ===== ログアウト処理 =====
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                // ログアウト成功 → ログインページへリダイレクト
                window.location.href = "login.html";
            });
        });
    }
}