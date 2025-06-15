// JUMPMAN RETRO — FLY MODE, ENERGY BAR, только твои png
const FIELD_W = 640, FIELD_H = 960, GROUND_Y = FIELD_H - 160;
const HERO_W = 128, HERO_H = 128, COIN_SIZE = 36, HEART_SIZE = 36;
const RUN_FRAME_COUNT = 4, FLY_FRAME_COUNT = 3;
const GRAVITY = 1.4, JUMP_V = -22, SPEED = 8, FLY_SPEED = 16;
let canvas, ctx;
let gameState = "menu";
let score = 0, lives = 3, runAnimTimer = 0, flyAnimTimer = 0;
let hero, obstacles, airObstacles, coins, clouds;
let obsCooldown = 0, coinCooldown = 0, airObsCooldown = 0, cloudCooldown = 0;
let coinsCollected = 0;
let energy = 0, energyGoal = 23;
let flyAvailable = false, flyActive = false, flyTimer = 0, flyMax = 10 * 60; // 10 секунд * FPS
let invulnTimer = 0;
const images = {};
const assetList = [
  "run 1.png", "run 2.png", "run 3.png", "run 4.png",
  "fly 1.png", "fly 2.png", "fly 3.png",
  "jumpman_retro_title_screen.png"
];
const PLACEHOLDER = "run 1.png";

// === ЗАГРУЗКА PNG ===
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

// === HERO & GAME ===
function createHero() {
  return {
    x: 110,
    y: GROUND_Y - HERO_H,
    vy: 0,
    width: HERO_W,
    height: HERO_H,
    runFrame: 0,
    flyFrame: 0,
    jumping: false,
    blink: false,
    blinkTimer: 0,
    mode: "run" // "run" или "fly"
  };
}
function initGame() {
  score = 0; lives = 3; coinsCollected = 0; energy = 0;
  hero = createHero();
  obstacles = [];
  airObstacles = [];
  coins = [];
  clouds = [];
  runAnimTimer = 0; flyAnimTimer = 0;
  obsCooldown = 0; coinCooldown = 0; airObsCooldown = 0; cloudCooldown = 0;
  flyAvailable = false; flyActive = false; flyTimer = 0; invulnTimer = 0;
  document.getElementById("flyBtn")?.classList.add("hidden");
}

// === UI ===
function showScreen(id) {
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("gameOverMenu").classList.add("hidden");
  if (id) document.getElementById(id).classList.remove("hidden");
}
function updateLives() {
  let html = "";
  for (let i = 0; i < lives; i++) {
    html += `<canvas class="heart-canvas" width="${HEART_SIZE}" height="${HEART_SIZE}"></canvas>`;
  }
  document.getElementById("lives").innerHTML = html;
  document.querySelectorAll('.heart-canvas').forEach(hc =>
    drawHeart(hc.getContext('2d'), HEART_SIZE/2, HEART_SIZE/2, HEART_SIZE/2.15)
  );
}
function updateScore() {
  document.getElementById("score").textContent = score;
}
function updateEnergyBar() {
  const energyBar = document.getElementById("energyBar");
  const ctx2 = energyBar.getContext("2d");
  ctx2.clearRect(0, 0, 300, 28);
  // Полоска
  ctx2.fillStyle = "#fff";
  ctx2.fillRect(4, 8, 292, 12);
  ctx2.fillStyle = "#FFD600";
  ctx2.fillRect(4, 8, Math.min(energy/energyGoal, 1)*292, 12);
  ctx2.strokeStyle = "#333";
  ctx2.lineWidth = 2;
  ctx2.strokeRect(4, 8, 292, 12);
  // Текст
  ctx2.font = "14px 'Press Start 2P', monospace";
  ctx2.fillStyle = "#333";
  ctx2.fillText("ENERGY", 8, 24);
  if (flyAvailable) {
    ctx2.fillStyle = "#DF1111";
    ctx2.font = "bold 16px 'Press Start 2P', monospace";
    ctx2.fillText("READY!", 178, 24);
  }
  if (flyActive) {
    ctx2.fillStyle = "#2299FF";
    ctx2.font = "bold 16px 'Press Start 2P', monospace";
    ctx2.fillText(`${Math.ceil(flyTimer/60)}s`, 210, 24);
  }
}

