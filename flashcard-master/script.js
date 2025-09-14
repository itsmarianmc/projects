let sets = JSON.parse(localStorage.getItem('flashcardSets')) || [];
let currentSetId = null;
let currentSetColor = '#4361ee';
let trainingCards = [];
let currentCardIndex = 0;
let knownCards = [];
let unknownCards = [];
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let isEditingSet = false;
let isEditingCard = false;
let currentCardId = null;
let isDragging = false;
let startX = 0;
let currentX = 0;
let dragThreshold = 0.25;

const landingPage = document.getElementById('landing-page');
const setsList = document.getElementById('sets-list');
const overlay = document.getElementById('overlay');
const setDrawer = document.getElementById('set-drawer');
const drawerSetName = document.getElementById('drawer-set-name');
const drawerSetCategory = document.getElementById('drawer-set-category');
const drawerSetDescription = document.getElementById('drawer-set-description');
const cardsList = document.getElementById('cards-list');
const trainingContainer = document.getElementById('training-container');
const flashcard = document.getElementById('flashcard');
const flashcardInner = document.querySelector('.flashcard-inner');
const cardQuestion = document.getElementById('card-question');
const cardAnswer = document.getElementById('card-answer');
const cardHint = document.getElementById('card-hint');
const progress = document.getElementById('progress');
const results = document.getElementById('results');
const correctCount = document.getElementById('correct-count');
const totalCount = document.getElementById('total-count');
const themeToggle = document.getElementById('theme-toggle');
const setModalOverlay = document.getElementById('set-modal-overlay');
const setModal = document.getElementById('set-modal');
const cardModalOverlay = document.getElementById('card-modal-overlay');
const cardModal = document.getElementById('card-modal');
const modalTitle = document.getElementById('modal-title');
const cardModalTitle = document.getElementById('card-modal-title');
const modalSaveBtn = document.getElementById('modal-save-btn');
const cardModalSaveBtn = document.getElementById('card-modal-save-btn');
const backButton = document.getElementById('back-button');
const addCardButton = document.getElementById('add-card-button');
const importSetButton = document.getElementById('import-set-button');
const importFileInput = document.getElementById('import-file-input');
const exportSetButton = document.getElementById('export-set-btn');
const exportAllButton = document.getElementById('export-all-button');
const knownFeedback = document.querySelector('.drag-feedback.known');
const unknownFeedback = document.querySelector('.drag-feedback.unknown');

document.getElementById('create-set-button').addEventListener('click', () => openSetModal());
document.getElementById('start-training-btn').addEventListener('click', startTraining);
document.querySelectorAll('.close-btn').forEach(btn => {
	btn.addEventListener('click', closeDrawer);
});
document.querySelectorAll('.modal-close').forEach(btn => {
	btn.addEventListener('click', closeModals);
});
setModalOverlay.addEventListener('click', closeModals);
cardModalOverlay.addEventListener('click', closeModals);
overlay.addEventListener('click', closeDrawer);
flashcard.addEventListener('click', flipCard);
document.getElementById('known-btn').addEventListener('click', () => handleSwipe('right'));
document.getElementById('unknown-btn').addEventListener('click', () => handleSwipe('left'));
document.getElementById('restart-training-btn').addEventListener('click', restartTraining);
document.getElementById('retry-unknown-btn').addEventListener('click', retryUnknownCards);
document.getElementById('back-to-sets-btn').addEventListener('click', backToSets);
document.getElementById('back-button').addEventListener('click', backToSetsFromTraining);
themeToggle.addEventListener('click', toggleTheme);
modalSaveBtn.addEventListener('click', saveSetFromModal);
cardModalSaveBtn.addEventListener('click', saveCardFromModal);
document.getElementById('edit-set-btn').addEventListener('click', () => openSetModal(true));
document.getElementById('delete-set-btn').addEventListener('click', deleteCurrentSet);
addCardButton.addEventListener('click', () => openCardModal());
importSetButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', handleFileImport);
exportSetButton.addEventListener('click', exportCurrentSet);
exportAllButton.addEventListener('click', exportAllSets);

