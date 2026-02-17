let credentials = null;
let fetchInterval = null;
let animationInterval = null;
let currentTrackData = null;
let localProgressMs = 0;
let currentAlbumUrl = '';
let isFlipped = false;

let lastProgressMs = null;
let samePositionCount = 0;
const SAME_POSITION_THRESHOLD = 3;

const elements = {
    errorContainer: document.getElementById('errorContainer'),
    loginContainer: document.getElementById('login-container'),
    mainContainer: document.querySelector('.container'),
    pausedFill: document.getElementById('pausedFill'),
    pausedContainer: document.querySelector('.paused-container'),
    playingContainer: document.querySelector('.playback-container'),
    error: document.getElementById('errorMsg'),
    loadingView: document.getElementById('loadingView'),
    notPlayingView: document.getElementById('notPlayingView'),
    playingView: document.getElementById('playingView'),
    albumFlipContainer: document.getElementById('albumFlipContainer'),
    albumArtFront: document.getElementById('albumArtFront'),
    albumArtBack: document.getElementById('albumArtBack'),
    trackName: document.getElementById('trackName'),
    artistName: document.getElementById('artistName'),
    progressFill: document.getElementById('progressFill'),
    currentTime: document.getElementById('currentTime'),
    totalTime: document.getElementById('totalTime'),
    totalTimePaused: document.getElementById('totalTimePaused'),
    waveform: document.getElementById('waveform')
};

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function setColorsFromImage(img) {
    if (!img.complete || !img.naturalWidth) {
        img.onload = () => extractColorsFromImage(img);
        return;
    }
    extractColorsFromImage(img);
}

function extractColorsFromImage(img) {
    try {
        const colorThief = new ColorThief();
        const dominant = colorThief.getColor(img);
        const [r, g, b] = dominant;

        const hsl = rgbToHsl(r, g, b);
        let [h, s, l] = hsl;

        const textL = Math.min(0.9, l + 0.5);
        const textS = Math.max(0.2, s * 0.8);
        const textRgb = hslToRgb(h, textS, textL);
        document.documentElement.style.setProperty('--text-primary', `rgb(${textRgb[0]},${textRgb[1]},${textRgb[2]})`);

        const bgL = Math.max(0.1, l * 0.5);
        const bgS = s;
        const bgRgb = hslToRgb(h, bgS, bgL);
        document.documentElement.style.setProperty('--bg-section', `rgb(${bgRgb[0]},${bgRgb[1]},${bgRgb[2]})`);

        const accentL = Math.min(0.8, l + 0.6);
        const accentS = s;
        const accentRgb = hslToRgb(h, accentS, accentL);
        document.documentElement.style.setProperty('--fill-color', `rgb(${accentRgb[0]},${accentRgb[1]},${accentRgb[2]})`);
        document.documentElement.style.setProperty('--fill-color-bg', `rgb(${accentRgb[0]},${accentRgb[1]},${accentRgb[2]}, 0.5)`);
    } catch (e) {
        console.error('Color extraction failed', e);
    }
}

const calculateScale = (clientWidth, clientHeight, containerWidth, containerHeight, paddingX, paddingY) => {
    const availableWidth = containerWidth - paddingX * 2;
    const availableHeight = containerHeight - paddingY * 2;
    const aspectRatioElement = clientWidth / clientHeight;
    const aspectRatioContainer = availableWidth / availableHeight;
    return aspectRatioElement > aspectRatioContainer
        ? availableWidth / clientWidth
        : availableHeight / clientHeight;
};

function scalePlayerView() {
    const playerView = document.querySelector('.player-view');
    if (!playerView || playerView.style.display === 'none' || playerView.offsetWidth === 0) return;

    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const playerWidth = playerView.offsetWidth;
    const playerHeight = playerView.offsetHeight;

    const paddingX = 20;
    const paddingY = 20;

    const scale = calculateScale(playerWidth, playerHeight, containerWidth, containerHeight, paddingX, paddingY);
    playerView.style.transform = `scale(${scale})`;
}

