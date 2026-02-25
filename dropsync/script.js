let GOAL = parseInt(localStorage.getItem('dropsync_goal') || '2500');
const SNAP_POINTS = [100, 150, 200, 250, 330, 400, 500, 750, 1000];
const SNAP_THRESH = 28;
const G_TOP = 6;
const G_BOT = 294;
const G_H = G_BOT - G_TOP;
const SHEET_TOP_MARGIN = 24;

const SVG_ARROW = '<svg height="25" viewBox="0 -960 960 960" width="25" fill="#ffffff"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>';
const SVG_CHECK = '<svg height="25" viewBox="0 -960 960 960" width="25" fill="#ffffff"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>';

let entries = JSON.parse(localStorage.getItem('dropsync_v3') || '[]');
let selDrink = null;
let displayAmt = 250;
let rawAmt = 250;
let glassDrag = false;
let gDragStartY = 0;
let gDragRaw0 = 250;
let lastSnapped = null;

let sheetDrag = false;
let sDragStartY = 0;
let sDragLastY = 0;
let sDragDY = 0;
let sDragVel = 0;
let modalState = 'closed';
let naturalHeight = 0;

const renderedIds = new Set();

const el = id => document.getElementById(id);
const modal = el('modal');
const overlay = el('overlay');
const handleZone = el('handleZone');
const modalBody = el('modalBody');
const actionBtn = document.getElementById('actionBtn');
const actionIcon = document.getElementById('actionIcon');
const glassContainer = el('glassContainer');

const getToday = () => new Date().toDateString();
const todayEntries = () => entries.filter(e => e.date === getToday());
const totalToday = () => todayEntries().reduce((s, e) => s + e.amount, 0);
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

function nearestSnap(ml) {
	let best = null;
	let bd = Infinity;
	for (const s of SNAP_POINTS) {
		const d = Math.abs(ml - s);
		if (d <= SNAP_THRESH && d < bd) {
			best = s;
			bd = d;
		}
	}
	return best;
}

function formatDateLabel(dateStr) {
	const today = new Date().toDateString();
	const yesterday = new Date(Date.now() - 86400000).toDateString();
	if (dateStr === today) return 'Today';
	if (dateStr === yesterday) return 'Yesterday';
	return new Date(dateStr).toLocaleDateString('en-US', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});
}

function setModalNoTransition() {
	modal.style.transition = 'none';
}

function setModalTransition(props) {
	const dur = '0.42s';
	const ease = 'cubic-bezier(0.34, 1.15, 0.64, 1)';
	modal.style.transition = props.map(p => `${p} ${dur} ${ease}`).join(', ');
}

function getEvY(e) {
	return e.touches ? e.touches[0].clientY : e.clientY;
}

function updateUI() {
	const tot = totalToday();
	const pct = Math.min(tot / GOAL, 1);
	const circ = 2 * Math.PI * 95;

	el('ringProgress').style.strokeDashoffset = circ * (1 - pct);
	el('ringAmount').textContent = tot >= 1000 ?
		(tot / 1000).toFixed(1).replace('.', ',') + ' L' :
		tot;
	el('ringAmount').style.fontSize = tot >= 1000 ? '30px' : '38px';
	el('statPct').textContent = Math.round(pct * 100) + '%';

	const te = todayEntries();
	el('statCount').textContent = te.length;
	el('statLast').textContent = te.length ? fmtAgo(te[te.length - 1].ts) : '-';

	renderLog();
	localStorage.setItem('dropsync_v3', JSON.stringify(entries));
	if (typeof updateGoalDisplay === 'function') updateGoalDisplay();
}