flashcard.addEventListener('mousedown', startDrag);
flashcard.addEventListener('touchstart', startDrag, {
	passive: false
});

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag, {
	passive: false
});

document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function startDrag(e) {
	if (!trainingContainer.classList.contains('active')) return;

	isDragging = true;
	startX = e.clientX || e.touches[0].clientX;
	flashcard.style.transition = 'none';
	flashcardInner.style.transition = 'none';

	flashcard.style.cursor = 'grabbing';
}

function drag(e) {
	if (!isDragging) return;

	e.preventDefault();
	currentX = e.clientX || e.touches[0].clientX;
	const dragX = currentX - startX;
	const width = flashcard.offsetWidth;

	flashcard.style.transform = `translateX(${dragX}px)`;

	const rotate = dragX * 0.1;
	flashcard.style.transform = `translateX(${dragX}px) rotate(${rotate}deg)`;

	if (dragX > width * dragThreshold) {
		knownFeedback.classList.add('visible');
		unknownFeedback.classList.remove('visible');
	} else if (dragX < -width * dragThreshold) {
		unknownFeedback.classList.add('visible');
		knownFeedback.classList.remove('visible');
	} else {
		knownFeedback.classList.remove('visible');
		unknownFeedback.classList.remove('visible');
	}
}

function endDrag(e) {
	if (!isDragging) return;

	isDragging = false;
	const dragX = (e.clientX || e.changedTouches[0].clientX) - startX;
	const width = flashcard.offsetWidth;

	knownFeedback.classList.remove('visible');
	unknownFeedback.classList.remove('visible');

	flashcard.style.cursor = 'grab';

	flashcard.style.transition = 'transform 0.3s ease';
	flashcardInner.style.transition = 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)';

	if (dragX > width * dragThreshold) {
		handleSwipe('right');
	} else if (dragX < -width * dragThreshold) {
		handleSwipe('left');
	} else {
		flashcard.style.transform = '';
	}
}

function exportCurrentSet() {
	if (!currentSetId) return;
	const set = sets.find(s => s.id === currentSetId);
	if (set) {
		const dataStr = JSON.stringify(set, null, 2);
		const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
		const exportFileDefaultName = set.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';

		const linkElement = document.createElement('a');
		linkElement.setAttribute('href', dataUri);
		linkElement.setAttribute('download', exportFileDefaultName);
		linkElement.click();
	}
}

function exportAllSets() {
	const dataStr = JSON.stringify(sets, null, 2);
	const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
	const exportFileDefaultName = 'flashcard_sets.json';

	const linkElement = document.createElement('a');
	linkElement.setAttribute('href', dataUri);
	linkElement.setAttribute('download', exportFileDefaultName);
	linkElement.click();
}

function handleFileImport(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const importedData = JSON.parse(e.target.result);

			if (Array.isArray(importedData)) {
				importedData.forEach(set => {
					set.id = Date.now().toString() + Math.floor(Math.random() * 1000);
					set.cards = set.cards.map(card => ({
						...card,
						id: Date.now().toString() + Math.floor(Math.random() * 1000)
					}));
					sets.push(set);
				});
			} else {
				importedData.id = Date.now().toString();
				importedData.cards = importedData.cards.map(card => ({
					...card,
					id: Date.now().toString() + Math.floor(Math.random() * 1000)
				}));
				sets.push(importedData);
			}

			saveSets();
			renderSets();
			alert('Import erfolgreich!');
            
			event.target.value = '';
		} catch (error) {
			alert('Fehler beim Import: ' + error.message);
			console.error('Import error:', error);
		}
	};
	reader.readAsText(file);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    updateTheme();
}

