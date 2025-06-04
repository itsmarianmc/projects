// Spielfeld-Einstellungen
const boardSize = 8;
const tileSize = 50; // in Pixel
const gap = 2;       // Abstand zwischen den Kacheln
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
let board = [];
const gameBoardEl = document.getElementById('gameBoard');

// Variablen für Drag & Drop
let dragStartTile = null;
let dragStartX = 0;
let dragStartY = 0;
let dragging = false;
let swapDone = false;
const dragThreshold = 30; // Pixel, um eine Richtungsänderung zu erkennen

/**
 * Erzeugt das Spielfeld so, dass keine Kombination (Match) bereits beim Start vorhanden ist.
 * Für jede Zelle wird geprüft, ob zwei benachbarte Felder (links oder oben) bereits dieselbe Farbe haben.
 */
function createBoard() {
    board = [];
    gameBoardEl.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        board[row] = [];
        for (let col = 0; col < boardSize; col++) {
        // Ermittle alle erlaubten Farben für diese Position.
        const allowedColors = colors.filter(color => {
            // Prüfe horizontal: Falls zwei linksliegende Felder existieren und dieselbe Farbe haben,
            // ist diese Farbe nicht erlaubt.
            if (col >= 2 && board[row][col - 1] === color && board[row][col - 2] === color) {
            return false;
            }
            // Prüfe vertikal: Falls zwei oberhalbliegende Felder existieren und dieselbe Farbe haben,
            // ist diese Farbe nicht erlaubt.
            if (row >= 2 && board[row - 1][col] === color && board[row - 2][col] === color) {
            return false;
            }
            return true;
        });
        // Wähle zufällig eine der erlaubten Farben aus.
        const color = allowedColors[Math.floor(Math.random() * allowedColors.length)];
        board[row][col] = color;
        
        // Erzeuge die DOM-Kachel
        const tile = document.createElement('div');
        tile.classList.add('tile', color);
        tile.dataset.row = row;
        tile.dataset.col = col;
        // Drag & Drop statt Klick
        tile.addEventListener('mousedown', tileDragStart);
        gameBoardEl.appendChild(tile);
        }
    }
}

// Handler für mousedown (Drag-Start)
function tileDragStart(e) {
    dragStartTile = e.currentTarget;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragging = true;
    swapDone = false;
    dragStartTile.classList.add('dragging');
    // Füge Mousemove- und Mouseup-Listener zum Dokument hinzu
    document.addEventListener('mousemove', tileDragging);
    document.addEventListener('mouseup', tileDragEnd);
}

// Handler für mousemove während des Draggens
function tileDragging(e) {
    if (!dragging || swapDone) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    // Schwellwert noch nicht erreicht
    if (Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) {
        return;
    }
    // Bestimme primäre Richtung: horizontal oder vertikal
    let targetRow = parseInt(dragStartTile.dataset.row);
    let targetCol = parseInt(dragStartTile.dataset.col);
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontaler Zug
        targetCol += dx > 0 ? 1 : -1;
    } else {
        // Vertikaler Zug
        targetRow += dy > 0 ? 1 : -1;
    }
    // Prüfe, ob das Zielfeld gültig ist und benachbart
    if (isValidPosition(targetRow, targetCol) &&
        isAdjacent(parseInt(dragStartTile.dataset.row), parseInt(dragStartTile.dataset.col), targetRow, targetCol)) {
        const targetTile = getTileElement(targetRow, targetCol);
        // Starte den Swap mit Animation
        swapTiles(
        { row: parseInt(dragStartTile.dataset.row), col: parseInt(dragStartTile.dataset.col), el: dragStartTile },
        { row: targetRow, col: targetCol, el: targetTile }
        );
        swapDone = true;
        endDragging();
    }
}

// Handler für mouseup (Drag-Ende)
function tileDragEnd() {
    endDragging();
}

// Beendet den Drag-Vorgang und entfernt die Eventlistener
function endDragging() {
    dragging = false;
    if (dragStartTile) {
        dragStartTile.classList.remove('dragging');
    }
    document.removeEventListener('mousemove', tileDragging);
    document.removeEventListener('mouseup', tileDragEnd);
}

