// Firebaseの設定情報
// 注意: このファイルはGitに公開する場合は .gitignore に追加することを推奨します
const firebaseConfig = {
    apiKey: "AIzaSyBwlG_aWINAxETLtGUZ3Jyg2IPqr8wVQs4",
    authDomain: "apeiron-admin.firebaseapp.com",
    projectId: "apeiron-admin",
    storageBucket: "apeiron-admin.firebasestorage.app",
    messagingSenderId: "252150803236",
    appId: "1:252150803236:web:03be5b59071dac65a9a1b1"
};

// 共通の裏アカウント設定
const ADMIN_EMAIL = "kaiyuu2420@gmail.com";

// 設定を外部（admin.jsなど）から使えるようにエクスポートする
export { firebaseConfig, ADMIN_EMAIL };