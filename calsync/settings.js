const splashScreen = document.getElementById('splashScreen');
let goalKcal = parseInt(localStorage.getItem('calsync_goal') || '2000');
let isSplashVisible = false;
let LOG_TIMEOUT = 1387;

let settingsModalState = 'closed';
let settingsNaturalHeight = 0;
let settingsSheetDrag = false;
let ssDragStartY = 0, ssDragLastY = 0, ssDragDY = 0, ssDragVel = 0;

const settingsModal = document.getElementById('settingsModal');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsHandleZone = document.getElementById('settingsHandleZone');

const calcFields = { gender: 'female', activity: 'sedentary', goalType: 'maintain' };

function setGoal(kcal) {
	goalKcal = kcal;
	GOAL = kcal;
	localStorage.setItem('calsync_goal', kcal);
	updateGoalDisplay();
	updateUI();
	pushGoalToCloud(kcal);
}

function updateGoalDisplay() {
	const fmt = goalKcal + ' kcal';
	const goalDisplay = document.getElementById('currentGoalDisplay');
	if (goalDisplay) goalDisplay.textContent = fmt;
	const ringGoal = document.querySelector('.ring-goal');
	if (ringGoal) ringGoal.textContent = 'Goal: ' + fmt;
	const ringGoalLabel = document.getElementById('ringGoalLabel');
	if (ringGoalLabel) ringGoalLabel.textContent = 'Goal: ' + goalKcal + ' kcal';
}

function openSettingsModal() {
	removeHeaderBtn('openSettingsBtn');
	settingsModalState = 'open';
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

function setupOptionControl(id, fieldKey) {
	const container = document.getElementById(id);
	if (!container) return;
	container.querySelectorAll('.option-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			calcFields[fieldKey] = btn.dataset.val;
			runCalculator();
		});
	});
}

function runCalculator() {
	const w = parseFloat(document.getElementById('calcWeight').value);
	const h = parseFloat(document.getElementById('calcHeight').value);
	const a = parseFloat(document.getElementById('calcAge').value);
	const resultRow = document.getElementById('calcResultRow');
	if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) {
		resultRow.style.display = 'none';
		return;
	}

	let bmr;
	if (calcFields.gender === 'male') {
		bmr = 10 * w + 6.25 * h - 5 * a + 5;
	} else {
		bmr = 10 * w + 6.25 * h - 5 * a - 161;
	}

	const activityFactors = {
		sedentary: 1.2,
		light: 1.375,
		moderate: 1.55,
		active: 1.725,
		very_active: 1.9
	};
	let tdee = bmr * (activityFactors[calcFields.activity] || 1.2);

	if (calcFields.goalType === 'lose') tdee -= 500;
	else if (calcFields.goalType === 'gain') tdee += 500;

	const result = Math.round(tdee);
	document.getElementById('calcResultVal').textContent = result + ' kcal';
	document.getElementById('applyGoalBtn').dataset.kcal = result;
	resultRow.style.display = 'block';
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
		const name = localStorage.getItem('calsync_first_name') || '';
		const greeting = name ? `Hi, <span>${name}!</span>` : `${getGreeting()}<span>!</span>`;
		titleEl.innerHTML = greeting;
	} else {
		titleEl.innerHTML = `Cal<span>Sync</span>`;
	}
}

function applyTheme(theme) {
	document.documentElement.setAttribute('data-theme', theme);
	localStorage.setItem('calsync_theme', theme);
	document.querySelectorAll('.theme-option').forEach(opt => {
		opt.classList.toggle('active', opt.dataset.theme === theme);
	});
}

async function showSplashScreen() {
	if (isSplashVisible) return;
	isSplashVisible = true;
	splashScreen.classList.remove('SplashHidden');
	splashScreen.classList.remove('hidden');
	setTimeout(() => {
		splashScreen.classList.add('SplashHidden');
		setTimeout(() => { splashScreen.classList.add('hidden'); }, 300);
		isSplashVisible = false;
	}, LOG_TIMEOUT);
}

document.getElementById('openSettingsBtn').addEventListener('click', openSettingsModal);

settingsOverlay.addEventListener('click', e => {
	if (e.target === settingsOverlay) closeSettingsModal();
});

settingsHandleZone.addEventListener('pointerdown', e => {
	if (!settingsNaturalHeight) settingsNaturalHeight = settingsModal.offsetHeight;
	settingsSheetDrag = true; ssDragStartY = e.clientY; ssDragLastY = ssDragStartY; ssDragDY = 0; ssDragVel = 0;
	settingsModal.style.transition = 'none';
	settingsHandleZone.setPointerCapture(e.pointerId);
	e.stopPropagation();
});

