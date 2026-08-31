/* =====================================================================
   APEIRON 公式サイト 共通スクリプト
   - フッターの年号を自動更新
   - モバイルのハンバーガーメニュー（開閉・オーバーレイ・Esc・簡易フォーカストラップ）
   - スクロールで固定ヘッダーを引き締め
   - スクロール入場アニメーション（.reveal）
   - ページ上部へ戻るボタン
   - X アカウントのハンドルを各ボタンへ付与（members）
   依存ライブラリなし。<script src="main.js" defer> で読み込む想定。
   ===================================================================== */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* requestAnimationFrame でスクロールハンドラを間引く */
    function rafThrottle(fn) {
        var ticking = false;
        return function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(function () {
                fn();
                ticking = false;
            });
        };
    }

    /* ---------- フッターの年号 ---------- */
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = year;
    });

    /* ---------- モバイルナビ ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');

    if (toggle && nav) {
        var overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);

        var isOpen = function () {
            return document.body.classList.contains('nav-open');
        };
        var openNav = function () {
            document.body.classList.add('nav-open');
            toggle.setAttribute('aria-expanded', 'true');
            var first = nav.querySelector('a[href]');
            if (first) first.focus();
        };
        var closeNav = function (returnFocus) {
            document.body.classList.remove('nav-open');
            toggle.setAttribute('aria-expanded', 'false');
            if (returnFocus) toggle.focus();
        };

        toggle.addEventListener('click', function () {
            if (isOpen()) closeNav();
            else openNav();
        });

        overlay.addEventListener('click', function () {
            closeNav();
        });

        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) closeNav();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) closeNav(true);
        });

        /* ドロワー内で Tab をループさせる簡易フォーカストラップ */
        nav.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab' || !isOpen()) return;
            var links = nav.querySelectorAll('a[href]');
            if (!links.length) return;
            var first = links[0];
            var last = links[links.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        /* デスクトップ幅に戻ったら状態を解除 */
        var desktopMq = window.matchMedia('(min-width: 769px)');
        var onDesktopChange = function (e) {
            if (e.matches) closeNav();
        };
        if (desktopMq.addEventListener) desktopMq.addEventListener('change', onDesktopChange);
        else if (desktopMq.addListener) desktopMq.addListener(onDesktopChange);
    }

    /* ---------- スクロールでヘッダーを引き締め ---------- */
    var header = document.querySelector('header');
    if (header) {
        var updateHeader = function () {
            header.classList.toggle('scrolled', window.scrollY > 40);
        };
        updateHeader();
        window.addEventListener('scroll', rafThrottle(updateHeader), { passive: true });
    }

    /* ---------- ページ上部へ戻るボタン ---------- */
    var toTop = document.createElement('button');
    toTop.type = 'button';
    toTop.className = 'to-top';
    toTop.setAttribute('aria-label', 'ページ上部へ戻る');
    toTop.textContent = '↑';
    document.body.appendChild(toTop);

    toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    var updateToTop = function () {
        toTop.classList.toggle('show', window.scrollY > 500);
    };
    updateToTop();
    window.addEventListener('scroll', rafThrottle(updateToTop), { passive: true });

    /* ---------- スクロール入場アニメーション ---------- */
    var reveals = document.querySelectorAll('.reveal');
    if (reveals.length) {
        if (reduceMotion || !('IntersectionObserver' in window)) {
            reveals.forEach(function (el) {
                el.classList.add('is-visible');
            });
        } else {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    var el = entry.target;
                    /* 同じ親の中での並び順に応じて少しずつ遅延（スタッガー） */
                    var group = el.parentNode
                        ? el.parentNode.querySelectorAll(':scope > .reveal')
                        : [el];
                    var idx = Array.prototype.indexOf.call(group, el);
                    el.style.transitionDelay = (Math.min(idx, 6) * 70) + 'ms';
                    el.classList.add('is-visible');
                    io.unobserve(el);
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

            reveals.forEach(function (el) {
                io.observe(el);
            });
        }
    }

    /* ---------- X アカウントのハンドルをボタンへ付与 ---------- */
    document.querySelectorAll('a.x-btn[href]').forEach(function (a) {
        var m = a.getAttribute('href').match(/(?:twitter|x)\.com\/([A-Za-z0-9_]+)/);
        if (m) a.setAttribute('data-handle', '@' + m[1]);
    });
})();
