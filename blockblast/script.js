// Game State
let gameBoard = Array(8).fill().map(() => Array(8).fill(false));
let score = 0;
let combo = 0;
let coins = 100;
let placedBlocks = 0;
let clearedLines = 0;
let currentBlocks = [];
let selectedBlock = null;
let isDragging = false;
let dragPreview = null;

// Block Shapes
const blockShapes = {
	single: [
		[true]
	],
	line2: [
		[true],
		[true]
	],
	line3: [
		[true],
		[true],
		[true]
	],
	line4: [
		[true],
		[true],
		[true],
		[true]
	],
	line2h: [
		[true, true]
	],
	line3h: [
		[true, true, true]
	],
	line4h: [
		[true, true, true, true]
	],
	square: [
		[true, true],
		[true, true]
	],
	L1: [
		[true, false],
		[true, false],
		[true, true]
	],
	L2: [
		[true, true, true],
		[true, false, false]
	],
	L3: [
		[true, true],
		[false, true],
		[false, true]
	],
	L4: [
		[false, false, true],
		[true, true, true]
	],
	T1: [
		[true, true, true],
		[false, true, false]
	],
	T2: [
		[false, true],
		[true, true],
		[false, true]
	],
	Z1: [
		[true, true, false],
		[false, true, true]
	],
	Z2: [
		[false, true],
		[true, true],
		[true, false]
	]
};

// Initialize Game
function initGame() {
	createBoard();
	generateBlocks();
	updateDisplay();
}

function createBoard() {
	const board = document.getElementById('game-board');
	board.innerHTML = '';

	for (let i = 0; i < 64; i++) {
		const cell = document.createElement('div');
		cell.className = 'cell';
		cell.dataset.row = Math.floor(i / 8);
		cell.dataset.col = i % 8;

		cell.addEventListener('dragover', handleDragOver);
		cell.addEventListener('drop', handleDrop);

		board.appendChild(cell);
	}
}

function generateBlocks() {
	const shapeNames = Object.keys(blockShapes);
	currentBlocks = [];

	for (let i = 0; i < 3; i++) {
		const randomShape = shapeNames[Math.floor(Math.random() * shapeNames.length)];
		currentBlocks.push({
			shape: blockShapes[randomShape],
			name: randomShape,
			used: false
		});
	}

	renderBlocks();
}

function renderBlocks() {
	const container = document.getElementById('blocks-container');
	container.innerHTML = '';

	currentBlocks.forEach((block, index) => {
		if (block.used) return;

		const preview = document.createElement('div');
		preview.className = 'block-preview';
		preview.dataset.index = index;

		const shape = document.createElement('div');
		shape.className = 'block-shape';
		shape.style.gridTemplateColumns = `repeat(${block.shape[0].length}, 1fr)`;
		shape.style.gridTemplateRows = `repeat(${block.shape.length}, 1fr)`;

		block.shape.forEach(row => {
			row.forEach(cell => {
				const cellDiv = document.createElement('div');
				if (cell) {
					cellDiv.className = 'block-cell';
				} else {
					cellDiv.style.width = '12px';
					cellDiv.style.height = '12px';
				}
				shape.appendChild(cellDiv);
			});
		});

		preview.appendChild(shape);
		preview.draggable = true;
		preview.addEventListener('dragstart', handleDragStart);
		preview.addEventListener('click', selectBlock);

		container.appendChild(preview);
	});
}

function selectBlock(e) {
	const index = parseInt(e.currentTarget.dataset.index);
	selectedBlock = index;

	document.querySelectorAll('.block-preview').forEach(preview => {
		preview.classList.remove('selected');
	});
	e.currentTarget.classList.add('selected');
}

function handleDragStart(e) {
	const index = parseInt(e.currentTarget.dataset.index);
	selectedBlock = index;
	isDragging = true;

	e.dataTransfer.effectAllowed = 'move';
	e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
}

function handleDragOver(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';

	if (selectedBlock !== null && isDragging) {
		const row = parseInt(e.currentTarget.dataset.row);
		const col = parseInt(e.currentTarget.dataset.col);
		highlightPlacement(row, col);
	}
}

function handleDrop(e) {
	e.preventDefault();
	isDragging = false;

	if (selectedBlock !== null) {
		const row = parseInt(e.currentTarget.dataset.row);
		const col = parseInt(e.currentTarget.dataset.col);
		placeBlock(row, col, selectedBlock);
	}

	clearHighlight();
}

