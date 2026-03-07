const SUPABASE_URL = 'https://stuqtqlkantewwxhwitg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nNq-PUIq-C-q5OREGoEquA_XmLrOr-r';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let syncEnabled = false;

(function () {
	if (document.getElementById('_dropsync_auth_style')) return;
	const s = document.createElement('style');
	s.id = '_dropsync_auth_style';
	s.textContent = `
		.auth-avatar {
			width: 28px; height: 28px;
			border-radius: 50%;
			object-fit: cover;
			vertical-align: middle;
		}
		.auth-avatar--initial {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: linear-gradient(135deg, #E4840F, #FF9F0A);
			color: #fff;
			font-size: 13px;
			font-weight: 700;
			font-family: "DM Sans", sans-serif;
			flex-shrink: 0;
		}
	`;
	document.head.appendChild(s);
})();

function getUserDisplayName(user) {
	if (!user) return 'User';
	const meta = user.user_metadata || {};
	return meta.full_name || meta.name || meta.display_name || user.email?.split('@')[0] || 'User';
}

function getUserInitial(user) {
	return getUserDisplayName(user).charAt(0).toUpperCase();
}

document.getElementById('accountLoginBtn')?.addEventListener('click', function () {
	window.open('/login/?signinginto=dropsync', '_parent');
});

document.getElementById('manageAccount')?.addEventListener('click', function () {
	window.open('/login/', '_parent');
});

function updateAuthUI() {
	const loginBtn  = document.getElementById('loginBtn')  || document.getElementById('accountLoginBtn');
	const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('accountLogoutBtn');
	const loggedInSettings = document.getElementById('loggedInSettings');
	const userInfo  = document.getElementById('authUserInfo');
	const syncBadge = document.getElementById('syncStatusBadge');

	if (!loginBtn && !logoutBtn) return;

	if (currentUser) {
		const name   = getUserDisplayName(currentUser);
		const avatar = currentUser.user_metadata?.avatar_url;

		loginBtn?.classList.add('hidden');
		logoutBtn?.classList.remove('hidden');
		loggedInSettings.classList.remove('hidden');

		if (userInfo) {
			if (avatar) {
				userInfo.innerHTML = `<img src="${avatar}" class="auth-avatar" alt="${name}"> <span>${name}</span>`;
			} else {
				userInfo.innerHTML = `
					<div class="auth-avatar auth-avatar--initial" aria-label="${name}">${getUserInitial(currentUser)}</div>
					<span>${name}</span>`;
			}
			userInfo.classList.remove('hidden');
		}

		if (syncBadge) {
			syncBadge.textContent = 'Synced';
			syncBadge.classList.add('active');
		}
	} else {
		loginBtn?.classList.remove('hidden');
		logoutBtn?.classList.add('hidden');
		loggedInSettings?.classList.add('hidden');
		if (userInfo) userInfo.classList.add('hidden');

		if (syncBadge) {
			syncBadge.textContent = 'Not synced';
			syncBadge.classList.remove('active');
		}
	}
}

async function logoutUser() {
	await _supabase.auth.signOut();
	currentUser = null;
	syncEnabled = false;
	updateAuthUI();
	if (typeof showToast === 'function') showToast('👋 Logged out');
	setTimeout(() => {location.reload()}, 1000);
}

async function ensureUserSettings() {
	if (!syncEnabled || !currentUser) return;
	const currentGoal = parseInt(localStorage.getItem('dropsync_goal') || '2500');
	const { error } = await _supabase
		.from('user_settings')
		.upsert(
			{ user_id: currentUser.id, goal_ml: currentGoal },
			{ onConflict: 'user_id', ignoreDuplicates: true }
		);
	if (error) console.error('[DropSync] ensureUserSettings error:', error.message);
}

async function pushGoalToCloud(ml) {
	if (!syncEnabled || !currentUser) return;
	const { error } = await _supabase
		.from('user_settings')
		.upsert(
			{ user_id: currentUser.id, goal_ml: ml },
			{ onConflict: 'user_id' }
		);
	if (error) console.error('[DropSync] Goal push error:', error.message);
}

async function pullGoalFromCloud() {
	if (!syncEnabled || !currentUser) return;
	const { data, error } = await _supabase
		.from('user_settings')
		.select('goal_ml')
		.eq('user_id', currentUser.id)
		.maybeSingle();
	if (error) {
		console.error('[DropSync] Goal pull error:', error.message);
		return;
	}
	if (data?.goal_ml && typeof setGoal === 'function') setGoal(data.goal_ml);
}

async function pushToCloud() {
	if (!syncEnabled || !currentUser) return;

	const payload = entries.map(e => ({
		user_id:  currentUser.id,
		entry_id: e.id,
		drink:    e.drink,
		emoji:    e.emoji,
		color:    e.color,
		amount:   e.amount,
		ts:       e.ts,
		date:     e.date
	}));

	const { error } = await _supabase
		.from('entries')
		.upsert(payload, { onConflict: 'user_id,entry_id' });

	if (error) console.error('[DropSync] Push error:', error.message);
}

async function deleteFromCloud(entryId) {
	if (!syncEnabled || !currentUser) return;
	const { error } = await _supabase
		.from('entries')
		.delete()
		.eq('user_id', currentUser.id)
		.eq('entry_id', entryId);
	if (error) console.error('[DropSync] Delete error:', error.message);
}

async function pullFromCloud() {
	if (!syncEnabled || !currentUser) return;

	const { data, error } = await _supabase
		.from('entries')
		.select('*')
		.eq('user_id', currentUser.id)
		.order('ts', { ascending: true });

	if (error) {
		console.error('[DropSync] Pull error:', error.message);
		return;
	}

	if (data && data.length > 0) {
		const cloudEntries = data.map(r => ({
			id:     r.entry_id,
			drink:  r.drink,
			emoji:  r.emoji,
			color:  r.color,
			amount: r.amount,
			ts:     r.ts,
			date:   r.date
		}));

		const cloudIds  = new Set(cloudEntries.map(e => e.id));
		const localOnly = entries.filter(e => !cloudIds.has(e.id));
		entries = [...cloudEntries, ...localOnly].sort((a, b) => a.ts - b.ts);
		localStorage.setItem('dropsync_v3', JSON.stringify(entries));

		if (localOnly.length > 0) await pushToCloud();
		if (typeof updateUI === 'function') updateUI();
		if (typeof showToast === 'function') showToast('☁️ Data synced!');
	}
}

async function initAuth() {
	const { data: { session } } = await _supabase.auth.getSession();

	if (session) {
		currentUser = session.user;
		syncEnabled = true;
		if (window.location.hash.includes('access_token')) {
			history.replaceState(null, '', window.location.pathname);
		}
		await ensureUserSettings();
		await pullGoalFromCloud();
		await pullFromCloud();
	}

	updateAuthUI();

	_supabase.auth.onAuthStateChange(async (_event, session) => {
		const wasLoggedIn = !!currentUser;
		currentUser  = session?.user ?? null;
		syncEnabled  = !!currentUser;

		if (currentUser && !wasLoggedIn) {
			await ensureUserSettings();
			await pullGoalFromCloud();
			await pullFromCloud();
		}

		updateAuthUI();
	});
}

document.addEventListener('DOMContentLoaded', initAuth);