// ===== 全ページ共通のスクリプト =====

(function () {
    'use strict';

    // --- モバイルナビゲーションの開閉 ---
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');

    function closeNav() {
        if (!nav || !toggle) return;
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'メニューを開く');
    }

    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            var willOpen = !nav.classList.contains('open');
            nav.classList.toggle('open', willOpen);
            toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            toggle.setAttribute('aria-label', willOpen ? 'メニューを閉じる' : 'メニューを開く');
        });

        // メニュー内リンクを選んだら閉じる
        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) closeNav();
        });

        // Escキーで閉じる
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeNav();
        });

        // デスクトップ幅に戻ったら状態をリセット
        window.matchMedia('(min-width: 769px)').addEventListener('change', function (ev) {
            if (ev.matches) closeNav();
        });
    }

    // --- フッターの著作権年を自動更新 ---
    var yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
