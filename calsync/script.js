let GOAL = parseInt(localStorage.getItem('calsync_goal') || '2000');
const SHEET_TOP_MARGIN = 24;
const RECENT_KEY = 'calsync_recent_searches';
const RECENT_MAX = 3;
const FAVS_KEY = 'calsync_favourites';

function escapeHTML(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function loadRecentSearches() {
	try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
}

function saveRecentSearch(query, type, foods) {
	if (!query || !query.trim()) return;
	type = type || 'search';
	var list = loadRecentSearches().filter(function(r) {
		return !(r.query === query && r.type === type);
	});
	list.unshift({ query: query, type: type, ts: Date.now(), foods: foods || [] });
	localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
}

function clearRecentSearches() {
	localStorage.removeItem(RECENT_KEY);
	renderRecentSearches();
}

function loadFavourites() {
	try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch (e) { return []; }
}

function saveFavourite(food) {
	const favs = loadFavourites();
	if (favs.some(f => f.name === food.name && f.brand === (food.brand || ''))) return false;
	favs.unshift({
		name: food.name,
		brand: food.brand || '',
		kcalPer100: food.kcalPer100,
		protPer100: food.protPer100,
		carbPer100: food.carbPer100,
		fatPer100: food.fatPer100,
		satFatPer100: food.satFatPer100 || null,
		sugarPer100: food.sugarPer100 || null,
		saltPer100: food.saltPer100 || null,
		energyKj: food.energyKj || 0,
		emoji: food.emoji || 'fa-solid fa-utensils',
		color: food.color || 'var(--accent)',
		defaultUnit: food.defaultUnit || 'g',
		isLiquid: food.isLiquid || false,
		servingSize: food.servingSize || null,
		isBarcode: food.isBarcode || false,
		isFavourite: true
	});
	localStorage.setItem(FAVS_KEY, JSON.stringify(favs.slice(0, 50)));
	return true;
}

function removeFavourite(name, brand) {
	const favs = loadFavourites().filter(f => !(f.name === name && f.brand === (brand || '')));
	localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
}

function isFavourite(name, brand) {
	return loadFavourites().some(f => f.name === name && f.brand === (brand || ''));
}

const SKEL_HTML = '<div class="skeleton-item"><div class="skeleton-icon"></div>'
	+ '<div class="skeleton-info"><div class="skeleton-line name"></div>'
	+ '<div class="skeleton-line brand"></div></div>'
	+ '<div class="skeleton-kcal"></div></div>';

function renderRecentSearches() {
	var container = el('recentSearches');
	if (!container) return;
	var list = loadRecentSearches();
	var favs = loadFavourites();

	container.innerHTML = '';

	const recentHeader = document.createElement('div');
	recentHeader.className = 'recent-searches-header';
	const recentLabel = document.createElement('span');
	recentLabel.className = 'recent-searches-label';
	recentLabel.textContent = 'Recent';
	recentHeader.appendChild(recentLabel);
	if (list.length) {
		const clearBtn = document.createElement('button');
		clearBtn.className = 'recent-searches-clear';
		clearBtn.textContent = 'Clear';
		clearBtn.addEventListener('click', e => { e.stopPropagation(); clearRecentSearches(); });
		recentHeader.appendChild(clearBtn);
	}
	container.appendChild(recentHeader);

	list.forEach(function(r, idx) {
		var isBarcode = r.type === 'barcode';
		var icon = isBarcode ? 'fa-solid fa-barcode' : 'fa-solid fa-clock-rotate-left';
		var firstFood = r.foods && r.foods[0];
		var sub = firstFood
			? (firstFood.brand || (isBarcode ? 'Barcode lookup' : 'Recent search'))
			: (isBarcode ? 'Barcode lookup' : 'Recent search');

		const item = document.createElement('div');
		item.className = 'recent-item';

		const iconDiv = document.createElement('div');
		iconDiv.className = 'recent-item-icon' + (isBarcode ? ' barcode-icon' : '');
		iconDiv.innerHTML = `<i class="${escapeHTML(icon)}"></i>`;

		const infoDiv = document.createElement('div');
		infoDiv.className = 'recent-item-info';
		const queryDiv = document.createElement('div');
		queryDiv.className = 'recent-item-query';
		queryDiv.textContent = r.query;
		const subDiv = document.createElement('div');
		subDiv.className = 'recent-item-sub';
		subDiv.textContent = sub;
		infoDiv.appendChild(queryDiv);
		infoDiv.appendChild(subDiv);

		const arrow = document.createElement('i');
		arrow.className = 'fa-solid fa-arrow-up-left recent-item-arrow';

		item.appendChild(iconDiv);
		item.appendChild(infoDiv);
		item.appendChild(arrow);

		item.addEventListener('click', function() {
			el('searchStatus').textContent = '';
			el('searchStatus').classList.remove('active');
			if (r.foods && r.foods.length === 1) {
				hideRecentSearches();
				selectFood(r.foods[0]);
				return;
			}
			if (r.type === 'barcode') {
				var elements = el('searchInterface').querySelector('.search-elements');
				if (!elements.classList.contains('barcode-mode')) {
					elements.classList.add('barcode-mode');
					el('scanBarcodeBtn').classList.add('active');
					el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
				}
				el('barcodeManualInput').value = r.query;
			} else {
				el('foodSearchInput').value = r.query;
			}
			if (r.foods && r.foods.length) {
				renderFoodResults(r.foods);
			} else {
				if (r.type === 'barcode') lookupBarcode(r.query);
				else searchFood(r.query);
			}
		});

		container.appendChild(item);
	});

	for (var s = 0; s < RECENT_MAX - list.length; s++) {
		const skelDiv = document.createElement('div');
		skelDiv.innerHTML = SKEL_HTML;
		container.appendChild(skelDiv.firstChild);
	}

	if (favs.length) {
		const favHeader = document.createElement('div');
		favHeader.className = 'recent-searches-header';
		favHeader.style.marginTop = '10px';
		const favLabel = document.createElement('span');
		favLabel.className = 'recent-searches-label';
		favLabel.innerHTML = '<i class="fa-solid fa-star" style="color:var(--accent);font-size:11px;margin-right:4px;"></i>Favourites';
		favHeader.appendChild(favLabel);
		container.appendChild(favHeader);

		favs.slice(0, 5).forEach(function(f, i) {
			const item = document.createElement('div');
			item.className = 'recent-item fav-item';

			const iconDiv = document.createElement('div');
			iconDiv.className = 'recent-item-icon';
			iconDiv.innerHTML = `<i class="${escapeHTML(f.emoji || 'fa-solid fa-utensils')}" style="color:${escapeHTML(f.color || 'var(--accent)')}"></i>`;

			const infoDiv = document.createElement('div');
			infoDiv.className = 'recent-item-info';
			const nameDiv = document.createElement('div');
			nameDiv.className = 'recent-item-query fav-item-name';
			nameDiv.textContent = f.name;
			const subDiv = document.createElement('div');
			subDiv.className = 'recent-item-sub';
			subDiv.textContent = f.brand || 'Favourite';
			infoDiv.appendChild(nameDiv);
			infoDiv.appendChild(subDiv);

			const removeBtn = document.createElement('button');
			removeBtn.className = 'fav-remove-btn';
			removeBtn.title = 'Remove';
			removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
			removeBtn.addEventListener('click', function(e) {
				e.stopPropagation();
				removeFavourite(f.name, f.brand);
				renderRecentSearches();
				showToast('Removed from favourites');
			});

			item.appendChild(iconDiv);
			item.appendChild(infoDiv);
			item.appendChild(removeBtn);

			item.addEventListener('click', function(e) {
				if (e.target.closest('.fav-remove-btn')) return;
				hideRecentSearches();
				selectFood(f);
			});

			container.appendChild(item);
		});
	}

	container.classList.add('visible');
}

function showRecentSearches() { renderRecentSearches(); }

function preRenderRecentSearches() {
	var container = el('recentSearches');
	if (!container) return;
	renderRecentSearches();
	container.classList.remove('visible');
}

function revealRecentSearches() {
	var container = el('recentSearches');
	if (container) container.classList.add('visible');
}

function hideRecentSearches() {
	var container = el('recentSearches');
	if (container) container.classList.remove('visible');
}

const SVG_ARROW = '<svg height="25" viewBox="0 -960 960 960" width="25" fill="#ffffff"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>';
const SVG_CHECK = '<svg height="25" viewBox="0 -960 960 960" width="25" fill="#ffffff"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>';

let entries = JSON.parse(localStorage.getItem('calsync_v1') || '[]');
let selFood = null;
let selectedUnit = 'g';
let selectedCategory = null;
let currentCategory = null;
let currentStep = 1;
let prevStepBeforeAmount = 3;
let searchTimeout = null;

const renderedIds = new Set();
const el = id => document.getElementById(id);
const getToday = () => new Date().toDateString();
const todayEntries = () => entries.filter(e => e.date === getToday());
const totalTodayKcal = () => todayEntries().reduce((s, e) => s + e.kcal, 0);
const expandedHeight = () => window.innerHeight - SHEET_TOP_MARGIN;

function fmtTime(ts) {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtAgo(ts) {
	const m = Math.floor((Date.now() - ts) / 60000);
	if (m < 1) return 'Just now';
	if (m < 60) return `${m} min ago`;
	return `${Math.floor(m / 60)} hr ago`;
}

function formatDateLabel(dateStr) {
	const today = new Date().toDateString();
	const yesterday = new Date(Date.now() - 86400000).toDateString();
	if (dateStr === today) return 'Today';
	if (dateStr === yesterday) return 'Yesterday';
	return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getGoal() { return GOAL; }

function updateDateLabel() {
	const now = new Date();
	const opts = { weekday: 'long', day: 'numeric', month: 'long' };
	const label = el('dateLabel');
	if (label) label.textContent = now.toLocaleDateString('en-US', opts);
}

let _toastQueue = [];
let _toastRunning = false;

function showToast(msg, duration, undoCallback) {
	_toastQueue.push({ msg, duration: duration || 2000, undoCallback });
	if (!_toastRunning) _processToastQueue();
}

function _processToastQueue() {
	if (!_toastQueue.length) { _toastRunning = false; return; }
	_toastRunning = true;
	const { msg, duration, undoCallback } = _toastQueue.shift();
	const t = el('toast');
	if (!t) { _toastRunning = false; return; }
	t.innerHTML = '';
	const msgSpan = document.createElement('span');
	msgSpan.textContent = msg;
	t.appendChild(msgSpan);
	if (undoCallback) {
		const undoBtn = document.createElement('button');
		undoBtn.className = 'toast-undo-btn';
		undoBtn.textContent = 'Undo';
		undoBtn.addEventListener('click', () => {
			undoCallback();
			t.classList.remove('show');
			setTimeout(_processToastQueue, 350);
		});
		t.appendChild(undoBtn);
	}
	t.classList.add('show');
	setTimeout(() => {
		t.classList.remove('show');
		setTimeout(_processToastQueue, 350);
	}, duration);
}

function downloadFile(filename, content, type) {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url; a.download = filename; a.click();
	URL.revokeObjectURL(url);
}

function removeHeaderBtn(id) {
	const btn = document.getElementById(id);
	if (!btn || btn.classList.contains('hidden')) return;
	const box = btn.closest('.button-box');
	if (!box) return;
	btn.style.transition = 'width 0.2s ease, opacity 0.2s ease, padding 0.2s ease, margin 0.2s ease';
	btn.style.width = '0';
	btn.style.opacity = '0';
	btn.style.padding = '0';
	btn.style.margin = '0';
	btn.style.pointerEvents = 'none';
	btn.style.overflow = 'hidden';
	setTimeout(() => {
		btn.classList.add('hidden');
		btn.style.cssText = '';
		if (box.querySelectorAll('button:not(.hidden)').length === 0) box.classList.add('hidden');
	}, 200);
}

function addHeaderBtn(id) {
	const btn = typeof id === 'string' ? document.getElementById(id) : id;
	if (!btn || !btn.classList.contains('hidden')) return;
	const box = document.querySelector('.button-box');
	if (!box) return;
	box.classList.remove('hidden');
	btn.classList.remove('hidden');
	btn.style.cssText = 'width:0; opacity:0; padding:0; margin:0; overflow:hidden; transition:none; pointer-events:none;';
	const order = parseInt(btn.dataset.order) || 99;
	const siblings = [...box.querySelectorAll('button')];
	const ref = siblings.find(b => parseInt(b.dataset.order) > order) || null;
	box.insertBefore(btn, ref);
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			btn.style.transition = 'width 0.2s ease, opacity 0.2s ease, padding 0.2s ease, margin 0.2s ease';
			btn.style.width = '50px';
			btn.style.opacity = '1';
			btn.style.padding = '';
			btn.style.margin = '';
			btn.style.overflow = '';
			btn.style.pointerEvents = '';
		});
	});
	setTimeout(() => { btn.style.cssText = ''; }, 220);
}

