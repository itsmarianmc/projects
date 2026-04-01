let API = '';

function loadApiEndpoint() {
	try {
		API = localStorage.getItem('api_endpoint') || '';
	} catch {
		API = '';
	}
}
loadApiEndpoint();

function updateApiIndicator() {
	const el = document.getElementById('apiUrlText');
	if (el) el.textContent = API || 'No endpoint set';
}

function openApiConfig() {
	const overlay = document.getElementById('apiConfigOverlay');
	const inp = document.getElementById('apiEndpointInput');
	const cancelBtn = document.getElementById('btnApiCancel');
	inp.value = API || '';
	document.getElementById('apiError').classList.remove('visible');
	if (API) {
		cancelBtn.classList.remove('hidden');
	} else {
		cancelBtn.classList.add('hidden');
	}
	overlay.classList.remove('hidden');
	setTimeout(() => inp.focus(), 100);
}

function closeApiConfig() {
	document.getElementById('apiConfigOverlay').classList.add('hidden');
}

function saveApiEndpoint() {
	const raw = document.getElementById('apiEndpointInput').value.trim().replace(/\/+$/, '');
	const errorEl = document.getElementById('apiError');
	if (!raw || !/^https?:\/\/.+/.test(raw)) {
		errorEl.classList.add('visible');
		return;
	}
	errorEl.classList.remove('visible');
	API = raw;
	try {
		localStorage.setItem('api_endpoint', raw);
	} catch {}
	updateApiIndicator();
	closeApiConfig();
	if (currentStationId) loadDepartures();
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('apiEndpointInput').addEventListener('keydown', e => {
		if (e.key === 'Enter') saveApiEndpoint();
		if (e.key === 'Escape' && API) closeApiConfig();
	});
	loadApiEndpoint();
	updateApiIndicator();
	if (!API) {
		openApiConfig();
	} else {
		document.getElementById('apiConfigOverlay').classList.add('hidden');
	}
});
let currentStationId = null;
let currentStationProducts = null; // products map from /stops/{id}
let currentFilter = 'all';
let allDepartures = [];
let searchTimeout = null;
let autoRefresh = null;
let countdownInterval = null;
let nextRefreshAt = null;
let isFirstLoad = true;
const REFRESH_SEC = 30;

let trackedTripId = null;
let trackedDep = null;
let trackedInfo = null;
let trackBannerInterval = null;

let currentPanelTripId = null;
let panelRefreshInterval = null;

function getLineInfo(dep) {
	const p = dep.line?.product || '',
		n = dep.line?.name || '',
		m = dep.line?.mode || '';
	if (p === 'ferry' || m === 'watercraft' || n.toLowerCase().includes('schiff') || n.toLowerCase().includes('fähre')) return {
		color: '#06b6d4',
		group: 'ferry',
		icon: '⛴️',
		label: 'Fähre',
		textLight: true
	};
	if (p === 'taxi' || m === 'taxi') return {
		color: '#2dd4bf',
		group: 'taxi',
		icon: '🚕',
		label: 'RUF/Taxi',
		textLight: false
	};
	if (p === 'bus' || m === 'bus') return {
		color: '#ff8c42',
		group: 'bus',
		icon: '🚌',
		label: 'Bus',
		textLight: false
	};
	if (p === 'tram' || m === 'tram') return {
		color: '#a78bfa',
		group: 'tram',
		icon: '🚊',
		label: 'Tram',
		textLight: true
	};
	if (p === 'suburban' || (n.startsWith('S') && /\d/.test(n))) return {
		color: '#3ddc84',
		group: 's',
		icon: '🚆',
		label: 'S-Bahn',
		textLight: false
	};
	if (p === 'nationalExpress' || n.startsWith('ICE')) return {
		color: '#4da6ff',
		group: 'ic',
		icon: '🚄',
		label: 'ICE',
		textLight: false
	};
	if (p === 'national' || n.startsWith('IC') || n.startsWith('EC')) return {
		color: '#4da6ff',
		group: 'ic',
		icon: '🚄',
		label: 'IC/EC',
		textLight: false
	};
	if (p === 'regional' || p === 'regionalExpress' || n.startsWith('RE') || n.startsWith('RB')) return {
		color: '#e8c44a',
		group: 're',
		icon: '🚂',
		label: 'RE/RB',
		textLight: false
	};
	return {
		color: '#6b7080',
		group: 're',
		icon: '🚆',
		label: n || 'Train',
		textLight: true
	};
}

function filterGroup(g) {
	return currentFilter === 'all' || g === currentFilter;
}