settingsHandleZone.addEventListener('pointermove', e => {
	if (!settingsSheetDrag) return;
	const y = e.clientY; ssDragVel = y - ssDragLastY; ssDragLastY = y; ssDragDY = y - ssDragStartY;
	if (ssDragDY > 0) {
		settingsModal.style.height = settingsNaturalHeight + 'px';
		settingsModal.style.transform = `translateY(${ssDragDY}px)`;
		const fade = Math.min(ssDragDY / 200, 1);
		settingsOverlay.style.background = `rgba(0,0,0,${0.6*(1-fade)})`;
		settingsOverlay.style.backdropFilter = `blur(${8*(1-fade)}px)`;
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

document.getElementById('applyGoalBtn').addEventListener('click', () => {
	const kcal = parseInt(document.getElementById('applyGoalBtn').dataset.kcal);
	if (kcal) { setGoal(kcal); showToast('🎯 Goal set to ' + kcal + ' kcal!'); }
});

document.getElementById('manualGoalBtn').addEventListener('click', () => {
	const val = parseInt(document.getElementById('manualGoalInput').value);
	if (!val || val < 500 || val > 10000) { showToast('Please enter a value between 500 and 10000 kcal.'); return; }
	setGoal(val);
	document.getElementById('manualGoalInput').value = '';
	showToast('🎯 Goal set to ' + val + ' kcal!');
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
	const data = JSON.stringify(entries, null, 2);
	downloadFile('calsync_export.json', data, 'application/json');
	showToast('📤 JSON exported');
});

document.getElementById('exportCsvBtn').addEventListener('click', () => {
	const header = 'id,food,brand,kcal,amount,unit,prot,carb,fat,date,time';
	const rows = entries.map(e => {
		const d = new Date(e.ts);
		const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
		return [e.id, `"${e.food}"`, `"${e.brand||''}"`, e.kcal, e.amount, e.unit||'g', e.prot||0, e.carb||0, e.fat||0, e.date, time].join(',');
	});
	downloadFile('calsync_export.csv', [header, ...rows].join('\n'), 'text/csv');
	showToast('📊 CSV exported');
});

document.getElementById('clearDataBtn').addEventListener('click', async () => {
	if (!confirm('Delete ALL CalSync data? This will not affect DropSync entries.')) return;

	if (syncEnabled && currentUser) {
		await _supabase.from('calsync_entries').delete().eq('user_id', currentUser.id);
	}

	entries = entries.filter(e => e.isFromDropSync);
	localStorage.setItem('calsync_v1', JSON.stringify(entries));
	updateUI();
	showToast('🗑 CalSync data deleted');
	closeSettingsModal();
});

setupOptionControl('calcGender', 'gender');
setupOptionControl('calcActivity', 'activity');
setupOptionControl('calcGoalType', 'goalType');

['calcWeight', 'calcHeight', 'calcAge'].forEach(id => {
	const el = document.getElementById(id);
	if (el) el.addEventListener('input', runCalculator);
});

(function() {
	const toggle = document.getElementById('deleteWarningToggle');
	const key = 'dropsync_delete_warning';
	const enabled = localStorage.getItem(key) !== 'false';
	toggle.setAttribute('aria-pressed', String(enabled));
	toggle.addEventListener('click', () => {
		const current = toggle.getAttribute('aria-pressed') === 'true';
		toggle.setAttribute('aria-pressed', String(!current));
		localStorage.setItem(key, String(!current));
	});
})();

(function() {
	const toggle = document.getElementById('displayNameOnStart');
	const input = document.getElementById('firstName');
	const setBtn = document.getElementById('setFirstNameBtn');
	const toggleKey = 'calsync_display_name';
	const nameKey = 'calsync_first_name';
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
	input.addEventListener('keydown', e => { if (e.key === 'Enter') setBtn.click(); });
	toggle.addEventListener('click', () => {
		const next = toggle.getAttribute('aria-pressed') !== 'true';
		toggle.setAttribute('aria-pressed', String(next));
		localStorage.setItem(toggleKey, String(next));
		applyDisplayName(next);
	});
})();

document.addEventListener("DOMContentLoaded", function() {
	const toggle = document.getElementById('splashScreenOnReturn');
	const key = 'calsync_splash_on_return';
	const enabled = localStorage.getItem(key) === 'true';
	toggle.setAttribute('aria-pressed', String(enabled));
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && localStorage.getItem(key) === 'true') showSplashScreen();
	});
	if (document.visibilityState === 'visible' && localStorage.getItem(key) === 'true') showSplashScreen();
	toggle.addEventListener('click', () => {
		const next = toggle.getAttribute('aria-pressed') !== 'true';
		toggle.setAttribute('aria-pressed', String(next));
		localStorage.setItem(key, String(next));
	});
});

