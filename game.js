// JUMPMAN RETRO – Game Core (ЧАСТЬ 1/2)
// Все ассеты должны лежать рядом с этим файлом.

// ===== КОНСТАНТЫ ===== //
const CANVAS_W = 640;
const CANVAS_H = 480;
const GROUND_Y = CANVAS_H - 96; // высота пола
const GRAVITY = 1.4;
const JUMP_VELOCITY = -21;
const RUN_FRAME_COUNT = 4;
const FLY_FRAME_COUNT = 3;
const HERO_W = 64, HERO_H = 64;
const OBSTACLE_W = 52, OBSTACLE_H = 68;
const COIN_SIZE = 24;
const BUFF_SIZE = 24;
const DEBUFF_SIZE = 24;
const FPS = 60;
const MAX_LIVES = 3;

const BUFFS = [
  { name: "redbull", img: "buff_redbull.png", time: 10, desc: "Ускорение + неуязвимость" },
  { name: "jordan", img: "buff_jordan.png", time: 15, desc: "Суперполёт + все баффы" },
  { name: "sneaker", img: "buff_sneaker.png", time: 10, desc: "Высокий прыжок" },
  { name: "magnet", img: "buff_magnet.png", time: 10, desc: "Магнит для монет" },
  { name: "flappy", img: "buff_flappy.png", time: 15, desc: "Режим Flappy" }
];

const DEBUFFS = [
  { name: "tire", img: "debuff_tire.png", time: 10, desc: "Замедление" },
  { name: "heavyball", img: "debuff_heavyball.png", time: 10, desc: "Пониж. прыжок" }
];

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===== //
let canvas, ctx;
let gameState = "menu"; // menu | play | pause | gameover
let score = 0, highScore = 0, lives = MAX_LIVES;
let hero, obstacles, coins, buffs, debuffs, flying = false, flappy = false;
let currentBuff = null, buffTimer = 0, buffIcon = "", buffActive = false;
let currentDebuff = null, debuffTimer = 0, debuffActive = false;
let keys = {}, touchActive = false;
let pauseTimeout = 0, pauseBlink = false;
let runFrame = 0, runAnimTimer = 0, flyFrame = 0, flyAnimTimer = 0;
let phrases = ["I can fly!", "It’s slam time!", "Let’s get it!", "Up and away!"];
let phraseTimeout = 0, phraseText = "";
let gameSpeed = 6, buffSpeed = 1;
let jumpReady = true, flappyForce = -9, flappyGravity = 1.2;
let bgColor = "#C0C0C0", groundColor = "#E8E8E8";

// ===== ЗАГРУЗКА АССЕТОВ ===== //
const images = {};
const assetList = [
  // Джордан
  "run 1.png", "run 2.png", "run 3.png", "run 4.png",
  "fly 1.png", "fly 2.png", "fly 3.png",
  // HUD
  "heart.png", "coin.png",
  // Баффы и дебаффы (сам создай PNG по своему промпту)
  "buff_redbull.png", "buff_jordan.png", "buff_sneaker.png", "buff_magnet.png", "buff_flappy.png",
  "debuff_tire.png", "debuff_heavyball.png",
  // Препятствия
  "obstacle_barrier.png", "obstacle_car.png", "obstacle_hoop.png", "obstacle_billboard.png",
  "obstacle_bird.png", "obstacle_plane.png", "obstacle_airbillboard.png",
  // Фон
  "jumpman_retro_title_screen.png"
];

// ===== АССИНХРОННАЯ ЗАГРУЗКА ===== //
function loadAssets(cb) {
  let loaded = 0;
  for (let i = 0; i < assetList.length; i++) {
    const img = new Image();
    img.src = assetList[i];
    img.onload = () => {
      loaded++;
      if (loaded === assetList.length) cb();
    };
    images[assetList[i]] = img;
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ ПЕРСОНАЖА ===== //
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
    flying: false,
    flappy: false,
    jumpBoost: false,
    magnet: false,
    invincible: false,
    blink: false,
    blinkTimer: 0
  };
}

