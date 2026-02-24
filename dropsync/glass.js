(function () {
    const fillRect = document.getElementById('fillRect');
    const wavePath = document.getElementById('wavePath');
    const waveGroup = document.getElementById('waveGroup');
    const fullRim = document.getElementById('fullRimFill');
    const fillSurf = document.getElementById('fillSurface');
    const gradStop0 = document.querySelector('#fillGrad stop:first-child');
    const gradStop1 = document.querySelector('#fillGrad stop:last-child');

    const G_H = 288;
    const AMP_MIN = 0.08;
    const PLATEAU_S = 0.6;
    const DECAY_SECONDS = 4.0;

    const CUP_TOP_Y = 6;
    const CUP_BOT_Y = 284;
    const CUP_TOP_RX = 66;
    const CUP_BOT_RX = 42;
    const CUP_RX_SPAN = CUP_TOP_RX - CUP_BOT_RX;

    let waveAmp = 0;
    let targetAmp = 0;
    let currentFillY = 294;
    let isDragging = false;
    let rafId = null;

    let decayMode = false;
    let decayStart = 0;
    let decayInitAmp = 0;
    let decayK = 0;

    function cupRxAtY(y) {
        const t = Math.max(0, Math.min(1, (y - CUP_TOP_Y) / (CUP_BOT_Y - CUP_TOP_Y)));
        return CUP_TOP_RX - t * CUP_RX_SPAN;
    }

    new MutationObserver(function () {
        const color = gradStop0.getAttribute('stop-color');
        if (color) gradStop1.setAttribute('stop-color', color);
    }).observe(gradStop0, { attributes: true, attributeFilter: ['stop-color'] });

    function buildWave(y, amp) {
        const bot = 302;
        if (amp < AMP_MIN) {
            return `M-70,${y} L210,${y} L210,${bot} L-70,${bot} Z`;
        }
        return (
            `M-70,${y} ` +
            `C-52,${y - amp} -35,${y + amp} -17.5,${y} ` +
            `S17.5,${y + amp} 35,${y} ` +
            `S52.5,${y - amp} 70,${y} ` +
            `S87.5,${y + amp} 105,${y} ` +
            `S122.5,${y - amp} 140,${y} ` +
            `S157.5,${y + amp} 175,${y} ` +
            `S192.5,${y - amp} 210,${y} ` +
            `L210,${bot} L-70,${bot} Z`
        );
    }

    function setScrollSpeed() {
        // Speed is fixed via CSS for a calm, consistent flow
    }

    function updateSurface(y, amp) {
        if (!fillSurf) return;
        const rx = cupRxAtY(Math.min(y, CUP_BOT_Y));
        const visible = (294 - y) / G_H > 0.005 ? 1 : 0;
        fillSurf.setAttribute('cy', String(y));
        fillSurf.setAttribute('rx', String(rx));
        fillSurf.setAttribute('ry', String(3.5 + amp * 0.18));
        fillSurf.setAttribute('opacity', String(visible * 0.55));
    }

    function tick(now) {
        if (isDragging) {
            waveAmp += (targetAmp - waveAmp) * 0.13;
            setScrollSpeed(waveAmp);
            wavePath.setAttribute('d', buildWave(currentFillY, waveAmp));
            updateSurface(currentFillY, waveAmp);
            rafId = requestAnimationFrame(tick);
            return;
        }

        if (decayMode) {
            const elapsed = (now - decayStart) / 1000;
            const t = Math.max(0, elapsed - PLATEAU_S);
            const envelope = Math.exp(-decayK * t);
            const pulse = 0.85 + 0.15 * Math.abs(Math.cos(elapsed * 1.0));
            waveAmp = decayInitAmp * envelope * pulse;

            setScrollSpeed(waveAmp);
            wavePath.setAttribute('d', buildWave(currentFillY, waveAmp));
            updateSurface(currentFillY, waveAmp);

            if (waveAmp < AMP_MIN) {
                waveAmp = 0;
                decayMode = false;
                // keep waving class - animation runs continuously
                wavePath.setAttribute('d', buildWave(currentFillY, 0));
                updateSurface(currentFillY, 0);
                rafId = null;
                return;
            }

            rafId = requestAnimationFrame(tick);
            return;
        }

        rafId = null;
    }

    new MutationObserver(function () {
        const y = parseFloat(fillRect.getAttribute('y'));
        currentFillY = y;
        wavePath.setAttribute('d', buildWave(currentFillY, waveAmp));
        updateSurface(currentFillY, waveAmp);

        const pct = Math.max(0, (294 - y) / G_H);
        const rimOpacity = pct >= 0.97 ? Math.min(1, (pct - 0.97) / 0.03) : 0;
        fullRim.setAttribute('opacity', String(rimOpacity));
    }).observe(fillRect, { attributes: true, attributeFilter: ['y', 'height'] });

    wavePath.setAttribute('d', buildWave(294, 0));
    updateSurface(294, 0);

    // Start the wave group animation immediately (always running)
    waveGroup.classList.add('waving');

    document.addEventListener('pointerdown', function (e) {
        const gc = document.getElementById('glassContainer');
        if (!gc || (!gc.contains(e.target) && gc !== e.target)) return;

        targetAmp = 2.5 + Math.random() * 1.5;
        isDragging = true;
        decayMode = false;

        waveGroup.classList.add('waving');
        if (!rafId) rafId = requestAnimationFrame(tick);
    });

    ['pointerup', 'pointercancel'].forEach(function (type) {
        document.addEventListener(type, function () {
            if (!isDragging) return;
            isDragging = false;

            if (waveAmp >= AMP_MIN) {
                decayMode = true;
                decayStart = performance.now();
                decayInitAmp = waveAmp;
                decayK = -Math.log(AMP_MIN / waveAmp) / DECAY_SECONDS;
                if (!rafId) rafId = requestAnimationFrame(tick);
            }
        });
    });
})();