function createDraggableSheet({ handleZone, modal, overlay, onClose, getNaturalHeight, setNaturalHeight }) {
	let drag = false, startY = 0, lastY = 0, dY = 0, vel = 0;
	handleZone.addEventListener('pointerdown', e => {
		if (!getNaturalHeight()) setNaturalHeight(modal.offsetHeight);
		drag = true; startY = e.clientY; lastY = startY; dY = 0; vel = 0;
		modal.style.transition = 'none';
		handleZone.setPointerCapture(e.pointerId);
		e.stopPropagation();
	});
	handleZone.addEventListener('pointermove', e => {
		if (!drag) return;
		vel = e.clientY - lastY; lastY = e.clientY; dY = e.clientY - startY;
		if (dY > 0) {
			modal.style.height = getNaturalHeight() + 'px';
			modal.style.transform = `translateY(${18 + dY}px)`;
			const fade = Math.min(dY / 200, 1);
			overlay.style.background = `rgba(0,0,0,${0.6 * (1 - fade)})`;
			overlay.style.backdropFilter = `blur(${8 * (1 - fade)}px)`;
		}
		e.stopPropagation();
	});
	handleZone.addEventListener('pointerup', e => {
		if (!drag) return;
		drag = false;
		if (dY > 90 || vel > 0.7) {
			onClose();
		} else {
			modal.style.transition = 'transform 0.36s cubic-bezier(0.34, 1.15, 0.64, 1)';
			modal.style.transform = 'translateY(18px)';
			overlay.style.background = '';
			overlay.style.backdropFilter = '';
		}
		e.stopPropagation();
	});
}

