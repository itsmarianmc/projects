/*
	For DEVs: You have to replace the SUPABASE_URL and SUPABASE_KEY with your own Supabase project credentials.
	SUPABASE_URL: You can find your name in "Settings" > "General" in your Supabase project.
	SUPABASE_KEY: Your "anon public" key can be found in "Settings" > "API Keys" in your Supabase project.


	In your project, create these two tables (users and workout_sessions) with the following SQL commands:

	CREATE TABLE users (
		auth_id TEXT PRIMARY KEY,
		display_name TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT NOW()
	);

	and 

	CREATE TABLE workout_sessions (
		id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
		auth_id TEXT REFERENCES users(auth_id) ON DELETE CASCADE,
		day_of_week INTEGER NOT NULL,
		start_time TIME NOT NULL,
		end_time TIME NOT NULL,
		created_at TIMESTAMP DEFAULT NOW()
	);

	to add users to it, you have to use the following SQL command:

	INSERT INTO users (auth_id, display_name)
	VALUES ('Your-64-digit-unique-id', 'Your Display Name');
*/

const SUPABASE_URL = 'https://ffrwpggqonqbpoyilvwp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcndwZ2dxb25xYnBveWlsdndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MzEzMjcsImV4cCI6MjA3MTEwNzMyN30.6jmKgWtKiMK0HCRT1QUbNV3Ku2Ry8lLLm0e_m_Vim_8';

const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const userIdInput = document.getElementById('userId');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const weekGrid = document.getElementById('weekGrid');
const displayName = document.getElementById('displayName');
const userAvatar = document.getElementById('userAvatar');
const addSessionModal = document.getElementById('addSessionModal');
const closeModalBtn = addSessionModal.querySelector('.close-btn');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const selectedDayInput = document.getElementById('selectedDay');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');
const loadingIndicator = document.getElementById('loadingIndicator');

let supabase;
let currentUserId = '';
let currentUser = null;
let sessions = [];
let buddySessions = [];
const daysOfWeek = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function initApp() {
	const params = new URLSearchParams(window.location.search);
	const token = params.get('auth_token');
	if (token) {
		localStorage.setItem('gymBuddyUserId', token);
		window.location.href = window.location.pathname;
	}

	supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

	const savedUserId = localStorage.getItem('gymBuddyUserId');
	if (savedUserId) {
		userIdInput.value = savedUserId;
		login();
	} else {
		loginScreen.style.display = 'block';
		appContainer.style.display = 'none';
	}

	loginBtn.addEventListener('click', login);
	logoutBtn.addEventListener('click', logout);
	closeModalBtn.addEventListener('click', () => toggleModal(false));
	saveSessionBtn.addEventListener('click', saveSession);

	addSessionModal.addEventListener('click', (e) => {
		if (e.target === addSessionModal) toggleModal(false);
	});
}

