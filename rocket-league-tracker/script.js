document.addEventListener('DOMContentLoaded', function() {
	let entries = [];
	const STORAGE_KEY = 'rlTrackerEntries';

	const entryListDiv = document.getElementById('entryList');
	const btnWin = document.getElementById('btnWin');
	const btnLoss = document.getElementById('btnLoss');
	const modalOverlay = document.getElementById('modalOverlay');
	const closeModalBtn = document.getElementById('closeModalBtn');
	const modalTitle = document.getElementById('modalTitle');
	const goalsForInput = document.getElementById('goalsFor');
	const goalsAgainstInput = document.getElementById('goalsAgainst');
	const commentField = document.getElementById('commentField');
	const commentLabel = document.getElementById('commentLabel');
	const hintMessage = document.getElementById('hintMessage');
	const saveBtn = document.getElementById('saveEntryBtn');
	const footer = document.querySelector('footer');

	const streakValue = document.getElementById('streakValue');
	const streakType = document.getElementById('streakType');
	const winRateValue = document.getElementById('winRateValue');
	const winLossCount = document.getElementById('winLossCount');

	let currentMode = 'win';

	function loadEntries() {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				entries = JSON.parse(stored);
			} catch (e) {
				entries = [];
			}
		} else {
			entries = [];
		}
	}

	function saveEntries() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	}

	function updateStats() {
		if (entries.length === 0) {
			streakValue.textContent = '0';
			streakType.textContent = '-';
			winRateValue.textContent = '0%';
			winLossCount.textContent = '0W 0L';
			return;
		}

		const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

		let streak = 1;
		const firstType = sorted[0].type;
		for (let i = 1; i < sorted.length; i++) {
			if (sorted[i].type === firstType) {
				streak++;
			} else {
				break;
			}
		}
		streakValue.textContent = streak;
		streakType.textContent = firstType === 'win' ? 'Wins' : 'Losses';

		const wins = entries.filter(e => e.type === 'win').length;
		const losses = entries.filter(e => e.type === 'loss').length;
		const total = wins + losses;
		const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
		winRateValue.textContent = winRate + '%';
		winLossCount.textContent = `${wins}W ${losses}L`;
	}

	function renderEntry(entry) {
		const dateObj = new Date(entry.date);
		const dateStr = dateObj.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
		const timeStr = dateObj.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});

		const isWin = entry.type === 'win';
		const symbolClass = isWin ? 'win' : 'loss';
		const sign = isWin ? '+' : '−';
		const labelText = isWin ? 'WIN' : 'LOSS';

		const card = document.createElement('div');
		card.className = 'entry-card';

		const datetimeIcon = '<i class="fas fa-clock"></i>';
		const scoreIcon = '<i class="fas fa-futbol"></i>';
		const commentIcon = '<i class="fas fa-comment"></i>';
		const deleteIcon = '<i class="fas fa-trash"></i>';

		card.innerHTML = `
			<div class="entry-symbol ${symbolClass}">
				<span class="sign">${sign}</span>
				<span class="label">${labelText}</span>
			</div>
			<div class="entry-info">
				<div class="entry-datetime">${datetimeIcon} ${dateStr} ${timeStr}</div>
				<div class="entry-score">${scoreIcon} ${entry.goalsFor} : ${entry.goalsAgainst}</div>
				${entry.comment ? `<div class="entry-comment">${commentIcon} ${entry.comment}</div>` : ''}
			</div>
			<div class="entry-actions">
				<span class="delete-entry" data-id="${entry.id}" title="Eintrag löschen">${deleteIcon}</span>
			</div>
		`;

		return card;
	}

	function renderAllEntries() {
		entryListDiv.innerHTML = '';
		if (entries.length === 0) {
			entryListDiv.innerHTML = `<div class="empty-message">
				<i class="fas fa-plus-circle"></i>
				<div>Keine Einträge.<br>Klick + oder - um zu starten.</div>
			</div>`;
		} else {
			const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
			sorted.forEach(e => entryListDiv.appendChild(renderEntry(e)));
		}
		updateStats();
	}

	function deleteEntryById(id) {
		if (!id) return;
		const confirmDelete = confirm('Diesen Eintrag wirklich löschen?');
		if (!confirmDelete) return;

		entries = entries.filter(e => e.id !== id);
		saveEntries();
		renderAllEntries();
	}

	function deleteAllEntries() {
		if (entries.length === 0) return;
		const confirmDelete = confirm('Wirklich ALLE Einträge löschen?');
		if (!confirmDelete) return;

		entries = [];
		saveEntries();
		renderAllEntries();
	}

	function openModal(mode) {
		currentMode = mode;
		const titleSpan = modalTitle;
		if (mode === 'win') {
			titleSpan.innerHTML = '<i class="fas fa-trophy"></i> WIN';
			titleSpan.className = 'modal-title win';
			commentLabel.innerHTML = '<i class="fas fa-comment"></i> Kommentar (optional)';
			hintMessage.innerHTML = '';
		} else {
			titleSpan.innerHTML = '<i class="fas fa-heart-broken"></i> LOSS';
			titleSpan.className = 'modal-title loss';
			commentLabel.innerHTML = '<i class="fas fa-comment"></i> Warum hast du verloren?';
			hintMessage.innerHTML = '<i class="fas fa-chart-line"></i> analyse fürs nächste spiel';
		}

		goalsForInput.value = 0;
		goalsAgainstInput.value = 0;
		commentField.value = '';

		modalOverlay.classList.add('show');
		goalsForInput.focus();
	}

	function closeModal() {
		modalOverlay.classList.remove('show');
	}

	function saveEntry() {
		const goalsFor = parseInt(goalsForInput.value, 10);
		const goalsAgainst = parseInt(goalsAgainstInput.value, 10);
		const comment = commentField.value.trim();

		const validFor = isNaN(goalsFor) ? 0 : goalsFor;
		const validAgainst = isNaN(goalsAgainst) ? 0 : goalsAgainst;

		const newEntry = {
			id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
			type: currentMode,
			date: new Date().toISOString(),
			goalsFor: validFor,
			goalsAgainst: validAgainst,
			comment: comment
		};

		entries.push(newEntry);
		saveEntries();
		renderAllEntries();
		closeModal();
	}

	function init() {
		loadEntries();
		renderAllEntries();

		btnWin.addEventListener('click', () => openModal('win'));
		btnLoss.addEventListener('click', () => openModal('loss'));

		closeModalBtn.addEventListener('click', closeModal);
		modalOverlay.addEventListener('click', (e) => {
			if (e.target === modalOverlay) closeModal();
		});

		saveBtn.addEventListener('click', saveEntry);

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
				closeModal();
			}
		});

		entryListDiv.addEventListener('click', (e) => {
			const deleteBtn = e.target.closest('.delete-entry');
			if (deleteBtn) {
				const id = deleteBtn.getAttribute('data-id');
				deleteEntryById(id);
			}
		});

		if (footer && !document.getElementById('deleteAllBtn')) {
			const deleteAllBtn = document.createElement('button');
			deleteAllBtn.id = 'deleteAllBtn';
			deleteAllBtn.className = 'delete-all-btn';
			deleteAllBtn.innerHTML = '<i class="fas fa-trash"></i> Alle löschen';
			deleteAllBtn.addEventListener('click', deleteAllEntries);
			footer.appendChild(deleteAllBtn);

			deleteAllBtn.style.background = 'var(--surface3)';
			deleteAllBtn.style.border = '1px solid var(--border)';
			deleteAllBtn.style.color = 'var(--text2)';
			deleteAllBtn.style.padding = '0.5rem 1rem';
			deleteAllBtn.style.borderRadius = 'var(--radius-sm)';
			deleteAllBtn.style.cursor = 'pointer';
			deleteAllBtn.style.marginLeft = '1rem';
			deleteAllBtn.style.fontSize = '0.9rem';
			deleteAllBtn.style.transition = '0.1s';
			deleteAllBtn.addEventListener('mouseenter', () => {
				deleteAllBtn.style.background = 'var(--accent-loss)';
				deleteAllBtn.style.color = '#fff';
			});
			deleteAllBtn.addEventListener('mouseleave', () => {
				deleteAllBtn.style.background = 'var(--surface3)';
				deleteAllBtn.style.color = 'var(--text2)';
			});
		}
	}

	init();
});