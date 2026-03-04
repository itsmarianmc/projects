document.addEventListener('DOMContentLoaded', function() {
	const banner = document.querySelector('.cookie-banner');
	const settingsPanel = document.getElementById('settings-panel');
	const cookieOverlay = document.getElementById('cookieOverlay');
	const acceptAllBtn = document.getElementById('accept-all');
	const changeSettingsBtn = document.getElementById('change-settings');
	const closeSettingsBtn = document.getElementById('close-settings');
	const saveSettingsBtn = document.getElementById('save-settings');

	const analyticsToggle = document.getElementById('analytics-toggle');
	const preferencesToggle = document.getElementById('preferences-toggle');
	const thirdpartyToggle = document.getElementById('thirdparty-toggle');
	const marketingToggle = document.getElementById('marketing-toggle');

	const defaultConsent = {
		'ad_storage': 'denied',
		'ad_user_data': 'denied',
		'ad_personalization': 'denied',
		'analytics_storage': 'denied',
		'functionality_storage': 'denied',
		'personalization_storage': 'denied',
		'security_storage': 'denied'
	};
	gtag('consent', 'default', defaultConsent);

	document.querySelectorAll('.toggle-switch input').forEach(toggle => {
		if (!toggle.disabled) toggle.addEventListener('change', saveCookieSettings);
	});

	changeSettingsBtn.addEventListener('click', () => {
		settingsPanel.style.display = 'block';
		cookieOverlay.style.display = 'block';
		cookieOverlay.classList.add('selector')
		document.body.style.overflow = 'hidden';
	});

	closeSettingsBtn.addEventListener('click', closeSettings);
	cookieOverlay.addEventListener('click', closeSettings);

	saveSettingsBtn.addEventListener('click', () => {
		saveCookieSettings();
		setBannerAccepted();
		closeSettings();
		cookieOverlay.style.display = 'none';
		banner.style.display = 'none';
	});

	acceptAllBtn.addEventListener('click', () => {
		analyticsToggle.checked = true;
		preferencesToggle.checked = true;
		thirdpartyToggle.checked = true;
		marketingToggle.checked = true;
		saveCookieSettings();
		setBannerAccepted();
		cookieOverlay.style.display = 'none';
		banner.style.display = 'none';
	});

	function closeSettings() {
		cookieOverlay.classList.remove('selector')
		settingsPanel.style.display = 'none';
		document.body.style.overflow = 'auto';
	}

	function saveCookieSettings() {
		const settings = {
			analytics: analyticsToggle.checked,
			preferences: preferencesToggle.checked,
			thirdparty: thirdpartyToggle.checked,
			marketing: marketingToggle.checked
		};
		localStorage.setItem('cookieSettings', JSON.stringify(settings));
		gtag('consent', 'update', {
			'analytics_storage': settings.analytics ? 'granted' : 'denied',
			'functionality_storage': settings.preferences ? 'granted' : 'denied',
			'ad_storage': settings.marketing ? 'granted' : 'denied',
			'ad_user_data': settings.marketing ? 'granted' : 'denied',
			'ad_personalization': settings.marketing ? 'granted' : 'denied',
			'personalization_storage': settings.preferences ? 'granted' : 'denied',
			'security_storage': 'granted'
		});
		if (settings.analytics) {
			gtag('config', 'G-2E9SPPVJFL', {
				'page_path': window.location.pathname
			});
		}
		
		window.dispatchEvent(new CustomEvent('cookieSettingsChanged', { detail: settings }));
		
		console.log('%cCookie Settings saved:', 'font-weight:bold;');
		console.table(settings);
	}

	function loadCookieSettings() {
		const saved = localStorage.getItem('cookieSettings');
		if (!saved) return false;
		const settings = JSON.parse(saved);
		analyticsToggle.checked = settings.analytics;
		preferencesToggle.checked = settings.preferences;
		thirdpartyToggle.checked = settings.thirdparty;
		marketingToggle.checked = settings.marketing;
		console.log('%cCookie Settings loaded:', 'font-weight:bold;');
		console.table(settings);
		return true;
	}

	function setBannerAccepted() {
		localStorage.setItem('bannerAccepted', 'true');
	}

	function checkBannerAccepted() {
		return localStorage.getItem('bannerAccepted') === 'true';
	}

	function initCookieBanner() {
		if (checkBannerAccepted()) {
			loadCookieSettings();
		    cookieOverlay.style.display = 'none';
			banner.style.display = 'none';
		} else {
			localStorage.removeItem('cookieSettings');
			analyticsToggle.checked = false;
			preferencesToggle.checked = false;
			thirdpartyToggle.checked = false;
			marketingToggle.checked = false;
			gtag('consent', 'default', defaultConsent);
			banner.style.display = 'block';
		}
	}

	initCookieBanner();
});

document.getElementById("settingsPannelOpener").addEventListener("click", () => {
	document.getElementById("settings-panel").style.display = "block";
	document.getElementById("cookieOverlay").style.display = "block";
});