// ====== ИНИЦИАЛИЗАЦИЯ ИГРЫ ====== //
function initGame() {
  score = 0;
  lives = MAX_LIVES;
  hero = createHero();
  obstacles = [];
  coins = [];
  buffs = [];
  debuffs = [];
  flying = false;
  flappy = false;
  currentBuff = null;
  buffTimer = 0;
  buffActive = false;
  buffIcon = "";
  currentDebuff = null;
  debuffTimer = 0;
  debuffActive = false;
  phraseTimeout = 0;
  phraseText = "";
  gameSpeed = 6;
  buffSpeed = 1;
  runFrame = 0;
  runAnimTimer = 0;
  flyFrame = 0;
  flyAnimTimer = 0;
}

// ====== СОХРАНЕНИЕ РЕКОРДА ====== //
function saveHighScore(val) {
  try {
    localStorage.setItem("jumpman_highscore", val);
  } catch (e) {}
}

function loadHighScore() {
  try {
    return parseInt(localStorage.getItem("jumpman_highscore") || "0");
  } catch (e) { return 0; }
}

// ===== UI ===== //
function showScreen(id) {
  document.getElementById("startMenu").classList.add("hidden");
  document.getElementById("hud").classList.add("hidden");
  document.getElementById("gameOverMenu").classList.add("hidden");
  if (id) document.getElementById(id).classList.remove("hidden");
}

function updateLives() {
  let html = "";
  for (let i = 0; i < lives; i++) {
    html += `<img src="heart.png" width="24" height="24" alt="life">`;
  }
  document.getElementById("lives").innerHTML = html;
}

function updateScore() {
  document.getElementById("score").textContent = score;
}

function updateBuffUI() {
  const icon = document.getElementById("buffIcon");
  const timer = document.getElementById("buffTimer");
  if (buffActive && currentBuff) {
    icon.src = BUFFS.find(b => b.name === currentBuff).img;
    icon.classList.remove("hidden");
    timer.textContent = Math.ceil(buffTimer) + "s";
  } else {
    icon.classList.add("hidden");
    timer.textContent = "";
  }
}

// ======= УПРАВЛЕНИЕ ======= //
function onJump() {
  if (gameState !== "play") return;
  // Flappy режим — только подбрасываем вверх
  if (hero.flappy) {
    hero.vy = flappyForce;
    return;
  }
  // Обычный режим прыжка
  if (!hero.jumping && jumpReady && !hero.flying) {
    hero.vy = hero.jumpBoost ? JUMP_VELOCITY * 1.7 : JUMP_VELOCITY;
    hero.jumping = true;
    jumpReady = false;
    setTimeout(() => { jumpReady = true; }, 150);
  }
  // В полёте — Flappy jump
  if (hero.flying) {
    hero.vy = flappyForce * 1.3;
  }
}

// ====== СОБЫТИЯ UI ====== //
window.onload = function() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // Кнопка START
  document.getElementById("startBtn").onclick = () => {
    showScreen("hud");
    startGame();
  };

  // Кнопка FLY AGAIN
  document.getElementById("flyAgainBtn").onclick = () => {
    showScreen("hud");
    startGame();
  };

  // Кнопка BACK TO MENU
  document.getElementById("backToMenuBtn").onclick = () => {
    showScreen("startMenu");
    stopGame();
  };

  // Кнопка ПАУЗА
  document.getElementById("pauseBtn").onclick = () => {
    if (gameState === "play") {
      gameState = "pause";
    } else if (gameState === "pause") {
      gameState = "play";
      requestAnimationFrame(gameLoop);
    }
  };

  // Управление (пробел/тач)
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") { onJump(); }
    if (e.code === "KeyP") { // Быстрая пауза
      if (gameState === "play") { gameState = "pause"; }
      else if (gameState === "pause") {
        gameState = "play";
        requestAnimationFrame(gameLoop);
      }
    }
  });
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    onJump();
  });
  canvas.addEventListener("mousedown", (e) => { onJump(); });
  // Мобильный тап по всему экрану
  document.body.addEventListener("touchstart", (e) => {
    if (gameState === "play") onJump();
  });

  // Загружаем рекорд
  highScore = loadHighScore();

  // Загружаем ассеты, только после этого стартуем меню
  loadAssets(() => {
    showScreen("startMenu");
  });
};

function stopGame() {
  gameState = "menu";
}

