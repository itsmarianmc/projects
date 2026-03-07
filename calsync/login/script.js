const SUPABASE_URL = 'https://stuqtqlkantewwxhwitg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nNq-PUIq-C-q5OREGoEquA_XmLrOr-r';
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _pendingMFAFactorId = null;
let _pendingMFAChallengeId = null;
let _enrolledFactorId = null;
let _totpSecretKey = null;

function showAlert(id, msg, type = 'error') {
	const el = document.getElementById(id);
	el.textContent = msg;
	el.className = `alert ${type} show`;
}

function hideAlert(id) {
	const el = document.getElementById(id);
	if (el) el.className = 'alert';
}

function setLoading(btnId, state) {
	const btn = document.getElementById(btnId);
	if (!btn) return;
	btn.disabled = state;
	btn.classList.toggle('loading', state);
}

function showView(id) {
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById(id)?.classList.add('active');
	const showTabs = (id === 'viewLogin' || id === 'viewRegister');
	document.getElementById('authSection').querySelectorAll('.tabs, .view')
		.forEach(el => el.style.display = '');
	if (!['viewLogin', 'viewRegister'].includes(id)) {
		document.getElementById('authSection').style.display = 'none';
	} else {
		document.getElementById('authSection').style.display = '';
	}
}

function showAuth() {
	document.getElementById('authSection').style.display = '';
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById('viewLogin').classList.add('active');
	document.getElementById('tabLogin').classList.add('active');
	document.getElementById('tabRegister').classList.remove('active');
}

function switchTab(tab) {
	document.getElementById('authSection').style.display = '';
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById(tab === 'login' ? 'viewLogin' : 'viewRegister').classList.add('active');
	document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
	document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
	hideAlert('loginAlert');
	hideAlert('registerAlert');
	['regName', 'regEmail'].forEach(id => {
		const el = document.getElementById(id);
		if (el) el.classList.remove('field-error', 'field-ok');
	});
	['nameMsg', 'emailMsg'].forEach(id => setFieldMsg && setFieldMsg(id, '', ''));
}

function showReset() {
	document.getElementById('authSection').style.display = 'none';
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById('viewReset').classList.add('active');
	document.getElementById('mainFooter').style.display = 'none';
}

function goToApp() {
	window.location.href = './index.html';
}

function togglePw(inputId, btn) {
	const input = document.getElementById(inputId);
	if (input.type === 'password') {
		input.type = 'text';
		btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
	} else {
		input.type = 'password';
		btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
	}
}

function checkPasswordStrength(pw) {
	const bars = [document.getElementById('bar1'), document.getElementById('bar2'),
		document.getElementById('bar3'), document.getElementById('bar4')
	];
	bars.forEach(b => b.className = 'pw-bar');

	const rules = document.getElementById('pwRules');
	rules.classList.toggle('show', pw.length > 0);

	const hasLen = pw.length >= 8;
	const hasUpper = /[A-Z]/.test(pw);
	const hasNum = /[0-9]/.test(pw);
	const hasSpec = /[^A-Za-z0-9]/.test(pw);

	setRule('rule-len', hasLen);
	setRule('rule-upper', hasUpper);
	setRule('rule-num', hasNum);

	let score = 0;
	if (hasLen) score++;
	if (hasUpper) score++;
	if (hasNum) score++;
	if (hasSpec) score++;

	const cls = score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';
	for (let i = 0; i < score; i++) bars[i].classList.add(cls);
}

function setRule(id, ok) {
	const el = document.getElementById(id);
	el.classList.toggle('ok', ok);
	el.querySelector('svg').innerHTML = ok ?
		'<polyline points="20 6 9 17 4 12" stroke-width="2.5"/>' :
		'<circle cx="12" cy="12" r="10"/>';
}

function otpInput(el, idx, mode) {
	const wrap = document.getElementById(mode === 'setup' ? 'otpSetupWrap' : 'otpWrap');
	const inputs = wrap.querySelectorAll('input');
	el.value = el.value.toString().slice(-1);
	if (el.value && idx < 5) inputs[idx + 1].focus();
	if (mode !== 'setup') {
		const code = getOTP('otpWrap');
		if (code.length === 6) doMFAVerify();
	} else {
		const code = getOTP('otpSetupWrap');
		if (code.length === 6) doSetup2FA();
	}
}

