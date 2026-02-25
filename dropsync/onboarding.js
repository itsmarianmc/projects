(function() {
	const STORAGE_KEY = 'dropsync_onboarding_done';

	const slides = document.querySelectorAll('#onboardingSlides .onboarding-slide');
	const SLIDE_COUNT = slides.length;

	let currentSlide = 0;

	const overlay = document.getElementById('onboardingOverlay');
	const slidesEl = document.getElementById('onboardingSlides');
	const progress = document.getElementById('onboardingProgress');
	const nextBtn = document.getElementById('onboardingNext');
	const backBtn = document.getElementById('onboardingBack');
	const onboardLogin = document.getElementById('onboardingLogin');

	const allSlides = () => slidesEl.querySelectorAll('.onboarding-slide');

	function buildDots() {
		progress.innerHTML = '';
		for (let i = 0; i < SLIDE_COUNT; i++) {
			const dot = document.createElement('div');
			dot.className = 'onboarding-dot' + (i === 0 ? ' active' : '');
			progress.appendChild(dot);
		}
	}

	function updateDots() {
		progress.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
			dot.classList.toggle('active', i <= currentSlide);
		});
	}

	function replaySlideAnimations(index) {
		const slide = allSlides()[index];
		if (!slide) return;

		slide.classList.add('slide-reset');
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				slide.classList.remove('slide-reset');
			});
		});
	}

	function goToSlide(index) {
		currentSlide = Math.max(0, Math.min(SLIDE_COUNT - 1, index));
		slidesEl.style.transform = `translateX(-${currentSlide * 100}%)`;
		updateDots();
		replaySlideAnimations(currentSlide);
		backBtn.classList.toggle('btn-hidden', currentSlide === 0);

		if (currentSlide === SLIDE_COUNT - 1) {
			nextBtn.innerHTML = `Let's go!`;
		} else {
			nextBtn.innerHTML = `<svg height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M321-80 250-151l329-329-329-329 71-71 400 400L321-80Z"/></svg>`;
		}
	}

	function startTooltipTour(steps) {
		let currentStep = 0;

		function showStep(index) {
			if (index >= steps.length) return;

			const step = steps[index];
			const element = document.getElementById(step.elementId);
			if (!element) {
				console.warn(`Tooltip-Tour: Element "${step.elementId}" nicht gefunden - überspringe Schritt.`);
				showStep(index + 1);
				return;
			}

			const isLast = (index === steps.length - 1);
			const buttonText = isLast ? (step.buttonText || 'Fertig') : (step.buttonText || 'Next');

			const nextAction = () => {
				closeToolTip();
				setTimeout(() => {
					showStep(index + 1);
				}, 300);
			};

			showToolTip(step.elementId, step.message, step.progress, buttonText, nextAction);
		}

		showStep(0);
	}

	function finishOnboarding() {
		const isChecked = document.getElementById('onboardingSetupCheckbox').checked;

		localStorage.setItem(STORAGE_KEY, '1');
		overlay.classList.add('hidden');

		if (isChecked == true) {
			startTooltipTour([{
					elementId: 'openModalBtn',
					message: 'Log your beverages here to track your daily intake.',
					progress: '1/6',
					buttonText: 'Next'
				},
				{
					elementId: 'openHistoryBtn',
					message: 'Browse your history to review past entries and spot trends.',
					progress: '2/6',
					buttonText: 'Next'
				},
				{
					elementId: 'openSettingsBtn',
					message: 'Customize your daily goal and manage your account preferences.',
					progress: '3/6',
					buttonText: 'Next'
				},
				{
					elementId: 'ringContainer',
					message: 'Watch your progress fill the ring as you get closer to your goal.',
					progress: '4/6',
					buttonText: 'Next'
				},
				{
					elementId: 'statsRow',
					message: 'View your daily stats: progress, drinks, and the last time you drank something.',
					progress: '5/6',
					buttonText: 'Next'
				},
				{
					elementId: 'logSection',
					message: 'View and manage your entries for today.',
					progress: '6/6',
					buttonText: 'Got it!'
				}
			]);
		}
	}

	function startOnboarding() {
		document.documentElement.style.overflow = "hidden";

		buildDots();
		currentSlide = 0;
		slidesEl.style.transform = 'translateX(0)';

		allSlides().forEach(s => s.classList.add('slide-reset'));
		backBtn.classList.add('btn-hidden');

		overlay.classList.remove('hidden');
		goToSlide(0);
	}

	nextBtn.addEventListener('click', () => {
		if (currentSlide < SLIDE_COUNT - 1) {
			goToSlide(currentSlide + 1);
		} else {
			finishOnboarding();
		}
	});

	backBtn.addEventListener('click', () => {
		if (currentSlide > 0) goToSlide(currentSlide - 1);
	});

	onboardLogin.addEventListener('click', function() {
		localStorage.setItem(STORAGE_KEY, '1');
		document.querySelector('.onboarding-body').innerHTML = `<div style="color: var(--text); text-align: center; width: 100%;">Redirecting you to login, please wait!</div>`;
		document.querySelector('.onboarding-body').classList.add('loggin-in');
		loginWithDiscord();
	});

	document.addEventListener('DOMContentLoaded', () => {
		if (!localStorage.getItem(STORAGE_KEY)) {
			startOnboarding();
		}
	});

	window.showOnboarding = startOnboarding;

	const HIGHLIGHT_STORAGE_KEY = 'dropsync_settings_highlight_shown';

	function showSettingsHighlight() {
		if (localStorage.getItem(HIGHLIGHT_STORAGE_KEY)) {
			return;
		}

		const highlightOverlay = document.getElementById('settingsHighlight');
		const spotlight = document.getElementById('highlightSpotlight');
		const tooltip = document.getElementById('highlightTooltip');
		const closeBtn = document.getElementById('highlightCloseBtn');
		const settingsBtn = document.getElementById('openSettingsBtn');

		if (!highlightOverlay || !spotlight || !tooltip || !closeBtn || !settingsBtn) {
			return;
		}

		const btnRect = settingsBtn.getBoundingClientRect();
		spotlight.style.left = `${btnRect.left - 8}px`;
		spotlight.style.top = `${btnRect.top - 8}px`;
		spotlight.style.width = `${btnRect.width + 16}px`;
		spotlight.style.height = `${btnRect.height + 16}px`;

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let tooltipTop = btnRect.bottom + 20;
		let tooltipLeft = btnRect.left + (btnRect.width / 2);
		let arrowClass = 'arrow-top';

		if (tooltipTop + 200 > viewportHeight) {
			tooltipTop = btnRect.top - 180;
			arrowClass = 'arrow-bottom';
		}

		if (tooltipLeft + 140 > viewportWidth - 20) {
			tooltipLeft = viewportWidth - 160;
		} else if (tooltipLeft - 140 < 20) {
			tooltipLeft = 160;
		}

		tooltip.style.top = `${tooltipTop}px`;
		tooltip.style.left = `${tooltipLeft}px`;
		tooltip.style.transform = 'translateX(-50%)';
		tooltip.className = 'settings-highlight-tooltip ' + arrowClass;

		document.documentElement.style.overflow = "hidden";
		highlightOverlay.classList.add('active');

		const closeHighlight = () => {
			highlightOverlay.classList.remove('active');
			document.documentElement.style.overflow = "";
			localStorage.setItem(HIGHLIGHT_STORAGE_KEY, '1');
		};

		closeBtn.addEventListener('click', closeHighlight);
		highlightOverlay.addEventListener('click', (e) => {
			if (e.target === highlightOverlay) {
				closeHighlight();
			}
		});
	}

	window.showSettingsHighlight = showSettingsHighlight;
})();