function updateMacroGoalBars(totals) {
	const goals = {
		protein: parseInt(localStorage.getItem('calsync_goal_protein') || '0'),
		carbs: parseInt(localStorage.getItem('calsync_goal_carbs') || '0'),
		fat: parseInt(localStorage.getItem('calsync_goal_fat') || '0')
	};
	const vals = { protein: totals.protein || 0, carbs: totals.carbs || 0, fat: totals.fat || 0 };
	['protein', 'carbs', 'fat'].forEach(macro => {
		const row = el('macroGoalRow_' + macro);
		if (!row) return;
		if (!goals[macro]) { row.classList.add('hidden'); return; }
		row.classList.remove('hidden');
		const bar = el('macroBar_' + macro);
		if (bar) bar.style.width = Math.min(vals[macro] / goals[macro], 1) * 100 + '%';
		const lbl = el('macroBarLabel_' + macro);
		if (lbl) lbl.textContent = Math.round(vals[macro]) + ' / ' + goals[macro] + 'g';
	});
}

function updateUI() {
	const te = todayEntries();
	const tot = totalTodayKcal();
	const pct = Math.min(tot / GOAL, 1);
	const circ = 2 * Math.PI * 95;
	const totals = te.reduce((acc, e) => ({
		kcal: acc.kcal + (e.kcal || 0),
		protein: acc.protein + (e.prot || 0),
		carbs: acc.carbs + (e.carb || 0),
		fat: acc.fat + (e.fat || 0)
	}), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

	const ringProgress = el('ringProgress');
	if (ringProgress) ringProgress.style.strokeDashoffset = circ * (1 - pct);
	const ringAmount = el('ringAmount');
	if (ringAmount) {
		ringAmount.textContent = tot >= 1000 ? (tot / 1000).toFixed(1).replace('.', ',') + 'k' : tot;
		ringAmount.style.fontSize = tot >= 1000 ? '28px' : '38px';
	}
	if (el('totalKcal')) el('totalKcal').textContent = Math.round(totals.kcal);
	if (el('totalProtein')) el('totalProtein').textContent = Math.round(totals.protein * 10) / 10;
	if (el('totalCarbs')) el('totalCarbs').textContent = Math.round(totals.carbs * 10) / 10;
	if (el('totalFat')) el('totalFat').textContent = Math.round(totals.fat * 10) / 10;
	if (el('statPct')) el('statPct').textContent = Math.round(pct * 100) + '%';
	if (el('statCount')) el('statCount').textContent = te.length;
	if (el('statLast')) el('statLast').textContent = te.length ? fmtAgo(te[te.length - 1].ts) : '-';

	updateMacroGoalBars(totals);
	renderLog();
	localStorage.setItem('calsync_v1', JSON.stringify(entries));
	if (typeof updateGoalDisplay === 'function') updateGoalDisplay();
}

function renderLog() {
	const list = el('logList');
	if (!list) return;
	const te = todayEntries().slice().reverse();
	if (!te.length) {
		list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-utensils"></i></div>Nothing logged yet.<br>Scan a barcode or search for food!</div>`;
		renderedIds.clear();
		return;
	}
	const emptyEl = list.querySelector('.empty-state');
	if (emptyEl) { list.innerHTML = ''; renderedIds.clear(); }
	list.querySelectorAll('.log-date-header').forEach(h => h.remove());
	const newIds = new Set(te.map(e => e.id));
	list.querySelectorAll('.log-item').forEach(item => {
		if (!newIds.has(item.dataset.id)) { item.remove(); renderedIds.delete(item.dataset.id); }
	});
	te.forEach((e, i) => {
		if (!renderedIds.has(e.id)) {
			const div = document.createElement('div');
			div.className = 'log-item';
			div.dataset.id = e.id;
			const subInfo = e.amount ? `${e.amount}${e.unit || 'g'}` + (e.brand ? ` · ${e.brand}` : '') : '';
			const iconEl = document.createElement('div');
			iconEl.className = 'log-emoji no-select';
			iconEl.innerHTML = `<i class="${escapeHTML(e.emoji || 'fa-solid fa-utensils')}" style="color:${escapeHTML(e.color || 'var(--accent)')}"></i>`;
			const infoEl = document.createElement('div');
			infoEl.className = 'log-info';
			const nameEl = document.createElement('div');
			nameEl.className = 'log-name';
			nameEl.textContent = e.food;
			const timeEl = document.createElement('div');
			timeEl.className = 'log-time';
			timeEl.textContent = fmtTime(e.ts) + (subInfo ? ' · ' + subInfo : '');
			infoEl.appendChild(nameEl);
			infoEl.appendChild(timeEl);
			const kcalEl = document.createElement('div');
			kcalEl.className = 'log-kcal';
			kcalEl.textContent = `+${Math.round(e.kcal)} kcal`;
			const delBtn = document.createElement('button');
			delBtn.className = 'log-delete';
			delBtn.innerHTML = `<svg height="20" viewBox="0 -960 960 960" width="20" fill="var(--text3)"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>`;
			delBtn.addEventListener('click', () => deleteEntry(e.id));
			div.appendChild(iconEl); div.appendChild(infoEl); div.appendChild(kcalEl); div.appendChild(delBtn);
			const sibling = list.children[i];
			sibling ? list.insertBefore(div, sibling) : list.appendChild(div);
			renderedIds.add(e.id);
		}
	});
	const header = document.createElement('div');
	header.className = 'log-date-header';
	const todayKcal = te.reduce((s, e) => s + e.kcal, 0);
	const ds = document.createElement('span');
	ds.textContent = formatDateLabel(getToday());
	const ks = document.createElement('span');
	ks.className = 'log-date-total';
	ks.textContent = Math.round(todayKcal) + ' kcal';
	header.appendChild(ds); header.appendChild(ks);
	list.insertBefore(header, list.firstChild);
}

function deleteEntry(id) {
	const entryToDelete = entries.find(e => e.id === id);
	if (!entryToDelete) return;
	entries = entries.filter(e => e.id !== id);
	renderedIds.delete(id);
	updateUI();
	if (typeof deleteFromCloud === 'function') deleteFromCloud(id);
	showToast(`Deleted ${entryToDelete.food}`, 4000, () => {
		entries.push(entryToDelete);
		entries.sort((a, b) => a.ts - b.ts);
		renderedIds.clear();
		updateUI();
		if (typeof pushToCloud === 'function') pushToCloud();
		showToast('↩ Entry restored');
	});
}

const modal = el('modal');
const overlay = el('overlay');
const handleZone = el('handleZone');
const modalBody = el('modalBody');
const actionBtn = el('actionBtn');
const actionIcon = el('actionIcon');
let modalState = 'closed';
let naturalHeight = 0;

function setModalNoTransition() { modal.style.transition = 'none'; }

function setModalTransition(props) {
	modal.style.transition = props.map(p => `${p} 0.42s cubic-bezier(0.34, 1.15, 0.64, 1)`).join(', ');
}

function openModal() {
	removeHeaderBtn('openModalBtn');
	modalState = 'open';
	el('modalBody').querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
	el('step1').classList.add('active', 'no-anim');
	currentStep = 1;
	modalBody.style.height = 'auto';
	el('modalTitle').textContent = 'Add Food';
	updateActionButton();
	el('backBtn').style.opacity = '0';
	el('backBtn').classList.remove('hidden');
	el('foodSearchInput').value = '';
	el('searchResults').innerHTML = '';
	el('searchStatus').textContent = '';
	el('searchStatus').classList.remove('active');
	const _se = document.querySelector('.search-elements');
	if (_se) _se.classList.remove('barcode-mode');
	el('barcodeManualInput').value = '';
	el('scanBarcodeBtn').classList.remove('active');
	el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-barcode"></i>';
	document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
	selFood = null; currentCategory = null;
	renderRecentSearches();
	setModalNoTransition();
	modal.style.height = 'auto';
	modal.style.transform = 'translateY(100%)';
	overlay.classList.add('visible');
	document.body.classList.add('modal-open');
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			naturalHeight = modal.offsetHeight;
			setModalTransition(['transform']);
			modal.style.transform = 'translateY(0)';
			el('step1').classList.remove('no-anim');
		});
	});
}

