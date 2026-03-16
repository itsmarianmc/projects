const SUPABASE_URL = 'https://stuqtqlkantewwxhwitg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nNq-PUIq-C-q5OREGoEquA_XmLrOr-r';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let syncEnabled = false;

(function() {
	if (document.getElementById('_calsync_auth_style')) return;
	const s = document.createElement('style');
	s.id = '_calsync_auth_style';
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

document.getElementById('accountLoginBtn').addEventListener('click', function() {
	window.open('/login/?signinginto=calsync', '_parent')
})

document.getElementById('manageAccount').addEventListener('click', function() {
	window.open('/login/?keep_login_page=true', '_parent')
})

function updateAuthUI() {
	const loginBtn  = document.getElementById('loginBtn')  || document.getElementById('accountLoginBtn');
	const loggedInSettings = document.getElementById('loggedInSettings');
	const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('accountLogoutBtn');
	const userInfo  = document.getElementById('authUserInfo');
	const syncBadge = document.getElementById('syncStatusBadge');

	if (!loginBtn && !logoutBtn) return;

	if (currentUser) {
		const name   = getUserDisplayName(currentUser);
		const avatar = currentUser.user_metadata?.avatar_url;

		if (loginBtn) {
			loggedInSettings.classList.remove('hidden');
			loginBtn.classList.add('hidden');
		}
		if (logoutBtn) logoutBtn.classList.remove('hidden');

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
		if (loginBtn) {
			loggedInSettings.classList.add('hidden');
			loginBtn.classList.remove('hidden');
		}
		if (logoutBtn) logoutBtn.classList.add('hidden');
		if (userInfo)  userInfo.classList.add('hidden');

		if (syncBadge) {
			syncBadge.textContent = 'Not synced';
			syncBadge.classList.remove('active');
		}
	}
}

function redirectToLogin() {
	window.location.href = './login.html';
}

async function logoutUser() {
	await _supabase.auth.signOut();
	currentUser = null;
	syncEnabled = false;
	updateAuthUI();
	if (typeof showToast === 'function') showToast('👋 Logged out');
	setTimeout(() => {window.open('/login/?signinginto=calsync', '_parent')}, 1000);
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
		user_id:  currentUser.id,
		entry_id: e.id,
		food:     e.food,
		brand:    e.brand  || null,
		kcal:     e.kcal,
		amount:   e.amount || null,
		unit:     e.unit   || null,
		prot:     e.prot   || null,
		carb:     e.carb   || null,
		fat:      e.fat    || null,
		barcode:  e.barcode|| null,
		ts:       e.ts,
		date:     e.date
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

		const cloudFoodEntries = (foodData || []).map(r => ({
			id:      r.entry_id,
			food:    r.food,
			brand:   r.brand   || '',
			kcal:    r.kcal,
			amount:  r.amount  || 0,
			unit:    r.unit    || 'g',
			prot:    r.prot    || 0,
			carb:    r.carb    || 0,
			fat:     r.fat     || 0,
			barcode: r.barcode || '',
			ts:      r.ts,
			date:    r.date
		}));

		const cloudDrinkEntries = (drinkData || [])
			.filter(r => {
				const t = r.drink || '';
				return t.includes('|') && /\d{8,}/.test(t);
			})
			.map(r => {
				const parts    = (r.drink || '').split('|').map(p => p.trim());
				const foodName = parts[0] || 'Unknown drink';
				const barcode  = parts[1] || '';
				return {
					id:              r.entry_id,
					food:            foodName,
					brand:           '',
					kcal:            r.amount || 0,
					amount:          r.amount || 0,
					unit:            'ml',
					prot: 0, carb: 0, fat: 0,
					barcode,
					emoji:           r.emoji,
					color:           r.color,
					ts:              r.ts,
					date:            r.date,
					isFromDropSync:  true
				};
			});

		const allCloudEntries = [...cloudFoodEntries, ...cloudDrinkEntries];
		if (allCloudEntries.length === 0) return;

		const cloudIds  = new Set(allCloudEntries.map(e => e.id));
		const localOnly = entries.filter(e => !cloudIds.has(e.id));

		entries = [...allCloudEntries, ...localOnly].sort((a, b) => a.ts - b.ts);
		localStorage.setItem('calsync_v1', JSON.stringify(entries));

		if (localOnly.length > 0) await pushToCloud();
		if (typeof updateUI === 'function') updateUI();

		if (typeof showToast === 'function') showToast(`☁️ ${allCloudEntries.length} entries synced!`);

	} catch (err) {
		console.error('[CalSync] Pull error:', err);
	}
}

async function initAuth() {
	const { data: { session } } = await _supabase.auth.getSession();

	if (session) {
		currentUser  = session.user;
		syncEnabled  = true;
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