function fmtTime(s) {
	if (!s) return '--:--';
	return new Date(s).toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

function minutesFrom(s) {
	if (!s) return null;
	return Math.round((new Date(s) - Date.now()) / 60000);
}

function depKey(d) {
	return d.tripId || (d.line?.name + '|' + d.plannedWhen + '|' + d.direction);
}

function esc(s) {
	return s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';
}

document.getElementById('searchInput').addEventListener('input', e => {
	clearTimeout(searchTimeout);
	const q = e.target.value.trim();
	if (q.length < 2) {
		hideSugg();
		return;
	}
	searchTimeout = setTimeout(() => fetchLoc(q), 280);
});
document.getElementById('searchInput').addEventListener('blur', () => setTimeout(hideSugg, 200));
document.getElementById('searchInput').addEventListener('keydown', e => {
	if (e.key === 'Escape') {
		hideSugg();
		e.target.blur();
	}
});

async function fetchLoc(q) {
	if (!API) {
		openApiConfig();
		return;
	}
	try {
		const r = await fetch(`${API}/locations?query=${encodeURIComponent(q)}&results=8&fuzzy=true`);
		const data = await r.json();
		showSugg(data);
	} catch (e) {
		console.error(e);
	}
}

function showSugg(items) {
	const box = document.getElementById('suggestions');
	if (!items?.length) {
		box.classList.remove('visible');
		return;
	}
	box.innerHTML = items.map(item => `
    <div class="suggestion-item" data-id="${item.id}" data-name="${esc(item.name)}">
      <div class="sug-icon">${item.type==='station'?'🚉':(item.products?.bus?'🚌':'📍')}</div>
      <div><div class="sug-name">${esc(item.name)}</div><div class="sug-type">${item.type==='station'?'Station':'Stop'}</div></div>
    </div>`).join('');
	box.querySelectorAll('.suggestion-item').forEach(el => {
		el.addEventListener('click', () => {
			document.getElementById('searchInput').value = el.dataset.name;
			hideSugg();
			selectStation(el.dataset.id, el.dataset.name);
		});
	});
	box.classList.add('visible');
}

function hideSugg() {
	document.getElementById('suggestions').classList.remove('visible');
}

function selectStation(id, name) {
	currentStationId = id;
	currentStationProducts = null;
	isFirstLoad = true;
	document.getElementById('controlsBar').style.display = 'flex';
	clearInterval(autoRefresh);
	const url = new URL(window.location);
	url.searchParams.set('station', id);
	if (name) url.searchParams.set('name', name);
	window.history.replaceState({}, '', url);
	// Fetch station products, then load departures
	fetchStationProducts(id).then(() => {
		applyProductFilters();
		loadDepartures();
	});
	autoRefresh = setInterval(loadDepartures, REFRESH_SEC * 1000);
	startCountdown();
}

async function fetchStationProducts(id) {
	if (!API) return;
	try {
		const r = await fetch(`${API}/stops/${id}`);
		const stop = await r.json();
		if (stop && stop.products) {
			currentStationProducts = stop.products;
		} else {
			currentStationProducts = null;
		}
	} catch {
		currentStationProducts = null;
	}
}

// Map from product key -> filter group(s)
const PRODUCT_TO_FILTER = {
	nationalExpress: 'ic',
	national:        'ic',
	regionalExpress: 're',
	regional:        're',
	suburban:        's',
	bus:             'bus',
	tram:            'tram',
	taxi:            'taxi',
	ferry:           'ferry',
	subway:          null,
};

function stationHasGroup(group) {
	if (!currentStationProducts) return true; // unknown → show all
	// Which product keys map to this group?
	const keys = Object.entries(PRODUCT_TO_FILTER)
		.filter(([, g]) => g === group)
		.map(([k]) => k);
	return keys.some(k => currentStationProducts[k] === true);
}

function applyProductFilters() {
	// Filter buttons
	document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
		const f = btn.dataset.filter;
		if (f === 'all') return;
		const visible = stationHasGroup(f);
		btn.style.display = visible ? '' : 'none';
	});
}

