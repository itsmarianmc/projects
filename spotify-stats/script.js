const CLIENT_ID = '78d95c34b3e04e48b02d1bb79a42c057';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = ['user-read-private', 'user-read-email', 'user-top-read', 'user-read-recently-played', 'user-follow-read'].join(' ');

let accessToken = null;
let currentRange = 'short_term';
let allStreams = [];

const SPIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.24-3.021-1.858-6.832-2.278-11.322-1.247-.43.099-.859-.16-.958-.591-.1-.43.16-.859.592-.958 4.911-1.11 9.13-.64 12.511 1.44.38.249.49.731.24 1.116h.038zm1.44-3.3c-.301.42-.841.6-1.262.3-3.469-2.16-8.759-2.79-12.869-1.51-.489.12-.999-.149-1.129-.639-.12-.489.15-.999.64-1.129 4.71-1.44 10.56-.75 14.52 1.74.42.3.599.84.3 1.26v-.022zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

function randomString(n) {
	const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
		a = new Uint8Array(n);
	crypto.getRandomValues(a);
	return Array.from(a, b => c[b % c.length]).join('');
}
async function generateChallenge(v) {
	const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
	return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function login() {
	const v = randomString(64),
		ch = await generateChallenge(v);
	sessionStorage.setItem('pkce_v', v);
	window.location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
		client_id: CLIENT_ID,
		response_type: 'code',
		redirect_uri: REDIRECT_URI,
		scope: SCOPES,
		code_challenge_method: 'S256',
		code_challenge: ch
	});
}

async function exchangeToken(code) {
	const v = sessionStorage.getItem('pkce_v');
	if (!v) {
		showError('Verifier missing. Please log in again.');
		return;
	}
	const r = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: CLIENT_ID,
			grant_type: 'authorization_code',
			code,
			redirect_uri: REDIRECT_URI,
			code_verifier: v
		})
	});
	const d = await r.json();
	if (!d.access_token) {
		showError('Token exchange failed: ' + (d.error_description || 'Unknown error'));
		return;
	}
	accessToken = d.access_token;
	sessionStorage.setItem('sp_token', accessToken);
	sessionStorage.removeItem('pkce_v');
	window.history.replaceState({}, document.title, window.location.pathname);
	initApp();
}

function logout() {
	sessionStorage.clear();
	accessToken = null;
	hide('app');
	document.getElementById('login-screen').style.display = 'flex';
}

async function api(ep) {
	const r = await fetch('https://api.spotify.com/v1' + ep, {
		headers: {
			Authorization: 'Bearer ' + accessToken
		}
	});
	if (r.status === 401) {
		logout();
		return null;
	}
	if (!r.ok) return null;
	return r.json();
}

async function initApp() {
	show('loading-screen');
	hide('login-screen');
	hide('app');
	const [me, recent] = await Promise.all([api('/me'), api('/me/player/recently-played?limit=50')]);
	if (!me) return;

	const av = me.images?.[0]?.url || '';
	setImg('profile-avatar', av);
	setImg('nav-avatar', av);
	setText('profile-name', me.display_name);
	setText('nav-name', me.display_name);
	setText('followers', me.followers?.total?.toLocaleString('en-US') || '0');
	setText('country', me.country || '—');
	setText('plan', me.product === 'premium' ? 'Premium' : me.product || '—');

	allStreams = recent?.items || [];
	renderRecent(allStreams.slice(0, 8));
	await loadTopData(currentRange);
	hide('loading-screen');
	show('app');
}

async function switchRange(range, btn) {
	currentRange = range;
	document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
	btn.classList.add('active');
	await loadTopData(range);
}

async function loadTopData(range) {
	const [artists, tracks] = await Promise.all([
		api('/me/top/artists?time_range=' + range + '&limit=20'),
		api('/me/top/tracks?time_range=' + range + '&limit=20')
	]);
	renderStats(artists?.items || [], tracks?.items || []);
	renderArtists(artists?.items || []);
	renderTracks(tracks?.items || []);
	renderGenres(artists?.items || []);
}

