const API_BASE = 'https://db-api.itsmarian.dev';
const REFRESH_MS = 30_000;

const DEFAULT_STATION = {
	id: '8000105',
	name: 'Frankfurt(Main)Hbf'
};

let currentStation = {
	...DEFAULT_STATION
};
let refreshTimer = null;
let acTimer = null;
let acIndex = -1;
let acResults = [];

function updateClock() {
	const now = new Date();
	document.getElementById('clock').textContent =
		now.toLocaleTimeString('de-DE', {
			hour12: false
		});
	document.getElementById('clock-date').textContent =
		now.toLocaleDateString('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
}
setInterval(updateClock, 1000);
updateClock();

function fmtTime(iso) {
	if (!iso) return '--:--';
	const d = new Date(iso);
	return d.toLocaleTimeString('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
}

function delayMin(dep) {
	if (dep.delay != null) return Math.round(dep.delay / 60);
	if (dep.when && dep.plannedWhen) {
		return Math.round((new Date(dep.when) - new Date(dep.plannedWhen)) / 60000);
	}
	return 0;
}

function badgeClass(product) {
	if (!product) return 'badge-other';
	const p = product.toLowerCase();
	if (p === 'nationalexpress' || p === 'ice') return 'badge-ice';
	if (p === 'national' || p === 'ic' || p === 'ec') return 'badge-ic';
	if (p === 'regionalexp' || p === 'regional' || p === 're') return 'badge-re';
	if (p === 'regionalbahn' || p === 'rb') return 'badge-rb';
	if (p === 'suburban' || p === 's') return 'badge-s';
	if (p === 'subway' || p === 'u') return 'badge-u';
	if (p === 'tram') return 'badge-tram';
	if (p === 'bus') return 'badge-bus';
	return 'badge-other';
}

function productLabel(line) {
	if (!line) return 'Zug';
	const p = (line.productName || line.product || '').toLowerCase();
	if (p.includes('ice') || p === 'nationalexpress') return 'ICE';
	if (p.includes('ic') || p === 'national') return 'IC/EC';
	if (p.includes('re') || p === 'regionalexp') return 'RE';
	if (p.includes('rb') || p === 'regionalbahn') return 'RB';
	if (p === 'suburban' || p === 's') return 'S-Bahn';
	if (p === 'subway') return 'U-Bahn';
	if (p === 'tram') return 'Tram';
	if (p === 'bus') return 'Bus';
	return '';
}

function buildStopsText(dep) {
	const stops = dep.nextStopovers || dep.stopovers || dep.remarks?.filter(r => r.type === 'stop') || [];
	if (stops.length === 0) {
		if (dep.direction) return dep.direction;
		return '';
	}
	return stops
		.filter(s => s.stop?.name || s.name)
		.map(s => s.stop?.name || s.name)
		.join(' · ');
}

function buildRow(dep, isNext) {
	const row = document.createElement('div');
	const dm = delayMin(dep);
	const cancelled = dep.cancelled === true;
	const planned = fmtTime(dep.plannedWhen);
	const actual = fmtTime(dep.when);
	const platform = dep.platform || dep.plannedPlatform || '-';
	const platChanged = dep.platform && dep.plannedPlatform && dep.platform !== dep.plannedPlatform;
	const line = dep.line || {};
	const lineName = line.name || dep.line?.fahrtNr || '?';
	const product = line.product || line.productName || '';
	const stopsRaw = buildStopsText(dep);
	const dest = dep.direction || '-';

	row.className = 'dep-row' + (isNext ? ' is-next' : '') + (cancelled ? ' cancelled' : '');

	const cellLine = document.createElement('div');
	cellLine.className = 'dep-cell cell-line';

	const badge = document.createElement('span');
	badge.className = 'line-badge ' + badgeClass(product);
	badge.textContent = lineName;
	cellLine.appendChild(badge);

	const sub = document.createElement('span');
	sub.className = 'line-sub';
	sub.textContent = productLabel(line);
	cellLine.appendChild(sub);

	if (isNext) {
		const pulse = document.createElement('div');
		pulse.className = 'next-pulse';
		cellLine.appendChild(pulse);
	}

	const cellTime = document.createElement('div');
	cellTime.className = 'dep-cell cell-time';

	const timePlanned = document.createElement('div');
	timePlanned.className = 'time-planned';
	timePlanned.textContent = planned;
	cellTime.appendChild(timePlanned);

	if (cancelled) {
		const canc = document.createElement('div');
		canc.className = 'time-cancelled';
		canc.textContent = 'FÄLLT AUS';
		cellTime.appendChild(canc);
	} else if (dm !== 0) {
		const timeActual = document.createElement('div');
		const cls = dm < 5 ? 'on-time' : dm < 10 ? 'late-low' : dm < 20 ? 'late-mid' : 'late-hi';
		timeActual.className = 'time-actual ' + cls;
		timeActual.textContent = actual !== planned ? actual : '';
		cellTime.appendChild(timeActual);
	}

	const cellDest = document.createElement('div');
	cellDest.className = 'dep-cell cell-dest';

	const destName = document.createElement('div');
	destName.className = 'dest-name';
	destName.textContent = dest;
	cellDest.appendChild(destName);

	if (stopsRaw) {
		const stopsWrap = document.createElement('div');
		stopsWrap.className = 'stops-wrapper';

		const stopsInner = document.createElement('span');
		stopsInner.className = 'stops-inner';

		const parts = stopsRaw.split(' · ').filter(Boolean);
		stopsInner.innerHTML = parts.map(s =>
			`<span>${s}</span><span class="stop-dot">·</span>`
		).join('');

		stopsWrap.appendChild(stopsInner);
		cellDest.appendChild(stopsWrap);

		requestAnimationFrame(() => {
			const wrapW = stopsWrap.offsetWidth;
			const textW = stopsInner.scrollWidth;
			if (textW > wrapW) {
				const dup = stopsInner.cloneNode(true);
				stopsWrap.appendChild(dup);
				const duration = Math.max(8, textW / 60) + 's';
				stopsInner.style.animationDuration = duration;
				stopsInner.style.animationName = 'scroll-stops';
				dup.style.animationDuration = duration;
				dup.style.animationName = 'scroll-stops';
				stopsInner.classList.add('scroll-anim');
				dup.classList.add('scroll-anim');
			}
		});
	}

	const cellDelay = document.createElement('div');
	cellDelay.className = 'dep-cell cell-delay';

	const delayBadge = document.createElement('div');
	delayBadge.className = 'delay-badge';
	if (cancelled) {
		delayBadge.className += ' delay-cancelled';
		delayBadge.textContent = 'AUSFALL';
	} else if (dm === 0 || dm == null) {
		delayBadge.className += ' delay-ok';
		delayBadge.textContent = 'pünktl.';
	} else {
		const prefix = dm > 0 ? '+' : '';
		if (Math.abs(dm) < 5) {
			delayBadge.className += ' delay-low';
		} else if (Math.abs(dm) < 10) {
			delayBadge.className += ' delay-low';
		} else if (Math.abs(dm) < 20) {
			delayBadge.className += ' delay-mid';
		} else {
			delayBadge.className += ' delay-hi';
		}
		delayBadge.textContent = prefix + dm + ' Min';
	}
	cellDelay.appendChild(delayBadge);

	const cellTrack = document.createElement('div');
	cellTrack.className = 'dep-cell cell-track';

	const trackLabel = document.createElement('div');
	trackLabel.className = 'track-label';
	trackLabel.textContent = 'Gleis';
	cellTrack.appendChild(trackLabel);

	const trackNum = document.createElement('div');
	trackNum.className = 'track-num';
	trackNum.textContent = platform;
	cellTrack.appendChild(trackNum);

	if (platChanged) {
		const trackChanged = document.createElement('div');
		trackChanged.className = 'track-changed';
		trackChanged.textContent = 'GEÄNDERT';
		cellTrack.appendChild(trackChanged);
	}

	row.appendChild(cellLine);
	row.appendChild(cellTime);
	row.appendChild(cellDest);
	row.appendChild(cellDelay);
	row.appendChild(cellTrack);

	return row;
}

async function fetchDepartures() {
	const board = document.getElementById('departures');
	const refreshText = document.getElementById('refresh-text');

	try {
		const url = `${API_BASE}/stops/${encodeURIComponent(currentStation.id)}/departures?results=12&duration=120`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();

		const deps = Array.isArray(data) ?
			data :
			(data.departures || data);

		if (!deps || deps.length === 0) {
			board.innerHTML = '<div id="status-bar"><span style="color:var(--db-grey)">Keine Abfahrten gefunden.</span></div>';
			return;
		}

		board.innerHTML = '';
		deps.slice(0, 12).forEach((dep, i) => {
			board.appendChild(buildRow(dep, i === 0));
		});

		refreshText.textContent = 'Aktualisiert ' + new Date().toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});

	} catch (err) {
		board.innerHTML = `
      <div id="status-bar">
        <div class="error-msg">
          <span class="error-icon">⚠</span>
          API nicht erreichbar: ${err.message}
        </div>
        <span style="font-size:11px;color:var(--db-grey);margin-top:6px">Nächster Versuch in 30 s</span>
      </div>`;
		refreshText.textContent = 'Verbindungsfehler';
	}
}