(function() {
	const saved = localStorage.getItem('calsync_theme') || 'dark';
	applyTheme(saved);
})();

(function() {
	const AI_ENABLED_KEY = 'calsync_ai_enabled';
	const AI_TERMS_KEY = 'calsync_ai_terms_accepted';
	const AI_API_KEY = 'calsync_ai_api_key';
	
	const aiToggle = document.getElementById('aiEnabledToggle');
	const aiSettings = document.getElementById('aiSettings');
	const aiDetection = document.getElementById('aiDetection');
	const aiTermsBox = document.getElementById('aiTermsBox');
	const aiApiKeySection = document.getElementById('aiApiKeySection');
	const aiTermsAccept = document.getElementById('aiTermsAccept');
	const aiTermsDecline = document.getElementById('aiTermsDecline');
	const aiApiKeyInput = document.getElementById('aiApiKeyInput');
	const apiKeyToggle = document.getElementById('apiKeyToggle');
	const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
	const aiStatusBox = document.getElementById('aiStatusBox');
	
	function checkThirdPartyCookiesEnabled() {
		const cookieSettings = localStorage.getItem('cookieSettings');
		if (!cookieSettings) return false;
		
		try {
			const settings = JSON.parse(cookieSettings);
			return settings.thirdparty === true;
		} catch (e) {
			return false;
		}
	}
	
	function loadAIState() {
		const enabled = localStorage.getItem(AI_ENABLED_KEY) === 'true';
		const termsAccepted = localStorage.getItem(AI_TERMS_KEY) === 'true';
		const apiKey = localStorage.getItem(AI_API_KEY) || '';
		const thirdPartyCookiesEnabled = checkThirdPartyCookiesEnabled();
		
		if (!thirdPartyCookiesEnabled) {
			aiToggle.disabled = true;
			el('aiInfoBox').innerHTML = `<i class="fa-solid fa-circle-info"></i><p>Third-Party Content is disabled. To enable AI scanning, turn on "Third-Party Content" in the Cookie Settings!</p>`
			aiToggle.style.opacity = '0.5';
			aiToggle.style.cursor = 'not-allowed';
			aiToggle.setAttribute('aria-pressed', 'false');
			aiToggle.setAttribute('title', 'Please enable Third-Party Content cookies in cookie settings');
			aiSettings.style.display = 'none';
			updateMethodButtonState();
			return;
		} else {
			el('aiInfoBox').innerHTML = `<i class="fa-solid fa-circle-info"></i><p>AI Detection uses Google's Gemini API to analyze food images and estimate nutrition values. This feature is experimental and requires your own API key.</p>`
			aiToggle.disabled = false;
			aiToggle.style.opacity = '1';
			aiToggle.style.cursor = 'pointer';
			aiToggle.removeAttribute('title');
		}
		
		aiToggle.setAttribute('aria-pressed', String(enabled));
		
		if (enabled) {
			aiSettings.style.display = 'block';
			
			if (termsAccepted) {
				aiTermsBox.style.display = 'none';
				aiDetection.classList.remove('showTerms');
				aiApiKeySection.style.display = 'block';
				aiApiKeyInput.value = apiKey;
				
				if (apiKey) {
					aiStatusBox.style.display = 'flex';
				}
			} else {
				aiTermsBox.style.display = 'block';
				aiDetection.classList.add('showTerms');
				aiApiKeySection.style.display = 'none';
			}
		} else {
			aiSettings.style.display = 'none';
		}
		
		updateMethodButtonState();
	}
	
	window.addEventListener('storage', (e) => {
		if (e.key === 'cookieSettings') {
			loadAIState();
		}
	});
	
	window.addEventListener('cookieSettingsChanged', () => {
		loadAIState();
	});
	
	aiToggle.addEventListener('click', () => {
		if (!checkThirdPartyCookiesEnabled()) {
			showToast('⚠️ Please enable Third-Party Content cookies first');
			return;
		}
		
		const enabled = aiToggle.getAttribute('aria-pressed') === 'true';
		const newState = !enabled;
		
		aiToggle.setAttribute('aria-pressed', String(newState));
		localStorage.setItem(AI_ENABLED_KEY, String(newState));
		
		if (newState) {
			aiSettings.style.display = 'block';
			const termsAccepted = localStorage.getItem(AI_TERMS_KEY) === 'true';
			
			if (termsAccepted) {
				aiTermsBox.style.display = 'none';
				aiDetection.classList.remove('showTerms');
				aiApiKeySection.style.display = 'block';
			} else {
				aiTermsBox.style.display = 'block';
				aiDetection.classList.add('showTerms');
				aiApiKeySection.style.display = 'none';
			}
		} else {
			aiSettings.style.display = 'none';
		}
		
		updateMethodButtonState();
	});
	
	aiTermsAccept.addEventListener('click', () => {
		localStorage.setItem(AI_TERMS_KEY, 'true');
		aiDetection.classList.remove('showTerms');
		aiTermsBox.style.display = 'none';
		aiApiKeySection.style.display = 'block';
		showToast('✓ Terms accepted');
	});
	
	aiTermsDecline.addEventListener('click', () => {
		aiToggle.setAttribute('aria-pressed', 'false');
		aiDetection.classList.remove('showTerms');
		localStorage.setItem(AI_ENABLED_KEY, 'false');
		aiSettings.style.display = 'none';
		updateMethodButtonState();
		showToast('AI Detection disabled');
	});
	
	apiKeyToggle.addEventListener('click', () => {
		const input = aiApiKeyInput;
		const icon = apiKeyToggle.querySelector('i');
		
		if (input.type === 'password') {
			input.type = 'text';
			icon.classList.remove('fa-eye');
			icon.classList.add('fa-eye-slash');
		} else {
			input.type = 'password';
			icon.classList.remove('fa-eye-slash');
			icon.classList.add('fa-eye');
		}
	});
	
	saveApiKeyBtn.addEventListener('click', () => {
		const apiKey = aiApiKeyInput.value.trim();
		
		if (!apiKey) {
			showToast('❌ Please enter an API key');
			return;
		}
		
		if (!apiKey.startsWith('AIza')) {
			showToast('⚠️ Invalid API key format');
			return;
		}
		
		localStorage.setItem(AI_API_KEY, apiKey);
		aiStatusBox.style.display = 'flex';
		showToast('✓ API key saved successfully');
		updateMethodButtonState();
	});
	
	loadAIState();
})();