// === КНОПКА FLY ===
function showFlyBtn() {
  let btn = document.getElementById("flyBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "flyBtn";
    btn.textContent = "FLY";
    btn.className = "fly-btn";
    btn.onclick = tryActivateFly;
    document.body.appendChild(btn);
  }
  btn.classList.remove("hidden");
}
function hideFlyBtn() {
  let btn = document.getElementById("flyBtn");
  if (btn) btn.classList.add("hidden");
}

// === УПРАВЛЕНИЕ ===
function onJump() {
  if (gameState !== "play") return;
  if (hero.mode === "fly") {
    hero.vy = -13; // Flappy jump
  } else if (!hero.jumping) {
    hero.vy = JUMP_V;
    hero.jumping = true;
    setTimeout(() => { hero.jumping = false; }, 220);
  }
}
window.onload = function() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  function fixScreen() {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }
  fixScreen();
  window.addEventListener('resize', fixScreen);

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

  document.body.addEventListener('touchmove', function(e){ e.preventDefault(); }, { passive:false });
  document.body.addEventListener('gesturestart', function(e){ e.preventDefault(); });

  loadAssets(() => { showScreen("startMenu"); });
};
function stopGame() { gameState = "menu"; }
function startGame() {
  initGame();
  updateLives();
  updateScore();
  updateEnergyBar();
  hideFlyBtn();
  gameState = "play";
  requestAnimationFrame(gameLoop);
}

// === FLY MODE ===
function tryActivateFly() {
  if (!flyAvailable || flyActive) return;
  flyActive = true;
  flyAvailable = false;
  hideFlyBtn();
  flyTimer = flyMax;
  hero.mode = "fly";
}