// Prüft, ob die angegebene Position innerhalb des Boards liegt
function isValidPosition(row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

// Prüft, ob zwei Positionen benachbart sind
function isAdjacent(row1, col1, row2, col2) {
    return (Math.abs(row1 - row2) + Math.abs(col1 - col2)) === 1;
}

// Tauscht zwei Steine mit Swap-Animation
function swapTiles(tile1, tile2) {
    // Berechne den Versatz (dx, dy) basierend auf der Gittergröße
    let dx = (tile2.col - tile1.col) * (tileSize + gap);
    let dy = (tile2.row - tile1.row) * (tileSize + gap);

    // Setze Animationstransition und Transform für beide Kacheln
    tile1.el.style.transition = 'transform 0.3s ease';
    tile2.el.style.transition = 'transform 0.3s ease';
    tile1.el.style.transform = `translate(${dx}px, ${dy}px)`;
    tile2.el.style.transform = `translate(${-dx}px, ${-dy}px)`;

    // Nach der Animationsdauer (300ms) den Swap abschließen:
    setTimeout(() => {
        // Setze Transition und Transform zurück
        tile1.el.style.transition = '';
        tile2.el.style.transition = '';
        tile1.el.style.transform = '';
        tile2.el.style.transform = '';

        // Tausche die Werte im board-Array
        const tempColor = board[tile1.row][tile1.col];
        board[tile1.row][tile1.col] = board[tile2.row][tile2.col];
        board[tile2.row][tile2.col] = tempColor;

        // Aktualisiere die Kacheln (Farbe/Klassen)
        updateTile(tile1.row, tile1.col, tile1.el);
        updateTile(tile2.row, tile2.col, tile2.el);

        // Überprüfe, ob der Swap ein Match erzeugt
        if (!hasMatch()) {
        // Kein Match: Rücktausch mit Animation
        setTimeout(() => {
            // Berechne die gleichen Offsets, um rückwärts zu animieren
            tile1.el.style.transition = 'transform 0.3s ease';
            tile2.el.style.transition = 'transform 0.3s ease';
            tile1.el.style.transform = `translate(${-dx}px, ${-dy}px)`;
            tile2.el.style.transform = `translate(${dx}px, ${dy}px)`;
            setTimeout(() => {
            tile1.el.style.transition = '';
            tile2.el.style.transition = '';
            tile1.el.style.transform = '';
            tile2.el.style.transform = '';

            // Rücktausch im board-Array
            const temp = board[tile1.row][tile1.col];
            board[tile1.row][tile1.col] = board[tile2.row][tile2.col];
            board[tile2.row][tile2.col] = temp;
            updateTile(tile1.row, tile1.col, tile1.el);
            updateTile(tile2.row, tile2.col, tile2.el);
            }, 300);
        }, 100);
        } else {
        setTimeout(checkMatches, 200);
        }
    }, 300);
}

// Aktualisiert das Erscheinungsbild einer Kachel anhand des board-Arrays
function updateTile(row, col, tileEl) {
    // Entferne alle Farbstile
    colors.forEach(color => tileEl.classList.remove(color));
    // Füge die aktuelle Farbe hinzu
    if (board[row][col]) {
        tileEl.classList.add(board[row][col]);
    }
    tileEl.style.opacity = '1';
}

// Prüft, ob es im board ein Match (drei oder mehr in Reihe) gibt
function hasMatch() {
    // Zeilen prüfen
    for (let row = 0; row < boardSize; row++) {
        let matchLength = 1;
        for (let col = 0; col < boardSize - 1; col++) {
        if (board[row][col] === board[row][col + 1]) {
            matchLength++;
            if (matchLength >= 3) return true;
        } else {
            matchLength = 1;
        }
        }
    }
    // Spalten prüfen
    for (let col = 0; col < boardSize; col++) {
        let matchLength = 1;
        for (let row = 0; row < boardSize - 1; row++) {
        if (board[row][col] === board[row + 1][col]) {
            matchLength++;
            if (matchLength >= 3) return true;
        } else {
            matchLength = 1;
        }
        }
    }
    return false;
}

// Sucht nach Matches und entfernt diese
function checkMatches() {
    const matches = [];
    // Zeilen prüfen
    for (let row = 0; row < boardSize; row++) {
        let matchLength = 1;
        for (let col = 0; col < boardSize; col++) {
        let next = col + 1;
        if (next < boardSize && board[row][col] === board[row][next]) {
            matchLength++;
        } else {
            if (matchLength >= 3) {
            for (let k = 0; k < matchLength; k++) {
                matches.push({ row: row, col: col - k });
            }
            }
            matchLength = 1;
        }
        }
    }
    // Spalten prüfen
    for (let col = 0; col < boardSize; col++) {
        let matchLength = 1;
        for (let row = 0; row < boardSize; row++) {
        let next = row + 1;
        if (next < boardSize && board[row][col] === board[next][col]) {
            matchLength++;
        } else {
            if (matchLength >= 3) {
            for (let k = 0; k < matchLength; k++) {
                matches.push({ row: row - k, col: col });
            }
            }
            matchLength = 1;
        }
        }
    }
    if (matches.length > 0) {
        removeMatches(matches);
    }
}

// Entfernt die gefundenen Matches und löst den Fallvorgang aus
function removeMatches(matches) {
    const uniqueMatches = [];
    const matchSet = new Set();
    matches.forEach(m => {
        const key = m.row + '-' + m.col;
        if (!matchSet.has(key)) {
        matchSet.add(key);
        uniqueMatches.push(m);
        }
    });
    uniqueMatches.forEach(m => {
        board[m.row][m.col] = null;
        const tile = getTileElement(m.row, m.col);
        colors.forEach(color => tile.classList.remove(color));
        tile.style.opacity = '0.3';
    });
    setTimeout(() => {
        collapseBoard();
    }, 400);
}

// Lässt die Steine nach unten "fallen", füllt Lücken auf und lässt nur neue Steine animiert hereinrutschen
function collapseBoard() {
    const emptyCounts = new Array(boardSize).fill(0);
    for (let col = 0; col < boardSize; col++) {
        let emptySpots = 0;
        for (let row = boardSize - 1; row >= 0; row--) {
        if (board[row][col] === null) {
            emptySpots++;
        } else if (emptySpots > 0) {
            board[row + emptySpots][col] = board[row][col];
            board[row][col] = null;
        }
        }
        for (let row = 0; row < emptySpots; row++) {
        board[row][col] = colors[Math.floor(Math.random() * colors.length)];
        }
        emptyCounts[col] = emptySpots;
    }
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
        const tile = getTileElement(row, col);
        tile.style.opacity = '1';
        colors.forEach(color => tile.classList.remove(color));
        tile.classList.add(board[row][col]);
        if (row < emptyCounts[col]) {
            tile.classList.add('fall');
            setTimeout(() => { tile.classList.remove('fall'); }, 400);
        }
        }
    }
    setTimeout(checkMatches, 500);
}

// Liefert das DOM-Element der Kachel an der angegebenen Position
function getTileElement(row, col) {
    return document.querySelector(`.tile[data-row='${row}'][data-col='${col}']`);
}

// Initialisiere das Spiel
createBoard();