function startGame() {
  initGame();
  updateLives();
  updateScore();
  updateBuffUI();
  gameState = "play";
  requestAnimationFrame(gameLoop);
}
// ===== ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ===== //
function gameLoop() {
  if (gameState !== "play") return;

  // ОЧИСТКА
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ФОН и ЗЕМЛЯ
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // ----- СПАВН ПРЕПЯТСТВИЙ/ПРЕДМЕТОВ -----
  maybeSpawnObstacle();
  maybeSpawnCoin();
  maybeSpawnBuff();
  maybeSpawnDebuff();

  // ----- ДВИЖЕНИЕ И ОТРИСОВКА ПРЕПЯТСТВИЙ -----
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.x -= gameSpeed * buffSpeed;
    drawObstacle(obs);
    if (obs.x + obs.w < 0) obstacles.splice(i, 1);
    // Столкновение
    if (checkCollision(hero, obs) && !hero.invincible && !hero.blink) {
      loseLife();
      hero.blink = true;
      hero.blinkTimer = 60;
      obstacles.splice(i, 1);
    }
  }

  // ----- МОНЕТЫ -----
  for (let i = coins.length - 1; i >= 0; i--) {
    let coin = coins[i];
    coin.x -= gameSpeed * buffSpeed;
    // Магнит
    if (hero.magnet && Math.abs(coin.x - hero.x) < 120 && Math.abs(coin.y - hero.y) < 120) {
      let dx = hero.x - coin.x, dy = (hero.y + 22) - coin.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      coin.x += dx / dist * 7;
      coin.y += dy / dist * 7;
    }
    drawImage("coin.png", coin.x, coin.y, COIN_SIZE, COIN_SIZE);
    // Собрано
    if (checkCollision(hero, coin)) {
      coins.splice(i, 1);
      score += 10;
      updateScore();
    }
    if (coin.x + COIN_SIZE < 0) coins.splice(i, 1);
  }

  // ----- БАФФЫ -----
  for (let i = buffs.length - 1; i >= 0; i--) {
    let b = buffs[i];
    b.x -= gameSpeed * buffSpeed;
    drawImage(BUFFS.find(e => e.name === b.type).img, b.x, b.y, BUFF_SIZE, BUFF_SIZE);
    if (checkCollision(hero, b)) {
      activateBuff(b.type);
      buffs.splice(i, 1);
    }
    if (b.x + BUFF_SIZE < 0) buffs.splice(i, 1);
  }

  // ----- ДЕБАФФЫ -----
  for (let i = debuffs.length - 1; i >= 0; i--) {
    let d = debuffs[i];
    d.x -= gameSpeed * buffSpeed;
    drawImage(DEBUFFS.find(e => e.name === d.type).img, d.x, d.y, DEBUFF_SIZE, DEBUFF_SIZE);
    if (checkCollision(hero, d)) {
      activateDebuff(d.type);
      debuffs.splice(i, 1);
    }
    if (d.x + DEBUFF_SIZE < 0) debuffs.splice(i, 1);
  }

  // ----- ОБНОВЛЕНИЕ БАФФОВ -----
  updateBuffs();

  // ----- ОБНОВЛЕНИЕ ДЕБАФФОВ -----
  updateDebuffs();

  // ----- АНИМАЦИЯ ПЕРСОНАЖА -----
  updateHeroAnim();

  // ----- ПЕРСОНАЖ (ДЖОРДАН) -----
  if (!hero.flying && !hero.flappy) {
    // Гравитация + движение
    hero.y += hero.vy;
    hero.vy += GRAVITY * (debuffActive && currentDebuff === "heavyball" ? 1.6 : 1);

    // На земле
    if (hero.y > GROUND_Y - HERO_H) {
      hero.y = GROUND_Y - HERO_H;
      hero.vy = 0;
      hero.jumping = false;
    }
    // Верхний предел
    if (hero.y < 10) hero.y = 10;
  } else {
    // Режим полета/Flappy
    hero.y += hero.vy;
    hero.vy += hero.flappy ? flappyGravity : 0.8;
    if (hero.y > GROUND_Y - HERO_H) hero.y = GROUND_Y - HERO_H;
    if (hero.y < 0) hero.y = 0;
  }

  // ----- ОТРИСОВКА ПЕРСОНАЖА -----
  if (hero.flying || hero.flappy) {
    drawImage(`fly ${hero.flyFrame + 1}.png`, hero.x, hero.y, HERO_W, HERO_H);
    drawWingEffect(hero);
  } else {
    // Мигает при уроне
    if (hero.blink && Math.floor(runAnimTimer / 4) % 2 === 0) {
      // прозрачный, не рисуем
    } else {
      drawImage(`run ${hero.runFrame + 1}.png`, hero.x, hero.y, HERO_W, HERO_H);
    }
  }

  // ----- ВИЗУАЛЬНЫЕ ЭФФЕКТЫ БАФФОВ -----
  if (hero.invincible && buffActive) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(Date.now() / 80);
    ctx.fillStyle = "#FF3344";
    ctx.fillRect(hero.x - 7, hero.y - 7, HERO_W + 14, HERO_H + 14);
    ctx.restore();
  }
  if (buffActive && currentBuff === "redbull") drawSpeedTrail(hero);

  // ----- ФРАЗЫ ПЕРСОНАЖА -----
  if (phraseTimeout > 0 && phraseText) {
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.fillStyle = "#D01111";
    ctx.textAlign = "left";
    ctx.fillText(phraseText, hero.x + 68, hero.y + 32);
    phraseTimeout--;
  }

  // ----- БАФФ ИКОНКА -----
  updateBuffUI();

  // ----- МИГАНИЕ ПРИ УРОНЕ -----
  if (hero.blink) {
    hero.blinkTimer--;
    if (hero.blinkTimer <= 0) {
      hero.blink = false;
      hero.invincible = false;
    }
  }

  // ----- GAME LOOP -----
  if (gameState === "play") requestAnimationFrame(gameLoop);
}