function highlightPlacement(row, col) {
	clearHighlight();

	if (selectedBlock === null) return;

	const block = currentBlocks[selectedBlock];
	if (block.used) return;

	const canPlace = canPlaceBlock(row, col, block.shape);

	for (let r = 0; r < block.shape.length; r++) {
		for (let c = 0; c < block.shape[r].length; c++) {
			if (block.shape[r][c]) {
				const targetRow = row + r;
				const targetCol = col + c;

				if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
					const cell = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
					if (cell) {
						cell.classList.add('highlight');
						if (!canPlace) {
							cell.style.background = '#FFB6B3';
						}
					}
				}
			}
		}
	}
}

function clearHighlight() {
	document.querySelectorAll('.cell').forEach(cell => {
		cell.classList.remove('highlight');
		if (!cell.classList.contains('filled')) {
			cell.style.background = '';
		}
	});
}

function canPlaceBlock(row, col, shape) {
	for (let r = 0; r < shape.length; r++) {
		for (let c = 0; c < shape[r].length; c++) {
			if (shape[r][c]) {
				const targetRow = row + r;
				const targetCol = col + c;

				if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) {
					return false;
				}

				if (gameBoard[targetRow][targetCol]) {
					return false;
				}
			}
		}
	}
	return true;
}

function placeBlock(row, col, blockIndex) {
	const block = currentBlocks[blockIndex];
	if (block.used || !canPlaceBlock(row, col, block.shape)) {
		return false;
	}

	// Place block on board
	let blockSize = 0;
	for (let r = 0; r < block.shape.length; r++) {
		for (let c = 0; c < block.shape[r].length; c++) {
			if (block.shape[r][c]) {
				gameBoard[row + r][col + c] = true;
				blockSize++;
			}
		}
	}

	// Mark block as used
	block.used = true;
	selectedBlock = null;

	// Update score
	score += blockSize * 10;
	placedBlocks++;
	coins += 5;

	// Update board display
	updateBoardDisplay();

	// Check for line clears
	const clearedCount = checkAndClearLines();
	if (clearedCount > 0) {
		combo++;
		const comboMultiplier = Math.min(1 + (combo - 1) * 0.2, 3.0);
		const lineBonus = clearedCount === 1 ? 100 :
			clearedCount === 2 ? 300 :
			clearedCount === 3 ? 600 : 1000;
		score += Math.floor(lineBonus * comboMultiplier);
		clearedLines += clearedCount;

		// Perfect clear bonus
		if (isBoardEmpty()) {
			score += 2000;
			showFloatingText('+2000 Perfect Clear!');
		}
	} else {
		combo = 0;
	}

	// Generate new blocks if all used
	if (currentBlocks.every(b => b.used)) {
		generateBlocks();
	} else {
		renderBlocks();
	}

	updateDisplay();

	// Check game over
	if (isGameOver()) {
		setTimeout(showGameOver, 500);
	}

	return true;
}

// In der JavaScript-Datei: Aktualisiere die checkAndClearLines-Funktion
function checkAndClearLines() {
	const rowsToClear = [];
	const colsToClear = [];

	// Check rows
	for (let r = 0; r < 8; r++) {
		if (gameBoard[r].every(cell => cell)) {
			rowsToClear.push(r);
		}
	}

	// Check columns
	for (let c = 0; c < 8; c++) {
		if (gameBoard.every(row => row[c])) {
			colsToClear.push(c);
		}
	}

	// Clear lines with animation
	const totalClears = rowsToClear.length + colsToClear.length;
	if (totalClears > 0) {
		const cellsToClear = new Set();

		rowsToClear.forEach(r => {
			for (let c = 0; c < 8; c++) {
				cellsToClear.add(`${r},${c}`);
				const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
				cell.classList.add('clear-animation');
			}
		});

		colsToClear.forEach(c => {
			for (let r = 0; r < 8; r++) {
				const key = `${r},${c}`;
				if (!cellsToClear.has(key)) {
					const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
					cell.classList.add('clear-animation');
				}
			}
		});

		// Update game state after animation
		setTimeout(() => {
			rowsToClear.forEach(r => {
				for (let c = 0; c < 8; c++) {
					gameBoard[r][c] = false;
				}
			});

			colsToClear.forEach(c => {
				for (let r = 0; r < 8; r++) {
					gameBoard[r][c] = false;
				}
			});

			// Remove animation class and update display
			document.querySelectorAll('.clear-animation').forEach(cell => {
				cell.classList.remove('clear-animation');
			});

			updateBoardDisplay();
		}, 500);
	}

	return totalClears;
}