function updateTheme() {
    if (localStorage.getItem('darkMode') === null) {
        isDarkMode = true;
        localStorage.setItem('darkMode', 'true');
    }
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function setupColorSelection() {
	document.querySelectorAll('.color-option').forEach(colorOption => {
		colorOption.addEventListener('click', function() {
			document.querySelectorAll('.color-option').forEach(opt => {
				opt.classList.remove('selected');
			});
			
			this.classList.add('selected');
			currentSetColor = this.getAttribute('data-color');
		});
	});
}

function openSetModal(editing = false) {
	isEditingSet = editing;

	setModal.classList.remove('hidden');

	if (editing) {
		modalTitle.innerHTML = '<i class="fas fa-edit"></i> Set bearbeiten';
		const set = sets.find(s => s.id === currentSetId);
		if (set) {
			document.getElementById('set-name').value = set.name;
			document.getElementById('set-description').value = set.description || '';
			document.getElementById('set-category').value = set.category || '';

			currentSetColor = set.color;
			document.querySelectorAll('.color-option').forEach(opt => {
				if (opt.getAttribute('data-color') === set.color) {
					opt.classList.add('selected');
				} else {
					opt.classList.remove('selected');
				}
			});
		}
	} else {
		setModal.classList.remove('hidden');
		modalTitle.innerHTML = '<i class="fas fa-folder-plus"></i> Neues Set erstellen';
		document.getElementById('set-name').value = '';
		document.getElementById('set-description').value = '';
		document.getElementById('set-category').value = '';

		currentSetColor = '#4361ee';
		document.querySelectorAll('.color-option').forEach(opt => {
			if (opt.getAttribute('data-color') === '#4361ee') {
				opt.classList.add('selected');
			} else {
				opt.classList.remove('selected');
			}
		});
	}

	// Event-Listener für Farbauswahl einrichten
	setupColorSelection();

	setModalOverlay.classList.remove('hidden');
	setModal.classList.add('open');
}

function openCardModal(editing = false, cardId = null) {
	isEditingCard = editing;
	currentCardId = cardId;

    addCardButton.classList.remove('hidden');

	if (editing && cardId) {
		cardModalTitle.innerHTML = '<i class="fas fa-edit"></i> Karte bearbeiten';
		const set = sets.find(s => s.id === currentSetId);
		if (set) {
			const card = set.cards.find(c => c.id === cardId);
			if (card) {
				document.getElementById('card-question-input').value = card.question;
				document.getElementById('card-answer-input').value = card.answer;
				document.getElementById('card-hint-input').value = card.hint || '';
			}
		}
	} else {
		cardModalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Neue Karte erstellen';
		document.getElementById('card-question-input').value = '';
		document.getElementById('card-answer-input').value = '';
		document.getElementById('card-hint-input').value = '';
	}

	cardModalOverlay.classList.remove('hidden');
	cardModal.classList.add('open');
	cardModal.classList.remove('hidden');
}

function closeModals() {
	setModal.classList.remove('open');
	cardModal.classList.remove('open');
	setTimeout(() => {
		setModalOverlay.classList.add('hidden');
		cardModalOverlay.classList.add('hidden');
        setModal.classList.add('hidden');
        cardModal.classList.add('hidden');
	}, 300);
}

function saveSetFromModal() {
	const name = document.getElementById('set-name').value.trim();
	const description = document.getElementById('set-description').value.trim();
	const category = document.getElementById('set-category').value.trim();

	if (!name) {
		alert('Bitte gib einen Namen für das Set ein.');
		return;
	}

	if (isEditingSet) {
		const setIndex = sets.findIndex(s => s.id === currentSetId);
		if (setIndex !== -1) {
			sets[setIndex].name = name;
			sets[setIndex].description = description;
			sets[setIndex].category = category;
			sets[setIndex].color = currentSetColor;
			saveSets();
			renderSets();
			updateDrawerHeader();
		}
	} else {
		const newSet = {
			id: Date.now().toString(),
			name,
			description,
			category,
			color: currentSetColor,
			cards: []
		};

		sets.push(newSet);
		saveSets();
		renderSets();
	}

	closeModals();
}

function saveCardFromModal() {
	const question = document.getElementById('card-question-input').value.trim();
	const answer = document.getElementById('card-answer-input').value.trim();
	const hint = document.getElementById('card-hint-input').value.trim();

	if (!question || !answer) {
		alert('Bitte gib sowohl Frage als auch Antwort ein.');
		return;
	}

	if (currentSetId) {
		const setIndex = sets.findIndex(s => s.id === currentSetId);

		if (setIndex !== -1) {
			if (isEditingCard && currentCardId) {
				const cardIndex = sets[setIndex].cards.findIndex(c => c.id === currentCardId);
				if (cardIndex !== -1) {
					sets[setIndex].cards[cardIndex].question = question;
					sets[setIndex].cards[cardIndex].answer = answer;
					sets[setIndex].cards[cardIndex].hint = hint;
				}
			} else {
				const newCard = {
					id: Date.now().toString(),
					question,
					answer,
					hint
				};

				sets[setIndex].cards.push(newCard);
			}

			saveSets();
			renderCards(sets[setIndex].cards);
			closeModals();
		}
	}
}

function deleteCurrentSet() {
	if (confirm('Möchtest du dieses Set wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
		sets = sets.filter(s => s.id !== currentSetId);
		saveSets();
		renderSets();
		closeDrawer();
	}
}

function saveSets() {
	localStorage.setItem('flashcardSets', JSON.stringify(sets));
}

function renderSets() {
	setsList.innerHTML = ``;
	sets.forEach(set => {
		const setElement = document.createElement('div');
		setElement.className = 'set-card';
		setElement.style.borderLeftColor = set.color;
		setElement.innerHTML = `
                    <h3>
                        ${set.name}
                        <div class="set-card-actions">
                            <button class="set-card-action-btn" data-set-id="${set.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </h3>
                    <p><i class="fas fa-copy"></i> ${set.cards.length} Karten</p>
                    ${set.description ? `<p class="description">${set.description}</p>` : ''}
                    ${set.category ? `<span class="category" style="background-color: ${set.color}">${set.category}</span>` : ''}
                `;

		setElement.addEventListener('click', () => openSetDrawer(set.id));

		const editBtn = setElement.querySelector('.set-card-action-btn');
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			currentSetId = set.id;
			openSetModal(true);
		});

		setsList.appendChild(setElement);
	});
    if (sets.length === 0) {
        setsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-light);">
                <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>Du hast noch keine Flashcards. Erstelle dein erstes Set und starte durch!</p>
            </div>
        `;
    }
}

function openSetDrawer(setId) {
	currentSetId = setId;
	const set = sets.find(s => s.id === setId);

	if (set) {
		updateDrawerHeader();
		renderCards(set.cards);

		setDrawer.classList.add('open');
		overlay.classList.remove('hidden');
	}
}

function updateDrawerHeader() {
	const set = sets.find(s => s.id === currentSetId);
	if (set) {
		drawerSetName.innerHTML = `<i class="fas fa-list"></i> ${set.name}`;
		drawerSetCategory.textContent = set.category || 'Keine Kategorie';
		drawerSetDescription.textContent = set.description || '';
	}
}

function closeDrawer() {
	setDrawer.classList.remove('open');
	setTimeout(() => {
		overlay.classList.add('hidden');
	}, 300);
}

function renderCards(cards) {
	cardsList.innerHTML = '';

	if (cards.length === 0) {
		cardsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-light);">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <p>Noch keine Karten in diesem Set</p>
                    </div>
                `;
		return;
	}

	cards.forEach((card, index) => {
		const cardElement = document.createElement('div');
		cardElement.className = 'card-item';
		cardElement.innerHTML = `
                    <div class="card-content">
                        <div class="card-question">${card.question}</div>
                        <div class="card-answer">${card.answer}</div>
                        ${card.hint ? `<div class="card-hint"><i class="fas fa-lightbulb"></i> ${card.hint}</div>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn edit-card" data-card-id="${card.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="card-action-btn delete-card" data-card-id="${card.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;

		cardElement.querySelector('.delete-card').addEventListener('click', (e) => {
			e.stopPropagation();
			deleteCard(card.id);
		});

		cardElement.querySelector('.edit-card').addEventListener('click', (e) => {
			e.stopPropagation();
			openCardModal(true, card.id);
		});

		cardsList.appendChild(cardElement);

		setTimeout(() => {
			cardElement.style.opacity = '1';
			cardElement.style.transform = 'translateX(0)';
		}, index * 100);
	});
}

