(function() {
	const analyticsToggle = document.getElementById('analytics-toggle');
	const preferencesToggle = document.getElementById('preferences-toggle');
	const thirdpartyToggle = document.getElementById('thirdparty-toggle');
	const marketingToggle = document.getElementById('marketing-toggle');
	const banner = document.getElementById('cookieBanner');
	const settingsPanel = document.getElementById('settings-panel');
	const overlay = document.getElementById('overlay');

	function openSettings() {
		settingsPanel.classList.add('open');
		overlay.style.display = 'block';
		document.body.style.overflow = 'hidden';
	}

	function closeSettings() {
		settingsPanel.classList.remove('open');
		overlay.style.display = 'none';
		document.body.style.overflow = 'auto';
	}

	function saveCookieSettings() {
		const s = {
			analytics: analyticsToggle.checked,
			preferences: preferencesToggle.checked,
			thirdparty: thirdpartyToggle.checked,
			marketing: marketingToggle.checked
		};
		try {
			localStorage.setItem('cookieSettings', JSON.stringify(s));
		} catch {}
	}

	function loadCookieSettings() {
		try {
			const raw = localStorage.getItem('cookieSettings');
			if (!raw) return false;
			const s = JSON.parse(raw);
			analyticsToggle.checked = !!s.analytics;
			preferencesToggle.checked = !!s.preferences;
			thirdpartyToggle.checked = !!s.thirdparty;
			marketingToggle.checked = !!s.marketing;
			return true;
		} catch {
			return false;
		}
	}

	function setBannerAccepted() {
		try {
			localStorage.setItem('bannerAccepted', 'true');
		} catch {}
	}

	function isBannerAccepted() {
		try {
			return localStorage.getItem('bannerAccepted') === 'true';
		} catch {
			return false;
		}
	}

	function initCookieBanner() {
		if (isBannerAccepted()) {
			loadCookieSettings();
			banner.classList.add('hidden');
		} else {
			[analyticsToggle, preferencesToggle, thirdpartyToggle, marketingToggle]
			.forEach(t => t.checked = false);
			banner.classList.remove('hidden');
		}
	}

	document.getElementById('accept-all').addEventListener('click', () => {
		[analyticsToggle, preferencesToggle, thirdpartyToggle, marketingToggle]
		.forEach(t => t.checked = true);
		saveCookieSettings();
		setBannerAccepted();
		banner.classList.add('hidden');
	});

	document.getElementById('change-settings').addEventListener('click', openSettings);
	document.getElementById('close-settings').addEventListener('click', closeSettings);
	overlay.addEventListener('click', closeSettings);

	document.getElementById('save-settings').addEventListener('click', () => {
		saveCookieSettings();
		setBannerAccepted();
		closeSettings();
		banner.classList.add('hidden');
	});

	const opener = document.getElementById('settingsPannelOpener');
	if (opener) opener.addEventListener('click', openSettings);

	initCookieBanner();
})();