function isAIReady() {
	const enabled = localStorage.getItem('calsync_ai_enabled') === 'true';
	const termsAccepted = localStorage.getItem('calsync_ai_terms_accepted') === 'true';
	const apiKey = localStorage.getItem('calsync_ai_api_key') || '';
	
	const cookieSettings = localStorage.getItem('cookieSettings');
	let thirdPartyCookiesEnabled = false;
	if (cookieSettings) {
		try {
			const settings = JSON.parse(cookieSettings);
			thirdPartyCookiesEnabled = settings.thirdparty === true;
		} catch (e) {
			thirdPartyCookiesEnabled = false;
		}
	}
	
	return enabled && termsAccepted && apiKey.length > 0 && thirdPartyCookiesEnabled;
}

window.isAIReady = isAIReady;

updateGoalDisplay();

(function() {
	const MACRO_KEYS = { protein: 'calsync_goal_protein', carbs: 'calsync_goal_carbs', fat: 'calsync_goal_fat' };
	function loadMacroGoals() {
		Object.entries(MACRO_KEYS).forEach(([macro, key]) => {
			const inp = document.getElementById('macroGoalInput_' + macro);
			if (inp) inp.value = localStorage.getItem(key) || '';
		});
		if (typeof updateUI === 'function') updateUI();
	}
	function saveMacroGoal(macro) {
		const inp = document.getElementById('macroGoalInput_' + macro);
		if (!inp) return;
		const val = parseInt(inp.value) || 0;
		if (val < 0 || val > 2000) { showToast('Enter a value between 0 and 2000g'); return; }
		localStorage.setItem(MACRO_KEYS[macro], String(val));
		if (typeof updateUI === 'function') updateUI();
		showToast(val ? `🎯 ${macro.charAt(0).toUpperCase() + macro.slice(1)} goal: ${val}g` : `${macro.charAt(0).toUpperCase() + macro.slice(1)} goal cleared`);
	}
	['protein', 'carbs', 'fat'].forEach(macro => {
		const btn = document.getElementById('macroGoalBtn_' + macro);
		const inp = document.getElementById('macroGoalInput_' + macro);
		if (btn) btn.addEventListener('click', () => saveMacroGoal(macro));
		if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveMacroGoal(macro); });
	});
	document.addEventListener('DOMContentLoaded', loadMacroGoals);
	loadMacroGoals();
})();