function deleteCard(cardId) {
	if (currentSetId && confirm('Möchtest du diese Karte wirklich löschen?')) {
		const setIndex = sets.findIndex(s => s.id === currentSetId);

		if (setIndex !== -1) {
			sets[setIndex].cards = sets[setIndex].cards.filter(c => c.id !== cardId);
			saveSets();
			renderCards(sets[setIndex].cards);
		}
	}
}

function startTraining() {
	if (currentSetId) {
		const set = sets.find(s => s.id === currentSetId);

		if (set && set.cards.length > 0) {
			trainingCards = [...set.cards];
			currentCardIndex = 0;
			knownCards = [];
			unknownCards = [];

			showTrainingCard();

			setDrawer.classList.remove('open');
			setTimeout(() => {
				overlay.classList.add('hidden');
			}, 300);

			setTimeout(() => {
				trainingContainer.classList.remove('hidden');
				trainingContainer.classList.add('active');
			}, 50);

			results.style.display = 'none';

			updateProgress();
		}
	}
}

function showTrainingCard() {
	if (currentCardIndex < trainingCards.length) {
		const card = trainingCards[currentCardIndex];
		cardQuestion.textContent = card.question;
		cardAnswer.textContent = card.answer;
		cardHint.textContent = card.hint || '';

		flashcard.classList.remove('flipped');
		flashcard.style.transform = '';

		flashcard.classList.add('pulse');
		setTimeout(() => {
			flashcard.classList.remove('pulse');
		}, 2000);
	} else {
		finishTraining();
	}
}

