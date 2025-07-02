// Game constants (pixels/sec, radians/sec, etc.)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHIP_SIZE = 20;
const SHIP_THRUST = 200; // pixels/sec^2
const SHIP_TURN_SPEED = 360 * (Math.PI / 180); // 360 degrees/sec
const SHIP_FRICTION = 0.7; // coefficient, 0 = no friction, 1 = full stop in 1s
const SHIP_MAX_SPEED = 300; // pixels/sec
const BULLET_SPEED = 500; // pixels/sec
const BULLET_LIFETIME = 1.5; // seconds
const BULLET_RADIUS = 2;
const ASTEROID_SPEED = 80; // pixels/sec
const ASTEROID_SIZE = 40;
const INVINCIBILITY_DURATION = 3; // seconds
const PARTICLE_RADIUS = 3;
const PARTICLE_COLLECT_RADIUS = 20;

// Game state
let canvas, ctx;
let ship = {};
let bullets = [];
let asteroids = [];
let score = 0;
let lives = 3;
let level = 1;
let smartBombs = 3;
let highScore = 0;
let gameOver = false;
let keys = {};
let lastShotTime = 0;
let lastFrameTime = 0;
let gameLoopId;
let isInvincible = false;
let invincibleTimer = 0;
let particles = [];
// Countdown letter game additions
let letters = [];
let collectedLetters = '';
let foundWords = [];
let wordScore = 0;

// Scrabble letter values
const LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
};

// English dictionary - simple list of common words for validation
const DICTIONARY = ['ACE', 'BAD', 'CAT', 'DOG', 'EAT', 'FUN', 'GOT', 'HAT', 'ICE', 'JOY', 'KIT', 
                   'LET', 'MAP', 'NET', 'ODD', 'PAT', 'RED', 'SIT', 'TOP', 'USE', 'VAN', 'WET', 
                   'YES', 'ZIP', 'GOOD', 'STAR', 'TIME', 'WORD', 'GAME', 'PLAY', 'SHIP', 'ROCK', 
                   'FAST', 'SLOW', 'HIGH', 'DOWN', 'OVER', 'UNDER', 'SPACE'];

// Audio Engine
let audioContext;
const audioBuffers = {};
let thrustNode = null;
let audioInitialized = false;

// Visuals
let stars = [];
const NUM_STARS = 100;

// DOM elements
let startScreen, gameOverScreen, startButton, restartButton, finalScoreElement, gameContainer, scoreDisplay, livesDisplay, highScoreDisplay;

// Start or restart the game
function startGame() {
    try {
        console.log('startGame called');
    // Initialize audio on the first user interaction
    if (!audioInitialized) {
        initAudio();
    }

    // Reset game state
    gameOver = false;
    score = 0;
    wordScore = 0;
    level = 1;
    lives = 3;
    smartBombs = 1;
    collectedLetters = '';
    foundWords = [];
    ship.x = CANVAS_WIDTH / 2;
    ship.y = CANVAS_HEIGHT / 2;
    ship.dx = 0;
    ship.dy = 0;
    ship.rotation = 0;
    bullets = [];
    asteroids = [];
    createAsteroids(level + 2);
    resetShip();

    // Hide screens
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Start game loop
    lastFrameTime = performance.now();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(runGameLoop);

    updateDisplays();
    } catch (err) {
        console.error('Error in startGame():', err);
        alert('Error starting game: ' + err.message);
    }
}

// Main game loop function
function runGameLoop(timestamp) {
    try {
        if (gameOver) return;

        const deltaTime = (timestamp - lastFrameTime) / 1000;
        lastFrameTime = timestamp;

        update(deltaTime);
        draw();

        gameLoopId = requestAnimationFrame(runGameLoop);
    } catch (err) {
        console.error('Error in game loop:', err);
        cancelAnimationFrame(gameLoopId);
    }
}