function generatePlaceholerFill() {
    const randomPercent = Math.floor(Math.random() * 101);
    elements.pausedFill.style.width = `${randomPercent}%`;
}

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('spotifyCredentials');
    if (!saved) {
        elements.errorContainer.style.display = 'block';
        return;
    }

    credentials = JSON.parse(saved);
    elements.loadingView.style.display = 'block';

    fetchNowPlaying();

    fetchInterval = setInterval(fetchNowPlaying, 1000);

    window.addEventListener('resize', () => {
        setTimeout(() => scalePlayerView(), 1000);
    });

    setTimeout(scalePlayerView, 1000);
});

async function fetchNowPlaying() {
    if (!credentials) return;

    const { clientId, clientSecret, refreshToken } = credentials;

    if (!clientId || !clientSecret || !refreshToken) {
        elements.loginContainer.style.display = 'block';
        elements.mainContainer.style.display = 'none';
        if (!clientId) {
            elements.error.innerText = 'No Client Id found!';
        } else if (!refreshToken) {
            elements.error.innerText = 'No refresh Token found!';
        } else if (!clientSecret) {
            elements.error.innerText = 'No client Secret found!';
        }
        return;
    }

    try {
        const data = await fetchNowPlayingFromSpotify(clientId, clientSecret, refreshToken);

        if (data.error) {
            console.error('Spotify Error:', data.error);
            return;
        }

        currentTrackData = data;
        localProgressMs = data.progress_ms || 0;

        const currentProgress = data.progress_ms || 0;

        if (lastProgressMs !== null && currentProgress === lastProgressMs) {
            samePositionCount++;
        } else {
            samePositionCount = 0;
        }
        lastProgressMs = currentProgress;

        const isFrozen = samePositionCount >= SAME_POSITION_THRESHOLD;
        const isPaused = data.playing === false || data.recently_played === true || isFrozen;

        if (isPaused) {
            elements.pausedContainer.style.display = 'flex';
            elements.playingContainer.style.display = 'none';
        } else {
            elements.pausedContainer.style.display = 'none';
            elements.playingContainer.style.display = 'flex';
        }

        elements.loadingView.style.display = 'none';
        console.log(data);
        updatePlayerUI(data, isPaused);

        setTimeout(scalePlayerView, 250);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function updateProgressUI() {
    if (!currentTrackData) return;
    const progressPercent = (localProgressMs / currentTrackData.track.duration_ms) * 100;
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.pausedFill.style.width = `${progressPercent}%`;
    elements.currentTime.textContent = formatTime(localProgressMs);
}

function updatePlayerUI(data, isPaused = false) {
    if (!data.track) {
        elements.notPlayingView.style.display = 'block';
        elements.playingView.style.display = 'none';
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        return;
    }

    elements.notPlayingView.style.display = 'none';
    elements.playingView.style.display = 'block';

    const albumImage = data.album.images[0]?.url || '';

    if (albumImage !== currentAlbumUrl && currentAlbumUrl !== '') {
        const backImg = elements.albumArtBack;
        backImg.crossOrigin = 'Anonymous';
        backImg.src = albumImage;

        backImg.onload = () => {
            elements.albumFlipContainer.classList.add('flipping');

            setTimeout(() => {
                elements.albumFlipContainer.classList.add('reset');
                elements.albumArtFront.src = albumImage;
                elements.albumFlipContainer.classList.remove('flipping');

                requestAnimationFrame(() => {
                    elements.albumFlipContainer.classList.remove('reset');
                    setColorsFromImage(elements.albumArtFront);
                });
            }, 800);
        };
    } else if (currentAlbumUrl === '') {
        const frontImg = elements.albumArtFront;
        frontImg.crossOrigin = 'Anonymous';
        frontImg.src = albumImage;
        frontImg.onload = () => setColorsFromImage(frontImg);
    }

    currentAlbumUrl = albumImage;

    elements.trackName.textContent = data.track.name;
    elements.artistName.textContent = data.artists.map(a => a.name).join(', ');

    const progressPercent = (localProgressMs / data.track.duration_ms) * 100;
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.pausedFill.style.width = `${progressPercent}%`;
    elements.currentTime.textContent = formatTime(localProgressMs);
    elements.totalTime.textContent = formatTime(data.track.duration_ms);
    elements.totalTimePaused.textContent = formatTime(data.track.duration_ms);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

window.addEventListener('beforeunload', () => {
    if (fetchInterval) clearInterval(fetchInterval);
    if (animationInterval) clearInterval(animationInterval);
});