const splashScreen = document.getElementById('splashScreen');
let goalMl = parseInt(localStorage.getItem('dropsync_goal') || '2500');
let isSplashVisible = false;
let LOG_TIMEOUT = 1387;

function getGoal() {
	return goalMl;
}

function setGoal(ml) {
	goalMl = ml;
	GOAL = ml;
	localStorage.setItem('dropsync_goal', ml);

	function applyTheme(theme) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('dropsync_theme', theme);
		document.querySelectorAll('.theme-option').forEach(opt => {
			opt.classList.toggle('active', opt.dataset.theme === theme);
		});
	}

	(function() {
		const saved = localStorage.getItem('dropsync_theme') || 'dark';
		applyTheme(saved);
	})();

	updateGoalDisplay();
	updateUI();
	pushGoalToCloud(ml);
}

function updateGoalDisplay() {
	const fmt = goalMl >= 1000 ?
		(goalMl / 1000).toFixed(1).replace('.', ',') + 'L' :
		goalMl + 'ml';
	const goalDisplay = document.getElementById('currentGoalDisplay');
	if (goalDisplay) goalDisplay.textContent = fmt;
	const ringGoal = document.querySelector('.ring-goal');
	if (ringGoal) ringGoal.textContent = 'Goal: ' + fmt;
}

let settingsModalState = 'closed';
let settingsNaturalHeight = 0;
let settingsSheetDrag = false;
let ssDragStartY = 0,
	ssDragLastY = 0,
	ssDragDY = 0,
	ssDragVel = 0;

const settingsModal = document.getElementById('settingsModal');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsHandleZone = document.getElementById('settingsHandleZone');

function openSettingsModal() {
	removeHeaderBtn('openSettingsBtn');

	settingsModalState = 'open';

	function applyTheme(theme) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('dropsync_theme', theme);
		document.querySelectorAll('.theme-option').forEach(opt => {
			opt.classList.toggle('active', opt.dataset.theme === theme);
		});
	}

	(function() {
		const saved = localStorage.getItem('dropsync_theme') || 'dark';
		applyTheme(saved);
	})();

	updateGoalDisplay();

	settingsModal.style.transition = 'none';
	settingsModal.style.height = 'auto';
	settingsModal.style.transform = 'translateY(100%)';

	settingsOverlay.classList.add('visible');
	document.body.classList.add('modal-open');

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			settingsNaturalHeight = settingsModal.offsetHeight;
			settingsModal.style.transition = 'transform 0.42s cubic-bezier(0.34, 1.15, 0.64, 1)';
			settingsModal.style.transform = 'translateY(18px)';
		});
	});
}

function closeSettingsModal() {
	addHeaderBtn('openSettingsBtn');

	settingsModalState = 'closed';
	const curH = settingsModal.offsetHeight;
	settingsModal.style.transition = 'none';
	settingsModal.style.height = curH + 'px';

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			settingsModal.style.transition = 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)';
			settingsModal.style.transform = 'translateY(110%)';
			document.body.classList.remove('modal-open');
		});
	});

	settingsOverlay.style.backdropFilter = '';
	settingsOverlay.classList.remove('visible');

	setTimeout(() => {
		settingsModal.style.transform = '';
		settingsModal.style.height = '';
		settingsModal.style.transition = '';
		settingsNaturalHeight = 0;
		settingsOverlay.style.background = '';
	}, 400);
}

const calcFields = {
	gender: 'female',
	activity: 'low',
	season: 'cool'
};

function setupOptionControl(id, fieldKey) {
	document.getElementById(id).querySelectorAll('.option-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			document.getElementById(id).querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			calcFields[fieldKey] = btn.dataset.val;
			runCalculator();
		});
	});
}

