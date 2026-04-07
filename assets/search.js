/**
 * search.js — Projects page search & hashtag filter
 * itsmarian.dev
 */

(function () {
    'use strict';

    var input        = document.getElementById('search-input');
    var clearBtn     = document.getElementById('search-clear');
    var filterPill   = document.getElementById('active-filter');
    var filterLabel  = document.getElementById('active-filter-label');
    var filterRemove = document.getElementById('active-filter-remove');
    var resultsMeta  = document.getElementById('results-meta');
    var emptyState   = document.getElementById('empty-state');
    var cards        = document.querySelectorAll('.project-card');

    if (!input) return;

    /* ── Helpers ─────────────────────────────────── */

    function normalise(str) {
        return str.toLowerCase().replace(/[-_]/g, ' ').trim();
    }

    function getCards() {
        return Array.prototype.slice.call(document.querySelectorAll('.project-card'));
    }

    function showMeta(visible, total) {
        if (!resultsMeta) return;
        if (visible < total) {
            resultsMeta.textContent = visible + ' / ' + total + ' projects';
            resultsMeta.style.opacity = '1';
        } else {
            resultsMeta.textContent = total + ' projects';
            resultsMeta.style.opacity = '0.5';
        }
    }

    /* ── Core filter ─────────────────────────────── */

    function applyFilter(query) {
        var q = normalise(query);
        var list = getCards();
        var visible = 0;
        var isHashtag = q.indexOf('h-') === 0 || q.charAt(0) === '#';
        var hashTag = isHashtag ? q.replace(/^h-/, '').replace(/^#/, '') : null;

        list.forEach(function (card) {
            var name   = normalise(card.getAttribute('p-name') || '');
            var hashes = normalise(card.getAttribute('p-hash') || '');
            var desc   = normalise((card.querySelector('.project-card__content p') || {}).textContent || '');
            var match  = false;

            if (!q) {
                match = true;
            } else if (hashTag) {
                // exact hashtag match (split by comma+space)
                var tags = hashes.split(',').map(function (t) { return t.trim(); });
                match = tags.indexOf(hashTag) !== -1;
            } else {
                match = name.indexOf(q) !== -1 || hashes.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
            }

            if (match) {
                card.classList.remove('hidden');
                visible++;
            } else {
                card.classList.add('hidden');
            }

            // highlight active hashtag links on cards
            var links = card.querySelectorAll('.hashtag');
            links.forEach(function (link) {
                var tag = normalise((link.querySelector('span') || {}).textContent || '').replace(/^#/, '');
                link.classList.toggle('active', hashTag === tag);
            });
        });

        // empty state
        if (emptyState) {
            emptyState.classList.toggle('visible', visible === 0);
        }

        showMeta(visible, list.length);
    }

    /* ── URL param on page load ──────────────────── */

    function readUrlParam() {
        var params = new URLSearchParams(window.location.search);
        var q = params.get('q') || '';

        if (q) {
            input.value = q.replace(/^h-/, '#');
            toggleClear(q);

            // show active pill for hashtag queries
            if (filterPill && q.indexOf('h-') === 0) {
                filterLabel.textContent = '#' + q.replace('h-', '');
                filterPill.style.display = 'inline-flex';
            }
        }

        applyFilter(q);
    }

    /* ── Clear button visibility ─────────────────── */

    function toggleClear(val) {
        if (!clearBtn) return;
        clearBtn.classList.toggle('visible', val.length > 0);
    }

    /* ── Event listeners ─────────────────────────── */

    input.addEventListener('input', function () {
        var raw = input.value.trim();
        var query = raw.charAt(0) === '#' ? 'h-' + raw.slice(1) : raw;
        toggleClear(raw);

        // hide pill on manual input
        if (filterPill) filterPill.style.display = 'none';

        // sync URL without reload
        var url = new URL(window.location.href);
        if (query) {
            url.searchParams.set('q', query);
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState(null, '', url.toString());

        applyFilter(query);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            input.value = '';
            toggleClear('');
            if (filterPill) filterPill.style.display = 'none';
            var url = new URL(window.location.href);
            url.searchParams.delete('q');
            window.history.replaceState(null, '', url.toString());
            applyFilter('');
            input.focus();
        });
    }

    if (filterRemove) {
        filterRemove.addEventListener('click', function () {
            input.value = '';
            if (filterPill) filterPill.style.display = 'none';
            var url = new URL(window.location.href);
            url.searchParams.delete('q');
            window.history.replaceState(null, '', url.toString());
            applyFilter('');
        });
    }

    /* ── Ripple effect for card links ────────────── */

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.ripple-btn');
        if (!btn) return;
        var rect = btn.getBoundingClientRect();
        btn.style.setProperty('--ripple-x', (e.clientX - rect.left) + 'px');
        btn.style.setProperty('--ripple-y', (e.clientY - rect.top) + 'px');
        btn.classList.remove('rippling');
        // force reflow
        void btn.offsetWidth;
        btn.classList.add('rippling');
        setTimeout(function () { btn.classList.remove('rippling'); }, 450);
    });

    /* ── Init ────────────────────────────────────── */

    readUrlParam();

}());