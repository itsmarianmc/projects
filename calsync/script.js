let GOAL = parseInt(localStorage.getItem('calsync_goal') || '2000');
const SHEET_TOP_MARGIN = 24;

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

let sheetDrag = false;
let sDragStartY = 0;
let sDragLastY = 0;
let sDragDY = 0;
let sDragVel = 0;
let modalState = 'closed';
let naturalHeight = 0;

let historyModalState = 'closed';
let historyNaturalHeight = 0;
let histSheetDrag = false;
let hDragStartY = 0, hDragLastY = 0, hDragDY = 0, hDragVel = 0;

const renderedIds = new Set();

const el = id => document.getElementById(id);

const modal = el('modal');
const overlay = el('overlay');
const handleZone = el('handleZone');
const modalBody = el('modalBody');
const actionBtn = el('actionBtn');
const actionIcon = el('actionIcon');
const historyOverlay = el('historyOverlay');
const historyModal = el('historyModal');
const historyHandleZone = el('historyHandleZone');

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
	el('dateLabel').textContent = now.toLocaleDateString('en-US', opts);
}

function showToast(msg) {
	const t = el('toast');
	t.textContent = msg;
	t.classList.add('show');
	setTimeout(() => t.classList.remove('show'), 2000);
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
		if (box.querySelectorAll('button:not(.hidden)').length === 0) {
			box.classList.add('hidden');
		}
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

	el('ringProgress').style.strokeDashoffset = circ * (1 - pct);
	el('ringAmount').textContent = tot >= 1000 ? (tot / 1000).toFixed(1).replace('.', ',') + 'k' : tot;
	el('ringAmount').style.fontSize = tot >= 1000 ? '28px' : '38px';

	el('totalKcal').textContent = Math.round(totals.kcal);
	el('totalProtein').textContent = Math.round(totals.protein * 10) / 10;
	el('totalCarbs').textContent = Math.round(totals.carbs * 10) / 10;
	el('totalFat').textContent = Math.round(totals.fat * 10) / 10;

	el('statPct').textContent = Math.round(pct * 100) + '%';
	el('statCount').textContent = te.length;
	el('statLast').textContent = te.length ? fmtAgo(te[te.length - 1].ts) : '-';

	renderLog();
	localStorage.setItem('calsync_v1', JSON.stringify(entries));
	if (typeof updateGoalDisplay === 'function') updateGoalDisplay();
}

function renderLog() {
	const list = el('logList');
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
			div.innerHTML = `
				<div class="log-emoji no-select"><i class="${e.emoji || 'fa-solid fa-utensils'}" style="color:${e.color || 'var(--accent)'}"></i></div>
				<div class="log-info">
					<div class="log-name">${e.food}</div>
					<div class="log-time">${fmtTime(e.ts)}${subInfo ? ' · ' + subInfo : ''}</div>
				</div>
				<div class="log-kcal">+${Math.round(e.kcal)} kcal</div>
				<button class="log-delete">
					<svg height="20" viewBox="0 -960 960 960" width="20" fill="var(--text3)">
						<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
					</svg>
				</button>
			`;
			div.querySelector('.log-delete').addEventListener('click', () => deleteEntry(e.id));
			const sibling = list.children[i];
			sibling ? list.insertBefore(div, sibling) : list.appendChild(div);
			renderedIds.add(e.id);
		}
	});

	const header = document.createElement('div');
	header.className = 'log-date-header';
	const todayKcal = te.reduce((s, e) => s + e.kcal, 0);
	header.innerHTML = `<span>${formatDateLabel(getToday())}</span><span class="log-date-total">${Math.round(todayKcal)} kcal</span>`;
	list.insertBefore(header, list.firstChild);
}

function deleteEntry(id) {
	const key = 'dropsync_delete_warning';
	const warnEnabled = localStorage.getItem(key) !== 'false';
	if (warnEnabled && !confirm('Delete this entry?')) return;
	entries = entries.filter(e => e.id !== id);
	updateUI();
	if (typeof deleteFromCloud === 'function') deleteFromCloud(id);
	showToast('Entry deleted');
}

function setModalNoTransition() { modal.style.transition = 'none'; }

