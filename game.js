// JUMPMAN RETRO – LIGHT VERSION (только с твоими ассетами)

const CANVAS_W = 640, CANVAS_H = 480, GROUND_Y = CANVAS_H - 96;
const HERO_W = 64, HERO_H = 64;
const RUN_FRAME_COUNT = 4;
let canvas, ctx;
let gameState = "menu";
let score = 0, lives = 3;
let hero, obstacles, coins;
let runAnimTimer = 0;
let obsCooldown = 0, coinCooldown = 0;
const images = {};
const assetList = [
  "run 1.png", "run 2.png", "run 3.png", "run 4.png",
  "fly 1.png", "fly 2.png", "fly 3.png",
  "jumpman_retro_title_screen.png"
];
const PLACEHOLDER = "run 1.png";

function hasAsset(src) {
  return images[src] && images[src].complete && images[src].naturalWidth > 0;
}
function drawImage(src, x, y, w, h) {
  let toDraw = hasAsset(src) ? src : PLACEHOLDER;
  const img = images[toDraw];
  if (img) ctx.drawImage(img, x, y, w, h);
}
function loadAssets(cb) {
  let loaded = 0;
  for (let i = 0; i < assetList.length; i++) {
    const img = new Image();
    img.src = assetList[i];
    img.onload = img.onerror = () => {
      loaded++;
      if (loaded === assetList.length) cb();
    };
    images[assetList[i]] = img;
  }
}

function createHero() {
  return {
    x: 110,
    y: GROUND_Y - HERO_H,
    vy: 0,
    width: HERO_W,
    height: HERO_H,
    runFrame: 0,
    jumping: false,
    blink: false,
    blinkTimer: 0
  };
}

function initGame() {
  score = 0;
  lives = 3;
  hero = createHero();
  obstacles = [];
  coins = [];
  runAnimTimer = 0;
}

function showScreen(id) {
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("gameOverMenu").classList.add("hidden");
  if (id) document.getElementById(id).classList.remove("hidden");
}
function updateLives() {
  let html = "";
  for (let i = 0; i < lives; i++) {
    html += `<img src="run 1.png" width="32" height="32" alt="life">`;
  }
  document.getElementById("lives").innerHTML = html;
}
function updateScore() {
  document.getElementById("score").textContent = score;
}
function onJump() {
  if (gameState !== "play") return;
  if (!hero.jumping) {
    hero.vy = -21;
    hero.jumping = true;
    setTimeout(() => { hero.jumping = false; }, 230);
  }
}
window.onload = function() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  document.getElementById("startBtn").onclick = () => { showScreen("hud"); startGame(); };
  document.getElementById("flyAgainBtn").onclick = () => { showScreen("hud"); startGame(); };
  document.getElementById("backToMenuBtn").onclick = () => { showScreen("startMenu"); stopGame(); };
  document.getElementById("pauseBtn").onclick = () => {
    if (gameState === "play") { gameState = "pause"; }
    else if (gameState === "pause") { gameState = "play"; requestAnimationFrame(gameLoop); }
  };
  document.addEventListener("keydown", (e) => { if (e.code === "Space") onJump(); });
  canvas.addEventListener("mousedown", (e) => { onJump(); });
  document.body.addEventListener("touchstart", (e) => { if (gameState === "play") onJump(); });
  loadAssets(() => { showScreen("startMenu"); });
};
function stopGame() { gameState = "menu"; }
function startGame() {
  initGame();
  updateLives();
  updateScore();
  gameState = "play";
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (gameState !== "play") return;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#C0C0C0";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#E8E8E8";
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  maybeSpawnObstacle();
  maybeSpawnCoin();

  // Препятствия
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.x -= 7;
    drawImage(PLACEHOLDER, obs.x, obs.y, 64, 64);
    if (obs.x + 64 < 0) obstacles.splice(i, 1);
    if (checkCollision(hero, obs) && !hero.blink) {
      loseLife();
      hero.blink = true;
      hero.blinkTimer = 60;
      obstacles.splice(i, 1);
    }
  }
  // Монеты
  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];
    coin.x -= 7;
    drawImage(PLACEHOLDER, coin.x, coin.y, 32, 32);
    if (checkCollision(hero, coin)) {
      coins.splice(i, 1);
      score += 10;
      updateScore();
    }
    if (coin.x + 32 < 0) coins.splice(i, 1);
  }
  // Анимация героя
  runAnimTimer++;
  if (runAnimTimer % 7 === 0) hero.runFrame = (hero.runFrame + 1) % RUN_FRAME_COUNT;

  // Гравитация
  hero.y += hero.vy;
  hero.vy += 1.4;
  if (hero.y > GROUND_Y - HERO_H) { hero.y = GROUND_Y - HERO_H; hero.vy = 0; hero.jumping = false; }
  if (hero.y < 10) hero.y = 10;

  // Герой
  if (hero.blink && Math.floor(runAnimTimer / 4) % 2 === 0) {
    // пропуск кадра (мигает)
  } else {
    drawImage(`run ${hero.runFrame + 1}.png`, hero.x, hero.y, HERO_W, HERO_H);
  }
  if (hero.blink) {
    hero.blinkTimer--;
    if (hero.blinkTimer <= 0) {
      hero.blink = false;
    }
  }
  if (gameState === "play") requestAnimationFrame(gameLoop);
}

function maybeSpawnObstacle() {
  obsCooldown--;
  if (obsCooldown <= 0) {
    let x = CANVAS_W + 30;
    let y = GROUND_Y - 64;
    obstacles.push({ x, y, w: 64, h: 64 });
    obsCooldown = 54 + Math.random() * 55;
  }
}
function maybeSpawnCoin() {
  coinCooldown--;
  if (coinCooldown <= 0) {
    let x = CANVAS_W + Math.random() * 80;
    let y = 70 + Math.random() * (GROUND_Y - 110);
    coins.push({ x, y, w: 32, h: 32 });
    coinCooldown = 44 + Math.random() * 50;
  }
}
function checkCollision(a, b) {
  return (a.x + a.width > b.x && a.x < b.x + (b.w || b.width) &&
    a.y + a.height > b.y && a.y < b.y + (b.h || b.height));
}
function loseLife() {
  lives--;
  updateLives();
  hero.blink = true;
  if (lives <= 0) endGame();
}
function endGame() {
  gameState = "gameover";
  document.getElementById("finalScore").textContent = score;
  showScreen("gameOverMenu");
}
