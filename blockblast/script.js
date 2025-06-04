const boardSize = 10;
const cellSize = 40;
const boardCanvas = document.getElementById('board-canvas');
const boardCtx = boardCanvas.getContext('2d');
const piecesContainer = document.getElementById('pieces-container');
const scoreDisplay = document.getElementById('score');

let score = 0;
let gameOver = false;

let draggedPiece = null; 
let selectedPiece = null;
let selectedPieceIndex = -1;
let previewCells = [];

let board = [];
for (let y = 0; y < boardSize; y++) {
        board[y] = [];
        for (let x = 0; x < boardSize; x++) {
            board[y][x] = 0;
        }
    }
    const pieceShapes = [
        {
            blocks: [[0,0], [0,1], [0,2], [1,2]], color: '#FF5733'
        },
        {
            blocks: [[1,0], [0,1], [1,1], [2,1]], color: '#33FF57'
        },
        {
            blocks: [[0,0], [1,0], [0,1], [1,1]], color: '#3357FF'
        },
        {
            blocks: [[0,0], [1,0], [2,0], [0,1], [1,1], [2,1],[0,2], [1,2], [2,2]], color: '#F1C40F'
        },
        {
            blocks: [[0,0], [1,0], [2,0], [0,1], [1,1], [2,1]], color: '#9B59B6'
        },
        {
            blocks: [[0,0], [1,0], [2,0], [3,0], [4,0]], color: '#E67E22'
        },
        {
            blocks: [[0,0], [1,0], [0,1]], color: '#2ECC71'
        }
    ];
    
    let currentPieces = [];
    
    function adjustColor(color, amount) {
        let usePound = false;
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }
        let num = parseInt(color, 16);
        let r = Math.max(Math.min(255, (num >> 16) + amount), 0);
        let g = Math.max(Math.min(255, ((num >> 8) & 0x00FF) + amount), 0);
        let b = Math.max(Math.min(255, (num & 0x0000FF) + amount), 0);
        return (usePound ? "#" : "") + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function lightenColor(color, factor) {
        return adjustColor(color, Math.round(50 * factor));
    }
    
    function darkenColor(color, factor) {
        return adjustColor(color, -Math.round(50 * factor));
    }
    
    function drawBlock(x, y, color) {
        let gradient = boardCtx.createLinearGradient(x, y, x, y + cellSize);
        gradient.addColorStop(0, lightenColor(color, 0.3));
        gradient.addColorStop(1, darkenColor(color, 0.3));
        boardCtx.fillStyle = gradient;
        boardCtx.fillRect(x, y, cellSize, cellSize);
        boardCtx.strokeStyle = '#000';
        boardCtx.strokeRect(x, y, cellSize, cellSize);
    }
    
    function drawBoard() {
        boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
            boardCtx.strokeStyle = '#ccc';
            boardCtx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            if (board[y][x] !== 0) {
                drawBlock(x * cellSize, y * cellSize, board[y][x]);
            }
            }
        }
        if (previewCells && previewCells.length > 0) {
            boardCtx.save();
            boardCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            previewCells.forEach(cell => {
            boardCtx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
            });
            boardCtx.restore();
        }
    }
    
    function generatePieces() {
        currentPieces = [];
        piecesContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * pieceShapes.length);
            const piece = JSON.parse(JSON.stringify(pieceShapes[randomIndex]));
            currentPieces.push(piece);
            createPieceElement(piece, i);
        }
    }
    
    function isBlockInPiece(piece, x, y) {
        return piece.blocks.some(block => block[0] === x && block[1] === y);
    }
    
    function drawPieceExactOutline(ctx, piece) {
        ctx.beginPath();
        piece.blocks.forEach(block => {
            let bx = block[0] * cellSize;
            let by = block[1] * cellSize;
            if (!isBlockInPiece(piece, block[0], block[1] - 1)) {
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + cellSize, by);
            }
            if (!isBlockInPiece(piece, block[0] + 1, block[1])) {
            ctx.moveTo(bx + cellSize, by);
            ctx.lineTo(bx + cellSize, by + cellSize);
            }
            if (!isBlockInPiece(piece, block[0], block[1] + 1)) {
            ctx.moveTo(bx, by + cellSize);
            ctx.lineTo(bx + cellSize, by + cellSize);
            }
            if (!isBlockInPiece(piece, block[0] - 1, block[1])) {
            ctx.moveTo(bx, by);
            ctx.lineTo(bx, by + cellSize);
            }
        });
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    function createPieceElement(piece, index) {
        let maxX = 0, maxY = 0;
        piece.blocks.forEach(block => {
            if (block[0] > maxX) maxX = block[0];
            if (block[1] > maxY) maxY = block[1];
        });
        const canvasWidth = (maxX + 1) * cellSize;
        const canvasHeight = (maxY + 1) * cellSize;
        
        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = canvasWidth;
        pieceCanvas.height = canvasHeight;
        pieceCanvas.classList.add('piece-canvas');
        pieceCanvas.dataset.index = index;
        const ctx = pieceCanvas.getContext('2d');
        
        piece.blocks.forEach(block => {
            ctx.fillStyle = piece.color;
            ctx.fillRect(block[0] * cellSize, block[1] * cellSize, cellSize, cellSize);
        });
        drawPieceExactOutline(ctx, piece);
        
        pieceCanvas.addEventListener('mousedown', function(e) {
            e.preventDefault();
            if (!gameOver) startDrag(e, pieceCanvas, piece, index);
        });
        pieceCanvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (!gameOver) startDrag(e.touches[0], pieceCanvas, piece, index);
        });
        
        piecesContainer.appendChild(pieceCanvas);
    }
    
    function startDrag(eObj, pieceCanvas, piece, index) {
        selectedPiece = piece;
        selectedPieceIndex = index;
        const dragClone = pieceCanvas.cloneNode(true);
        dragClone.style.position = 'absolute';
        dragClone.style.pointerEvents = 'none';
        const rect = pieceCanvas.getBoundingClientRect();
        const offsetX = eObj.clientX - rect.left;
        const offsetY = eObj.clientY - rect.top;
        dragClone.dataset.offsetX = offsetX;
        dragClone.dataset.offsetY = offsetY;
        dragClone.style.left = rect.left + 'px';
        dragClone.style.top = rect.top + 'px';
        document.body.appendChild(dragClone);
        draggedPiece = dragClone;
        pieceCanvas.style.visibility = 'hidden';
    }
    
    function handleDragMove(eObj) {
        if (!draggedPiece) return;
        const offsetX = parseFloat(draggedPiece.dataset.offsetX);
        const offsetY = parseFloat(draggedPiece.dataset.offsetY);
        draggedPiece.style.left = (eObj.clientX - offsetX) + 'px';
        draggedPiece.style.top = (eObj.clientY - offsetY) + 'px';
        
        const boardRect = boardCanvas.getBoundingClientRect();
        if (eObj.clientX >= boardRect.left && eObj.clientX <= boardRect.right &&
            eObj.clientY >= boardRect.top && eObj.clientY <= boardRect.bottom) {
            let dropLeft = eObj.clientX - offsetX;
            let dropTop = eObj.clientY - offsetY;
            let boardX = Math.round((dropLeft - boardRect.left) / cellSize);
            let boardY = Math.round((dropTop - boardRect.top) / cellSize);
            if (canPlacePiece(selectedPiece, boardX, boardY)) {
            previewCells = computePreviewCells(boardX, boardY, selectedPiece);
            } else {
            previewCells = [];
            }
        } else {
            previewCells = [];
        }
        drawBoard();
    }
    
    document.addEventListener('mousemove', e => { handleDragMove(e); });
    document.addEventListener('touchmove', e => { 
        if (e.touches.length > 0) handleDragMove(e.touches[0]);
    }, { passive: false });
    
    function revertDrag() {
        const canvases = document.querySelectorAll('.piece-canvas');
        canvases.forEach(canvas => {
            if (parseInt(canvas.dataset.index) === selectedPieceIndex) {
            canvas.style.visibility = 'visible';
            }
        });
    }
    
    function handleDragEnd(eObj) {
        if (!draggedPiece) return;
        const boardRect = boardCanvas.getBoundingClientRect();
        const offsetX = parseFloat(draggedPiece.dataset.offsetX);
        const offsetY = parseFloat(draggedPiece.dataset.offsetY);
        let dropLeft = eObj.clientX - offsetX;
        let dropTop = eObj.clientY - offsetY;
        let boardX = Math.round((dropLeft - boardRect.left) / cellSize);
        let boardY = Math.round((dropTop - boardRect.top) / cellSize);
        
        if (boardX < 0 || boardX >= boardSize || boardY < 0 || boardY >= boardSize) {
            revertDrag();
        } else {
            if (canPlacePiece(selectedPiece, boardX, boardY)) {
            placePiece(selectedPiece, boardX, boardY);
            } else {
            alert("Hier kann der Stein nicht platziert werden!");
            revertDrag();
            }
        }
        
        if (draggedPiece.parentNode) {
            draggedPiece.parentNode.removeChild(draggedPiece);
        }
        draggedPiece = null;
        selectedPiece = null;
        selectedPieceIndex = -1;
        previewCells = [];
        drawBoard();
    }
    
    document.addEventListener('mouseup', e => { handleDragEnd(e); });
    document.addEventListener('touchend', e => { 
        if (e.changedTouches.length > 0) handleDragEnd(e.changedTouches[0]);
    });
    
    function computePreviewCells(boardX, boardY, piece) {
        let simulated = [];
        for (let y = 0; y < boardSize; y++) {
            simulated[y] = board[y].slice();
        }
        piece.blocks.forEach(block => {
            let x = boardX + block[0];
            let y = boardY + block[1];
            simulated[y][x] = piece.color;
        });
        let preview = [];
        for (let y = 0; y < boardSize; y++) {
            if (simulated[y].every(cell => cell !== 0)) {
            for (let x = 0; x < boardSize; x++) {
                preview.push({ x, y });
            }
            }
        }
        for (let x = 0; x < boardSize; x++) {
            let full = true;
            for (let y = 0; y < boardSize; y++) {
            if (simulated[y][x] === 0) { full = false; break; }
            }
            if (full) {
            for (let y = 0; y < boardSize; y++) {
                if (!preview.some(cell => cell.x === x && cell.y === y)) {
                preview.push({ x, y });
                }
            }
            }
        }
        return preview;
    }
    
    function canPlacePiece(piece, boardX, boardY) {
        for (let block of piece.blocks) {
            const x = boardX + block[0];
            const y = boardY + block[1];
            if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return false;
            if (board[y][x] !== 0) return false;
        }
        return true;
    }
    
    function placePiece(piece, boardX, boardY) {
        piece.blocks.forEach(block => {
            const x = boardX + block[0];
            const y = boardY + block[1];
            board[y][x] = piece.color;
        });
        currentPieces[selectedPieceIndex] = null;
        const canvases = document.querySelectorAll('.piece-canvas');
        canvases.forEach(canvas => {
            if (parseInt(canvas.dataset.index) === selectedPieceIndex) {
            canvas.remove();
            }
        });
        drawBoard();
        let cleared = clearFullLines();
        if (!cleared) { checkEmptyBoard(); }
        updateScore(10);
        setTimeout(() => {
            if (!hasValidMove() && !gameOver) {
            gameOver = true;
            animateEndScreen();
            }
        }, 100);
        
        if (currentPieces.every(piece => piece === null)) {
            generatePieces();
        }
    }
    
    function clearFullLines() {
        let cellsToClear = [];
        let clearedRows = [];
        let clearedCols = [];
        
        for (let y = 0; y < boardSize; y++) {
            if (board[y].every(cell => cell !== 0)) {
            clearedRows.push(y);
            for (let x = 0; x < boardSize; x++) {
                cellsToClear.push({ x, y, color: board[y][x] });
            }
            }
        }
        for (let x = 0; x < boardSize; x++) {
            let full = true;
            for (let y = 0; y < boardSize; y++) {
            if (board[y][x] === 0) { full = false; break; }
            }
            if (full) {
            clearedCols.push(x);
            for (let y = 0; y < boardSize; y++) {
                if (!cellsToClear.some(cell => cell.x === x && cell.y === y)) {
                cellsToClear.push({ x, y, color: board[y][x] });
                }
            }
            }
        }
        
        const bonusPoints = (clearedRows.length + clearedCols.length) * 20;
        if (cellsToClear.length > 0) {
            animateClearCells(cellsToClear, function() {
            cellsToClear.forEach(cell => { board[cell.y][cell.x] = 0; });
            drawBoard();
            updateScore(bonusPoints);
            checkEmptyBoard();
            });
            return true;
        }
        return false;
    }
    
    function animateClearCells(cells, callback) {
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            let progress = (timestamp - startTime) / 500;
            if (progress > 1) progress = 1;
            drawBoard();
            cells.forEach(cell => {
            boardCtx.save();
            boardCtx.globalAlpha = 1 - progress;
            boardCtx.fillStyle = cell.color;
            boardCtx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
            boardCtx.restore();
            });
            if (progress < 1) {
            requestAnimationFrame(step);
            } else {
            callback();
            }
        }
        requestAnimationFrame(step);
    }
    
    function checkEmptyBoard() {
        let empty = true;
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
            if (board[y][x] !== 0) { empty = false; break; }
            }
            if (!empty) break;
        }
        if (empty && !gameOver) { animateEmptyBoard(); }
    }
    
    function animateEndScreen() {
        document.getElementById("pieces-container").style.display = "none";
        let startTime = null;
        const duration = 2000;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            let progress = timestamp - startTime;
            let cutoff = (progress / duration) * boardCanvas.height;
            if (cutoff > boardCanvas.height) cutoff = boardCanvas.height;
            boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
            for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                boardCtx.strokeStyle = '#ccc';
                boardCtx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            }
            for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                let blockTop = y * cellSize;
                if (blockTop >= cutoff && board[y][x] !== 0) {
                drawBlock(x * cellSize, y * cellSize, board[y][x]);
                }
            }
            }
            if (progress < duration) {
                requestAnimationFrame(step);
            } else {
                boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
                boardCtx.save();
                boardCtx.fillStyle = '#7f7f7f';
                boardCtx.font = "40px sans-serif";
                boardCtx.textAlign = "center";
                boardCtx.fillText("No space left!", boardCanvas.width / 2, boardCanvas.height / 2 - 20);
                boardCtx.fillText("Score: " + score, boardCanvas.width / 2, boardCanvas.height / 2 + 20);
                boardCtx.restore();
            }
        }
        requestAnimationFrame(step);
    }
    
    function animateEmptyBoard() {
        animateEndScreen();
    }
    
    function updateScore(points) {
        score += points;
        scoreDisplay.textContent = score;
    }
    
    function hasValidMove() {
        for (let piece of currentPieces) {
            if (piece === null) continue;
            for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (canPlacePiece(piece, x, y)) return true;
            }
            }
        }
        return false;
    }
    
    drawBoard();
    generatePieces();

    boardCanvas.addEventListener('click', function(event) {
        const mouseX = event.offsetX;
        const mouseY = event.offsetY;
        const replayX = boardCanvas.width / 2;
        const replayY = boardCanvas.height / 2 + 60;

        if (mouseX >= replayX && mouseX <= replayX + 100 && mouseY >= replayY - 30 && mouseY <= replayY) {
            location.reload();
        }
    });