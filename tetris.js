document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('nextPiece');
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    
    // Game dimensions
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = canvas.width / COLS;
    const NEXT_BLOCK_SIZE = nextPieceCanvas.width / 4;
    
    // Game variables
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameOver = false;
    let paused = false;
    let dropInterval = 1000; // Starting speed (ms)
    let lastDropTime = 0;
    let requestId = null;
    // DOM elements
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const gameOverModal = document.getElementById('gameOverModal');
    const finalScoreElement = document.getElementById('finalScore');
    const restartBtn = document.getElementById('restartBtn');
    
    // Control buttons
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const rotateBtn = document.getElementById('rotateBtn');
    const dropBtn = document.getElementById('dropBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const returnBtn = document.getElementById('returnBtn');
    
    // Tetromino colors
    const colors = [
        null,
        '#FF0D72', // I
        '#0DC2FF', // J
        '#0DFF72', // L
        '#F538FF', // O
        '#FF8E0D', // S
        '#FFE138', // T
        '#3877FF'  // Z
    ];
    
    // Tetromino shapes
    const pieces = [
        null,
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
        [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
        [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
        [[0, 4, 4], [0, 4, 4], [0, 0, 0]], // O
        [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
        [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
        [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
    ];
    
    // Current and next piece
    let currentPiece = getRandomPiece();
    let nextPiece = getRandomPiece();
    
    // Position of the current piece
    let piecePosition = { x: 0, y: 0 };
    
    // Reset the game
    function reset() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        score = 0;
        lines = 0;
        level = 1;
        gameOver = false;
        dropInterval = 1000;
        updateScore();
        
        currentPiece = getRandomPiece();
        nextPiece = getRandomPiece();
        resetPiecePosition();
        
        gameOverModal.style.display = 'none';
        
        if (requestId) {
            cancelAnimationFrame(requestId);
        }
        
        lastDropTime = performance.now();
        requestId = requestAnimationFrame(gameLoop);
    }
    
    // Get a random tetromino piece
    function getRandomPiece() {
        const pieceIndex = Math.floor(Math.random() * 7) + 1;
        return pieces[pieceIndex];
    }
    
    // Reset piece position to top center
    function resetPiecePosition() {
        piecePosition.y = 0;
        // Center the piece horizontally
        piecePosition.x = Math.floor(COLS / 2) - Math.floor(currentPiece[0].length / 2);
        
        // Check if game is over (collision on spawn)
        if (checkCollision(0, 0)) {
            gameOver = true;
            showGameOver();
        }
    }
    
    // Draw the game board and current piece
    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        drawBoard();
        
        // Draw ghost piece (shadow at landing position)
        drawGhostPiece();
        
        // Draw current piece
        drawPiece(ctx, currentPiece, piecePosition.x, piecePosition.y, BLOCK_SIZE);
        
        // Draw next piece preview
        drawNextPiece();
    }
    
    // Draw the board
    function drawBoard() {
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    ctx.fillStyle = colors[value];
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
    
    // Draw a tetromino piece
    function drawPiece(context, piece, offsetX, offsetY, blockSize, isGhost = false) {
        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (isGhost) {
                        // For ghost piece, use semi-transparent color
                        context.fillStyle = colors[value] + '60'; // 60 is 37.5% opacity in hex
                        context.strokeStyle = colors[value] + '90'; // 90 is 56.25% opacity in hex
                    } else {
                        context.fillStyle = colors[value];
                        context.strokeStyle = '#222';
                    }
                    
                    context.fillRect((offsetX + x) * blockSize, (offsetY + y) * blockSize, blockSize, blockSize);
                    context.lineWidth = 1;
                    context.strokeRect((offsetX + x) * blockSize, (offsetY + y) * blockSize, blockSize, blockSize);
                }
            });
        });
    }
    
    // Draw the ghost piece (shadow) where the piece would land
    function drawGhostPiece() {
        // Find ghost position (how far the piece can drop)
        let ghostY = 0;
        
        // Keep checking each row down until we find a collision
        while (!checkCollision(0, ghostY + 1)) {
            ghostY++;
        }
        
        // Only draw ghost if it's not at the same position as current piece
        if (ghostY > 0) {
            drawPiece(
                ctx,
                currentPiece,
                piecePosition.x,
                piecePosition.y + ghostY,
                BLOCK_SIZE,
                true // isGhost parameter
            );
        }
    }
    
    // Draw the next piece preview
    function drawNextPiece() {
        nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        // Center the piece in the preview canvas
        const offsetX = Math.floor((4 - nextPiece[0].length) / 2);
        const offsetY = Math.floor((4 - nextPiece.length) / 2);
        
        drawPiece(nextPieceCtx, nextPiece, offsetX, offsetY, NEXT_BLOCK_SIZE);
    }
    
    // Check if there is a collision
    function checkCollision(offsetX, offsetY, pieceMat = currentPiece) {
        for (let y = 0; y < pieceMat.length; y++) {
            for (let x = 0; x < pieceMat[y].length; x++) {
                if (pieceMat[y][x] !== 0) {
                    const newX = piecePosition.x + x + offsetX;
                    const newY = piecePosition.y + y + offsetY;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // Rotate the piece
    function rotate() {
        const rotated = [];
        for (let i = 0; i < currentPiece[0].length; i++) {
            rotated.push([]);
            for (let j = currentPiece.length - 1; j >= 0; j--) {
                rotated[i].push(currentPiece[j][i]);
            }
        }
        
        if (!checkCollision(0, 0, rotated)) {
            currentPiece = rotated;
        } else {
            // Wall kick - try shifting left or right if rotation collides
            for (let offset of [-1, 1, -2, 2]) {
                if (!checkCollision(offset, 0, rotated)) {
                    currentPiece = rotated;
                    piecePosition.x += offset;
                    break;
                }
            }
        }
    }
    
    // Move the piece down by one row
    function moveDown() {
        if (!checkCollision(0, 1)) {
            piecePosition.y++;
            return true;
        }
        
        // If can't move down, lock the piece
        lockPiece();
        return false;
    }
    
    // Move the piece left or right
    function move(dir) {
        if (!checkCollision(dir, 0)) {
            piecePosition.x += dir;
        }
    }
    
    // Hard drop the piece to the bottom
    function hardDrop() {
        while (moveDown()) {
            // Keep moving down until it can't
            score += 2;
        }
        updateScore();
    }
    
    // Lock the piece in place and check for line clears
    function lockPiece() {
        currentPiece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[piecePosition.y + y][piecePosition.x + x] = value;
                }
            });
        });
        
        // Check for line clears
        checkLines();
        
        // Get next piece
        currentPiece = nextPiece;
        nextPiece = getRandomPiece();
        resetPiecePosition();
    }
    
    // Check for completed lines
    function checkLines() {
        let linesCleared = 0;
        
        for (let y = ROWS - 1; y >= 0; y--) {
            // If every cell in this row is filled
            if (board[y].every(value => value !== 0)) {
                // Remove this row
                board.splice(y, 1);
                // Add a new empty row at the top
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                
                // Keep checking the same row again (since we moved rows down)
                y++;
            }
        }
        
        if (linesCleared > 0) {
            // Update score based on number of lines cleared at once
            const points = [0, 100, 300, 500, 800];
            score += points[linesCleared] * level;
            
            // Update lines and check for level up
            lines += linesCleared;
            const newLevel = Math.floor(lines / 10) + 1;
            
            if (newLevel > level) {
                level = newLevel;
                // Increase speed with level
                dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            }
            
            updateScore();
        }
    }
    
    // Update score display
    function updateScore() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }
    
    // Show game over modal
    function showGameOver() {
        finalScoreElement.textContent = score;
        gameOverModal.style.display = 'flex';
    }
    
    // Draw pause overlay
    function drawPauseOverlay() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px Arial';
        ctx.fillText('Press Return to continue', canvas.width / 2, canvas.height / 2 + 30);
    }
    
    // Toggle pause state
    function togglePause() {
        if (gameOver) return;
        
        paused = !paused;
        
        if (paused) {
            // Pause the game
            cancelAnimationFrame(requestId);
            // Show pause overlay
            drawPauseOverlay();
        } else {
            // Resume the game
            lastDropTime = performance.now();
            requestId = requestAnimationFrame(gameLoop);
        }
    }
    
    // Game loop
    function gameLoop(timestamp) {
        if (gameOver || paused) return;
        
        const deltaTime = timestamp - lastDropTime;
        
        // Check if it's time to drop the piece
        if (deltaTime > dropInterval) {
            moveDown();
            lastDropTime = timestamp;
        }
        
        draw();
        requestId = requestAnimationFrame(gameLoop);
    }
    
    // Event listeners for keyboard controls
    document.addEventListener('keydown', event => {
        if (gameOver) return;
        
        switch (event.key) {
            case 'ArrowLeft':
                move(-1);
                break;
            case 'ArrowRight':
                move(1);
                break;
            case 'ArrowDown':
                moveDown();
                break;
            case 'ArrowUp':
                rotate();
                break;
            case ' ':
                hardDrop();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
        }
    });
    
    // Touch controls
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver) move(-1);
    });
    
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver) move(1);
    });
    
    rotateBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver) rotate();
    });
    
    dropBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver) hardDrop();
    });
    
    // Add mouse controls for buttons too (for testing on desktop)
    leftBtn.addEventListener('mousedown', (e) => {
        if (!gameOver) move(-1);
    });
    
    rightBtn.addEventListener('mousedown', (e) => {
        if (!gameOver) move(1);
    });
    
    rotateBtn.addEventListener('mousedown', (e) => {
        if (!gameOver) rotate();
    });
    
    dropBtn.addEventListener('mousedown', (e) => {
        if (!gameOver) hardDrop();
    });
    
    // Restart button
    restartBtn.addEventListener('click', reset);
    
    // Pause and Return buttons
    pauseBtn.addEventListener('click', () => {
        if (!gameOver) togglePause();
    });
    
    returnBtn.addEventListener('click', () => {
        if (paused) togglePause();
    });
    
    // Add swipe controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (gameOver) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        
        // Determine if it's a swipe or a tap
        if (deltaTime < 300) { // Short touch duration for swipe or tap
            if (Math.abs(deltaX) > 30) { // Horizontal swipe
                if (deltaX > 0) {
                    move(1); // Right
                } else {
                    move(-1); // Left
                }
            } else if (Math.abs(deltaY) > 30) { // Vertical swipe
                if (deltaY > 0) {
                    moveDown(); // Down
                } else {
                    rotate(); // Up (rotate)
                }
            } else {
                // Tap to rotate
                rotate();
            }
        }
    }, { passive: false });
    
    // Prevent default touch actions on game area
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    
    // Start the game
    reset();
});