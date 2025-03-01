document.addEventListener('DOMContentLoaded', () => {
    // Game Constants
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const EMPTY = 'empty';
    const COLORS = {
        'I': '#00f0f0',
        'J': '#0000f0',
        'L': '#f0a000',
        'O': '#f0f000',
        'S': '#00f000',
        'T': '#a000f0',
        'Z': '#f00000',
    };

    // Game Variables
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let ghostPiece = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameOver = false;
    let isPaused = false;
    let dropInterval = 1000;
    let dropCounter = 0;
    let lastTime = 0;
    let animationId = null;
    
    // DOM Elements
    const gameBoard = document.getElementById('game-board');
    const nextPiecePreview = document.getElementById('next-piece-preview');
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    
    // Tetromino Shapes
    const SHAPES = {
        'I': [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        'J': [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        'L': [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        'O': [
            [1, 1],
            [1, 1]
        ],
        'S': [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        'T': [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        'Z': [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    };
    
    // Initialize the game board
    function initBoard() {
        // Create the grid
        for (let i = 0; i < ROWS; i++) {
            board[i] = [];
            for (let j = 0; j < COLS; j++) {
                board[i][j] = EMPTY;
            }
        }
        
        // Create the board cells
        gameBoard.innerHTML = '';
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell', EMPTY);
                gameBoard.appendChild(cell);
            }
        }
        
        // Create the next piece preview
        nextPiecePreview.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell', EMPTY);
                nextPiecePreview.appendChild(cell);
            }
        }
    }
    
    // Draw the board
    function drawBoard() {
        const cells = gameBoard.querySelectorAll('.cell');
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                const index = i * COLS + j;
                // Set the cell class based on the board state
                if (board[i][j] !== EMPTY) {
                    cells[index].className = 'cell ' + board[i][j];
                } else {
                    cells[index].className = 'cell empty';
                }
            }
        }
    }
    
    // Generate random Tetromino
    function getRandomPiece() {
        const keys = Object.keys(SHAPES);
        const key = keys[Math.floor(Math.random() * keys.length)];
        return {
            shape: SHAPES[key],
            type: key,
            x: Math.floor(COLS / 2) - Math.floor(SHAPES[key][0].length / 2),
            y: 0
        };
    }
    
    // Generate ghost piece
    function getGhostPiece() {
        if (!currentPiece) return null;
        
        const ghost = {
            shape: currentPiece.shape,
            type: currentPiece.type,
            x: currentPiece.x,
            y: currentPiece.y
        };
        
        // Drop the ghost piece as far as it can go
        while (!checkCollision(ghost, 0, 1)) {
            ghost.y++;
        }
        
        return ghost;
    }
    
    // Draw a piece
    function drawPiece(piece, isGhost = false) {
        if (!piece) return;
        
        const cells = gameBoard.querySelectorAll('.cell');
        piece.shape.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value) {
                    const x = piece.x + j;
                    const y = piece.y + i;
                    if (y >= 0 && y < ROWS) {
                        const index = y * COLS + x;
                        if (cells[index]) {
                            cells[index].className = `cell ${piece.type}${isGhost ? ' ghost' : ''}`;
                        }
                    }
                }
            });
        });
    }
    
    // Draw the next piece in the preview
    function drawNextPiece() {
        if (!nextPiece) return;
        
        const cells = nextPiecePreview.querySelectorAll('.cell');
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                cells[i * 4 + j].className = 'cell empty';
            }
        }
        
        nextPiece.shape.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value) {
                    const index = i * 4 + j;
                    cells[index].className = `cell ${nextPiece.type}`;
                }
            });
        });
    }
    
    // Check for collision
    function checkCollision(piece, offsetX, offsetY) {
        for (let i = 0; i < piece.shape.length; i++) {
            for (let j = 0; j < piece.shape[i].length; j++) {
                if (!piece.shape[i][j]) continue;
                
                const newX = piece.x + j + offsetX;
                const newY = piece.y + i + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY < 0) {
                    continue;
                }
                
                if (board[newY][newX] !== EMPTY) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Rotate a piece
    function rotatePiece(piece) {
        const newShape = [];
        
        for (let i = 0; i < piece.shape[0].length; i++) {
            newShape.push([]);
            for (let j = piece.shape.length - 1; j >= 0; j--) {
                newShape[i].push(piece.shape[j][i]);
            }
        }
        
        const newPiece = {
            shape: newShape,
            type: piece.type,
            x: piece.x,
            y: piece.y
        };
        
        // Wall kick if necessary
        if (checkCollision(newPiece, 0, 0)) {
            // Try to move right if collision on the left
            if (checkCollision(newPiece, 1, 0)) {
                // Try to move left if collision on the right
                if (checkCollision(newPiece, -1, 0)) {
                    // Try to move up if collision on the bottom
                    if (checkCollision(newPiece, 0, -1)) {
                        return piece; // Cannot rotate
                    } else {
                        newPiece.y -= 1;
                    }
                } else {
                    newPiece.x -= 1;
                }
            } else {
                newPiece.x += 1;
            }
        }
        
        return newPiece;
    }
    
    // Lock the piece in place
    function lockPiece() {
        // Check if currentPiece exists - safety check
        if (!currentPiece) return;
        
        currentPiece.shape.forEach((row, i) => {
            row.forEach((value, j) => {
                if (value) {
                    const x = currentPiece.x + j;
                    const y = currentPiece.y + i;
                    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                        board[y][x] = currentPiece.type;
                    } else if (y < 0) {
                        gameOver = true;
                    }
                }
            });
        });
        
        // Redraw the board to show locked pieces
        drawBoard();
        
        // Check for completed lines
        checkCompleteLines();
        
        // Next piece becomes current
        currentPiece = nextPiece;
        nextPiece = getRandomPiece();
        ghostPiece = getGhostPiece();
        
        // Check if new piece immediately collides
        if (currentPiece && checkCollision(currentPiece, 0, 0)) {
            gameOver = true;
        }
        
        // Update UI
        drawNextPiece();
        updateScore();
    }
    
    // Check for complete lines
    function checkCompleteLines() {
        let clearedLines = 0;
        
        for (let i = ROWS - 1; i >= 0; i--) {
            let isLineComplete = true;
            
            for (let j = 0; j < COLS; j++) {
                if (board[i][j] === EMPTY) {
                    isLineComplete = false;
                    break;
                }
            }
            
            if (isLineComplete) {
                clearedLines++;
                
                // Move all lines above down
                for (let k = i; k > 0; k--) {
                    for (let j = 0; j < COLS; j++) {
                        board[k][j] = board[k-1][j];
                    }
                }
                
                // Clear the top line
                for (let j = 0; j < COLS; j++) {
                    board[0][j] = EMPTY;
                }
                
                // Check the same row again after moving everything down
                i++;
            }
        }
        
        // Update score and level
        if (clearedLines > 0) {
            lines += clearedLines;
            
            // Update level every 10 lines
            level = Math.floor(lines / 10) + 1;
            
            // Update speed based on level
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            
            // Update score based on number of lines cleared
            const linePoints = [0, 100, 300, 500, 800];
            score += linePoints[clearedLines] * level;
        }
    }
    
    // Update score display
    function updateScore() {
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        levelElement.textContent = level;
    }
    
    // Move the current piece
    function movePiece(dx, dy) {
        if (!currentPiece || gameOver || isPaused) return;
        
        if (!checkCollision(currentPiece, dx, dy)) {
            currentPiece.x += dx;
            currentPiece.y += dy;
            ghostPiece = getGhostPiece();
            return true;
        }
        
        // If can't move down, lock the piece
        if (dy > 0) {
            lockPiece();
        }
        
        return false;
    }
    
    // Hard drop the piece
    function hardDrop() {
        if (!currentPiece || gameOver || isPaused) return;
        
        let dropDistance = 0;
        // Move the piece down until it hits something
        while (!checkCollision(currentPiece, 0, 1)) {
            currentPiece.y++;
            dropDistance++;
        }
        
        // Award points for the hard drop
        if (dropDistance > 0) {
            score += dropDistance * 2; // 2 points per cell dropped
            updateScore();
        }
        
        // Lock the piece in place immediately
        lockPiece();
        
        // Force redraw to show the locked piece
        drawBoard();
    }
    
    // Game loop
    function gameLoop(time = 0) {
        const deltaTime = time - lastTime;
        lastTime = time;
        
        if (!gameOver && !isPaused) {
            dropCounter += deltaTime;
            
            if (dropCounter > dropInterval) {
                movePiece(0, 1);
                dropCounter = 0;
            }
            
            // Clear the board display first
            const cells = gameBoard.querySelectorAll('.cell');
            cells.forEach(cell => {
                cell.className = 'cell empty';
            });
            
            // Draw the locked pieces from the board array
            drawBoard();
            
            // Draw the ghost piece
            drawPiece(ghostPiece, true);
            
            // Draw the current piece
            drawPiece(currentPiece);
        }
        
        if (gameOver) {
            cancelAnimationFrame(animationId);
            alert('Game Over! Your score: ' + score);
            return;
        }
        
        animationId = requestAnimationFrame(gameLoop);
    }
    
    // Handle keydown events
    function handleKeydown(e) {
        if (gameOver) return;
        
        // Toggle pause on 'P' key
        if (e.key === 'p' || e.key === 'P') {
            isPaused = !isPaused;
            return;
        }
        
        if (isPaused) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                movePiece(-1, 0);
                break;
            case 'ArrowRight':
                movePiece(1, 0);
                break;
            case 'ArrowDown':
                // Try to move down, if successful add points
                if (movePiece(0, 1)) {
                    score += 1; // 1 point for soft drop
                    updateScore();
                }
                // Note: if movePiece returns false, it automatically locks the piece if it can't move down
                break;
            case 'ArrowUp':
                currentPiece = rotatePiece(currentPiece);
                ghostPiece = getGhostPiece();
                break;
            case ' ':
                hardDrop();
                break;
        }
    }
    
    // Start the game
    function startGame() {
        initBoard();
        gameOver = false;
        isPaused = false;
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        dropCounter = 0;
        
        // Generate first pieces
        currentPiece = getRandomPiece();
        nextPiece = getRandomPiece();
        ghostPiece = getGhostPiece();
        
        // Update UI
        drawNextPiece();
        updateScore();
        
        // Start game loop
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
    }
    
    // Reset the game
    function resetGame() {
        cancelAnimationFrame(animationId);
        startGame();
    }
    
    // Event listeners
    document.addEventListener('keydown', handleKeydown);
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', resetGame);
    
    // Initialize the game
    initBoard();
});