function runCalculator() {
	const w = parseFloat(document.getElementById('calcWeight').value);
	const resultRow = document.getElementById('calcResultRow');
	if (!w || w <= 0) {
		resultRow.style.display = 'none';
		return;
	}

	let base = w * 24.33333333333333;
	if (calcFields.gender === 'male') base += 150;
	if (calcFields.gender === 'pregnant') base += 300;
	if (calcFields.gender === 'breastfeeding') base += 700;
	if (calcFields.gender === 'nospecification') base += 80;
	if (calcFields.activity === 'medium') base += 300;
	if (calcFields.activity === 'high') base += 700;
	if (calcFields.season === 'mild') base += 200;
	if (calcFields.season === 'warm') base += 450;
	if (calcFields.season === 'hot') base += 650;

	const result = Math.round(base);
	document.getElementById('calcResultVal').textContent = result + ' ml';
	document.getElementById('applyGoalBtn').dataset.ml = result;
	resultRow.style.display = 'block';
}

function downloadFile(filename, content, type) {
	const blob = new Blob([content], {
		type
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function getGreeting() {
	const h = new Date().getHours();
	if (h < 5) return 'Good night';
	if (h < 12) return 'Good morning';
	if (h < 18) return 'Good afternoon';
	return 'Good evening';
}

function applyDisplayName(enabled) {
	const titleEl = document.querySelector('.header-title');
	if (!titleEl) return;
	if (enabled) {
		const name = localStorage.getItem('dropsync_first_name') || '';
		const greeting = name ?
			`Hi, <span>${name}!</span>` :
			`${getGreeting()}<span>!</span>`;
		titleEl.innerHTML = greeting;
	} else {
		titleEl.innerHTML = `Drop<span>Sync</span>`;
	}
}

async function showSplashScreen() {
	if (isSplashVisible) return;

	isSplashVisible = true;
	splashScreen.classList.remove('SplashHidden');
	splashScreen.classList.remove('hidden');

	setTimeout(() => {
		splashScreen.classList.add('SplashHidden');
		setTimeout(() => {
			splashScreen.classList.add('hidden');
		}, 300);
		isSplashVisible = false;
	}, LOG_TIMEOUT);
}

document.getElementById('openSettingsBtn').addEventListener('click', openSettingsModal);

settingsOverlay.addEventListener('click', e => {
	if (e.target === settingsOverlay) closeSettingsModal();
});

settingsHandleZone.addEventListener('pointerdown', e => {
	if (!settingsNaturalHeight) settingsNaturalHeight = settingsModal.offsetHeight;
	settingsSheetDrag = true;
	ssDragStartY = e.clientY;
	ssDragLastY = ssDragStartY;
	ssDragDY = 0;
	ssDragVel = 0;
	settingsModal.style.transition = 'none';
	settingsHandleZone.setPointerCapture(e.pointerId);
	e.stopPropagation();
});

settingsHandleZone.addEventListener('pointermove', e => {
	if (!settingsSheetDrag) return;
	const y = e.clientY;
	ssDragVel = y - ssDragLastY;
	ssDragLastY = y;
	ssDragDY = y - ssDragStartY;

	if (ssDragDY > 0) {
		settingsModal.style.height = settingsNaturalHeight + 'px';
		settingsModal.style.transform = `translateY(${ssDragDY}px)`;
		const fade = Math.min(ssDragDY / 200, 1);
		settingsOverlay.style.background = `rgba(0,0,0,${0.6 * (1 - fade)})`;
		settingsOverlay.style.backdropFilter = `blur(${8 * (1 - fade)}px)`;
	}
	e.stopPropagation();
});

settingsHandleZone.addEventListener('pointerup', e => {
	if (!settingsSheetDrag) return;
	settingsSheetDrag = false;
	if (ssDragDY > 90 || ssDragVel > 0.7) {
		closeSettingsModal();
	} else {
		settingsModal.style.transition = 'transform 0.36s cubic-bezier(0.34, 1.15, 0.64, 1)';
		settingsModal.style.transform = 'translateY(0)';
		settingsOverlay.style.background = '';
		settingsOverlay.style.backdropFilter = '';
	}
	e.stopPropagation();
});

setupOptionControl('calcGender', 'gender');
setupOptionControl('calcActivity', 'activity');
setupOptionControl('calcSeason', 'season');

document.getElementById('calcWeight').addEventListener('input', runCalculator);

document.getElementById('applyGoalBtn').addEventListener('click', () => {
	const ml = parseInt(document.getElementById('applyGoalBtn').dataset.ml);
	if (ml) {
		setGoal(ml);
		showToast('🎯 Goal set to ' + ml + ' ml!');
	}
});

document.getElementById('manualGoalBtn').addEventListener('click', () => {
	const val = parseInt(document.getElementById('manualGoalInput').value);
	if (!val || val < 500 || val > 6000) {
		showToast('Please enter a value between 500 and 6000 ml.');
		return;
	}
	setGoal(val);
	document.getElementById('manualGoalInput').value = '';
	showToast('🎯 Goal set to ' + val + ' ml!');
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
	const data = JSON.stringify(entries, null, 2);
	downloadFile('dropsync_export.json', data, 'application/json');
	showToast('📤 JSON exported');
});

document.getElementById('exportCsvBtn').addEventListener('click', () => {
	const header = 'id,drink,emoji,amount,date,time';
	const rows = entries.map(e => {
		const d = new Date(e.ts);
		const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
		return [e.id, e.drink, e.emoji, e.amount, e.date, time].join(',');
	});
	downloadFile('dropsync_export.csv', [header, ...rows].join('\n'), 'text/csv');
	showToast('📊 CSV exported');
});

document.getElementById('clearDataBtn').addEventListener('click', async () => {
	if (!confirm('Delete all data? This cannot be undone.')) return;

	if (syncEnabled && currentUser) {
		await _supabase
			.from('entries')
			.delete()
			.eq('user_id', currentUser.id);
	}

	entries = [];
	localStorage.removeItem('dropsync_v3');
	updateUI();
	showToast('🗑 All data deleted');
	closeSettingsModal();
});

(function() {
	const toggle = document.getElementById('deleteWarningToggle');
	const key = 'dropsync_delete_warning';

	const enabled = localStorage.getItem(key) !== 'false';
	toggle.setAttribute('aria-pressed', String(enabled));

	toggle.addEventListener('click', () => {
		const current = toggle.getAttribute('aria-pressed') === 'true';
		const next = !current;
		toggle.setAttribute('aria-pressed', String(next));
		localStorage.setItem(key, String(next));
	});
})();

(function() {
	const toggle = document.getElementById('displayNameOnStart');
	const input = document.getElementById('firstName');
	const setBtn = document.getElementById('setFirstNameBtn');
	const toggleKey = 'dropsync_display_name';
	const nameKey = 'dropsync_first_name';

	const savedName = localStorage.getItem(nameKey) || '';
	if (input) input.value = savedName;

	const enabled = localStorage.getItem(toggleKey) === 'true';
	toggle.setAttribute('aria-pressed', String(enabled));
	applyDisplayName(enabled);

	setBtn.addEventListener('click', () => {
		const name = input.value.trim();
		localStorage.setItem(nameKey, name);
		const isEnabled = toggle.getAttribute('aria-pressed') === 'true';
		applyDisplayName(isEnabled);
		showToast(name ? `👋 Name set to "${name}"` : '👋 Name cleared');
	});

	input.addEventListener('keydown', e => {
		if (e.key === 'Enter') setBtn.click();
	});

	toggle.addEventListener('click', () => {
		const next = toggle.getAttribute('aria-pressed') !== 'true';
		toggle.setAttribute('aria-pressed', String(next));
		localStorage.setItem(toggleKey, String(next));
		applyDisplayName(next);
	});
})();

(function() {
	const toggle = document.getElementById('splashScreenOnReturn');
	const key = 'dropsync_splash_on_return';

	const enabled = localStorage.getItem(key) === 'true';
	toggle.setAttribute('aria-pressed', String(enabled));

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			if (localStorage.getItem(key) === 'true') {
				showSplashScreen();
			}
		}
	});

	toggle.addEventListener('click', () => {
		const next = toggle.getAttribute('aria-pressed') !== 'true';
		toggle.setAttribute('aria-pressed', String(next));
		localStorage.setItem(key, String(next));
	});
})();

function applyTheme(theme) {
	document.documentElement.setAttribute('data-theme', theme);
	localStorage.setItem('dropsync_theme', theme);
	document.querySelectorAll('.theme-option').forEach(opt => {
		opt.classList.toggle('active', opt.dataset.theme === theme);
	});
}

(function() {
	const saved = localStorage.getItem('dropsync_theme') || 'dark';
	applyTheme(saved);
})();

updateGoalDisplay();