function snapToClosed() {
	addHeaderBtn('openModalBtn');
	modalState = 'closed';
	const curH = modal.offsetHeight;
	setModalNoTransition();
	modal.style.height = curH + 'px';
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			modal.style.transition = 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)';
			modal.style.transform = 'translateY(110%)';
			document.body.classList.remove('modal-open');
		});
	});
	overlay.style.backdropFilter = '';
	overlay.classList.remove('visible');
	setTimeout(() => {
		modal.style.transform = '';
		modal.style.height = '';
		modal.style.transition = '';
		naturalHeight = 0;
		overlay.style.background = '';
	}, 440);
}

function updateActionButton() {
	const isLastStep = currentStep === 4;
	actionIcon.innerHTML = isLastStep ? SVG_CHECK : SVG_ARROW;
	actionIcon.classList.add('changed');
	setTimeout(() => actionIcon.classList.remove('changed'), 250);
	actionBtn.disabled = !isLastStep;
}

function switchStep(toId, direction = 'forward') {
	const current = modalBody.querySelector('.modal-step.active');
	const next = el(toId);
	if (!current || current === next) return;
	const enterClass = direction === 'forward' ? 'carousel-enter-right' : 'carousel-enter-left';
	const exitClass = direction === 'forward' ? 'carousel-exit-left' : 'carousel-exit-right';
	const fromH = current.offsetHeight;
	modalBody.style.height = fromH + 'px';
	next.classList.add(enterClass, 'active');
	const toH = next.offsetHeight;
	next.classList.remove(enterClass);
	requestAnimationFrame(() => {
		modalBody.style.transition = 'height 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
		modalBody.style.height = toH + 'px';
		current.classList.add(exitClass);
		next.classList.add(enterClass);
		requestAnimationFrame(() => {
			current.classList.remove('active');
			next.classList.remove(enterClass);
			current.classList.add('active');
			next.classList.add('active');
			current.classList.remove('active', exitClass);
			next.classList.remove(enterClass);
		});
		setTimeout(() => {
			modalBody.style.transition = '';
			modalBody.style.height = 'auto';
		}, 300);
	});
}

function goToStep(n) {
	const stepMap = { 1: 'step1', 2: 'step2', 3: 'step3', 4: 'step4' };
	const dir = n > currentStep ? 'forward' : 'backward';
	currentStep = n;
	switchStep(stepMap[n], dir);
	updateActionButton();
	const titles = { 1: 'Add Food', 2: 'Select Method', 3: 'Search Food', 4: 'Set Amount' };
	el('modalTitle').textContent = titles[n] || 'Add Food';
	if (n === 1) {
		el('backBtn').style.opacity = '0';
	} else {
		el('backBtn').classList.remove('hidden');
		el('backBtn').style.opacity = '1';
	}
}

function setAIMode(enable) {
	const amountSection = el('amount-section');
	const caloriePreviewRow = el('caloriePreviewRow');
	const manualNutrients = el('manualNutrients');
	const nutritionFacts = el('nutritionFactsTable');
	const aiSummary = el('aiSummary');
	const amountInput = el('amountInput');
	const unitToggle = document.querySelector('.amount-unit-toggle');
	const quickAmounts = document.querySelector('.quick-amounts');
	if (enable) {
		if (amountSection) amountSection.style.display = 'none';
		if (caloriePreviewRow) caloriePreviewRow.style.display = 'none';
		if (manualNutrients) manualNutrients.style.display = 'none';
		if (nutritionFacts) nutritionFacts.style.display = 'none';
		if (aiSummary) aiSummary.style.display = 'block';
		if (amountInput) amountInput.disabled = true;
		if (unitToggle) unitToggle.style.display = 'none';
		if (quickAmounts) quickAmounts.style.display = 'none';
	} else {
		if (amountSection) amountSection.style.display = '';
		if (caloriePreviewRow) caloriePreviewRow.style.display = '';
		if (manualNutrients) manualNutrients.style.display = 'block';
		if (nutritionFacts) nutritionFacts.style.display = 'none';
		if (aiSummary) aiSummary.style.display = 'none';
		if (amountInput) amountInput.disabled = false;
		if (unitToggle) unitToggle.style.display = 'flex';
		if (quickAmounts) quickAmounts.style.display = 'grid';
	}
}

function resetToStep1() {
	selFood = null; selectedCategory = null; currentCategory = null; currentStep = 1;
	el('foodSearchInput').value = ''; el('searchResults').innerHTML = ''; el('searchStatus').textContent = '';
	const _se = document.querySelector('.search-elements');
	if (_se) _se.classList.remove('barcode-mode');
	el('barcodeManualInput').value = '';
	el('scanBarcodeBtn').classList.remove('active');
	el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-barcode"></i>';
	document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
	if (el('manualNutrients')) el('manualNutrients').style.display = 'block';
	if (el('nutritionFactsTable')) el('nutritionFactsTable').style.display = 'none';
	el('modalTitle').textContent = 'Add Food';
	el('backBtn').style.opacity = '0';
	updateActionButton();
	setAIMode(false);
}

function parseServingSize(product) {
	const servingStr = product.serving_size || product.serving_quantity || '';
	const match = servingStr.match(/([\d.,]+)\s*(l|ml|g|kg|oz|cl)/i);
	if (match) {
		let val = parseFloat(match[1].replace(',', '.'));
		const unit = match[2].toLowerCase();
		if (unit === 'l') val *= 1000;
		else if (unit === 'kg') val *= 1000;
		else if (unit === 'cl') val *= 10;
		else if (unit === 'oz') val *= 28.35;
		return Math.round(val);
	}
	const qMatch = (product.product_quantity || '').toString().match(/([\d.,]+)\s*(l|ml|g|kg)/i);
	if (qMatch) {
		let val2 = parseFloat(qMatch[1].replace(',', '.'));
		if (qMatch[2].toLowerCase() === 'l') val2 *= 1000;
		else if (qMatch[2].toLowerCase() === 'kg') val2 *= 1000;
		return Math.round(val2);
	}
	return null;
}

