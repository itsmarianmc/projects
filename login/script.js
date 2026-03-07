const APPS = {
	calsync: {
		name:    'CalSync',
		url:     '/calsync/',
		favicon: '/calsync/favicon.png',
		color:   '#E4840F',
		color2:  '#FF9F0A',
	},
	dropsync: {
		name:    'DropSync',
		url:     '/dropsync/',
		favicon: '/dropsync/favicon.png',
		color:   '#5AC8FA',
		color2:  '#30D158',
	},
};

const _params = new URLSearchParams(window.location.search);
const _appKey = (_params.get('signinginto') || '').toLowerCase();
const APP     = APPS[_appKey] || APPS['calsync'];

const SUPABASE_URL      = 'https://stuqtqlkantewwxhwitg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nNq-PUIq-C-q5OREGoEquA_XmLrOr-r';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MFA_TRUST_KEY = 'mfa_trusted_emails';

function getMfaTrustedEmails() {
	try { return JSON.parse(localStorage.getItem(MFA_TRUST_KEY) || '[]'); } catch { return []; }
}

function isMfaTrusted(email) {
	return getMfaTrustedEmails().includes(email.toLowerCase());
}

function setMfaTrusted(email) {
	const list = getMfaTrustedEmails();
	const key  = email.toLowerCase();
	if (!list.includes(key)) {
		list.push(key);
		localStorage.setItem(MFA_TRUST_KEY, JSON.stringify(list));
	}
}

(function brandPage() {
	document.title = APP.name + ' - Login';

	const favEl = document.querySelector('link[rel="icon"]');
	if (favEl) favEl.href = APP.favicon;

	const logoImg  = document.getElementById('logoImg');
	const logoName = document.getElementById('logoName');
	if (logoImg)  { logoImg.src = APP.favicon; logoImg.alt = APP.name; }
	if (logoName) logoName.textContent = APP.name;

	const regSub = document.getElementById('registerSubtitle');
	if (regSub) regSub.textContent = `Join ${APP.name} and start tracking today!`;

	const liTitle = document.getElementById('loggedInTitle');
	if (liTitle) liTitle.textContent = `Welcome back to ${APP.name}!`;

	document.documentElement.style.setProperty('--accent',  APP.color);
	document.documentElement.style.setProperty('--accent2', APP.color2);
})();

function goToApp() {
	window.location.href = APP.url;
}

function showView(id) {
	document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
	document.getElementById('authSection').classList.remove('active');
	const el = document.getElementById(id);
	if (el) el.classList.add('active');
}

function showAuth() {
	document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
	document.getElementById('authSection').classList.add('active');
	document.getElementById('viewLogin').classList.add('active');
}

function showReset() {
	showView('viewReset');
}

function switchTab(tab) {
	document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
	document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
	document.getElementById('viewLogin').classList.toggle('active', tab === 'login');
	document.getElementById('viewRegister').classList.toggle('active', tab === 'register');
}

function setLoading(btnId, loading) {
	const btn = document.getElementById(btnId);
	btn.classList.toggle('loading', loading);
	btn.disabled = loading;
}

function showAlert(id, msg, type = 'error') {
	const el = document.getElementById(id);
	el.textContent = msg;
	el.className = `alert ${type} show`;
}

function hideAlert(id) {
	document.getElementById(id).className = 'alert';
}

