const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Game variables
let frameCount = 0;
let currentLevel = 0;
let levelComplete = false;
let paused = false;
let gameOver = false;
let backgroundX = 0;
let nextSpawnIndex = 0;
let lastTime = performance.now();
let fps = 0;
const scrollSpeed = 2; // How fast the bg moves

// Initial objs and arrays
const explosions = [];
const enemies = [];
const keys = {};

// Levels
const levels = [
  {
    background: "image/bg_earth.jpg",
    wave: [
      { time: 60, type: "basic", x: 1400, y: 200 },
      { time: 120, type: "basic", x: 1400, y: 400 },
      { time: 180, type: "fast", x: 1400, y: 300 },
      { time: 300, type: "basic", x: 1400, y: 150 },
      { time: 400, type: "fast", x: 1400, y: 300 },
      { time: 550, type: "boss", x: 1400, y: 250 },
    ],
  },
  {
    background: "image/bg_space.jpg",
    wave: [
      { time: 60, type: "fast", x: 1400, y: 100 },
      { time: 120, type: "basic", x: 1400, y: 350 },
      { time: 200, type: "basic", x: 1400, y: 200 },
      { time: 350, type: "fast", x: 1400, y: 400 },
      { time: 600, type: "boss", x: 1400, y: 250 },
    ],
  },
];

// Player Configuration
const player = {
  x: 100,
  y: VIRTUAL_HEIGHT / 2 - 32,
  width: 151,
  height: 77,
  speed: 6,
  image: new Image(),
  bullets: [],
  isShooting: false,
  shootCooldown: 0,
};

// Enemies configuration
const enemyTypes = {
  basic: {
    width: 149,
    height: 59,
    speed: 5,
    hp: 3,
    image: "image/enemy_basic.png",
    status: "regular",
  },
  fast: {
    width: 152,
    height: 51,
    speed: 8,
    hp: 1,
    image: "image/enemy_fast.png",
    status: "regular",
  },
  boss: {
    width: 201,
    height: 106,
    speed: 1,
    hp: 20,
    image: "image/enemy_boss.png",
    status: "boss",
  },
};

// Images
player.image.src = "image/player.png";

const bulletImage = new Image();
bulletImage.src = "image/bullet.png";

const backgroundImage = new Image();
backgroundImage.src = levels[currentLevel].background;

const explosionImage = new Image();
explosionImage.src = "image/explosion.png";

// Handling all my inputs
const KEY_BINDINGS = {
  shoot: " ",
  pause: ["Escape", "p"],
  retry: "r",
};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === KEY_BINDINGS.shoot) player.isShooting = true;
  if (KEY_BINDINGS.pause.includes(e.key)) paused = !paused;
  if (gameOver && e.key === KEY_BINDINGS.retry) location.reload();
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;

  if (e.key === " ") {
    player.isShooting = false;
  }
});

//Change level
function loadLevel(index) {
  const level = levels[index];
  backgroundImage.src = level.background;
  nextSpawnIndex = 0;
  frameCount = 0;
  enemies.length = 0;
  player.bullets.length = 0;
  explosions.length = 0;
  levelComplete = false;
}

// Bullets
function shootBullet() {
  if (player.shootCooldown <= 0) {
    player.bullets.push({
      x: player.x + player.width,
      y: player.y + player.height / 2 - 4,
      width: 46,
      height: 16,
      speed: 12,
    });
    player.shootCooldown = 10; // Adjust for more rapid fire
  }
}

// Draw the pause menu
function drawPauseMenu() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Paused", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "24px sans-serif";
  ctx.fillText(
    "Press 'P' or 'Escape' to resume",
    canvas.width / 2,
    canvas.height / 2 + 30
  );
}

