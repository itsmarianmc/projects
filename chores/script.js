import {
	createClient
} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
	'https://asgomhjkarzbfqnmrvtr.supabase.co',
	'sb_publishable_jRVTMadpV1C454H4hxsK9g_3-kaW7il'
);

const CHORE_TYPES = {
	toilet_paper: {
		label: 'Restocked toilet paper',
		icon: '🧻'
	},
	dishwasher: {
		label: 'Unloaded dishwasher',
		icon: '🍽️'
	},
	soap: {
		label: 'Restocked soap',
		icon: '🧼'
	},
	table: {
		label: 'Set/cleared the table',
		icon: '🍴'
	}
};

let currentUser = null;
let currentProfile = null;
let partnerProfile = null;
let authMode = 'login';
let pendingMfaFactorId = null;
let totpEnrollmentId = null;

const $ = id => document.getElementById(id);

function showMsg(el, type, text) {
	el.className = `msg-box ${type} show`;
	el.textContent = text;
}

function showModalMsg(el, type, text) {
	el.className = `modal-msg ${type} show`;
	el.textContent = text;
}

function hideMsg(el) {
	el.className = el.className.includes('modal-msg') ? 'modal-msg' : 'msg-box';
	el.textContent = '';
}

const SCREENS = ['auth-screen', 'verify-screen', 'mfa-screen', 'app'];

function showScreen(id) {
	SCREENS.forEach(s => $(s).classList.add('hidden'));
	$(id).classList.remove('hidden');
}

async function init() {
	const {
		data: {
			session
		}
	} = await supabase.auth.getSession();
	currentUser = session?.user || null;
	$('loading').classList.add('hidden');

	if (currentUser) {
		await routeUser();
	} else {
		showScreen('auth-screen');
	}

	setupListeners();
}

async function routeUser() {
	if (!currentUser) {
		showScreen('auth-screen');
		return;
	}

	if (!currentUser.email_confirmed_at) {
		$('verify-email-display').textContent = currentUser.email;
		showScreen('verify-screen');
		return;
	}

	const {
		data: aalData
	} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
		const {
			data: factorsData
		} = await supabase.auth.mfa.listFactors();
		const factor = factorsData?.totp?.find(f => f.status === 'verified');
		if (factor) {
			pendingMfaFactorId = factor.id;
			$('mfa-code').value = '';
			hideMsg($('mfa-msg'));
			showScreen('mfa-screen');
			setTimeout(() => $('mfa-code').focus(), 100);
			return;
		}
	}

	await loadProfile();
	showScreen('app');
	loadChores();
}

function setupListeners() {
	$('auth-form').addEventListener('submit', handleAuth);
	$('toggle-mode').addEventListener('click', toggleAuthMode);
	$('logout-btn').addEventListener('click', () => supabase.auth.signOut());
	$('profile-btn').addEventListener('click', openProfileModal);
	$('profile-modal-close').addEventListener('click', closeProfileModal);
	$('profile-modal').addEventListener('click', e => {
		if (e.target === $('profile-modal')) closeProfileModal();
	});

	$('resend-btn').addEventListener('click', handleResend);
	$('back-to-login-btn').addEventListener('click', async () => {
		await supabase.auth.signOut();
		showScreen('auth-screen');
	});

	$('mfa-submit-btn').addEventListener('click', handleMfaSubmit);
	$('mfa-cancel-btn').addEventListener('click', async () => {
		await supabase.auth.signOut();
		pendingMfaFactorId = null;
		showScreen('auth-screen');
	});
	$('mfa-code').addEventListener('keydown', e => {
		if (e.key === 'Enter') handleMfaSubmit();
	});

	document.querySelectorAll('.chore-btn').forEach(btn =>
		btn.addEventListener('click', () => addChore(btn.dataset.chore))
	);

	$('change-pw-btn').addEventListener('click', handlePasswordChange);
	$('totp-enable-btn').addEventListener('click', startTotpSetup);
	$('totp-disable-btn').addEventListener('click', disableTotp);
	$('totp-confirm-btn').addEventListener('click', confirmTotpSetup);
	$('totp-cancel-btn').addEventListener('click', cancelTotpSetup);

	supabase.auth.onAuthStateChange(async (event, session) => {
		currentUser = session?.user || null;
		if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
			if (currentUser) await routeUser();
		} else if (event === 'SIGNED_OUT') {
			currentUser = null;
			currentProfile = null;
			partnerProfile = null;
			showScreen('auth-screen');
		}
	});
}

