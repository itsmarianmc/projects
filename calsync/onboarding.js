(function() {
	const STORAGE_KEY = 'calsync_onboarding_done';
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
		requestAnimationFrame(() => { requestAnimationFrame(() => { slide.classList.remove('slide-reset'); }); });
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
			if (!element) { showStep(index + 1); return; }
			const isLast = (index === steps.length - 1);
			const buttonText = isLast ? (step.buttonText || 'Done') : (step.buttonText || 'Next');
			const nextAction = () => { closeToolTip(); setTimeout(() => { showStep(index + 1); }, 300); };
			showToolTip(step.elementId, step.message, step.progress, buttonText, nextAction);
		}
		showStep(0);
	}

	function finishOnboarding() {
		const isChecked = document.getElementById('onboardingSetupCheckbox').checked;
		localStorage.setItem(STORAGE_KEY, '1');
		overlay.classList.add('hidden');
		document.documentElement.style.overflow = '';
		if (isChecked) {
			startTooltipTour([
				{ elementId: 'openModalBtn', message: 'Log food here. Search by name or enter a barcode number.', progress: '1/5', buttonText: 'Next' },
				{ elementId: 'openHistoryBtn', message: 'Browse your full food log history and daily calorie totals.', progress: '2/5', buttonText: 'Next' },
				{ elementId: 'openSettingsBtn', message: 'Set your daily calorie goal and customize the app here.', progress: '3/5', buttonText: 'Next' },
				{ elementId: 'ringContainer', message: 'Watch the ring fill as you get closer to your daily calorie goal.', progress: '4/5', buttonText: 'Next' },
				{ elementId: 'logSection', message: 'Your logged food for today appears here. Tap <i class="fa-solid fa-xmark"></i> to delete an entry.', progress: '5/5', buttonText: 'Got it!' }
			]);
		}
	}

	function startOnboarding() {
		document.documentElement.style.overflow = 'hidden';
		buildDots();
		currentSlide = 0;
		slidesEl.style.transform = 'translateX(0)';
		allSlides().forEach(s => s.classList.add('slide-reset'));
		backBtn.classList.add('btn-hidden');
		overlay.classList.remove('hidden');
		goToSlide(0);
	}

	nextBtn.addEventListener('click', () => {
		if (currentSlide < SLIDE_COUNT - 1) goToSlide(currentSlide + 1);
		else finishOnboarding();
	});

	backBtn.addEventListener('click', () => {
		if (currentSlide > 0) goToSlide(currentSlide - 1);
	});

	onboardLogin.addEventListener('click', function() {
		localStorage.setItem(STORAGE_KEY, '1');
		document.querySelector('.onboarding-body').innerHTML = `<div style="color:var(--text);text-align:center;width:100%;">Redirecting you to login, please wait!</div>`;
		document.querySelector('.onboarding-body').classList.add('loggin-in');
		loginWithDiscord();
	});

	document.addEventListener('DOMContentLoaded', () => {
		if (!localStorage.getItem(STORAGE_KEY)) startOnboarding();
		['manualKcal', 'manualProtein', 'manualCarbs', 'manualFat'].forEach(id => {
			el(id).addEventListener('input', updateCaloriePreview);
		});
	});

	window.showOnboarding = startOnboarding;
})();