const small = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["", "", "twenty", "thirty", "forty", "fifty"];

const hourEl = document.getElementById('hourWord');
const minuteEl = document.getElementById('minuteWord');
const statusEl = document.getElementById('status');
const lineSlash = document.querySelector('.line-slash');
const lineInner = document.querySelector('.line-inner');
const fullscreenBtn = document.getElementById("fullscreenBtn");
const sizeSelector = document.getElementById("sizeSelector");
const copyrightBtn = document.getElementById("copyrightBtn");
const minimizeBtn = document.getElementById("minimize");
const understandBtn = document.getElementById('understandBtn');
const popupOverlay = document.getElementById('popupOverlay');

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

function isFullscreen() {
    return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
}

function updateFullscreenButton() {
    if (isFullscreen()) {
        fullscreenBtn.innerHTML = `
            <svg viewBox="0 0 36 36" width="25" height="25" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                <path d="m 14,14 -4,0 0,2 6,0 0,-6 -2,0 0,4 z"/>
                <path d="m 22,14 0,-4 -2,0 0,6 6,0 0,-2 -4,0 z"/>
                <path d="m 20,26 2,0 0,-4 4,0 0,-2 -6,0 0,6 z"/>
                <path d="m 10,22 4,0 0,4 2,0 0,-6 -6,0 0,2 z"/>
            </svg>
            Exit Fullscreen`;
    } else {
        fullscreenBtn.innerHTML = `
            <svg viewBox="0 0 36 36" width="25" height="25" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 z"/>
                <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 z"/>
                <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 z"/>
                <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 z"/>
            </svg>
            Fullscreen`;
    }
}

function numberToWords(n) {
    if (n < 20) return small[n];
    if (n < 60) {
        const t = Math.floor(n / 10);
        const r = n % 10;
        return r === 0 ? tens[t] : tens[t] + " " + small[r];
    }
    return String(n);
}

function minuteToWords(m) {
    if (m === 0) return "o'clock";
    return numberToWords(m);
}

function formatWords(date) {
    let h = date.getHours() % 12;
    if (h === 0) h = 12;
    const m = date.getMinutes();
    const hourWord = numberToWords(h);
    const minuteWord = minuteToWords(m);
    return m === 0 ? [hourWord, minuteWord] : [hourWord, minuteWord];
}

function tick() {
    const now = new Date();
    const [hWord, mWord] = formatWords(now);
    
    hourEl.textContent = hWord.toUpperCase();
    minuteEl.textContent = mWord.toUpperCase();

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    statusEl.textContent = `${hh}:${mm}:${ss}`;
}

function updateSlashWidth() {
    const slashWidth = lineSlash.offsetWidth;
    const slashHeight = lineSlash.offsetHeight;
    
    lineSlash.style.setProperty('--slash-height', `-${slashHeight}px`);
    lineInner.style.setProperty('--slash-width', `${slashWidth}px`);
}

function toggleControls() {
    const isHidden = sizeSelector.style.display === "none";
    
    sizeSelector.style.display = isHidden ? "" : "none";
    fullscreenBtn.style.display = isHidden ? "" : "none";
    copyrightBtn.style.display = isHidden ? "" : "none";
    
    minimizeBtn.innerHTML = isHidden ? 
        '<svg xmlns="http://www.w3.org/2000/svg" height="25" viewBox="0 -960 960 960" width="25" fill="#fff"><path d="M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" height="25" viewBox="0 -960 960 960" width="25" fill="#fff"><path d="M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z"/></svg>';
}

function openPopup() {
    document.body.classList.add('popup-active');
}

function closePopup() {
    document.body.classList.remove('popup-active');
}

function handleFullscreen() {
    if (!isFullscreen()) {
        const docElement = document.documentElement;
        if (docElement.requestFullscreen) docElement.requestFullscreen();
        else if (docElement.webkitRequestFullscreen) docElement.webkitRequestFullscreen();
        else if (docElement.mozRequestFullScreen) docElement.mozRequestFullScreen();
        else if (docElement.msRequestFullscreen) docElement.msRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
}

function handleIOSFullscreen() {
    alert("On mobile devices, you can add this web app to your home screen for a fullscreen experience. In Safari, tap the Share button and then 'Add to Home Screen'.");
}

function handleSizeChange(e) {
    document.querySelector(".container").className = "container " + e.target.value;
}

function handleCopyright() {
    openPopup();
    understandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="25" viewBox="0 -960 960 960" width="25" fill="#e3e3e3"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"></path></svg>Understand';
}

function handleUnderstand() {
    localStorage.setItem('popupAcknowledged', 'true');
    
    [sizeSelector, fullscreenBtn, minimizeBtn].forEach(el => {
        el.disabled = false;
    });

    sizeSelector.title = "Change size";
    fullscreenBtn.title = "Enter or exit fullscreen";
    minimizeBtn.title = "Minimize or restore controls";
    
    closePopup();
}

function handlePopupClick(e) {
    if (e.target === popupOverlay) closePopup();
}

function handleKeydown(e) {
    if (e.key === 'Escape') closePopup();
    if (e.key === 'F11') setTimeout(updateFullscreenButton, 100);
}

function init() {
    if (isIOS) {
        fullscreenBtn.innerHTML = `
            <svg viewBox="0 0 36 36" width="25" height="25" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 z"/>
                <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 z"/>
                <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 z"/>
                <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 z"/>
            </svg>
            Info`;
        fullscreenBtn.addEventListener("click", handleIOSFullscreen);
    }

    if (window.matchMedia('(display-mode: standalone)').matches && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        fullscreenBtn.style.display = "none";
    }

    if (localStorage.getItem('popupAcknowledged') !== 'true') {
        setTimeout(openPopup, 2500);
    } else {
        [sizeSelector, fullscreenBtn, minimizeBtn].forEach(el => {
            el.disabled = false;
            el.title = el === sizeSelector ? "Change size" : 
                       el === fullscreenBtn ? "Enter or exit fullscreen" : 
                       "Minimize or restore controls";
        });
    }

    fullscreenBtn.addEventListener("click", isIOS ? handleIOSFullscreen : handleFullscreen);
    sizeSelector.addEventListener("change", handleSizeChange);
    minimizeBtn.addEventListener("click", toggleControls);
    copyrightBtn.addEventListener('click', handleCopyright);
    understandBtn.addEventListener('click', handleUnderstand);
    popupOverlay.addEventListener('click', handlePopupClick);
    document.addEventListener('keydown', handleKeydown);
    
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event => {
        document.addEventListener(event, () => {
            updateFullscreenButton();
            updateSlashWidth();
        });
    });

    window.addEventListener('load', updateSlashWidth);
    window.addEventListener('resize', updateSlashWidth);

    updateFullscreenButton();
    tick();
    setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', init);