function toggleAuthMode() {
	authMode = authMode === 'login' ? 'register' : 'login';
	hideMsg($('auth-msg'));
	if (authMode === 'register') {
		$('name').classList.remove('hidden');
		$('submit-btn').textContent = 'Sign up';
		$('toggle-mode').textContent = 'Already registered? Log in';
		$('auth-subtitle').textContent = 'Let\'s get started!';
	} else {
		$('name').classList.add('hidden');
		$('submit-btn').textContent = 'Log in';
		$('toggle-mode').textContent = 'No account yet? Sign up';
		$('auth-subtitle').textContent = 'Welcome back!';
	}
}

async function handleAuth(e) {
	e.preventDefault();
	hideMsg($('auth-msg'));
	const btn = $('submit-btn');
	btn.disabled = true;

	try {
		if (authMode === 'login') {
			const {
				data,
				error
			} = await supabase.auth.signInWithPassword({
				email: $('email').value,
				password: $('password').value
			});
			if (error) throw error;
		} else {
			const name = $('name').value.trim();
			if (!name) throw new Error('Please enter your name.');

			const {
				error
			} = await supabase.auth.signUp({
				email: $('email').value,
				password: $('password').value,
				options: {
					data: {
						name
					}
				}
			});
			if (error) throw error;

			$('verify-email-display').textContent = $('email').value;
			$('email').value = '';
			$('password').value = '';
			$('name').value = '';
			showScreen('verify-screen');
		}
	} catch (err) {
		showMsg($('auth-msg'), 'error', err.message);
	}

	btn.disabled = false;
}

async function handleResend() {
	const email = $('verify-email-display').textContent;
	$('resend-btn').disabled = true;
	const {
		error
	} = await supabase.auth.resend({
		type: 'signup',
		email
	});
	if (error) {
		showMsg($('verify-msg'), 'error', error.message);
		$('resend-btn').disabled = false;
	} else {
		showMsg($('verify-msg'), 'success', 'Link sent! Please check your inbox.');
		setTimeout(() => {
			$('resend-btn').disabled = false;
			hideMsg($('verify-msg'));
		}, 60000);
	}
}

async function handleMfaSubmit() {
	const code = $('mfa-code').value.trim();
	if (!/^\d{6}$/.test(code)) {
		showMsg($('mfa-msg'), 'error', 'Please enter a 6-digit code.');
		return;
	}
	if (!pendingMfaFactorId) {
		showMsg($('mfa-msg'), 'error', 'Session error — please log in again.');
		return;
	}

	$('mfa-submit-btn').disabled = true;
	hideMsg($('mfa-msg'));

	try {
		const {
			data: challenge,
			error: ce
		} = await supabase.auth.mfa.challenge({
			factorId: pendingMfaFactorId
		});
		if (ce) throw ce;
		const {
			error: ve
		} = await supabase.auth.mfa.verify({
			factorId: pendingMfaFactorId,
			challengeId: challenge.id,
			code
		});
		if (ve) throw ve;

		pendingMfaFactorId = null;
	} catch (err) {
		const msg = /invalid|incorrect|token/i.test(err.message) ? 'Wrong code. Please try again.' : err.message;
		showMsg($('mfa-msg'), 'error', msg);
		$('mfa-code').value = '';
		$('mfa-code').focus();
	}

	$('mfa-submit-btn').disabled = false;
}

async function loadProfile() {
	const {
		data: profiles
	} = await supabase
		.from('profiles').select('*').order('created_at', {
			ascending: true
		}).limit(2);
	currentProfile = profiles?.find(p => p.id === currentUser.id);
	partnerProfile = profiles?.find(p => p.id !== currentUser.id);
	$('my-name').textContent = currentProfile?.name || 'You';
	$('partner-name').textContent = partnerProfile?.name || 'Partner';
}

async function loadChores() {
	const start = new Date();
	start.setDate(1);
	start.setHours(0, 0, 0, 0);
	const {
		data: chores
	} = await supabase
		.from('chores').select('*')
		.gte('created_at', start.toISOString())
		.order('created_at', {
			ascending: false
		});
	updateStats(chores || []);
	updateChoreList(chores || []);
}

async function addChore(type) {
	const {
		error
	} = await supabase.from('chores').insert({
		user_id: currentUser.id,
		chore_type: type
	});
	if (!error) loadChores();
}

async function deleteChore(id, el) {
	el.style.opacity = '0.4';
	el.style.pointerEvents = 'none';
	const {
		error
	} = await supabase.from('chores').delete().eq('id', id);
	if (!error) {
		el.style.transition = 'all 0.3s';
		el.style.transform = 'translateX(24px)';
		el.style.opacity = '0';
		setTimeout(() => {
			el.remove();
			loadChores();
		}, 300);
	} else {
		el.style.opacity = '1';
		el.style.pointerEvents = 'auto';
	}
}