function flipCard() {
	if (isDragging) return;
	flashcard.classList.toggle('flipped');
}

function handleSwipe(direction) {
	if (currentCardIndex >= trainingCards.length) return;

	const card = trainingCards[currentCardIndex];

	if (direction === 'right') {
		flashcard.style.transform = 'translateX(100%) rotate(10deg)';
		knownCards.push(card);
	} else {
		flashcard.style.transform = 'translateX(-100%) rotate(-10deg)';
		unknownCards.push(card);
	}

	setTimeout(() => {
		currentCardIndex++;
		updateProgress();
		showTrainingCard();
	}, 300);
}

function updateProgress() {
	const progressPercent = (currentCardIndex / trainingCards.length) * 100;
	progress.style.width = `${progressPercent}%`;
}

function finishTraining() {
	correctCount.textContent = knownCards.length;
	totalCount.textContent = trainingCards.length;
	results.style.display = 'block';
}

function restartTraining() {
	trainingCards = [...sets.find(s => s.id === currentSetId).cards];
	currentCardIndex = 0;
	knownCards = [];
	unknownCards = [];

	showTrainingCard();
	results.style.display = 'none';
	updateProgress();
}

function retryUnknownCards() {
	if (unknownCards.length > 0) {
		trainingCards = [...unknownCards];
		currentCardIndex = 0;
		knownCards = [];
		unknownCards = [];

		showTrainingCard();
		results.style.display = 'none';
		updateProgress();
	}
}

function backToSets() {
	trainingContainer.classList.remove('active');
	setTimeout(() => {
		trainingContainer.classList.add('hidden');
	}, 500);
	currentSetId = null;
}

function backToSetsFromTraining() {
	trainingContainer.classList.remove('active');
	setTimeout(() => {
		trainingContainer.classList.add('hidden');
		setDrawer.classList.add('open');
		overlay.classList.remove('hidden');
	}, 500);
}

document.addEventListener('DOMContentLoaded', function() {
	setModalOverlay.classList.add('hidden');
	cardModalOverlay.classList.add('hidden');
	overlay.classList.add('hidden');
	trainingContainer.classList.add('hidden');

    setupColorSelection();
});

updateTheme();
renderSets();