function otpKey(el, idx, e, mode) {
	const wrap = document.getElementById(mode === 'setup' ? 'otpSetupWrap' : 'otpWrap');
	const inputs = wrap.querySelectorAll('input');
	if (e.key === 'Backspace' && !el.value && idx > 0) inputs[idx - 1].focus();
	if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
	if (e.key === 'ArrowRight' && idx < 5) inputs[idx + 1].focus();
}

function getOTP(wrapId) {
	return Array.from(document.getElementById(wrapId).querySelectorAll('input'))
		.map(i => i.value).join('');
}

function clearOTP(wrapId) {
	document.getElementById(wrapId).querySelectorAll('input').forEach(i => i.value = '');
	document.getElementById(wrapId).querySelector('input').focus();
}

document.addEventListener('paste', (e) => {
	const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
	if (text.length !== 6) return;
	['otpWrap', 'otpSetupWrap'].forEach(wrapId => {
		const wrap = document.getElementById(wrapId);
		if (!wrap) return;
		const inputs = wrap.querySelectorAll('input');
		text.split('').forEach((ch, i) => {
			if (inputs[i]) inputs[i].value = ch;
		});
	});
});

async function doLogin() {
	hideAlert('loginAlert');
	const email = document.getElementById('loginEmail').value.trim();
	const pw = document.getElementById('loginPassword').value;

	if (!email || !pw) {
		showAlert('loginAlert', 'Bitte alle Felder ausfüllen.');
		return;
	}

	setLoading('loginBtn', true);
	try {
		const {
			data,
			error
		} = await _sb.auth.signInWithPassword({
			email,
			password: pw
		});

		if (error) {
			if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
				showAlert('loginAlert', 'E-Mail oder Passwort ist falsch.');
			} else {
				showAlert('loginAlert', error.message);
			}
			return;
		}

		const {
			data: aalData
		} = await _sb.auth.mfa.getAuthenticatorAssuranceLevel();
		if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1') {
			await startMFAChallenge();
		} else {
			onLoginSuccess(data.user);
		}

	} catch (e) {
		showAlert('loginAlert', 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
	} finally {
		setLoading('loginBtn', false);
	}
}

async function startMFAChallenge() {
	const {
		data: factors
	} = await _sb.auth.mfa.listFactors();
	const totp = factors?.totp?.[0];
	if (!totp) {
		onLoginSuccess();
		return;
	}

	_pendingMFAFactorId = totp.id;
	const {
		data: challenge,
		error
	} = await _sb.auth.mfa.challenge({
		factorId: totp.id
	});
	if (error) {
		showAlert('loginAlert', 'MFA-Fehler: ' + error.message);
		return;
	}

	_pendingMFAChallengeId = challenge.id;

	document.getElementById('authSection').style.display = 'none';
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById('viewMFA').classList.add('active');
	clearOTP('otpWrap');
}

async function doMFAVerify() {
	if (!_pendingMFAFactorId || !_pendingMFAChallengeId) return;
	const code = getOTP('otpWrap');
	if (code.length < 6) return;

	setLoading('mfaBtn', true);
	hideAlert('mfaAlert');

	try {
		const {
			data,
			error
		} = await _sb.auth.mfa.verify({
			factorId: _pendingMFAFactorId,
			challengeId: _pendingMFAChallengeId,
			code
		});

		if (error) {
			showAlert('mfaAlert', 'Falscher Code. Bitte versuche es erneut.');
			clearOTP('otpWrap');
		} else {
			onLoginSuccess(data.user);
		}
	} finally {
		setLoading('mfaBtn', false);
	}
}

function setFieldMsg(id, type, text) {
	const el = document.getElementById(id);
	if (!el) return;
	el.className = 'field-msg ' + (text ? type + ' show' : '');
	if (type === 'checking') {
		el.innerHTML = '<div class="field-spinner"></div>' + text;
	} else if (type === 'ok') {
		el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' + text;
	} else if (type === 'error') {
		el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' + text;
	} else {
		el.innerHTML = '';
	}
}

function setFieldState(inputId, state) {
	const el = document.getElementById(inputId);
	if (!el) return;
	el.classList.remove('field-error', 'field-ok');
	if (state === 'error') el.classList.add('field-error');
	if (state === 'ok') el.classList.add('field-ok');
}