// === GAME LOOP ===
function gameLoop() {
  if (gameState !== "play") return;
  // Фиксированный размер, без дерганий
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, FIELD_W, FIELD_H);
  ctx.fillStyle = "#C0C0C0";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  updateEnergyBar();
  if (energy >= energyGoal && !flyActive && !flyAvailable) {
    flyAvailable = true; showFlyBtn();
  }

  // --- CLOUDS (background) ---
  maybeSpawnCloud();
  for (let i = clouds.length - 1; i >= 0; i--) {
    let cl = clouds[i];
    cl.x -= cl.speed;
    drawCloud(ctx, cl);
    if (cl.x + cl.w < 0) clouds.splice(i, 1);
  }

  // --- Ground/air obstacles and coins ---
  if (hero.mode === "fly" && flyActive) {
    maybeSpawnAirObstacle();
    for (let i = airObstacles.length - 1; i >= 0; i--) {
      let obs = airObstacles[i];
      obs.x -= FLY_SPEED;
      drawAirObstacle(ctx, obs);
      if (obs.x + obs.w < 0) airObstacles.splice(i, 1);
      if (checkCollision(hero, obs) && flyActive) {
        // Выйти из полёта, не теряя жизнь
        flyActive = false;
        hero.mode = "run";
        invulnTimer = 3 * 60;
        hero.blink = true; hero.blinkTimer = invulnTimer;
        break;
      }
    }
  } else {
    maybeSpawnObstacle();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obs = obstacles[i];
      obs.x -= SPEED;
      drawObstacle(ctx, obs);
      if (obs.x + obs.w < 0) obstacles.splice(i, 1);
      if (checkCollision(hero, obs) && !hero.blink && !flyActive) {
        loseLife();
        hero.blink = true;
        hero.blinkTimer = 64;
        obstacles.splice(i, 1);
      }
    }
  }

  // --- Coins ---
  maybeSpawnCoin();
  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];
    let coinSpeed = flyActive ? FLY_SPEED : SPEED;
    coin.x -= coinSpeed;
    drawCoin(ctx, coin);
    if (checkCollision(hero, coin)) {
      coins.splice(i, 1);
      score += 10;
      updateScore();
      coinsCollected++; energy++;
      if (energy > energyGoal) energy = energyGoal;
      updateEnergyBar();
    }
    if (coin.x + COIN_SIZE < 0) coins.splice(i, 1);
  }

  // --- Анимация героя ---
  if (hero.mode === "fly" && flyActive) {
    flyAnimTimer++;
    if (flyAnimTimer % 6 === 0) hero.flyFrame = (hero.flyFrame + 1) % FLY_FRAME_COUNT;
  } else {
    runAnimTimer++;
    if (runAnimTimer % 7 === 0) hero.runFrame = (hero.runFrame + 1) % RUN_FRAME_COUNT;
  }

  // --- Гравитация ---
  if (hero.mode === "fly" && flyActive) {
    hero.y += hero.vy;
    hero.vy += 0.85;
    // Ограничение по высоте
    if (hero.y < 12) { hero.y = 12; hero.vy = 1; }
    if (hero.y > FIELD_H - 190) { hero.y = FIELD_H - 190; hero.vy = 0; }
  } else {
    hero.y += hero.vy;
    hero.vy += GRAVITY;
    if (hero.y > GROUND_Y - HERO_H) { hero.y = GROUND_Y - HERO_H; hero.vy = 0; hero.jumping = false; }
    if (hero.y < 10) hero.y = 10;
  }

  // --- Герой (анимируется, мигает если неуязвим) ---
  let frame, sprite;
  if (hero.mode === "fly" && flyActive) {
    frame = hero.flyFrame;
    sprite = `fly ${frame + 1}.png`;
  } else {
    frame = hero.runFrame;
    sprite = `run ${frame + 1}.png`;
  }
  if (hero.blink && Math.floor(runAnimTimer / 4) % 2 === 0) {
    // мигает, не рисуем кадр
  } else {
    drawImage(sprite, hero.x, hero.y, HERO_W, HERO_H);
  }
  if (hero.blink) {
    hero.blinkTimer--;
    if (hero.blinkTimer <= 0) { hero.blink = false; }
  }

  // --- Таймеры режима полёта и неуязвимости ---
  if (flyActive) {
    flyTimer++;
    if (flyTimer >= flyMax) {
      flyActive = false; hero.mode = "run";
      invulnTimer = 3 * 60;
      hero.blink = true; hero.blinkTimer = invulnTimer;
      flyTimer = 0; energy = 0;
      updateEnergyBar();
    }
  }
  if (invulnTimer > 0) {
    invulnTimer--;
    if (invulnTimer === 0) hero.blink = false;
  }
  if (gameState === "play") requestAnimationFrame(gameLoop);
}

