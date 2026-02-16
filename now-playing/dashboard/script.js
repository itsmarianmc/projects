const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

sidebarToggle.addEventListener('click', () => {
	sidebar.classList.toggle('open');
	sidebarOverlay.classList.toggle('show');
});

sidebarOverlay.addEventListener('click', () => {
	sidebar.classList.remove('open');
	sidebarOverlay.classList.remove('show');
});

const docsMenu = document.getElementById('docsMenu');
const docsToggle = docsMenu.querySelector('.nav-link');
docsToggle.addEventListener('click', (e) => {
	e.preventDefault();
	docsMenu.classList.toggle('open');
});

const apiMenu = document.getElementById('apiMenu');
const apiToggle = apiMenu.querySelector('.nav-link');
apiToggle.addEventListener('click', (e) => {
	e.preventDefault();
	apiMenu.classList.toggle('open');
});

const navLinks = document.querySelectorAll('[data-section]');
const contentSections = document.querySelectorAll('.content-section');

navLinks.forEach(link => {
	link.addEventListener('click', (e) => {
		e.preventDefault();
		const targetSection = link.getAttribute('data-section');

		navLinks.forEach(l => l.classList.remove('active'));
		link.classList.add('active');

		contentSections.forEach(section => {
			section.classList.remove('active');
		});
		document.getElementById(targetSection).classList.add('active');

		sidebar.classList.remove('open');
		sidebarOverlay.classList.remove('show');
	});
});

window.addEventListener('DOMContentLoaded', () => {
	const saved = localStorage.getItem('spotifyCredentials');
	if (saved) {
		const credentials = JSON.parse(saved);
		document.getElementById('clientId').value = credentials.clientId || '';
		document.getElementById('clientSecret').value = credentials.clientSecret || '';
		document.getElementById('refreshToken').value = credentials.refreshToken || '';
	}
});

document.getElementById('setupForm').addEventListener('submit', async (e) => {
	e.preventDefault();

	const submitBtn = document.getElementById('submitBtn');
	const errorEl = document.getElementById('errorMessage');
	const successEl = document.getElementById('successMessage');

	errorEl.classList.remove('show');
	successEl.classList.remove('show');

	const clientId = document.getElementById('clientId').value.trim();
	const clientSecret = document.getElementById('clientSecret').value.trim();
	const refreshToken = document.getElementById('refreshToken').value.trim();

	if (!clientId || !clientSecret || !refreshToken) {
		showError('Bitte fülle alle Felder aus');
		return;
	}

	submitBtn.disabled = true;
	submitBtn.innerHTML = '<span class="loading-spinner"></span>';

	try {
		const credentials = {
			clientId,
			clientSecret,
			refreshToken
		};
		localStorage.setItem('spotifyCredentials', JSON.stringify(credentials));
		setTimeout(() => {
			successEl.classList.add('show');
			submitBtn.innerHTML = 'Save';
			submitBtn.disabled = false;
			setTimeout(() => {
				successEl.classList.remove('show');
			}, 3000);
		}, 1000);
	} catch (error) {
		console.error('Error saving credentials:', error);
	}
});

function showError(message) {
	const errorEl = document.getElementById('errorMessage');
	errorEl.textContent = message;
	errorEl.classList.add('show');
}

document.querySelectorAll('.copy-btn').forEach(btn => {
	btn.addEventListener('click', async (e) => {
		e.preventDefault();
		const targetId = btn.getAttribute('data-copy-target');
		const text = document.getElementById(targetId).value;
		
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const textArea = document.createElement('textarea');
				textArea.value = text;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
			}
			const originalHTML = btn.innerHTML;
			btn.innerHTML = '<svg height="34" viewBox="0 -960 960 960" width="34" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>';
			setTimeout(() => {
				btn.innerHTML = originalHTML;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	});
});