let _emailCheckTimer = null;
async function checkEmailAvailability() {
	const email = document.getElementById('regEmail').value.trim();
	if (!email) {
		setFieldMsg('emailMsg', '', '');
		setFieldState('regEmail', '');
		return;
	}

	const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRx.test(email)) {
		setFieldState('regEmail', 'error');
		setFieldMsg('emailMsg', 'error', 'Bitte eine gültige E-Mail eingeben.');
		return;
	}

	setFieldMsg('emailMsg', 'checking', 'Wird geprüft...');
	setFieldState('regEmail', '');

	clearTimeout(_emailCheckTimer);
	_emailCheckTimer = setTimeout(async () => {
		try {
			const {
				data
			} = await _sb.auth.signUp({
				email,
				password: 'CHECK_ONLY_' + Math.random().toString(36),
				options: {
					data: {
						_check_only: true
					}
				}
			});
			if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
				setFieldState('regEmail', 'error');
				setFieldMsg('emailMsg', 'error', 'Diese E-Mail ist bereits registriert.');
			} else {
				setFieldState('regEmail', 'ok');
				setFieldMsg('emailMsg', 'ok', 'E-Mail ist verfügbar.');
			}
		} catch {
			setFieldMsg('emailMsg', '', '');
			setFieldState('regEmail', '');
		}
	}, 600);
}

let _nameCheckTimer = null;
async function checkNameAvailability() {
	const name = document.getElementById('regName').value.trim();
	if (!name) {
		setFieldMsg('nameMsg', '', '');
		setFieldState('regName', '');
		return;
	}

	if (name.length < 2) {
		setFieldState('regName', 'error');
		setFieldMsg('nameMsg', 'error', 'Name muss mind. 2 Zeichen haben.');
		return;
	}

	setFieldMsg('nameMsg', 'checking', 'Wird geprüft...');
	setFieldState('regName', '');

	clearTimeout(_nameCheckTimer);
	_nameCheckTimer = setTimeout(async () => {
		try {
			const {
				data,
				error
			} = await _sb
				.from('profiles')
				.select('id')
				.ilike('display_name', name)
				.maybeSingle();

			if (error) {
				setFieldState('regName', 'ok');
				setFieldMsg('nameMsg', 'ok', 'Name sieht gut aus.');
				return;
			}
			if (data) {
				setFieldState('regName', 'error');
				setFieldMsg('nameMsg', 'error', 'Dieser Name ist bereits vergeben.');
			} else {
				setFieldState('regName', 'ok');
				setFieldMsg('nameMsg', 'ok', 'Name ist verfügbar.');
			}
		} catch {
			setFieldState('regName', 'ok');
			setFieldMsg('nameMsg', 'ok', 'Name sieht gut aus.');
		}
	}, 500);
}

async function doRegister() {
	hideAlert('registerAlert');
	const name = document.getElementById('regName').value.trim();
	const email = document.getElementById('regEmail').value.trim();
	const pw = document.getElementById('regPassword').value;
	const pw2 = document.getElementById('regPasswordConfirm').value;

	if (!name) {
		setFieldState('regName', 'error');
		setFieldMsg('nameMsg', 'error', 'Bitte gib deinen Namen ein.');
		return;
	}
	if (!email) {
		setFieldState('regEmail', 'error');
		setFieldMsg('emailMsg', 'error', 'Bitte gib deine E-Mail ein.');
		return;
	}
	if (!pw) {
		showAlert('registerAlert', 'Bitte ein Passwort eingeben.');
		return;
	}
	if (pw !== pw2) {
		showAlert('registerAlert', 'Passwörter stimmen nicht überein.');
		return;
	}
	if (pw.length < 8) {
		showAlert('registerAlert', 'Passwort muss mind. 8 Zeichen haben.');
		return;
	}

	if (document.getElementById('regEmail').classList.contains('field-error')) {
		document.getElementById('regEmail').focus();
		return;
	}
	if (document.getElementById('regName').classList.contains('field-error')) {
		document.getElementById('regName').focus();
		return;
	}

	setLoading('registerBtn', true);
	try {
		const {
			data,
			error
		} = await _sb.auth.signUp({
			email,
			password: pw,
			options: {
				data: {
					full_name: name,
					display_name: name,
					name
				}
			}
		});

		if (error) {
			console.error('[CalSync] signUp error:', error);
			if (error.message.toLowerCase().includes('already registered') || error.status === 422) {
				setFieldState('regEmail', 'error');
				setFieldMsg('emailMsg', 'error', 'Diese E-Mail ist bereits registriert.');
			} else {
				showAlert('registerAlert', 'Fehler: ' + error.message);
			}
			return;
		}

		console.log('[CalSync] signUp response:', data);

		if (data.session) {
			onLoginSuccess(data.user);
			return;
		}

		if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
			setFieldState('regEmail', 'error');
			setFieldMsg('emailMsg', 'error', 'Diese E-Mail ist bereits registriert.');
			return;
		}

		if (data.user) {
			document.getElementById('authSection').style.display = 'none';
			document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
			document.getElementById('viewConfirm').classList.add('active');
			return;
		}

		showAlert('registerAlert', 'Registrierung gestartet. Prüfe dein Postfach.', 'success');

	} catch (e) {
		console.error('[CalSync] signUp exception:', e);
		showAlert('registerAlert', 'Netzwerkfehler. Bitte versuche es erneut.');
	} finally {
		setLoading('registerBtn', false);
	}
}

