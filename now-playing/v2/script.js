let credentials = null;
let currentTrackData = null;
let localProgressMs = 0;
let lastFetchTime = 0;
let currentSongId = null;

let firstAnimationShown = false;
let secondAnimationShown = false;
let thirdAnimationShown = false;

let fetchInterval = null;
let progressInterval = null;

const elements = {
    loginContainer: document.getElementById('login-container'),
    mainContainer: document.getElementById('musicContainer'),
    error: document.getElementById('errorMsg'),
    musicContainer: null,
    coverImg: null,
    title: null,
    subtitle: null,
    leftBox: null,
    leftBoxDiv: null,
    leftBoxSvg: null,
    mainContent: null,
    titles: null
};

window.addEventListener('DOMContentLoaded', () => {
    elements.musicContainer = document.getElementById('musicContainer');
    elements.coverImg = document.getElementById('coverImg');
    elements.title = document.getElementById('title');
    elements.subtitle = document.getElementById('subtitle');
    elements.leftBox = document.querySelector('.left-box');
    elements.leftBoxDiv = document.querySelector('.left-box div');
    elements.leftBoxSvg = document.querySelector('.left-box svg');
    elements.mainContent = document.querySelector('.main-content');
    elements.titles = document.querySelector('.titles');

    const saved = localStorage.getItem('spotifyCredentials');
    if (!saved) {
        console.warn('Keine Spotify Credentials gefunden. Bitte zuerst im Dashboard einrichten.');
        document.getElementById('login-container').style.display = 'block';
        return;
    }

    credentials = JSON.parse(saved);
    
    startMonitoring();
});

function startMonitoring() {
    fetchNowPlaying();

    fetchInterval = setInterval(fetchNowPlaying, 1000);

    progressInterval = setInterval(updateLocalProgressAndCheck, 1000);
}

async function fetchNowPlaying() {
    if (!credentials) return;

    const { clientId, clientSecret, refreshToken } = credentials;

    if (!clientId || !clientSecret || !refreshToken) {
        elements.loginContainer.style.display = 'block';
        elements.mainContainer.style.display = 'none';
        if (!clientId) {
            console.log('No Client Id found!');
            elements.error.innerText = 'No Client Id found!';
        } else if (!refreshToken) {
            console.log('No refresh Token found!');
            elements.error.innerText = 'No refresh Token found!';
        } else if (!clientSecret) {
            console.log('No client Secret found!');
            elements.error.innerText = 'No client Secret found!';
        }
        return;
    }

    try {
        const data = await fetchNowPlayingFromSpotify(clientId, clientSecret, refreshToken);

        if (data.error) {
            console.error('API Fehler:', data.error);
            return;
        }

        if (data.playing && data.track) {
            const newSongId = data.track.id;
            if (newSongId !== currentSongId) {
                currentSongId = newSongId;
                firstAnimationShown = false;
                secondAnimationShown = false;
                thirdAnimationShown = false;
            }
        } else {
            currentSongId = null;
            firstAnimationShown = false;
            secondAnimationShown = false;
            thirdAnimationShown = false;
        }

        currentTrackData = data;
        if (data.playing) {
            localProgressMs = data.progress_ms || 0;
        }
        lastFetchTime = Date.now();

    } catch (error) {
        console.error('Fetch Fehler:', error);
    }
}

function updateLocalProgressAndCheck() {
    if (!currentTrackData || !currentTrackData.playing) {
        return;
    }

    localProgressMs += 1000;

    const duration = currentTrackData.track.duration_ms;
    if (localProgressMs > duration) {
        localProgressMs = duration;
    }

    checkAnimationConditions();
}

function checkAnimationConditions() {
    if (!currentTrackData || !currentTrackData.playing) return;

    const progress = localProgressMs;
    const duration = currentTrackData.track.duration_ms;
    const title = currentTrackData.track.name;
    const artists = currentTrackData.artists.map(a => a.name).join(', ');
    const coverUrl = currentTrackData.album.images[0]?.url || '';

    if (progress >= 10000 && progress <= 12000 && !firstAnimationShown) {
        showAnimation(title, artists, coverUrl);
        firstAnimationShown = true;
    }

    const timeRemaining = duration - progress;
    if (timeRemaining <= 22000 && timeRemaining >= 20000 && !secondAnimationShown) {
        showAnimation(title, artists, coverUrl);
        secondAnimationShown = true;
    }

    const midpoint = duration / 2;
    if (progress >= midpoint - 5000 && progress <= midpoint + 5000 && !thirdAnimationShown) {
        showAnimation(title, artists, coverUrl);
        thirdAnimationShown = true;
    }
}

function showAnimation(title, artists, coverUrl) {
    const musicContainer = elements.musicContainer;
    const leftBox = elements.leftBox;
    const leftBoxDiv = elements.leftBoxDiv;
    const leftBoxSvg = elements.leftBoxSvg;
    const mainContainer = elements.mainContent;
    const titles = elements.titles;

    const titleText = elements.title;
    const subtitleText = elements.subtitle;
    const coverImg = elements.coverImg;

    coverImg.src = coverUrl;

    titleText.textContent = title;
    subtitleText.textContent = artists;

    leftBox.classList.remove('animate');
    leftBoxDiv.classList.remove('animate');
    leftBoxSvg.classList.remove('animate');
    mainContainer.classList.remove('animate');
    titles.classList.remove('animate');
    musicContainer.classList.add('show');

    setTimeout(() => {
        leftBox.classList.add('animate');
        leftBoxDiv.classList.add('animate');
        leftBoxSvg.classList.add('animate');
        mainContainer.classList.add('animate');
        titles.classList.add('animate');
    }, 50);

    setTimeout(() => {
        musicContainer.classList.remove('show');
    }, 17000);
}

window.addEventListener('beforeunload', () => {
    if (fetchInterval) clearInterval(fetchInterval);
    if (progressInterval) clearInterval(progressInterval);
});