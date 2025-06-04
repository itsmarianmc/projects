const storage = localStorage;
const setupScreen = document.getElementById('setup-screen');
const cardScreen = document.getElementById('card-screen');
const timerScreen = document.getElementById('timer-screen');

const namesInput = document.getElementById('names-input');
const impostorCount = document.getElementById('impostor-count');
const timerMinutes = document.getElementById('timer-minutes');
const startBtn = document.getElementById('start-btn');

const card = document.getElementById('card');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextBtn = document.getElementById('next-btn');

const pauseBtn = document.getElementById('pause-btn');
const revealImpostorBtn = document.getElementById('reveal-impostors');

let players = [],
    impostors = [],
    word = '',
    current = 0,
    timer;
let isPaused = false;
let startY;
const threshold = 80;

const allCategories = ['entertainment', 'daily', 'animalsnature', 'sports', 'school', 'festivals', 'stars', 'fruits', 'countries'];

function getSelectedCategories() {
    const checked = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(el => el.value);
    if (checked.includes('all')) {
        return [...allCategories];
    }
    return checked;
}

function loadSettings() {
    if (storage.names) namesInput.value = storage.names;
    if (storage.impostors) impostorCount.value = storage.impostors;
    if (storage.timer) timerMinutes.value = storage.timer;
    if (storage.categories) {
        let cats = JSON.parse(storage.categories);
        document.querySelectorAll('input[name="category"]').forEach(el => {
            el.checked = cats.includes(el.value);
        });
    }
}
loadSettings();

document.addEventListener("DOMContentLoaded", function() {
    function generateStyles() {
        const elements = document.querySelectorAll('*');
        const styles = new Set();
        elements.forEach(element => {
            element.classList.forEach(cls => {
                if (/^[wh]\d/.test(cls)) {
                    const prop = cls[0] === 'w' ? 'width' : 'height';
                    const parts = cls.substring(1).split('-');
                    const val = parts[0] + (parts[1] ? '.' + parts[1] : '');
                    if (!isNaN(val)) styles.add(`.${cls} { ${prop}: ${val}px; }`);
                }
            });
        });
        return Array.from(styles).join('\n');
    }
    const styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    styleTag.appendChild(document.createTextNode(generateStyles()));
    document.head.appendChild(styleTag);

    document.querySelector(".initialision").style.display = "block";
    document.getElementById("setup-screen").classList.add("hidden");
    setTimeout(() => {
        setTimeout(() => {
            document.querySelector(".initialision").style.display = "none";
            document.getElementById("setup-screen").classList.remove("hidden");
            document.getElementById("footer-placeholder").classList.replace('h555', 'h400');
        }, 500);
        document.getElementById("initialision-text").style.display = "block";
    }, 6000);

    const words = [ "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu Server",
                    "Verbinde zu GitHub",
                    "Verbinde zu GitHub",
                    "Überprüfe auf Updates",
                    "Überprüfe auf Updates",
                    "Überprüfe auf Updates",
                    "Überprüfe auf Updates",
                    "Überprüfe auf Updates",
                    "Überprüfe auf Updates",
                    "Rufe Database ab...",
                    "Rufe Database ab...",
                    "Rufe Database ab...",
                    "Rufe Database ab...",
                    "Initialisiere Spielesystem",
                    "Initialisiere Grafikschnittstelle",
                    "Lade Texturen",
                    "Lade dynamische Objekte",
                    "Authentifiziere Benutzer...",
                    "Hole Benutzerprofil...",
                    "Starte Serversynchronisation",
                    "Überprüfe Serverstatus",
                    "Analysiere Datenbankstruktur...",
                    "Synchronisiere Cloud-Daten",
                    "Leere temporäre Caches",
                    "Baue Index neu auf",
                    "Validiere lokale Daten",
                    "Optimierung läuft...",
                    "Konfiguriere Module...",
                    "Sammle Debug-Informationen...",
                    "Kalibriere Netzwerkeinstellungen",
                    "Überprüfe Kompatibilität",
                    "Letzte Optimierungen...",
                    "Bereite Spielstart vor...",
                    "Verifiziere Sicherheitseinstellungen",
                    "Starte Benutzeroberfläche",
                    "Schließe ab",
                    "Schließe ab",
                    "Schließe ab",
                    "Starte Spiel",
                    "Starte Spiel",
                    "Starte Spiel",
                    "Starte Spiel"];
    const display = document.getElementById('startprogress');
    let idx = 0;
    const interv = setInterval(() => {
        if (idx < words.length) display.textContent = words[idx++];
        else {
            clearInterval(interv);
            display.textContent = "Fertig, das Spiel startet gleich.";
        }
    }, 100);

    impostorCount.addEventListener('input', checkImpostorInput);
});