function startRefresh() {
	clearInterval(refreshTimer);
	fetchDepartures();
	refreshTimer = setInterval(fetchDepartures, REFRESH_MS);
}

const searchInput = document.getElementById('search-input');
const acList = document.getElementById('autocomplete-list');

async function fetchLocations(query) {
	const res = await fetch(`${API_BASE}/locations?query=${encodeURIComponent(query)}&results=8`);
	if (!res.ok) return [];
	const data = await res.json();
	return Array.isArray(data) ? data.filter(l => l.type === 'stop' || l.type === 'station') : [];
}

function renderAC(results) {
	acList.innerHTML = '';
	acResults = results;
	acIndex = -1;
	if (!results.length) {
		acList.style.display = 'none';
		return;
	}
	results.forEach((loc, i) => {
		const item = document.createElement('div');
		item.className = 'ac-item';
		item.innerHTML = `${escHtml(loc.name)}<span class="ac-type">${loc.type || ''}</span>`;
		item.addEventListener('mousedown', e => {
			e.preventDefault();
			selectStation(loc);
		});
		acList.appendChild(item);
	});
	acList.style.display = 'block';
}

function closeAC() {
	acList.style.display = 'none';
	acIndex = -1;
}

const CACHE_KEY = 'db-tafel-station';

function saveStationCache(station) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(station));
	} catch {}
}

