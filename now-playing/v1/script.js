const API_URL = 'https://itsmarianmc-github.vercel.app/api/now-playing';
let credentials = null;
let currentSongId = null;
let firstAnimationShown = false;
let secondAnimationShown = false;
let thirdAnimationShown = false;
let localProgressMs = 0;
let lastFetchTime = 0;
let currentTrackData = null;

function showAnimation(title, artists) {
	const musicContainer = document.getElementById('musicContainer');
	const precursorVertical = document.getElementById('precursorVertical');
	const leftBox = document.getElementById('leftBox');
	const arrow = document.getElementById('arrow');
	const precursorHorizontal = document.getElementById('precursorHorizontal');
	const bar = document.getElementById('bar');
	const text = document.getElementById('text');
	const titleText = document.getElementById('titleText');
	const subtitleText = document.getElementById('subtitleText');

	titleText.textContent = title;
	subtitleText.textContent = artists;

	precursorVertical.classList.remove('animate');
	leftBox.classList.remove('animate');
	arrow.classList.remove('animate');
	precursorHorizontal.classList.remove('animate');
	bar.classList.remove('animate');
	text.classList.remove('animate');

	musicContainer.classList.add('show');

	setTimeout(() => {
		precursorVertical.classList.add('animate');
		leftBox.classList.add('animate');
		arrow.classList.add('animate');
		precursorHorizontal.classList.add('animate');
		bar.classList.add('animate');
		text.classList.add('animate');
	}, 50);

	setTimeout(() => {
		musicContainer.classList.remove('show');
	}, 13000);
}

async function fetchNowPlaying() {
	if (!credentials) return;

	try {
		const url = `${API_URL}?client_id=${encodeURIComponent(credentials.clientId)}&client_secret=${encodeURIComponent(credentials.clientSecret)}&refresh_token=${encodeURIComponent(credentials.refreshToken)}`;
		
		const response = await fetch(url);
		const data = await response.json();

		if (data.error) {
			console.error('API Error:', data.error);
			currentSongId = null;
			firstAnimationShown = false;
			secondAnimationShown = false;
			thirdAnimationShown = false;
			return;
		}

		currentTrackData = data;
		localProgressMs = data.progress_ms || 0;
		lastFetchTime = Date.now();

		checkAndShowAnimations();

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

	checkAndShowAnimations();
}

function checkAndShowAnimations() {
	if (!currentTrackData || !currentTrackData.playing || !currentTrackData.track) {
		currentSongId = null;
		firstAnimationShown = false;
		secondAnimationShown = false;
		thirdAnimationShown = false;
		return;
	}

	const songId = currentTrackData.track.id;
	const progress = localProgressMs;
	const duration = currentTrackData.track.duration_ms;
	const title = currentTrackData.track.name.replace(/\s*\((?:with|feat\.?|ft\.?)\s+[^)]+\)|\s*\([^)]*(?:feat\.?|ft\.?)[^)]*\)/gi, '');
	const artists = currentTrackData.artists.map(a => a.name).join(", ").replace(/, ([^,]*)$/, " FT. $1");

	if (songId !== currentSongId) {
		currentSongId = songId;
		firstAnimationShown = false;
		secondAnimationShown = false;
		thirdAnimationShown = false;
	}

	if (progress >= 10000 && progress <= 16000 && !firstAnimationShown) {
		showAnimation(title, artists);
		firstAnimationShown = true;
	}

	const midpoint = duration / 2;
	if (progress >= midpoint - 5000 && progress <= midpoint + 5000 && !thirdAnimationShown) {
		showAnimation(title, artists);
		thirdAnimationShown = true;
	}

	const timeRemaining = duration - progress;
	if (timeRemaining <= 26000 && timeRemaining >= 18000 && !secondAnimationShown) {
		showAnimation(title, artists);
		secondAnimationShown = true;
	}
}

function initializeWidget() {
	const saved = localStorage.getItem('spotifyCredentials');
	if (!saved) {
		console.error('No Spotify credentials found in localStorage');
		const loginContainer = document.getElementById('login-container');
		if (loginContainer) {
			loginContainer.style.display = 'block';
		}
		return;
	}

	credentials = JSON.parse(saved);
	
	const loginContainer = document.getElementById('login-container');
	if (loginContainer) {
		loginContainer.style.display = 'none';
	}

	const popupOverlay = document.getElementById('popupOverlay');
	if (popupOverlay) {
		popupOverlay.style.display = 'flex';
		setTimeout(() => {
			popupOverlay.style.display = 'none';
		}, 5000);
	}
	
	fetchNowPlaying();
	
	setInterval(fetchNowPlaying, 4000);
	setInterval(updateLocalProgress, 1000);
}

window.addEventListener('DOMContentLoaded', initializeWidget);