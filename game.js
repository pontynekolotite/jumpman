// JUMPMAN RETRO — АДАПТИВ, ТОЛЬКО ТВОИ PNG, всё остальное отрисовка вручную
const FIELD_W = 640, FIELD_H = 960, GROUND_Y = FIELD_H - 96;
const HERO_W = 64, HERO_H = 64, COIN_SIZE = 36, HEART_SIZE = 36;
const RUN_FRAME_COUNT = 4;
const GRAVITY = 1.4, JUMP_V = -22, SPEED = 8;
let canvas, ctx;
let gameState = "menu";
let score = 0, lives = 3, runAnimTimer = 0;
let hero, obstacles, coins;
let obsCooldown = 0, coinCooldown = 0;
const images = {};
const assetList = [
  "run 1.png", "run 2.png", "run 3.png", "run 4.png",
  "fly 1.png", "fly 2.png", "fly 3.png",
  "jumpman_retro_title_screen.png"
];
const PLACEHOLDER = "run 1.png";

// Универсальная загрузка png
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

// ----------- ИНИЦИАЛИЗАЦИЯ -----------
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

// ----------- UI -----------
function showScreen(id) {
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("gameOverMenu").classList.add("hidden");
  if (id) document.getElementById(id).classList.remove("hidden");
}
function updateLives() {
  // Рисуем жизни вручную (сердце)
  let html = "";
  for (let i = 0; i < lives; i++) {
    html += `<canvas class="heart-canvas" width="${HEART_SIZE}" height="${HEART_SIZE}"></canvas>`;
  }
  document.getElementById("lives").innerHTML = html;
  // Отрисовываем сердца
  let hearts = document.querySelectorAll('.heart-canvas');
  hearts.forEach(hc => drawHeart(hc.getContext('2d'), HEART_SIZE / 2, HEART_SIZE / 2, HEART_SIZE / 2.15));
}
function updateScore() {
  document.getElementById("score").textContent = score;
}

// ----------- УПРАВЛЕНИЕ -----------
function onJump() {
  if (gameState !== "play") return;
  if (!hero.jumping) {
    hero.vy = JUMP_V;
    hero.jumping = true;
    setTimeout(() => { hero.jumping = false; }, 220);
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

// ----------- GAME LOOP -----------
function gameLoop() {
  if (gameState !== "play") return;
  // Фиксированный размер, без дерганий
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, FIELD_W, FIELD_H);
  ctx.fillStyle = "#C0C0C0";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.fillStyle = "#E8E8E8";
  ctx.fillRect(0, GROUND_Y, FIELD_W, FIELD_H - GROUND_Y);

  maybeSpawnObstacle();
  maybeSpawnCoin();

  // Препятствия — рисуем вручную (чёрно-красные блоки с разной высотой)
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.x -= SPEED;
    drawObstacle(ctx, obs);
    if (obs.x + obs.w < 0) obstacles.splice(i, 1);
    if (checkCollision(hero, obs) && !hero.blink) {
      loseLife();
      hero.blink = true;
      hero.blinkTimer = 64;
      obstacles.splice(i, 1);
    }
  }
  // Монеты — жёлтые круги
  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];
    coin.x -= SPEED;
    drawCoin(ctx, coin);
    if (checkCollision(hero, coin)) {
      coins.splice(i, 1);
      score += 10;
      updateScore();
    }
    if (coin.x + COIN_SIZE < 0) coins.splice(i, 1);
  }
  // Анимация героя
  runAnimTimer++;
  if (runAnimTimer % 7 === 0) hero.runFrame = (hero.runFrame + 1) % RUN_FRAME_COUNT;

  // Гравитация
  hero.y += hero.vy;
  hero.vy += GRAVITY;
  if (hero.y > GROUND_Y - HERO_H) { hero.y = GROUND_Y - HERO_H; hero.vy = 0; hero.jumping = false; }
  if (hero.y < 10) hero.y = 10;

  // Герой (только твои ассеты)
  if (hero.blink && Math.floor(runAnimTimer / 4) % 2 === 0) {
    // мигает
  } else {
    drawImage(`run ${hero.runFrame + 1}.png`, hero.x, hero.y, HERO_W, HERO_H);
  }
  if (hero.blink) {
    hero.blinkTimer--;
    if (hero.blinkTimer <= 0) { hero.blink = false; }
  }
  if (gameState === "play") requestAnimationFrame(gameLoop);
}

// ----------- СПАВН -----------
// Препятствия — прямоугольники разной высоты/цвета
function maybeSpawnObstacle() {
  obsCooldown--;
  if (obsCooldown <= 0) {
    let types = [
      { w: 56, h: 64, color: "#111" },
      { w: 60, h: 82, color: "#d11" },
      { w: 48, h: 56, color: "#333" }
    ];
    let t = types[Math.floor(Math.random() * types.length)];
    let x = FIELD_W + 24;
    let y = GROUND_Y - t.h;
    obstacles.push({ x, y, w: t.w, h: t.h, color: t.color });
    obsCooldown = 62 + Math.random() * 48;
  }
}
// Монеты — круги
function maybeSpawnCoin() {
  coinCooldown--;
  if (coinCooldown <= 0) {
    let x = FIELD_W + Math.random() * 100;
    let y = 80 + Math.random() * (GROUND_Y - 150);
    coins.push({ x, y, w: COIN_SIZE, h: COIN_SIZE });
    coinCooldown = 33 + Math.random() * 36;
  }
}

// ----------- ОТРИСОВКА ОБЪЕКТОВ -----------
function drawCoin(ctx, coin) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(coin.x + COIN_SIZE / 2, coin.y + COIN_SIZE / 2, COIN_SIZE / 2.4, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD600";
  ctx.shadowColor = "#EAB701";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}
function drawObstacle(ctx, obs) {
  ctx.save();
  ctx.fillStyle = obs.color;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(obs.x, obs.y, obs.w, obs.h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawHeart(ctx, cx, cy, s) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + s/6);
  ctx.bezierCurveTo(cx + s/2, cy - s/2, cx + s, cy + s/3, cx, cy + s);
  ctx.bezierCurveTo(cx - s, cy + s/3, cx - s/2, cy - s/2, cx, cy + s/6);
  ctx.closePath();
  ctx.fillStyle = "#EF1111";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 3;
  ctx.fill();
  ctx.restore();
}

// ----------- КОЛЛИЖЕНЫ И ФИНАЛ -----------
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