async function loadDepartures() {
	if (!currentStationId) return;
	const btn = document.getElementById('refreshBtn');
	btn.classList.add('spinning');
	if (isFirstLoad) showLoading();
	try {
		const r = await fetch(`${API}/stops/${currentStationId}/departures?results=60&duration=90&language=en`);
		const data = await r.json();
		const fresh = Array.isArray(data) ? data : (data.departures || []);
		if (isFirstLoad) {
			allDepartures = fresh;
			renderAll();
		} else patchDepartures(fresh);
		isFirstLoad = false;
		document.querySelector('.last-update').classList.add('visible');
		startCountdown();
		if (trackedTripId) {
			const upd = fresh.find(d => d.tripId === trackedTripId);
			if (upd) {
				trackedDep = upd;
				updateTrackBanner();
			}
		}
	} catch (e) {
		if (isFirstLoad) showError(e);
	} finally {
		btn.classList.remove('spinning');
	}
}

function patchDepartures(fresh) {
	const fMap = {},
		oMap = {};
	fresh.forEach(d => fMap[depKey(d)] = d);
	allDepartures.forEach(d => oMap[depKey(d)] = d);
	let changed = false;
	fresh.forEach(dep => {
		const k = depKey(dep),
			old = oMap[k];
		if (!old) {
			changed = true;
			return;
		}
		if (old.when !== dep.when || old.delay !== dep.delay || old.platform !== dep.platform) {
			changed = true;
			const card = document.querySelector(`[data-trip="${CSS.escape(k)}"]`);
			if (card) patchCard(card, dep);
		}
	});
	allDepartures.forEach(d => {
		if (!fMap[depKey(d)]) changed = true;
	});
	allDepartures = fresh;
	if (changed) {
		renderStats(allDepartures);
		renderDepartures(allDepartures.filter(d => filterGroup(getLineInfo(d).group)));
	}
}

function patchCard(card, dep) {
	const when = dep.when || dep.plannedWhen,
		delay = dep.delay || 0;
	const isDelayed = delay > 60,
		hasRT = dep.delay !== null && dep.delay !== undefined;
	const timeEl = card.querySelector('.time-main');
	if (timeEl) {
		const t = fmtTime(when);
		if (timeEl.textContent !== t) {
			timeEl.textContent = t;
			timeEl.className = 'time-main ' + (hasRT ? (isDelayed ? 'delayed' : 'on-time') : 'no-rt');
			flash(timeEl);
		}
	}
	const mins = minutesFrom(when);
	const mEl = card.querySelector('.minutes-away');
	if (mEl) mEl.textContent = mins === null ? '' : (mins <= 0 ? 'now' : (mins === 1 ? '1 min' : `${mins} min`));
	card.classList.toggle('delayed', isDelayed);
}

function flash(el) {
	el.classList.remove('flash-update');
	void el.offsetWidth;
	el.classList.add('flash-update');
	setTimeout(() => el.classList.remove('flash-update'), 800);
}

function renderAll() {
	renderStats(allDepartures);
	renderDepartures(allDepartures.filter(d => filterGroup(getLineInfo(d).group)));
}

function renderStats(deps) {
	const c = {
		re: 0,
		s: 0,
		ic: 0,
		bus: 0,
		tram: 0,
		taxi: 0,
		ferry: 0
	};
	let delayed = 0;
	deps.forEach(d => {
		const i = getLineInfo(d);
		if (c[i.group] !== undefined) c[i.group]++;
		if (d.delay > 60) delayed++;
	});

	const has = g => stationHasGroup(g);

	// Build stat cards only for groups this station actually serves
	const statCards = [
		`<div class="stat-card" style="--c:var(--accent)"><div class="stat-num">${deps.length}</div><div class="stat-label">Departures</div></div>`,
		has('re') ? `<div class="stat-card" style="--c:var(--train-re)"><div class="stat-num">${c.re}</div><div class="stat-label">RE / RB</div></div>` : '',
		has('s')  ? `<div class="stat-card" style="--c:var(--train-s)"><div class="stat-num">${c.s}</div><div class="stat-label">S-Bahn</div></div>` : '',
		has('ic') ? `<div class="stat-card" style="--c:var(--train-ic)"><div class="stat-num">${c.ic}</div><div class="stat-label">IC / ICE</div></div>` : '',
		(has('bus') || has('tram')) ? `<div class="stat-card" style="--c:var(--bus)"><div class="stat-num">${c.bus + c.tram}</div><div class="stat-label">${has('bus') && has('tram') ? 'Bus / Tram' : has('bus') ? 'Bus' : 'Tram'}</div></div>` : '',
		has('taxi') ? `<div class="stat-card" style="--c:var(--taxi)"><div class="stat-num">${c.taxi}</div><div class="stat-label">Taxi / RUF</div></div>` : '',
		has('ferry') ? `<div class="stat-card" style="--c:var(--ferry)"><div class="stat-num">${c.ferry}</div><div class="stat-label">Fähre</div></div>` : '',
		delayed > 0 ? `<div class="stat-card" style="--c:var(--red)"><div class="stat-num">${delayed}</div><div class="stat-label">Delayed</div></div>` : '',
	];

	document.getElementById('statsRow').innerHTML = statCards.join('');
	document.getElementById('statsRow').classList.add('visible');
}