function renderStats(artists, tracks) {
	const avg = tracks.length ? Math.round(tracks.reduce((s, t) => s + t.popularity, 0) / tracks.length) : 0;
	const genres = countGenres(artists);
	const top = Object.entries(genres).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
	document.getElementById('stats-row').innerHTML = `
      <div class="stat-card"><div class="stat-label">Top Artists</div><div class="stat-value">${artists.length}</div><div class="stat-sub">in your analysis</div></div>
      <div class="stat-card"><div class="stat-label">Top Tracks</div><div class="stat-value">${tracks.length}</div><div class="stat-sub">most played songs</div></div>
      <div class="stat-card"><div class="stat-label">Ø Popularity</div><div class="stat-value">${avg}</div><div class="stat-sub">out of 100</div></div>
      <div class="stat-card"><div class="stat-label">Top Genre</div><div class="stat-value" style="font-size:1rem;text-transform:capitalize;">${top}</div><div class="stat-sub">dominant style</div></div>
    `;
}

function renderArtists(artists) {
	const el = document.getElementById('artists-grid');
	if (!artists.length) {
		el.innerHTML = '<div class="empty">No data available.</div>';
		return;
	}
	el.innerHTML = artists.slice(0, 12).map((a, i) => `
      <a class="artist-card"
         href="${esc(a.external_urls?.spotify||'#')}"
         target="_blank" rel="noopener noreferrer"
         title="${esc(a.name)} on Spotify">
        <span class="artist-rank">#${i+1}</span>
        <span class="artist-spotify-badge">${SPIcon}</span>
        <img class="artist-img" src="${a.images?.[1]?.url||a.images?.[0]?.url||''}" alt="${esc(a.name)}"/>
        <div class="artist-name">${esc(a.name)}</div>
        <div class="artist-genres">${a.genres.slice(0,2).join(', ')||'Unknown'}</div>
      </a>
    `).join('');
}

function renderTracks(tracks) {
	const el = document.getElementById('tracks-list');
	if (!tracks.length) {
		el.innerHTML = '<div class="empty">No data available.</div>';
		return;
	}
	el.innerHTML = tracks.slice(0, 15).map((t, i) => `
      <div class="track-item">
        <span class="track-rank">${i+1}</span>
        <img class="track-img" src="${t.album.images?.[2]?.url||t.album.images?.[0]?.url||''}" alt="${esc(t.name)}"/>
        <div style="min-width:0">
          <div class="track-name">${esc(t.name)}</div>
          <div class="track-artist">${esc(t.artists.map(a=>a.name).join(', '))}</div>
        </div>
        <span class="track-duration">${msToMin(t.duration_ms)}</span>
        <a class="btn-spotify" href="${esc(t.external_urls?.spotify||'#')}" target="_blank" rel="noopener noreferrer" title="Open ${esc(t.name)} on Spotify">${SPIcon}</a>
      </div>
    `).join('');
}

function renderRecent(items) {
	const el = document.getElementById('recent-list');
	if (!items.length) {
		el.innerHTML = '<div class="empty">No recently played tracks.</div>';
		return;
	}
	el.innerHTML = items.map(item => {
		const t = item.track;
		return `
        <div class="recent-item">
          <img class="recent-img" src="${t.album.images?.[2]?.url||t.album.images?.[0]?.url||''}" alt="${esc(t.name)}"/>
          <div style="min-width:0">
            <div class="recent-name">${esc(t.name)}</div>
            <div class="recent-artist">${esc(t.artists.map(a=>a.name).join(', '))}</div>
          </div>
          <span class="recent-time">${timeAgo(item.played_at)}</span>
          <a class="btn-spotify" href="${esc(t.external_urls?.spotify||'#')}" target="_blank" rel="noopener noreferrer" title="Open ${esc(t.name)} on Spotify">${SPIcon}</a>
        </div>
      `;
	}).join('');
}

