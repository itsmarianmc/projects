const SUPABASE_URL = 'https://stuqtqlkantewwxhwitg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nNq-PUIq-C-q5OREGoEquA_XmLrOr-r';
const REDIRECT_URI = window.location.origin + window.location.pathname;

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let syncEnabled = false;

function loginWithDiscord() {
	_supabase.auth.signInWithOAuth({
		provider: 'discord',
		options: {
			redirectTo: REDIRECT_URI
		}
	});
}

async function logoutUser() {
	await _supabase.auth.signOut();
	currentUser = null;
	syncEnabled = false;
	updateAuthUI();
	showToast('👋 Logged out');
}

async function initAuth() {
	const {
		data: {
			session
		}
	} = await _supabase.auth.getSession();

	if (session) {
		currentUser = session.user;
		syncEnabled = true;
		if (window.location.hash.includes('access_token')) {
			history.replaceState(null, '', window.location.pathname);
		}
		await ensureUserSettings();
		await pullGoalFromCloud();
		await pullFromCloud();
		if (typeof applyDiscordName === 'function') applyDiscordName(currentUser);
	}

	updateAuthUI();

	_supabase.auth.onAuthStateChange(async (_event, session) => {
		const wasLoggedIn = !!currentUser;
		currentUser = session?.user ?? null;
		syncEnabled = !!currentUser;

		if (currentUser && !wasLoggedIn) {
			await ensureUserSettings();
			await pullGoalFromCloud();
			await pullFromCloud();
			if (typeof applyDiscordName === 'function') applyDiscordName(currentUser);
		}

		updateAuthUI();
	});
}

function updateAuthUI() {
	const loginBtn = document.getElementById('discordLoginBtn');
	const logoutBtn = document.getElementById('discordLogoutBtn');
	const userInfo = document.getElementById('authUserInfo');
	const syncBadge = document.getElementById('syncStatusBadge');

	if (!loginBtn) return;

	if (currentUser) {
		const meta = currentUser.user_metadata;
		const name = meta?.full_name || meta?.name || 'User';
		const avatar = meta?.avatar_url;

		loginBtn.classList.add('hidden');
		logoutBtn.classList.remove('hidden');

		if (userInfo) {
			userInfo.innerHTML = avatar ?
				`<img src="${avatar}" class="auth-avatar" alt=""> <span>${name}</span>` :
				`<span>${name}</span>`;
			userInfo.classList.remove('hidden');
		}
		if (syncBadge) {
			syncBadge.textContent = 'Synced';
			syncBadge.classList.add('active');
		}
	} else {
		loginBtn.classList.remove('hidden');
		logoutBtn.classList.add('hidden');
		if (userInfo) userInfo.classList.add('hidden');
		if (syncBadge) {
			syncBadge.textContent = 'Not synced';
			syncBadge.classList.remove('active');
		}
	}
}

async function pushToCloud() {
	if (!syncEnabled || !currentUser) return;

	const payload = entries.map(e => ({
		user_id: currentUser.id,
		entry_id: e.id,
		drink: e.drink,
		emoji: e.emoji,
		color: e.color,
		amount: e.amount,
		ts: e.ts,
		date: e.date
	}));

	const {
		error
	} = await _supabase
		.from('entries')
		.upsert(payload, {
			onConflict: 'user_id,entry_id'
		});

	if (error) console.error('[DropSync] Push error:', error.message);
}

async function deleteFromCloud(entryId) {
	if (!syncEnabled || !currentUser) return;
	const {
		error
	} = await _supabase
		.from('entries')
		.delete()
		.eq('user_id', currentUser.id)
		.eq('entry_id', entryId);
	if (error) console.error('[DropSync] Delete error:', error.message);
}

async function pullFromCloud() {
	if (!syncEnabled || !currentUser) return;

	const {
		data,
		error
	} = await _supabase
		.from('entries')
		.select('*')
		.eq('user_id', currentUser.id)
		.order('ts', {
			ascending: true
		});

	if (error) {
		console.error('[DropSync] Pull error:', error.message);
		return;
	}

	if (data && data.length > 0) {
		const cloudEntries = data.map(r => ({
			id: r.entry_id,
			drink: r.drink,
			emoji: r.emoji,
			color: r.color,
			amount: r.amount,
			ts: r.ts,
			date: r.date
		}));

		const cloudIds = new Set(cloudEntries.map(e => e.id));
		const localOnly = entries.filter(e => !cloudIds.has(e.id));
		entries = [...cloudEntries, ...localOnly].sort((a, b) => a.ts - b.ts);
		localStorage.setItem('dropsync_v3', JSON.stringify(entries));

		if (localOnly.length > 0) await pushToCloud();
		if (typeof updateUI === 'function') updateUI();
		showToast('☁️ Data synced!');
	}
}

async function ensureUserSettings() {
	if (!syncEnabled || !currentUser) return;
	const currentGoal = parseInt(localStorage.getItem('dropsync_goal') || '2500');
	const {
		error
	} = await _supabase
		.from('user_settings')
		.upsert({
			user_id: currentUser.id,
			goal_ml: currentGoal
		}, {
			onConflict: 'user_id',
			ignoreDuplicates: true
		});
	if (error) console.error('[DropSync] ensureUserSettings error:', error.message);
}

async function pushGoalToCloud(ml) {
	if (!syncEnabled || !currentUser) return;
	const {
		error
	} = await _supabase
		.from('user_settings')
		.upsert({
			user_id: currentUser.id,
			goal_ml: ml
		}, {
			onConflict: 'user_id'
		});
	if (error) console.error('[DropSync] Goal push error:', error.message);
}

async function pullGoalFromCloud() {
	if (!syncEnabled || !currentUser) return;
	const {
		data,
		error
	} = await _supabase
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

document.addEventListener('DOMContentLoaded', initAuth);