// ======= АННИМАЦИЯ ПЕРСОНАЖА ======= //
function updateHeroAnim() {
  runAnimTimer++;
  if (!hero.flying && !hero.flappy) {
    if (runAnimTimer % 7 === 0) hero.runFrame = (hero.runFrame + 1) % RUN_FRAME_COUNT;
  } else {
    flyAnimTimer++;
    if (flyAnimTimer % 7 === 0) hero.flyFrame = (hero.flyFrame + 1) % FLY_FRAME_COUNT;
  }
}

// ======= СПАВН ПРЕПЯТСТВИЙ ======= //
let obsCooldown = 0;
function maybeSpawnObstacle() {
  obsCooldown--;
  if (obsCooldown <= 0) {
    const kinds = [
      { img: "obstacle_barrier.png", h: 48 },
      { img: "obstacle_car.png", h: 42 },
      { img: "obstacle_hoop.png", h: 84 },
      { img: "obstacle_billboard.png", h: 72 },
      { img: "obstacle_bird.png", h: 38, air: true },
      { img: "obstacle_plane.png", h: 52, air: true },
      { img: "obstacle_airbillboard.png", h: 60, air: true }
    ];
    let kind = kinds[Math.floor(Math.random() * kinds.length)];
    let x = CANVAS_W + 30;
    let y = kind.air ? 60 + Math.random() * 100 : GROUND_Y - kind.h;
    obstacles.push({ x, y, w: OBSTACLE_W, h: kind.h, img: kind.img });
    obsCooldown = 54 + Math.random() * 55;
  }
}
function drawObstacle(obs) {
  drawImage(obs.img, obs.x, obs.y, OBSTACLE_W, obs.h);
}

// ======= СПАВН МОНЕТ ======= //
let coinCooldown = 0;
function maybeSpawnCoin() {
  coinCooldown--;
  if (coinCooldown <= 0) {
    let x = CANVAS_W + Math.random() * 80;
    let y = 70 + Math.random() * (GROUND_Y - 110);
    coins.push({ x, y, w: COIN_SIZE, h: COIN_SIZE });
    coinCooldown = 44 + Math.random() * 50;
  }
}

// ======= СПАВН БАФФОВ ======= //
let buffCooldown = 0;
function maybeSpawnBuff() {
  buffCooldown--;
  if (buffCooldown <= 0) {
    // Бафф Jordan встречается реже
    let type = Math.random() < 0.09 ? "jordan" : BUFFS[Math.floor(Math.random() * (BUFFS.length - 1))].name;
    let x = CANVAS_W + Math.random() * 150;
    let y = 60 + Math.random() * (GROUND_Y - 120);
    buffs.push({ x, y, w: BUFF_SIZE, h: BUFF_SIZE, type });
    buffCooldown = 540 + Math.random() * 320;
  }
}

