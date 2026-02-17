let credentials = null;
let currentSongId = null;
let firstAnimationShown = false;
let secondAnimationShown = false;
let thirdAnimationShown = false;
let localProgressMs = 0;
let lastFetchTime = 0;
let currentTrackData = null;

const elements = {
	loginContainer: document.getElementById('login-container'),
	mainContainer: document.getElementById('musicContainer'),
	error: document.getElementById('errorMsg'),
}

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
	
	setInterval(fetchNowPlaying, 1000);
	setInterval(updateLocalProgress, 1000);
}

window.addEventListener('DOMContentLoaded', initializeWidget);