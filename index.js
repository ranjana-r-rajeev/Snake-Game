var canvas = document.getElementById('game');
var context = canvas.getContext('2d');

// Game State
var grid = 16;
var count = 0;
var score = 0;
var highScore = localStorage.getItem('snakeHighScore') || 0;
var isGameOver = false;
var animationId = null;

// Difficulty Settings
var loopSpeed = 10; // Default Medium (skip 10 frames)
var startSpeed = 10; // To track initial setting for resets
var hasObstacles = false;
var obstacles = [];

// Sound Effects (Web Audio API)
var audioCtx;
try {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  console.warn('Web Audio API not supported');
}

function playSound(type) {
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.log(e));
  }

  var oscillator = audioCtx.createOscillator();
  var gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'eat') {
    // High pitched "ding"
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'gameover') {
    // Low pitched "crash"
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  }
}

// DOM Elements
var scoreEl = document.getElementById('score');
var highScoreEl = document.getElementById('highScore');
var finalScoreEl = document.getElementById('finalScore');
var modal = document.getElementById('gameOverModal');
var restartBtn = document.getElementById('restartBtn');
var homeBtn = document.getElementById('homeBtn');

// Pause Elements
var pauseBtn = document.getElementById('pauseBtn');
var pauseOverlay = document.getElementById('pauseOverlay');
var isPaused = false;

// Start Screen Elements
var startModal = document.getElementById('startModal');
var startBtn = document.getElementById('startBtn');
var difficultyBtns = document.querySelectorAll('.btn-difficulty');

// Initialize UI
highScoreEl.textContent = highScore;

var snake = {
  x: 160,
  y: 160,
  dx: grid,
  dy: 0,
  cells: [],
  maxCells: 4
};

var apple = {
  x: 320,
  y: 320
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function generateObstacles() {
  obstacles = [];
  if (!hasObstacles) return;

  // Generate 5 random obstacles
  for (let i = 0; i < 5; i++) {
    let obsX = getRandomInt(0, 25) * grid;
    let obsY = getRandomInt(0, 25) * grid;

    // Ensure obstacle doesn't spawn on snake or apple (simple check)
    if ((obsX === snake.x && obsY === snake.y) ||
      (obsX === apple.x && obsY === apple.y)) {
      i--; // retry
      continue;
    }
    obstacles.push({ x: obsX, y: obsY });
  }
}

function togglePause() {
  if (isGameOver || startModal.classList.contains('hidden') === false) return;

  isPaused = !isPaused;

  if (isPaused) {
    pauseOverlay.classList.remove('hidden');
    pauseBtn.textContent = '▶ RESUME';
    pauseBtn.classList.add('active');
  } else {
    pauseOverlay.classList.add('hidden');
    pauseBtn.textContent = '❚❚ PAUSE';
    pauseBtn.classList.remove('active');
  }
}

// Reset the game state
function resetGame() {
  snake.x = 160;
  snake.y = 160;
  snake.cells = [];
  snake.maxCells = 4;
  snake.dx = grid;
  snake.dy = 0;

  score = 0;
  scoreEl.textContent = score;

  // Reset speed
  loopSpeed = startSpeed;

  // Regenerate apple
  apple.x = getRandomInt(0, 25) * grid;
  apple.y = getRandomInt(0, 25) * grid;

  // Regenerate obstacles based on current settings
  generateObstacles();

  isGameOver = false;
  isPaused = false;
  modal.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  pauseBtn.textContent = '❚❚ PAUSE';
  pauseBtn.classList.remove('active');
  pauseBtn.classList.remove('hidden');

  // Restart loop
  cancelAnimationFrame(animationId);
  requestAnimationFrame(loop);
}

function goHome() {
  modal.classList.add('hidden');
  startModal.classList.remove('hidden');
  pauseBtn.classList.add('hidden');
}

function endGame() {
  // Play sound only once
  if (!isGameOver) {
    playSound('gameover');
  }

  isGameOver = true;

  // Update High Score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
    highScoreEl.textContent = highScore;
  }

  finalScoreEl.textContent = score;
  modal.classList.remove('hidden');
  pauseBtn.classList.add('hidden');
}