function drawBackground() {
  ctx.drawImage(backgroundImage, backgroundX, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  ctx.drawImage(
    backgroundImage,
    backgroundX + VIRTUAL_WIDTH,
    0,
    VIRTUAL_WIDTH,
    VIRTUAL_HEIGHT
  );
}

function drawPlayer() {
  ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

function drawBullets() {
  for (const bullet of player.bullets) {
    ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
  }
}

// Preload the images and cache them for use
Object.keys(enemyTypes).forEach((type) => {
  const img = new Image();
  img.src = enemyTypes[type].image;
  enemyTypes[type].img = img; // attach the loaded image
});

function spawnEnemiesFromLevel(level, currentFrame) {
  while (
    nextSpawnIndex < level.length &&
    level[nextSpawnIndex].time <= currentFrame
  ) {
    const spawn = level[nextSpawnIndex];
    const type = enemyTypes[spawn.type];

    // Check for overlap
    const newEnemyBox = {
      x: spawn.x,
      y: spawn.y,
      width: type.width,
      height: type.height,
    };

    const isOverlapping = enemies.some((e) => isColliding(newEnemyBox, e));

    if (!isOverlapping) {
      enemies.push({
        x: spawn.x,
        y: spawn.y,
        width: type.width,
        height: type.height,
        speed: type.speed,
        hp: type.hp,
        image: type.img,
        status: type.status,
      });

      nextSpawnIndex++;
    } else {
      break; // Don't increment nextSpawnIndex yet
    }
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Game Loop mechanics
function update() {
  backgroundX -= scrollSpeed;

  frameCount++;

  if (levelComplete) return;

  spawnEnemiesFromLevel(levels[currentLevel].wave, frameCount);

  // When the bg's position moves completely outta left edge, move it back to its starting place
  if (backgroundX <= -VIRTUAL_WIDTH) {
    backgroundX = 0;
  }

  // Movement
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  // Make sure not to get outta screen
  player.x = Math.max(0, Math.min(VIRTUAL_WIDTH - player.width, player.x));
  player.y = Math.max(
    0,
    Math.min(VIRTUAL_HEIGHT - player.height - 85, player.y)
  );

  // Shooting
  if (player.isShooting) {
    shootBullet();
  }
  if (player.shootCooldown > 0) {
    player.shootCooldown--;
  }

  // Update bullets
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];
    bullet.x += bullet.speed;

    // Remove bullets when they leave the screen
    if (bullet.x > VIRTUAL_WIDTH) {
      player.bullets.splice(i, 1);
    }
  }

  // Update enemis
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.x -= enemy.speed;

    if (enemy.x + enemy.width < 0) {
      enemies.splice(i, 1); // Remove when enemy gets offscreen
    }
  }

  // Player-Enemy Collision
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (isColliding(player, enemy)) {
      gameOver = true;
      break;
    }
  }

  // Bullet-Enemy Collision
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      if (isColliding(bullet, enemy)) {
        enemy.hp = (enemy.hp || enemyTypes.basic.hp) - 1; // fallback if missing hp
        player.bullets.splice(i, 1); // Remove bullet

        if (enemy.hp <= 0) {
          if (enemy.status === "boss") {
            levelComplete = true;
            setTimeout(() => {
              currentLevel++;
              if (currentLevel < levels.length) {
                loadLevel(currentLevel);
              } else {
                gameOver = true; // Or: show "YOU WIN" screen
              }
            }, 3000); // delay before next level
          } else {
            explosions.push({
              x: enemy.x + enemy.width / 2 - 64,
              y: enemy.y + enemy.height / 2 - 64,
              width: 150,
              height: 150,
              timer: 60,
            });

            enemies.splice(j, 1); // Remove enemy
          }
        }
        break; // Exit inner loop once bullet hits
      }
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].x -= scrollSpeed;
    explosions[i].timer--;
    if (explosions[i].timer <= 0) {
      explosions.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  drawBackground();
  drawPlayer();
  drawBullets();
  for (const enemy of enemies) {
    ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
  }
  for (const explosion of explosions) {
    ctx.drawImage(
      explosionImage,
      explosion.x,
      explosion.y,
      explosion.width,
      explosion.height
    );
  }
  if (levelComplete) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ffcc";
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Level Complete!", canvas.width / 2, canvas.height / 2);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff4444";
    ctx.font = "64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Press 'R' to try again",
      canvas.width / 2,
      canvas.height / 2 + 40
    );
  }
}

function gameLoop() {
  if (!paused && !gameOver) {
    update();
  }

  draw();

  if (paused) drawPauseMenu();

  requestAnimationFrame(gameLoop);
}

loadLevel(currentLevel);
gameLoop();

function resizeCanvas() {
  const aspect = 16 / 9;
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > aspect) {
    width = height * aspect;
  } else {
    height = width / aspect;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  canvas.width = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;
}