// Initialize the game
function init() {
    try {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Assign DOM elements
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over');
    startButton = document.getElementById('start-button');
    restartButton = document.getElementById('restart-button');
    finalScoreElement = document.getElementById('final-score');
    gameContainer = document.getElementById('game-container');
    scoreDisplay = document.createElement('div');
    livesDisplay = document.createElement('div');
    highScoreDisplay = document.createElement('div');

    // Style and append displays
    scoreDisplay.id = 'score-display';
    livesDisplay.id = 'lives-display';
    highScoreDisplay.id = 'high-score-display';

    // Letter rack at top of screen
    const letterRack = document.createElement('div');
    letterRack.id = 'letter-rack';
    letterRack.style.position = 'absolute';
    letterRack.style.top = '80px';
    letterRack.style.left = '50%';
    letterRack.style.transform = 'translateX(-50%)';
    letterRack.style.display = 'flex';
    letterRack.style.gap = '5px';
    letterRack.style.height = '35px';
    gameContainer.appendChild(letterRack);
    
    // Word display showing found words
    const wordsDisplay = document.createElement('div');
    wordsDisplay.id = 'words-display';
    wordsDisplay.style.position = 'absolute';
    wordsDisplay.style.top = '125px';
    wordsDisplay.style.left = '50%';
    wordsDisplay.style.transform = 'translateX(-50%)';
    wordsDisplay.style.color = 'gold';
    wordsDisplay.style.fontSize = '1.2em';
    wordsDisplay.style.textAlign = 'center';
    wordsDisplay.style.fontWeight = 'bold';
    gameContainer.appendChild(wordsDisplay);
    
    // Word score display
    const wordScoreDisplay = document.createElement('div');
    wordScoreDisplay.id = 'word-score-display';
    wordScoreDisplay.style.position = 'absolute';
    wordScoreDisplay.style.top = '145px';
    wordScoreDisplay.style.left = '50%';
    wordScoreDisplay.style.transform = 'translateX(-50%)';
    wordScoreDisplay.style.color = 'lime';
    wordScoreDisplay.style.fontSize = '1.2em';
    wordScoreDisplay.textContent = 'Word Score: 0';
    gameContainer.appendChild(wordScoreDisplay);
    
    // Used for the check word button
    const checkWordBtn = document.createElement('button');
    checkWordBtn.id = 'check-word-btn';
    checkWordBtn.style.position = 'absolute';
    checkWordBtn.style.top = '175px';
    checkWordBtn.style.left = '50%';
    checkWordBtn.style.transform = 'translateX(-50%)';
    checkWordBtn.style.padding = '5px 10px';
    checkWordBtn.style.backgroundColor = '#4CAF50';
    checkWordBtn.style.color = 'white';
    checkWordBtn.style.border = 'none';
    checkWordBtn.style.borderRadius = '4px';
    checkWordBtn.style.cursor = 'pointer';
    checkWordBtn.textContent = 'CHECK WORD';
    gameContainer.appendChild(checkWordBtn);
    
    // Event listener for check word button
    checkWordBtn.addEventListener('click', checkWord);   
    gameContainer.appendChild(scoreDisplay);
    gameContainer.appendChild(livesDisplay);
    gameContainer.appendChild(highScoreDisplay);

    // Load high score
    const savedHighScore = localStorage.getItem('asteroidsHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore, 10);
    }

    // Event listeners
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    // Make sure buttons exist before adding event listeners
    if (startButton) {
        startButton.addEventListener('click', function() {
            console.log('Start button clicked');
            startGame();
        });
    } else {
        console.error('startButton not found in DOM');
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', function() {
            console.log('Restart button clicked');
            startGame();
        });
    } else {
        console.error('restartButton not found in DOM');
    }

    // Create stars for parallax effect
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            radius: Math.random() * 1.5,
            depth: Math.random() * 0.5 + 0.1 // Depth determines speed and brightness
        });
    }



    // Initial render
    console.log('Game initialized, displays updated');
    updateDisplays();
    draw(); // Draw initial state
    } catch (err) {
        console.error('Error in init():', err);
        alert('Error initializing game: ' + err.message);
    }
}

// Reset ship to center of screen
function resetShip() {
    ship = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        dx: 0, dy: 0, rotation: 0,
        radius: SHIP_SIZE / 2,
        isThrusting: false
    };
    isInvincible = true;
    invincibleTimer = INVINCIBILITY_DURATION;
}