function loadStationCache() {
	try {
		return JSON.parse(localStorage.getItem(CACHE_KEY));
	} catch {
		return null;
	}
}

function applyStation(station, save = true) {
	currentStation = {
		id: station.id,
		name: station.name
	};
	searchInput.value = '';
	searchInput.placeholder = station.name;
	document.getElementById('station-label').textContent = station.name;
	if (save) saveStationCache(station);
}

function selectStation(loc) {
	applyStation(loc, true);
	closeAC();
	startRefresh();
}

searchInput.addEventListener('input', () => {
	const q = searchInput.value.trim();
	clearTimeout(acTimer);
	if (q.length < 2) {
		closeAC();
		return;
	}
	acTimer = setTimeout(async () => {
		try {
			renderAC(await fetchLocations(q));
		} catch {
			closeAC();
		}
	}, 280);
});

searchInput.addEventListener('keydown', e => {
	const items = acList.querySelectorAll('.ac-item');
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		acIndex = Math.min(acIndex + 1, items.length - 1);
		items.forEach((el, i) => el.classList.toggle('selected', i === acIndex));
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		acIndex = Math.max(acIndex - 1, 0);
		items.forEach((el, i) => el.classList.toggle('selected', i === acIndex));
	} else if (e.key === 'Enter') {
		e.preventDefault();
		if (acIndex >= 0 && acResults[acIndex]) selectStation(acResults[acIndex]);
		else closeAC();
	} else if (e.key === 'Escape') {
		closeAC();
	}
});

document.addEventListener('click', e => {
	if (!e.target.closest('#search-area')) closeAC();
});

function escHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

async function init() {
	const params = new URLSearchParams(window.location.search);
	const urlId = params.get('stationId');

	if (urlId) {
		try {
			const res = await fetch(`${API_BASE}/stops/${encodeURIComponent(urlId)}`);
			if (res.ok) {
				const data = await res.json();
				const station = {
					id: urlId,
					name: data.name || urlId
				};
				applyStation(station, true);
				startRefresh();
				return;
			}
		} catch {}
		applyStation({
			id: urlId,
			name: urlId
		}, true);
		startRefresh();
		return;
	}

	const cached = loadStationCache();
	if (cached && cached.id && cached.name) {
		applyStation(cached, false);
		startRefresh();
		return;
	}

	applyStation(DEFAULT_STATION, false);
	startRefresh();
}

init();
