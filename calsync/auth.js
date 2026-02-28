const SUPABASE_URL = 'https://stuqtqlkantewwxhwitg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nNq-PUIq-C-q5OREGoEquA_XmLrOr-r';
const REDIRECT_URI = window.location.origin + window.location.pathname;

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let syncEnabled = false;

function loginWithDiscord() {
	_supabase.auth.signInWithOAuth({
		provider: 'discord',
		options: { redirectTo: REDIRECT_URI }
	});
}

async function logoutUser() {
	await _supabase.auth.signOut();
	currentUser = null;
	syncEnabled = false;
	updateAuthUI();
	showToast('👋 Logged out');
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
			userInfo.innerHTML = avatar ? `<img src="${avatar}" class="auth-avatar" alt=""> <span>${name}</span>` : `<span>${name}</span>`;
			userInfo.classList.remove('hidden');
		}
		if (syncBadge) { syncBadge.textContent = 'Synced'; syncBadge.classList.add('active'); }
	} else {
		loginBtn.classList.remove('hidden');
		logoutBtn.classList.add('hidden');
		if (userInfo) userInfo.classList.add('hidden');
		if (syncBadge) { syncBadge.textContent = 'Not synced'; syncBadge.classList.remove('active'); }
	}
}

async function ensureUserSettings() {
	if (!syncEnabled || !currentUser) return;
	const currentGoal = parseInt(localStorage.getItem('calsync_goal') || '2000');
	const { error } = await _supabase
		.from('user_settings')
		.upsert(
			{ user_id: currentUser.id, goal_ml: currentGoal },
			{ onConflict: 'user_id', ignoreDuplicates: true }
		);
	if (error) console.error('[CalSync] ensureUserSettings error:', error.message);
}

async function pushGoalToCloud(kcal) {
	if (!syncEnabled || !currentUser) return;
	const { error } = await _supabase
		.from('user_settings')
		.upsert(
			{ user_id: currentUser.id, goal_ml: kcal },
			{ onConflict: 'user_id' }
		);
	if (error) console.error('[CalSync] Goal push error:', error.message);
}

async function pullGoalFromCloud() {
	if (!syncEnabled || !currentUser) return;
	const { data, error } = await _supabase
		.from('user_settings')
		.select('goal_ml')
		.eq('user_id', currentUser.id)
		.maybeSingle();
	if (error) {
		console.error('[CalSync] Goal pull error:', error.message);
		return;
	}
	if (data?.goal_ml && typeof setGoal === 'function') {
		setGoal(data.goal_ml);
	}
}

async function pushToCloud() {
	if (!syncEnabled || !currentUser) return;

	const foodEntries = entries.filter(e => !e.barcode || e.barcode === '');

	const payload = foodEntries.map(e => ({
		user_id: currentUser.id,
		entry_id: e.id,
		food: e.food,
		brand: e.brand || null,
		kcal: e.kcal,
		amount: e.amount || null,
		unit: e.unit || null,
		prot: e.prot || null,
		carb: e.carb || null,
		fat: e.fat || null,
		barcode: e.barcode || null,
		ts: e.ts,
		date: e.date
	}));

	if (payload.length === 0) return;

	const { error } = await _supabase
		.from('calsync_entries')
		.upsert(payload, { onConflict: 'user_id,entry_id' });

	if (error) console.error('[CalSync] Push error:', error.message);
}

async function deleteFromCloud(entryId) {
	if (!syncEnabled || !currentUser) return;

	const { error } = await _supabase
		.from('calsync_entries')
		.delete()
		.eq('user_id', currentUser.id)
		.eq('entry_id', entryId);

	if (error) console.error('[CalSync] Delete error:', error.message);
}

async function pullFromCloud() {
	if (!syncEnabled || !currentUser) return;

	try {
		const { data: foodData, error: foodError } = await _supabase
			.from('calsync_entries')
			.select('*')
			.eq('user_id', currentUser.id)
			.order('ts', { ascending: true });

		if (foodError) {
			console.error('[CalSync] Pull food error:', foodError.message);
			return;
		}

		const { data: drinkData, error: drinkError } = await _supabase
			.from('entries')
			.select('*')
			.eq('user_id', currentUser.id)
			.not('emoji', 'is', null)
			.order('ts', { ascending: true });

		if (drinkError) {
			console.error('[CalSync] Pull drinks error:', drinkError.message);
		}

		const cloudFoodEntries = foodData ? foodData.map(r => ({
			id: r.entry_id,
			food: r.food,
			brand: r.brand || '',
			kcal: r.kcal,
			amount: r.amount || 0,
			unit: r.unit || 'g',
			prot: r.prot || 0,
			carb: r.carb || 0,
			fat: r.fat || 0,
			barcode: r.barcode || '',
			ts: r.ts,
			date: r.date
		})) : [];

		const cloudDrinkEntries = drinkData ? drinkData
			.filter(r => {
				const drinkText = r.drink || '';
				return drinkText.includes('|') && /\d{8,}/.test(drinkText);
			})
			.map(r => {
				const drinkText = r.drink || '';
				const parts = drinkText.split('|').map(p => p.trim());
				const foodName = parts[0] || 'Unknown drink';
				const barcode = parts[1] || '';

				return {
					id: r.entry_id,
					food: foodName,
					brand: '',
					kcal: r.amount || 0,
					amount: r.amount || 0,
					unit: 'ml',
					prot: 0,
					carb: 0,
					fat: 0,
					barcode: barcode,
					emoji: r.emoji,
					color: r.color,
					ts: r.ts,
					date: r.date,
					isFromDropSync: true
				};
			}) : [];

		const allCloudEntries = [...cloudFoodEntries, ...cloudDrinkEntries];

		if (allCloudEntries.length === 0) return;

		const cloudIds = new Set(allCloudEntries.map(e => e.id));
		const localOnly = entries.filter(e => !cloudIds.has(e.id));

		entries = [...allCloudEntries, ...localOnly].sort((a, b) => a.ts - b.ts);
		localStorage.setItem('calsync_v1', JSON.stringify(entries));

		if (localOnly.length > 0) {
			await pushToCloud();
		}

		if (typeof updateUI === 'function') updateUI();

		const totalSynced = allCloudEntries.length;
		showToast(`☁️ ${totalSynced} entries synced!`);

	} catch (err) {
		console.error('[CalSync] Pull error:', err);
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
		currentUser = session?.user ?? null;
		syncEnabled = !!currentUser;
		if (currentUser && !wasLoggedIn) {
			await ensureUserSettings();
			await pullGoalFromCloud();
			await pullFromCloud();
		}
		updateAuthUI();
	});
}

document.addEventListener('DOMContentLoaded', initAuth);