function mapProductToFood(product) {
	const n = product.nutriments || {};
	const kcalPer100 = n['energy-kcal_prepared_100g'] || n['energy-kcal_100g'] || n['energy-kcal'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
	const protPer100 = n['proteins_prepared_100g'] || n['proteins_100g'] || n['proteins'] || 0;
	const carbPer100 = n['carbohydrates_prepared_100g'] || n['carbohydrates_100g'] || n['carbohydrates'] || 0;
	const fatPer100 = n['fat_prepared_100g'] || n['fat_100g'] || n['fat'] || 0;
	const isPrepared = !!(n['energy-kcal_prepared_100g'] || n['proteins_prepared_100g'] || n['carbohydrates_prepared_100g'] || n['fat_prepared_100g']);
	const energyKj = n['energy-kj_prepared_100g'] || n['energy-kj_100g'] || n['energy-kj'] || (kcalPer100 * 4.184);
	const satFatPer100 = n['saturated-fat_prepared_100g'] || n['saturated-fat_100g'] || n['saturated-fat'] || null;
	const sugarPer100 = n['sugars_prepared_100g'] || n['sugars_100g'] || n['sugars'] || null;
	const saltPer100 = n['salt_prepared_100g'] || n['salt_100g'] || n['salt'] || null;
	let finalSalt = saltPer100;
	if (finalSalt === null && (n['sodium_prepared_100g'] || n['sodium_100g'])) {
		finalSalt = (n['sodium_prepared_100g'] || n['sodium_100g']) * 2.5;
	}
	const categories = (product.categories_tags || []).join(' ');
	const isLiquid = categories.includes('beverage') || categories.includes('drink') ||
		categories.includes('water') || categories.includes('juice') || categories.includes('milk') ||
		(product.quantity || '').toLowerCase().includes('ml') || (product.quantity || '').toLowerCase().includes('l ');
	return {
		name: product.product_name || product.product_name_en || 'Unknown Product',
		brand: product.brands || '',
		kcalPer100: Math.round(kcalPer100 * 10) / 10,
		protPer100: Math.round(protPer100 * 10) / 10,
		carbPer100: Math.round(carbPer100 * 10) / 10,
		fatPer100: Math.round(fatPer100 * 10) / 10,
		satFatPer100: satFatPer100 !== null ? Math.round(satFatPer100 * 10) / 10 : null,
		sugarPer100: sugarPer100 !== null ? Math.round(sugarPer100 * 10) / 10 : null,
		saltPer100: finalSalt !== null ? Math.round(finalSalt * 1000) / 1000 : null,
		energyKj: Math.round(energyKj),
		emoji: 'fa-solid fa-utensils', color: 'var(--accent)',
		isLiquid, servingSize: parseServingSize(product),
		defaultUnit: isLiquid ? 'ml' : 'g', isBarcode: true, isPrepared
	};
}

function showSkeletons(count = 3) {
	el('searchResults').innerHTML = Array.from({ length: count }, () => `
		<div class="skeleton-item"><div class="skeleton-icon"></div>
		<div class="skeleton-info"><div class="skeleton-line name"></div><div class="skeleton-line brand"></div></div>
		<div class="skeleton-kcal"></div></div>`).join('');
}

async function searchFood(query) {
	if (!query.trim()) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = '';
		showRecentSearches();
		return;
	}
	hideRecentSearches();
	el('searchStatus').textContent = '';
	showSkeletons(3);
	try {
		const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,product_quantity,categories_tags,quantity`;
		const data = await (await fetch(url)).json();
		const products = (data.products || []).filter(p => p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || p.nutriments['energy_100g']));
		if (!products.length) {
			el('searchResults').innerHTML = '';
			const status = el('searchStatus');
			status.innerHTML = '';
			const txt = document.createTextNode('No results. Try a different term. Add to the ');
			const lnk = document.createElement('a');
			lnk.href = 'https://openfoodfacts.org/';
			lnk.textContent = 'OpenFoodFacts Database';
			status.appendChild(txt); status.appendChild(lnk);
			status.classList.add('active');
			return;
		}
		el('searchStatus').textContent = '';
		saveRecentSearch(query.trim(), 'search', renderSearchResults(products));
	} catch (e) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = 'Search failed. Check your connection.';
		el('searchStatus').classList.add('active');
	}
}

async function lookupBarcode(barcode) {
	if (!barcode.trim()) return;
	hideRecentSearches();
	el('searchStatus').textContent = '';
	showSkeletons(1);
	try {
		const data = await (await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`)).json();
		if (data.status !== 1 || !data.product) {
			el('searchResults').innerHTML = '';
			el('searchStatus').textContent = 'Product not found. Try searching by name.';
			return;
		}
		el('searchStatus').textContent = '';
		saveRecentSearch(barcode.trim(), 'barcode', renderSearchResults([data.product]));
	} catch (e) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = 'Lookup failed. Check your connection.';
	}
}

function renderFoodResults(foods) {
	const container = el('searchResults');
	container.innerHTML = '';
	foods.forEach(food => {
		const div = document.createElement('div');
		div.className = 'search-result-item';
		const kcalDisplay = food.kcalPer100 ? `${Math.round(food.kcalPer100)} kcal/100${food.defaultUnit}` : '? kcal';

		const iconDiv = document.createElement('div');
		iconDiv.className = 'search-result-icon';
		iconDiv.innerHTML = `<i class="${escapeHTML(food.emoji || 'fa-solid fa-utensils')}"></i>`;

		const infoDiv = document.createElement('div');
		infoDiv.className = 'search-result-info';
		const nameDiv = document.createElement('div');
		nameDiv.className = 'search-result-name';
		nameDiv.textContent = food.name;
		infoDiv.appendChild(nameDiv);
		if (food.brand) {
			const brandDiv = document.createElement('div');
			brandDiv.className = 'search-result-brand';
			brandDiv.textContent = food.brand;
			infoDiv.appendChild(brandDiv);
		}

		const kcalDiv = document.createElement('div');
		kcalDiv.className = 'search-result-kcal';
		kcalDiv.textContent = kcalDisplay;

		const favBtn = document.createElement('button');
		const starred = isFavourite(food.name, food.brand);
		favBtn.className = 'search-result-fav' + (starred ? ' active' : '');
		favBtn.title = starred ? 'Remove from favourites' : 'Add to favourites';
		favBtn.innerHTML = `<i class="fa-${starred ? 'solid' : 'regular'} fa-star"></i>`;
		favBtn.addEventListener('click', e => {
			e.stopPropagation();
			if (isFavourite(food.name, food.brand)) {
				removeFavourite(food.name, food.brand);
				favBtn.classList.remove('active');
				favBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
				showToast('Removed from favourites');
			} else {
				saveFavourite(food);
				favBtn.classList.add('active');
				favBtn.innerHTML = '<i class="fa-solid fa-star"></i>';
				showToast('⭐ Added to favourites');
			}
		});

		div.appendChild(iconDiv); div.appendChild(infoDiv); div.appendChild(kcalDiv); div.appendChild(favBtn);
		div.addEventListener('click', () => selectFood(food));
		container.appendChild(div);
	});
}

function renderSearchResults(products) {
	const foods = products.map(mapProductToFood);
	renderFoodResults(foods);
	return foods;
}