function renderGenres(artists) {
	const el = document.getElementById('genres-list');
	if (!artists.length) {
		el.innerHTML = '<div class="empty">No data.</div>';
		return;
	}
	const counts = countGenres(artists);
	const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
	const max = sorted[0]?.[1] || 1;
	el.innerHTML = sorted.map(([g, c]) => {
		const pct = Math.round((c / max) * 100);
		return `<div class="genre-row">
        <div class="genre-meta"><span class="genre-name">${esc(g)}</span><span class="genre-pct">${pct}%</span></div>
        <div class="genre-bar-bg"><div class="genre-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
	}).join('');
}

function openStreamsPopup() {
	document.getElementById('streams-popup').classList.add('open');
	document.body.style.overflow = 'hidden';
	renderPopupStreams();
}

function closeStreamsPopup() {
	document.getElementById('streams-popup').classList.remove('open');
	document.body.style.overflow = '';
}

function closeOnOverlay(e) {
	if (e.target === document.getElementById('streams-popup')) closeStreamsPopup();
}

document.addEventListener('keydown', e => {
	if (e.key === 'Escape') closeStreamsPopup();
});

function renderPopupStreams() {
	const body = document.getElementById('popup-body');
	const sub = document.getElementById('popup-sub');

	if (!allStreams.length) {
		body.innerHTML = '<div class="empty">No streams available.</div>';
		return;
	}

	sub.textContent = allStreams.length + ' recently played tracks · max. 50 (Spotify API limit)';

	const groups = {};
	allStreams.forEach(item => {
		const d = new Date(item.played_at);
		const key = d.toLocaleDateString('en-US', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		if (!groups[key]) groups[key] = [];
		groups[key].push(item);
	});

	body.innerHTML = Object.entries(groups).map(([date, items]) => `
      <div class="popup-date-header">${date}</div>
      ${items.map(item=>{
        const t=item.track;
        const time=new Date(item.played_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        return ` <
		div class = "popup-stream-item" >
		<
		img class = "popup-stream-img"
		src = "${t.album.images?.[2]?.url||t.album.images?.[0]?.url||''}"
		alt = "${esc(t.name)}" / >
		<
		div style = "min-width:0" >
		<
		div class = "popup-stream-name" > $ {
			esc(t.name)
		} < /div> <
		div class = "popup-stream-sub" > $ {
			esc(t.artists.map(a => a.name).join(', '))
		}·
		$ {
			esc(t.album.name)
		} < /div> <
		/div> <
		span class = "popup-stream-time" > $ {
			time
		} < /span> <
		a class = "btn-spotify"
		href = "${esc(t.external_urls?.spotify||'#')}"
		target = "_blank"
		rel = "noopener noreferrer"
		title = "Open on Spotify" > $ {
			SPIcon
		} < /a> <
		/div>
		`;
      }).join('')}
    `).join('');
}

function countGenres(artists) {
	const c = {};
	artists.forEach(a => a.genres.forEach(g => {
		c[g] = (c[g] || 0) + 1;
	}));
	return c;
}

function msToMin(ms) {
	const m = Math.floor(ms / 60000),
		s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
	return `${m}:${s}`;
}

function timeAgo(iso) {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m} min ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
	return `${Math.floor(h/24)} day${Math.floor(h/24) === 1 ? '' : 's'} ago`;
}

function esc(s) {
	return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function show(id) {
	document.getElementById(id).style.display = id === 'loading-screen' ? 'flex' : 'block';
}

function hide(id) {
	document.getElementById(id).style.display = 'none';
}

function setImg(id, s) {
	const e = document.getElementById(id);
	if (e) e.src = s;
}

function setText(id, v) {
	const e = document.getElementById(id);
	if (e) e.textContent = v;
}

function showError(msg) {
	hide('loading-screen');
	const e = document.getElementById('error-login');
	e.textContent = msg;
	e.style.display = 'block';
	document.getElementById('login-screen').style.display = 'flex';
}

(async function() {
	const p = new URLSearchParams(window.location.search);
	const code = p.get('code'),
		err = p.get('error');
	if (err) {
		showError('Spotify error: ' + err);
		return;
	}
	if (code) {
		await exchangeToken(code);
		return;
	}
	const t = sessionStorage.getItem('sp_token');
	if (t) {
		accessToken = t;
		initApp();
	}
})();