// ======= СПАВН ДЕБАФФОВ ======= //
let debuffCooldown = 0;
function maybeSpawnDebuff() {
  debuffCooldown--;
  if (debuffCooldown <= 0) {
    let type = DEBUFFS[Math.floor(Math.random() * DEBUFFS.length)].name;
    let x = CANVAS_W + Math.random() * 130;
    let y = GROUND_Y - 18;
    debuffs.push({ x, y, w: DEBUFF_SIZE, h: DEBUFF_SIZE, type });
    debuffCooldown = 710 + Math.random() * 250;
  }
}

// ======= БАФФЫ ======= //
function activateBuff(type) {
  currentBuff = type;
  buffActive = true;
  let buff = BUFFS.find(b => b.name === type);
  buffTimer = buff.time;
  showPhrase();
  // Применяем эффекты
  switch (type) {
    case "redbull":
      buffSpeed = 1.4;
      hero.invincible = true;
      break;
    case "jordan":
      hero.flying = true;
      hero.flappy = true;
      hero.invincible = true;
      buffSpeed = 1.6;
      break;
    case "sneaker":
      hero.jumpBoost = true;
      break;
    case "magnet":
      hero.magnet = true;
      break;
    case "flappy":
      hero.flappy = true;
      hero.flying = true;
      break;
  }
}

function updateBuffs() {
  if (buffActive && currentBuff) {
    buffTimer -= 1 / FPS;
    if (buffTimer <= 0) {
      buffActive = false;
      // Сбросить эффекты
      hero.invincible = false;
      hero.jumpBoost = false;
      hero.magnet = false;
      hero.flying = false;
      hero.flappy = false;
      buffSpeed = 1;
      currentBuff = null;
    }
  }
}

// ======= ДЕБАФФЫ ======= //
function activateDebuff(type) {
  currentDebuff = type;
  debuffActive = true;
  let debuff = DEBUFFS.find(d => d.name === type);
  debuffTimer = debuff.time;
  // Применяем эффекты
  switch (type) {
    case "tire":
      buffSpeed = 0.6;
      break;
    case "heavyball":
      // Усиливается гравитация
      break;
  }
}
function updateDebuffs() {
  if (debuffActive && currentDebuff) {
    debuffTimer -= 1 / FPS;
    if (debuffTimer <= 0) {
      debuffActive = false;
      buffSpeed = 1;
      currentDebuff = null;
    }
  }
}

// ======= СТОЛКНОВЕНИЯ ======= //
function checkCollision(a, b) {
  return (a.x + a.width > b.x && a.x < b.x + (b.w || b.width) &&
          a.y + a.height > b.y && a.y < b.y + (b.h || b.height));
}

// ======= ПОТЕРЯ ЖИЗНИ ======= //
function loseLife() {
  lives--;
  updateLives();
  hero.invincible = true;
  if (lives <= 0) {
    endGame();
  }
}

// ======= КОНЕЦ ИГРЫ ======= //
function endGame() {
  gameState = "gameover";
  document.getElementById("finalScore").textContent = score;
  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
  }
  showScreen("gameOverMenu");
}

// ======= ОТРИСОВКА ИЗОБРАЖЕНИЙ ======= //
function drawImage(src, x, y, w, h) {
  const img = images[src];
  if (img) ctx.drawImage(img, x, y, w, h);
}

// ======= ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ======= //
function drawSpeedTrail(hero) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = "#C1002F";
  ctx.beginPath();
  ctx.ellipse(hero.x + HERO_W / 2, hero.y + HERO_H / 1.6, 40, 18, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}
function drawWingEffect(hero) {
  ctx.save();
  ctx.globalAlpha = 0.18 + 0.1 * Math.sin(Date.now() / 60);
  ctx.beginPath();
  ctx.ellipse(hero.x + HERO_W / 2, hero.y + HERO_H / 3, 34, 18, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "#FFF";
  ctx.fill();
  ctx.restore();
}

// ======= ФРАЗЫ ПЕРСОНАЖА ======= //
function showPhrase() {
  phraseText = phrases[Math.floor(Math.random() * phrases.length)];
  phraseTimeout = 80;
}