function loop() {
  if (isGameOver) return;

  animationId = requestAnimationFrame(loop);

  if (isPaused) return;

  // Variable Game Speed
  if (++count < loopSpeed) {
    return;
  }

  count = 0;
  context.clearRect(0, 0, canvas.width, canvas.height);

  snake.x += snake.dx;
  snake.y += snake.dy;

  // Wrap around logic (Optional: modern snake usually dies on wall, but keeping wall death as per original code behavior)
  // Original code reset on wall hit. Let's make it Game Over.
  if (snake.x < 0 || snake.x >= canvas.width || snake.y < 0 || snake.y >= canvas.height) {
    endGame();
    return;
  }

  snake.cells.unshift({ x: snake.x, y: snake.y });

  if (snake.cells.length > snake.maxCells) {
    snake.cells.pop();
  }

  // Draw Apple
  context.fillStyle = '#ef4444'; // Red-500
  // Make apple a bit smaller specifically for visual flair
  context.beginPath();
  context.arc(apple.x + grid / 2, apple.y + grid / 2, grid / 2 - 2, 0, 2 * Math.PI);
  context.fill();

  // Draw Obstacles
  if (hasObstacles) {
    context.fillStyle = '#64748b'; // Slate-500
    obstacles.forEach(function (obs) {
      context.fillRect(obs.x, obs.y, grid - 1, grid - 1);

      // Collision with obstacle
      if (snake.x === obs.x && snake.y === obs.y) {
        endGame();
      }
    });
  }

  // Draw Snake
  context.fillStyle = '#10b981'; // Emerald-500
  snake.cells.forEach(function (cell, index) {
    if (index === 0) {
      context.fillStyle = '#34d399'; // Emerald-400
    } else {
      context.fillStyle = '#10b981';
    }

    context.fillRect(cell.x, cell.y, grid - 1, grid - 1);

    if (cell.x === apple.x && cell.y === apple.y) {
      snake.maxCells++;
      score++;
      scoreEl.textContent = score;

      playSound('eat'); // Play eat sound

      // Progressive Speed: Increase speed every 5 points
      // We limit max speed to 4 (Hardest)
      if (score % 5 === 0 && loopSpeed > 4) {
        loopSpeed--;
      }

      apple.x = getRandomInt(0, 25) * grid;
      apple.y = getRandomInt(0, 25) * grid;

      // Ensure apple doesn't spawn on obstacle
      if (hasObstacles) {
        obstacles.forEach(obs => {
          if (apple.x === obs.x && apple.y === obs.y) {
            apple.x = getRandomInt(0, 25) * grid;
            apple.y = getRandomInt(0, 25) * grid;
          }
        });
      }
    }

    for (var i = index + 1; i < snake.cells.length; i++) {
      if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {
        endGame();
        return;
      }
    }
  });
}

document.addEventListener('keydown', function (e) {
  // Prevent default scrolling for arrow keys
  if ([37, 38, 39, 40].indexOf(e.which) > -1) {
    e.preventDefault();
  }

  // Pause Shortcut (P or Space)
  if (e.code === 'Space' || e.code === 'KeyP') {
    if (startModal.classList.contains('hidden') && modal.classList.contains('hidden')) {
      togglePause();
    }
  }

  if (e.which === 37 && snake.dx === 0) {
    snake.dx = -grid;
    snake.dy = 0;
  }
  else if (e.which === 38 && snake.dy === 0) {
    snake.dy = -grid;
    snake.dx = 0;
  }
  else if (e.which === 39 && snake.dx === 0) {
    snake.dx = grid;
    snake.dy = 0;
  }
  else if (e.which === 40 && snake.dy === 0) {
    snake.dy = grid;
    snake.dx = 0;
  }
});

// Mobile Controls Logic
var upBtn = document.getElementById('upBtn');
var leftBtn = document.getElementById('leftBtn');
var downBtn = document.getElementById('downBtn');
var rightBtn = document.getElementById('rightBtn');

// Helper to set direction
function setDirection(direction) {
  if (direction === 'left' && snake.dx === 0) {
    snake.dx = -grid;
    snake.dy = 0;
  } else if (direction === 'up' && snake.dy === 0) {
    snake.dy = -grid;
    snake.dx = 0;
  } else if (direction === 'right' && snake.dx === 0) {
    snake.dx = grid;
    snake.dy = 0;
  } else if (direction === 'down' && snake.dy === 0) {
    snake.dy = grid;
    snake.dx = 0;
  }
}

// Attach listeners (using pointerdown for faster response than click)
upBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); setDirection('up'); });
leftBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); setDirection('left'); });
downBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); setDirection('down'); });
rightBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); setDirection('right'); });

// Difficulty Selection Logic
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', function () {
    // Remove selected class from all
    difficultyBtns.forEach(b => b.classList.remove('selected'));
    // Add to clicked
    this.classList.add('selected');

    // Update settings
    startSpeed = parseInt(this.dataset.speed);
    loopSpeed = startSpeed;
    hasObstacles = this.dataset.obstacles === 'true';
  });
});

pauseBtn.addEventListener('click', togglePause);

function startGame() {
  startModal.classList.add('hidden');
  // Ensure audio context is ready on user interaction
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.log(e));
  }
  resetGame();
}

restartBtn.addEventListener('click', resetGame);
homeBtn.addEventListener('click', goHome);
startBtn.addEventListener('click', startGame);