function updateStats(chores) {
	const mine = chores.filter(c => c.user_id === currentUser?.id).length;
	const theirs = chores.filter(c => c.user_id === partnerProfile?.id).length;
	const total = mine + theirs;
	const myPct = total > 0 ? Math.round((mine / total) * 100) : 50;
	const theirPct = 100 - myPct;
	const circ = 603;
	setTimeout(() => {
		$('partner-circle').style.strokeDashoffset = circ - (theirPct / 100) * circ;
		$('my-circle').style.strokeDashoffset = circ - (myPct / 100) * circ;
		$('my-circle').style.transform = `rotate(${(theirPct / 100) * 360 - 90}deg)`;
	}, 100);
	$('percentage').textContent = myPct + '%';
	$('my-count').textContent = mine;
	$('partner-count').textContent = theirs;
	const q = ['Time to catch up, champ! 🚀', 'Hey, a little more effort would be nice! 🙃', 'Almost fifty-fifty, good job! ⚖️', 'Perfectly balanced! 🤝', 'Great work! You\'re making a difference! 💪', 'You\'re an absolute legend! 🌟'];
	$('quote').textContent = q[Math.min(5, Math.floor(myPct / 16.67))];
}

function updateChoreList(chores) {
	const list = $('chore-list');
	list.innerHTML = '<p class="centered">No activity yet.<br>Complete chores to add activity!</p>';
	chores.slice(0, 20).forEach(chore => {
		const info = CHORE_TYPES[chore.chore_type];
		if (!info) return;
		list.innerHTML = '';
		const isMe = chore.user_id === currentUser?.id;
		const name = isMe ? currentProfile?.name : partnerProfile?.name;
		const date = new Date(chore.created_at).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: '2-digit'
		});
		const el = document.createElement('div');
		el.className = 'chore-item';
		el.innerHTML = `
            <span class="chore-item-icon">${info.icon}</span>
            <div class="chore-item-content">
                <span class="chore-item-label">${info.label}</span>
                <span class="chore-item-meta">${name || '?'} · ${date}</span>
            </div>
            ${isMe ? `<button class="chore-delete-btn">✕ Delete</button>` : ''}
        `;
		if (isMe) el.querySelector('.chore-delete-btn').addEventListener('click', () => deleteChore(chore.id, el));
		list.appendChild(el);
	});
}

async function openProfileModal() {
	$('profile-name-display').textContent = currentProfile?.name || currentUser?.user_metadata?.name || '—';
	$('profile-email-display').textContent = currentUser?.email || '—';
	['pw-msg', 'totp-msg'].forEach(id => hideMsg($(id)));
	$('new-password').value = '';
	$('confirm-password').value = '';
	$('profile-modal').classList.remove('hidden');
	await refreshTotpStatus();
}

function closeProfileModal() {
	$('profile-modal').classList.add('hidden');
	if (totpEnrollmentId) cancelTotpSetup();
}

async function handlePasswordChange() {
	const pw = $('new-password').value;
	const pw2 = $('confirm-password').value;
	hideMsg($('pw-msg'));
	if (pw.length < 8) {
		showModalMsg($('pw-msg'), 'error', 'At least 8 characters required.');
		return;
	}
	if (pw !== pw2) {
		showModalMsg($('pw-msg'), 'error', 'Passwords do not match.');
		return;
	}
	$('change-pw-btn').disabled = true;
	const {
		error
	} = await supabase.auth.updateUser({
		password: pw
	});
	if (error) {
		showModalMsg($('pw-msg'), 'error', error.message);
	} else {
		showModalMsg($('pw-msg'), 'success', 'Password updated successfully! ✓');
		$('new-password').value = '';
		$('confirm-password').value = '';
	}
	$('change-pw-btn').disabled = false;
}

