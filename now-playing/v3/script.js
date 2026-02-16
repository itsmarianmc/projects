const API_URL = 'https://itsmarianmc-github.vercel.app/api/now-playing';
let credentials = null;
let fetchInterval = null;
let progressInterval = null;
let animationInterval = null;
let currentTrackData = null;
let localProgressMs = 0;
let currentAlbumUrl = '';
let isFlipped = false;

const elements = {
    errorContainer: document.getElementById('errorContainer'),
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
        ? availableWidth / clientWidth * 0.95
        : availableHeight / clientHeight * 0.95;
};

function scalePlayerView() {
    const playerView = document.querySelector('.player-view');
    if (!playerView || playerView.style.display === 'none') return;

    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const designWidth = 1200;
    const designHeight = 198;
    
    const paddingX = 20;
    const paddingY = 20;

    const scale = calculateScale(
        designWidth, 
        designHeight, 
        containerWidth, 
        containerHeight, 
        paddingX, 
        paddingY
    );

    playerView.style.transform = `scale(${scale})`;
}

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('spotifyCredentials');
    if (!saved) {
        elements.errorContainer.style.display = 'block';
        return;
    }

    credentials = JSON.parse(saved);
    elements.loadingView.style.display = 'block';

    generateWaveform();
    fetchNowPlaying();

    fetchInterval = setInterval(fetchNowPlaying, 4000);
    progressInterval = setInterval(updateLocalProgress, 1000);
    
    window.addEventListener('resize', () => {
        setTimeout(() => {
            scalePlayerView();
        }, 1000);
    });
    setTimeout(scalePlayerView, 1000);
});

function generateWaveform() {
    const barCount = 25;
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        const height = Math.random() * 60 + 30;
        bar.style.height = height + '%';
        bar.dataset.targetHeight = height;
        elements.waveform.appendChild(bar);
    }
}

function animateWaveform() {
    const bars = elements.waveform.querySelectorAll('.waveform-bar');
    
    bars.forEach((bar, index) => {
        const newHeight = Math.random() * 50 + 40;
        bar.dataset.targetHeight = newHeight;
        bar.style.height = newHeight + '%';
    });
}

function updateWaveform(progressPercent, isPlaying) {
    const bars = elements.waveform.querySelectorAll('.waveform-bar');
    const activeCount = Math.floor((progressPercent / 100) * bars.length);
    
    bars.forEach((bar, i) => {
        if (i < activeCount) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    });

    if (isPlaying && !animationInterval) {
        animationInterval = setInterval(animateWaveform, 600);
    } else if (!isPlaying && animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

async function fetchNowPlaying() {
    if (!credentials) return;

    try {
        const url = `${API_URL}?client_id=${encodeURIComponent(credentials.clientId)}&client_secret=${encodeURIComponent(credentials.clientSecret)}&refresh_token=${encodeURIComponent(credentials.refreshToken)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            return;
        }

        currentTrackData = data;
        localProgressMs = data.progress_ms || 0;

        elements.loadingView.style.display = 'none';
        console.log(data)
        updatePlayerUI(data);
        
        setTimeout(scalePlayerView, 250);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function updateLocalProgress() {
    if (!currentTrackData || !currentTrackData.playing) return;
    localProgressMs += 1000;
    if (localProgressMs > currentTrackData.track.duration_ms) {
        localProgressMs = currentTrackData.track.duration_ms;
    }
    updateProgressUI();
}

function updateProgressUI() {
    if (!currentTrackData) return;
    const progressPercent = (localProgressMs / currentTrackData.track.duration_ms) * 100;
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.currentTime.textContent = formatTime(localProgressMs);
    updateWaveform(progressPercent, currentTrackData.playing);
}

function updatePlayerUI(data) {
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

    const artistsHtml = data.artists.map(a => a.name).join(', ');
    elements.artistName.textContent = artistsHtml;

    const progressPercent = (localProgressMs / data.track.duration_ms) * 100;
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.currentTime.textContent = formatTime(localProgressMs);
    elements.totalTime.textContent = formatTime(data.track.duration_ms);

    updateWaveform(progressPercent, data.playing);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

window.addEventListener('beforeunload', () => {
    if (fetchInterval) clearInterval(fetchInterval);
    if (progressInterval) clearInterval(progressInterval);
    if (animationInterval) clearInterval(animationInterval);
});