function updateBoardDisplay() {
	for (let r = 0; r < 8; r++) {
		for (let c = 0; c < 8; c++) {
			const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
			if (gameBoard[r][c]) {
				cell.classList.add('filled');
				cell.style.background = '#4ECDC4';
			} else {
				cell.classList.remove('filled');
				cell.style.background = '';
			}
		}
	}
}

function isBoardEmpty() {
	return gameBoard.every(row => row.every(cell => !cell));
}

function isGameOver() {
	return currentBlocks.filter(b => !b.used).every(block => {
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				if (canPlaceBlock(r, c, block.shape)) {
					return false;
				}
			}
		}
		return true;
	});
}

function showGameOver() {
	document.getElementById('final-score').textContent = score.toLocaleString();
	document.getElementById('game-over').style.display = 'flex';
}

function updateDisplay() {
	document.getElementById('score').textContent = score.toLocaleString();
	document.getElementById('combo').textContent = combo;
	document.getElementById('coins').textContent = coins;
	document.getElementById('placed-blocks').textContent = placedBlocks;
	document.getElementById('cleared-lines').textContent = clearedLines;
}

function newGame() {
	gameBoard = Array(8).fill().map(() => Array(8).fill(false));
	score = 0;
	combo = 0;
	placedBlocks = 0;
	clearedLines = 0;
	selectedBlock = null;

	document.getElementById('game-over').style.display = 'none';
	updateBoardDisplay();
	generateBlocks();
	updateDisplay();
}

// Power-ups
function useBomb() {
	if (coins < 100) {
		alert('Nicht genug Münzen!');
		return;
	}

	coins -= 100;
	// Simple bomb implementation - clear center 3x3
	for (let r = 2; r < 6; r++) {
		for (let c = 2; c < 6; c++) {
			gameBoard[r][c] = false;
		}
	}
	updateBoardDisplay();
	updateDisplay();
}

function useLineClear() {
	if (coins < 150) {
		alert('Nicht genug Münzen!');
		return;
	}

	coins -= 150;
	// Clear random filled row or column
	const filledRows = [];
	const filledCols = [];

	for (let r = 0; r < 8; r++) {
		if (gameBoard[r].some(cell => cell)) filledRows.push(r);
	}

	for (let c = 0; c < 8; c++) {
		if (gameBoard.some(row => row[c])) filledCols.push(c);
	}

	if (filledRows.length > 0) {
		const rowToClear = filledRows[Math.floor(Math.random() * filledRows.length)];
		for (let c = 0; c < 8; c++) {
			gameBoard[rowToClear][c] = false;
		}
	}

	updateBoardDisplay();
	updateDisplay();
}

function refreshBlocks() {
	if (coins < 75) {
		alert('Nicht genug Münzen!');
		return;
	}

	coins -= 75;
	generateBlocks();
	updateDisplay();
}

function showFloatingText(text) {
	const floatingText = document.createElement('div');
	floatingText.textContent = text;
	floatingText.style.position = 'fixed';
	floatingText.style.top = '50%';
	floatingText.style.left = '50%';
	floatingText.style.transform = 'translate(-50%, -50%)';
	floatingText.style.color = '#F7DC6F';
	floatingText.style.fontSize = '24px';
	floatingText.style.fontWeight = 'bold';
	floatingText.style.zIndex = '1001';
	floatingText.style.pointerEvents = 'none';
	floatingText.style.animation = 'fadeUp 2s ease-out forwards';

	document.body.appendChild(floatingText);

	setTimeout(() => {
		document.body.removeChild(floatingText);
	}, 2000);
}

// Add CSS for floating text animation
const style = document.createElement('style');
style.textContent = `
            @keyframes fadeUp {
                0% { opacity: 1; transform: translate(-50%, -50%); }
                100% { opacity: 0; transform: translate(-50%, -70%); }
            }
        `;
document.head.appendChild(style);

// Initialize game on load
initGame();