function selectFood(food) {
	selFood = food;
	el('foodPreviewName').textContent = food.name;
	el('foodPreviewBrand').textContent = food.brand || '';
	el('foodPreviewPer').textContent = `per 100${food.defaultUnit}`;
	el('foodPreviewEmoji').innerHTML = `<i class="${escapeHTML(food.emoji || 'fa-solid fa-utensils')}" style="color:${escapeHTML(food.color || 'var(--accent)')}"></i>`;
	selectedUnit = food.defaultUnit || 'g';
	document.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === selectedUnit));
	el('amountInput').value = food.servingSize || 100;
	if (food.isBarcode) {
		el('manualNutrients').style.display = 'none';
		el('nutritionFactsTable').style.display = 'block';
		el('nftUnit').textContent = food.defaultUnit;
		el('nftEnergy').textContent = `${food.energyKj} kJ / ${food.kcalPer100} kcal`;
		el('nftFat').textContent = food.fatPer100;
		el('nftCarbs').textContent = food.carbPer100;
		el('nftProtein').textContent = food.protPer100;
		el('nftSatFat').textContent = food.satFatPer100 !== null ? `${food.satFatPer100} g` : '-';
		el('nftSugar').textContent = food.sugarPer100 !== null ? `${food.sugarPer100} g` : '-';
		el('nftSalt').textContent = food.saltPer100 !== null ? `${food.saltPer100} g` : '-';
	} else {
		el('manualNutrients').style.display = 'block';
		el('nutritionFactsTable').style.display = 'none';
	}
	const amountSection = el('amount-section');
	if (amountSection) amountSection.style.display = food.isPrepared ? 'none' : '';
	updateCaloriePreview();
	prevStepBeforeAmount = 3;
	hideRecentSearches();
	goToStep(4);
}

function startManualAdd() {
	if (!currentCategory) return;
	selFood = {
		name: currentCategory.category, brand: '',
		kcalPer100: 0, protPer100: 0, carbPer100: 0, fatPer100: 0,
		emoji: currentCategory.emoji, color: currentCategory.color,
		defaultUnit: 'g', servingSize: 100, isManual: true, isBarcode: false
	};
	el('foodPreviewName').textContent = currentCategory.category;
	el('foodPreviewBrand').textContent = 'Manual entry';
	el('foodPreviewPer').textContent = 'Enter calories manually below';
	el('foodPreviewEmoji').innerHTML = `<i class="${escapeHTML(currentCategory.emoji)}" style="color:${escapeHTML(currentCategory.color)}"></i>`;
	selectedUnit = 'g';
	document.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === selectedUnit));
	el('amountInput').value = 100;
	el('manualKcal').value = 0; el('manualProtein').value = 0;
	el('manualCarbs').value = 0; el('manualFat').value = 0;
	el('manualNutrients').style.display = 'block';
	el('nutritionFactsTable').style.display = 'none';
	updateCaloriePreview();
	prevStepBeforeAmount = 2;
	goToStep(4);
}

function updateCaloriePreview() {
	if (!selFood || selFood.isAI) return;
	const amount = parseFloat(el('amountInput').value) || 0;
	let kcal, prot, carb, fat;
	if (selFood.isManual) {
		let kp = parseFloat(String(el('manualKcal').value).replace(',', '.')) || 0;
		let pp = parseFloat(String(el('manualProtein').value).replace(',', '.')) || 0;
		let cp = parseFloat(String(el('manualCarbs').value).replace(',', '.')) || 0;
		let fp = parseFloat(String(el('manualFat').value).replace(',', '.')) || 0;
		if (!kp && !pp && !cp && !fp) {
			kp = selFood.kcalPer100 || 0; pp = selFood.protPer100 || 0;
			cp = selFood.carbPer100 || 0; fp = selFood.fatPer100 || 0;
			el('manualKcal').value = kp; el('manualProtein').value = pp;
			el('manualCarbs').value = cp; el('manualFat').value = fp;
		}
		kcal = kp * amount / 100; prot = pp * amount / 100;
		carb = cp * amount / 100; fat = fp * amount / 100;
	} else {
		kcal = selFood.kcalPer100 * amount / 100; prot = selFood.protPer100 * amount / 100;
		carb = selFood.carbPer100 * amount / 100; fat = selFood.fatPer100 * amount / 100;
	}
	el('calculatedCalories').textContent = Math.round(kcal);
	const pills = el('macroPills');
	pills.innerHTML = (prot > 0 || carb > 0 || fat > 0)
		? `<div class="macro-pill">P: ${Math.round(prot)}g</div><div class="macro-pill">C: ${Math.round(carb)}g</div><div class="macro-pill">F: ${Math.round(fat)}g</div>`
		: '';
}

function logFood() {
	if (!selFood) return;
	let kcal, prot, carb, fat, amount, unit;
	if (selFood.isAI) {
		kcal = selFood.kcalTotal; prot = selFood.protTotal;
		carb = selFood.carbTotal; fat = selFood.fatTotal;
		amount = selFood.amount; unit = selFood.unit;
	} else if (selFood.isManual) {
		amount = parseFloat(el('amountInput').value) || 100; unit = selectedUnit;
		const kp = parseFloat(String(el('manualKcal').value).replace(',', '.')) || 0;
		const pp = parseFloat(String(el('manualProtein').value).replace(',', '.')) || 0;
		const cp = parseFloat(String(el('manualCarbs').value).replace(',', '.')) || 0;
		const fp = parseFloat(String(el('manualFat').value).replace(',', '.')) || 0;
		kcal = kp * amount / 100; prot = pp * amount / 100;
		carb = cp * amount / 100; fat = fp * amount / 100;
	} else {
		amount = parseFloat(el('amountInput').value) || 100; unit = selectedUnit;
		kcal = selFood.kcalPer100 * amount / 100; prot = selFood.protPer100 * amount / 100;
		carb = selFood.carbPer100 * amount / 100; fat = selFood.fatPer100 * amount / 100;
	}
	const entry = {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2),
		food: selFood.name, brand: selFood.brand || '',
		emoji: selFood.emoji, color: selFood.color,
		kcal: Math.round(kcal), amount: Math.round(amount), unit: unit || 'g',
		prot: Math.round(prot * 10) / 10, carb: Math.round(carb * 10) / 10,
		fat: Math.round(fat * 10) / 10, ts: Date.now(), date: getToday()
	};
	entries.push(entry);
	updateUI();
	if (typeof pushToCloud === 'function') pushToCloud();
	snapToClosed();
	renderHistoryList();
	showToast(`✓ ${Math.round(kcal)} kcal logged`);
}

const historyModal = el('historyModal');
const historyOverlay = el('historyOverlay');
const historyHandleZone = el('historyHandleZone');
let historyModalState = 'closed';
let historyNaturalHeight = 0;
let historyChartMode = 'kcal';

function openHistoryModal() {
	removeHeaderBtn('openHistoryBtn');
	historyModalState = 'open';
	historyModal.style.transition = 'none';
	historyModal.style.height = 'auto';
	historyModal.style.transform = 'translateY(100%)';
	historyOverlay.classList.add('visible');
	document.body.classList.add('modal-open');
	renderHistoryList();
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			historyNaturalHeight = historyModal.offsetHeight;
			historyModal.style.height = expandedHeight() + 'px';
			historyModal.style.transition = 'transform 0.42s cubic-bezier(0.34, 1.15, 0.64, 1)';
			historyModal.style.transform = 'translateY(18px)';
		});
	});
}