function setModalTransition(props) {
	const dur = '0.42s';
	const ease = 'cubic-bezier(0.34, 1.15, 0.64, 1)';
	modal.style.transition = props.map(p => `${p} ${dur} ${ease}`).join(', ');
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
	el('searchResults').innerHTML = ``;
	showSkeletons(3);
	el('searchStatus').textContent = '';
	const _se = document.querySelector('.search-elements');
	if (_se) _se.classList.remove('barcode-mode');
	el('barcodeManualInput').value = '';
	el('scanBarcodeBtn').classList.remove('active');
	el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-barcode"></i>';
	document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
	selFood = null;
	currentCategory = null;

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

	next.style.visibility = 'hidden';
	next.style.display = 'block';
	const toH = next.offsetHeight;
	next.style.display = '';
	next.style.visibility = '';

	current.classList.remove('active');
	current.classList.add(exitClass);
	next.classList.add(enterClass);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			modalBody.style.transition = 'height 0.34s cubic-bezier(0.4, 0, 0.2, 1)';
			modalBody.style.height = toH + 'px';
		});
	});

	current.addEventListener('animationend', () => {
		current.classList.remove(exitClass);
		current.style.display = '';
	}, { once: true });

	next.addEventListener('animationend', () => {
		next.classList.remove(enterClass);
		next.classList.add('active');
		modalBody.style.height = '';
		modalBody.style.transition = '';
		updateActionButton();
	}, { once: true });
}

function goToStep(n, direction) {
	const stepId = 'step' + n;
	if (direction === undefined) direction = n > currentStep ? 'forward' : 'backward';
	currentStep = n;
	switchStep(stepId, direction);

	const titles = { 1: 'Add Food', 2: 'Select Method', 3: 'Search Food', 4: 'Set Amount' };
	el('modalTitle').textContent = titles[n] || 'Add Food';

	if (n === 1) {
		el('backBtn').style.opacity = '0';
	} else {
		el('backBtn').classList.remove('hidden');
		el('backBtn').style.opacity = '1';
	}
}

function resetToStep1() {
	selFood = null;
	selectedCategory = null;
	currentCategory = null;
	currentStep = 1;
	el('foodSearchInput').value = '';
	el('searchResults').innerHTML = '';
	el('searchStatus').textContent = '';
	const _se = document.querySelector('.search-elements');
	if (_se) _se.classList.remove('barcode-mode');
	el('barcodeManualInput').value = '';
	el('scanBarcodeBtn').classList.remove('active');
	el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-barcode"></i>';
	document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));

	el('manualNutrients').style.display = 'block';
	el('nutritionFactsTable').style.display = 'none';

	el('modalTitle').textContent = 'Add Food';
	el('backBtn').style.opacity = '0';
	updateActionButton();
}

function parseServingSize(product) {
	const servingStr = product.serving_size || product.serving_quantity || '';
	const match = servingStr.match(/([\d.,]+)\s*(l|ml|g|kg|oz|cl)/i);
	if (match) {
		let val = parseFloat(match[1].replace(',', '.'));
		const unit = match[2].toLowerCase();
		if (unit === 'l') val = val * 1000;
		else if (unit === 'kg') val = val * 1000;
		else if (unit === 'cl') val = val * 10;
		else if (unit === 'oz') val = val * 28.35;
		return Math.round(val);
	}

	const qStr = (product.product_quantity || '').toString();
	const qMatch = qStr.match(/([\d.,]+)\s*(l|ml|g|kg)/i);
	if (qMatch) {
		let val2 = parseFloat(qMatch[1].replace(',', '.'));
		const unit2 = qMatch[2].toLowerCase();
		if (unit2 === 'l') val2 = val2 * 1000;
		else if (unit2 === 'kg') val2 = val2 * 1000;
		return Math.round(val2);
	}
	return null;
}