function togglePw(inputId, btn) {
	const input = document.getElementById(inputId);
	const isHidden = input.type === 'password';
	input.type = isHidden ? 'text' : 'password';
	btn.innerHTML = isHidden
		? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
		: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function checkPasswordStrength(val) {
	const rules = {
		len:   val.length >= 8,
		upper: /[A-Z]/.test(val),
		num:   /[0-9]/.test(val),
	};
	const score = Object.values(rules).filter(Boolean).length;
	const cls   = ['', 'weak', 'medium', 'strong'][score] || '';

	['bar1','bar2','bar3'].forEach((id, i) => {
		document.getElementById(id).className = 'pw-bar' + (i < score ? ' ' + cls : '');
	});

	if (val.length > 0) document.getElementById('pwRules').classList.add('show');

	Object.entries(rules).forEach(([key, ok]) => {
		const rule = document.getElementById(`rule-${key}`);
		if (!rule) return;
		rule.classList.toggle('ok', ok);
		rule.querySelector('svg').innerHTML = ok
			? `<polyline points="20 6 9 17 4 12"/>`
			: `<circle cx="12" cy="12" r="10"/>`;
	});
}

async function checkNameAvailability() {
	const val = document.getElementById('regName').value.trim();
	const msg = document.getElementById('nameMsg');
	if (!val) { msg.className = 'field-msg'; return; }
	msg.className = 'field-msg checking show';
	msg.innerHTML = `<div class="field-spinner"></div> Checking…`;
	await new Promise(r => setTimeout(r, 400));
	msg.className = 'field-msg ok show';
	msg.textContent = '✓ Looks good';
}

async function checkEmailAvailability() {
	const val = document.getElementById('regEmail').value.trim();
	const msg = document.getElementById('emailMsg');
	if (!val || !val.includes('@')) { msg.className = 'field-msg'; return; }
	msg.className = 'field-msg checking show';
	msg.innerHTML = `<div class="field-spinner"></div> Checking…`;
	await new Promise(r => setTimeout(r, 500));
	msg.className = 'field-msg ok show';
	msg.textContent = '✓ Email looks valid';
}

async function doRegister() {
	hideAlert('registerAlert');
	const name     = document.getElementById('regName').value.trim();
	const email    = document.getElementById('regEmail').value.trim();
	const password = document.getElementById('regPassword').value;
	const confirm  = document.getElementById('regPasswordConfirm').value;

	if (!name)                          return showAlert('registerAlert', 'Please enter your name.');
	if (!email || !email.includes('@')) return showAlert('registerAlert', 'Please enter a valid email.');
	if (password.length < 8)            return showAlert('registerAlert', 'Password must be at least 8 characters.');
	if (!/[A-Z]/.test(password))        return showAlert('registerAlert', 'Password needs at least one uppercase letter.');
	if (!/[0-9]/.test(password))        return showAlert('registerAlert', 'Password needs at least one number.');
	if (password !== confirm)           return showAlert('registerAlert', 'Passwords do not match.');

	setLoading('registerBtn', true);
	const { error } = await _supabase.auth.signUp({
		email, password,
		options: { data: { full_name: name, display_name: name } }
	});
	setLoading('registerBtn', false);

	if (error) return showAlert('registerAlert', error.message);
	showView('viewConfirm');
}

async function doLogin() {
	hideAlert('loginAlert');
	const email    = document.getElementById('loginEmail').value.trim();
	const password = document.getElementById('loginPassword').value;

	if (!email || !password) return showAlert('loginAlert', 'Please fill in all fields.');

	setLoading('loginBtn', true);
	const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

	if (error) {
		setLoading('loginBtn', false);
		return showAlert('loginAlert', error.message);
	}

	const { data: aal } = await _supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
		if (isMfaTrusted(email)) {
			setLoading('loginBtn', false);
			await handleLoggedIn(data.user);
			return;
		}
		setLoading('loginBtn', false);
		_pendingMfaEmail = email;
		await startMFAChallenge();
		return;
	}

	setLoading('loginBtn', false);
	await handleLoggedIn(data.user);
}

let _mfaChallengeId  = null;
let _mfaFactorId     = null;
let _pendingMfaEmail = null;

async function startMFAChallenge() {
	const { data: factors } = await _supabase.auth.mfa.listFactors();
	const totp = factors?.totp?.[0];
	if (!totp) { await handleLoggedIn((await _supabase.auth.getUser()).data.user); return; }

	const { data: challenge, error } = await _supabase.auth.mfa.challenge({ factorId: totp.id });
	if (error) { showAlert('mfaAlert', error.message); return; }
	_mfaChallengeId = challenge.id;
	_mfaFactorId    = totp.id;

	showView('viewMFA');
	setTimeout(() => document.querySelector('#otpWrap input')?.focus(), 100);
}

async function doMFAVerify() {
	const code = [...document.querySelectorAll('#otpWrap input')].map(i => i.value).join('');
	if (code.length < 6) return showAlert('mfaAlert', 'Enter all 6 digits.');

	setLoading('mfaBtn', true);
	const { error } = await _supabase.auth.mfa.verify({
		factorId:    _mfaFactorId,
		challengeId: _mfaChallengeId,
		code,
	});
	setLoading('mfaBtn', false);

	if (error) return showAlert('mfaAlert', error.message);

	if (document.getElementById('mfaRememberMe')?.checked && _pendingMfaEmail) {
		setMfaTrusted(_pendingMfaEmail);
	}

	const { data: { user } } = await _supabase.auth.getUser();
	await handleLoggedIn(user);
}