function closeHistoryModal() {
	addHeaderBtn('openHistoryBtn');
	historyModalState = 'closed';
	const curH = historyModal.offsetHeight;
	historyModal.style.transition = 'none';
	historyModal.style.height = curH + 'px';
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			historyModal.style.transition = 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)';
			historyModal.style.transform = 'translateY(110%)';
			document.body.classList.remove('modal-open');
		});
	});
	historyOverlay.style.backdropFilter = '';
	historyOverlay.classList.remove('visible');
	setTimeout(() => {
		historyModal.style.transform = '';
		historyModal.style.height = '';
		historyModal.style.transition = '';
		historyNaturalHeight = 0;
		historyOverlay.style.background = '';
	}, 400);
}

function getLast7DaysData() {
	const days = [];
	for (let i = 6; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const dateStr = d.toDateString();
		const de = entries.filter(e => e.date === dateStr);
		days.push({
			label: i === 0 ? 'Today' : i === 1 ? 'Yest.' : d.toLocaleDateString('en-US', { weekday: 'short' }),
			kcal: de.reduce((s, e) => s + (e.kcal || 0), 0),
			prot: de.reduce((s, e) => s + (e.prot || 0), 0),
			carb: de.reduce((s, e) => s + (e.carb || 0), 0),
			fat: de.reduce((s, e) => s + (e.fat || 0), 0),
			date: dateStr
		});
	}
	return days;
}

function renderWeekChart(container, mode) {
	const data = getLast7DaysData();
	const vals = data.map(d => d[mode] || 0);
	const maxVal = Math.max(...vals, mode === 'kcal' ? GOAL : 1);
	const colors = { kcal: 'var(--accent)', prot: '#30D158', carb: '#FFD60A', fat: '#FF6B35' };
	const color = colors[mode] || 'var(--accent)';

	const chart = document.createElement('div');
	chart.className = 'week-chart';

	const modeRow = document.createElement('div');
	modeRow.className = 'week-chart-mode-row';
	['kcal', 'prot', 'carb', 'fat'].forEach(m => {
		const btn = document.createElement('button');
		btn.className = 'week-chart-mode-btn' + (m === mode ? ' active' : '');
		btn.textContent = m === 'kcal' ? 'Calories' : m === 'prot' ? 'Protein' : m === 'carb' ? 'Carbs' : 'Fat';
		btn.style.setProperty('--btn-color', colors[m]);
		if (m === mode) btn.style.color = colors[m];
		btn.addEventListener('click', () => {
			historyChartMode = m;
			const old = container.querySelector('.week-chart');
			if (old) old.remove();
			container.insertBefore(renderWeekChart(container, m), container.querySelector('.history-day-section') || null);
		});
		modeRow.appendChild(btn);
	});
	chart.appendChild(modeRow);

	const barsEl = document.createElement('div');
	barsEl.className = 'week-chart-bars';
	data.forEach((d, i) => {
		const col = document.createElement('div');
		col.className = 'week-chart-col';
		const barWrap = document.createElement('div');
		barWrap.className = 'week-chart-bar-wrap';
		if (mode === 'kcal') {
			const goalLine = document.createElement('div');
			goalLine.className = 'week-chart-goal-line';
			goalLine.style.bottom = (GOAL / maxVal * 100) + '%';
			barWrap.appendChild(goalLine);
		}
		const fill = document.createElement('div');
		fill.className = 'week-chart-bar-fill';
		fill.style.background = color;
		fill.style.height = '0%';
		barWrap.appendChild(fill);
		const valLbl = document.createElement('div');
		valLbl.className = 'week-chart-val';
		valLbl.textContent = Math.round(vals[i]);
		const dayLbl = document.createElement('div');
		dayLbl.className = 'week-chart-day' + (d.date === getToday() ? ' today' : '');
		dayLbl.textContent = d.label;
		col.appendChild(barWrap); col.appendChild(valLbl); col.appendChild(dayLbl);
		barsEl.appendChild(col);
		setTimeout(() => {
			fill.style.transition = `height 0.5s cubic-bezier(0.34,1.15,0.64,1) ${i * 60}ms`;
			fill.style.height = (maxVal > 0 ? vals[i] / maxVal * 100 : 0) + '%';
		}, 50);
	});
	chart.appendChild(barsEl);

	const weekTotals = data.reduce((a, d) => ({
		kcal: a.kcal + d.kcal, prot: a.prot + d.prot,
		carb: a.carb + d.carb, fat: a.fat + d.fat
	}), { kcal: 0, prot: 0, carb: 0, fat: 0 });

	const avgRow = document.createElement('div');
	avgRow.className = 'week-chart-avg-row';
	avgRow.innerHTML = `
		<span>7-day avg: <strong style="color:var(--accent)">${Math.round(weekTotals.kcal / 7)} kcal</strong></span>
		<span style="color:#30D158">P ${Math.round(weekTotals.prot / 7)}g</span>
		<span style="color:#FFD60A">C ${Math.round(weekTotals.carb / 7)}g</span>
		<span style="color:#FF6B35">F ${Math.round(weekTotals.fat / 7)}g</span>
	`;
	chart.appendChild(avgRow);
	return chart;
}

function renderHistoryList() {
	const container = el('historyList');
	if (!container) return;
	container.innerHTML = '';
	container.appendChild(renderWeekChart(container, historyChartMode));
	if (!entries.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-state';
		empty.innerHTML = '<div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>No history yet.';
		container.appendChild(empty);
		return;
	}
	const byDate = {};
	[...entries].reverse().forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
	Object.entries(byDate).forEach(([date, items]) => {
		const totalKcal = items.reduce((s, e) => s + e.kcal, 0);
		const totalProt = items.reduce((s, e) => s + (e.prot || 0), 0);
		const totalCarb = items.reduce((s, e) => s + (e.carb || 0), 0);
		const totalFat = items.reduce((s, e) => s + (e.fat || 0), 0);
		const section = document.createElement('div');
		section.className = 'history-day-section';
		const header = document.createElement('div');
		header.className = 'log-date-header';
		const ds = document.createElement('span'); ds.textContent = formatDateLabel(date);
		const ks = document.createElement('span'); ks.className = 'log-date-total'; ks.textContent = Math.round(totalKcal) + ' kcal';
		header.appendChild(ds); header.appendChild(ks);
		section.appendChild(header);
		const total = (totalProt * 4) + (totalCarb * 4) + (totalFat * 9);
		if (total > 0) {
			const macroBar = document.createElement('div');
			macroBar.className = 'history-macro-bar';
			const pp = Math.round(totalProt * 4 / total * 100);
			const cp = Math.round(totalCarb * 4 / total * 100);
			const fp = 100 - pp - cp;
			macroBar.innerHTML = `
				<div class="history-macro-seg" style="width:${pp}%;background:#30D158" title="Protein ${Math.round(totalProt)}g"></div>
				<div class="history-macro-seg" style="width:${cp}%;background:#FFD60A" title="Carbs ${Math.round(totalCarb)}g"></div>
				<div class="history-macro-seg" style="width:${fp}%;background:#FF6B35" title="Fat ${Math.round(totalFat)}g"></div>`;
			section.appendChild(macroBar);
		}
		items.forEach(e => {
			const div = document.createElement('div');
			div.className = 'log-item no-anim';
			const subInfo = e.amount ? `${e.amount}${e.unit || 'g'}` + (e.brand ? ` · ${e.brand}` : '') : '';
			const iconEl = document.createElement('div');
			iconEl.className = 'log-emoji no-select';
			iconEl.innerHTML = `<i class="${escapeHTML(e.emoji || 'fa-solid fa-utensils')}" style="color:${escapeHTML(e.color || 'var(--accent)')}"></i>`;
			const infoEl = document.createElement('div'); infoEl.className = 'log-info';
			const nm = document.createElement('div'); nm.className = 'log-name'; nm.textContent = e.food;
			const tm = document.createElement('div'); tm.className = 'log-time';
			tm.textContent = fmtTime(e.ts) + (subInfo ? ' · ' + subInfo : '');
			infoEl.appendChild(nm); infoEl.appendChild(tm);
			const kd = document.createElement('div'); kd.className = 'log-kcal'; kd.textContent = Math.round(e.kcal) + ' kcal';
			div.appendChild(iconEl); div.appendChild(infoEl); div.appendChild(kd);
			section.appendChild(div);
		});
		container.appendChild(section);
	});
}

