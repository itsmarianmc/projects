const clientId = "c377333af1f84cd4a940c86d409e796e";
const redirectUri = window.location.origin + window.location.pathname;
const scopes = "user-read-currently-playing user-read-playback-state";

let currentSongId = null;
let firstAnimationShown = false;
let secondAnimationShown = false;

function base64urlencode(str) {
	return btoa(String.fromCharCode(...new Uint8Array(str)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

async function sha256(plain) {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return await crypto.subtle.digest("SHA-256", data);
}

function generateRandomString(length) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

async function login() {
	const verifier = generateRandomString(128);
	sessionStorage.setItem("verifier", verifier);

	const challenge = base64urlencode(await sha256(verifier));

	const params = new URLSearchParams({
		client_id: clientId,
		response_type: "code",
		redirect_uri: redirectUri,
		scope: scopes,
		code_challenge_method: "S256",
		code_challenge: challenge
	});

	window.location = "https://accounts.spotify.com/authorize?" + params.toString();
}

async function exchangeCode(code) {
	const verifier = sessionStorage.getItem("verifier");

	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: "authorization_code",
		code: code,
		redirect_uri: redirectUri,
		code_verifier: verifier
	});

	const res = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body
	});

	const data = await res.json();

	sessionStorage.setItem("token", data.access_token);
	sessionStorage.setItem("refresh_token", data.refresh_token);
	sessionStorage.setItem("expires_at", Date.now() + data.expires_in * 1000);
}

async function fetchCurrentSong(token) {
	const validToken = await getValidToken();

	const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
		headers: {
			Authorization: "Bearer " + validToken
		}
	});

	if (res.status === 204) return null;
	return await res.json();
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

async function monitorPlayback(token) {
	setInterval(async () => {
		const data = await fetchCurrentSong(token);

		if (!data || !data.item || !data.is_playing) {
			currentSongId = null;
			firstAnimationShown = false;
			secondAnimationShown = false;
			return;
		}

		const songId = data.item.id;
		const progress = data.progress_ms;
		const duration = data.item.duration_ms;
		const title = data.item.name;
		const artists = data.item.artists.map(a => a.name).join(" x ");

		if (songId !== currentSongId) {
			currentSongId = songId;
			firstAnimationShown = false;
			secondAnimationShown = false;
		}

		if (progress >= 10000 && progress <= 12000 && !firstAnimationShown) {
			showAnimation(title, artists);
			firstAnimationShown = true;
		}

		const timeRemaining = duration - progress;
		if (timeRemaining <= 23000 && timeRemaining >= 21000 && !secondAnimationShown) {
			showAnimation(title, artists);
			secondAnimationShown = true;
		}
	}, 2000);
}

const understandBtn = document.getElementById('understandBtn');

function handleAutoPopup() {
	setTimeout(() => {
		document.body.classList.add('popup-active');
		setTimeout(() => {
			document.body.classList.remove('popup-active');
			setTimeout(() => {
				document.getElementById('popupOverlay').remove();
			}, 500);
		}, 5000);
	}, 1000);
}

function isTokenExpired() {
	const expiresAt = sessionStorage.getItem("expires_at");
	return !expiresAt || Date.now() > Number(expiresAt);
}

async function refreshAccessToken() {
	const refreshToken = sessionStorage.getItem("refresh_token");

	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: "refresh_token",
		refresh_token: refreshToken
	});

	const res = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body
	});

	const data = await res.json();

	sessionStorage.setItem("token", data.access_token);
	sessionStorage.setItem("expires_at", Date.now() + data.expires_in * 1000);

	return data.access_token;
}

async function getValidToken() {
	if (isTokenExpired()) {
		return await refreshAccessToken();
	}
	return sessionStorage.getItem("token");
}

(async () => {
	const params = new URLSearchParams(window.location.search);
	const code = params.get("code");
	const token = sessionStorage.getItem("token");

	if (code) {
		await exchangeCode(code);
		window.history.replaceState({}, document.title, redirectUri);
		document.getElementById('login-container').remove();
		monitorPlayback(sessionStorage.getItem("token"));
		handleAutoPopup();
	} else if (token) {
		document.getElementById('login-container').remove();
		monitorPlayback(token);
		handleAutoPopup();
	} else {
		document.getElementById("login").onclick = login;
	}
})();