let _setupFactorId = null;

async function show2FASetupOffer() {
	const { data, error } = await _supabase.auth.mfa.enroll({
		factorType: 'totp',
		issuer: APP.name,
	});
	if (error) { showAlert('setup2faAlert', error.message); return; }

	_setupFactorId = data.id;
	document.getElementById('totpSecret').textContent = data.totp.secret;
	document.getElementById('qrCode').innerHTML = '';
	new QRCode(document.getElementById('qrCode'), {
		text: data.totp.uri,
		width: 160, height: 160,
		correctLevel: QRCode.CorrectLevel.M,
	});
	showView('viewSetup2FA');
}

async function doSetup2FA() {
	const code = [...document.querySelectorAll('#otpSetupWrap input')].map(i => i.value).join('');
	if (code.length < 6) return showAlert('setup2faAlert', 'Enter all 6 digits.');

	setLoading('setup2faBtn', true);
	const { data: challenge } = await _supabase.auth.mfa.challenge({ factorId: _setupFactorId });
	const { error } = await _supabase.auth.mfa.verify({
		factorId:    _setupFactorId,
		challengeId: challenge.id,
		code,
	});
	setLoading('setup2faBtn', false);

	if (error) return showAlert('setup2faAlert', error.message);
	showAlert('setup2faAlert', '2FA enabled successfully! 🎉', 'success');
	goToApp();
}

function copySecret() {
	const txt = document.getElementById('totpSecret').textContent;
	navigator.clipboard.writeText(txt).then(() => {
		const el   = document.getElementById('totpSecret');
		const orig = el.textContent;
		el.textContent = 'Copied!';
		setTimeout(() => el.textContent = orig, 1500);
	});
}

async function doReset() {
	hideAlert('resetAlert');
	const email = document.getElementById('resetEmail').value.trim();
	if (!email) return showAlert('resetAlert', 'Please enter your email.');

	setLoading('resetBtn', true);
	const { error } = await _supabase.auth.resetPasswordForEmail(email, {
		redirectTo: window.location.origin + window.location.pathname + window.location.search,
	});
	setLoading('resetBtn', false);

	if (error) return showAlert('resetAlert', error.message);
	showAlert('resetAlert', 'Reset link sent! Check your inbox.', 'success');
}

async function logoutUser() {
	await _supabase.auth.signOut();
	showAuth();
}

async function handleLoggedIn(user) {
	const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
	const msg  = document.getElementById('loggedInMsg');
	if (msg && name) msg.textContent = `Signed in as ${name}.`;
	showView('viewLoggedIn');
	goToApp();
}

function otpInput(el, idx, ctx) {
	const wrap   = ctx === 'setup' ? '#otpSetupWrap' : '#otpWrap';
	const inputs = [...document.querySelectorAll(`${wrap} input`)];
	const val    = el.value.replace(/\D/g, '');

	if (val.length > 1) {
		val.split('').slice(0, 6).forEach((d, i) => { if (inputs[i]) inputs[i].value = d; });
		inputs[5]?.focus();
		return;
	}
	el.value = val.slice(-1);
	if (val && idx < 5) inputs[idx + 1]?.focus();
}

function otpKey(el, idx, e, ctx) {
	const wrap   = ctx === 'setup' ? '#otpSetupWrap' : '#otpWrap';
	const inputs = [...document.querySelectorAll(`${wrap} input`)];
	if (e.key === 'Backspace'  && !el.value && idx > 0) inputs[idx - 1]?.focus();
	if (e.key === 'ArrowLeft'  && idx > 0)              inputs[idx - 1]?.focus();
	if (e.key === 'ArrowRight' && idx < 5)              inputs[idx + 1]?.focus();
}

document.addEventListener('keydown', e => {
	if (e.key !== 'Enter') return;
	if (document.getElementById('viewLogin')?.classList.contains('active'))    doLogin();
	if (document.getElementById('viewRegister')?.classList.contains('active')) doRegister();
	if (document.getElementById('viewReset')?.classList.contains('active'))    doReset();
	if (document.getElementById('viewMFA')?.classList.contains('active'))      doMFAVerify();
});

(async function init() {
	if (window.location.hash.includes('type=recovery')) {
		showView('viewReset');
		return;
	}

	const { data: { session } } = await _supabase.auth.getSession();
	if (session) {
		await handleLoggedIn(session.user);
	} else {
		showAuth();
	}
})();