function renderLog() {
	const list = el('logList');
	const te = todayEntries().slice().reverse();

	if (!te.length) {
		list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-bottle-water"></i></div>Nothing logged yet.<br>Time for a glass of water!</div>`;
		renderedIds.clear();
		return;
	}

	const emptyEl = list.querySelector('.empty-state');
	if (emptyEl) {
		list.innerHTML = '';
		renderedIds.clear();
	}

	list.querySelectorAll('.log-date-header').forEach(h => h.remove());

	const newIds = new Set(te.map(e => e.id));
	list.querySelectorAll('.log-item').forEach(item => {
		if (!newIds.has(item.dataset.id)) {
			item.remove();
			renderedIds.delete(item.dataset.id);
		}
	});

	te.forEach((e, i) => {
		if (!renderedIds.has(e.id)) {
			const div = document.createElement('div');
			div.className = 'log-item';
			div.dataset.id = e.id;
			div.innerHTML = `
                <div class="log-emoji no-select"><i class="${e.emoji}"></i></div>
                <div class="log-info">
                    <div class="log-name">${e.drink}</div>
                    <div class="log-time">${fmtTime(e.ts)}</div>
                </div>
                <div class="log-amount">+${e.amount} ml</div>
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
	header.textContent = formatDateLabel(getToday());
	list.insertBefore(header, list.firstChild);
}

function deleteEntry(id) {
	entries = entries.filter(e => e.id !== id);
	updateUI();
	if (typeof deleteFromCloud === 'function') deleteFromCloud(id);
	showToast('Entry deleted');
}

function openModal() {
	removeHeaderBtn('openModalBtn');

	modalState = 'open';

	const step1 = el('step1');
	const step2 = el('step2');
	step2.classList.remove('active');
	step1.classList.remove('active');
	step1.classList.add('active', 'no-anim');
	modalBody.style.height = 'auto';
	el('modalTitle').textContent = 'What did you drink?';
	updateActionButton();

	setModalNoTransition();
	modal.style.height = 'auto';
	modal.style.transform = 'translateY(100%)';

	overlay.classList.add('visible');
	document.body.classList.add('modal-open');

	el('openModalBtn').classList.add('active');
	el('openModalBtn').disabled = true;
	setTimeout(() => {
		el('openModalBtn').disabled = false;
	}, 1200);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			naturalHeight = modal.offsetHeight;
			setModalTransition(['transform']);
			modal.style.transform = 'translateY(0)';
			step1.classList.remove('no-anim');
		});
	});
}

function snapToOpen() {
	modalState = 'open';
	setModalTransition(['height', 'transform']);
	modal.style.height = naturalHeight + 'px';
	modal.style.transform = 'translateY(0)';
	overlay.style.background = '';
	overlay.style.backdropFilter = '';
	setTimeout(() => {
		if (modalState === 'open') {
			modal.style.height = 'auto';
		}
	}, 460);
}

function snapToExpanded() {
	modalState = 'expanded';
	setModalTransition(['height', 'transform']);
	modal.style.height = expandedHeight() + 'px';
	modal.style.transform = 'translateY(0)';
	overlay.style.background = '';
	overlay.style.backdropFilter = '';
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
			el('openModalBtn').classList.remove('active');
		});
	});

	overlay.style.backdropFilter = '';
	overlay.classList.remove('visible');

	setTimeout(() => {
		modal.style.transform = '';
		modal.style.height = '';
		modal.style.transition = '';
		naturalHeight = 0;
		selDrink = null;
		document.querySelectorAll('.drink-option').forEach(o => o.classList.remove('selected'));
		overlay.style.background = '';
		goToStep1();
	}, 440);
}

function updateActionButton() {
	const isStep1 = !!document.querySelector('#step1.active');
	actionIcon.innerHTML = isStep1 ? SVG_ARROW : SVG_CHECK;
	actionIcon.classList.add('changed');
	setTimeout(() => actionIcon.classList.remove('changed'), 250);
	if (isStep1) {
		actionBtn.disabled = !selDrink;
	} else {
		actionBtn.disabled = false;
	}
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
	next.style.visibility = '';
	next.style.display = '';

	current.classList.remove('active');
	current.classList.add(exitClass);

	next.classList.add(enterClass);

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			modalBody.style.transition = 'height 0.34s cubic-bezier(0.4, 0, 0.2, 1)';
			modalBody.style.height = toH + 'px';
		});
	});

	const DURATION = 360;
	setTimeout(() => {
		current.classList.remove(exitClass);
		current.style.display = '';
		next.classList.remove(enterClass);
		next.classList.add('active');
		modalBody.style.height = 'auto';
		modalBody.style.transition = '';
		naturalHeight = modal.offsetHeight;

		updateActionButton();
	}, DURATION);
}

function goToStep1() {
	el('backBtn').style.opacity = '0';
	setTimeout(() => {
		el('backBtn').classList.add('hidden')
	}, 200);
	switchStep('step1', 'backward');
	el('modalTitle').textContent = 'What did you drink?';
}

function goToStep2() {
	el('backBtn').classList.remove('hidden');
	setTimeout(() => {
		el('backBtn').style.opacity = '1';
	}, 100);
	if (!selDrink) return;
	switchStep('step2', 'forward');
	el('modalTitle').textContent = `${selDrink.name}`;
	buildScale();
	quickSet(250);
}

function buildScale() {
	const scaleLeft = el('scaleLeft');
	const scaleRight = el('scaleRight');
	scaleLeft.innerHTML = '';
	scaleRight.innerHTML = '';

	for (let ml = 1000; ml >= 0; ml -= 100) {
		const topPx = G_TOP + (1 - ml / 1000) * G_H;

		const l = document.createElement('div');
		l.className = 'scale-label';
		l.dataset.ml = ml;
		l.style.top = topPx + 'px';
		l.textContent = ml > 0 ? ml : '';
		scaleLeft.appendChild(l);

		const r = document.createElement('div');
		r.className = 'scale-label';
		r.dataset.ml = ml;
		r.style.top = topPx + 'px';
		r.textContent = SNAP_POINTS.includes(ml) ? '-' : '';
		scaleRight.appendChild(r);
	}

	highlightScale(displayAmt);
}

function highlightScale(ml) {
	const snap = nearestSnap(ml);
	document.querySelectorAll('.scale-label').forEach(item => {
		const v = parseInt(item.dataset.ml);
		item.classList.toggle('highlight', snap !== null && v === snap);
	});
}

function updateGlass(ml) {
	const pct = Math.max(0, Math.min(1, ml / 1000));
	const fillH = G_H * pct;
	const fillY = G_BOT - fillH;
	el('fillRect').setAttribute('y', fillY);
	el('fillRect').setAttribute('height', fillH + 8);

	if (selDrink) {
		const stops = document.querySelectorAll('#fillGrad stop');
		stops[0].setAttribute('stop-color', selDrink.color);
	}
}

function quickSet(ml) {
	el('fillRect').style.transition = 'all 0.3s ease';

	rawAmt = ml;
	displayAmt = ml;
	lastSnapped = nearestSnap(ml) ?? ml;
	commitDisplay(ml);

	setTimeout(() => {
		el('fillRect').style.transition = ''
	}, 300);
}

function commitDisplay(ml) {
	ml = Math.max(10, Math.min(1000, Math.round(ml / 10) * 10));
	displayAmt = ml;
	el('amountNum').textContent = ml;
	updateGlass(ml);
	highlightScale(ml);
	document.querySelectorAll('.quick-btn').forEach(btn => {
		btn.classList.toggle('active', parseInt(btn.dataset.ml) === ml);
	});
}

function addEntry() {
	el('backBtn').classList.add('hidden');
	el('backBtn').style.opacity = "0";
	el('step2').style = '';
	if (!selDrink) return;
	const entry = {
		id: Date.now().toString(),
		drink: selDrink.name,
		emoji: selDrink.emoji,
		color: selDrink.color,
		amount: displayAmt,
		ts: Date.now(),
		date: getToday()
	};
	entries.push(entry);
	updateUI();
	showToast(totalToday() >= GOAL ? '🎉 Daily goal reached!' : `<i class="${entry.emoji}"></i> +${displayAmt} ml`);
	snapToClosed();
	pushToCloud();
}

function deleteAllEntries() {
	const todayEntries = entries.filter(e => e.date === getToday());
	if (!todayEntries.length) {
		showToast('No entries to delete');
		return;
	}
	const warnEnabled = localStorage.getItem('dropsync_delete_warning') !== 'false';
	if (warnEnabled && !confirm('Delete all entries for today? This cannot be undone.')) return;
	const deletedIds = entries.filter(e => e.date === getToday()).map(e => e.id);
	entries = entries.filter(e => e.date !== getToday());
	updateUI();
	if (typeof deleteFromCloud === 'function') deletedIds.forEach(id => deleteFromCloud(id));
	showToast('🗑 All entries deleted');
	pushToCloud();
}

function showToast(msg) {
	const t = el('toast');
	t.innerHTML = msg;
	t.classList.add('show');
	setTimeout(() => t.classList.remove('show'), 2500);
}

function triggerSnapEffect() {
	if (navigator.vibrate) navigator.vibrate(8);
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

	setTimeout(() => {
		btn.style.cssText = '';
	}, 220);
}

let historyModalState = 'closed';
let historyNaturalHeight = 0;
let historySheetDrag = false;
let hsDragStartY = 0,
	hsDragLastY = 0,
	hsDragDY = 0,
	hsDragVel = 0;

const historyModal = document.getElementById('historyModal');
const historyOverlay = document.getElementById('historyOverlay');
const historyHandleZone = document.getElementById('historyHandleZone');

function renderHistoryModal() {
	const list = document.getElementById('historyList');
	list.innerHTML = '';

	if (!entries.length) {
		list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-bottle-water"></i></div>No entries yet.</div>`;
		return;
	}

	const groups = {};
	[...entries].reverse().forEach(e => {
		if (!groups[e.date]) groups[e.date] = [];
		groups[e.date].push(e);
	});

	Object.entries(groups).forEach(([date, dayEntries]) => {
		const totalMl = dayEntries.reduce((s, e) => s + e.amount, 0);
		const header = document.createElement('div');
		header.className = 'log-date-header';
		header.innerHTML = `${formatDateLabel(date)} <span class="log-date-total">${totalMl >= 1000 ? (totalMl/1000).toFixed(1).replace('.',',') + ' L' : totalMl + ' ml'}</span>`;
		list.appendChild(header);

		dayEntries.forEach(e => {
			const div = document.createElement('div');
			div.className = 'log-item no-anim';
			div.innerHTML = `
                <div class="log-emoji no-select"><i class="${e.emoji}"></i></div>
                <div class="log-info">
                    <div class="log-name">${e.drink}</div>
                    <div class="log-time">${fmtTime(e.ts)}</div>
                </div>
                <div class="log-amount">+${e.amount} ml</div>
            `;
			list.appendChild(div);
		});
	});
}

function snapHistoryToOpen() {
	historyModalState = 'open';
	historyModal.style.transition = 'height 0.42s cubic-bezier(0.34, 1.15, 0.64, 1), transform 0.42s cubic-bezier(0.34, 1.15, 0.64, 1)';
	historyModal.style.height = historyNaturalHeight + 'px';
	historyModal.style.transform = 'translateY(0)';
	historyOverlay.style.background = '';
	historyOverlay.style.backdropFilter = '';
}

function snapHistoryToExpanded() {
	historyModalState = 'expanded';
	historyModal.style.transition = 'height 0.42s cubic-bezier(0.34, 1.15, 0.64, 1), transform 0.42s cubic-bezier(0.34, 1.15, 0.64, 1)';
	historyModal.style.height = expandedHeight() + 'px';
	historyModal.style.transform = 'translateY(0)';
	historyOverlay.style.background = '';
	historyOverlay.style.backdropFilter = '';
}

function openHistoryModal() {
	removeHeaderBtn('openHistoryBtn');

	historyModalState = 'open';
	renderHistoryModal();

	historyModal.style.transition = 'none';
	historyModal.style.height = 'auto';
	historyModal.style.transform = 'translateY(100%)';

	historyOverlay.classList.add('visible');
	document.body.classList.add('modal-open');

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			historyNaturalHeight = Math.min(historyModal.offsetHeight, expandedHeight());
			historyModal.style.height = historyNaturalHeight + 'px';
			historyModal.style.transition = 'transform 0.42s cubic-bezier(0.34, 1.15, 0.64, 1)';
			historyModal.style.transform = 'translateY(0)';
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

el('dateLabel').textContent = new Date().toLocaleDateString('en-US', {
	weekday: 'long',
	day: 'numeric',
	month: 'long'
});

overlay.addEventListener('click', e => {
	if (e.target === overlay) snapToClosed();
});

el('openModalBtn').addEventListener('click', openModal);

handleZone.addEventListener('pointerdown', e => {
	if (!naturalHeight) naturalHeight = modal.offsetHeight;
	sheetDrag = true;
	sDragStartY = getEvY(e);
	sDragLastY = sDragStartY;
	sDragDY = 0;
	sDragVel = 0;
	setModalNoTransition();
	handleZone.setPointerCapture(e.pointerId);
	e.stopPropagation();
});

handleZone.addEventListener('pointermove', e => {
	if (!sheetDrag) return;

	const y = getEvY(e);
	sDragVel = y - sDragLastY;
	sDragLastY = y;
	sDragDY = y - sDragStartY;

	const maxH = expandedHeight();
	const shrinkRange = maxH - naturalHeight;

	if (modalState === 'open') {
		if (sDragDY < 0) {
			const grow = Math.abs(sDragDY);
			let newH = naturalHeight + grow;

			if (newH > maxH) {
				const over = newH - maxH;
				newH = maxH + over * 0.12;
			}

			modal.style.height = newH + 'px';
			modal.style.transform = 'translateY(0)';
		} else {
			modal.style.height = naturalHeight + 'px';
			modal.style.transform = `translateY(${sDragDY}px)`;

			const fade = Math.min(sDragDY / 200, 1);
			overlay.style.background = `rgba(0, 0, 0, ${0.6 * (1 - fade)})`;
			overlay.style.backdropFilter = `blur(${8 * (1 - fade)}px)`;
		}
	} else if (modalState === 'expanded') {
		if (sDragDY > 0) {
			if (sDragDY <= shrinkRange) {
				const newH = maxH - sDragDY;
				modal.style.height = newH + 'px';
				modal.style.transform = 'translateY(0)';
			} else {
				const translateY = sDragDY - shrinkRange;
				modal.style.height = naturalHeight + 'px';
				modal.style.transform = `translateY(${translateY}px)`;

				const fade = Math.min(translateY / 200, 1);
				overlay.style.background = `rgba(0, 0, 0, ${0.6 * (1 - fade)})`;
				overlay.style.backdropFilter = `blur(${8 * (1 - fade)}px)`;
			}
		} else {
			const over = Math.abs(sDragDY);
			modal.style.height = (maxH + over * 0.08) + 'px';
			modal.style.transform = 'translateY(0)';
		}
	}

	e.stopPropagation();
});

handleZone.addEventListener('pointerup', e => {
	if (!sheetDrag) return;
	sheetDrag = false;
	e.stopPropagation();

	const maxH = expandedHeight();
	const shrinkRange = maxH - naturalHeight;

	if (modalState === 'open') {
		if (sDragDY < -80 || sDragVel < -0.7) {
			snapToExpanded();
		} else if (sDragDY > 90 || sDragVel > 0.7) {
			snapToClosed();
		} else {
			snapToOpen();
		}
	} else if (modalState === 'expanded') {
		if (sDragDY <= 0) {
			snapToExpanded();
		} else if (sDragDY > shrinkRange) {
			const translateY = sDragDY - shrinkRange;
			if (translateY > 90 || sDragVel > 0.7) {
				snapToClosed();
			} else {
				snapToOpen();
			}
		} else {
			if (sDragDY > shrinkRange * 0.55 || sDragVel > 0.5) {
				snapToOpen();
			} else {
				snapToExpanded();
			}
		}
	}
});

handleZone.addEventListener('pointercancel', () => {
	if (!sheetDrag) return;
	sheetDrag = false;
	if (modalState === 'expanded') {
		snapToExpanded();
	} else {
		snapToOpen();
	}
});

document.querySelectorAll('.drink-option').forEach(opt => {
	opt.addEventListener('click', () => {
		document.querySelectorAll('.drink-option').forEach(o => o.classList.remove('selected'));
		opt.classList.add('selected');
		selDrink = {
			name: opt.dataset.drink,
			emoji: opt.dataset.emoji,
			color: opt.dataset.color
		};
		updateActionButton();
	});
});

actionBtn.addEventListener('click', () => {
	const isStep1 = !!document.querySelector('#step1.active');
	if (isStep1) {
		if (!selDrink) return;
		goToStep2();
	} else {
		addEntry();
	}
});

el('backBtn').addEventListener('click', goToStep1);
el('clearAll').addEventListener('click', deleteAllEntries);

document.querySelectorAll('.quick-btn').forEach(btn => {
	btn.addEventListener('click', () => quickSet(parseInt(btn.dataset.ml)));
});

glassContainer.addEventListener('pointerdown', e => {
	if (sheetDrag) return;
	glassDrag = true;
	gDragStartY = e.clientY;
	gDragRaw0 = rawAmt;
	lastSnapped = nearestSnap(rawAmt) ?? displayAmt;
	glassContainer.setPointerCapture(e.pointerId);
	e.preventDefault();
}, {
	passive: false
});

glassContainer.addEventListener('pointermove', e => {
	if (!glassDrag) return;

	const dy = gDragStartY - e.clientY;
	const deltaMl = (dy / 300) * 1000;
	rawAmt = Math.max(10, Math.min(1000, gDragRaw0 + deltaMl));

	const snap = nearestSnap(rawAmt);
	const toShow = snap ?? rawAmt;

	if (snap !== null && snap !== lastSnapped) {
		lastSnapped = snap;
		triggerSnapEffect();
	} else if (snap === null) {
		lastSnapped = null;
	}

	commitDisplay(toShow);
	e.preventDefault();
}, {
	passive: false
});

glassContainer.addEventListener('pointerup', () => {
	if (!glassDrag) return;
	glassDrag = false;
	const snap = nearestSnap(rawAmt);
	rawAmt = snap ?? Math.round(rawAmt / 10) * 10;
	commitDisplay(rawAmt);
});

glassContainer.addEventListener('pointercancel', () => {
	glassDrag = false;
});

document.getElementById('openHistoryBtn').addEventListener('click', openHistoryModal);
historyOverlay.addEventListener('click', e => {
	if (e.target === historyOverlay) closeHistoryModal();
});

historyHandleZone.addEventListener('pointerdown', e => {
	if (!historyNaturalHeight) historyNaturalHeight = historyModal.offsetHeight;
	historySheetDrag = true;
	hsDragStartY = e.clientY;
	hsDragLastY = hsDragStartY;
	hsDragDY = 0;
	hsDragVel = 0;
	historyModal.style.transition = 'none';
	historyHandleZone.setPointerCapture(e.pointerId);
	e.stopPropagation();
});

historyHandleZone.addEventListener('pointermove', e => {
	if (!historySheetDrag) return;
	const y = e.clientY;
	hsDragVel = y - hsDragLastY;
	hsDragLastY = y;
	hsDragDY = y - hsDragStartY;

	const maxH = expandedHeight();
	const shrinkRange = maxH - historyNaturalHeight;

	if (historyModalState === 'open') {
		if (hsDragDY < 0) {
			let newH = historyNaturalHeight + Math.abs(hsDragDY);
			if (newH > maxH) newH = maxH + (newH - maxH) * 0.12;
			historyModal.style.height = newH + 'px';
			historyModal.style.transform = 'translateY(0)';
		} else {
			historyModal.style.height = historyNaturalHeight + 'px';
			historyModal.style.transform = `translateY(${hsDragDY}px)`;
			const fade = Math.min(hsDragDY / 200, 1);
			historyOverlay.style.background = `rgba(0,0,0,${0.6*(1-fade)})`;
			historyOverlay.style.backdropFilter = `blur(${8*(1-fade)}px)`;
		}
	} else if (historyModalState === 'expanded') {
		if (hsDragDY > 0) {
			if (hsDragDY <= shrinkRange) {
				historyModal.style.height = (maxH - hsDragDY) + 'px';
				historyModal.style.transform = 'translateY(0)';
			} else {
				const translateY = hsDragDY - shrinkRange;
				historyModal.style.height = historyNaturalHeight + 'px';
				historyModal.style.transform = `translateY(${translateY}px)`;
				const fade = Math.min(translateY / 200, 1);
				historyOverlay.style.background = `rgba(0,0,0,${0.6*(1-fade)})`;
				historyOverlay.style.backdropFilter = `blur(${8*(1-fade)}px)`;
			}
		} else {
			historyModal.style.height = (maxH + Math.abs(hsDragDY) * 0.08) + 'px';
			historyModal.style.transform = 'translateY(0)';
		}
	}
	e.stopPropagation();
});

historyHandleZone.addEventListener('pointerup', e => {
	if (!historySheetDrag) return;
	historySheetDrag = false;

	const maxH = expandedHeight();
	const shrinkRange = maxH - historyNaturalHeight;

	if (historyModalState === 'open') {
		if (hsDragDY < -80 || hsDragVel < -0.7) {
			snapHistoryToExpanded();
		} else if (hsDragDY > 90 || hsDragVel > 0.7) {
			closeHistoryModal();
		} else {
			snapHistoryToOpen();
		}
	} else if (historyModalState === 'expanded') {
		if (hsDragDY <= 0) {
			snapHistoryToExpanded();
		} else if (hsDragDY > shrinkRange) {
			const translateY = hsDragDY - shrinkRange;
			if (translateY > 90 || hsDragVel > 0.7) {
				closeHistoryModal();
			} else {
				snapHistoryToOpen();
			}
		} else {
			if (hsDragDY > shrinkRange * 0.55 || hsDragVel > 0.5) {
				snapHistoryToOpen();
			} else {
				snapHistoryToExpanded();
			}
		}
	}
	e.stopPropagation();
});

historyHandleZone.addEventListener('pointercancel', () => {
	if (!historySheetDrag) return;
	historySheetDrag = false;
	if (historyModalState === 'expanded') snapHistoryToExpanded();
	else snapHistoryToOpen();
});

updateUI();
setInterval(updateUI, 60000);