async function login() {
	const userId = userIdInput.value.trim();

	if (userId.length !== 64) {
		showNotification('ID muss genau 64 Zeichen lang sein', 'error');
		return;
	}

	try {
		const {
			data: users,
			error
		} = await supabase
			.from('users')
			.select('*')
			.eq('auth_id', userId);

		if (error) throw error;

		if (users.length === 0) {
			showNotification('Diese ID ist nicht korrekt! Bitte überprüfe deine Eingabe oder versuche es erneut.', 'error');
			return;
		}

		const user = users[0];
		currentUserId = userId;
		currentUser = user;
		localStorage.setItem('gymBuddyUserId', userId);

		displayName.textContent = user.display_name;
		userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=random`;
		loginScreen.style.display = 'none';
		appContainer.style.display = 'flex';

		showNotification(`Willkommen zurück, ${user.display_name}!`, 'success');

		loadSessions();

	} catch (error) {
		console.error('Login error:', error);
		showNotification('Fehler beim Anmelden. Bitte versuche es später erneut.', 'error');
	}
}

function logout() {
	localStorage.removeItem('gymBuddyUserId');
	currentUserId = '';
	currentUser = null;
	sessions = [];
	buddySessions = [];

	appContainer.style.display = 'none';
	loginScreen.style.display = 'block';
	userIdInput.value = '';

	showNotification('Erfolgreich abgemeldet', 'success');
}

async function loadSessions() {
	loadingIndicator.style.display = 'flex';

	try {
		const {
			data: userSessions,
			error: userError
		} = await supabase
			.from('workout_sessions')
			.select('*')
			.eq('auth_id', currentUserId);

		if (userError) throw userError;

		sessions = userSessions || [];

		const {
			data: buddyData,
			error: buddyError
		} = await supabase
			.from('workout_sessions')
			.select('*, users!inner(display_name)')
			.neq('auth_id', currentUserId);

		if (buddyError) throw buddyError;

		buddySessions = buddyData || [];

		renderWeek();

	} catch (error) {
		console.error('Error loading sessions:', error);
		showNotification('Fehler beim Laden der Trainingszeiten', 'error');
	} finally {
		loadingIndicator.style.display = 'none';
	}
}

function renderWeek() {
	weekGrid.innerHTML = '';
	const today = new Date().getDay() - 1;
	const todayIndex = today < 0 ? 6 : today;

	daysOfWeek.forEach((day, index) => {
		const daySessions = sessions.filter(session => session.day_of_week === index);
		const buddyDaySessions = buddySessions.filter(session => session.day_of_week === index);

		const dayCard = document.createElement('div');
		dayCard.className = `day-card ${index === todayIndex ? 'today' : ''}`;
		dayCard.innerHTML = `
                    <div class="day-header">
                        <div class="day-title">
                            ${day}
                            ${index === todayIndex ? `<span class="day-indicator">Heute</span>` : ''}
                        </div>
                        <button class="add-btn" data-day="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="sessions">
                        ${renderSessionItems(daySessions, false)}
                        ${renderSessionItems(buddyDaySessions, true)}
                        
                        ${daySessions.length === 0 && buddyDaySessions.length === 0 ? `
                            <div class="empty-state">
                                <i class="fas fa-dumbbell"></i>
                                <p>Keine Trainingseinheiten</p>
                            </div>
                        ` : ''}
                    </div>
                `;

		weekGrid.appendChild(dayCard);
	});

	document.querySelectorAll('.add-btn').forEach(btn => {
		btn.addEventListener('click', () => openAddSessionModal(btn.dataset.day));
	});

	document.querySelectorAll('.delete-btn').forEach(btn => {
		btn.addEventListener('click', () => deleteSession(btn.dataset.id));
	});
}

function renderSessionItems(sessions, isBuddy) {
	if (sessions.length === 0) return '';

	return sessions.map(session => `
                <div class="session-item ${isBuddy ? 'buddy-time' : ''}">
                    <div class="session-time">
                        ${isBuddy ? `<i class="fas fa-user-friends"></i> ` : ''}
                        ${formatTime(session.start_time)} - ${formatTime(session.end_time)}
                        ${isBuddy ? `<br><small>${session.users?.display_name || 'Buddy'}</small>` : ''}
                    </div>
                    ${!isBuddy ? `
                        <button class="delete-btn" data-id="${session.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
							<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
							</svg>
                        </button>
                    ` : ''}
                </div>
            `).join('');
}

function openAddSessionModal(day) {
	selectedDayInput.value = day;
	startTimeInput.value = '';
	endTimeInput.value = '';
	toggleModal(true);
}

function toggleModal(show) {
	if (show) {
		addSessionModal.classList.add('show');
	} else {
		addSessionModal.classList.remove('show');
	}
}

async function saveSession() {
	const day = parseInt(selectedDayInput.value);
	const startTime = startTimeInput.value;
	const endTime = endTimeInput.value;

	if (!startTime || !endTime) {
		showNotification('Um eine neue Trainingseinheit zu erstellen, müssen alle Felder ausgefüllt sein!', 'error');
		return;
	}

	if (startTime >= endTime) {
		showNotification('Die Endzeit muss nach Startzeit liegen!', 'error');
		return;
	}

	try {
		const {
			data,
			error
		} = await supabase
			.from('workout_sessions')
			.insert([{
				auth_id: currentUserId,
				day_of_week: day,
				start_time: startTime,
				end_time: endTime
			}]);

		if (error) throw error;

		if (!data || data.length === 0) {
			const {
				data: newSession,
				error: fetchError
			} = await supabase
				.from('workout_sessions')
				.select('*')
				.eq('auth_id', currentUserId)
				.eq('day_of_week', day)
				.eq('start_time', startTime)
				.eq('end_time', endTime)
				.order('created_at', {
					ascending: false
				})
				.limit(1);

			if (fetchError) throw fetchError;

			if (newSession && newSession.length > 0) {
				sessions.push(newSession[0]);
				renderWeek();
				showNotification('Trainingszeit erfolgreich gespeichert', 'success');
			} else {
				throw new Error('Sitzung wurde erstellt, konnte aber nicht abgerufen werden');
			}
		} else {
			sessions.push({
				id: data[0].id,
				auth_id: currentUserId,
				day_of_week: day,
				start_time: startTime,
				end_time: endTime
			});

			renderWeek();
			showNotification('Trainingszeit erfolgreich gespeichert', 'success');
		}

		toggleModal(false);

	} catch (error) {
		console.error('Error saving session:', error);
		showNotification('Fehler beim Speichern der Zeit: ' + error.message, 'error');
	}
}

async function deleteSession(sessionId) {
	if (!confirm('Möchtest du diese Trainingszeit wirklich löschen? Dies kann nicht rückgängig gemacht werden')) return;

	try {
		const {
			error
		} = await supabase
			.from('workout_sessions')
			.delete()
			.eq('id', sessionId);

		if (error) throw error;

		sessions = sessions.filter(session => session.id !== sessionId);
		renderWeek();
		showNotification('Trainingszeit gelöscht', 'success');

	} catch (error) {
		console.error('Error deleting session:', error);
		showNotification('Fehler beim Löschen der Zeit', 'error');
	}
}

function formatTime(timeString) {
	if (!timeString) return '';
	const [hours, minutes] = timeString.split(':');
	return `${hours}:${minutes}`;
}

function showNotification(message, type) {
	notificationText.textContent = message;
	notification.className = `notification ${type}`;
	notification.classList.add('show');

	setTimeout(() => {
		notification.classList.remove('show');
	}, 3000);
}

let isSplashVisible = false;
let lastHiddenTime = 0;

const splashScreen = document.getElementById('splashScreen');

function showSplashScreen() {
	if (isSplashVisible) return;

	isSplashVisible = true;
	splashScreen.classList.remove('hidden');

	setTimeout(() => {
		splashScreen.classList.add('hidden');
		isSplashVisible = false;
	}, 2000);
}

document.addEventListener('DOMContentLoaded', function() {
	showSplashScreen();

	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			lastHiddenTime = Date.now();
		} else {
			const timeAway = Date.now() - lastHiddenTime;
			if (timeAway > 1000) {
				showSplashScreen();
			}
		}
	});

	window.addEventListener('focus', function() {
		if (lastHiddenTime > 0) {
			const timeAway = Date.now() - lastHiddenTime;
			if (timeAway > 1000) {
				showSplashScreen();
			}
		}
	});
});

document.addEventListener('resume', function() {
	showSplashScreen();
});

window.addEventListener('blur', function() {
	lastHiddenTime = Date.now();
});

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('sw.js').then(registration => {
			console.log('ServiceWorker registered with scope:', registration.scope);
		}).catch(error => {
			console.log('ServiceWorker registration failed:', error);
		});
	});
}

initApp();