function mapProductToFood(product) {
	const n = product.nutriments || {};
	const kcalPer100 = n['energy-kcal_100g'] || n['energy-kcal'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
	const protPer100 = n['proteins_100g'] || n['proteins'] || 0;
	const carbPer100 = n['carbohydrates_100g'] || n['carbohydrates'] || 0;
	const fatPer100 = n['fat_100g'] || n['fat'] || 0;

	const energyKj = n['energy-kj_100g'] || n['energy-kj'] || (kcalPer100 * 4.184);
	const satFatPer100 = n['saturated-fat_100g'] || n['saturated-fat'] || null;
	const sugarPer100 = n['sugars_100g'] || n['sugars'] || null;
	const saltPer100 = n['salt_100g'] || n['salt'] || null;

	let finalSalt = saltPer100;
	if (finalSalt === null && n['sodium_100g']) {
		finalSalt = n['sodium_100g'] * 2.5;
	}

	const categories = (product.categories_tags || []).join(' ');
	const isLiquid = categories.includes('beverage') || categories.includes('drink') ||
		categories.includes('water') || categories.includes('juice') || categories.includes('milk') ||
		(product.quantity || '').toLowerCase().includes('ml') || (product.quantity || '').toLowerCase().includes('l ');

	const servingSize = parseServingSize(product);

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
		emoji: 'fa-solid fa-utensils',
		color: 'var(--accent)',
		isLiquid,
		servingSize,
		defaultUnit: isLiquid ? 'ml' : 'g',
		isBarcode: true
	};
}

function showSkeletons(count = 3) {
	const container = el('searchResults');
	container.innerHTML = Array.from({ length: count }, () => `
		<div class="skeleton-item">
			<div class="skeleton-icon"></div>
			<div class="skeleton-info">
				<div class="skeleton-line name"></div>
				<div class="skeleton-line brand"></div>
			</div>
			<div class="skeleton-kcal"></div>
		</div>
	`).join('');
}