startBtn.addEventListener('click', async () => {
    players = namesInput.value.split('\n').map(n => n.trim()).filter(n => n);
    const impCount = parseInt(impostorCount.value, 10);
    const tmin = parseInt(timerMinutes.value, 10);
    const selectedCats = getSelectedCategories();

    if (players.length < 2) return alert('Mindestens 2 Spieler!');
    if (impCount >= players.length) return alert('Zu viele Impostoren!');
    if (selectedCats.length === 0) return alert('Bitte mindestens eine Kategorie auswählen!');

    storage.names = namesInput.value;
    storage.impostors = impCount;
    storage.timer = tmin;
    storage.categories = JSON.stringify(selectedCats);

    impostors = shuffle([...Array(players.length).keys()]).slice(0, impCount);
    word = await loadWord(selectedCats);

    setupScreen.classList.add('hidden');
    cardScreen.classList.remove('hidden');
    current = 0;
    checkImpostorInput();
    showCard();
});

card.addEventListener('pointerdown', e => startY = e.clientY);
card.addEventListener('pointerup', e => {
    const dy = startY - e.clientY;
    if (dy > threshold) revealCard();
    else if (dy < -threshold) hideCard();
});
nextBtn.addEventListener('click', () => {
    current++;
    if (current < players.length) showCard();
    else startTimerPhase();
});

function checkImpostorInput() {
    const v = parseInt(impostorCount.value, 10);
    document.getElementById("impostor-sp").innerText = v === 1 ? 'Der Impostor ist: ' : 'Die Impostoren sind: ';
}

function showCard() {
    card.classList.remove('revealed');
    cardBack.textContent = '';
    cardFront.innerHTML = `<div style="position:relative;top:0"><a>${players[current]}</a></div><div style="height:calc(100% - 157.5px)"></div><div style="position:relative; bottom:0"><a>↑</a><br><a>Karte aufdecken</a></div>`;
    nextBtn.disabled = true;
}

function revealCard() {
    const isImp = impostors.includes(current);
    cardBack.innerHTML = isImp ?
        `<div style="position:relative;top:0"><a style="color:#f00">Impostor</a></div><div style="height:calc(100% - 157.5px)"></div><div style="position:relative;bottom:0"><a>↓</a><br><a>Karte umdrehen</a></div>` :
        `<div style="position:relative;top:0"><a>${word}</a></div><div style="height:calc(100% - 157.5px)"></div><div style="position:relative;bottom:0"><a>↓</a><br><a>Karte umdrehen</a></div>`;
    card.classList.add('revealed');
    nextBtn.disabled = false;
}

function hideCard() {
    card.classList.remove('revealed');
    nextBtn.disabled = false;
}

function startTimerPhase() {
    const displayContainer = document.getElementById('randomplayer');

    cardScreen.classList.add('hidden');
    timerScreen.classList.remove('hidden');
    document.querySelector(".timer-controls").classList.remove('hidden');
    startTimer(parseInt(timerMinutes.value, 10));


    displayContainer.classList.remove('hidden');
    setTimeout(() => {
        displayContainer.classList.add('hidden');
    }, 5000);

    const randomPlayer = getRandomPlayer();
    displayContainer.innerHTML = `<a><b>${randomPlayer} fängt an</b></a><div class="placeholder w100 h10></div>`;

    function getRandomPlayer() {
        if (players.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * players.length);
        return players[randomIndex];
    }
}