async function doReset() {
	hideAlert('resetAlert');
	const email = document.getElementById('resetEmail').value.trim();
	if (!email) {
		showAlert('resetAlert', 'Bitte gib deine E-Mail ein.');
		return;
	}

	setLoading('resetBtn', true);
	try {
		const {
			error
		} = await _sb.auth.resetPasswordForEmail(email, {
			redirectTo: window.location.origin + '/login.html'
		});
		if (error) {
			showAlert('resetAlert', error.message);
		} else {
			showAlert('resetAlert', '📬 Reset-Link wurde gesendet! Prüfe dein Postfach.', 'success');
			document.getElementById('resetEmail').value = '';
		}
	} finally {
		setLoading('resetBtn', false);
	}
}

async function show2FASetupOffer() {
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById('viewSetup2FA').classList.add('active');
	document.getElementById('authSection').style.display = 'none';
	hideAlert('setup2faAlert');

	const {
		data,
		error
	} = await _sb.auth.mfa.enroll({
		factorType: 'totp',
		friendlyName: 'CalSync 2FA'
	});
	if (error) {
		showAlert('setup2faAlert', 'Fehler beim Einrichten: ' + error.message);
		return;
	}

	_enrolledFactorId = data.id;
	_totpSecretKey = data.totp.secret;

	document.getElementById('qrCode').innerHTML = '';
	new QRCode(document.getElementById('qrCode'), {
		text: data.totp.uri,
		width: 180,
		height: 180,
		colorDark: '#000000',
		colorLight: '#ffffff'
	});

	document.getElementById('totpSecret').textContent = data.totp.secret;
}

async function doSetup2FA() {
	if (!_enrolledFactorId) return;
	const code = getOTP('otpSetupWrap');
	if (code.length < 6) return;

	setLoading('setup2faBtn', true);
	hideAlert('setup2faAlert');

	try {
		const {
			data: challenge,
			error: cErr
		} = await _sb.auth.mfa.challenge({
			factorId: _enrolledFactorId
		});
		if (cErr) {
			showAlert('setup2faAlert', cErr.message);
			return;
		}

		const {
			error: vErr
		} = await _sb.auth.mfa.verify({
			factorId: _enrolledFactorId,
			challengeId: challenge.id,
			code
		});

		if (vErr) {
			showAlert('setup2faAlert', 'Falscher Code. Bitte versuche es erneut.');
			clearOTP('otpSetupWrap');
		} else {
			showAlert('setup2faAlert', '✅ 2FA wurde erfolgreich aktiviert!', 'success');
			setTimeout(goToApp, 1500);
		}
	} finally {
		setLoading('setup2faBtn', false);
	}
}

function copySecret() {
	if (!_totpSecretKey) return;
	navigator.clipboard.writeText(_totpSecretKey).then(() => {
		const el = document.getElementById('totpSecret');
		el.textContent = '✅ Kopiert!';
		setTimeout(() => {
			el.textContent = _totpSecretKey;
		}, 2000);
	});
}

function onLoginSuccess(user) {
	document.getElementById('authSection').style.display = 'none';
	document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
	document.getElementById('viewLoggedIn').classList.add('active');
	const name = user?.user_metadata?.full_name ||
		user?.user_metadata?.name ||
		user?.email?.split('@')[0] ||
		'dir';
	document.getElementById('loggedInMsg').textContent = `Hallo, ${name}! Du bist erfolgreich eingeloggt.`;
	document.getElementById('mainFooter').style.display = 'none';
}

_sb.auth.getSession().then(({
	data: {
		session
	}
}) => {
	if (session) {
		onLoginSuccess(session.user);
	}
});

document.addEventListener('keydown', (e) => {
	if (e.key !== 'Enter') return;
	const active = document.querySelector('.view.active')?.id;
	if (active === 'viewLogin') doLogin();
	if (active === 'viewRegister') doRegister();
	if (active === 'viewReset') doReset();
});