async function searchFood(query) {
	if (!query.trim()) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = '';
		return;
	}
	el('searchStatus').textContent = '';
	showSkeletons(3);
	try {
		const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,product_quantity,categories_tags,quantity`;
		const res = await fetch(url);
		const data = await res.json();
		const products = (data.products || []).filter(p => p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || p.nutriments['energy_100g']));
		if (!products.length) {
			el('searchResults').innerHTML = '';
			el('searchStatus').innerHTML = 'No results found. Try a different term.<br>Add your food to the <a href="https://openfoodfacts.org/">OpenFoodFacts Database<a>';
			el('searchStatus').classList.add('active');
			return;
		}
		el('searchStatus').textContent = '';
		renderSearchResults(products);
	} catch (e) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = 'Search failed. Check your connection.';
		el('searchStatus').classList.add('active');
	}
}

async function lookupBarcode(barcode) {
	if (!barcode.trim()) return;
	el('searchStatus').textContent = '';
	showSkeletons(1);
	try {
		const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
		const res = await fetch(url);
		const data = await res.json();
		if (data.status !== 1 || !data.product) {
			el('searchResults').innerHTML = '';
			el('searchStatus').textContent = 'Product not found. Try searching by name.';
			return;
		}
		el('searchStatus').textContent = '';
		renderSearchResults([data.product]);
	} catch (e) {
		el('searchResults').innerHTML = '';
		el('searchStatus').textContent = 'Lookup failed. Check your connection.';
	}
}

function renderSearchResults(products) {
	const container = el('searchResults');
	container.innerHTML = '';
	products.forEach(product => {
		const food = mapProductToFood(product);
		const div = document.createElement('div');
		div.className = 'search-result-item';
		const kcalDisplay = food.kcalPer100 ? `${Math.round(food.kcalPer100)} kcal/100${food.defaultUnit}` : '? kcal';
		div.innerHTML = `
			<div class="search-result-icon"><i class="${food.emoji}"></i></div>
			<div class="search-result-info">
				<div class="search-result-name">${food.name}</div>
				${food.brand ? `<div class="search-result-brand">${food.brand}</div>` : ''}
			</div>
			<div class="search-result-kcal">${kcalDisplay}</div>
		`;
		div.addEventListener('click', () => selectFood(food));
		container.appendChild(div);
	});
}

function selectFood(food) {
	selFood = food;
	el('foodPreviewName').textContent = food.name;
	el('foodPreviewBrand').textContent = food.brand || '';
	el('foodPreviewPer').textContent = `per 100${food.defaultUnit}`;
	el('foodPreviewEmoji').innerHTML = `<i class="${food.emoji}" style="color:${food.color}"></i>`;

	selectedUnit = food.defaultUnit || 'g';
	document.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === selectedUnit));

	const defaultAmt = food.servingSize || 100;
	el('amountInput').value = defaultAmt;

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

	updateCaloriePreview();
	prevStepBeforeAmount = 3;
	goToStep(4);
}

function startManualAdd() {
	if (!currentCategory) return;
	selFood = {
		name: currentCategory.category,
		brand: '',
		kcalPer100: 0,
		protPer100: 0,
		carbPer100: 0,
		fatPer100: 0,
		emoji: currentCategory.emoji,
		color: currentCategory.color,
		defaultUnit: 'g',
		servingSize: 100,
		isManual: true,
		isBarcode: false
	};

	el('foodPreviewName').textContent = currentCategory.category;
	el('foodPreviewBrand').textContent = 'Manual entry';
	el('foodPreviewPer').textContent = 'Enter calories manually below';
	el('foodPreviewEmoji').innerHTML = `<i class="${currentCategory.emoji}" style="color:${currentCategory.color}"></i>`;

	selectedUnit = 'g';
	document.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === selectedUnit));
	el('amountInput').value = 100;

	el('manualKcal').value = 0;
	el('manualProtein').value = 0;
	el('manualCarbs').value = 0;
	el('manualFat').value = 0;

	el('manualNutrients').style.display = 'block';
	el('nutritionFactsTable').style.display = 'none';

	updateCaloriePreview();
	prevStepBeforeAmount = 2;
	goToStep(4);
}

function updateCaloriePreview() {
	if (!selFood) return;
	const amount = parseFloat(el('amountInput').value) || 0;
	let kcal, prot, carb, fat;

	if (selFood.isManual) {
		kcal = (parseFloat(el('manualKcal').value) || 0) * amount / 100;
		prot = (parseFloat(el('manualProtein').value) || 0) * amount / 100;
		carb = (parseFloat(el('manualCarbs').value) || 0) * amount / 100;
		fat  = (parseFloat(el('manualFat').value)   || 0) * amount / 100;
	} else {
		kcal = (selFood.kcalPer100 * amount) / 100;
		prot = (selFood.protPer100 * amount) / 100;
		carb = (selFood.carbPer100 * amount) / 100;
		fat  = (selFood.fatPer100 * amount) / 100;
	}

	el('calculatedCalories').textContent = Math.round(kcal);

	const pills = el('macroPills');
	pills.innerHTML = '';
	if (prot > 0 || carb > 0 || fat > 0) {
		pills.innerHTML = `
			<div class="macro-pill">P: ${Math.round(prot)}g</div>
			<div class="macro-pill">C: ${Math.round(carb)}g</div>
			<div class="macro-pill">F: ${Math.round(fat)}g</div>
		`;

		el('manualKcal').value = `${Math.round(prot)}`;
		el('manualProtein').value = `${kcal}`;
		el('manualCarbs').value = `${Math.round(carb)}`;
		el('manualFat').value = `${Math.round(fat)}`;
	}
}

function logFood() {
	if (!selFood) return;
	const amount = parseFloat(el('amountInput').value) || 100;
	let kcal, prot, carb, fat;

	if (selFood.isManual) {
		kcal = (parseFloat(el('manualKcal').value) || 0) * amount / 100;
		prot = (parseFloat(el('manualProtein').value) || 0) * amount / 100;
		carb = (parseFloat(el('manualCarbs').value) || 0) * amount / 100;
		fat  = (parseFloat(el('manualFat').value)   || 0) * amount / 100;
	} else {
		kcal = (selFood.kcalPer100 * amount) / 100;
		prot = (selFood.protPer100 * amount) / 100;
		carb = (selFood.carbPer100 * amount) / 100;
		fat  = (selFood.fatPer100 * amount) / 100;
	}

	const entry = {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2),
		food: selFood.name,
		brand: selFood.brand || '',
		emoji: selFood.emoji,
		color: selFood.color,
		kcal: Math.round(kcal),
		amount: Math.round(amount),
		unit: selectedUnit,
		prot: Math.round(prot * 10) / 10,
		carb: Math.round(carb * 10) / 10,
		fat: Math.round(fat * 10) / 10,
		ts: Date.now(),
		date: getToday()
	};

	entries.push(entry);
	updateUI();
	if (typeof pushToCloud === 'function') pushToCloud();
	snapToClosed();
	renderHistoryList();
	showToast(`✓ ${Math.round(kcal)} kcal logged`);
}

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

function renderHistoryList() {
	const container = el('historyList');
	container.innerHTML = '';
	if (!entries.length) {
		container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>No history yet.</div>';
		return;
	}
	const byDate = {};
	[...entries].reverse().forEach(e => {
		if (!byDate[e.date]) byDate[e.date] = [];
		byDate[e.date].push(e);
	});
	Object.entries(byDate).forEach(([date, items]) => {
		const totalKcal = items.reduce((s, e) => s + e.kcal, 0);
		const section = document.createElement('div');
		section.className = 'history-day-section';
		const header = document.createElement('div');
		header.className = 'log-date-header';
		header.innerHTML = `<span>${formatDateLabel(date)}</span><span class="log-date-total">${Math.round(totalKcal)} kcal</span>`;
		section.appendChild(header);
		items.forEach(e => {
			const div = document.createElement('div');
			div.className = 'log-item no-anim';
			const subInfo = e.amount ? `${e.amount}${e.unit || 'g'}` + (e.brand ? ` · ${e.brand}` : '') : '';
			div.innerHTML = `
				<div class="log-emoji no-select"><i class="${e.emoji || 'fa-solid fa-utensils'}" style="color:${e.color || 'var(--accent)'}"></i></div>
				<div class="log-info">
					<div class="log-name">${e.food}</div>
					<div class="log-time">${fmtTime(e.ts)}${subInfo ? ' · ' + subInfo : ''}</div>
				</div>
				<div class="log-kcal">${Math.round(e.kcal)} kcal</div>
			`;
			section.appendChild(div);
		});
		container.appendChild(section);
	});
}

el('openModalBtn').addEventListener('click', openModal);

actionBtn.addEventListener('click', () => {
	if (currentStep === 4) {
		logFood();
		updateDateLabel();
		updateUI();
	}
});

el('backBtn').addEventListener('click', () => {
	if (currentStep === 2) {
		document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
		currentCategory = null;
		selFood = null;
		goToStep(1);
	} else if (currentStep === 3) {
		el('foodSearchInput').value = '';
		const _se2 = document.querySelector('.search-elements');
		if (_se2) _se2.classList.remove('barcode-mode');
		el('barcodeManualInput').value = '';
		el('scanBarcodeBtn').classList.remove('active');
		el('scanBarcodeBtn').innerHTML = '<i class="fa-solid fa-barcode"></i>';
		selFood = null;
		goToStep(2);
	} else if (currentStep === 4) {
		selFood = null;
		goToStep(prevStepBeforeAmount);
	}
});

handleZone.addEventListener('pointerdown', e => {
	if (!naturalHeight) naturalHeight = modal.offsetHeight;
	sheetDrag = true;
	sDragStartY = e.clientY;
	sDragLastY = sDragStartY;
	sDragDY = 0;
	sDragVel = 0;
	setModalNoTransition();
	handleZone.setPointerCapture(e.pointerId);
	e.stopPropagation();
});

handleZone.addEventListener('pointermove', e => {
	if (!sheetDrag) return;
	const y = e.clientY;
	sDragVel = y - sDragLastY;
	sDragLastY = y;
	sDragDY = y - sDragStartY;
	if (sDragDY > 0) {
		modal.style.height = naturalHeight + 'px';
		modal.style.transform = `translateY(${sDragDY}px)`;
		const fade = Math.min(sDragDY / 200, 1);
		overlay.style.background = `rgba(0,0,0,${0.6 * (1 - fade)})`;
		overlay.style.backdropFilter = `blur(${8 * (1 - fade)}px)`;
	}
	e.stopPropagation();
});

handleZone.addEventListener('pointerup', e => {
	if (!sheetDrag) return;
	sheetDrag = false;
	if (sDragDY > 90 || sDragVel > 0.7) {
		snapToClosed();
	} else {
		setModalTransition(['transform']);
		modal.style.transform = 'translateY(0)';
		overlay.style.background = '';
		overlay.style.backdropFilter = '';
	}
	e.stopPropagation();
});

overlay.addEventListener('click', e => {
	if (e.target === overlay) snapToClosed();
});

el('foodSearchInput').addEventListener('input', e => {
	const q = e.target.value.trim();
	clearTimeout(searchTimeout);
	if (!q) {
		el('searchStatus').textContent = '';
		return;
	}
	searchTimeout = setTimeout(() => searchFood(q), 400);
});

el('scanBarcodeBtn').addEventListener('click', () => {
	const elements = el('searchInterface').querySelector('.search-elements');
	const isBarcode = elements.classList.toggle('barcode-mode');
	el('scanBarcodeBtn').classList.toggle('active', isBarcode);
	el('scanBarcodeBtn').innerHTML = isBarcode
		? '<i class="fa-solid fa-magnifying-glass"></i>'
		: '<i class="fa-solid fa-barcode"></i>';
	if (isBarcode) {
		setTimeout(() => el('barcodeManualInput').focus(), 300);
	} else {
		el('foodSearchInput').focus();
	}
});

el('barcodeLookupBtn').addEventListener('click', () => {
	const code = el('barcodeManualInput').value.trim();
	if (code) lookupBarcode(code);
});

el('barcodeManualInput').addEventListener('keydown', e => {
	if (e.key === 'Enter') {
		const code = el('barcodeManualInput').value.trim();
		if (code) lookupBarcode(code);
	}
});

document.querySelectorAll('.category-option').forEach(opt => {
	opt.addEventListener('click', () => {
		document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
		opt.classList.add('selected');
		const emoji = opt.dataset.emoji;
		const color = opt.dataset.color;
		const category = opt.dataset.category;
		currentCategory = { category, emoji, color };
		selFood = null;
		goToStep(2);
	});
});

el('methodDatabase').addEventListener('click', () => {
	el('searchStatus').classList.remove('active');
	showSkeletons(3);
	selFood = null;
	goToStep(3);
});

el('methodManual').addEventListener('click', startManualAdd);

document.querySelectorAll('.unit-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		selectedUnit = btn.dataset.unit;
		updateCaloriePreview();
	});
});

el('amountInput').addEventListener('input', updateCaloriePreview);

document.querySelectorAll('.quick-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		el('amountInput').value = btn.dataset.val;
		updateCaloriePreview();
	});
});

['manualKcal', 'manualProtein', 'manualCarbs', 'manualFat'].forEach(id => {
	el(id).addEventListener('input', updateCaloriePreview);
});

el('clearAll').addEventListener('click', () => {
	const key = 'dropsync_delete_warning';
	const warnEnabled = localStorage.getItem(key) !== 'false';
	if (warnEnabled && !confirm("Delete all of today's entries?")) return;
	entries = entries.filter(e => e.date !== getToday());
	updateUI();
	showToast("Today's entries deleted");
});

el('openHistoryBtn').addEventListener('click', openHistoryModal);

historyOverlay.addEventListener('click', e => {
	if (e.target === historyOverlay) closeHistoryModal();
});

historyHandleZone.addEventListener('pointerdown', e => {
	histSheetDrag = true; hDragStartY = e.clientY; hDragLastY = hDragStartY; hDragDY = 0; hDragVel = 0;
	historyModal.style.transition = 'none';
	historyHandleZone.setPointerCapture(e.pointerId);
	e.stopPropagation();
});

historyHandleZone.addEventListener('pointermove', e => {
	if (!histSheetDrag) return;
	const y = e.clientY; hDragVel = y - hDragLastY; hDragLastY = y; hDragDY = y - hDragStartY;
	if (hDragDY > 0) {
		historyModal.style.transform = `translateY(${18 + hDragDY}px)`;
		const fade = Math.min(hDragDY / 200, 1);
		historyOverlay.style.background = `rgba(0,0,0,${0.6*(1-fade)})`;
		historyOverlay.style.backdropFilter = `blur(${8*(1-fade)}px)`;
	}
	e.stopPropagation();
});

historyHandleZone.addEventListener('pointerup', e => {
	if (!histSheetDrag) return;
	histSheetDrag = false;
	if (hDragDY > 90 || hDragVel > 0.7) {
		closeHistoryModal();
	} else {
		historyModal.style.transition = 'transform 0.36s cubic-bezier(0.34, 1.15, 0.64, 1)';
		historyModal.style.transform = 'translateY(18px)';
		historyOverlay.style.background = '';
		historyOverlay.style.backdropFilter = '';
	}
	e.stopPropagation();
});

document.addEventListener('DOMContentLoaded', function() {
	document.querySelectorAll('.theme-option').forEach(option => {
		option.addEventListener('click', function() {
			applyTheme(this.dataset.theme);
		});
	});
});

updateDateLabel();
updateUI();