function startTimer(mins) {
    let remaining = mins * 60;
    const display = document.getElementById('timer-display');
    const finish = document.getElementById('finished-text');
    update();
    timer = setInterval(() => {
        if (!isPaused) {
            remaining--;
            if (remaining < 0) {
                clearInterval(timer);
                display.textContent = '00:00';
                finish.classList.remove('hidden');
                revealImpostors();
            } else update();
        }
    }, 1000);

    function update() {
        display.textContent = `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
    }
}

function pauseTimer() {
    revealImpostorBtn.classList.add('expand');
    revealImpostorBtn.classList.remove('hidden');
    setTimeout(() => {
        revealImpostorBtn.innerText = "Impostor auflösen";
        pauseBtn.classList.add('paused');
    }, 200);

    isPaused = true;
}

function resumeTimer() {
    pauseBtn.classList.remove('paused');
    revealImpostorBtn.classList.remove('expand');
    setTimeout(() => {
        revealImpostorBtn.innerText = "";
        revealImpostorBtn.classList.add('hidden');
    }, 500);
    isPaused = false;
}

pauseBtn.addEventListener('click', function() {
    if (isPaused) {
        resumeTimer();
        pauseBtn.classList.remove('paused');
        pauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="25" viewBox="0 -960 960 960" width="25" fill="#fff"><path d="M320-200v-560h80v560h-80Zm240 0v-560h80v560h-80Z"/></svg>`;
    } else {
        pauseTimer();
        pauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="25" viewBox="0 -960 960 960" width="25" fill="#fff"><path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/></svg>`;
    }
});

revealImpostorBtn.addEventListener('click', revealImpostors);

// Zeigt nach Ende die Impostoren und das Wort
function revealImpostors() {
    document.getElementById('timer-display').classList.add('hidden');
    pauseBtn.classList.add('hidden');
    revealImpostorBtn.classList.add('hidden');
    document.getElementById('new-game').classList.remove('hidden');
    const list = document.getElementById('impostor-list');
    const finalWord = document.getElementById('final-word');
    impostors.forEach(i => {
        const a = document.createElement('a');
        a.textContent = players[i] + (impostors.length > 1 ? '; ' : '');
        list.appendChild(a);
    });
    finalWord.textContent = word;
    document.getElementById('impostor-word-reveal').classList.remove('hidden');
}

document.getElementById('startnewgame').addEventListener('click', () => location.reload());

// Overlay-Infos
document.querySelector(".information").addEventListener("click", function(){
    document.documentElement.style.overflowY = "hidden";
    document.documentElement.style.overflowX = "hidden";
    document.getElementById("overlay-background").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    
    setTimeout(function() {
        document.getElementById("overlay").style.top = "calc(50% + 10px)";
        document.getElementById("overlay").style.height = "calc(100% - 10px)";
        document.getElementById("overlay").style.transform = "translate(-50%, -50%)";
    }, 10);
});

document.getElementById("done-btn").addEventListener("click", function(){
    document.getElementById("overlay").style.top = "100%";
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlay").style.transform = "translate(-50%, 0%)";
    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.overflowX = "hidden";

    setTimeout(function() {
        document.getElementById("overlay-background").style.display = "none";
        document.getElementById("overlay").style.display = "none";
    }, 150);
});

// Wort-Ladefunktionen
async function loadWord(cats) {
    const cat = cats[Math.floor(Math.random() * cats.length)];
    return randomFrom(await fetchWords(cat));
}
async function fetchWords(c) {
    const res = await fetch(`words/${c}.json`);
    if (!res.ok) throw new Error('Wörter nicht gefunden für ' + c);
    return res.json();
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}