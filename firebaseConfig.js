/**
 * ============================================================================
 * Firebase設定ファイル
 * ============================================================================
 * 
 * 【概要】
 * Firebase Authenticationの接続情報を定義するファイルです。
 * admin.jsから読み込まれ、Firebase初期化に使用されます。
 * 
 * 【セキュリティ注意】
 * このファイルにはAPIキーなどの機密情報が含まれています。
 * - 公開リポジトリにpushする場合は .gitignore に追加してください
 * - Firebase Consoleでセキュリティルールを適切に設定してください
 * 
 * 【使用サービス】
 * - Firebase Authentication（ログイン認証）
 * ============================================================================
 */

// ===== Firebase プロジェクト設定 =====
// Firebase Consoleから取得した設定情報
const firebaseConfig = {
    apiKey: "AIzaSyBwlG_aWINAxETLtGUZ3Jyg2IPqr8wVQs4",
    authDomain: "apeiron-admin.firebaseapp.com",
    projectId: "apeiron-admin",
    storageBucket: "apeiron-admin.firebasestorage.app",
    messagingSenderId: "252150803236",
    appId: "1:252150803236:web:03be5b59071dac65a9a1b1"
};

// ===== 管理者アカウント設定 =====
// ログインに使用する固定メールアドレス
// ユーザーはパスワードのみを入力します
const ADMIN_EMAIL = "kaiyuu2420@gmail.com";

// ===== エクスポート =====
// 他のファイル（admin.js）で使用できるようにエクスポート
export { firebaseConfig, ADMIN_EMAIL };