async function refreshTotpStatus() {
	$('totp-status-text').textContent = 'Loading…';
	$('totp-badge').className = 'badge badge-gray';
	$('totp-badge').textContent = '—';
	$('totp-enable-btn').classList.add('hidden');
	$('totp-disable-btn').classList.add('hidden');
	$('totp-setup-area').classList.add('hidden');
	hideMsg($('totp-msg'));

	try {
		const {
			data,
			error
		} = await supabase.auth.mfa.listFactors();
		if (error) throw error;

		const verified = data?.totp?.find(f => f.status === 'verified');
		const stale = data?.totp?.filter(f => f.status === 'unverified') || [];
		if (stale.length > 0 && !totpEnrollmentId) {
			await Promise.all(stale.map(f => supabase.auth.mfa.unenroll({
				factorId: f.id
			})));
		}

		if (verified) {
			$('totp-status-text').textContent = 'Active';
			$('totp-badge').className = 'badge badge-green';
			$('totp-badge').textContent = '✓ Active';
			$('totp-disable-btn').classList.remove('hidden');
		} else {
			$('totp-status-text').textContent = 'Not set up';
			$('totp-badge').className = 'badge badge-gray';
			$('totp-badge').textContent = 'Inactive';
			$('totp-enable-btn').classList.remove('hidden');
		}
	} catch (err) {
		showModalMsg($('totp-msg'), 'error', 'Could not load 2FA status: ' + err.message);
	}
}

async function startTotpSetup() {
	$('totp-enable-btn').classList.add('hidden');
	showModalMsg($('totp-msg'), 'info', 'Generating QR code…');

	try {
		const {
			data: existing
		} = await supabase.auth.mfa.listFactors();
		const stale = existing?.totp?.filter(f => f.status === 'unverified') || [];
		await Promise.all(stale.map(f => supabase.auth.mfa.unenroll({
			factorId: f.id
		})));

		const {
			data,
			error
		} = await supabase.auth.mfa.enroll({
			factorType: 'totp',
			issuer: 'Chore Tracker'
		});
		if (error) throw error;

		totpEnrollmentId = data.id;
		$('totp-qr-img').src = data.totp.qr_code;
		$('totp-secret-display').textContent = data.totp.secret;
		$('totp-code-input').value = '';
		$('totp-setup-area').classList.remove('hidden');
		hideMsg($('totp-msg'));
		setTimeout(() => $('totp-code-input').focus(), 150);
	} catch (err) {
		showModalMsg($('totp-msg'), 'error', 'Error starting 2FA setup: ' + err.message);
		$('totp-enable-btn').classList.remove('hidden');
		totpEnrollmentId = null;
	}
}

async function confirmTotpSetup() {
	const code = $('totp-code-input').value.trim();
	if (!/^\d{6}$/.test(code)) {
		showModalMsg($('totp-msg'), 'error', 'Please enter a 6-digit code.');
		return;
	}
	if (!totpEnrollmentId) {
		showModalMsg($('totp-msg'), 'error', 'No active enrollment found. Please restart.');
		return;
	}

	$('totp-confirm-btn').disabled = true;
	hideMsg($('totp-msg'));

	try {
		const {
			data: challenge,
			error: ce
		} = await supabase.auth.mfa.challenge({
			factorId: totpEnrollmentId
		});
		if (ce) throw ce;
		const {
			error: ve
		} = await supabase.auth.mfa.verify({
			factorId: totpEnrollmentId,
			challengeId: challenge.id,
			code
		});
		if (ve) throw ve;

		totpEnrollmentId = null;
		$('totp-setup-area').classList.add('hidden');
		showModalMsg($('totp-msg'), 'success', '2FA successfully activated! Your code will be required at login from now on. ✓');
		await refreshTotpStatus();
	} catch (err) {
		const msg = /invalid|incorrect|token|expired/i.test(err.message) ?
			'Wrong or expired code. Please try again.' :
			err.message;
		showModalMsg($('totp-msg'), 'error', msg);
		$('totp-code-input').value = '';
		$('totp-code-input').focus();
	}

	$('totp-confirm-btn').disabled = false;
}

async function cancelTotpSetup() {
	if (totpEnrollmentId) {
		await supabase.auth.mfa.unenroll({
			factorId: totpEnrollmentId
		}).catch(() => {});
		totpEnrollmentId = null;
	}
	$('totp-setup-area').classList.add('hidden');
	hideMsg($('totp-msg'));
	await refreshTotpStatus();
}

async function disableTotp() {
	if (!confirm('Really disable 2FA? Your account will be less secure.')) return;
	$('totp-disable-btn').disabled = true;
	hideMsg($('totp-msg'));
	try {
		const {
			data
		} = await supabase.auth.mfa.listFactors();
		const factor = data?.totp?.find(f => f.status === 'verified');
		if (!factor) throw new Error('No active factor found.');
		const {
			error
		} = await supabase.auth.mfa.unenroll({
			factorId: factor.id
		});
		if (error) throw error;
		showModalMsg($('totp-msg'), 'success', '2FA has been disabled.');
		await refreshTotpStatus();
	} catch (err) {
		showModalMsg($('totp-msg'), 'error', 'Error: ' + err.message);
	}
	$('totp-disable-btn').disabled = false;
}

init();