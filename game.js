const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Player Configuration
const player = {
    x: 100,
    y: VIRTUAL_HEIGHT / 2 - 32,
    width: 151,
    height: 77,
    speed: 4,
    image: new Image(),
    bullets: [],
    isShooting: false,
    shootCooldown: 0
};

player.image.src = "image/player.png";

const bulletImage = new Image();
bulletImage.src = "image/bullet.png";

const backgroundImage = new Image();
backgroundImage.src = "image/bg_earth.jpg";

let backgroundX = 0;
const scrollSpeed = 2; // Pretty self explanatory, but just in case: how fast the bg moves

// Handling all my inputs
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === " ") {
      player.isShooting = true;
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;

  if (e.key === " ") {
      player.isShooting = false;
  }
});

// Bullets
function shootBullet() {
  if (player.shootCooldown <= 0) {
      player.bullets.push({
          x: player.x + player.width,
          y: player.y + player.height / 2 - 4,
          width: 46,
          height: 16,
          speed: 10
      });    
      player.shootCooldown = 10; // Adjust for more rapid fire
  }
}

function drawBackground() {
    backgroundX -= scrollSpeed;

    // When the bg's position moves completely outta left edge, move it back to its starting place
    if (backgroundX <= -VIRTUAL_WIDTH) {
        backgroundX = 0;
    }

    // Draw bg two times side by side
    ctx.drawImage(backgroundImage, backgroundX, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.drawImage(backgroundImage, backgroundX + VIRTUAL_WIDTH, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
}

function drawPlayer() {
ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

function drawBullets() {
    for (const bullet of player.bullets) {
        ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

// Game Loop
function update() {
    // Movement
    if (keys["ArrowUp"]) player.y -= player.speed;
    if (keys["ArrowDown"]) player.y += player.speed;
    if (keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["ArrowRight"]) player.x += player.speed;

    // Make sure not to get outta screen
    player.x = Math.max(0, Math.min(VIRTUAL_WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(VIRTUAL_HEIGHT - player.height - 85, player.y));

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
}

function draw() {
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    drawBackground();
    drawPlayer();
    drawBullets();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

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
  