// Create asteroids
function createAsteroids(count) {
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = Math.random() * CANVAS_WIDTH;
            y = Math.random() * CANVAS_HEIGHT;
        } while (Math.hypot(x - ship.x, y - ship.y) < 150);

        asteroids.push(newAsteroid(x, y, ASTEROID_SIZE + Math.random() * 10));
    }
}

function newAsteroid(x, y, radius) {
    const angle = Math.random() * Math.PI * 2;
    return {
        x, y, radius,
        dx: (Math.random() - 0.5) * ASTEROID_SPEED,
        dy: (Math.random() - 0.5) * ASTEROID_SPEED,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        rotationY: 0,
        rotationSpeedY: (Math.random() - 0.5) * 0.1,
        color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`
    };
}

// Split asteroid into smaller ones
function createFloatingText(text, x, y, color, duration) {
    const floatingText = {
        text,
        x,
        y,
        color,
        opacity: 1,
        lifetime: duration,
        dy: -40  // Speed moving up
    };
    
    particles.push(floatingText);
}

function spawnLetter(x, y) {
    const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    letters.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 60,
        dy: (Math.random() - 0.5) * 60,
        radius: 12,
        char,
        life: 10
    });
}

function splitAsteroid(asteroid, index) {
    const newRadius = asteroid.radius / 2;
    // Spawn a collectible letter where asteroid was destroyed
    spawnLetter(asteroid.x, asteroid.y);
    asteroids.splice(index, 1);

    if (newRadius >= 10) {
        asteroids.push(newAsteroid(asteroid.x, asteroid.y, newRadius));
        asteroids.push(newAsteroid(asteroid.x, asteroid.y, newRadius));
    }
}

// Handle key events
function keyDownHandler(e) {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
}

function keyUpHandler(e) {
    keys[e.key] = false;
}

// Update game state
function update(deltaTime) {
    const lettersDisplay = document.getElementById('letters-display');
    const wordsDisplay = document.getElementById('words-display');
    // Ship controls
    if (keys['ArrowLeft']) ship.rotation -= SHIP_TURN_SPEED * deltaTime;
    if (keys['ArrowRight']) ship.rotation += SHIP_TURN_SPEED * deltaTime;

    // Apply thrust
    if (keys['ArrowUp']) {
        const thrustAngle = ship.rotation - Math.PI / 2;
        ship.dx += Math.cos(thrustAngle) * SHIP_THRUST * deltaTime;
        ship.dy += Math.sin(thrustAngle) * SHIP_THRUST * deltaTime;
        if (!ship.isThrusting) {
            ship.isThrusting = true;
            startThrustSound();
        }
    } else {
        if (ship.isThrusting) {
            ship.isThrusting = false;
            stopThrustSound();
        }
    }

    // Apply friction
    ship.dx -= SHIP_FRICTION * ship.dx * deltaTime;
    ship.dy -= SHIP_FRICTION * ship.dy * deltaTime;

    // Limit speed
    const speed = Math.sqrt(ship.dx * ship.dx + ship.dy * ship.dy);
    if (speed > SHIP_MAX_SPEED) {
        ship.dx = (ship.dx / speed) * SHIP_MAX_SPEED;
        ship.dy = (ship.dy / speed) * SHIP_MAX_SPEED;
    }

    // Update position
    ship.x += ship.dx * deltaTime;
    ship.y += ship.dy * deltaTime;

    // Wrap around screen
    wrapObject(ship);

    // Smart Bomb
    if (keys['b'] && smartBombs > 0) {
        activateSmartBomb();
        keys['b'] = false;
    }

    // Shooting
    if (keys[' ']) {
        const now = Date.now();
        if (now - lastShotTime > 200) {
            shoot();
            lastShotTime = now;
        }
    }

    // Update letters
    for (let i = letters.length - 1; i >= 0; i--) {
        const l = letters[i];
        l.x += l.dx * deltaTime;
        l.y += l.dy * deltaTime;
        l.life -= deltaTime;
        wrapObject(l);
        if (isColliding(ship, l)) {
            // Add the letter to our collection
            collectedLetters += l.char;
            letters.splice(i, 1);
            playSound('collect');
            updateLetterRack(); // Update visual letter tiles
            
            // Auto-check if we've formed a valid word with 3+ letters
            if (collectedLetters.length >= 3) {
                checkWord(null, true); // Pass true as auto-check flag
            }
        } else if (l.life <= 0) {
            letters.splice(i, 1);
        }
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.dx * deltaTime;
        bullet.y += bullet.dy * deltaTime;
        bullet.lifetime -= deltaTime;
        if (bullet.lifetime <= 0) {
            bullets.splice(i, 1);
        }
    }

    // Update stars for parallax effect
    stars.forEach(star => {
        star.x -= ship.dx * star.depth * 0.1 * deltaTime;
        star.y -= ship.dy * star.depth * 0.1 * deltaTime;
        // Wrap stars
        if (star.x < 0) star.x = CANVAS_WIDTH;
        if (star.x > CANVAS_WIDTH) star.x = 0;
        if (star.y < 0) star.y = CANVAS_HEIGHT;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
    });

    // Update asteroids
    asteroids.forEach(asteroid => {
        asteroid.x += asteroid.dx * deltaTime;
        asteroid.y += asteroid.dy * deltaTime;
        asteroid.rotation += asteroid.rotationSpeed * deltaTime;
        asteroid.rotationY += asteroid.rotationSpeedY * deltaTime;
        wrapObject(asteroid);
    });

    // No need to update letter rack every frame - it's done on collection

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Handle floating text particles separately
        if (particle.text) {
            particle.y += particle.dy * deltaTime;
            particle.lifetime -= deltaTime;
            particle.opacity = Math.max(0, particle.lifetime);
            
            if (particle.lifetime <= 0) {
                particles.splice(i, 1);
            }
            continue;
        }
        
        // Handle regular particles
        particle.x += particle.dx * deltaTime;
        particle.y += particle.dy * deltaTime;
        particle.life -= deltaTime;

        if (particle.type === 'collectible') {
            const dist = Math.hypot(ship.x - particle.x, ship.y - particle.y);
            if (dist < PARTICLE_COLLECT_RADIUS + ship.radius) {
                score += 10;
                playSound('collect');
                particles.splice(i, 1);
                updateDisplays();
                continue;
            }
        }
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Collision detection
    handleCollisions();

    // Invincibility timer
    if (isInvincible) {
        invincibleTimer -= deltaTime;
        if (invincibleTimer <= 0) {
            isInvincible = false;
        }
    }

    // Level completion
    if (asteroids.length === 0 && !gameOver) {
        level++;
        playSound('levelUp');
        createAsteroids(level + 2);
    }
}

function handleCollisions() {
    // Bullet-asteroid collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (isColliding(bullets[i], asteroids[j])) {
                score += Math.floor(100 / (asteroids[j].radius / 20));
                playSound('explosion');
                createExplosion(asteroids[j].x, asteroids[j].y, asteroids[j].color);
                splitAsteroid(asteroids[j], j);
                bullets.splice(i, 1);
                updateDisplays();
                break; // Move to next bullet
            }
        }
    }

    // Ship-asteroid collisions
    if (!isInvincible) {
        for (let i = 0; i < asteroids.length; i++) {
            if (isColliding(ship, asteroids[i])) {
                lives--;
                createExplosion(ship.x, ship.y, 'white', 30);
                playSound('explosion');
                if (lives <= 0) {
                    endGame();
                } else {
                    resetShip();
                }
                updateDisplays();
                break;
            }
        }
    }
}

function isColliding(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.radius + obj2.radius;
}

function endGame() {
    gameOver = true;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('asteroidsHighScore', highScore.toString());
    }
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.textContent = score;
    updateDisplays();
}

function shoot() {
    const launchAngle = ship.rotation - Math.PI / 2;
    const offset = SHIP_SIZE * 0.6;

    const bullet = {
        x: ship.x + Math.cos(launchAngle) * offset,
        y: ship.y + Math.sin(launchAngle) * offset,
        dx: Math.cos(launchAngle) * BULLET_SPEED + ship.dx,
        dy: Math.sin(launchAngle) * BULLET_SPEED + ship.dy,
        lifetime: BULLET_LIFETIME,
        radius: BULLET_RADIUS
    };
    bullets.push(bullet);

    playSound('shoot');
}

function activateSmartBomb() {
    smartBombs--;
    asteroids.forEach(ast => createExplosion(ast.x, ast.y, ast.color, 5));
    asteroids = []; // Clear all asteroids
    score += 50 * level; // Bonus points
    playSound('smartBomb');
    updateDisplays();
}

function wrapObject(obj) {
    if (obj.x < -obj.radius) obj.x = CANVAS_WIDTH + obj.radius;
    if (obj.x > CANVAS_WIDTH + obj.radius) obj.x = -obj.radius;
    if (obj.y < -obj.radius) obj.y = CANVAS_HEIGHT + obj.radius;
    if (obj.y > CANVAS_HEIGHT + obj.radius) obj.y = -obj.radius;
}

function calculateWordScore(word) {
    let total = 0;
    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        total += LETTER_VALUES[letter] || 1;
    }
    
    // Length bonuses
    if (word.length >= 5) total *= 2;  // Double score for 5+ letters
    if (word.length >= 7) total *= 2;  // Additional double (4x total) for 7+ letters
    
    return total;
}

function updateLetterRack() {
    const letterRack = document.getElementById('letter-rack');
    if (!letterRack) return;
    
    // Clear existing letter tiles
    letterRack.innerHTML = '';
    
    // Create new letter tiles
    for (let i = 0; i < collectedLetters.length; i++) {
        const letter = collectedLetters[i];
        const letterTile = document.createElement('div');
        letterTile.className = 'letter-tile';
        letterTile.style.width = '30px';
        letterTile.style.height = '30px';
        letterTile.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        letterTile.style.color = 'black';
        letterTile.style.border = '1px solid #666';
        letterTile.style.borderRadius = '4px';
        letterTile.style.display = 'flex';
        letterTile.style.justifyContent = 'center';
        letterTile.style.alignItems = 'center';
        letterTile.style.fontWeight = 'bold';
        letterTile.style.fontSize = '20px';
        letterTile.style.position = 'relative';
        letterTile.textContent = letter;
        
        // Add scrabble point value
        const pointValue = document.createElement('span');
        pointValue.style.position = 'absolute';
        pointValue.style.bottom = '0';
        pointValue.style.right = '2px';
        pointValue.style.fontSize = '9px';
        pointValue.textContent = LETTER_VALUES[letter] || '1';
        letterTile.appendChild(pointValue);
        
        letterRack.appendChild(letterTile);
    }
    
    // Update words display
    const wordsDisplay = document.getElementById('words-display');
    if (wordsDisplay) wordsDisplay.textContent = foundWords.join(' • ');
    
    // Update word score display
    const wordScoreDisplay = document.getElementById('word-score-display');
    if (wordScoreDisplay) wordScoreDisplay.textContent = `Word Score: ${wordScore}`;
}

function checkWord(event, autoCheck = false) {
    // If no letters or we're auto-checking with fewer than 3 letters, exit
    if (collectedLetters.length === 0 || (autoCheck && collectedLetters.length < 3)) return;
    
    const word = collectedLetters;
    
    // Check if the word is in our dictionary
    if (DICTIONARY.includes(word)) {
        // Calculate score
        const points = calculateWordScore(word);
        score += points;
        wordScore += points;
        
        // Animate score increase
        createFloatingText(`+${points}`, ship.x, ship.y - 30, 'gold', 1.5);
        
        // Add to found words
        foundWords.push(word);
        
        // Clear collected letters
        collectedLetters = '';
        
        // Play success sound
        playSound('levelUp');
        
        // Update displays
        updateLetterRack();
        updateDisplays();
    } else if (!autoCheck) {
        // Only play error sound if manually checking
        playSound('explosion');
        
        // Shake the letter rack to indicate invalid word
        const letterRack = document.getElementById('letter-rack');
        if (letterRack) {
            letterRack.style.animation = 'shake 0.5s';
            setTimeout(() => {
                letterRack.style.animation = '';
            }, 500);
        }
    }
}

function updateDisplays() {
    scoreDisplay.textContent = `Score: ${score} | Level: ${level}`;  // Include word score in main score
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    livesDisplay.textContent = `Lives: ${'♥'.repeat(lives)} | Bombs: ${'♦'.repeat(smartBombs)} | v7.1.0`;
}

// Draw game objects
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawStars();
    drawShip();
    drawAsteroids();
    drawLetters();
    drawBullets();
    drawParticles();
}

function drawStars() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.globalAlpha = star.depth * 1.8; // Fainter stars are further away
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);

    // Draw thruster
    if (ship.isThrusting && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.fillStyle = 'yellow';
        ctx.font = `bold ${ship.radius * 1.5}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('W', 0, ship.radius * 1.2);
    }

    // Draw ship character
    ctx.font = `bold ${ship.radius * 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = (isInvincible && Math.floor(Date.now() / 150) % 2 === 0) ? 'grey' : 'white';
    ctx.fillText('A', 0, 0);

    ctx.restore();
}

function drawAsteroids() {
    asteroids.forEach(asteroid => {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotation); // Z-axis rotation

        // Simulate 3D rotation by scaling on the X-axis
        const scaleX = Math.cos(asteroid.rotationY);
        ctx.scale(scaleX, 1);
        
        ctx.font = `bold ${asteroid.radius * 2}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = asteroid.color;
        ctx.fillText('@', 0, 0);
        
        ctx.restore();
    });
}