function renderDepartures(deps) {
	const ct = document.getElementById('departuresContainer');
	if (!deps.length) {
		ct.innerHTML = `<div class="state-box"><div class="icon">🔍</div><h3>No departures</h3><p>No departures match the current filter.</p></div>`;
		return;
	}
	const groups = {
		ic: {
			label: 'IC / ICE',
			icon: '🚄',
			color: 'var(--train-ic)',
			items: []
		},
		re: {
			label: 'RE / RB',
			icon: '🚂',
			color: 'var(--train-re)',
			items: []
		},
		s: {
			label: 'S-Bahn',
			icon: '🚆',
			color: 'var(--train-s)',
			items: []
		},
		bus: {
			label: 'Bus',
			icon: '🚌',
			color: 'var(--bus)',
			items: []
		},
		tram: {
			label: 'Tram',
			icon: '🚊',
			color: 'var(--tram)',
			items: []
		},
		taxi: {
			label: 'Taxi / RUF',
			icon: '🚕',
			color: 'var(--taxi)',
			items: []
		},
		ferry: {
			label: 'Fähre',
			icon: '⛴️',
			color: 'var(--ferry)',
			items: []
		},
	};
	deps.forEach(d => {
		const i = getLineInfo(d);
		(groups[i.group] || groups.re).items.push({
			dep: d,
			info: i
		});
	});
	const order = currentFilter === 'all' ? ['ic', 're', 's', 'bus', 'tram', 'taxi', 'ferry'] : [currentFilter];
	let html = '';
	order.forEach(k => {
		const g = groups[k];
		if (!g || !g.items.length) return;
		html += `<div class="group-header"><span class="group-icon">${g.icon}</span><span class="group-title" style="color:${g.color}">${g.label}</span><div class="group-line"></div><span class="group-count-badge">${g.items.length}</span></div>
    <div class="departures-list">${g.items.map((x,i)=>buildCard(x.dep,x.info,i)).join('')}</div>`;
	});
	ct.innerHTML = html;
}