function updateMethodButtonState() {
	const methodAI = el('methodAI');
	const methodSelection = el('methodSelection');
	if (!methodAI || !methodSelection) return;
	const existing = methodSelection.querySelector('.ai-disabled-notice');
	if (existing) existing.remove();
	if (typeof window.isAIReady === 'function' && window.isAIReady()) {
		methodAI.disabled = false;
	} else {
		methodAI.disabled = true;
		const notice = document.createElement('div');
		notice.className = 'ai-disabled-notice';
		const icon = document.createElement('i');
		icon.className = 'fa-solid fa-circle-info';
		const p = document.createElement('p');
		p.appendChild(document.createTextNode('AI Detection is not enabled. Please activate it in '));
		const lnk = document.createElement('a'); lnk.href = '#'; lnk.id = 'goToAISettings'; lnk.textContent = 'Settings';
		p.appendChild(lnk);
		notice.appendChild(icon); notice.appendChild(p);
		methodSelection.querySelector('.method-buttons').appendChild(notice);
		setTimeout(() => {
			const sl = el('goToAISettings');
			if (sl) sl.addEventListener('click', e => {
				e.preventDefault();
				snapToClosed();
				setTimeout(() => {
					openSettingsModal();
					setTimeout(() => {
						const aiSection = document.querySelector('.settings-section:has(#aiEnabledToggle)');
						if (aiSection) {
							aiSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
							aiSection.style.transition = 'background 0.3s';
							aiSection.style.background = 'rgba(255,149,0,0.1)';
							setTimeout(() => { aiSection.style.background = ''; }, 2000);
						}
					}, 100);
				}, 300);
			});
		}, 0);
	}
}

el('openModalBtn').addEventListener('click', openModal);

actionBtn.addEventListener('click', () => {
	if (currentStep === 4) { logFood(); updateDateLabel(); updateUI(); }
});

el('backBtn').addEventListener('click', () => {
	if (currentStep === 2) {
		document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
		currentCategory = null; selFood = null; goToStep(1);
	} else if (currentStep === 3) {
		el('foodSearchInput').value = '';
		const _se2 = document.querySelector('.search-elements');
		if (_se2) _se2.classList.remove('barcode-mode');
		el('barcodeManualInput').value = '';
		el('scanBarcodeBtn').classList.remove('active');
		el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-barcode"></i>';
		selFood = null; goToStep(2);
	} else if (currentStep === 4) {
		selFood = null;
		if (prevStepBeforeAmount === 3) { el('searchResults').innerHTML = ''; revealRecentSearches(); }
		goToStep(prevStepBeforeAmount);
	}
});

createDraggableSheet({
	handleZone, modal, overlay, onClose: snapToClosed,
	getNaturalHeight: () => naturalHeight, setNaturalHeight: h => { naturalHeight = h; }
});

overlay.addEventListener('click', e => { if (e.target === overlay) snapToClosed(); });

el('foodSearchInput').addEventListener('input', e => {
	const q = e.target.value.trim();
	clearTimeout(searchTimeout);
	if (!q) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = '';
		el('searchStatus').classList.remove('active');
		showRecentSearches(); return;
	}
	hideRecentSearches();
	searchTimeout = setTimeout(() => searchFood(q), 400);
});

el('scanBarcodeBtn').addEventListener('click', () => {
	const elements = el('searchInterface').querySelector('.search-elements');
	const isBarcode = elements.classList.toggle('barcode-mode');
	el('scanBarcodeBtn').classList.toggle('active', isBarcode);
	el('scanBarcodeBtn').innerHTML = isBarcode ? '<i class="fa-solid fa-magnifying-glass"></i>' : '<i class="fa-solid fa-barcode"></i>';
	if (isBarcode) setTimeout(() => el('barcodeManualInput').focus(), 300);
	else el('foodSearchInput').focus();
});

el('barcodeLookupBtn').addEventListener('click', () => { const c = el('barcodeManualInput').value.trim(); if (c) lookupBarcode(c); });
el('barcodeManualInput').addEventListener('keydown', e => { if (e.key === 'Enter') { const c = el('barcodeManualInput').value.trim(); if (c) lookupBarcode(c); } });

document.querySelectorAll('.category-option').forEach(opt => {
	opt.addEventListener('click', () => {
		document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
		opt.classList.add('selected');
		currentCategory = { category: opt.dataset.category, emoji: opt.dataset.emoji, color: opt.dataset.color };
		selFood = null; goToStep(2);
	});
});

el('methodDatabase').addEventListener('click', () => {
	el('searchStatus').classList.remove('active'); el('searchResults').innerHTML = ''; selFood = null; goToStep(3);
});
el('methodManual').addEventListener('click', startManualAdd);

document.querySelectorAll('.unit-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active'); selectedUnit = btn.dataset.unit; updateCaloriePreview();
	});
});

el('amountInput').addEventListener('input', updateCaloriePreview);

document.querySelectorAll('.quick-btn').forEach(btn => {
	btn.addEventListener('click', () => { el('amountInput').value = btn.dataset.val; updateCaloriePreview(); });
});

['manualKcal', 'manualProtein', 'manualCarbs', 'manualFat'].forEach(id => {
	const inp = el(id);
	if (inp) inp.addEventListener('input', updateCaloriePreview);
});

el('clearAll').addEventListener('click', () => {
	const key = 'dropsync_delete_warning';
	if (localStorage.getItem(key) !== 'false' && !confirm("Delete all of today's entries?")) return;
	const deleted = todayEntries();
	entries = entries.filter(e => e.date !== getToday());
	renderedIds.clear(); updateUI();
	showToast("Today's entries deleted", 4000, () => {
		entries.push(...deleted); entries.sort((a, b) => a.ts - b.ts);
		renderedIds.clear(); updateUI();
		if (typeof pushToCloud === 'function') pushToCloud();
		showToast('↩ Entries restored');
	});
});

el('openHistoryBtn').addEventListener('click', openHistoryModal);
historyOverlay.addEventListener('click', e => { if (e.target === historyOverlay) closeHistoryModal(); });
createDraggableSheet({
	handleZone: historyHandleZone, modal: historyModal, overlay: historyOverlay, onClose: closeHistoryModal,
	getNaturalHeight: () => historyNaturalHeight, setNaturalHeight: h => { historyNaturalHeight = h; }
});

document.addEventListener('DOMContentLoaded', function() {
	document.querySelectorAll('.theme-option').forEach(option => {
		option.addEventListener('click', function() { applyTheme(this.dataset.theme); });
	});
});

updateDateLabel();
updateUI();