function drawLetters() {
    ctx.fillStyle = 'lightgreen';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    letters.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.fillText(l.char, 0, 0);
        ctx.restore();
    });
}

function drawBullets() {
    ctx.fillStyle = 'yellow';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const isCollectible = Math.random() < 0.3; // 30% chance to be a collectible
        particles.push({
            x, y,
            dx: (Math.random() - 0.5) * (isCollectible ? 50 : 150),
            dy: (Math.random() - 0.5) * (isCollectible ? 50 : 150),
            life: Math.random() * (isCollectible ? 5 : 1) + (isCollectible ? 3 : 0.5),
            radius: isCollectible ? PARTICLE_RADIUS : Math.random() * 2 + 1,
            color: isCollectible ? 'gold' : color,
            type: isCollectible ? 'collectible' : 'explosion'
        });
    }
}

function drawParticles() {
    for (const p of particles) {
        if (p.text) {
            // This is floating text
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        } else {
            // Regular particle
            ctx.globalAlpha = Math.min(1, Math.max(0, p.life / 2)); // Fade out
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1.0; // Reset alpha
}

// --- Audio Engine ---
async function initAudio() {
    if (audioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Resume context on user gesture if it's suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const soundPaths = {
                        shoot: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_5b3649c61b.mp3',
            collect: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c9a8f95873.mp3',
            explosion: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_a9f2a4125d.mp3',
            levelUp: 'https://cdn.pixabay.com/download/audio/2022/11/17/audio_88f21f0786.mp3',
            smartBomb: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_28b44b2533.mp3',
            thrust: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_a2b2101734.mp3'
        };

        for (const [name, path] of Object.entries(soundPaths)) {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[name] = await audioContext.decodeAudioData(arrayBuffer);
        }
        audioInitialized = true;
    } catch (e) {
        console.error('Failed to initialize audio:', e);
    }
}

function playSound(name) {
    if (!audioInitialized || !audioBuffers[name]) return;
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[name];
    source.connect(audioContext.destination);
    source.start(0);
}

function startThrustSound() {
    if (!audioInitialized || thrustNode) return;
    thrustNode = audioContext.createBufferSource();
    thrustNode.buffer = audioBuffers.thrust;
    thrustNode.loop = true;
    thrustNode.connect(audioContext.destination);
    thrustNode.start(0);
}

function stopThrustSound() {
    if (thrustNode) {
        thrustNode.stop(0);
        thrustNode = null;
    }
}

// --- Game Setup ---
function resizeGame() {
    const scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    gameContainer.style.transform = `scale(${scale})`;
}

// Initialize the game when the page loads
window.onload = () => {
    console.log('Window loaded');
    init();
    resizeGame();
    window.addEventListener('resize', resizeGame);
    

};