// === СПАВН ===
function maybeSpawnObstacle() {
  obsCooldown--;
  if (obsCooldown <= 0) {
    let types = [
      { w: 72, h: 120, color: "#111" },
      { w: 80, h: 80, color: "#d11" },
      { w: 48, h: 56, color: "#333" }
    ];
    let t = types[Math.floor(Math.random() * types.length)];
    let x = FIELD_W + 24;
    let y = GROUND_Y - t.h;
    obstacles.push({ x, y, w: t.w, h: t.h, color: t.color });
    obsCooldown = 70 + Math.random() * 40;
  }
}
function maybeSpawnAirObstacle() {
  airObsCooldown--;
  if (airObsCooldown <= 0) {
    let types = [
      { w: 64, h: 52, color: "#00BFFF" }, // облако-барьер
      { w: 78, h: 34, color: "#444" },    // чёрная птица
      { w: 54, h: 72, color: "#d11" }     // красный щит
    ];
    let t = types[Math.floor(Math.random() * types.length)];
    let x = FIELD_W + 12;
    let y = 42 + Math.random() * 350;
    airObstacles.push({ x, y, w: t.w, h: t.h, color: t.color });
    airObsCooldown = 55 + Math.random() * 35;
  }
}
function maybeSpawnCoin() {
  coinCooldown--;
  if (coinCooldown <= 0) {
    let x = FIELD_W + Math.random() * 90;
    let y = 80 + Math.random() * (GROUND_Y - 170);
    coins.push({ x, y, w: COIN_SIZE, h: COIN_SIZE });
    coinCooldown = 33 + Math.random() * 36;
  }
}
function maybeSpawnCloud() {
  cloudCooldown--;
  if (cloudCooldown <= 0) {
    let x = FIELD_W + Math.random() * 80;
    let y = 30 + Math.random() * 300;
    let w = 100 + Math.random() * 60;
    let h = 40 + Math.random() * 18;
    let speed = 1.3 + Math.random() * 1.6;
    let opacity = 0.13 + Math.random() * 0.22;
    clouds.push({ x, y, w, h, speed, opacity });
    cloudCooldown = 24 + Math.random() * 23;
  }
}

// === ОТРИСОВКА ===
function drawCoin(ctx, coin) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(coin.x + COIN_SIZE / 2, coin.y + COIN_SIZE / 2, COIN_SIZE / 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD600";
  ctx.shadowColor = "#EAB701";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#FFF";
  ctx.stroke();
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

function drawAirObstacle(ctx, obs) {
  // Воздушные препятствия — примитивы, цвет зависит от типа
  ctx.save();
  if (obs.color === "#00BFFF") { // облако
    drawCloud(ctx, { x: obs.x, y: obs.y, w: obs.w, h: obs.h, opacity: 0.55 });
  } else if (obs.color === "#444") { // птица
    ctx.beginPath();
    ctx.ellipse(obs.x + obs.w/2, obs.y + obs.h/2, obs.w/2, obs.h/2.5, 0, 0, 2*Math.PI);
    ctx.fillStyle = "#444";
    ctx.shadowColor = "#111";
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Крылья
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.w*0.25, obs.y + obs.h/2);
    ctx.lineTo(obs.x, obs.y + obs.h*0.3);
    ctx.lineTo(obs.x + obs.w*0.5, obs.y + obs.h*0.1);
    ctx.fillStyle = "#222";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.w*0.75, obs.y + obs.h/2);
    ctx.lineTo(obs.x + obs.w, obs.y + obs.h*0.3);
    ctx.lineTo(obs.x + obs.w*0.5, obs.y + obs.h*0.1);
    ctx.fillStyle = "#222";
    ctx.fill();
  } else if (obs.color === "#d11") { // красный щит
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y + obs.h);
    ctx.lineTo(obs.x + obs.w/2, obs.y);
    ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
    ctx.closePath();
    ctx.fillStyle = "#d11";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }
  ctx.restore();
}

function drawCloud(ctx, cl) {
  ctx.save();
  ctx.globalAlpha = cl.opacity !== undefined ? cl.opacity : 0.18;
  ctx.beginPath();
  ctx.ellipse(cl.x + cl.w * 0.3, cl.y + cl.h * 0.6, cl.w * 0.25, cl.h * 0.30, 0, 0, 2 * Math.PI);
  ctx.ellipse(cl.x + cl.w * 0.5, cl.y + cl.h * 0.45, cl.w * 0.27, cl.h * 0.27, 0, 0, 2 * Math.PI);
  ctx.ellipse(cl.x + cl.w * 0.7, cl.y + cl.h * 0.6, cl.w * 0.22, cl.h * 0.23, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#C0C0C0";
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
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

// === КОЛЛИЖЕНЫ И ФИНАЛ ===
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