function buildCard(dep, info, idx) {
	const when = dep.when || dep.plannedWhen,
		delay = dep.delay || 0;
	const isDelayed = delay > 60,
		hasRT = dep.delay !== null && dep.delay !== undefined;
	const mins = minutesFrom(when);
	const timeClass = hasRT ? (isDelayed ? 'delayed' : 'on-time') : 'no-rt';
	const dm = Math.round(Math.abs(delay) / 60);
	const dLabel = isDelayed ? `+${dm} min` : (delay < -30 ? `−${dm} min earlier` : '');
	const plat = dep.platform || dep.plannedPlatform;
	const isTracked = trackedTripId === dep.tripId;
	const k = depKey(dep);
	return `<div class="dep-card${isDelayed?' delayed':''}${isTracked?' tracked':''}" data-trip="${esc(k)}"
    style="--line-color:${info.color};animation-delay:${idx*35}ms">
    <div class="line-badge">
      <div class="line-pill${info.textLight?' light-text':''}">${esc(dep.line?.name||'?')}</div>
      <div class="line-type-tag">${info.label}</div>
    </div>
    <div class="dep-info">
      <div class="dep-direction" title="${esc(dep.direction||'')}">${esc(dep.direction||'—')}</div>
      <div class="dep-meta">
        ${plat?`<span class="meta-chip platform">⬤ Track ${plat}</span>`:''}
        ${hasRT?`<span class="meta-chip" style="color:var(--green);border-color:rgba(61,220,132,.2)">● Live</span>`:''}
        ${dep.line?.fahrtNr?`<span class="meta-chip">#${dep.line.fahrtNr}</span>`:''}
      </div>
    </div>
    <div class="dep-time">
      <div class="time-main ${timeClass}">${fmtTime(when)}</div>
      ${isDelayed?`<div class="time-planned">${fmtTime(dep.plannedWhen)}</div>`:''}
      ${dLabel?`<div class="delay-badge${delay<-30?' early':''}">${dLabel}</div>`:''}
      <div class="minutes-away">${mins===null?'':(mins<=0?'now':(mins===1?'1 min':`${mins} min`))}</div>
    </div>
    <div class="card-actions">
      ${dep.tripId?`<button class="btn-detail" onclick="openTrip(event,'${esc(dep.tripId)}')">Details</button>`:''}
      ${dep.tripId?`<button class="btn-track${isTracked?' active':''}"
        onclick="toggleTrack(event,'${esc(dep.tripId)}')">
        ${isTracked?'● Tracking':'Track'}</button>`:''}
    </div>
  </div>`;
}

async function openTrip(e, tripId) {
	if (e) e.stopPropagation();
	_panelRendered = false;
	currentPanelTripId = tripId;
	const dep = allDepartures.find(d => d.tripId === tripId);
	const info = dep ? getLineInfo(dep) : {
		color: '#e8c44a',
		textLight: false,
		label: 'Train',
		group: 're'
	};
	const pill = document.getElementById('panelPill');
	pill.textContent = dep?.line?.name || '?';
	pill.style.background = info.color;
	pill.className = 'panel-line-pill' + (info.textLight ? ' light' : '');
	document.getElementById('panelDirection').textContent = dep?.direction || '—';
	document.getElementById('panelOrigin').textContent = 'Loading route…';
	document.getElementById('panelBody').innerHTML = `<div class="state-box"><div class="loader"></div><p>Loading trip…</p></div>`;
	document.getElementById('tripPanel').classList.add('visible');
	document.body.style.overflow = 'hidden';
	await loadTripDetail(tripId, dep, info);
	clearInterval(panelRefreshInterval);
	panelRefreshInterval = setInterval(() => loadTripDetail(tripId, dep, info), 20000);
}

async function loadTripDetail(tripId, dep, info) {
	try {
		const r = await fetch(`${API}/trips/${encodeURIComponent(tripId)}?stopovers=true&language=en`);
		const data = await r.json();
		renderPanel(data.trip || data, dep, info);
	} catch (e) {
		document.getElementById('panelBody').innerHTML = `<div class="state-box"><div class="icon">⚠️</div><h3>Could not load trip</h3><p>${e.message}</p></div>`;
	}
}

function vehicleLabel(info) {
	if (!info) return 'vehicle';
	const g = info.group;
	if (g === 'bus') return 'bus';
	if (g === 'tram') return 'tram';
	if (g === 'taxi') return 'taxi';
	if (g === 'ferry') return 'Fähre';
	return 'train';
}

let _currentPanelInfo = null;

function calcPanelState(stops) {
	const now = Date.now();
	let currentIdx = 0,
		targetIdx = -1;
	stops.forEach((s, i) => {
		const sid = s.stop?.id || s.stop?.station?.id;
		if (sid === currentStationId) targetIdx = i;
		const delay = s.departureDelay || s.arrivalDelay || 0;
		const planned = s.departure || s.arrival;
		const rt = s.realtimeDeparture || s.realtimeArrival ||
			(planned && delay ? new Date(new Date(planned).getTime() + delay * 1000).toISOString() : null);
		const t = rt || planned;
		if (t && new Date(t) < now) currentIdx = i;
	});
	return {
		currentIdx,
		targetIdx
	};
}

let _panelRendered = false;

function renderPanel(trip, dep, info) {
	_currentPanelInfo = info;
	const stops = trip.stopovers || [];
	const direction = trip.direction || dep?.direction || '—';
	const origin = stops[0]?.stop?.name || '—';
	document.getElementById('panelDirection').textContent = direction;
	document.getElementById('panelOrigin').textContent = `from ${origin}`;

	const {
		currentIdx,
		targetIdx
	} = calcPanelState(stops);
	const total = stops.length - 1;
	const pct = total > 0 ? Math.max(2, Math.round((currentIdx / total) * 100)) : 0;
	const curStop = stops[currentIdx]?.stop?.name || '—';
	const firstStop = stops[0]?.stop?.name || '';
	const lastStop = stops[stops.length - 1]?.stop?.name || '';
	const trainIcon = info.group === 'bus' ? '🚌' : info.group === 'tram' ? '🚊' : info.group === 's' ? '🚆' : info.group === 'ferry' ? '⛴️' : '🚄';

	const existingFill = document.querySelector('.progress-bar-fill');
	if (_panelRendered && existingFill && document.querySelector('.stops-list')) {
		patchPanel(stops, currentIdx, targetIdx, pct, curStop, info);
		return;
	}

	_panelRendered = true;

	const arrivingHtml = buildArrivingHtml(stops, currentIdx, targetIdx, curStop, info);
	const stopsHtml = buildStopsHtml(stops, currentIdx, targetIdx, info);

	document.getElementById('panelBody').innerHTML = `
    <div id="arrivingBanner">${arrivingHtml}</div>
    <div class="journey-progress">
      <div class="progress-label">Journey progress</div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%;--line-c:${info.color}">
          <div class="progress-train-icon">${trainIcon}</div>
        </div>
      </div>
      <div class="progress-stops">
        <div class="progress-stop-label" id="ps-first">${esc(firstStop)}</div>
        <div class="progress-stop-label" id="ps-cur">${esc(curStop)}</div>
        <div class="progress-stop-label" id="ps-last">${esc(lastStop)}</div>
      </div>
    </div>
    <div class="stops-list" style="--line-c:${info.color}">${stopsHtml}</div>`;

	setTimeout(() => {
		const el = document.querySelector('#panelBody .stop-row.current, #panelBody .stop-row.target');
		if (el) el.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
	}, 300);
}

function patchPanel(stops, currentIdx, targetIdx, pct, curStop, info) {
	const fill = document.querySelector('.progress-bar-fill');
	if (fill) fill.style.width = pct + '%';

	const psCur = document.getElementById('ps-cur');
	if (psCur && psCur.textContent !== curStop) psCur.textContent = curStop;

	const banner = document.getElementById('arrivingBanner');
	if (banner) banner.innerHTML = buildArrivingHtml(stops, currentIdx, targetIdx, curStop, info);

	const rows = document.querySelectorAll('.stop-row');
	rows.forEach((row, i) => {
		const isPassed = i < currentIdx;
		const isCurrent = i === currentIdx;
		const isTarget = i === targetIdx;
		const newClass = isPassed ? 'passed' : isCurrent ? 'current' : isTarget ? 'target' : '';
		if (row.className !== `stop-row ${newClass}`.trim()) {
			row.className = ('stop-row ' + newClass).trim();
		}
		const subEl = row.querySelector('.stop-sub');
		if (isCurrent) {
			if (!subEl || !subEl.classList.contains('accent')) {
				const si = row.querySelector('.stop-info');
				const existing = si?.querySelector('.stop-sub');
				if (existing) existing.remove();
				const d = document.createElement('div');
				d.className = 'stop-sub accent';
				d.textContent = '● ' + vehicleLabel(_currentPanelInfo) + ' is here';
				si?.appendChild(d);
			}
		} else if (isTarget && !isCurrent) {
			if (!subEl || subEl.style.color !== 'var(--accent)') {
				const si = row.querySelector('.stop-info');
				const existing = si?.querySelector('.stop-sub');
				if (existing) existing.remove();
				const d = document.createElement('div');
				d.className = 'stop-sub';
				d.style.cssText = 'color:var(--accent);opacity:.7';
				d.textContent = 'your stop';
				si?.appendChild(d);
			}
		} else {
			if (subEl) subEl.remove();
		}
		const s = stops[i];
		if (s) {
			const delay = s.arrivalDelay || s.departureDelay || 0;
			const hasRT = s.arrivalDelay !== undefined || s.departureDelay !== undefined;
			const isDelayed = delay > 60;
			const tc = !hasRT ? 'no-rt' : isDelayed ? 'delayed' : 'on-time';
			const timeEl = row.querySelector('.stop-time');
			if (timeEl && timeEl.className !== `stop-time ${tc}`) timeEl.className = `stop-time ${tc}`;
		}
	});
}

function buildArrivingHtml(stops, currentIdx, targetIdx, curStop, info) {
	if (targetIdx < 0) return '';
	const ts = stops[targetIdx];
	const plannedT = ts?.plannedArrival || ts?.plannedDeparture || ts?.arrival || ts?.departure;
	const arrDelay = ts?.arrivalDelay || ts?.departureDelay || 0;
	const realtimeT = ts?.realtimeArrival || ts?.realtimeDeparture ||
		(plannedT && arrDelay ? new Date(new Date(plannedT).getTime() + arrDelay * 1000).toISOString() : null);
	const arrT = realtimeT || plannedT;
	const m = minutesFrom(arrT);
	let txt = m === null ? '' : m <= 0 ? '<strong style="color:var(--green)">Arrived</strong>' : `Arriving in <strong>${m} min</strong>`;
	if (arrDelay > 60) txt += ` <span style="color:var(--red)">(+${Math.round(arrDelay/60)} min late)</span>`;
	return `<div class="current-stop-banner">
    <div class="csb-dot"></div>
    <div class="csb-text">${vehicleLabel(info).charAt(0).toUpperCase()+vehicleLabel(info).slice(1)} currently at <strong>${esc(curStop)}</strong><br>${txt} at <strong>${esc(ts?.stop?.name||'your stop')}</strong></div>
  </div>`;
}

function buildStopsHtml(stops, currentIdx, targetIdx, info) {
	const vLabel = vehicleLabel(info);
	return stops.map((s, i) => {
		const name = s.stop?.name || '—';
		const t = s.arrival || s.departure;
		const delay = s.arrivalDelay || s.departureDelay || 0;
		const hasRT = s.arrivalDelay !== undefined || s.departureDelay !== undefined;
		const isDelayed = delay > 60;
		const plat = s.arrivalPlatform || s.departurePlatform || s.plannedArrivalPlatform || s.plannedDeparturePlatform;
		const isPassed = i < currentIdx,
			isCurrent = i === currentIdx,
			isTarget = i === targetIdx;
		const rowClass = (isPassed ? 'passed' : isCurrent ? 'current' : isTarget ? 'target' : '');
		const tc = !hasRT ? 'no-rt' : isDelayed ? 'delayed' : 'on-time';
		return `<div class="stop-row ${rowClass}">
      <div class="stop-dot-wrap"><div class="stop-dot"></div></div>
      <div class="stop-info">
        <div class="stop-name">${esc(name)}${isTarget?' ★':''}</div>
        ${isCurrent?`<div class="stop-sub accent">● ${vLabel} is here</div>`:''}
        ${isTarget&&!isCurrent?`<div class="stop-sub" style="color:var(--accent);opacity:.7">your stop</div>`:''}
      </div>
      <div class="stop-times">
        ${t?`<div class="stop-time ${tc}">${fmtTime(t)}</div>`:''}
        ${isDelayed?`<div class="stop-time-plan">${fmtTime(s.plannedArrival||s.plannedDeparture)}</div><div class="stop-delay">+${Math.round(delay/60)}min</div>`:''}
        ${plat?`<div class="stop-platform">Trk ${plat}</div>`:''}
      </div>
    </div>`;
	}).join('');
}

function closePanel() {
	document.getElementById('tripPanel').classList.remove('visible');
	document.body.style.overflow = '';
	clearInterval(panelRefreshInterval);
	currentPanelTripId = null;
	_panelRendered = false;
}

function handlePanelBackdrop(e) {
	if (e.target === document.getElementById('tripPanel')) closePanel();
}

function toggleTrack(e, tripId) {
	e.stopPropagation();
	if (trackedTripId === tripId) {
		stopTracking();
		return;
	}
	const dep = allDepartures.find(d => d.tripId === tripId);
	if (!dep) return;
	trackedTripId = tripId;
	trackedDep = dep;
	trackedInfo = getLineInfo(dep);
	try {
		localStorage.setItem('tracked', JSON.stringify({
			tripId,
			dep,
			info: trackedInfo
		}));
	} catch {}
	updateTrackBanner();
	document.getElementById('trackBanner').classList.add('visible');
	document.getElementById('mainContent').classList.add('banner-open');
	document.querySelectorAll('.dep-card').forEach(c => c.classList.remove('tracked'));
	document.querySelectorAll('.btn-track').forEach(b => {
		b.classList.remove('active');
		b.textContent = 'Track';
	});
	const k = depKey(dep);
	const card = document.querySelector(`[data-trip="${CSS.escape(k)}"]`);
	if (card) {
		card.classList.add('tracked');
		const bt = card.querySelector('.btn-track');
		if (bt) {
			bt.classList.add('active');
			bt.textContent = '● Tracking';
		}
	}
	clearInterval(trackBannerInterval);
	trackBannerInterval = setInterval(() => {
		const upd = allDepartures.find(d => d.tripId === trackedTripId);
		if (upd) {
			trackedDep = upd;
			updateTrackBanner();
		}
	}, 10000);
}

function updateTrackBanner() {
	if (!trackedDep || !trackedInfo) return;
	const lc = trackedInfo.color || '#e8c44a';
	const banner = document.getElementById('trackBanner');
	banner.style.setProperty('--line-c', lc);
	const pill = document.getElementById('trackPill');
	pill.textContent = trackedDep.line?.name || '?';
	pill.style.background = lc;
	pill.className = 'track-pill' + (trackedInfo.textLight ? ' light' : '');
	document.getElementById('trackDir').textContent = '→ ' + (trackedDep.direction || '—');
	const when = trackedDep.when || trackedDep.plannedWhen;
	const mins = minutesFrom(when);
	const delay = trackedDep.delay || 0;
	const isDelayed = delay > 60;
	document.getElementById('trackDot').className = 'track-status-dot' + (isDelayed ? ' delayed' : '');
	const plat = trackedDep.platform || trackedDep.plannedPlatform;
	let arrivingStr = '';
	if (mins !== null) {
		if (mins <= 0) arrivingStr = `<strong style="color:var(--green)">Arrived</strong>`;
		else arrivingStr = `Arriving in <strong>${mins}m</strong>`;
	}
	const delayStr = isDelayed ? ` <span style="color:var(--red);font-size:11px">+${Math.round(delay/60)}min late</span>` : '';
	const platStr = plat ? ` &nbsp;·&nbsp; Track <strong style="color:var(--accent)">${plat}</strong>` : '';
	document.getElementById('trackArriving').innerHTML = arrivingStr + delayStr + platStr;
}

function stopTracking() {
	clearInterval(trackBannerInterval);
	trackedTripId = null;
	trackedDep = null;
	trackedInfo = null;
	try {
		localStorage.removeItem('tracked');
	} catch {}
	document.getElementById('trackBanner').classList.remove('visible');
	document.getElementById('mainContent').classList.remove('banner-open');
	document.querySelectorAll('.dep-card').forEach(c => c.classList.remove('tracked'));
	document.querySelectorAll('.btn-track').forEach(b => {
		b.classList.remove('active');
		b.textContent = 'Track';
	});
}

function openTrackedTrip() {
	if (trackedTripId) openTrip(null, trackedTripId);
}

function showLoading() {
	document.getElementById('departuresContainer').innerHTML = `<div class="state-box"><div class="loader"></div><p>Loading departures…</p></div>`;
}

function showError(e) {
	document.getElementById('departuresContainer').innerHTML = `<div class="state-box"><div class="icon">⚠️</div><h3>Connection error</h3><p>API unreachable at<br><code style="color:var(--accent)">${API}</code><br><br>${e?.message||''}</p></div>`;
}

function startCountdown() {
	clearInterval(countdownInterval);
	nextRefreshAt = Date.now() + REFRESH_SEC * 1000;
	tickCountdown();
	countdownInterval = setInterval(tickCountdown, 1000);
}

function tickCountdown() {
	const el = document.getElementById('lastUpdate');
	const secEl = document.querySelector('.last-update')
	if (!secEl.classList.contains('visible')) return;
	const secs = Math.max(0, Math.round((nextRefreshAt - Date.now()) / 1000));
	const now = new Date().toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	el.innerHTML = `</span>Updated: ${now} &nbsp;·&nbsp; <span class="countdown-text">Refresh in <strong>${secs}s</strong></span>`;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		currentFilter = btn.dataset.filter;
		renderAll();
	});
});
document.getElementById('refreshBtn').addEventListener('click', loadDepartures);

function restoreTrackedFromCache() {
	try {
		const raw = localStorage.getItem('tracked');
		if (!raw) return;
		const {
			tripId,
			dep,
			info
		} = JSON.parse(raw);
		if (!tripId || !dep) return;
		trackedTripId = tripId;
		trackedDep = dep;
		trackedInfo = info;
		updateTrackBanner();
		document.getElementById('trackBanner').classList.add('visible');
		document.getElementById('mainContent').classList.add('banner-open');
		clearInterval(trackBannerInterval);
		trackBannerInterval = setInterval(() => {
			const upd = allDepartures.find(d => d.tripId === trackedTripId);
			if (upd) {
				trackedDep = upd;
				updateTrackBanner();
			}
		}, 10000);
	} catch (e) {
		console.warn('Could not restore tracked trip:', e);
	}
}
restoreTrackedFromCache();

(async function initFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const stationId = params.get('station');
	const stationName = params.get('name');
	if (!stationId) return;
	if (stationName) {
		document.getElementById('searchInput').value = decodeURIComponent(stationName);
		selectStation(stationId, decodeURIComponent(stationName));
	} else {
		showLoading();
		try {
			const r = await fetch(`${API}/stops/${stationId}`);
			const stop = await r.json();
			const name = stop.name || stationId;
			if (stop.products) currentStationProducts = stop.products;
			document.getElementById('searchInput').value = name;
			applyProductFilters();
			selectStation(stationId, name);
		} catch {
			document.getElementById('searchInput').value = stationId;
			selectStation(stationId, stationId);
		}
	}
})();